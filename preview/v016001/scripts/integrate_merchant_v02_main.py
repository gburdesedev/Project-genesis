#!/usr/bin/env python3
"""Project Genesis main branch integration of approved Merchant V02 visual only.
Run after checking out latest main and vendoring the pinned V02 GLB.
The NPC's location, interaction, inventory, market quest and menu remain untouched.
"""
from pathlib import Path
import re, json, struct, hashlib
root=Path(__file__).resolve().parent.parent
model=root/"assets/playcanvas/approved/characters/merchant_v02_75962.glb"
assert model.is_file()
expected_sha="8bd0c2423e55404c401890bf84cb0ec9d7c11b3818b0cbb6aad14e20d5be8bf4"
assert hashlib.sha256(model.read_bytes()).hexdigest()==expected_sha, "Asset SHA differs from QA-approved V02"
with model.open("rb") as f:
    magic,version,nbytes,jsonlength,jtype=struct.unpack("<4sIIII",f.read(20))
    assert magic==b"glTF" and version==2 and nbytes==model.stat().st_size and jtype==0x4e4f534a
    doc=json.loads(f.read(jsonlength))
tris=sum(doc["accessors"][p["indices"]]["count"]//3 for mesh in doc["meshes"] for p in mesh["primitives"])
assert tris==75962 and doc.get("images") and doc.get("materials") and doc.get("textures")
print("V02 verified:",tris,"triangles",model.stat().st_size,"bytes")
merchant_path=root/"genesis_market_v001.js"
merchant=merchant_path.read_text(encoding="utf-8")
assert "function buildMerchant(world,source){" in merchant
assert "export function mountGenesisMarket(options){" in merchant
assert "const npc=buildMerchant(village.root,character);" in merchant
assert "const status={version:'v0.14.021'" in merchant
assert "merchant_v02_75962.glb" not in merchant

loader=r"""
/* Merchant V02 approved art, 75962 triangles / 2,049,508 bytes.
 * Loaded asynchronously so stall, story quest, game controls and market modal
 * are never held hostage by a model download. Original fallback is removed
 * only after the real GLB has valid renderable mesh instances.
 */
const MERCHANT_V02_GLB='./assets/playcanvas/approved/characters/merchant_v02_75962.glb?v=0.14.022';
function loadMerchantV02(app,merchantRoot,visual){
  visual.phase='loading';
  visual.assetUrl=MERCHANT_V02_GLB;
  try{
    app.assets.loadFromUrl(MERCHANT_V02_GLB,'container',(error,asset)=>{
      if(error||!asset?.resource){
        visual.phase='fallback';
        visual.error=String(error||'GLB container missing');
        console.warn('Genesis merchant V02: keeping fallback',visual.error);
        return;
      }
      let model;
      try{
        model=asset.resource.instantiateRenderEntity();
        if(!model)throw new Error('GLB container provided no render entity');
        model.name='Mercader V02 · Meshoptimizer 75962 tri';
        // The asset faces local -Z; parent +90 degrees turns toward the west
        // market access. No borrowed humanoid, apron cubes or rig animations.
        model.setLocalPosition(0,0,0);
        model.setLocalEulerAngles(0,0,0);
        merchantRoot.addChild(model);
        const components=model.findComponents('render');
        const instances=components.flatMap(r=>r.meshInstances||[]);
        if(!instances.length)throw new Error('GLB has no renderable mesh instances');
        function extents(){
          let minY=Infinity,maxY=-Infinity;
          for(const mi of instances){
            const box=mi.aabb;if(!box)continue;
            minY=Math.min(minY,box.getMin().y);
            maxY=Math.max(maxY,box.getMax().y);
          }
          return {minY,maxY};
        }
        const initial=extents();
        const originalHeight=initial.maxY-initial.minY;
        if(!Number.isFinite(originalHeight)||originalHeight<=.1)
          throw new Error('Invalid model height / bounds');
        const scale=1.84/originalHeight;
        if(!Number.isFinite(scale)||scale<.05||scale>30)
          throw new Error('Unreasonable merchant model scale '+scale);
        model.setLocalScale(scale,scale,scale);
        const scaled=extents();
        if(!Number.isFinite(scaled.minY))throw new Error('Model floor bounds unavailable');
        model.setLocalPosition(0,merchantRoot.getPosition().y-scaled.minY,0);
        // Remove placeholder only AFTER a complete successful import.
        for(const old of [...merchantRoot.children]){
          if(old!==model)old.destroy();
        }
        visual.phase='ready';
        visual.modelName=model.name;
        visual.meshInstances=instances.length;
        visual.renderComponents=components.length;
        visual.heightMeters=1.84;
        visual.triangles=75962;
        visual.error=null;
      }catch(cause){
        if(model?.parent)model.destroy();
        visual.phase='fallback';
        visual.error=String(cause);
        console.warn('Genesis merchant V02: model setup failed',cause);
      }
    });
  }catch(error){
    visual.phase='fallback';visual.error=String(error);
    console.warn('Genesis merchant V02: loading unavailable',error);
  }
}
"""
merchant=merchant.replace("export function mountGenesisMarket(options){",loader+"\nexport function mountGenesisMarket(options){",1)
merchant=merchant.replace("  const npc=buildMerchant(village.root,character);",
    "  const npc=buildMerchant(village.root,character);\n"+
    "  const visual={phase:'initializing',assetUrl:null,triangles:75962,meshInstances:0,error:null};\n"+
    "  loadMerchantV02(app,npc.entity,visual);",1)
merchant=merchant.replace("const status={version:'v0.14.021'","const status={version:'v0.14.022'",1)
merchant=merchant.replace("window.__genesisMarket=Object.freeze({...status,catalog,open});",
                          "window.__genesisMarket=Object.freeze({...status,catalog,open,visual});",1)
merchant=merchant.replace("/* Project Genesis · V0.14.021", "/* Project Genesis · V0.14.022",1)
merchant=merchant.replace("genesis_market_domain_v001.js?v=0.14.021","genesis_market_domain_v001.js?v=0.14.022",1)
assert merchant.count("loadMerchantV02(app,npc.entity,visual)") ==1
merchant_path.write_text(merchant,encoding="utf-8")

version_old,version_new="0.14.021","0.14.022"
build_old,build_new="20261101.03","20261102.04"
for rel in ("index.html","village_world.js"):
    path=root/rel
    before=path.read_text(encoding="utf-8")
    assert version_old in before and build_old in before, f"Missing expected version in {rel}"
    revised=before.replace(version_old,version_new).replace(build_old,build_new)
    path.write_text(revised,encoding="utf-8")
    print(rel,":",len(before),"bytes",before.count(version_old),"version references upgraded")
# Update existing pinned version assertions, not the gameplay rules or quest logic.
for test_name in ("tests/ordan_market_quest_v014021.cjs","tests/starter_sword_stock_v014020.cjs"):
    test_file=root/test_name
    qt=test_file.read_text(encoding="utf-8")
    assert (build_old in qt or r"20261101\.03" in qt) and (version_old in qt or r"0\.14\.021" in qt), test_name
    test_file.write_text(qt.replace(version_old,version_new).replace(r"0\.14\.021",r"0\.14\.022").replace(build_old,build_new).replace(r"20261101\.03",r"20261102\.04"),encoding="utf-8")
print("Done. Merchant V02 visual-only integration; interaction ID and market domain unchanged.")
