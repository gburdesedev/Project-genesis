'use strict';
// Real browser proof, no mocked assets. Run PHONE FIRST to isolate the crash.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='/tmp/v0189-tree-free-mobile-smoke';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={version:'V0189',results:[],visualApproval:false};
 try{
  for(const mode of [{name:'mobile',mobile:true},{name:'desktop',mobile:false}]){
   const page=await browser.newPage({
      viewport:{width:mode.mobile?844:1280,height:mode.mobile?390:720},
      isMobile:mode.mobile,hasTouch:mode.mobile,deviceScaleFactor:1
   });
   const treeRequests=[],failures=[],errors=[];
   page.on('request',r=>{if(/\/v0188\/plaza\/trees\/[^?]+\.glb(?:\?|$)/i.test(r.url()))treeRequests.push(r.url())});
   page.on('requestfailed',r=>failures.push({url:r.url(),cause:r.failure()}));
   page.on('pageerror',e=>errors.push(String(e.stack||e)));
   const started=Date.now();
   try{
    await page.goto('http://127.0.0.1:8765/v0189/?qa=trees-'+mode.name,{waitUntil:'domcontentloaded',timeout:70000});
    const mobileReported=await page.evaluate(()=>matchMedia('(pointer:coarse)').matches);
    assert.equal(mobileReported,mode.mobile,'Browser pointer mode differs');
    await page.locator('#start-blacksmith').click({timeout:30000});
    await page.waitForFunction(()=>document.getElementById('v011-pause')?.textContent.includes('Carga finalizada'),null,{timeout:200000,polling:350});
    const data=await page.evaluate(()=>{
      const p=window.__GENESIS_V0189_PLAZA__,loader=window.__GENESIS_V017_WORKSHOP_LOADER__,audit=window.__GENESIS_V011_AUDIT__?.();
      return {version:audit?.version,ready:audit?.workshops?.ok===true,village:audit?.village?.count,
        plaza:p?{installed:p.installed,layoutMatchesOriginal:p.layoutMatchesOriginal,trees:p.trees,
          fountainRenderers:p.fountainRenderers,treesDisabledOnMobile:p.treesDisabledOnMobile}:null,
        decodedTreeAssets:loader?.models?.filter(x=>x.id?.startsWith('plaza-tree-')).map(x=>x.id)||[],
        loaderOk:loader?.ok,failures:loader?.errors||[]};
    });
    assert.equal(data.version,'V018.9','Wrong game revision');
    assert(data.ready&&data.loaderOk,'World loader did not complete');
    assert.equal(data.village,5,'Five original workshop facades missing');
    assert(data.plaza?.layoutMatchesOriginal,'Original plaza layout mismatch');
    assert(data.plaza?.fountainRenderers>0,'Original dolphin fountain missing');
    assert.equal(data.plaza.treesDisabledOnMobile,mode.mobile,'Wrong mobile tree policy');
    assert.equal(data.plaza.trees.planned,mode.mobile?0:14,'Wrong visible tree count');
    assert.equal(data.plaza.trees.loaded,mode.mobile?0:8,'Wrong GLB tree variants');
    assert.equal(data.decodedTreeAssets.length,mode.mobile?0:8,'Unexpected decoded tree assets');
    assert.equal(treeRequests.length,mode.mobile?0:8,'Network repeated or fetched trees on a phone');
    assert.equal(errors.length,0,'JavaScript exceptions: '+errors.slice(0,3).join('; '));
    assert.equal(failures.length,0,'Network failures: '+JSON.stringify(failures.slice(0,3)));
    const result={device:mode.name,passed:true,seconds:Math.round((Date.now()-started)/1000),
     mobileTreeDisabled:mode.mobile,treeNetworkRequests:treeRequests.length,decodedTreeAssets:data.decodedTreeAssets.length,
     renderedTreeInstances:data.plaza.trees.planned,fountainMeshes:data.plaza.fountainRenderers,workshops:data.village};
    console.log('V0189 SMOKE PASS',JSON.stringify(result));
    report.results.push(result);
   }catch(error){
    let debug={};
    try{debug=await page.evaluate(()=>({status:document.querySelector('#status')?.textContent,
      pause:document.querySelector('#v011-pause')?.textContent?.slice(0,600),
      loader:window.__GENESIS_V017_WORKSHOP_LOADER__?.errors,
      plaza:window.__GENESIS_V0189_PLAZA__?.trees,
      assets:[...document.querySelectorAll('#rows .asset')].map(x=>x.textContent?.slice(0,80))}))}catch{}
    const info={device:mode.name,passed:false,message:String(error?.stack||error),treeRequests,failures,errors,debug};
    console.error('V0189 SMOKE FAIL',JSON.stringify(info).slice(0,15000));
    report.results.push(info);
    throw error;
   }finally{await page.close()}
  }
  fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2));
 }finally{await browser.close()}
})().catch(error=>{console.error('V0189 SMOKE ERROR',error.stack||error);process.exitCode=1});
