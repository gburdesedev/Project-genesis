'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'village_arcanist.js'),'utf8');
const pos=src.indexOf('export function mountArcanePortal(');
assert(pos>0);
const body=src.slice(pos).replace('export function mountArcanePortal','function mountArcanePortal');
class Entity{
 constructor(name){this.name=name;this.children=[];this.enabled=true}
 setLocalPosition(){} addChild(child){this.children.push(child)}
 findComponents(){return [{castShadows:false,receiveShadows:false}]}
}
const warnings=[];
const ctx={
 Entity,globalThis:{},
 animateArcaneVeins:()=>({animatedTextures:1,lights:1}),
 ARCANE_DOOR_SOURCE:'asset:test-glb',
 console:{warn:(...a)=>warnings.push(a)},
 Promise,Object,String,Error
};
vm.runInNewContext(body+'\nglobalThis.portal=mountArcanePortal;',ctx);
(async()=>{
 let received=0;
 const app={assets:{loadFromUrl:(url,type,cb)=>cb(null,{resource:{
  instantiateRenderEntity:()=>new Entity('doorVisual')}})}};
 const portal=ctx.globalThis.portal(app,new Entity('Arcanista'),new Entity('fallback'),
  {onResourceLoaded:()=>{received++;throw new Error('UI progress exception')}});
 const report=await Promise.race([portal.initialReady,new Promise((_,reject)=>setTimeout(()=>reject(new Error('initialReady remained pending')),1000))]);
 assert.equal(received,1);
 assert.equal(report.phase,'ready');
 assert(warnings.some(x=>String(x).includes('Progreso de puerta')),'UI error should be reported');
 const world=fs.readFileSync(path.join(root,'village_world.js'),'utf8');
 assert(world.includes("bootGate(Promise.all(arcanePortals.map(portal=>portal.initialReady))"),'world must await all portal resources');
 assert(world.includes('Carga incompleta:'),'world must emit timeout failure');
 console.log('PASS: Arcane GLB resolves its initialReady despite UI progress error; watchdog reports pending assets.');
})().catch(e=>{console.error(e);process.exitCode=1});
