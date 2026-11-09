'use strict';
// V014.030 source provenance and authentic NGE-channel data contract.
// A test fixture CAN exercise the 3D hook; it is NOT a distributable V12B GLB.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const src=fs.readFileSync(path.join(root,'genesis_result_live_v014030.js'),'utf8');
const sandbox={window:{},document:{}};
vm.runInNewContext(src,sandbox,{filename:'genesis_result_live_v014030.js'});
const viewer=sandbox.window.GenesisRealCraftViewer;
assert.equal(viewer.version,'V014.030');
const item={recipe:'espada_hierro',name:'Espada real NGE',channels:[['Base',42.7],['Fuego',63]]};
const oldImage='<img alt="V12B real Cycles" src="./assets/playcanvas/approved/equipment/espada_v03_hierro_v175_v12b_cycles_hdri32.png">';
const pending=viewer.render(item,oldImage);
assert.match(pending,/licensed-source-pending/);
assert.ok(pending.includes(oldImage),'original V12B render must remain');
assert.ok(!pending.includes('<model-viewer'),'No substitute model when legal source is absent');
assert.deepEqual(Array.from(viewer.channels(item),c=>[c.name,c.intensity]),[['Base',42.7],['Fuego',63]]);
assert.ok(!pending.includes('Hielo'),'No invented channel');
assert.equal(viewer.approvedModel(item),null);
const auth='e2228f078b2572768416c48c0e63c2d908f214e2c0625a2ab754c877a099112b';
sandbox.window.GenesisApprovedRuntimeModels={espada_hierro:{
  status:'approved',recipe:'espada_hierro',sha256:auth,
  url:'https://example.com/unrelated_sword.glb'
}};
assert.equal(viewer.approvedModel(item),null,'External replacement must be rejected');
sandbox.window.GenesisApprovedRuntimeModels.espada_hierro.url='./assets/playcanvas/approved/equipment/GENESIS_V03_V175_V12B.glb';
sandbox.window.GenesisApprovedRuntimeModels.espada_hierro.sha256='bad-provenance';
assert.equal(viewer.approvedModel(item),null,'Wrong model hash must be rejected');
sandbox.window.GenesisApprovedRuntimeModels.espada_hierro.sha256=auth;
const candidate=viewer.render(item,oldImage);
assert.match(candidate,/<model-viewer/);
assert.match(candidate,/GENESIS_V03_V175_V12B\.glb/);
assert.match(candidate,/data-genesis-model-state="loading"/);
assert.ok(candidate.includes(oldImage),'Keep true image until genuine GLB finishes loading');
assert.ok(!candidate.includes('Hielo'),'Never create an effect not rolled by NGE');
assert.match(html,/Project Genesis v0\.14\.030/);
assert.match(html,/GenesisRealCraftViewer\?\.render\(item,canonicalArt\)/);
assert.match(html,/GenesisRealCraftViewer\?\.activate\(item,modalBox\)/);
assert.match(html,/const item=engine\.present\(raw,usedItemNames\)/);
assert.match(html,/craftedItems\.push\(item\)/);
assert.ok(!html.includes('GenesisApprovedRuntimeModels={espada_hierro'),'DO NOT ship an unlicensed model override');
console.log('PASS V014.030: actual item channels, live GLB permission gate, safe certified fallback, no invented effect');
