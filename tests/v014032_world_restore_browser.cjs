'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','v014032-world-restore');
fs.mkdirSync(out,{recursive:true});
const report={state:'STARTING',samples:[],errors:[],httpErrors:[],started:new Date().toISOString()};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const full=path.resolve(root,'.'+pathname);
  if(!full.startsWith(root+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);return res.end('Not Found')}
  const m={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.gltf':'model/gltf+json','.glb':'model/gltf-binary','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
  res.writeHead(200,{'Content-Type':m[path.extname(full)]||'application/octet-stream'});fs.createReadStream(full).pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e))}
});
async function audit(page,label){
 const state=await page.evaluate(()=>{
  const app=document.getElementById('genesisApp')?.app;
  const root=app?.root;
  const find=name=>root?.findByName(name);
  const m=find('Mercader de suministros · NPC interactivo V001');
  const full=find('Aldea 63x63 · v0.14c');
  const fountain=document.getElementById('genesisFountainV011Model');
  const merchant=window.__genesisMarket;
  const arcane=window.__genesisArcanistaFourWallsV006||{};
  const trees=window.__genesisTreeStatus||{};
  const b=document.querySelector('[data-profession="Herrero"]');
  const vis=e=>!!e&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden';
  return {fullMode:window.__GENESIS_WORLD_FULL,liteLoader:window.__GENESIS_LITE_BOOT,
    fullVillage:!!full,worldChildren:full?.children?.length||0,
    trees:{planned:trees.planned,plaza:trees.plaza,loaded:trees.loaded,phase:trees.phase,failed:trees.failed,ready:trees.ready},
    fountain:{attr:fountain?.getAttribute('asset'),content:!!fountain?.contentEntity,src:document.getElementById('genesisFountainV011HQAsset')?.getAttribute('src')},
    merchant:{spawned:!!m,children:m?.children?.length,enabled:m?.enabled,visual:merchant?.visual?.phase,error:merchant?.visual?.error,meshInstances:merchant?.visual?.meshInstances},
    arcanista:{installed:arcane.installed,phase:arcane.phase,error:arcane.error},
    progress:document.getElementById('loadState')?.textContent,detail:document.getElementById('loadDetail')?.textContent,
    intro:vis(document.getElementById('prototypeIntro')),
    loading:vis(document.getElementById('loading')),
    quest:document.querySelector('#quest h2')?.textContent,
    chip:vis(document.getElementById('professionChip')),
    button:!!b,arrival:window.__GenesisArrivalQA?.()||null,
    routeProgress:(()=>{const p=Object.values(window.__genesisAssetProgress||{});return {total:p.length,ready:p.filter(x=>x.phase==='listo').length,pending:p.filter(x=>x.phase!=='listo').slice(0,8)}})(),
    routeErrors:window.__genesisRouteAssetErrors||[],errors:window.__genesisRouteAssetErrors||[]};
 });
 const e={label,time:new Date().toISOString(),...state};report.samples.push(e);
 console.log('WORLD_RESTORE_STATE',JSON.stringify(e).slice(0,4000));return state;
}
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  page.on('pageerror',e=>report.errors.push(String(e).slice(0,700)));
  page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({status:r.status(),url:r.url().slice(0,200)})});
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForTimeout(15000);
  let s=await audit(page,'startup-15s');
  assert(s.fullMode===true,'Full village toggle missing');
  if(process.env.GENESIS_WORLD_PROBE_ONLY==='1'){
   assert(s.fullVillage,'Full world root was not created during first 15 seconds');
   assert.equal(s.trees.planned,14,'Original 14 tree positions are missing');
   assert(s.merchant.spawned,'Market merchant NPC is missing');
   assert(s.fountain.src?.includes('PG_Dolphin_Fountain_V011'),'Approved fountain source missing');
   report.state='PASS_WORLD_MOUNT_DIAG_ONLY';
   return;
  }
  const start=Date.now();
  while(Date.now()-start<330000&&!s.intro&&!s.errors.length){
   await page.waitForTimeout(12000);s=await audit(page,'boot');
   if(report.samples.length>28)break;
  }
  if(!s.intro)throw Error('Full village failed to reach profession chooser: '+JSON.stringify(s));
  assert(s.fullVillage,'Full 63x63 village not mounted');
  assert.equal(s.trees.planned,14,'Expected original 14 tree sites');
  assert(s.merchant.spawned,'Merchant V02 NPC root missing');
  await page.locator('[data-profession="Herrero"]').click({timeout:30000});
  let entered=false;
  for(let i=0;i<18;i++){
   await page.waitForTimeout(10000);
   s=await audit(page,'after-click-'+i);
   if(s.chip&&!s.intro){entered=true;break}
   if(report.errors.length)console.log('WORLD_RUNTIME_ERRORS',JSON.stringify(report.errors.slice(-5)));
  }
  if(!entered)throw Error('Herrero route did not finish: '+JSON.stringify({last:s,errors:report.errors.slice(-5),http:report.httpErrors.slice(-8)}));
  s=await audit(page,'entered-real-Herrero');
  assert(s.fullVillage,'Full village disappeared upon route selection');
  assert(s.fountain.content,'Fountain V011 model missing after staged stream');
  assert(s.merchant.spawned,'Merchant disappeared during route selection');
  assert(s.trees.planned===14,'Trees lost after route');
  report.state='PASS_ORIGINAL_FULL_VILLAGE';
 }finally{await browser.close()}
})().catch(e=>{report.state='FAIL';report.exception=String(e.stack||e);console.error('WORLD_RESTORE_FAILURE',report.exception);process.exitCode=1})
.finally(()=>{report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'status.json'),JSON.stringify(report,null,2));server.close();console.log('WORLD_RESTORE_RESULT',report.state)});
