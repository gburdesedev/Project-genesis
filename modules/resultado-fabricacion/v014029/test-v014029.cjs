'use strict';
// Standalone contract smoke test, no browser, no game boot and no production writes.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=__dirname;
const mod=require(path.join(root,'resultado-fabricacion-v014029.js'));
assert.equal(mod.id,'resultado-fabricacion-v014029');
assert.equal(mod.status,'visual-approved-module-only');
const ctx={
  recipes:{espada_hierro:{name:'Espada de hierro',profession:'Herrero'}},
  itemVisual:()=>({c1:'#c3a16e',label:'CANAL BASE'}),
  formulaWeightBreakdown:formula=>formula.materials,
  recipeKind:()=> 'Espadas',
  metricForChannel:(_item,c,i)=>({label:i===0?'Daño base':c[0],display:String(c[1])}),
  itemAssetMarkup:()=>'<img class="genesisSwordV12BCycles" src="./assets/playcanvas/approved/equipment/espada_v03_hierro_v175_v12b_cycles_hdri32.png">',
  AFFINITY_VISUAL:{Base:'#c3a16e',Fuego:'#ff6f2a'},
  esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')
};
const original={
  recipe:'espada_hierro',name:'Espada nacida de la forja',rarity:'Común',
  formula:{materials:[{material:'Lingote de hierro',qty:2},{material:'Carbón vegetal',qty:1}]},
  channels:[['Base',42.7],['Fuego',63]]
};
const before=JSON.stringify(original);
const html=mod.render(original,ctx);
assert.match(html,/RESULTADO DE FABRICACIÓN/);
assert.match(html,/data-result-art="historic-creation-v014029"/);
assert.match(html,/data-approved-sword="V03-V175-V12B"/);
assert.match(html,/genesisSwordV12BCycles/);
assert.match(html,/Lingote de hierro/);
assert.match(html,/Carbón vegetal/);
assert.match(html,/Daño base/);
assert.match(html,/Fuego/);
assert.equal((html.match(/class="genesisHistoricChannel"/g)||[]).length,2);
assert.equal(JSON.stringify(original),before,'Rendering must not modify the actual game item');
assert.equal((mod.render({...original,channels:[['Base',1]]},ctx).match(/class="genesisHistoricChannel"/g)||[]).length,1);
assert.throws(()=>mod.render(original,{}),/missing adapter/);
assert.throws(()=>mod.render({...original,recipe:'missing'},ctx),/unknown recipe/);
const css=fs.readFileSync(path.join(root,'resultado-fabricacion-v014029.css'),'utf8');
assert.match(css,/\.genesisHistoricResult\s*\{/);
assert.match(css,/\.craftModal:has\(\.genesisHistoricResult\)/);
const index=fs.readFileSync(path.join(root,'../../../index.html'),'utf8');
assert.ok(index.includes('Project Genesis v0.14.028'),'Module branch must retain stable host main');
assert.ok(!index.includes('renderGenesisHistoricCreationResult(item)'), 'Module branch must NOT patch gameplay');
console.log('PASS V014029: pure renderer, dynamic channels, unchanged item, approved CSS, untouched stable game');
