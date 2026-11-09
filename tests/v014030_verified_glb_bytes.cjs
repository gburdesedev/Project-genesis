'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../genesis_result_live_v014030.js'),'utf8');
const sourceSha='e2228f078b2572768416c48c0e63c2d908f214e2c0625a2ab754c877a099112b';
const bytes=Buffer.alloc(20);
bytes.writeUInt32LE(0x46546c67,0);bytes.writeUInt32LE(2,4);bytes.writeUInt32LE(bytes.byteLength,8);
const exportSha=crypto.createHash('sha256').update(bytes).digest('hex');
const item={recipe:'espada_hierro',channels:[['Base',44.2],['Rayo',81]],name:'Objeto NGE'};
async function trial(hash,expected){
 let hydrated=false,failed=false;
 const events={},wrap={dataset:{genesisModelState:'loading'},querySelector:selector=>fallback};
 const fallback={setAttribute(name){assert.equal(name,'hidden')},removeAttribute(name){assert.equal(name,'hidden');failed=true;}};
 const viewer={
  loaded:false,modelIsVisible:false,events,
  getAttribute:()=> './assets/playcanvas/approved/equipment/V12B_TRUE.glb',
  addEventListener(name,callback){events[name]=callback},
  setAttribute(name,value){
    assert.equal(name,'src');assert.equal(value,'blob:approved');
    hydrated=true;this.loaded=true;this.modelIsVisible=true;events.load();
  }
 };
 wrap.querySelector=selector=>selector.startsWith('model-viewer')?viewer:fallback;
 const root={isConnected:true,querySelector:selector=>wrap};
 const manifest={espada_hierro:{
   status:'approved',gameExportApproved:true,distributionRightsConfirmed:true,
   recipe:'espada_hierro',sourceSha256:sourceSha,exportSha256:hash,
   materialPreset:'Genesis_Espada_V03_Hierro_V175_V12B',
   url:'./assets/playcanvas/approved/equipment/V12B_TRUE.glb'
 }};
 const sandbox={console,window:{
   GenesisApprovedRuntimeModels:manifest,crypto:crypto.webcrypto,
   fetch:async()=>({ok:true,arrayBuffer:async()=>Uint8Array.from(bytes).buffer}),
   URL:{createObjectURL:()=> 'blob:approved',revokeObjectURL:url=>assert.equal(url,'blob:approved')},
   Blob,
 }};
 vm.runInNewContext(src,sandbox);
 const result=sandbox.window.GenesisRealCraftViewer.activate(item,{querySelector:()=>root});
 assert.equal(result.status,'loading');
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(hydrated,expected,'Only hash-verified bytes may be used as 3D source');
 assert.equal(failed,!expected,'Invalid V12B must leave the real Cycles image as fallback');
 assert.equal(wrap.dataset.genesisModelState,expected?'live-glb':'asset-load-failed');
}
(async()=>{
 await trial(exportSha,true);
 await trial('f'.repeat(64),false);
 console.log('PASS V014.030: verified GLB 2.0 bytes SHA before 3D load; mismatched export rejects and falls back');
})().catch(e=>{console.error(e);process.exitCode=1;});
