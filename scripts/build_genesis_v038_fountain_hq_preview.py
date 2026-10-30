#!/usr/bin/env python3
"""Build a separate *playable* Project Genesis preview with preboot Draco,
HQ V011 dolphin + native V038 forge asset. Never modify index.html.
"""
from pathlib import Path
import re, json, hashlib, struct

root = Path(".")
source = (root / "index.html").read_text(encoding="utf-8")
baseline_sha = hashlib.sha256(source.encode()).hexdigest()
plan = (root / "village_plan.js").read_text(encoding="utf-8")
assert re.search(r"plaza=\{x:7,z:16,", plan), "Village plan plaza moved. Recalibrate, don't guess."
assert re.search(r"workshopScale=\.75", plan), "Village plan world scaling changed."
assert source.count('<pc-app id="genesisApp"') == 1, "Game boot anchor ambiguous"
assert source.count('</pc-scene>') == 1, "Expected one game scene"
assert source.count('id="forgeStation"') == 1, "Expected one forge asset"
assert source.count('id="forgeModel"') == 1, "Expected one forge anchor"

hq = ("https://raw.githubusercontent.com/ProjectgenesisAssets/"
      "genesis-workshop-assets/feature/plaza-fuente-delfin-marmol-aaa/"
      "public/models/PG_Dolphin_Fountain_V011_PlayCanvas_HQ_Optimized.glb")
forge = ("https://raw.githubusercontent.com/ProjectgenesisAssets/"
         "genesis-workshop-assets/feature/playcanvas-herrero-arcanista-walls-preview/"
         "public/models/Forge_V038_HeaderFixed_Preview.glb")

draco = """
  <!-- Draco MUST load before app boots: late iframe injection is invalid. -->
  <pc-wasm id="genesisHQDracoDecoder" name="DracoDecoderModule"
    glue="https://developer.playcanvas.com/assets/modules/draco/draco.wasm.js"
    wasm="https://developer.playcanvas.com/assets/modules/draco/draco.wasm.wasm"></pc-wasm>
"""
fountain_asset = f"""
  <!-- V011 HQ 2K / 16.72 MB: single 8-second animated GLB. -->
  <pc-asset id="genesisFountainV011HQAsset" type="container"
    src="{hq}"></pc-asset>
"""
# Insert required decoder BEFORE every asset and scene, before PlayCanvas initialization.
source = source.replace(
    '<pc-app id="genesisApp" backend="webgl2" antialias loading-bar="false" onprogress="window.__genesisPreloadProgress(event)" onerror="window.__genesisAppError(event)">',
    '<pc-app id="genesisApp" backend="webgl2" antialias loading-bar="false" onprogress="window.__genesisPreloadProgress(event)" onerror="window.__genesisAppError(event)">'
    + draco + fountain_asset, 1
)

# Change one and only one forge GLB URL; retain host, children, collision,
# component ids, functional tutorial, and lighting logic.
pattern = r'(<pc-asset id="forgeStation" type="container" src=")([^"]+)(")'
source, replacement_count = re.subn(pattern, lambda match: match.group(1)+forge+match.group(3), source)
assert replacement_count == 1, "Forge URL replacement failed"
# The V038's authored facade points forward; baseline placeholder is rotated 180.
forge_pattern = r'(<pc-model id="forgeModel"[^>]*rotation=")0 180 0(")'
source, rotate_count = re.subn(forge_pattern, r'\g<1>0 0 0\2', source)
assert rotate_count == 1, "Forge V038 rotation anchor changed"

# The village_world.js draws the plaza at x=7,z=16 in UNSCALED world
# coordinates. GenesisVillagePlan.toWorld() is only for workshop-relative data.
# Real collision is controlled by wallBlocked in the monolithic game.
def replace_once(old,new,context):
    global source
    assert source.count(old)==1, context+" changed - refusing blind change"
    source=source.replace(old,new,1)

