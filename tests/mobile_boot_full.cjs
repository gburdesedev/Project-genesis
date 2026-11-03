'use strict';
// Actual mobile WebKit boot smoke test; unlike menu tests it loads the live scene.
const {webkit}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+decodeURIComponent(url==='/'?'/index.html':url));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
 const type=/\.js$/.test(file)?'text/javascript':/\.html$/.test(file)?'text/html':/\.css$/.test(file)?'text/css':/\.png$/.test(file)?'image/png':/\.glb$/.test(file)?'model/gltf-binary':'application/octet-stream';
 res.setHeader('Content-Type',type);fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await webkit.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('MOBILE_PAGE_ERROR',e.message)});
  page.on('requestfailed',r=>console.log('MOBILE_REQUEST_FAILED',r.url(),r.failure()?.errorText));
  page.on('response',r=>{if(r.status()>=400)console.log('MOBILE_HTTP',r.status(),r.url())});
  const state=()=>page.evaluate(()=>({phase:document.querySelector('#loadState')?.textContent,detail:document.querySelector('#loadDetail')?.textContent,progress:document.querySelector('#loadPercent')?.textContent,count:document.querySelector('#loadCount')?.textContent,failed:!!document.querySelector('.loadingCard.failed'),intro:document.querySelector('#prototypeIntro')?.style.display,ui:window.GenesisPreflight?.snapshot?.(),trees:window.__genesisTreeStatus,door:window.__genesisArcaneDoorStatus,portrait:document.documentElement.classList.contains('genesis-landscape-required')})).catch(e=>({error:e.message}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:90000});
  assert.equal(await page.evaluate(()=>window.GenesisDevice?.safePreviews),true,'Mobile resource budget must be enabled');
  for(let i=0;i<18;i++){
   await page.waitForTimeout(10000);
   const s=await state();console.log('MOBILE_BOOT_PROGRESS',JSON.stringify(s));
   if(s.intro==='grid'||s.failed)break;
  }
  const result=await state();
  if(result.failed||result.intro!=='grid'){
   const pending=await page.evaluate(()=>[...document.querySelectorAll('pc-anim-clip,pc-model[asset]')].map(el=>({
    tag:el.tagName,id:el.id||null,name:el.getAttribute('name'),asset:el.getAttribute('asset'),
    parent:el.closest('pc-model[data-route]')?.getAttribute('data-route')||'bootstrap',
    connected:el.isConnected,readyState:el.readyState||null,
    content:!!el.contentEntity,resource:!!el.resource
   })));
   console.log('MOBILE_ASSET_DIAGNOSTIC',JSON.stringify(pending));
   console.log('MOBILE_ASSET_ERRORS',JSON.stringify(await page.evaluate(()=>window.__genesisRouteAssetErrors||[])));
  }
  fs.mkdirSync('/tmp/genesis-mobile-boot',{recursive:true});
  await page.screenshot({path:'/tmp/genesis-mobile-boot/iphone-landscape-boot.png',timeout:15000}).catch(e=>console.log('MOBILE_SCREENSHOT_ERROR',e.message));
  assert.equal(result.door?.phase,'mobile-fallback','Mobile must avoid expensive Arcane V027 door: '+JSON.stringify(result.door));
  assert(!result.failed,'Mobile loading failed: '+JSON.stringify(result));
  assert.equal(result.intro,'grid','Mobile intro never opened: '+JSON.stringify(result));
  console.log('MOBILE_INTRO_READY',JSON.stringify(result));
  const startingUrl=page.url();
  await page.locator('[data-profession="Herrero"]').click({timeout:15000});
  console.log('MOBILE_HERRERO_SELECTED');
  for(let i=0;i<30;i++){
   await page.waitForTimeout(10000);
   const now=await state();
   console.log('MOBILE_HERRERO_PROGRESS',JSON.stringify(now));
   if(now.failed||await page.evaluate(()=>document.querySelector('#loading')?.style.display==='none'))break;
  }
  const after=await state();
  await page.screenshot({path:'/tmp/genesis-mobile-boot/iphone-after-herrero.png',timeout:15000}).catch(e=>console.log('MOBILE_SCREENSHOT_ERROR',e.message));
  assert.equal(page.url(),startingUrl,'Mobile page navigated/reloaded after choosing Herrero');
  assert(!after.failed,'Mobile Herrero route failed: '+JSON.stringify(after));
  assert.equal(await page.evaluate(()=>document.querySelector('#loading')?.style.display),'none','Herrero did not enter the game: '+JSON.stringify(after));
  console.log('PASS: Mobile WebKit fully entered Herrero world');
 }finally{await browser.close()}
})().catch(e=>{console.error('MOBILE_BOOT_FAIL',e);process.exitCode=1}).finally(()=>server.close());
