'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','v014038-full-boot');
fs.mkdirSync(out,{recursive:true});
const srv=http.createServer((req,res)=>{
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
 res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.json':'application/json'})[path.extname(file)]||'application/octet-stream'});
 fs.createReadStream(file).pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e))}
});
(async()=>{
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:1366,height:768},serviceWorkers:'block'});
 const errors=[];page.on('pageerror',e=>errors.push(String(e.stack||e.message).slice(0,1300)));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});page.on('console',e=>{if(e.type()==='error')errors.push('CONSOLE '+e.text().slice(0,1000))});
 await page.goto('http://127.0.0.1:'+srv.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:60000});
 // A browser struggling under software WebGL can lose frames; capture the
 // precise game loading state before treating the timeout as a boot failure.
 const inspectBoot=async stage=>{
  try{return await page.evaluate(stage=>({
   stage,phase:document.getElementById('loadState')?.textContent?.trim(),
   detail:document.getElementById('loadDetail')?.textContent?.trim(),
   count:document.getElementById('loadCount')?.textContent?.trim(),
   failed:!!document.querySelector('.loadingCard.failed'),
   intro:document.getElementById('prototypeIntro')?.style.display,
   progress:window.__genesisBoot||null,device:window.GenesisDevice?.safePreviews,
   lite:window.__genesisLiteVillage||null,trees:window.__genesisTreeStatus||null,
   fountain:window.__genesisDolphinFountain||null,
   workshops:window.__genesisClosedWorkshopStatus||null,
   merchant:window.__genesisMarket?.visual||null,
   arrivalScript:!!window.GenesisCanvasArrivalV016,
   arrivalController:window.__GenesisArrivalQA?.()||null,
   arrivalQuest:document.querySelector('#quest h2')?.textContent?.trim(),
   arrivalCinemaBody:document.body.classList.contains('genesis-arrival-cinematic'),
   professionChip:document.getElementById('professionChip')?.style.display,
   gameplayStarted:document.getElementById('prototypeIntro')?.style.display==='none',
   resources:performance.getEntriesByType('resource').length
  }),stage)}catch(e){return {stage,evaluationError:String(e)}}
 };
 const waitGame=async(stage,fn,timeout)=>{
  try{await page.waitForFunction(fn,null,{timeout})}
  catch(error){
   const evidence={error:String(error),state:await inspectBoot(stage),errors:errors.slice(-25)};
   fs.writeFileSync(path.join(out,'failure-'+stage+'.json'),JSON.stringify(evidence,null,2));
   console.error('V014038_BOOT_FORENSICS',JSON.stringify(evidence).slice(0,9000));
   throw error;
  }
 };
 await waitGame('before-selection',()=>document.getElementById('prototypeIntro')?.style.display==='grid'||document.querySelector('.loadingCard.failed'),150000);
 assert.equal(await page.locator('.loadingCard.failed').count(),0,'Startup failed before selecting Herrero');
 await page.locator('[data-profession="Herrero"]').click();
 await waitGame('after-herrero',()=>{
  const chip=document.getElementById('professionChip'),intro=document.getElementById('prototypeIntro');
  return (chip?.style.display==='block'&&getComputedStyle(chip).display!=='none'&&
    intro?.style.display==='none'&&document.getElementById('loading')?.style.display==='none')
    ||!!document.querySelector('.loadingCard.failed');
 },200000);
 console.log('V014038_REAL_GAME_ENTERED',JSON.stringify(await inspectBoot('real-entry')).slice(0,2800));
 assert.equal(await page.locator('.loadingCard.failed').count(),0,'Game failed after Herrero selection');
 await waitGame('arrival-controller',()=>!!window.__GenesisArrivalQA?.()||!!document.querySelector('.loadingCard.failed'),30000);
 assert.equal(await page.locator('.loadingCard.failed').count(),0,'Loading failed after profession selection');

 const arrivalFirst=await page.evaluate(()=>window.__GenesisArrivalQA());
 assert(['arriving','arrived'].includes(arrivalFirst.state),'Fresh seed did not activate original V016 arrival: '+JSON.stringify(arrivalFirst));
 await page.waitForFunction(()=>window.__GenesisArrivalQA?.()?.state==='arrived',null,{timeout:90000});
 const arrival=await page.evaluate(()=>window.__GenesisArrivalQA());
 assert(arrival.ordanDistance<2.2,'Arrival did not stop near Ordan');
 console.log('V014038_FULL_BOOT_ARRIVAL_OK',JSON.stringify(arrival));
 const state=await page.evaluate(()=>({village:window.__genesisLiteVillage,treeStatus:window.__genesisTreeStatus,hasScene:!!window.__genesisVillage?.root,hasRealColliders:!!window.__genesisVillage?.trees?.collisionSnapshot}));
 assert.equal(state.village?.workshops,5);assert.equal(state.village?.trees,14);assert.equal(state.village?.treeLOD,'LOD2');
 await page.waitForFunction(()=>window.__genesisLiteVillage?.treeLoadFinished===true,null,{timeout:180000});
 const result=await page.evaluate(()=>({village:window.__genesisLiteVillage,status:window.__genesisVillage.trees.status(),colliders:window.__genesisVillage.trees.collisionSnapshot()}));
 assert.equal(result.village.treeVariants,4,'Four approved LOD2 species need to load');
 assert.equal(result.village.treeErrors,0,'Tree GLB load failed');
 assert.equal(result.status.planned,14);assert.equal(result.status.plaza,4);
 assert(result.colliders.filter(x=>x.region==='plaza'&&x.loaded&&x.measured).length===4,'All plaza trees need physically measured bark');
 assert.equal(result.status.lod2Only,true);
 await page.waitForFunction(()=>['ready','error'].includes(window.__genesisDolphinFountain?.phase),null,{timeout:200000});
 const fountain=await page.evaluate(()=>({...window.__genesisDolphinFountain}));
 assert.equal(fountain.phase,'ready','Approved fountain V011 GLB did not mount: '+JSON.stringify(fountain));
 assert(fountain.meshInstances>0,'Approved dolphin fountain must have real render geometry');
 assert.equal(fountain.collisionRadius,2.1);
 await page.waitForFunction(()=>['ready','error'].includes(window.__genesisClosedWorkshopStatus?.arcane?.walls),null,{timeout:210000});
 await page.waitForFunction(()=>['ready','fallback','mobile-fallback'].includes(window.__genesisClosedWorkshopStatus?.arcane?.door),null,{timeout:180000});
 const workshops=await page.evaluate(()=>{
  const x=window.__genesisClosedWorkshopStatus||{};
  const entities=window.__genesisVillage?.closedWorkshops?.records?.map(r=>({name:r.profession,entity:r.building.name,children:r.building.children.length}))||[];
  return {state:structuredClone(x),entities};
 });
 assert.equal(workshops.state.installed,4,'Four closed workshops did not mount');
 assert.equal(workshops.state.arcane.walls,'ready','Arcanista V006 walls missing');
 assert.equal(workshops.state.arcane.door,'ready','Approved Arcanista V027 portal missing');
 assert(workshops.state.arcane.meshInstances>0,'Arcanista walls have no real meshes');
 console.log('V014038_FULL_BOOT_APPROVED_REAL_GLBS',JSON.stringify(workshops));
 console.log('V014038_FULL_BOOT_GLBS_READY',JSON.stringify(fountain));
 let screenshotCaptured=false,screenshotError=null;
 try{await page.screenshot({path:path.join(out,'01-v014038-arrival-and-workshops.png'),animations:'disabled',timeout:15000});screenshotCaptured=true}
 catch(e){screenshotError=String(e.message).slice(0,500);console.warn('V014038_SCREENSHOT_LIMITATION',screenshotError)}
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result,arrival,fountain,workshops,errors,screenshotCaptured,screenshotError},null,2));
 console.log('V014038_FULL_BOOT_PASS',JSON.stringify({status:result.status,village:result.village,arrival:arrival.state,screenshotCaptured,errors:errors.slice(0,8)}));
 }finally{await browser.close()}
})().catch(e=>{console.error('V014038_FULL_BOOT_FAIL',e);process.exitCode=1}).finally(()=>srv.close());
