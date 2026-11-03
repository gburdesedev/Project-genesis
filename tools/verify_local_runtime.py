#!/usr/bin/env python3
"""Read-only CI checks for fully-localized Project Genesis runtime assets."""
import json, pathlib, hashlib, sys, re
root=pathlib.Path(__file__).resolve().parents[1]
report=json.loads((root/"tools/playcanvas_localization_report.json").read_text())
errors=[]
for key,src in report["localUrls"].items():
    if not src.startswith("./assets/vendor/genesis/externals/"):
        errors.append(f"{key}: external or unexpected path {src}")
        continue
    p=root/src[2:]
    if not p.is_file(): errors.append(f"{key}: missing {p}")
    elif p.suffix==".glb" and p.read_bytes()[:4]!=b"glTF":errors.append(f"{key}: invalid GLB magic")
    elif p.suffix==".gltf":
        try:
            g=json.loads(p.read_text())
            if g.get("asset",{}).get("version")!="2.0":errors.append(f"{key}: unexpected glTF version")
            for obj in g.get("buffers",[])+g.get("images",[]):
                u=obj.get("uri","")
                if u and not u.startswith("data:") and not (p.parent/u).exists():
                    errors.append(f"{key}: missing glTF dependency {u}")
        except Exception as e: errors.append(f"{key}: invalid glTF JSON: {e}")
expected=len(report["localUrls"])
present=[x for x in report["localUrls"].values() if (root/x[2:]).is_file()]
if expected<42:errors.append(f"Expected 42 locally vendored models, got {expected}")
for filename,token in [
    ("genesis_workshop_live_v015.js","blacksmithWallsV082/src/"),
    ("village_trees.js","tree_v005_"),
    ("village_arcanist.js","arcanistDoorV027/src/"),
    ("genesis_arcanista_four_walls_v006.js","arcanistWallsV006/src/"),
    ("index.html","forgeStation/src/")
]:
    data=(root/filename).read_text(encoding="utf-8")
    if token not in data: errors.append(f"{filename}: reference {token} missing")
print(f"Local assets: {len(present)}/{expected} present. Errors: {len(errors)}")
for err in errors:print("ERROR",err)
if errors:sys.exit(1)
