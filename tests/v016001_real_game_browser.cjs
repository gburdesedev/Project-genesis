'use strict';
const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','v016001-in-game');fs.mkdirSync(out,{recursive:true});
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const hook='document.querySelectorAll(\'[data-profession]\').forEach(btn=>btn.addEventListener';
assert(html.includes(hook));
const bridge="window.__e2e={state:()=>({gameStarted,step:tutorialStep,items:craftedItems.map(i=>({name:i.name,rarity:i.rarity,channels:i.channels}))}),"+
"prime:()=>{if(!gameStarted||selectedProfession!=='Herrero')throw Error('Herrero no iniciado');"+
"chestOpen=true;playerInventory={...craftSession.stock};"+
"for(const f of Object.values(craftSession.formulas||{}))for(const m of f.materials)playerInventory[m.material]=Math.max(playerInventory[m.material]||0,m.qty*6+12);"+
"setTutorialStep(10);refreshInventorySummary();},craft:()=>performCraft()};";
html=html.replace(hook,bridge+hook);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.json':'application/json'};
const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/'||pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html)}
 const file=path.resolve(root,'.'+decodeURIComponent(pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
const report={status:'START',events:[],errors:[]};
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},serviceWorkers:'block'});
  page.on('pageerror',e=>report.errors.push('JS '+String(e).slice(0,240)));
  page.on('response',r=>{if(r.status()>=400&&report.errors.length<50)report.errors.push('HTTP '+r.status()+' '+r.url().slice(0,180))});
  page.on('requestfailed',r=>{if(report.errors.length<50)report.errors.push('FAILED '+r.url().slice(0,160)+' '+r.failure()?.errorText)});
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:90000});
  try{await page.locator('[data-profession="Herrero"]').waitFor({state:'visible',timeout:60000})}catch(e){
    report.loader=await page.evaluate(()=>({loadState:document.querySelector('#loadState')?.textContent,loadDetail:document.querySelector('#loadDetail')?.textContent,loadCount:document.querySelector('#loadCount')?.textContent,loadPercent:document.querySelector('#loadPercent')?.textContent,intro:document.querySelector('#prototypeIntro')?.style.display,failed:document.querySelector('.loadingCard')?.className,boot:window.__genesisBoot,assets:performance.getEntriesByType('resource').length}));
    await page.screenshot({path:path.join(out,'00-loader-blocked.png'),timeout:15000,animations:'disabled'}).catch(x=>{report.errors.push('SCREENSHOT '+x.message)});
    throw Error('HERRERO_STARTUP_BLOCKED '+JSON.stringify(report.loader)+'; first errors '+JSON.stringify(report.errors.slice(0,10)));
  }
  await page.locator('[data-profession="Herrero"]').click({timeout:30000});
  await page.waitForFunction(()=>window.__e2e?.state().gameStarted===true,null,{timeout:180000});
  report.events.push('Mundo Herrero iniciado');
  await page.evaluate(()=>window.__e2e.prime());
  for(let n=1;n<=2;n++){
   await page.evaluate(()=>window.__e2e.craft());
   await page.locator('.genesisResultModal .grScreen').waitFor({timeout:15000});
   await page.waitForFunction(()=>[...document.querySelectorAll('.grOra')].every(x=>x.complete&&x.naturalWidth===990),null,{timeout:10000});
   const state=await page.evaluate(()=>({item:window.__e2e.state().items.at(-1),bars:[...document.querySelectorAll('.grChannelGroup')].map(x=>({name:x.dataset.resultChannel,value:Number(x.dataset.resultValue)})),techniques:document.querySelectorAll('.grSub').length,poster:!!document.querySelector('.grSwordPoster')}));
   assert.equal(state.techniques,0);assert.equal(state.bars.length,n===1?1:state.item.channels.length);
   assert.deepEqual(state.bars.map(x=>x.name),state.item.channels.map(([name])=>name==='Daño'?'Base':name));
   assert.deepEqual(state.bars.map(x=>x.value),state.item.channels.map(([,value])=>value));
   assert(state.poster);report.events.push(state);
   await page.screenshot({path:path.join(out,'espada-'+n+'-runtime.png'),timeout:20000,animations:'disabled'});
   await page.locator('#resultContinue').click();
   if(n===1)await page.waitForFunction(()=>window.__e2e.state().step===11,null,{timeout:10000});
  }
  report.status='PASS_REAL_HERRERO_2_CRAFTS_SHORTCUT_TO_TUTORIAL_STEP_10';
 }finally{await browser.close()}
})().catch(e=>{report.status='FAIL';report.exception=String(e.stack||e);console.error(report.exception);process.exitCode=1})
.finally(()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));server.close();console.log('V016001_E2E_GAME',report.status,JSON.stringify(report.events).slice(0,2000))});
