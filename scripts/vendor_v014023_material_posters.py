#!/usr/bin/env python3
"""Vendor only existing Project Genesis material preview images; never alter approved masters.
Source Git SHA is pinned, binary blob SHA is verified before admitting the copy.
"""
import hashlib, json, pathlib, sys, urllib.request

REPO = "ProjectgenesisAssets/genesis-workshop-assets"
ITEMS = [
    ("Madera seca de roble", "28fa3d583227485940ad7db023c9f7544ba9bd86", "production/tutorial_materials/generated/roble_seco/inventory_poster_rgba.png", "1be586e46fd6834a262cb5c033517fcd5c56f7f8", "assets/playcanvas/approved/materials/oak/v004/madera_roble_v004_poster.png"),
    ("Madera seca de fresno", "4d22dee5e05933a8787d5e9a3ca8d7986bea332d", "production/tutorial_materials/generated/fresno_seco/inventory_poster_rgba.png", "d80ddb7d9eff6f88948a747c03b97bd7afd640d9", "assets/playcanvas/approved/materials/ash/v004/madera_fresno_v004_poster.png"),
    ("Cuero bovino curtido", "8499e3c01d7d0575095169a69dbeac04eea72501", "production/tutorial_materials/generated/cuero_bovino/inventory_poster_rgba.png", "d72efeb9fea088cb7c5104f20779ade240703fea", "assets/playcanvas/approved/materials/leather_bovine/v003/cuero_bovino_v003_poster.png"),
    ("Cuero caprino curtido", "5819c40f0114ea476d99ddfe68526cac36f823ea", "production/tutorial_materials/generated/cuero_caprino/inventory_poster_rgba.png", "5cbca0d82104e376231207cef3cdb383607472a5", "assets/playcanvas/approved/materials/leather_caprine/v003/cuero_caprino_v003_poster.png"),
    ("Cordel de cáñamo", "3a60d0bda542c2206148571f02427421403f0270", "evaluation/hemp-cord/v018/three_quarter.jpg", "50db57a4f75526d21bd0d5192ffa499be19bb255", "assets/playcanvas/approved/materials/hemp/v018/cordel_canamo_v018_poster.jpg"),
    ("Hilo de lino", "3e375e67106e553615a54d591e2c0ec87e365a1b", "evaluation/linen-thread/v021/three_quarter.jpg", "41327c7a609a7d5c34452c7cc68a619d9ed47159", "assets/playcanvas/approved/materials/linen/v021/hilo_lino_v021_poster.jpg"),
]
VERIFY_ONLY = "--verify-only" in sys.argv
manifest = {"release": "V014.023", "assets": []}
for name, source_commit, source_path, expected_git_blob, target_path in ITEMS:
    target = pathlib.Path(target_path)
    if target.is_file():
        data = target.read_bytes()
    elif VERIFY_ONLY:
        raise SystemExit("Missing locally vendored image: " + str(target))
    else:
        url = f"https://raw.githubusercontent.com/{REPO}/{source_commit}/{source_path}"
        print("FETCH", name, url, flush=True)
        request = urllib.request.Request(url, headers={"User-Agent": "Project-Genesis-v014023-asset-vendor"})
        with urllib.request.urlopen(request, timeout=90) as response:
            data = response.read()
    git_blob_sha = hashlib.sha1(f"blob {len(data)}\0".encode("ascii") + data).hexdigest()
    if git_blob_sha != expected_git_blob:
        raise SystemExit(f"Blob SHA mismatch: {name} expected {expected_git_blob}, got {git_blob_sha}")
    expected_signature = b"\x89PNG\r\n\x1a\n" if target.suffix.lower() == ".png" else b"\xff\xd8\xff"
    if not data.startswith(expected_signature):
        raise SystemExit(f"Incorrect image signature: {name}")
    if not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    manifest["assets"].append({"material":name, "path":target_path,"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest(),"git_blob_sha":git_blob_sha,"source_commit":source_commit,"source_path":source_path})
    print("VERIFIED", name, len(data), git_blob_sha, flush=True)
manifest_path = pathlib.Path("assets/playcanvas/approved/materials/v014023_material_poster_manifest.json")
manifest_path.parent.mkdir(parents=True, exist_ok=True)
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("SUCCESS:",len(manifest["assets"]),"pinned previews verified; approved master assets unmodified.")
