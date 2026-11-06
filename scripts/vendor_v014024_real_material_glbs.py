#!/usr/bin/env python3
"""V014.024: vendor *existing* source GLBs, no rerender or modification of approved art.
Four source tutorial versions are still QA candidates. Fiber V018/V021 are visually approved.
All sources are pinned to exact immutable public Git commits or SHA256.
"""
from __future__ import annotations
import hashlib, json, pathlib, struct, sys, urllib.request
ROOT="https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets"
SOURCES=[
  {
    "name":"Madera seca de roble","commit":"28fa3d583227485940ad7db023c9f7544ba9bd86",
    "source":"production/tutorial_materials/generated/roble_seco/roble_seco_v004_candidate.glb",
    "git_blob":"f97b3e6d4cc86103a4f8f23d68fac21f671bfefc","size":14938336,
    "target":"assets/playcanvas/approved/materials/oak/v004/roble_seco_v004_candidate.glb","visual_status":"CANDIDATE_ONLY"
  },{
    "name":"Madera seca de fresno","commit":"4d22dee5e05933a8787d5e9a3ca8d7986bea332d",
    "source":"production/tutorial_materials/generated/fresno_seco/fresno_seco_v004_candidate.glb",
    "git_blob":"f5c3f99ef50b191e5ee90cceac66353e29aa9142","size":19783932,
    "target":"assets/playcanvas/approved/materials/ash/v004/fresno_seco_v004_candidate.glb","visual_status":"CANDIDATE_ONLY"
  },{
    "name":"Cuero bovino curtido","commit":"8499e3c01d7d0575095169a69dbeac04eea72501",
    "source":"production/tutorial_materials/generated/cuero_bovino/cuero_bovino_v003_candidate.glb",
    "git_blob":"1aba58417c9f8a7a09f085a34e665bce237137e6","size":9450628,
    "target":"assets/playcanvas/approved/materials/leather_bovine/v003/cuero_bovino_v003_candidate.glb","visual_status":"CANDIDATE_ONLY"
  },{
    "name":"Cuero caprino curtido","commit":"5819c40f0114ea476d99ddfe68526cac36f823ea",
    "source":"production/tutorial_materials/generated/cuero_caprino/cuero_caprino_v003_candidate.glb",
    "git_blob":"202f4e973efcbb306940f2f20be2c3705efc5581","size":9455460,
    "target":"assets/playcanvas/approved/materials/leather_caprine/v003/cuero_caprino_v003_candidate.glb","visual_status":"CANDIDATE_ONLY"
  },{
    "name":"Cordel de cáñamo","commit":"34e206bd7ec51b676a03bb0f295061687a0a7b2e",
    "source":"production/approved_fibers_experimental/cordel_canamo/v018/cordel_canamo_v018.glb",
    "sha256":"843cba9d3181cffe544ba9a0799c7dbf2d77d4304e08a75ff931308b8a1af46f","size":3916368,
    "target":"assets/playcanvas/approved/materials/cordel_canamo/v018/cordel_canamo_v018.glb","visual_status":"OWNER_APPROVED"
  },{
    "name":"Hilo de lino","commit":"34e206bd7ec51b676a03bb0f295061687a0a7b2e",
    "source":"production/approved_fibers_experimental/hilo_lino/v021/hilo_lino_v021.glb",
    "sha256":"2a0018a6354113662f535a19aef2bdf1c4e8659bc1e23649d7b5eca163b7ac0d","size":7010672,
    "target":"assets/playcanvas/approved/materials/hilo_lino/v021/hilo_lino_v021.glb","visual_status":"OWNER_APPROVED"
  }
]
def audit_glb(blob, name):
    if len(blob)<20 or blob[:4]!=b"glTF" or struct.unpack_from("<I",blob,4)[0]!=2:
        raise ValueError(name+": invalid GLB magic/version")
    if struct.unpack_from("<I",blob,8)[0]!=len(blob):
        raise ValueError(name+": corrupt declared GLB size")
    jlen,jtype=struct.unpack_from("<II",blob,12)
    if jtype!=0x4E4F534A or jlen>len(blob)-20:
        raise ValueError(name+": no GLB JSON chunk")
    doc=json.loads(blob[20:20+jlen].decode("utf-8").strip())
    if not doc.get("meshes") or not doc.get("nodes") or not doc.get("materials"):
        raise ValueError(name+": mesh/nodes/materials missing")
    if any(isinstance(buf.get("uri"),str) and not buf["uri"].startswith("data:") for buf in doc.get("buffers",[])):
        raise ValueError(name+": GLB requires an external binary buffer")
    return {"meshes":len(doc["meshes"]),"materials":len(doc["materials"]),"images":len(doc.get("images",[])),"extensions":doc.get("extensionsUsed",[])}
def main():
    verify="--verify-only" in sys.argv
    manifest={"release":"V014.024","scope":"experimental 3D QA; NOT approved to main","assets":[]}
    for row in SOURCES:
        target=pathlib.Path(row["target"])
        if target.exists(): blob=target.read_bytes()
        elif verify: raise FileNotFoundError(target)
        else:
            url=f'{ROOT}/{row["commit"]}/{row["source"]}'
            print("FETCH GLB",row["name"],url,flush=True)
            req=urllib.request.Request(url,headers={"User-Agent":"Project-Genesis-V014024-immutable-3D"})
            with urllib.request.urlopen(req,timeout=150) as res: blob=res.read()
        size=len(blob)
        if size!=row["size"]: raise ValueError(f'{row["name"]}: wrong bytes {size} != {row["size"]}')
        sha=hashlib.sha256(blob).hexdigest()
        git=hashlib.sha1(f"blob {size}\0".encode()+blob).hexdigest()
        if row.get("sha256") and sha!=row["sha256"]: raise ValueError(row["name"]+": SHA256 mismatch")
        if row.get("git_blob") and git!=row["git_blob"]: raise ValueError(row["name"]+": Git blob SHA mismatch")
        details=audit_glb(blob,row["name"])
        if not target.exists():
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(blob)
        manifest["assets"].append({"name":row["name"],"path":row["target"],"sha256":sha,"git_blob_sha":git,"bytes":size,"visual_status":row["visual_status"],"source_commit":row["commit"],"source":row["source"],**details})
        print("GLB_VERIFIED",row["name"],size,sha,details,flush=True)
    manifest_file=pathlib.Path("assets/playcanvas/approved/materials/v014024_3d_glb_experimental_manifest.json")
    manifest_file.write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n")
    print("SOURCE_VERIFIED_6_OF_6",flush=True)
if __name__=="__main__":main()
