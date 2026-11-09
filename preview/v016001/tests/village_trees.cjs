const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const code=fs.readFileSync('village_trees.js','utf8')
 .replace(/^import \{ Entity \} from 'playcanvas';/m,'')
 .replace(/export const TREE_SITES/g,'const TREE_SITES')
 .replace(/export function mountVillageTrees/g,'function mountVillageTrees');
const c={};vm.runInNewContext(code+';globalThis.__sites=TREE_SITES;globalThis.__types=TYPES;',c);
const sites=Array.from(c.__sites),types=Object.keys(c.__types);
assert.equal(sites.length,14);
assert.deepEqual(types.sort(),['ash','linden','maple','oak']);
assert.equal(sites.filter(p=>p.region==='plaza').length,4);
assert.equal(sites.filter(p=>p.region!=='plaza').length,10);
const plan=require('../village_plan.js');
for(const site of sites){
 assert(site.x>plan.bounds.minX+2&&site.x<plan.bounds.maxX-2);
 assert(site.z>plan.bounds.minZ+2&&site.z<plan.bounds.maxZ-2);
 assert(!plan.blocked(site.x,site.z,1),'tree trunk intersects closed workshop '+site.id);
 for(const building of [...plan.workshops.map(w=>({x:w.cx,z:w.cz,w:w.w,d:w.d})),plan.market]){
  const clearance=Math.hypot(Math.max(0,Math.abs(site.x-building.x)-building.w/2),Math.max(0,Math.abs(site.z-building.z)-building.d/2));
  assert(clearance>=2.4,'tree '+site.id+' too close to building');
 }
 if(site.region!=='plaza'){
  for(const road of plan.roads){
   const clearance=Math.hypot(Math.max(0,Math.abs(site.x-road.x)-road.w/2),Math.max(0,Math.abs(site.z-road.z)-road.d/2));
   assert(clearance>=.7,'tree '+site.id+' blocks '+road.name);
  }
 }
}
for(let i=0;i<sites.length;i++)for(let j=i+1;j<sites.length;j++){
 assert(Math.hypot(sites[i].x-sites[j].x,sites[i].z-sites[j].z)>=4.4,'two tree trunks too close');
}
const game=fs.readFileSync('index.html','utf8');
assert(game.includes('Prototipo Jugable v0.11.017'),'release version');
assert(game.includes('loadCount'),'counter display');
assert(game.includes('village.trees?.update(px,pz)'),'LOD updates with player');
assert(game.includes('showBootProgress'),'real boot load counter');
const world=fs.readFileSync('village_world.js','utf8');
assert(world.includes('mountVillageTrees(app,root)'),'trees mounted in real 3D village');
assert(world.includes('mountArcanePortal(app,building,doorClone)'),'Arcanist V027 mounted');
assert(world.includes('tintArcaneFacade(shellClone)'),'Arcanist walls retain PBR with tinted finish');
assert(world.includes('arcaneSurround(app,building,cobble)'),'Arcanist arch dimensions fitted');
assert(world.includes('trees.blocked(x,z,r)'),'trunk collision');
assert(world.includes('onResourceLoaded(name)'),'world PBR textures included in loading count');
console.log('PASS: 14 diverse trees, clear of roads and workshops, WebGL LOD streaming wired into v0.11.016, counted loading');
