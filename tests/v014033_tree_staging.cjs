'use strict';
/* V014.033: assert mobile decorative assets don't compete with core route boot. */
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=fs.readFileSync('village_trees.js','utf8')
 .replace(/^import \{[^\n]+\} from 'playcanvas';\s*/m,'')
 .replace('export const TREE_SITES','const TREE_SITES')
 .replace('export function mountVillageTrees','function mountVillageTrees');
class Entity {
 constructor(name){this.name=name;this.children=[];this.enabled=true;}
 addChild(child){this.children.push(child);}
 setLocalPosition(){}
 setLocalEulerAngles(){}
 destroy(){}
}
function simulate(mobile,deferred){
 const calls=[],events=[],context={Entity,Vec3:class {},SHADERLANGUAGE_GLSL:1,
  GenesisDevice:{safePreviews:mobile},console,Math,performance:{now:()=>1000},
  setTimeout,clearTimeout};
 const code=source+';globalThis.__treeModule={TREE_SITES,mountVillageTrees};';
 vm.runInNewContext(code,context);
 const app={on:(name)=>events.push(name),off:()=>{},
  assets:{loadFromUrl(url,type,callback){calls.push({url,type,callback});}}};
 const root=new Entity('test root');
 const trees=context.__treeModule.mountVillageTrees(app,root,{deferInitialLoads:deferred});
 return{calls,trees,sites:context.__treeModule.TREE_SITES,events};
}
const mobile=simulate(true,true);
assert.equal(mobile.sites.length,14);
assert.equal(mobile.sites.filter(s=>s.region==='plaza').length,4);
assert.equal(mobile.calls.length,0,'Mobile fetched GLB before entering route');
for(let i=0;i<30;i++)mobile.trees.update(7,16);
assert.equal(mobile.calls.length,0,'Frame loop accidentally fetched GLB during route boot');
assert.equal(mobile.trees.status().started,false);
mobile.trees.startLoading();
assert.equal(mobile.trees.status().started,true);
assert.equal(mobile.calls.length,1,'Mobile must have only one in-flight tree decoder');
assert(mobile.calls.every(c=>/lod2[.]glb$/.test(c.url)),'Mobile may only request LOD2');
mobile.trees.startLoading();
assert.equal(mobile.calls.length,1,'startLoading must be idempotent');
assert.equal(mobile.trees.status().pendingVariants,4,'Four approved species must be queued');
const desktop=simulate(false,false);
assert.equal(desktop.trees.status().started,true,'Desktop foliage starts immediately');
assert.equal(desktop.calls.length,4,'Desktop may load four variant assets simultaneously');
assert.equal(desktop.trees.status().pendingVariants,8,'Desktop retains LOD1 and LOD2');
const world=fs.readFileSync('village_world.js','utf8');
assert(world.includes('const trees=mountVillageTrees(app,root,{onResourceLoaded,deferInitialLoads:mobile});'));
assert(world.includes('if(mobile)trees.startLoading()'));
assert(world.includes('plan.blocked(x,z,r)||trees.blocked(x,z,r)'));
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('v0.14.033 · Build 20261108.02'));
assert(html.includes('id="brand">PROJECT GENESIS · v0.14.033 · BUILD 20261108.02'));
console.log('PASS V014.033 deferred mobile 0 GLB pre-boot, 1 decoder post-start, desktop 8 LOD variants and 14 real sites');
