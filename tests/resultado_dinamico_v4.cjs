'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'genesis_result_dynamic_v001.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const resultContext={window:{}};
vm.runInNewContext(source,resultContext,{filename:'genesis_result_dynamic_v001.js'});
const result=resultContext.window.GenesisResultDynamic;
assert.ok(result?.normalize);
const matched=html.match(/<script id="genesis-prototype-engines">([\s\S]*?)<\/script>/i);
assert.ok(matched,'Motor real no encontrado');
const game={window:{},console};
vm.runInNewContext(matched[1],game,{filename:'engine-from-index.html'});
const engine=game.window.GenesisPrototypeEngines;
assert.ok(engine?.fabricate && engine?.present,'Motor no disponible');
const session=engine.generateSession('Herrero',{seed:84211});
const formula=session.formulas.espada_hierro;
assert.ok(formula,'Fórmula procedimental real de sesión');
assert.match(html,/GenesisResultDynamic\?\.decorate\?\.\(modalBox,item,itemAssetMarkup\)/);
assert.match(html,/id="resultContinue"/);
assert.ok(html.includes('genesis_result_dynamic_v001.css?v=014029')&&html.includes('genesis_result_dynamic_v001.js?v=014029'));
const names=new Set();
for(let n=1;n<=12;n++){
 const first=engine.present(engine.fabricate('espada_hierro',{craft:1,seed:n*977,artisan:'QA',formula}),names);
 const second=engine.present(engine.fabricate('espada_hierro',{craft:2,seed:n*977+1,artisan:'QA',formula}),names);
 for(const item of [first,second]){
  const snapshot=result.normalize(item);
  assert.equal(snapshot.name,item.name);
  assert.equal(snapshot.rarity,item.rarity);
  assert.deepEqual(Array.from(snapshot.channels,c=>c.key),Array.from(item.channels,c=>(c[0]==='Daño'||c[0]==='Protección')?'Base':c[0]));
  assert.deepEqual(Array.from(snapshot.channels,c=>c.value),Array.from(item.channels,c=>c[1]));
  const ui=result.html(item);
  assert.equal((ui.match(/class="grChannelGroup"/g)||[]).length,item.channels.length);
  assert.match(ui,/id="resultContinue"/);
  assert.match(ui,/data-result-recipe="espada_hierro"/);
  assert.match(ui,/espada_v03_hierro_v175_v12b_cycles_hdri32\.png/);
  assert.doesNotMatch(ui,/src=".*sword\.glb"/);
 }
 assert.equal(first.channels.length,1,'Primera espada: solamente Base');
 assert.equal(first.rarity,'Inútil','Rareza pedagógica sin recalcular');
 assert.ok(second.channels.length>=2 && second.channels.length<=3);
 assert.ok(['Común','Bueno'].includes(second.rarity));
}
const example={id:'item-a',name:'Espada',rarity:'Bueno',recipe:'espada_hierro',
  channels:[['Daño',85],['Fuego',78],['Hielo',43]],description:'NGE',
  channelTechniques:{Fuego:[{nombre:'Quemadura',valor:32}]}};
const ui=result.html(example);
assert.match(ui,/data-result-channel="Base"/);
assert.match(ui,/data-result-channel="Fuego"/);
assert.match(ui,/data-result-channel="Hielo"/);
assert.doesNotMatch(ui,/data-result-channel="Luz"/);
assert.match(ui,/Quemadura/);
assert.equal((ui.match(/class="grChannelGroup"/g)||[]).length,3);
assert.equal((ui.match(/class="grSub"/g)||[]).length,1);
assert.throws(()=>result.normalize({...example,channels:[['Daño',10],['Daño',30]]}),/duplicado/);
assert.throws(()=>result.normalize({...example,channels:[['Daño',10],['Rayo','no']] }),/inválido/);
const secure=result.html({...example,name:'<script>alert(1)</script>'});
assert.doesNotMatch(secure,/<script>alert/);
const glbUi=result.html({...example,modelAsset:'assets/playcanvas/approved/equipment/sword_approved.glb'});
assert.match(glbUi,/model-viewer/);
assert.match(glbUi,/camera-controls/);
const external=result.html({...example,modelAsset:'https://unapproved.example/sword.glb'});
assert.doesNotMatch(external,/<model-viewer data-result-approved-glb="true"/);
assert.match(external,/GLB jugable pendiente/);
console.log('PASS: engine NGE real, 24 espadas de sesión, canales dinámicos sin ocho barras fijas, NGE, continuidad, GLB autorizado, render V12B fiel, sanitización.');
