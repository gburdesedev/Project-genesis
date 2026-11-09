const test = require('node:test');
const assert = require('node:assert/strict');
const market = require('../genesis_market_domain_v001.js');
const raw = required => { const result={...required}; if (result['Lingote de hierro']) {
  result['Mineral de hierro'] = (result['Mineral de hierro'] || 0) + result['Lingote de hierro'];
  delete result['Lingote de hierro']; }
  return result; };
const blacksmith = {
  profession:'Herrero',seed:123,
  formulas:{
    espada_hierro:{materials:[
      {material:'Lingote de hierro',qty:3},
      {material:'Carbón vegetal',qty:2},
      {material:'Madera seca de roble',qty:1}]},
    escudo_hierro:{materials:[
      {material:'Lingote de hierro',qty:2},
      {material:'Cuero caprino curtido',qty:1},
      {material:'Carbón vegetal',qty:1}]}
  }
};
test('only actual initial seeded materials are for sale',()=>{
  assert.deepEqual(market.catalog(blacksmith,raw),[
    'Carbón vegetal','Cuero caprino curtido','Madera seca de roble','Mineral de hierro']);
});
test('free purchase augments the same inventory object',()=>{
  const inv={'Carbón vegetal':5};const before=inv;
  const result=market.buy({session:blacksmith,inventory:inv,material:'Carbón vegetal',quantity:3,toRawStock:raw});
  assert.equal(result.ok,true);assert.equal(result.cost,0);
  assert.equal(inv['Carbón vegetal'],8);assert.equal(inv,before);
});
test('reject undiscovered material and prepared ingots',()=>{
  const inv={};
  for(const material of ['Hilo de lino','Lingote de hierro','Muestra ferruginosa desconocida']){
    assert.equal(market.buy({session:blacksmith,inventory:inv,material,quantity:2,toRawStock:raw}).ok,false);
  }
  assert.deepEqual(inv,{});
});
test('new profession or seed changes offers; no cross-session carry-over',()=>{
  const tanner={profession:'Curtidor',formulas:{armadura_cuero:{materials:[
    {material:'Cuero bovino curtido',qty:3},{material:'Hilo de lino',qty:1}]}}};
  assert.deepEqual(market.catalog(tanner,raw),['Cuero bovino curtido','Hilo de lino']);
});
test('invalid quantities and incomplete sessions fail closed',()=>{
 const inv={};
 for(const quantity of [0,-1,1.1,100,Infinity,NaN,'1'])
   assert.equal(market.buy({session:blacksmith,inventory:inv,material:'Carbón vegetal',quantity,toRawStock:raw}).ok,false);
 assert.deepEqual(market.catalog(null,raw),[]);
 assert.deepEqual(market.catalog({profession:'Herrero'},raw),[]);
 assert.deepEqual(inv,{});
});
