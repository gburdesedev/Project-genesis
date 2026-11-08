'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const from=html.indexOf('const routeReady=new Set();');
const to=html.indexOf('function refreshRouteBindings(',from);
assert(from>0 && to>from, 'route loader implementation missing');
const code=html.slice(from,to)+'\nglobalThis.runRoutePreflight=activateRouteGroups;';
class Model{
 constructor(route,priority,asset,fail=false) {
  this.dataset={route,priority,asset};this.id=asset;this.contentEntity=null;this.fail=fail;
  this.attrs=new Map();this.listeners=new Map();
 }
 getAttribute(name){return name==='name'?this.id:this.attrs.get(name)||null}
 addEventListener(name,cb){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(cb)}
 removeEventListener(name,cb){this.listeners.get(name)?.delete(cb)}
 removeAttribute(name){this.attrs.delete(name)}
 setAttribute(name,value){
  this.attrs.set(name,value);
  if(name==='asset'){
   queueMicrotask(()=>{
    if(this.fail)for(const cb of [...(this.listeners.get('error')||[])])cb({message:'Broken model '+value});
    else{
     this.contentEntity={name:value};
     for(const cb of [...(this.listeners.get('load')||[])])cb();
    }
   });
  }
 }
}
function setup(models){
 const document={
  getElementById(){return null},
  querySelectorAll(selector){
   const parts=selector.match(/^pc-model\[data-route="([^"]+)"\]\[data-priority="([^"]+)"\]$/);
   assert(parts,'unexpected selector '+selector);
   return models.filter(m=>m.dataset.route===parts[1]&&m.dataset.priority===parts[2]);
  }
 };
 const context={document,window:{__GENESIS_LITE_BOOT:false},setTimeout,clearTimeout,setInterval,clearInterval,
  requestAnimationFrame:fn=>queueMicrotask(fn),
  performance:{now:()=>Date.now(),getEntriesByName:()=>[]},URL,location:{href:'http://localhost/index.html'},
  console,Promise,Map,Set,Error};
 vm.runInNewContext(code,context,{filename:'route-loader-test.mjs'});
 return context.runRoutePreflight;
}
(async()=>{
 const a=[new Model('Herrero','critical','A'),new Model('Herrero','critical','A'),
 new Model('Herrero','stream','B'),new Model('SharedMercenary','ondemand','C')];
 const reports=[];
 const load=setup(a);
 const result=await load('Herrero','all',(n,total)=>reports.push({n,total}));
 assert.equal(result.instances,4);
 assert.equal(result.total,3);
 assert.equal(result.loaded,3);
 assert(a.every(m=>!!m.contentEntity),'all source and mercenary meshes must exist before completion');
 assert.equal(reports.at(-1).n,3);
 const bad=[new Model('Herrero','critical','OK'),new Model('Herrero','stream','FAIL',true),
            new Model('SharedMercenary','ondemand','MERC')];
 const progress=[];
 const incomplete=await setup(bad)('Herrero','all',(n,total)=>progress.push({n,total}));
 assert.equal(incomplete.failed,1,'A failed resource must be reported to route retry gate');
 assert.equal(incomplete.loaded,2,'Two distinct assets should load');
 assert.equal(incomplete.total,3,'One missing asset must remain counted');
 assert.match(incomplete.errors.join(' | '),/Broken model FAIL/,'Failure report must identify the missing asset');
 assert.equal(progress.at(-1).n,2,'failed route must never report all as ready');
 console.log('PASS route preflight: critical + stream + mercenary; error blocks play and progress');
})().catch(err=>{console.error(err);process.exitCode=1});
