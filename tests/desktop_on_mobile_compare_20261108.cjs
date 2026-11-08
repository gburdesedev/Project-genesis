'use strict';
// Differential diagnostic: identical touch-size screen, real WebGL and Herrero
// journey. Never change game code, saved games, or the release branch.
const {chromium}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'previews','desktop-on-mobile-20261108');
fs.mkdirSync(out,{recursive:true});
const report={purpose:'Desktop browser policy on touch-sized device; same Git commit and viewport',mode:'CHROMIUM_MOBILE_EMULATION_NOT_PHYSICAL_PHONE',cases:[],createdAt:new Date().toISOString()};
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.wasm':'application/wasm','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=path.resolve(root,'.'+pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(file).pipe(res);
 }catch(error){res.writeHead(500);res.end(String(error));}
});
const pcOnTouch=()=>{
 // Mimic "Request desktop site" AND explicitly remove the coarse-pointer
 // signal. Desktop UA alone is insufficient in Project Genesis device_policy.js.
 Object.defineProperty(navigator,'userAgent',{configurable:true,get:()=>'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'});
 Object.defineProperty(navigator,'platform',{configurable:true,get:()=>'Win32'});
 Object.defineProperty(navigator,'maxTouchPoints',{configurable:true,get:()=>0});
 const original=window.matchMedia.bind(window);
 window.matchMedia=(q)=>{
  const real=original(q);
  if(!/\(\s*pointer\s*:\s*coarse\s*\)/i.test(q))return real;
  return {media:q,matches:false,onchange:null,addListener:real.addListener.bind(real),
   removeListener:real.removeListener.bind(real),addEventListener:real.addEventListener.bind(real),
   removeEventListener:real.removeEventListener.bind(real),dispatchEvent:real.dispatchEvent.bind(real)};
 };
};
const forceFullWorld=()=>{
 // The actual HTML hard-codes __GENESIS_LITE_BOOT=true. Override only in
 // this automated diagnostic page before the game's inline scripts execute.
 Object.defineProperty(window,'__GENESIS_LITE_BOOT',{configurable:false,enumerable:true,get:()=>false,set:()=>{}});
};
const snapshot=async page=>page.evaluate(()=>{
 const by=id=>document.getElementById(id);
 const visible=id=>{const el=by(id);return !!el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'};
 const r=performance.getEntriesByType('resource');
 const heap=performance.memory;
 return {profile:window.GenesisDevice?.safePreviews===true?'MOBILE_SAFE':window.GenesisDevice?.safePreviews===false?'DESKTOP':'UNKNOWN',
  liteBoot:window.__GENESIS_LITE_BOOT===true,professionVisible:visible('prototypeIntro'),gameHud:visible('hud'),
  loading:visible('loading'),failed:!!document.querySelector('.loadingCard.failed'),
  loadState:by('loadState')?.textContent?.trim().slice(0,180),loadDetail:by('loadDetail')?.textContent?.trim().slice(0,180),
  loadCount:by('loadCount')?.textContent?.trim().slice(0,100),
  quest:document.querySelector('#quest h2')?.textContent?.trim().slice(0,160),
  treeStatus:window.__genesisTreeStatus||null,liteVillage:window.__genesisLiteVillage||null,
  smith:window.__genesisProductionHerreroV015?.phase||null,
  webgl:!!document.querySelector('pc-app')?.app,
  requests:r.length,heapBytes:heap?.usedJSHeapSize||null,
  dpr:window.devicePixelRatio,viewport:[innerWidth,innerHeight],
  bodyScrollWidth:document.body.scrollWidth,bodyClientWidth:document.body.clientWidth};
});
async function runCase(port,config){
 const item={name:config.name,stages:[],errors:[],httpErrors:[],navigationCount:0};
 report.cases.push(item);
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:2,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',serviceWorkers:'block'});
  const page=await context.newPage();
  if(config.desktop)await page.addInitScript(pcOnTouch);
  if(config.full)await page.addInitScript(forceFullWorld);
  page.on('pageerror',e=>item.errors.push(String(e.message||e).slice(0,700)));
  page.on('requestfailed',r=>item.errors.push('NETWORK '+r.url().slice(0,150)+' '+r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400&&item.httpErrors.length<35)item.httpErrors.push({code:r.status(),url:r.url().slice(0,180)});});
  page.on('framenavigated',()=>item.navigationCount++);
  const url='http://127.0.0.1:'+port+'/index.html?genesis_memory=1';
  const started=Date.now();
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{
   const i=document.getElementById('prototypeIntro');
   return i?.style.display==='grid'||!!document.querySelector('.loadingCard.failed');
  },null,{timeout:config.full?130000:100000}).catch(e=>{item.errors.push('SELECT_TIMEOUT '+e.message.slice(0,220));});
  item.stages.push({stage:'profession-selection',seconds:Math.round((Date.now()-started)/1000),state:await snapshot(page)});
  try{await page.screenshot({path:path.join(out,config.name+'-01-select.png'),timeout:12000});}catch(e){item.errors.push('SCREENSHOT '+e.message.slice(0,140));}
  const state=item.stages[0].state;
  if(state.professionVisible&&!state.failed){
   try{
    await page.locator('[data-profession="Herrero"]').click({timeout:12000});
    await page.waitForFunction(()=>{
     const intro=document.getElementById('prototypeIntro'),chip=document.getElementById('professionChip');
     return (intro?.style.display==='none'&&chip&&getComputedStyle(chip).display!=='none')
        ||!!document.querySelector('.loadingCard.failed');
    },null,{timeout:config.full?150000:120000});
   }catch(e){item.errors.push('HERRERO '+e.message.slice(0,300));}
   item.stages.push({stage:'after-select-herrero',seconds:Math.round((Date.now()-started)/1000),state:await snapshot(page)});
   try{await page.screenshot({path:path.join(out,config.name+'-02-herrero.png'),timeout:12000});}catch(e){item.errors.push('SCREENSHOT '+e.message.slice(0,140));}
  }
  item.summary={profile:state.profile,selected:state.professionVisible,entered:!!item.stages.at(-1)?.state.gameHud,
   stage:item.stages.at(-1)?.stage,failed:!!item.stages.at(-1)?.state.failed,seconds:Math.round((Date.now()-started)/1000)};
  console.log('GENESIS_DESKTOP_ON_MOBILE',JSON.stringify({name:item.name,...item.summary,errors:item.errors.slice(0,6),httpErrors:item.httpErrors.slice(0,6)}));
 }catch(e){item.exception=String(e.stack||e).slice(0,1600);console.error('GENESIS_COMPARE_EXCEPTION',config.name,item.exception);}
 finally{await browser?.close().catch(()=>{});}
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 try{
  await runCase(port,{name:'A-mobile-safe-lite',desktop:false,full:false});
  await runCase(port,{name:'B-pc-policy-on-touch-lite',desktop:true,full:false});
  await runCase(port,{name:'C-pc-policy-on-touch-full-world',desktop:true,full:true});
  const a=report.cases[0]?.stages[0]?.state,b=report.cases[1]?.stages[0]?.state,c=report.cases[2]?.stages[0]?.state;
  report.policyCheck={mobile:a?.profile==='MOBILE_SAFE',pc:b?.profile==='DESKTOP',fullWorldDisabledLite:c?.liteBoot===false};
  report.result=Object.values(report.policyCheck).every(Boolean)?'PROFILE_OVERRIDES_CONFIRMED; REVIEW BOOT AND SCREENSHOTS':'PROFILE_OVERRIDES_INCOMPLETE';
  console.log('GENESIS_COMPARE_RESULT',JSON.stringify({result:report.result,check:report.policyCheck,cases:report.cases.map(x=>x.summary||x.exception)}));
 }finally{
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  server.close();
 }
})().catch(e=>{console.error('GENESIS_COMPARE_FATAL',String(e.stack||e));process.exitCode=1;server.close();});
