'use strict';
/* Game revision and source links: V014025 branch must not lie about UI or assets.
   Existing scene modules can legitimately retain previous immutable versions. */
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prep=fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8');
const inv=fs.readFileSync(path.join(root,'inventario_genesis_16x9.js'),'utf8');
const world=fs.readFileSync(path.join(root,'village_world.js'),'utf8');
const market=fs.readFileSync(path.join(root,'genesis_market_v001.js'),'utf8');
test('the visible game release, meta and HUD describe the same revision',()=>{
 const title=html.match(/<title>Project Genesis (v\d+\.\d+\.\d+) · Build (\d{8}\.\d+)/);
 assert(title,'missing actual game title');
 const [,version,build]=title;
 const meta=html.match(/<meta name="genesis-game-version" content="V(\d+)\.(\d+)"/);
 assert(meta,'missing meta revision');
 assert.equal(version,'v0.'+Number(meta[1])+'.'+meta[2],'title/meta revision mismatch');
 assert(html.includes('PROJECT GENESIS · '+version+' · BUILD '+build),'HUD version drift');
 assert(html.includes('PLAYCANVAS 2.22.1 · CAMINO AL VERTICAL SLICE · '+version+' · BUILD '+build),'game hardware version drift');
 assert(html.includes('genesis-build'),'unmarked build');
});
test('immutable module cache names may stay old, but each import points at a real in-repo module',()=>{
 const refs=['village_world.js','genesis_market_v001.js','genesis_market_quest_v001.js',
   'preparacion_control.js','mercenary_equipment_canvas_v001.js'];
 for(const file of refs){
  assert(fs.existsSync(path.join(root,file)),'missing required game module '+file);
  assert(html.includes(file),'game does not import '+file);
 }
 assert.match(world,/version='v0\.14\.022', build='20261102\.04'/);
 assert.match(market,/version:'v0\.14\.022'/);
});
test('live game inventory connects to original GLB rendering and has a mobile nonblank fallback',()=>{
 assert.match(prep,/window\.GenesisInventory16\.render\(ctx,\{renderMenu,renderWorkspace,sheetForItem\}\)/);
 assert.match(prep,/loader\.src='inventario_genesis_16x9\.js/);
 assert.match(inv,/model-viewer class="genInvMaterialHeroModel"/);
 assert.match(inv,/if\(hero&&model&&!window\.GenesisDevice\?\.safePreviews\)/);
 assert.match(inv,/if\(!art\|\|!source\|\|window\.GenesisDevice\?\.safePreviews\)return/);
 for(const filename of ['inventario_genesis_16x9.css','inventario_genesis_16x9.js'])assert(fs.existsSync(path.join(root,filename)));
});
