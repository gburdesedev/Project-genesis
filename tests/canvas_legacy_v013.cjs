'use strict';
const assert=require('node:assert/strict');
global.window=global;
require('../v015/canvas-legacy-nge.js');
const legacy=require('../v015/canvas-legacy-logic.js');
const engine=global.GenesisPrototypeEngines;
const RAW='Mineral de hierro',PREPARED='Lingote de hierro';
const preparation={
 rawStock(required){const stock={...required},n=stock[PREPARED]||0;if(n){delete stock[PREPARED];stock[RAW]=(stock[RAW]||0)+n}return stock},
 shortages(formula,stock){return formula.materials.map(x=>({material:x.material,needed:x.qty,available:stock[x.material]||0,missing:Math.max(0,x.qty-(stock[x.material]||0))}))},
 ready(formula,stock){const s=this.shortages(formula,stock);return s.length>0&&s.every(x=>x.missing===0)},
 convert(stock,n){if(!Number.isSafeInteger(n)||n<1||(stock[RAW]||0)<n)return false;stock[RAW]-=n;stock[PREPARED]=(stock[PREPARED]||0)+n;return true}
};
class MemoryStore{constructor(){this.data=new Map()}getItem(k){return this.data.get(k)||null}setItem(k,v){this.data.set(k,v)}removeItem(k){this.data.delete(k)}}
const store=new MemoryStore();
const game=legacy.create({engine,preparation,storage:store});
const first=game.start(7891234);
assert.equal(first.step,0);
assert.equal(first.profession,'Herrero');
assert.equal(first.items.length,0);
const originalFormula=first.session.formulas.espada_hierro;
assert(originalFormula.materials.length>=3);
assert.equal(game.doAction('chest').ok,false,'No chest before the key');
const actions=['mentor','door','debris','anvil','bellows','flue','forge','mentor-key','chest'];
for(const [i,id] of actions.entries()){
 assert.equal(game.goal().id,id,'Objective ordering changed at '+i);
 const x=game.doAction(id);
 assert(x.ok,'Original step failed: '+id);
 assert.equal(game.step(),i+1);
 assert.equal(game.doAction(id).ok,false,'Repeated action advanced twice: '+id);
}
assert.equal(game.snapshot().repairs.length,5,'Five original workshop repair checks');
assert.equal(game.snapshot().forgeHot,true);
assert.equal(game.snapshot().key,true);
assert.equal(game.snapshot().chestOpen,true);
const stock=game.inventory();
const required=first.session.formulas.espada_hierro.materials.reduce((sum,m)=>{sum[m.material]=(sum[m.material]||0)+m.qty*2;return sum},{});
const originalIngots=required[PREPARED];
assert.equal(stock[RAW],originalIngots,'Chest grants exactly two sword batches in raw iron');
assert.equal(stock[PREPARED]||0,0,'Preparation must not be bypassed');
for(const [material,n] of Object.entries(required))if(material!==PREPARED)assert.equal(stock[material]||0,n,'Wrong material stock: '+material);
assert.equal(game.craft().ok,false,'No craft before opening inventory');
assert.equal(game.openInventory().ok,true);
assert.equal(game.step(),9,'Opening inventory alone does not finish learning');
assert.equal(game.closeInventory().advanced,true,'Closing inventory teaches the mechanic');
assert.equal(game.step(),10);
assert.equal(game.craft().ok,false,'No craft before refining ore');
assert(preparation.convert(stock,originalIngots),'Could not convert original ore');
game.onInventoryChanged();
const made1=game.craft();
assert(made1.ok);
assert.equal(made1.item.rarity,'Inútil','Legacy NGE first craft differs from expected pedagogical demo');
assert.equal(made1.item.recipe,'espada_hierro');
assert.equal(game.step(),11);
const made2=game.craft();
assert(made2.ok);
assert(['Común','Bueno'].includes(made2.item.rarity));
assert.notDeepEqual(made1.item.channels,made2.item.channels,'Same formula should produce distinct channels');
assert.notEqual(made1.item.name,made2.item.name);
assert.equal(game.step(),12);
assert.equal(game.craft().ok,false,'No third sword in original Q1-Q3');
assert.equal(game.compare().length,2);
const chosen=game.choose(1);
assert(chosen.ok);
assert.equal(chosen.chosen.name,made2.item.name);
assert.equal(game.snapshot().selection,1);
assert.equal(game.step(),13);
assert.equal(game.choose(0).ok,false,'Cannot choose twice');
const restored=legacy.create({engine,preparation,storage:store});
const revived=restored.resume();
assert(revived);
assert.equal(revived.seed,7891234);
assert.equal(revived.step,13);
assert.deepEqual(revived.items,game.snapshot().items);
assert.equal(revived.formulaSignature,originalFormula.signature);
assert.equal(revived.items.length,2);
const different=restored.start(7891235);
assert.equal(different.step,0);
assert.notEqual(different.session.seed,first.seed);
assert.equal(different.items.length,0);
const audit=engine.selfTest(100);
assert.equal(audit.ok,true,'Original NGE self-test failed: '+JSON.stringify(audit));
console.log('PASS V013 original Canvas logic: Ordan, ordered five repairs, key/chest once, exact two-sword stock, mandatory real preparation, NGE x2, comparison/selection, persistence, new seed.');
