'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=fs.readFileSync('genesis_fountain_v014034.js','utf8')
 .replace(/^import \{[^\n]+\} from 'playcanvas';\s*/m,'')
 .replace('export const FOUNTAIN_V011_LOCAL','const FOUNTAIN_V011_LOCAL')
 .replace('export function mountGenesisFountainV014034','function mountGenesisFountainV014034');
class Entity{
 constructor(name){this.name=name;this.children=[];this.enabled=true;}
 setPosition(x,y,z){this.pos=[x,y,z]}
 addChild(x){this.children.push(x)}
 addComponent(name){if(name==='anim')this.anim={
  assignAnimation(){},baseLayer:{play(){}}
 }}
 findComponents(){return Array(11).fill(0).map(()=>({meshInstances:[{}]}))}
 destroy(){}
}
const context={Entity,console};vm.runInNewContext(source+';globalThis.exported=mountGenesisFountainV014034;',context);
let calls=[],notify=0;const app={assets:{loadFromUrl(u,t,cb){calls.push({u,t,cb})}}};
const village=new Entity('village');
const fountain=context.exported(app,village,{onResourceLoaded:()=>notify++});
assert.equal(fountain.status().phase,'deferred');
assert.equal(calls.length,0,'Fountain must not gate scene or gameplay boot');
assert.equal(village.children[0].name,'Plaza · fuente delfín V011 HQ · original');
assert.deepEqual(Array.from(fountain.status().position),[7,0,16]);
fountain.start();fountain.start();
assert.equal(calls.length,1,'Fountain must only be requested once');
assert.equal(calls[0].t,'container');
assert(calls[0].u.startsWith('./assets/vendor/genesis/externals/genesisFountainV011HQAsset/'));
const good=new Entity('fountain GLB');calls[0].cb(null,{resource:{
 instantiateRenderEntity(){return good},animations:[{resource:{name:'V011 water'}}]
}});
assert.equal(fountain.status().phase,'ready');
assert(fountain.status().meshes>=10);
assert.equal(fountain.status().animated,true);
assert.equal(notify,1);
assert.equal(fountain.status().visible,true);
let errCallback;
const fail=context.exported({assets:{loadFromUrl(_u,_t,cb){errCallback=cb}}},new Entity('retry'));
fail.start();errCallback(Error('GLB missing'),null);
assert.equal(fail.status().phase,'error','Failed optional fountain must report error, not block player');
const world=fs.readFileSync('village_world.js','utf8');
assert(world.includes('mountGenesisFountainV014034(app,root,{onResourceLoaded})'));
assert(world.includes("fountain.status().phase==='ready'"),'No invisible collision on mobile');
console.log('PASS V014.034 local V011 GLB, no-boot-gate, real geometry checks, optional safe failure');
