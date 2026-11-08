'use strict';
/* RELEASE GATE: real Chromium + WebGL game on the cumulative V014.038 branch.
   No fake scene, no force-invoked quest actions, no silent visual approval.
   The screenshot is optional: a stalled frame must not erase functional evidence.
*/
const {chromium}=require('playwright');
const {strict:assert}=require('node:assert');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','v014038-release-candidate');
fs.mkdirSync(out,{recursive:true});
const report={version:'V014.038',branch:'cumulative',kind:'real-game-browser',state:'RUNNING',events:[],errors:[],http:[],screenshot:{captured:false,visualApproval:false}};
const server=http.createServer((req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const f=path.resolve(root,'.'+name);
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.wasm':'application/wasm','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(f).pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e))}
});
function record(stage,data){report.events.push({stage,data,at:new Date().toISOString()});console.log('V038_RELEASE_EVENT',JSON.stringify({stage,data}).slice(0,2600))}
async function snap(page){
 return await page.evaluate(()=>{
  const vis=id=>{const x=document.getElementById(id);return !!x&&getComputedStyle(x).display!=='none'&&getComputedStyle(x).visibility!=='hidden'};
  return {failed:!!document.querySelector('.loadingCard.failed'),intro:vis('prototypeIntro'),chip:vis('professionChip'),
   stage:document.querySelector('#loadState')?.textContent?.trim().slice(0,130),progress:document.querySelector('#loadCount')?.textContent?.trim(),
   quest:document.querySelector('#quest h2')?.textContent?.trim().slice(0,150),liteBoot:window.__GENESIS_LITE_BOOT===true,
   village:window.__genesisLiteVillage||null,treeStatus:window.__genesisTreeStatus||null,
   fountain:window.__genesisDolphinFountain?{phase:window.__genesisDolphinFountain.phase,meshes:window.__genesisDolphinFountain.meshInstances,error:window.__genesisDolphinFountain.error}:null,
   closed:window.__genesisClosedWorkshopStatus||null,
   arrival:window.__genesisArrivalV014038?{phase:window.__genesisArrivalV014038.phase,reason:window.__genesisArrivalV014038.reason,position:window.__genesisArrivalV014038.position,error:window.__genesisArrivalV014038.error}:null,
   market:window.__genesisMarket?{version:window.__genesisMarket.version,npc:window.__genesisMarket.npc,center:window.__genesisMarket.center}:null,
   smith:window.__genesisProductionHerreroV015?.phase,rendering:!!document.querySelector('#genesisApp')?.app,
   uiOverflow:document.body.scrollWidth>document.documentElement.clientWidth+8
  };
 });
}
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768},serviceWorkers:'block'});
  page.on('pageerror',e=>report.errors.push(e.message.slice(0,600)));
  page.on('requestfailed',r=>{if(report.errors.length<40)report.errors.push(r.url().slice(0,140)+' '+r.failure()?.errorText)});
  page.on('response',r=>{if(r.status()>=400&&report.http.length<35)report.http.push({code:r.status(),url:r.url().slice(0,180)})});
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:100000});
  await page.waitForFunction(()=>document.querySelector('#prototypeIntro')?.style.display==='grid'||document.querySelector('.loadingCard.failed'),null,{timeout:200000});
  let state=await snap(page);record('intro',state);
  assert(!state.failed&&state.intro,'Game did not reach profession selection');
  await page.locator('[data-profession="Herrero"]').click({timeout:30000});
  try{
   await page.waitForFunction(()=>((document.querySelector('#prototypeIntro')?.style.display==='none')&&getComputedStyle(document.querySelector('#professionChip')).display!=='none')||document.querySelector('.loadingCard.failed'),null,{timeout:140000});
  }catch(error){
   const diag=await page.evaluate(()=>{
    const get=id=>document.getElementById(id),state=id=>get(id)?.textContent?.trim()?.slice(0,160);
    const track=['hairBeard086','forgeStation','barrelReal','mercHairBuzz10','mercSword10','mercShield10'].map(id=>{
     const el=get(id),asset=get('genesisApp')?.app?.assets?.find?.(id);return {id,src:el?.getAttribute('src'),lazy:el?.hasAttribute('lazy'),ready:!!el?.resource,assetLoaded:asset?.loaded||null}
    });
    return {loadingState:state('loadState'),loadingDetail:state('loadDetail'),loadCount:state('loadCount'),routeAssetProgress:window.__genesisRouteAssetProgress||null,routeErrors:window.__genesisRouteAssetErrors||[],boot:window.__genesisBoot||null,
     failed:!!document.querySelector('.loadingCard.failed'),diagnostics:window.GenesisAssetDiag?.snapshot?.()||null,track,
     lastResource:performance.getEntriesByType('resource').slice(-6).map(r=>({name:r.name.slice(-140),bytes:r.transferSize,duration:Math.round(r.duration)})),
     introDisplay:get('prototypeIntro')?.style.display,professionChipDisplay:get('professionChip')?.style.display};
   }).catch(e=>({snapshotError:String(e)}));
   record('herrero-route-timeout',diag);
   throw new Error('Herrero route did not complete in 140s: '+JSON.stringify(diag).slice(0,2000)+' | '+error.message);
  }
  state=await snap(page);record('herrero-entered',state);
  assert(!state.failed&&state.chip&&state.rendering,'Selecting Herrero failed');
  assert.equal(state.village?.workshops,5,'Final build must have 5 workshops (1 playable, 4 closed)');
  assert.equal(state.village?.trees,14,'Final build must preserve the 14 approved trees');
  assert.equal(state.village?.treeLOD,'LOD2','Final branch must stream bounded LOD2');
  assert.equal(state.market?.npc,'rig_reused','Merchant must be the real rigged model');
  assert.equal(state.smith,'running','Real approved Herrero shell did not mount');
  await page.waitForFunction(()=>window.__genesisArrivalV014038?.phase==='complete'||window.__genesisArrivalV014038?.phase==='error',null,{timeout:180000});
  state=await snap(page);record('arrival-finished',state);
  assert.equal(state.arrival?.phase,'complete','V016 arrival must finish the actual game animation');
  await page.waitForFunction(()=>window.__genesisLiteVillage?.treeLoadFinished||document.querySelector('.loadingCard.failed'),null,{timeout:180000});
  state=await snap(page);record('trees-finished',state);
  assert.equal(state.village.treeVariants,4,'Four local tree species must decode');
  assert.equal(state.village.treeErrors,0,'Tree GLB transfer or PBR failed');
  assert.equal(state.treeStatus?.plaza,4,'Four actual plaza trees expected');
  const colliders=await page.evaluate(()=>window.__genesisVillage?.trees?.collisionSnapshot?.()||[]);
  assert.equal(colliders.filter(x=>x.region==='plaza'&&x.loaded&&x.measured).length,4,'Trunks missing actual measured collision');
  await page.waitForFunction(()=>['ready','error'].includes(window.__genesisDolphinFountain?.phase),null,{timeout:210000});
  state=await snap(page);record('fountain-finished',state);
  assert.equal(state.fountain?.phase,'ready','Approved V011 fountain must mount in actual WebGL');
  assert(state.fountain.meshes>0,'Fountain did not contain visible GLB meshes');
  await page.waitForFunction(()=>['ready','error'].includes(window.__genesisClosedWorkshopStatus?.arcane?.walls),null,{timeout:210000});
  await page.waitForFunction(()=>['ready','fallback','mobile-fallback','error'].includes(window.__genesisClosedWorkshopStatus?.arcane?.door),null,{timeout:180000});
  state=await snap(page);record('all-five-workshops',state);
  assert.equal(state.closed?.installed,4,'All four closed workshop shells must be present');
  assert.equal(state.closed?.arcane?.walls,'ready','Arcanist V006 PBR walls must mount');
  assert.equal(state.closed?.arcane?.door,'ready','Arcanist V027 real magical door required');
  assert(state.closed.arcane.meshInstances>0,'Missing real Arcanist wall meshes');
  try{
   await page.screenshot({path:path.join(out,'v014038-five-workshops.png'),animations:'disabled',timeout:15000});
   report.screenshot.captured=true;
  }catch(e){report.screenshot.warning=String(e.message).slice(0,300);console.warn('V038_SCREENSHOT_TIMEOUT_NONFATAL',report.screenshot.warning)}
  report.state='PASS_FUNCTIONAL_BOOT_AND_WORLD__VISUAL_REVIEW_PENDING';
  record('result',{state:report.state,screenshotCaptured:report.screenshot.captured,jsErrors:report.errors.length,httpErrors:report.http.length});
 }finally{await browser.close()}
})().catch(e=>{report.state='FAIL';report.failure=String(e.stack||e).slice(0,2400);console.error('V038_RELEASE_FAIL',report.failure);process.exitCode=1})
.finally(()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));server.close();});
