const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const target='http://127.0.0.1:8765/index.html?legacy=v014022-diagnostics-qa';
const folder='previews/legacy-v014022-loader-qa';
fs.mkdirSync(folder,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const targetView of [{name:'desktop',width:1280,height:720,mobile:false},{name:'mobile-landscape',width:844,height:390,mobile:true}]){
   const context=await browser.newContext({viewport:{width:targetView.width,height:targetView.height},isMobile:targetView.mobile,hasTouch:targetView.mobile,deviceScaleFactor:1});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push('pageerror:'+e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push('console:'+m.text().slice(0,260))});
   await page.goto(target,{waitUntil:'commit',timeout:45000});
   await page.waitForFunction(()=>Boolean(window.GenesisAssetDiag)&&Boolean(window.GenesisStreamLoader)&&Boolean(document.querySelector('#genesisAssetDetails #genesisAssetRows')),null,{timeout:45000});
   await page.waitForTimeout(2500);
   const report=await page.evaluate(()=>{
    const root=document.getElementById('genesisAssetDetails'),summary=window.GenesisAssetDiag.snapshot();
    const box=root.getBoundingClientRect(),style=getComputedStyle(root),loading=document.querySelector('#loading');
    return{url:location.pathname,visible:box.width>100&&box.height>50&&style.display!=='none',
      text:root.textContent.slice(0,550),rowCount:root.querySelectorAll('#genesisAssetRows > div').length,
      assets:summary.records.filter(x=>/\\.(glb|gltf|png|jpg|bin|webp)(\\?|$)/i.test(x.url)).length,
      loadVisible:loading?.style.display!=='none',button:!!root.querySelector('#genesisCopyDiagnostic'),
      streamer:!!window.GenesisStreamLoader,legacyCategoriesHidden:getComputedStyle(document.getElementById('loadGroups')).display==='none',
      bootDeferred:document.querySelectorAll('pc-model[data-genesis-boot-asset]').length,
      bytesSnapshot:window.GenesisStreamLoader.snapshot(),
      memoryKey:'legacy-v014022',errorCount:summary.errors.length};
   });
   assert(report.visible,'Diagnostic box not visible');
   assert(report.button,'Copy report button missing');
   assert(report.streamer,'New streamer not installed');
   assert(report.legacyCategoriesHidden,'Old 6-category UI still visible');
   assert(report.bootDeferred>=1,'Boot models were not deferred / applied');
   assert(report.text.includes('V0.14.022'),'Wrong diagnostic version');
   assert(report.rowCount>=1,'No per-file diagnostic lines');
   assert(report.text.includes('ARCHIVOS'),'Per-file stream overview not displayed');
   const file=folder+'/loading-'+targetView.name+'.png';
   fs.writeFileSync(folder+'/result-'+targetView.name+'.json',JSON.stringify({...report,browserErrors:errors.slice(0,25)},null,2));
   console.log('V014022 DIAGNOSTIC',targetView.name,JSON.stringify({...report,browserErrors:errors.slice(0,5)}));
   // Screenshot is evidence only, not a prerequisite for the verified live DOM.
   try{
     await page.evaluate(()=>{const app=document.getElementById('genesisApp');if(app)app.style.visibility='hidden'});
     await page.screenshot({path:file,timeout:12000,animations:'disabled'});
   }catch(screenshotError){console.warn('SCREENSHOT NOT AVAILABLE',targetView.name,screenshotError.message)}
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error('DIAGNOSTIC SMOKE FAILED',e.stack);process.exit(1)});
