"""Integrate approved merchant V02 art into live market preserving all quests/menus.
Run only inside feature branch checked out by GitHub Actions.
"""
from pathlib import Path
root=Path(__file__).resolve().parent.parent
market=root/'genesis_market_v001.js'
src=market.read_text(encoding='utf-8')
assert 'function buildMerchant(world,source){' in src
assert 'return {entity:merchantRoot,fullCharacter:hasModel};' in src
assert "const npc=buildMerchant(village.root,character);" in src
assert "window.__genesisMarket=Object.freeze({...status,catalog,open});" in src
src=src.replace('function buildMerchant(world,source){','function buildMerchant(world,source,app){')
# Keep existing fallback and its own materials until GLB has finished loading.
replacement=String.raw if False else None
insert="""  // V02 Meshoptimizer: use the actual GLB without modifying PBR materials.
  // The old character and apron are retained only as a visible loading fallback.
  const placeholders=merchantRoot.children.slice();
  const modelState={state:'loading',triangles:75962,meshInstances:0,error:null};
  const modelURL='./assets/playcanvas/approved/characters/mercader-v02-75962.glb?v=0.14.022';
  app.assets.loadFromUrlAndFilename(modelURL,'mercader-v02-75962.glb','container',(err,asset)=>{
    if(err||!asset?.resource){
      modelState.state='fallback';
      modelState.error=String(err||'GLB sin recurso PlayCanvas');
      console.error('[Genesis Mercader V02] No se pudo cargar el GLB:',modelState.error);
      return;
    }
    let imported=null;
    try{
      imported=asset.resource.instantiateRenderEntity({castShadows:true,receiveShadows:true});
      const renders=imported.findComponents('render');
      const count=renders.reduce((total,r)=>total+(r.meshInstances?.length||0),0);
      if(!count)throw Error('GLB sin mallas renderizables');
      imported.name='Mercader V02 · Meshoptimizer · 75.962 triángulos';
      // Source bounds: Y [-1,+1] metres. Scale .92 => body + staff ~1.84m.
      // The root rotates +90 degrees to face the western market entrance.
      imported.setLocalPosition(0,.92,0);
      imported.setLocalEulerAngles(0,0,0);
      imported.setLocalScale(.92,.92,.92);
      merchantRoot.addChild(imported);
      for(const fallbackPart of placeholders)fallbackPart.destroy();
      modelState.state='ready';
      modelState.meshInstances=count;
      console.info('[Genesis Mercader V02] GLB visible en el mercado; triángulos:',modelState.triangles);
    }catch(error){
      if(imported?.parent===merchantRoot)imported.destroy();
      modelState.state='fallback';
      modelState.error=String(error);
      console.error('[Genesis Mercader V02] Modelo incompatible:',error);
    }
  });
  return {entity:merchantRoot,fullCharacter:hasModel,modelState};"""
src=src.replace('  return {entity:merchantRoot,fullCharacter:hasModel};',insert)
src=src.replace("const npc=buildMerchant(village.root,character);","const npc=buildMerchant(village.root,character,app);")
src=src.replace("window.__genesisMarket=Object.freeze({...status,catalog,open});","window.__genesisMarket=Object.freeze({...status,catalog,open,modelStatus:()=>Object.freeze({...npc.modelState})});")
src=src.replace("status={version:'v0.14.021'","status={version:'v0.14.022'")
src=src.replace("import './genesis_market_domain_v001.js?v=0.14.021';","import './genesis_market_domain_v001.js?v=0.14.022';")
src=src.replace('V0.14.021','V0.14.022')
market.write_text(src,encoding='utf-8')

world=root/'village_world.js'
s=world.read_text(encoding='utf-8')
assert "version='v0.14.021', build='20261101.03'" in s
s=s.replace("version='v0.14.021', build='20261101.03'","version='v0.14.022', build='20261102.01'")
world.write_text(s,encoding='utf-8')

html=root/'index.html'
s=html.read_text(encoding='utf-8')
assert '<title>Project Genesis v0.14.021 · Build 20261101.03' in s
s=s.replace('v0.14.021','v0.14.022').replace('0.14.021','0.14.022').replace('20261101.03','20261102.01')
assert '<title>Project Genesis v0.14.022 · Build 20261102.01' in s
assert "genesis_market_v001.js?v=0.14.022" in s
html.write_text(s,encoding='utf-8')
# These legacy contract tests pin a release literal, not game behavior.
for testname in ('tests/ordan_market_quest_v014021.cjs','tests/starter_sword_stock_v014020.cjs'):
    path=root/testname
    test=path.read_text(encoding='utf-8')
    assert 'v0\\.14\\.021' in test, testname
    test=test.replace(r'v0\\.14\\.021',r'v0\\.14\\.022').replace(r'0\\.14\\.021',r'0\\.14\\.022')
    test=test.replace('20261101\\.03','20261102\\.01').replace('20261101.03','20261102.01')
    path.write_text(test,encoding='utf-8')
print('UPDATED market render only, release v0.14.022 Build 20261102.01 and release-pinned regression assertions')
