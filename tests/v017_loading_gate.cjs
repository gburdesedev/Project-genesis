'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const manifest=require('../v015/manifest.json');
const approved=require('../assets/playcanvas/approved/workshops/registry-v017.json');
const html=fs.readFileSync(path.join(root,'v015/index.html'),'utf8');
const preload=fs.readFileSync(path.join(root,'v015/v017-workshop-preload.js'),'utf8');
const stages=manifest.loadingStages;
assert.equal(manifest.version,'0.15-v017');
assert.equal(approved.professions.length,5,'All 5 workshops need inventory status');
const stageIds=stages.map(s=>s.id);
assert.equal(new Set(stageIds).size,stages.length,'Each progress block must be unique');
for(const id of ['gui','engine','gameplay','terrain','characters','animations','walls','doors','lighting','secondary']){
 assert(stageIds.includes(id),'Missing real load block: '+id);
}
const charIds=new Set(manifest.characters.map(x=>x.id));
const modelIds=new Set((manifest.workshopAssets||[]).map(x=>x.id));
const allIds=new Set([...charIds,...modelIds,manifest.lightingAsset?.id]);
const assigned=new Set();
for(const stage of stages){
 for(const id of stage.assets||[]){
  assert(allIds.has(id),'Unknown entry in load block '+stage.id+': '+id);
  assert(!assigned.has(id),'Asset is counted in multiple blocks: '+id);
  assigned.add(id);
  const asset=manifest.characters.find(x=>x.id===id)||manifest.workshopAssets.find(x=>x.id===id)||manifest.lightingAsset;
  if(asset.kind==='animation')assert.equal(stage.id,'animations','Animation must appear only under Animaciones');
  if(asset.kind==='wall')assert.equal(stage.id,'walls','Wall must appear only under Paredes');
  if(asset.kind==='door')assert.equal(stage.id,'doors','Door must appear only under Puertas');
  if(asset.kind==='lighting')assert.equal(stage.id,'lighting','HDRI must appear only under Iluminación');
 }
}
for(const id of allIds)assert(assigned.has(id),'Asset missing from loading stages: '+id);
assert(stages.find(s=>s.id==='terrain').kind==='tracked','Ground loading must reflect real floor completion');
assert(stages.find(s=>s.id==='village').kind==='tracked','Five-workshop assembly must have its own real loading block');
for(const id of ['roof-herrero-v013','chimney-herrero-v013'])assert(stages.find(s=>s.id==='roofs').assets.includes(id),'Existing roof/chimney must be tracked');
assert(html.includes('<body class="genesis-v017-loading">'),'World must start hidden before JS startup');
assert(html.includes('body.genesis-v017-loading canvas#app{visibility:hidden!important}'),'World must not flash during loading');
assert(html.includes("if(worldLoadReady)document.body.classList.remove('genesis-v017-loading')"),'Scene reveal only after load');
assert(html.includes('worldLoadReady=floorsResult.ok&&workshopLoad.ok&&missing.length===0'),'The load gate must require real model, HDR and PBR readiness');
assert(html.includes('Reserva')||html.includes('Reservado para PC'),'Mobile HQ fallback must remain explicit');
assert(preload.includes('pc.EnvLighting.generateLightingSource')&&preload.includes('app.scene.envAtlas=atlas'),'Real HDR must light PBR materials via prefitered IBL');
assert(!preload.includes('raw.githubusercontent.com')&&!preload.includes('cdn.jsdelivr.net'),'No external runtime assets');
const known={
 'door-herrero-v082-b':'assets/vendor/genesis/externals/blacksmithDoorV082/src/door-herrero-v082-b.glb',
 'door-arcanista-v027':'assets/vendor/genesis/externals/arcanistDoorV027/src/Arcanist_Door_V027_WebGL.glb',
 'wall-herrero-v082':'assets/vendor/genesis/externals/blacksmithWallsV082/src/blacksmith_four_walls_arched_v082.glb',
 'wall-arcanista-v006':'assets/vendor/genesis/externals/arcanistWallsV006/src/arcanista_four_walls_preview.glb'
};
for(const asset of manifest.workshopAssets){
 const target=path.join(root,path.normalize(path.join('v015',asset.file)));
 const source=path.join(root,known[asset.id]);
 const actual=fs.readFileSync(target),original=fs.readFileSync(source);
 assert(actual.equals(original),'V017 changed source geometry: '+asset.id);
 assert.equal(actual.subarray(0,4).toString('ascii'),'glTF','GLB magic mismatch: '+asset.id);
 const declaredSize=approved.professions.flatMap(x=>[x.door,x.walls]).find(x=>x.path===path.relative(root,target).replace(/\\/g,'/'))?.bytes;
 if(declaredSize)assert.equal(actual.length,declaredSize,'GLB registry bytes mismatch');
}
const hdrHashes={
 '1k':'e7cfda5f4e98e623db12b8bfd0184e048488e4855d9c83e2751fb44a32e80c45',
 '2k':'36724313c0fc66dab126ff90f081b85a0b1ef47be65eda1417bd20b033f0573f'
};
for(const size of ['1k','2k']){
 const file=path.join(root,'assets/playcanvas/approved/lighting/studio_small_09/studio_small_09_'+size+'.hdr');
 const bytes=fs.readFileSync(file);
 const header=bytes.subarray(0,256).toString('ascii');
 assert(header.startsWith('#?RADIANCE')||header.startsWith('#?RGBE'),'Invalid HDR source');
 assert(header.includes('FORMAT=32-bit_rle_rgbe'),'HDR source was replaced by 8-bit LDR');
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hdrHashes[size],'Unexpected HDRI');
}
assert(approved.professions.find(x=>x.profession==='Herrero').door.status==='approved_by_user');
assert(approved.professions.find(x=>x.profession==='Arcanista').door.status==='approved_by_user');
for(const prof of ['Herrero','Arcanista']){
 assert.equal(approved.professions.find(x=>x.profession===prof).walls.status,'approved_by_user');
}
console.log('PASS V017 · 10 honest load blocks, exact approved door GLBs, unmodified candidate walls, genuine local 32-bit HDRI 1K/2K, scene reveal gate');
