'use strict';
/**
 * Independent audit of the REAL V014022 embedded GenesisPrototypeEngines.
 * No guessed formulas, no mocked inventory, no changes to game state or main.
 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');
const out='previews/v014022-seed-material-sweep';
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync('index.html','utf8');
const match=html.match(/<script\b[^>]*\bid=["']genesis-prototype-engines["'][^>]*>([\s\S]*?)<\/script>/i);
if(!match)throw Error('The original NGE prototype engine script was not found in index.html');
const context={window:{},console,Date,Math,performance:{now:()=>100}};
vm.runInNewContext(match[1],context,{filename:'genesis-prototype-engines.js',timeout:30000});
const engine=context.window.GenesisPrototypeEngines;
if(!engine||typeof engine.generateSession!=='function')throw Error('No genuine GenesisPrototypeEngines.generateSession exposed');
const trials=512, materialCounts=Object.create(null),comboCounts=Object.create(null),examples=[],all=[];
const failures=[];
for(let i=1;i<=trials;i++){
  const seed=i;
  const sess=engine.generateSession('Herrero',{seed});
  const repeated=engine.generateSession('Herrero',{seed});
  if(JSON.stringify(sess)!==JSON.stringify(repeated))failures.push({seed,error:'non-reproducible seed'});
  const f=sess.formulas.espada_hierro;
  const shield=sess.formulas.escudo_hierro;
  if(!f||!shield)throw Error('Missing sword/shield recipe in seed '+seed);
  const materialNames=f.materials.map(m=>m.material);
  const ingots=sess.requiredStock['Lingote de hierro']||0;
  const chest={...sess.requiredStock};
  if(ingots){delete chest['Lingote de hierro'];chest['Mineral de hierro']=(chest['Mineral de hierro']||0)+ingots;}
  // Chest result is the same real transformation used by the original
  // GenesisPreparation.rawStock: prepared ingots become raw mineral.
  const extras=Object.keys(chest).filter(x=>!['Mineral de hierro','Carbón vegetal'].includes(x));
  const wood=extras.find(x=>x.startsWith('Madera seca de '));
  const secondary=extras.find(x=>['Cuero bovino curtido','Cuero caprino curtido','Cordel de cáñamo','Hilo de lino'].includes(x));
  if(materialNames.length!==4||!materialNames.includes('Lingote de hierro')||!materialNames.includes('Carbón vegetal')||!wood||!secondary||extras.length!==2) failures.push({seed,error:'unexpected starter material types',chest});
  if(Object.values(chest).some(x=>x<=0||!Number.isInteger(x)))failures.push({seed,error:'invalid quantity',chest});
  const combo=secondary+' + '+wood;
  comboCounts[combo]=(comboCounts[combo]||0)+1;
  Object.keys(chest).forEach(k=>materialCounts[k]=(materialCounts[k]||0)+1);
  const row={seed,session:sess.id,materialNames:Object.keys(chest),chest,recipe:f.materials,shieldRecipe:shield.materials,combo};
  all.push(row);
  if(i<=12)examples.push(row);
}
const result={
  runAt:new Date().toISOString(),
  provenance:'Unmodified embedded GenesisPrototypeEngines from index.html',
  mode:'512 independent deterministic new Herrero seeds',
  trials,
  uniqueStarterCombos:Object.keys(comboCounts).length,
  materialCounts,
  comboCounts,
  examples,
  knownCatalogMaterials:['Mineral de hierro','Lingote de hierro','Carbón vegetal','Cuero bovino curtido','Cuero caprino curtido','Cordel de cáñamo','Hilo de lino','Madera seca de fresno','Madera seca de roble'],
  failures
};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(result,null,2));
fs.writeFileSync(path.join(out,'all-seeds.json'),JSON.stringify(all,null,2));
const csv=['seed,session,ore,charcoal,bovine,caprine,hemp,linen,oak,ash,combination'];
for(const t of all){
 const x=t.chest, cols=[t.seed,t.session,x['Mineral de hierro']||0,x['Carbón vegetal']||0,x['Cuero bovino curtido']||0,x['Cuero caprino curtido']||0,x['Cordel de cáñamo']||0,x['Hilo de lino']||0,x['Madera seca de roble']||0,x['Madera seca de fresno']||0,'"'+t.combo+'"'];
 csv.push(cols.join(','));
}
fs.writeFileSync(path.join(out,'all-seeds.csv'),csv.join('\n')+'\n');
console.log('SEED_SWEEP_FINAL',JSON.stringify({trials,materialCounts,comboCounts,examples:examples.slice(0,5).map(x=>({seed:x.seed,chest:x.chest})),failures:failures.slice(0,4)}));
if(failures.length)process.exitCode=1;
