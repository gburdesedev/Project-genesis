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
    unused=[items[k]["id"] for k in items if hits[items[k]["source"]]==0]
    print("Local assets:",len(items),"references replaced:",sum(hits.values()),"unreferenced IDs:",unused)
    (root/"tools/playcanvas_localization_report.json").write_text(
        json.dumps({"schema":1,"mirrored":len(items),"replaced":sum(hits.values()),"unusedIds":unused,
          "localUrls":{items[k]["id"]:rewritten[items[k]["source"]] for k in items}},indent=2)+"\n",encoding="utf-8")
    if sum(hits.values())==0:raise RuntimeError("No remote references replaced; possibly already localized")
if __name__=="__main__":main()
