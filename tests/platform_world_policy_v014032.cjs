'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const world=fs.readFileSync(path.join(root,'village_world.js'),'utf8');
const trees=fs.readFileSync(path.join(root,'village_trees.js'),'utf8');
const device=fs.readFileSync(path.join(root,'device_policy.js'),'utf8');
const policyStart=html.indexOf('const genesisMobile=window.GenesisDevice?.safePreviews===true;');
const policyEnd=html.indexOf('window.__genesisPreloadProgress=function(event)',policyStart);
assert(policyStart>0&&policyEnd>policyStart,'Device mode flag bootstrap missing');
const policyCode=html.slice(policyStart,policyEnd);
const configStart=html.indexOf('<script>\nwindow.GenesisDevice.configureApp(');
const configEnd=html.indexOf('</script>',configStart);
assert(configStart>0&&configEnd>configStart,'Post-PC-app device budget setup missing');
const configCode=html.slice(configStart+'<script>'.length,configEnd);
const originalFountain='genesisFountainV011HQAsset';
assert(html.includes('id="genesisFountainV011Model"')&&html.includes('data-asset="'+originalFountain+'"'),'Approved HQ fountain is missing from desktop model');
assert(device.includes('window.GenesisDevice=Object.freeze('),'Original mobile detection not loaded');
assert(world.includes('if(globalThis.__GENESIS_LITE_BOOT && !globalThis.__GENESIS_WORLD_FULL)'),'Lightweight world fallback must remain available');
assert(trees.includes('const maxConcurrent=safeMobile?2:4'),'Mobile tree concurrency protections removed');
assert(trees.includes("safeMobile?[species+':2']:[species+':2',species+':1']"),'Mobile trees must limit LODs');
function probe(mobile){
 const fountain={dataset:{asset:originalFountain}};
 const elements={genesisApp:{},genesisFountainV011Model:fountain};
 const document={getElementById:id=>elements[id]||null};
 const context={window:{GenesisDevice:{safePreviews:mobile,configureApp(){} }},document,Object,console};
 vm.runInNewContext(policyCode,context,{filename:'platform-policy.js'});
 vm.runInNewContext(configCode,context,{filename:'fountain-budget.js'});
 const mode=context.window.__genesisWorldPolicy;
 assert.equal(mode.mobile,mobile);
 assert.equal(context.window.__GENESIS_WORLD_FULL,!mobile);
 assert.equal(context.window.__GENESIS_LITE_BOOT,mobile);
 if(mobile){
  assert.equal(fountain.dataset.asset,undefined,'Phone still schedules 16.7MB fountain alongside game assets');
  assert.equal(fountain.dataset.disabledAsset,originalFountain);
  assert.equal(fountain.dataset.mobileDeferred,'memory-budget');
 }else{
  assert.equal(fountain.dataset.asset,originalFountain,'Desktop lost the approved fountain');
  assert.equal(fountain.dataset.mobileDeferred,undefined);
 }
 return {mode:mode.mode,full:context.window.__GENESIS_WORLD_FULL,lite:context.window.__GENESIS_LITE_BOOT,fountainQueued:!!fountain.dataset.asset};
}
const desktop=probe(false),mobile=probe(true);
console.log('PASS_V014032_PLATFORM_WORLD_SPLIT',JSON.stringify({desktop,mobile}));
