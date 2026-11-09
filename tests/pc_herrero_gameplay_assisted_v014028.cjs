'use strict';
/* V014.028 actual PlayCanvas PC live route QA. Whitebox stage jumps are
 * restricted to a TEMPORARY QA copy, not released. Full graphics + real UI
 * confirmation buttons + real procedural NGE and inventory functions run.
 * This test does NOT claim actual physical walking / full click playthrough.
 */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','pc-herrero-end-to-end');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.glb':'model/gltf-binary','.gltf':'model/gltf+json','.png':'image/png','.webp':'image/webp',
 '.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end('403');return;}
 const stream=fs.createReadStream(p);
 stream.on('error',()=>{if(!res.headersSent)res.writeHead(404);res.end();});
 res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');
 stream.pipe(res);
});
let phase='initial',page=null,browser=null;
const trace=[],issues=[];
async function read(){const s=await page.evaluate(()=>window.__genesisFullRouteQA?.state?.()||null);
 if(s)trace.push({phase,step:s.step,started:s.started,crafts:s.crafted.length,merc:s.mercState,quest:s.quest});
 return s;}
async function stage(name,callback){
 phase=name;console.log('GENESIS_FUNCTIONAL_STAGE_BEGIN',name,flushSymbol());
 const v=await callback();
 const s=await read();
 console.log('GENESIS_FUNCTIONAL_STAGE_OK',name,JSON.stringify({step:s?.step,crafts:s?.crafted.length,merc:s?.mercState}));
 return v;
}
function flushSymbol(){return '🛠';}
async function screenshot(name){try{
 await page.screenshot({path:path.join(out,name+'.png'),timeout:8000,animations:'disabled'});
 }catch(e){issues.push('OPTIONAL_SCREENSHOT_FAILURE '+name+' '+String(e).slice(0,280))}}
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const url='http://127.0.0.1:'+server.address().port+'/index-gameplay-qa.html';
 browser=await chromium.launch({headless:true,args:['--enable-webgl',
   '--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 page.on('pageerror',err=>issues.push('PAGE '+err.message));
 page.on('console',m=>{if(m.type()==='error')issues.push('CONSOLE '+m.text().slice(0,340))});
 page.on('requestfailed',req=>{if(!req.url().includes('fonts'))issues.push('NETWORK '+(req.failure()?.errorText||'?')+' '+req.url().slice(0,220))});
 try{
 await stage('boot-and-controls',async()=>{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!!window.__genesisFullRouteQA,{timeout:180000});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#prototypeIntro')).display==='grid',
    null,{timeout:20000});
  assert(await page.locator('[data-profession="Herrero"]').count()>=1,'No Herrero choice in game');
  assert.equal((await read()).started,false);
 });
 await stage('select-Herrero-real-ui',async()=>{
  await page.locator('[data-profession="Herrero"]').first().click();
  await page.waitForFunction(()=>window.__genesisFullRouteQA.state().started,
   null,{timeout:180000});
  const s=await read();
  assert.equal(s.profession,'Herrero');
  assert.equal(s.introDisplay,'none','Intro still blocks game');
  assert.equal(s.loadingDisplay,'none','Loading overlay blocks game after selecting Herrero');
  assert(s.hudVisible,'Actual in-game HUD is not visible after Herrero selection');
  assert(s.quest.length>5,'No real quest displayed');
  assert(s.step>=0&&s.step<=8,'Unexpected tutorial starting step '+s.step);
  await screenshot('01-herrero-world-start');
 });
 await stage('real-starter-chest',async()=>{
  const s=await page.evaluate(()=>window.__genesisFullRouteQA.chest());
  assert(Object.keys(s).length>0,'Chest did not grant session stock');
  const cur=await read();
  assert.equal(cur.chest,true);
  assert.equal(cur.step,9);
  await page.locator('#dialogNext').click();
 });
 await stage('refine-real-iron',async()=>{
  const before=await read();
  const out=await page.evaluate(()=>window.__genesisFullRouteQA.prepAllIron());
  assert(out['Lingote de hierro']>0, 'Iron ingots not generated from raw ore '+JSON.stringify({before:before.inv,after:out}));
 });
 for(const [n,expected] of [[1,'espada_hierro'],[2,'espada_hierro']]){
  await stage('craft-sword-'+n,async()=>{
   const set=(n===1?10:11);
   // n==1: tutorial step 9 has been completed via inventory tutorial,
   // but no physical player travel is simulated; advance the station objective.
   if(n===1)await page.evaluate(()=>window.__genesisFullRouteQA.stepCraft(10));
   const recipe=await page.evaluate(()=>window.__genesisFullRouteQA.craft());
   assert.equal(recipe,expected);
   await page.locator('#confirmCraft').click();
   await page.waitForSelector('#resultContinue',{timeout:10000});
   const result=await read();
   assert.equal(result.crafted.length,n);
   assert.equal(result.crafted[n-1].recipe,expected);
   assert.equal(result.crafted[n-1].rarity,n===1?'Inútil':result.crafted[n-1].rarity);
   await page.locator('#resultContinue').click();
   if(n===2){
    await page.waitForSelector('#compareContinue',{timeout:10000});
    await screenshot('02-two-swords-comparison');
    await page.locator('#compareContinue').click();
   }
  });
 }
 await stage('Ordan-market-quest',async()=>{
  const t=await page.evaluate(()=>window.__genesisFullRouteQA.mentorMarket());
  assert.equal(t,11.5,'Market escort not initiated at quest step 11.25');
 });
 await stage('shield-restock-from-seeded-market-needs',async()=>{
  // Whitebox helper adds exactly the materials from the established market
  // domain. Actual purchase UI is covered by its separate domain tests.
  const result=await page.evaluate(()=>window.__genesisFullRouteQA.restockShields());
  assert(result.needs.length>0,'Market never computed shield needs');
  assert.equal((await read()).step,12);
  const out=await page.evaluate(()=>window.__genesisFullRouteQA.prepAllIron());
  assert(out['Lingote de hierro']>0,'Market ore not refinable for shields');
 });
 for(const [n,expected] of [[3,'escudo_hierro'],[4,'escudo_hierro']]){
  await stage('craft-shield-'+(n-2),async()=>{
   const recipe=await page.evaluate(()=>window.__genesisFullRouteQA.craft());
   assert.equal(recipe,expected);
   await page.locator('#confirmCraft').click();
   await page.waitForSelector('#resultContinue',{timeout:10000});
   const result=await read();
   assert.equal(result.crafted.length,n,'Expected exactly '+n+' crafted items');
   assert.equal(result.crafted[n-1].recipe,expected);
   await page.locator('#resultContinue').click();
   if(n===4){
    await page.waitForSelector('#compareContinue',{timeout:10000});
    await screenshot('03-two-shields-comparison');
    await page.locator('#compareContinue').click();
    await page.waitForSelector('[data-merc]',{timeout:20000});
   }
  });
 }
 await stage('equip-real-mercenary',async()=>{
  const result=await page.evaluate(()=>window.__genesisFullRouteQA.candidate());
  assert.equal(result.equipped,true,'Could not physically attach sword+shield '+JSON.stringify(result));
  const s=await read();
  assert.equal(s.crafted.length,4);
  assert(s.equipped,'Actual mercenary gear flag not set');
  await screenshot('04-mercenary-equipped');
 });
 await stage('expedition-real-ui',async()=>{
  await page.evaluate(()=>window.__genesisFullRouteQA.mission());
  await page.waitForSelector('#missionSend',{timeout:10000});
  await page.locator('#missionSend').click();
  assert.equal((await read()).mercState,'departing');
 });
 await stage('expedition-return-and-sample',async()=>{
  // Full world path is NOT time-stepped here. Finish callback and modal are
  // exercised, but this is NOT an actual walking route validation.
  await page.evaluate(()=>window.__genesisFullRouteQA.finishExpedition());
  await page.waitForSelector('#collectDemoMaterial',{timeout:10000});
  assert.equal((await read()).step,19);
  await page.locator('#collectDemoMaterial').click();
  assert.equal((await read()).step,20);
  await screenshot('05-expedition-material-result');
 });
 const end=await read();
 const audit={schema:'Genesis_014028_Main_PC_RealBrowser_FourCrafts_MercenaryQA',
   originalHtmlChanged:false,qaCopyOnly:true,actualWebGL:true,actualHerreroClicked:true,
   proceduralCrafts:end.crafted.length,crafts:end.crafted,completedToStep:end.step,
   mercenaryEquipped:end.equipped,marketPurchaseUICovered:false,marketInventoryFixture:true,
   introPhysicalWalkCovered:false,expeditionPhysicalWalkCovered:false,
   issues,trace,status:'BROWSER_GAMEPLAY_ASSISTED_PASS'};
 fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(audit,null,2));
 console.log('GENESIS_PC_GAMEPLAY_ASSISTED_PASS',JSON.stringify({
   crafts:audit.proceduralCrafts,mercenary:audit.mercenaryEquipped,step:audit.completedToStep}));
 }catch(err){
  let state=null;try{state=await page?.evaluate(()=>window.__genesisFullRouteQA?.state?.()||null)}catch{}
  const audit={status:'BROWSER_GAMEPLAY_ASSISTED_FAIL',phase,error:String(err.stack||err),state,trace,issues};
  fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify(audit,null,2));
  console.error('GENESIS_PC_GAMEPLAY_ASSISTED_FAIL',JSON.stringify(audit).slice(0,9200));
  throw err;
 }finally{if(browser)await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1}).finally(()=>server.close());
