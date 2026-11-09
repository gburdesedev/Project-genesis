const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const world=fs.readFileSync(path.join(root,'village_world.js'),'utf8');
const merchant=fs.readFileSync(path.join(root,'genesis_market_v001.js'),'utf8');
const market=require('../genesis_market_domain_v001.js');
const quest=require('../genesis_market_quest_v001.js');
const openTag='<script id="genesis-prototype-engines">';
const idx=html.indexOf(openTag),end=html.indexOf('</script>',idx);
assert(idx>=0&&end>idx);
const sandbox={window:{GenesisDevice:{safePreviews:false}},console,performance:{now:()=>10},addEventListener(){}};
vm.createContext(sandbox);
vm.runInContext(html.slice(idx+openTag.length,end),sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8'),sandbox);
const engine=sandbox.window.GenesisPrototypeEngines,prep=sandbox.window.GenesisPreparation;
assert(engine&&prep);

test('seed-aware market and shortage: exactly enough for two shields, across 80 seeds',()=>{
 for(let seed=0;seed<80;seed++){
  const session=engine.generateSession('Herrero',{seed:seed*102193+7});
  const offered=market.catalog(session,prep.rawStock);
  const starting=prep.rawStock(session.requiredStock);
  // Two swords completely consume the initial grant, including the prepared ingots.
  const swords=session.formulas.espada_hierro;
  assert.equal(prep.convert(starting,session.requiredStock['Lingote de hierro']),true);
  for(let n=0;n<2;n++){
   assert.equal(prep.ready(swords,starting),true);
   for(const m of swords.materials)starting[m.material]-=m.qty;
  }
  assert(Object.values(starting).every(n=>n===0));
  const required=quest.shieldNeeds(session,starting);
  assert(required.length>=2&&required.every(n=>n.missing>0));
  assert.equal(quest.ready(session,starting),false);
  assert(required.every(n=>offered.includes(n.material)),'Merchant must sell every missing demo material');
  for(const n of required){
   let remaining=n.missing;
   while(remaining>0){
    const quantity=Math.min(99,remaining);
    const purchased=market.buy({session,inventory:starting,material:n.material,quantity,toRawStock:prep.rawStock});
    assert.equal(purchased.ok,true);
    assert.equal(purchased.cost,0);
    remaining-=quantity;
   }
  }
  assert.equal(quest.ready(session,starting),true);
  assert(quest.shieldNeeds(session,starting).every(n=>n.missing===0));
  const ore=starting['Mineral de hierro'];
  assert.equal(prep.convert(starting,ore),true);
  const shield=session.formulas.escudo_hierro;
  for(let n=0;n<2;n++){
   assert.equal(prep.ready(shield,starting),true);
   for(const m of shield.materials)starting[m.material]-=m.qty;
  }
  assert(Object.values(starting).every(n=>n===0));
 }
});
test('already prepared ingots and previous partial purchases count toward restocking',()=>{
 const session=engine.generateSession('Herrero',{seed:103});
 const current={},base=quest.shieldNeeds(session,current);
 const iron=base.find(n=>n.material==='Mineral de hierro');
 assert(iron?.needed>=4);
 current['Lingote de hierro']=1;current['Mineral de hierro']=2;
 const after=quest.shieldNeeds(session,current).find(n=>n.material==='Mineral de hierro');
 assert.equal(after.missing,Math.max(0,iron.needed-3));
 assert.equal(quest.ready(null,current),false);
 assert.deepEqual(quest.shieldNeeds(engine.generateSession('Curtidor',{seed:103}),current),[]);
});
test('Ordan escorts the player to the actual market, and preserves the old quest indices',()=>{
 assert.deepEqual(quest.steps,{talk:11.25,escort:11.5,shop:11.75});
 const route=quest.escortPath;
 assert(route.length>=8);
 assert(Math.hypot(route.at(-1).x-25.5,route.at(-1).z-36.3)<2.5);
 assert(route.some(p=>Math.abs(p.x-7)<.01&&Math.abs(p.z-16)<.01));
 assert.match(html,/stepAt===11[\s\S]{0,300}GenesisMarketQuest\.steps\.talk/);
 assert.match(html,/startOrdanMarketEscort/);
 assert.match(html,/updateOrdanMarketEscort\(dt,now\)/);
 assert.match(html,/if\(distanceToPlayer>6\.75\)/);
 assert.match(html,/if\(\[10,11,12,13\]\.includes\(tutorialStep\)\)return\[\{id:'craft'/);
 assert.match(html,/case 11\.75:return\{label:'Comerciante del mercado'/);
 assert.match(html,/if\(selectedProfession==='Herrero'&&tutorialStep===window\.GenesisMarketQuest\.steps\.shop/);
 assert.match(html,/setTutorialStep\(12\)/);
 assert.match(html,/function questNumber\(\)\{return tutorialStep===10\?'Q2':tutorialStep===11\?'Q3':tutorialStep===12\?'Q5':'Q6'\}/);
 assert.match(html,/DIRECT_MERCENARY_AFTER_CRAFTS\?showMercenaryCandidates\(\):completePrototype\(\)/);
});
test('merchant opens after Ordan lesson, quantity defaults to missing stock and no unknown goods',()=>{
 assert.match(html,/canTrade:\(\)=>selectedProfession!=='Herrero'\|\|tutorialStep>=window\.GenesisMarketQuest\.steps\.shop/);
 assert.match(merchant,/if\(typeof canTrade==='function'&&!canTrade\(\)\)/);
 assert.match(merchant,/getMarketNeeds/);
 assert.match(merchant,/const missing=needByName\.get\(name\)\?\.missing\|\|0/);
 assert.match(merchant,/if\(typeof onPurchase==='function'\)onPurchase\(result\)/);
 assert.match(merchant,/quantity:chosen\[name\]\|\|Math\.min\(99,Math\.max\(1,needByName\.get\(name\)\?\.missing\|\|0\)\)/);
 assert.match(html,/import '\.\/genesis_market_quest_v001\.js\?v=0\.14\.022'/);
 assert.match(html,/<title>Project Genesis v0\.14\.022 · Build 20261102\.04/);
 assert.match(world,/version='v0\.14\.022', build='20261102\.04'/);
 assert.match(merchant,/version:'v0\.14\.022'/);
 assert.match(html,/village_world\.js\?v=0\.14\.022/);
});