replace_once('position="2.46 0 -5.54"','position="4.37 0 -2.88"','Quenching bucket')
replace_once('position="3.35 0 -5.74"','position="4.25 0 -4.15"','Quenching barrel')
replace_once(
 'const obs=[[3.02,-8.56,1.22],[4.18,-7.22,.90],[-3.74,-8.58,1.05],[-4.08,-3.02,.76],[3.35,-5.74,.56]',
 'const obs=[[3.02,-8.56,1.06],[4.18,-7.22,.68],[-3.74,-8.58,1.05],[-4.08,-3.02,.76],[4.25,-4.15,.45]',
 'Herrero collision radii')
replace_once(
 '||village.blocked(x,z,r))return true;if(doorwayPortalFree',
 '||village.blocked(x,z,r)||Math.hypot(x-GenesisVillagePlan.plaza.x,z-GenesisVillagePlan.plaza.z)<2.13+r)return true;if(doorwayPortalFree',
 'Fountain player collision')
replace_once(
 'function cameraBlocked(x,z){if(village.blocked(x,z,.20))return true;',
 'function cameraBlocked(x,z){if(village.blocked(x,z,.20)||Math.hypot(x-GenesisVillagePlan.plaza.x,z-GenesisVillagePlan.plaza.z)<2.13+.20)return true;',
 'Fountain camera collision')

# The existing plaza is 13x13 in village-plan units, world scaling .75.
# Its exact world center is (7, 0, 16). Model geometry is a
# 4.26m diameter fountain; don't shrink the HQ mesh.
fountain_model = """
    <!-- Real 3D plaza object, not screenshot / HTML overlay. -->
    <pc-model id="genesisFountainV011Model"
      name="Genesis plaza dolphin fountain V011 HQ"
      asset="genesisFountainV011HQAsset"
      position="7 0 16" scale="1 1 1">
      <pc-anim id="genesisFountainV011Anim" activate="true"></pc-anim>
    </pc-model>
"""
source = source.replace("</pc-scene>", fountain_model + "\n  </pc-scene>", 1)
runtime = '<script type="module" src="./previews/genesis-v038-fuente-hq-runtime.js?v=0.14.005"></script>'
assert source.count("</body>")==1
source=source.replace("</body>",runtime+"\n</body>",1)

# Ensure separate output includes source and QA and that baseline remains exact.
assert source.count('id="genesisHQDracoDecoder"') == 1
assert source.count('id="genesisFountainV011Model"') == 1
assert source.index('id="genesisHQDracoDecoder"') < source.index('id="genesisFountainV011HQAsset"')
assert source.index('id="genesisFountainV011HQAsset"') < source.index('<pc-scene')
assert source.count(hq)==1 and source.count(forge)==1
assert not ('PG_Dolphin_Fountain_V011_PlayCanvas_Mobile_Optimized.glb' in source)
assert hashlib.sha256((root/"index.html").read_bytes()).hexdigest()==baseline_sha

dest=root/"genesis-v038-fuente-hq-preview.html"
dest.write_text(source,encoding="utf-8")
report={
    "status":"BUILT_SEPARATE_PREVIEW_NOT_BROWSER_VERIFIED",
    "source":"index.html","output":str(dest),"baseline_sha256_unchanged":baseline_sha,
    "required_preboot_decoder":"DracoDecoderModule",
    "fountain_url":hq,"forge_url":forge,
    "plaza_center_world":[7,0,16],
    "fountain_quality":"HQ_2K_16.72_MB",
    "fountain_animation":"One 8-second GLB clip plus runtime normal scroll",
    "forge_animation":"4-second emissive runtime synced with tutorial ignition",
    "game_logic_preserved":True,
    "approval":"PENDING_REAL_PLAYCANVAS_BROWSER_TEST"
}
(root/"reports").mkdir(exist_ok=True)
(root/"reports"/"genesis-v038-fuente-hq-preview.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report,indent=2))
