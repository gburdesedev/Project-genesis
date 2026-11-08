'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'previews','v014022-restored-qa');
fs.mkdirSync(out,{recursive:true});
// Forensic source excerpts before changing the original game logic.
const rawGame=fs.readFileSync(path.join(root,'index.html'),'utf8');
const rawLines=rawGame.split('\\n');
for(const token of ['function loadDeferredModelAsset','async function activateRouteGroups','Sprint_Loop','Walk_Loop','tannerChest09','rangerMale086','ShiftLeft']){
 const indexes=[];rawLines.forEach((line,i)=>{if(line.includes(token)&&indexes.length<3)indexes.push(i)});
 for(const i of indexes){console.log('SOURCE_PROBE',token,'line',i+1,rawLines.slice(Math.max(0,i-5),Math.min(rawLines.length,i+18)).map((line,k)=>(Math.max(0,i-5)+k+1)+': '+line.slice(0,250)).join('\\n'))}
}

if(process.env.GENESIS_SOURCE_ONLY==='1')process.exit(0);
// Externalized V014022 contract: HTML must load the exact 17 original GLBs from
// the organization asset branch, not from inline base64 data URIs.
const externalized=[...rawGame.matchAll(/<pc-asset\b[^>]*>/g)].map(m=>m[0]).filter(tag=>tag.includes('raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/main/integration/v014022/embedded/'));
if(externalized.length!==17)throw Error('Expected 17 verified externalized GLBs, found '+externalized.length);
console.log('EXTERNAL_ASSET_CONTRACT',JSON.stringify({externalized:externalized.length,remainingEmbedded:(rawGame.match(/src="data:model\/gltf-binary;base64,/g)||[]).length}));
const report={branch:'V014022 restored main',start:new Date().toISOString(),states:[],networkErrors:[],consoleErrors:[],screenshots:[],result:'STARTING'};
const srv=http.createServer((req,res)=>{
 try{
  const requested=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+requested);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  const ct={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.wasm':'application/wasm','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
  res.writeHead(200,{'Content-Type':ct[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e));}
});
async function snapshot(page,stage){
 const state=await page.evaluate(()=>{
  const el=id=>document.getElementById(id);
  return {title:document.title,stage:el('loadState')?.textContent?.trim(),detail:el('loadDetail')?.textContent?.trim(),count:el('loadCount')?.textContent?.trim(),introDisplay:el('prototypeIntro')?.style.display,professionDisplay:el('professionChip')?.style.display,gameplay:el('prototypeIntro')?.style.display==='none',failed:!!document.querySelector('.loadingCard.failed'),quest:document.querySelector('#quest h2')?.textContent?.trim(),boot:window.__genesisBoot||null,routeErrors:window.__genesisRouteAssetErrors||[],arcanista:window.__genesisArcanistaFourWallsV006||null,smith:window.__genesisProductionHerreroV015?.phase,resources:performance.getEntriesByType('resource').length};
 });
 report.states.push({stage,at:new Date().toISOString(),...state});console.log('GENESIS_QA_STATE',JSON.stringify({stage,...state}).slice(0,3500));return state;
}
async function shot(page,name){
 try{await page.screenshot({path:path.join(out,name),timeout:15000,animations:'disabled'});report.screenshots.push({name,ok:true});}
 catch(e){report.screenshots.push({name,ok:false,error:String(e).slice(0,350)});}
}
(async()=>{
 await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768},serviceWorkers:'block'});
  page.on('pageerror',e=>report.consoleErrors.push(String(e).slice(0,700)));
  page.on('response',r=>{if(r.status()>=400&&report.networkErrors.length<100)report.networkErrors.push({status:r.status(),url:r.url().slice(0,250)});});
  page.on('requestfailed',r=>{if(report.networkErrors.length<100)report.networkErrors.push({status:'failed',url:r.url().slice(0,250),reason:r.failure()?.errorText});});
  await page.goto('http://127.0.0.1:'+srv.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:90000});
  try{await page.waitForFunction(()=>document.querySelector('#prototypeIntro')?.style.display==='grid'||!!document.querySelector('.loadingCard.failed'),null,{timeout:150000});}catch(e){console.log('INTRO_TIMEOUT',String(e));}
  const intro=await snapshot(page,'profession-selection');await shot(page,'01-profession-selection.png');
  if(intro.failed)throw Error('Loading failed before profession selection');
  const selector=page.locator('[data-profession="Herrero"]');
  if(await selector.count()!==1)throw Error('Herrero option missing: '+await selector.count());
  await selector.click({timeout:30000});
  try{await page.waitForFunction(()=>document.getElementById('prototypeIntro')?.style.display==='none'||!!document.querySelector('.loadingCard.failed'),null,{timeout:300000});}catch(e){console.log('HERRERO_TIMEOUT',String(e));}
  const state=await snapshot(page,'after-Herrero-click');await shot(page,'02-after-Herrero-click.png');
  if(state.failed)throw Error('Loading failed after Herrero selection');
  if(!state.gameplay)throw Error('Herrero route did not enter game');
  // Wait for the actual model counter; entering the world may precede
  // completion of remaining route assets by several minutes under software WebGL.
  try {
    await page.waitForFunction(()=>{
      if(document.querySelector('.loadingCard.failed'))return true;
      const t=document.getElementById('loadCount')?.textContent||'';
      const m=t.match(/(\\d+)\\s+de\\s+(\\d+)/i);
      return !!m && Number(m[1])===Number(m[2]);
    },null,{timeout:240000,polling:1500});
  }catch(e){console.log('REQUIRED_ASSET_WAIT_TIMEOUT',String(e));}
  const final=await snapshot(page,'in-village');await shot(page,'03-in-village.png');
  // Success requires the actual loading UI to declare completion, not only a
  // hidden profession modal. A stalled/failed asset must never yield PASS.
  const progress=(final.count||'').match(/(\d+)\s+de\s+(\d+)/i);
  const complete=progress&&Number(progress[1])===Number(progress[2]);
  if(!complete)throw Error('Incomplete route asset loading: '+final.count+'; stage='+final.stage);
  const optionalAssets=new Set(['tannerChest09']); // Curtidor is not in Herrero-only vertical slice
  const optionalErrors=(final.routeErrors||[]).filter(e=>optionalAssets.has(e.id));
  const requiredErrors=(final.routeErrors||[]).filter(e=>!optionalAssets.has(e.id));
  report.optionalSkipped=optionalErrors;
  if(requiredErrors.length)throw Error('Required route asset errors: '+JSON.stringify(requiredErrors).slice(0,1500));
  if(report.consoleErrors.length)throw Error('Browser JavaScript errors: '+JSON.stringify(report.consoleErrors.slice(0,8)));
  report.result='PASS_BASIC_HERRERO_ENTRY_ASSETS_COMPLETE_NOT_FULL_VERTICAL_SLICE';
 }finally{await browser.close();}
})().catch(e=>{report.result='FAIL';report.exception=String(e.stack||e).slice(0,3200);console.error('GENESIS_QA_FAIL',report.exception);process.exitCode=1;})
.finally(()=>{report.finish=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));srv.close();console.log('GENESIS_QA_RESULT',report.result);});
