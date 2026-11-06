'use strict';
/** Project Genesis v014025 — state-independent vertical slice logic audit.
 * Uses the REAL game engine, real market domain, real preparation code,
 * and mercenary equipment rules. No fixtures of invented materials or recipes.
 * Physical navigation and rendering must pass separate browser checks.
 */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const match=html.match(/<script\b[^>]*\bid=["']genesis-prototype-engines["'][^>]*>([\s\S]*?)<\/script>/i);
assert(match,'missing genuine embedded game engine');
const env={window:{GenesisDevice:{safePreviews:false}},console,Date,Math,performance:{now:()=>100},addEventListener(){}};
vm.createContext(env);
vm.runInContext(match[1],env,{filename:'genesis-prototype-engines.js',timeout:30000});
vm.runInContext(fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8'),env);
const engine=env.window.GenesisPrototypeEngines;
const prep=env.window.GenesisPreparation;
const market=require('../genesis_market_domain_v001.js');
const quest=require('../genesis_market_quest_v001.js');
require('../mercenary_equipment_domain_v001.js');
const gear=globalThis.GenesisMercenaryEquipment;
assert(engine?.generateSession&&engine?.fabricate&&engine?.present&&prep?.rawStock&&prep?.convert);
assert(market?.catalog&&market?.buy&&quest?.shieldNeeds&&gear?.create);
const audit={version:'V014025',at:new Date().toISOString(),seeds:0,recipes:0,
  swords:0,shields:0,marketPurchases:0,nges:0,mercenaryEquip:0,uniqueMaterialPairs:[],
  failures:[],coreLogicPass:false,full3DPlaythroughVerified:false};
const pair=new Set();
const plain=x=>JSON.parse(JSON.stringify(x));
const materialNames=new Set(['Mineral de hierro','Lingote de hierro','Carbón vegetal',
  'Madera seca de roble','Madera seca de fresno','Cuero bovino curtido','Cuero caprino curtido','Cordel de cáñamo','Hilo de lino']);
function consume(formula,inventory,seed,step){
  assert(prep.ready(formula,inventory),'formula not ready at step '+step+' seed '+seed);
  for(const m of formula.materials){
    assert(inventory[m.material]>=m.qty,'shortage at '+step+' seed '+seed+' '+m.material);
    inventory[m.material]-=m.qty;
    assert(inventory[m.material]>=0);
  }
}
function makeOne(recipe,formula,craft,seed,used){
  const raw=engine.fabricate(recipe,{craft,seed:((seed*3817+craft*197)+(recipe==='espada_hierro'?2:4))>>>0,
    artisan:'Artesano de prueba NGE',formula});
  assert.equal(raw.formula.signature,formula.signature);
  assert.equal(raw.channels.length,craft===1?1:raw.channels.length);
  if(craft===1)assert.equal(raw.rarity,'Inútil');
  else assert(['Común','Bueno'].includes(raw.rarity));
  assert(raw.channels.length>=1&&raw.channels.length<=3);
  assert(raw.channels.every(c=>Number.isFinite(c[1])&&c[1]>=1&&c[1]<=100));
  assert.equal(new Set(raw.affinities.map(x=>x[0])).size,raw.affinities.length);
  const item=engine.present(raw,used);
  assert(item.name&&item.name.length>5);
  const id=item.name.toLocaleLowerCase('es');
  assert(!used.has(id),'duplicate NGE name '+id);
  used.add(id);audit.nges++;
  return item;
}
test('1024 real Herrero seeds: two swords -> merchant -> two shields -> NGE -> equip',()=>{
  for(let k=1;k<=1024;k++){
    const seed=(k*2654435761)>>>0;
    const session=engine.generateSession('Herrero',{seed});
    audit.seeds++;
    const sword=session.formulas.espada_hierro,shield=session.formulas.escudo_hierro;
    assert(sword&&shield,'both real recipes');
    audit.recipes+=2;
    assert(Object.keys(session.requiredStock).every(n=>materialNames.has(n)));
    const required={};
    for(const part of sword.materials)required[part.material]=(required[part.material]||0)+part.qty*2;
    assert.deepEqual(plain(session.requiredStock),required);
    const secondary=sword.materials.find(x=>['Cuero bovino curtido','Cuero caprino curtido','Cordel de cáñamo','Hilo de lino'].includes(x.material));
    const wood=sword.materials.find(x=>x.material.startsWith('Madera seca'));
    assert(secondary&&wood);
    pair.add(wood.material+' × '+secondary.material);
    const inventory=prep.rawStock(session.requiredStock);
    const nIngots=required['Lingote de hierro']||0;
    assert(!inventory['Lingote de hierro']);
    assert.equal(inventory['Mineral de hierro'],nIngots);
    assert(prep.convert(inventory,nIngots),'real thermal conversion stock model');
    const used=new Set();
    const swordA=makeOne('espada_hierro',sword,1,seed,used);
    consume(sword,inventory,seed,'sword_1');audit.swords++;
    const swordB=makeOne('espada_hierro',sword,2,seed,used);
    consume(sword,inventory,seed,'sword_2');audit.swords++;
    assert(Object.values(inventory).every(x=>x===0),'starter stock exactly consumed');
    assert.equal(quest.ready(session,inventory),false);
    const offers=market.catalog(session,prep.rawStock);
    const needs=quest.shieldNeeds(session,inventory);
    assert(needs.length>=3&&needs.every(n=>n.missing>0));
    for(const need of needs){
      assert(offers.includes(need.material),'merchant lacks needed material '+need.material);
      let rest=need.missing;
      while(rest>0){
        const qty=Math.min(rest,99);
        const bought=market.buy({session,inventory,material:need.material,quantity:qty,toRawStock:prep.rawStock});
        assert.equal(bought.ok,true);assert.equal(bought.cost,0);audit.marketPurchases++;
        rest-=qty;
      }
    }
    assert(quest.ready(session,inventory),'market quest failed after exact purchases');
    assert(quest.shieldNeeds(session,inventory).every(n=>n.missing===0));
    const ore=inventory['Mineral de hierro']||0;
    assert(prep.convert(inventory,ore),'second real iron preparation');
    const shieldA=makeOne('escudo_hierro',shield,1,seed,used);
    consume(shield,inventory,seed,'shield_1');audit.shields++;
    const shieldB=makeOne('escudo_hierro',shield,2,seed,used);
    consume(shield,inventory,seed,'shield_2');audit.shields++;
    assert(Object.values(inventory).every(x=>x===0),'two shields should use exact purchased stock');
    if(k<=64){
      const items=[swordA,swordB,shieldA,shieldB];
      let roster=[{id:'testMerc',name:'Guerrero',equipment:{weapon:null,shield:null}}];
      const model=gear.create({getItems:()=>items,getMercenaries:()=>roster,
        saveMercenaries:next=>(roster=next,true)});
      model.chooseMerc('testMerc');
      model.chooseFamily('Espadas');
      assert(model.select(swordB.id));
      assert(model.equip().ok);
      assert.equal(roster[0].equipment.weapon,swordB.id);
      assert(!model.select(swordB.id),'worn sword cannot be listed as available');
      model.chooseFamily('Escudos');
      assert(model.select(shieldB.id));
      assert(model.equip().ok);
      assert.equal(roster[0].equipment.shield,shieldB.id);
      assert(!model.select(shieldB.id),'worn shield cannot be selected as unused');
      audit.mercenaryEquip++;
    }
  }
  audit.uniqueMaterialPairs=[...pair].sort();
  assert.equal(pair.size,8,'all two woods × four fiber/leather combinations');
});
test('merchant rejects off-seed items and invalid amounts without modifying stock',()=>{
 const session=engine.generateSession('Herrero',{seed:24}),inv={};
 assert.equal(market.buy({session,inventory:inv,material:'Diamante mítico',quantity:2,toRawStock:prep.rawStock}).ok,false);
 assert.equal(market.buy({session,inventory:inv,material:'Mineral de hierro',quantity:0,toRawStock:prep.rawStock}).ok,false);
 assert.equal(market.buy({session,inventory:inv,material:'Mineral de hierro',quantity:100,toRawStock:prep.rawStock}).ok,false);
 assert.deepEqual(inv,{});
});
test('Curtidor recipes/stocks remain untouched (128 additional sessions)',()=>{
 for(let seed=1;seed<=128;seed++){
  const session=engine.generateSession('Curtidor',{seed});
  const expected={};
  for(const f of Object.values(session.formulas))for(const m of f.materials)expected[m.material]=(expected[m.material]||0)+2*m.qty;
  assert.deepEqual(plain(session.stock),expected);
  assert.deepEqual(quest.shieldNeeds(session,{}),[]);
 }
});
test('quest arc, market escort and mercenary transitions still exist in the actual game',()=>{
 const steps=quest.steps;assert.equal(steps.talk,11.25);assert.equal(steps.escort,11.5);assert.equal(steps.shop,11.75);
 assert(quest.escortPath.length>=9);
 assert(quest.escortPath.some(p=>Math.hypot(p.x-7,p.z-16)<1));
 assert(Math.hypot(quest.escortPath.at(-1).x-25.5,quest.escortPath.at(-1).z-36.3)<2.5);
 for(const item of ["startOrdanMarketEscort","updateOrdanMarketEscort","showMercenaryCandidates","showMercenaryEquipment",
   "equipMercenaryCreations","showMercenarySheet","showExpeditionResult","showLockedDemoMaterial",
   "showDemoMaterialMentorDialogue","showExperimentalCraftConfirm","finishMercenaryDeparture",
   "function performCraft","function showComparison"]){
    assert(html.includes(item),'missing actual gameplay transition '+item);
 }
 for(const step of ['setTutorialStep(11)','setTutorialStep(12)','setTutorialStep(13)','setTutorialStep(17)',
   'setTutorialStep(20)','setTutorialStep(21)','setTutorialStep(22)','setTutorialStep(23)']){
   assert(html.includes(step),'missing game step '+step);
 }
});
test.after(()=>{
 audit.coreLogicPass=audit.failures.length===0&&audit.seeds===1024&&audit.swords===2048&&audit.shields===2048&&audit.mercenaryEquip===64;
 const output=path.join(root,'previews/v014025-logic-complete-qa/core-summary.json');
 fs.mkdirSync(path.dirname(output),{recursive:true});
 fs.writeFileSync(output,JSON.stringify(audit,null,2)+'\n');
 console.log('GENESIS_CORE_LOGIC_AUDIT',JSON.stringify(audit));
});
