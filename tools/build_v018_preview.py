#!/usr/bin/env python3
"""Build isolated V018 from live V017.1. Never modify production masters or V016/V017.
All transforms are grounded in GitHub Actions' 2026-11-04 measured GLB bounds.
Input approved textures and PBR material/geometry are preserved byte-for-byte
after pixel-identical lossless WebP re-encoding, externally verified beforehand.
"""
from pathlib import Path
import shutil,json,re
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"v017";DST=ROOT/"v018"
CAND=ROOT/"assets/playcanvas/candidates/workshops/herrero/doors/v082-b-lossless-v018/door-herrero-v082-b-lossless-webp.glb"
assert SRC.is_dir() and (SRC/"v017-village.js").exists()
assert CAND.is_file() and 8_000_000<CAND.stat().st_size<11_000_000,"Expected experimentally validated lossless V082-B GLB"
assert not DST.exists(),"V018 already exists; never overwrite an existing experimental preview"
DST.mkdir(parents=True)
for entry in SRC.iterdir():
 if not entry.is_file():continue
 if entry.suffix.lower() not in (".js",".json",".css",".html",".md"):continue
 text=entry.read_text(encoding="utf8")
 text=text.replace("project-genesis/canvas-original/v017-preview","project-genesis/canvas-original/v018-preview")
 # V017 has its own local vendor/character files. Reuse them instead of copying
 # a second complete set of GLBs, avoiding a huge duplicate Pages download.
 text=re.sub(r"(?<!\.)\./assets/", "../v017/assets/", text)
 if entry.name in ("index.html","manifest.json","README-PREVIEW.md","v017-village.js"):
  text=text.replace("V017.1","V018").replace("0.15-v017.1","0.15-v018").replace("V017 — prueba aislada","V018 — prueba aislada")
 (DST/entry.name).write_text(text,encoding="utf8")
manifest= json.loads((DST/"manifest.json").read_text())
manifest["version"]="0.15-v018"
manifest["revision"]="V018 EXPERIMENTAL · workshop measured alignment + V082-B lossless textures"
manifest["canvasOriginal"]["progressStore"]="project-genesis/canvas-original/v018-preview"
manifest["villageScene"]["positionCorrection"]="Measured per-GLB dimensions, original 63x63 plan and positions preserved"
for asset in manifest["workshopAssets"]:
 if asset["id"]=="door-herrero-v082-b":
  asset["file"]="../assets/playcanvas/candidates/workshops/herrero/doors/v082-b-lossless-v018/door-herrero-v082-b-lossless-webp.glb"
  asset["variant"]="lossless-webp-9mb EXPERIMENTAL"
  asset["sourceMaster"]="assets/playcanvas/approved/workshops/herrero/doors/v082-b/door-herrero-v082-b.glb"
  asset["pixelDifference"]=0
  asset["integrationApproval"]="pending_qa_and_user_visual"
  asset["formatExtension"]="EXT_texture_webp"
  asset["approval"]="original_visual_only_experimental_encoding"
assert len([a for a in manifest["workshopAssets"] if a["id"]=="door-herrero-v082-b"])==1
(DST/"manifest.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n")
scene=DST/"v017-village.js"
s=scene.read_text()
def replace_once(old,new):
 global s
 count=s.count(old)
 if count!=1:raise RuntimeError(f"Expected exactly one target, got {count}: {old[:100]}")
 s=s.replace(old,new)
replace_once(
 " const HORIZONTAL=12/7.875;",
 """ // Bounds from GLB node transforms, never invented UI scale factors.
 // Local wall frontage must match GenesisVillagePlan's actual 9m x 7.875m footprints.
 const WALL_BOUNDS=Object.freeze({
  Herrero:Object.freeze({width:8.905,depth:8.0826,front:.647}),
  Arcanista:Object.freeze({width:8.626,depth:7.7679,front:.5018})
 });
 const ROOF_BOUNDS=Object.freeze({width:8.7841,depth:8.1652,front:.5598});
 const DOOR_HERRERO_X_CENTRE=(-.047+1.208)/2; // +.5805 m off-centre GLB pivot
 const INWARD_OPEN=90; // +Y turns the leaf toward -Z, into the interior
 const ROOF_OVERHANG=1.025; // only 2.5% visual overhang beyond plan footprint
""")
replace_once(
 "     shell.setLocalScale(HORIZONTAL,1,HORIZONTAL);",
 """     const bounds=WALL_BOUNDS[p.profession]||WALL_BOUNDS.Herrero;
     const wallScaleX=9/(bounds.width*plan.workshopScale);
     const wallScaleZ=7.875/(bounds.depth*plan.workshopScale);
     // Keep the facade threshold at the original door / road anchor z=0.
     shell.setLocalPosition(0,0,-bounds.front*wallScaleZ);
     shell.setLocalScale(wallScaleX,1,wallScaleZ);""")
