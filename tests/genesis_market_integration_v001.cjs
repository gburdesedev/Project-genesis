const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const world=fs.readFileSync(path.join(root,'village_world.js'),'utf8');
const market=fs.readFileSync(path.join(root,'genesis_market_v001.js'),'utf8');
test('merchant attached to real PlayCanvas village and original E interaction pipeline',()=>{
  assert.match(html,/import \{ mountGenesisMarket \} from '\.\/genesis_market_v001\.js\?v=0\.14\.019'/);
  assert.match(html,/genesisMarket=mountGenesisMarket\(\{/);
  assert.match(html,/\.\.\.\(genesisMarket\?\[genesisMarket\.interactable\]:\[\]\)/);
  assert.match(market,/id:'marketMerchant',radius:2\.85/);
  assert.match(market,/x:25\.5,y:0,z:36\.3/);
  assert.match(world,/x:25\.5,z:36\.3,r:\.34/);
  assert.match(world,/x:28\.35,z:37\.6,r:1\.02/);
  assert.match(html,/!lineClearTo\(pos,it\.id==='door',it\.id==='marketMerchant'\)/);
});
test('existing inventory, chest tutorial and approved menus retained',()=>{
  assert.match(html,/getSession:\(\)=>craftSession/);
  assert.match(html,/getInventory:\(\)=>playerInventory/);
  assert.match(html,/marketStockBefore = \{\.\.\.playerInventory\}/);
  assert.match(html,/playerInventory\[material\] = \(playerInventory\[material\] \|\| 0\) \+ quantity/);
  assert.match(html,/preparacion_control\.js/);
  assert(fs.existsSync(path.join(root,'inventario_genesis_16x9.js')));
  assert.match(html,/const legacyInventory = openInventory;/);
  assert.doesNotMatch(market,/(\bprice\s*:\s*[1-9]|\bprice\s*=\s*[1-9])/);
});
test('published version and cache keys aligned',()=>{
  assert.match(html,/<title>Project Genesis v0\.14\.019 · Build 20261101\.01/);
  assert.match(html,/PROJECT GENESIS · v0\.14\.019 · BUILD 20261101\.01/);
  assert.match(html,/village_world\.js\?v=0\.14\.019/);
  assert.match(html,/genesis_market_v001\.js\?v=0\.14\.019/);
  assert.match(world,/version='v0\.14\.019', build='20261101\.01'/);
});
