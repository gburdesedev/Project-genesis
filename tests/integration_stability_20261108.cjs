'use strict';
/* Stable-main acceptance probe: actual browser, actual route, no forced clicks or mocked gameplay. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','stability-20261108');
fs.mkdirSync(out,{recursive:true});
const report={version:'2026-11-08',result:'RUNNING',states:[],errors:[],timings:{},observations:{}};
const server=http.createServer((req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const f=path.resolve(root,'.'+p);
  if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end()}
  const ext=path.extname(f).toLowerCase();
  const mime={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
  res.writeHead(200,{'Content-Type':mime[ext]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e))}
});
const shown=()=>null;
async function inspect(page,label){
 const s=await page.evaluate(()=>{
  const el=id=>document.getElementById(id),vis=id=>{let x=el(id);return !!x&&getComputedStyle(x).display!=='none'&&getComputedStyle(x).visibility!=='hidden'};
  const a=window.__genesisArcanistaFourWallsV006||{},b=window.__genesisProductionHerreroV015||{};
  return {intro:vis('prototypeIntro'),loading:vis('loading'),hud:vis('hud'),chip:vis('professionChip'),
  quest:document.querySelector('#quest h2')?.textContent?.trim(),progress:el('loadCount')?.textContent,
  boot:el('loadState')?.textContent,arcanista:{phase:a.phase,installed:a.installed,error:a.error,magicDoorExists:a.magicDoorExists,magicDoorEnabled:a.magicDoorEnabled},
  smith:{phase:b.phase,walls:b.assets?.walls?.renderers,errors:b.errors},anim:el('playerAnim')?.component?.baseLayer?.activeState,
  gameStarted:!!el('genesisApp')?.app,routeErrors:window.__genesisRouteAssetErrors||[]};
 });
 report.states.push({label,at:new Date().toISOString(),...s});console.log('STABILITY_STATE',JSON.stringify({label,...s}).slice(0,2200));return s;
}
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768},serviceWorkers:'block'});
  page.on('pageerror',e=>report.errors.push({type:'pageerror',message:String(e).slice(0,600)}));
  page.on('response',r=>{if(r.status()>=400)report.errors.push({type:'http',code:r.status(),url:r.url().slice(0,180)})});
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.querySelector('#prototypeIntro')?.style.display==='grid'||!!document.querySelector('.loadingCard.failed'),null,{timeout:240000});
  let s=await inspect(page,'select-profession');
  assert(!await page.locator('.loadingCard.failed').count(),'Boot failure before selection');
  assert(s.intro,'Profession selection was not shown');
  await page.locator('[data-profession="Herrero"]').click({timeout:30000});
  await page.waitForFunction(()=>{const el=document.getElementById('professionChip'),intro=document.getElementById('prototypeIntro'),q=document.querySelector('#quest h2');return !!el&&getComputedStyle(el).display!=='none'&&intro?.style.display==='none'&&!!q?.textContent?.trim()},null,{timeout:360000});
  s=await inspect(page,'real-game-entered');
  assert(s.chip&&!s.intro&&s.quest,'Real game was not entered');
  assert(s.smith.phase==='running','Herrero walls not mounted');
  await page.screenshot({path:path.join(out,'01-real-game.png'),timeout:20000}).catch(e=>console.log('SCREENSHOT_UNAVAILABLE',String(e)));
  // The old Arcanista smoke never clicked a profession. It waited for a village
  // proxy which is installed only once the actual route can build the village.
  let arc=s.arcanista;
  for(let i=0;i<100&&!arc.installed&&!arc.error;i++){
   await page.waitForTimeout(1200);if(i%10===0){s=await inspect(page,'arcanista-check-'+i);arc=s.arcanista;}
   else arc=await page.evaluate(()=>{const a=window.__genesisArcanistaFourWallsV006||{};return {phase:a.phase,installed:a.installed,error:a.error,magicDoorExists:a.magicDoorExists,magicDoorEnabled:a.magicDoorEnabled}});
  }
  report.observations.arcane=arc;
  s=await inspect(page,'post-village');
  await page.screenshot({path:path.join(out,'02-post-village.png'),timeout:20000}).catch(e=>console.log('SCREENSHOT_UNAVAILABLE',String(e)));
  if(!arc.installed)throw Error('Arcanista never mounted after real route: '+JSON.stringify(arc));
  assert.equal(arc.magicDoorExists,true,'V027 magical door not found');
  assert.equal(arc.magicDoorEnabled,true,'V027 magical door not enabled');
  report.result='PASS_REAL_ROUTE_AND_TWO_WORKSHOPS';
 }finally{await browser.close()}
})().catch(e=>{report.result='FAIL';report.exception=String(e.stack||e);console.error('STABILITY_FAIL',report.exception);process.exitCode=1})
.finally(()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));server.close();console.log('STABILITY_RESULT',report.result)});
