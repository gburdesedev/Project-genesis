'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prep=fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8');
const script=fs.readFileSync(path.join(root,'genesis_boot_assets_v001.js'),'utf8');
assert(html.includes('genesis_boot_assets_v001.js?v=boot-001'));
assert(html.includes('await window.GenesisBootAssets.prepare('));
assert(html.includes('await ensureMercenaryReady()'));
assert(html.includes("const phases=['critical','stream']"));
assert(!html.includes('const guard=sleep(6500)'));
assert(!html.includes('function streamRouteDecor('));
assert(html.includes("setLoadUI(100,'Partida preparada'"));
assert(prep.includes('window.GenesisBootAssets?.modelURL?.(art.model)'));
const modelViewerUses=(html.match(/modelURL\?\.\(src\)/g)||[]).length;
assert.equal(modelViewerUses,2);

async function smoke(safePreviews){
 let binaryCount=0,active=0,peak=0,images=0,scriptCount=0,styleCount=0;
 const scope={};
 scope.window={GenesisDevice:{safePreviews},GenesisInventory16:null};
 const linkList=[];
 scope.document={
  styleSheets:linkList,
  createElement(tag){return {tag,rel:'',href:'',src:'',onload:null,onerror:null};},
  head:{appendChild(el){
   if(el.tag==='link'){styleCount++;linkList.push({href:el.href});queueMicrotask(()=>el.onload?.());}
   if(el.tag==='script'){scriptCount++;scope.window.GenesisInventory16={render(){}};
    queueMicrotask(()=>el.onload?.());
   }
  }}
 };
 scope.Image=class {
  constructor(){this.complete=false;this.naturalWidth=0;this.onload=null;this.onerror=null;}
  set src(path){this.path=path;images++;queueMicrotask(()=>{
    const file=path.startsWith('assets/')?path:null;
    if(file && !fs.existsSync(root+'/'+file)){this.onerror?.();return;}
    this.complete=true;this.naturalWidth=64;this.onload?.();
  });}
 };
 scope.URL={createObjectURL(blob){return 'blob:preloaded-'+blob.size+'-'+binaryCount;}};
 scope.fetch=async(url)=>{
  active++;peak=Math.max(peak,active);binaryCount++;
  await new Promise(resolve=>setImmediate(resolve));active--;
  return{ok:true,status:200,blob:async()=>({size:350})};
 };
 scope.setTimeout=setTimeout;scope.clearTimeout=clearTimeout;
 scope.console=console;scope.Promise=Promise;
 vm.runInNewContext(script,scope,{filename:'genesis_boot_assets_v001.js'});
 const loaded=[];
 const progress=await scope.window.GenesisBootAssets.prepare((done,total,label)=>loaded.push({done,total,label}));
 assert.equal(progress.ready,true);
 assert.equal(progress.failed.length,0);
 assert.equal(progress.loaded,progress.total);
 assert.equal(progress.total,safePreviews?44:49);
 assert.equal(images,42);
 assert.equal(binaryCount,safePreviews?0:5);
 assert(peak<=3);
 assert.equal(styleCount,1);
 assert.equal(scriptCount,1);
 assert.equal(loaded.length,progress.total);
 assert.equal(scope.window.GenesisBootAssets.required.length,39);
 if(!safePreviews)assert(scope.window.GenesisBootAssets.modelURL('https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/props/sword.glb').startsWith('blob:'));
 const second=await scope.window.GenesisBootAssets.prepare();
 assert.equal(second,progress);
 assert.equal(scriptCount,1);
 assert.equal(binaryCount,safePreviews?0:5);
 return{mode:safePreviews?'mobile-poster':'desktop-3d',total:progress.total,peak,images,binaryCount};
}
Promise.all([smoke(true),smoke(false)]).then(v=>{
 v.forEach(row=>console.log('PASS boot manifest',row));
 console.log('PASS startup gate, zero in-game route stream, preloaded inventory and full route');
}).catch(e=>{console.error(e);process.exitCode=1});