replace_once(
 "     rooftop.setLocalScale(HORIZONTAL,1,HORIZONTAL);",
 """     const roofScaleX=9*ROOF_OVERHANG/(ROOF_BOUNDS.width*plan.workshopScale);
     const roofScaleZ=7.875*ROOF_OVERHANG/(ROOF_BOUNDS.depth*plan.workshopScale);
     rooftop.setLocalPosition(0,0,-ROOF_BOUNDS.front*roofScaleZ);
     rooftop.setLocalScale(roofScaleX,1,roofScaleZ);""")
replace_once("   door.setLocalPosition(-1.10,0,.12);","   door.setLocalPosition(0,0,.12);")
replace_once(
 "       hinge.setLocalPosition(-1.10,0,.12);",
 """       // V082-B geometry is [−.047,+1.208] around its actual GLB hinge.
       // Shift the centre to x=0 in the real masonry opening.
       hinge.setLocalPosition(-DOOR_HERRERO_X_CENTRE*wallScaleX,0,.12);""")
replace_once(
 "       const door=addModel(resources,hinge,'door-herrero-v082-b','Herrero V082-B · hierro aprobado');",
 "       const door=addModel(resources,hinge,'door-herrero-v082-b','Herrero V082-B · PBR sin pérdida experimental',[0,0,0],[wallScaleX,1,wallScaleZ]);"
)
replace_once(
 "       const visual=addModel(resources,pivot,'door-arcanista-v027','Arcanista V027 · puerta arcana iluminada aprobada');",
 """       // Unlike the Herrero, the actual V027 geometry ALREADY straddles x=0.
       // NEVER reuse the blacksmith GLB's .5805m offset here.
       const visual=addModel(resources,pivot,'door-arcanista-v027','Arcanista V027 · puerta arcana iluminada aprobada',[0,0,0],[wallScaleX,1,wallScaleZ]);"""
)
replace_once("    doorAngle=gate()>=1?-92:0;","    doorAngle=gate()>=1?INWARD_OPEN:0;")
replace_once("      const desired=gate()>=1?-92:0;","      const desired=gate()>=1?INWARD_OPEN:0;")
replace_once(
 "      doorOpenTrigger:'Ordan first dialogue: Q1 step 0 → 1'",
 """      doorOpenTrigger:'Ordan first dialogue: Q1 step 0 → 1',
      layoutCorrections:{
        plan:'GenesisVillagePlan unchanged',workshopFootprint:[9,7.875],
        herreroHingeOffset:-DOOR_HERRERO_X_CENTRE*(9/(WALL_BOUNDS.Herrero.width*plan.workshopScale)),
        herreroOpenDegrees:INWARD_OPEN,
        arcanistaCentreX:0,
        genericDoorsCentred:true,
        roofsAlignedToBuildingFootprint:true,
        originalVerticalRoofBoostPreserved:ROOF_BOOST
      },
      doorTextureVariant:{
        file:'lossless-webp',bytesExpected:9043540,
        pixelsChanged:0,geometricChanges:0,
        approval:'EXPERIMENTAL, visual and browser testing required'
      }"""
)
scene.write_text(s)
# Make the v018 preview identifiable as v018 in the browser's loading screen.
html=DST/"index.html"
h=html.read_text()
h=h.replace("0.15 V017", "0.15 V018").replace("0.15-v017.1","0.15-v018")
html.write_text(h)
# All local paths must resolve against the actual checkout; missing assets
# must fail CI before any test or potential preview publication.
for a in manifest["workshopAssets"]+manifest["characters"]:
 p=a.get("file")
 if p and not (DST/p).resolve().exists():raise FileNotFoundError(f"V018 reference missing: {a['id']} {p}")
assert (ROOT/"v017/manifest.json").read_text().find('"version": "0.15-v017.1"')>=0
assert (ROOT/"v015/canvas-legacy-logic.js").read_text().find("project-genesis/canvas-original/v013")>=0
assert "project-genesis/canvas-original/v018-preview" in h
assert "GenesisVillageV017" in s # same runtime API to avoid rewriting game systems
(DST/"README-PREVIEW.md").write_text("""# Project Genesis V018 — experimental positioning + pixel-identical door encoding

Original V017.1 remains untouched at /v017/; V016 unchanged at /v015/.
V018 saves use the exclusive key project-genesis/canvas-original/v018-preview.
Based on geometric GLB bounds and original GenesisVillagePlan, correcting
workshop width/depth, front thresholds, roofs, Herrero door pivot and generic doors.
Arcanista original V027 is centred, so only its scene scale is corrected.
Original roof V013 vertical raise, original 32-bit HDRI, V014 controls,
V016 cinematic arrival and all quest logic remain unchanged.
The V082-B GLB uses identical decoded source pixels in lossless WebP,
but is UNAPPROVED as a runtime variant until PC + mobile validation and user review.
No approved GLB has been overwritten.
""")
print("V018 prepared",str(DST), "door bytes",CAND.stat().st_size, "files",len(list(DST.iterdir())))
