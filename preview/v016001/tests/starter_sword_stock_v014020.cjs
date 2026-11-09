/* Project Genesis starter grant: real seeded engine + real preparation logic.
 * Assertions are made for multiple seeds; no hardcoded quantities or fixed material identities. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prepSource=fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8');
const openTag='<script id="genesis-prototype-engines">';
const i=source.indexOf(openTag);
assert(i>0,'Real seeded prototype engine script missing');
const j=source.indexOf('</script>',i+openTag.length);
assert(j>i,'Real engine script not closed');
const env={
  window:{GenesisDevice:{safePreviews:false}},
  performance:{now:()=>100},
  addEventListener:()=>{},
  console
};
vm.createContext(env);
vm.runInContext(source.slice(i+openTag.length,j),env,{filename:'embedded-prototype-engine.js'});
vm.runInContext(prepSource,env,{filename:'preparacion_control.js'});
const engine=env.window.GenesisPrototypeEngines;
const prep=env.window.GenesisPreparation;
assert(engine&&prep,'Real game engine or preparation unavailable');

function expectedFor(formula,copies=2){
  const expected={};
  for(const part of formula.materials)
    expected[part.material]=(expected[part.material]||0)+part.qty*copies;
  return expected;
}
function plain(obj){return JSON.parse(JSON.stringify(obj))}
function consume(formula,stock){
  if(!prep.ready(formula,stock))return false;
  for(const m of formula.materials)stock[m.material]-=m.qty;
  return true;
}

test('blacksmith starter stock contains EXACTLY two swords for many actual seeds',()=>{
  for(const seed of [0,1,2,3,7,11,23,42,1234,123456,65535,0xdeadbeef,0xffffffff,
    ...Array.from({length:64},(_,n)=>(n*2654435761)>>>0)]){
    const session=engine.generateSession('Herrero',{seed});
    assert(session.formulas.espada_hierro && session.formulas.escudo_hierro,'Both generated seed recipes must remain');
    const first=session.formulas.espada_hierro;
    const stock=expectedFor(first);
    assert.deepEqual(plain(session.requiredStock),stock,'Expected only materials for sword x2, seed '+seed);
    assert.deepEqual(plain(session.stock),stock,'Starter chest and requiredStock must match, seed '+seed);

    const inv=prep.rawStock(session.requiredStock);
    assert.equal(inv['Lingote de hierro'],undefined,'No prepared iron can be gifted');
    assert.equal(inv['Mineral de hierro'],stock['Lingote de hierro'],'Ore must equal ingot requirements');

    // The actual preparation logic converts raw ore into ingots without granting extras.
    assert.equal(prep.convert(inv,stock['Lingote de hierro']),true);
    assert.equal(consume(first,inv),true,'First sword cannot be short of materials');
    assert.equal(consume(first,inv),true,'Second sword cannot be short of materials');
    assert(Object.values(inv).every(x=>x===0),'Every gifted material must be consumed by exactly two swords');
    assert.equal(prep.ready(session.formulas.escudo_hierro,inv),false,
      'Shield should require going to the market rather than surplus from the chest');
  }
});

test('the market can still sell initial seeded materials for the shield',()=>{
 const market=require('../genesis_market_domain_v001.js');
 const session=engine.generateSession('Herrero',{seed:31415926});
 const offers=market.catalog(session,prep.rawStock);
 // Markets may share materials between recipes: compare the union of known seed names.
 const known=new Set([...session.formulas.espada_hierro.materials,
   ...session.formulas.escudo_hierro.materials].map(m=>m.material));
 known.delete('Lingote de hierro');known.add('Mineral de hierro');
 assert.deepEqual(new Set(offers),known);
 assert(offers.includes('Mineral de hierro'));
 assert(session.formulas.escudo_hierro.materials.length>0);
});

test('Curtidor initial supply remains untouched by a Herrero-only correction',()=>{
 for(const seed of [1,500,1234567]){
  const session=engine.generateSession('Curtidor',{seed}),expected={};
  for(const formula of Object.values(session.formulas))
   for(const m of formula.materials)expected[m.material]=(expected[m.material]||0)+m.qty*2;
  assert.deepEqual(plain(session.requiredStock),expected);
  assert.deepEqual(plain(session.stock),expected);
 }
});

test('existing pre-chest market purchases remain additive and navigation explains new rule',()=>{
 assert.match(source,/const marketStockBefore = \{\.\.\.playerInventory\}/);
 assert.match(source,/playerInventory\[material\] = \(playerInventory\[material\] \|\| 0\) \+ quantity/);
 assert.match(source,/El baúl contiene únicamente el lote para tus dos primeras espadas/);
 assert.match(source,/los materiales del escudo se obtienen gratis en el mercado/);
 assert.match(fs.readFileSync(path.join(root,'village_world.js'),'utf8'),/version='v0\.14\.022'/);
 assert.match(source,/<title>Project Genesis v0\.14\.022 · Build 20261102\.04/);
});
