#!/usr/bin/env python3
"""Replace remote runtime references ONLY after a complete verified local copy."""
import argparse, hashlib, json, pathlib

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--manifest",required=True)
    p.add_argument("--lock",required=True)
    p.add_argument("--asset-root",required=True)
    p.add_argument("--project-root",default=".")
    a=p.parse_args()
    root=pathlib.Path(a.project_root).resolve()
    manifest=json.loads(pathlib.Path(a.manifest).read_text(encoding="utf-8"))
    lock=json.loads(pathlib.Path(a.lock).read_text(encoding="utf-8"))
    if not lock.get("complete") or lock.get("failures"):
        raise RuntimeError("No se modifican URLs si falta algún asset")
    items={x["id"]:x for x in manifest["items"]}
    assets={x["id"]:x for x in lock["assets"]}
    if set(items)!=set(assets): raise RuntimeError("Manifest/lock asset IDs mismatch")
    relative_root=pathlib.Path(a.asset_root)
    rewritten={}
    for id,item in items.items():
        entry=assets[id]
        for rel,digest in entry["files"].items():
            file=root/relative_root/rel
            if not file.is_file():raise RuntimeError("Missing mirrored file: "+str(file))
            if hashlib.sha256(file.read_bytes()).hexdigest()!=digest["sha256"]:
                raise RuntimeError("Corrupt mirrored resource: "+str(file))
        local="./"+(relative_root/entry["entry"]).as_posix()
        rewritten[item["source"]]=local
    paths=[root/"index.html",root/"genesis_asset_preflight_v001.js"]
    paths += sorted(p for p in root.glob("*.js") if p.name!="genesis_asset_preflight_v001.js")
    paths += sorted(root.glob("*.css"))
    hits={key:0 for key in rewritten}
    for path in paths:
        if not path.exists(): continue
        body=path.read_text(encoding="utf-8")
        edited=body
        for source,local in rewritten.items():
            n=edited.count(source)
            if n:edited=edited.replace(source,local);hits[source]+=n
        if body!=edited:
            path.write_text(edited,encoding="utf-8")
            print("REWRITE",path.name)

    # Restore dynamic GLBs too: they are assembled via JavaScript string
    # concatenation, not a literal URL in pc-asset markup.
    dynamic_done=set()
    def local(id):
        return rewritten[items[id]["source"]]
    def replace_dynamic(filename,old,new,ids):
        file=root/filename
        data=file.read_text(encoding="utf-8")
        if old in data:
            file.write_text(data.replace(old,new),encoding="utf-8")
        elif new not in data:
            raise RuntimeError("Dynamic asset reference changed: "+filename+" :: "+old)
        dynamic_done.update(ids)
    blacksmith={
      "walls":("blacksmithWallsV082","integration/herrero-v082-arched-doorway/public/models/blacksmith-v082-arched-portal/blacksmith_four_walls_arched_v082.glb"),
      "roof":("blacksmithRoofV013","feature/blacksmith-workshop-windows-flue-v013/public/models/blacksmith-structural-v013/batched/blacksmith_roof_preview.glb"),
      "chimney":("blacksmithChimneyV013","feature/blacksmith-workshop-windows-flue-v013/public/models/blacksmith-structural-v013/batched/blacksmith_chimney_candidate_preview.glb"),
      "door":("blacksmithDoorV082","production/door-herrero-v082-subtle-forging/public/models/door-herrero-v082-b/door-herrero-v082-b.glb")
    }
    for _,(id,partial) in blacksmith.items():
        replace_dynamic("genesis_workshop_live_v015.js","ASSETS+'"+partial+"'","'"+local(id)+"'",[id])
    # v005 approved LODs and v003 fallback variants share a deterministic path pattern.
    replace_dynamic("village_trees.js",
       "REPO+'assets/tree_webgl_v005/'+species+'/lod'+lod+'.glb'",
       "'./assets/vendor/genesis/externals/tree_v005_'+species+'_lod'+lod+'/src/lod'+lod+'.glb'",
       [x for x in items if x.startswith("tree_v005_")])
    replace_dynamic("village_trees.js",
       "ORIGINALS+'assets/tree_webgl_v003/'+task.species+'/lod'+task.lod+'.glb'",
       "'./assets/vendor/genesis/externals/tree_v003_'+task.species+'_lod'+task.lod+'/src/lod'+task.lod+'.glb'",
       [x for x in items if x.startswith("tree_v003_")])
    # Literal URLs for Arcane wall and portal have been replaced above.
    for id in ("arcanistDoorV027","arcanistWallsV006"):
        arcane_file="village_arcanist.js" if id=="arcanistDoorV027" else "genesis_arcanista_four_walls_v006.js"
        if hits[items[id]["source"]] == 0 and local(id) not in (root/arcane_file).read_text(encoding="utf-8"):
            raise RuntimeError("Arcane GLB still has no local runtime reference: "+id)
        dynamic_done.add(id)
    # Report already-localized assets as present on repeat runs, not missing.
    current_text="\n".join(path.read_text(encoding="utf-8") for path in paths if path.exists())
    present={k for k in items if rewritten[items[k]["source"]] in current_text}
    present.update(dynamic_done)
    unused=[items[k]["id"] for k in items if k not in present]
    print("Local assets:",len(items),"references replaced:",sum(hits.values()),"local references verified:",len(present),"unreferenced IDs:",unused)
    (root/"tools/playcanvas_localization_report.json").write_text(
        json.dumps({"schema":1,"mirrored":len(items),"replaced":sum(hits.values()),"unusedIds":unused,
          "localUrls":{items[k]["id"]:rewritten[items[k]["source"]] for k in items}},indent=2)+"\n",encoding="utf-8")
    if not present:raise RuntimeError("No local runtime asset reference found")
if __name__=="__main__":main()
