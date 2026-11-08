'use strict';
const { chromium } = require('playwright');
const fs=require('fs'),path=require('path');
const mode=process.env.GENESIS_MODE||'desktop';
const url=process.env.GENESIS_URL||'https://gburdesedev.github.io/Project-genesis/';
const dir='/tmp/genesis-herrero-boot-'+mode;
fs.mkdirSync(dir,{recursive:true});
const out={mode,url,started:new Date().toISOString(),events:[],snapshots:[],errors:[],result:'RUNNING'};
const start=Date.now(),t=()=>Math.round((Date.now()-start)/1000);
const log=(type,data)=>{let obj={s:t(),type,data};out.events.push(obj);console.log('GENESIS_HERRERO_DIAG',JSON.stringify(obj).slice(0,2300));};
let browser,ctx,page;
const shot=async name=>{try{await page.screenshot({path:path.join(dir,name+'.png'),animations:'disabled',timeout:9000})}catch(e){log('screenshot-fail',String(e).slice(0,200))}};
async function snapshot(label){let data;try{data=await page.evaluate(()=>{
 const q=id=>document.getElementById(id),txt=id=>q(id)?.textContent?.trim().slice(0,450)||'',shown=id=>{let e=q(id);if(!e)return false;let st=getComputedStyle(e);return st.display!=='none'&&st.visibility!=='hidden'&&e.getBoundingClientRect().width>0};
 const prog=Object.values(window.__genesisAssetProgress||{});
 const missing=prog.filter(x=>x.phase!=='listo');
 const diag=window.GenesisAssetDiag?.snapshot?.();
 const modelCounts=[...document.querySelectorAll('pc-model[data-route="Herrero"],pc-model[data-route="SharedMercenary"]')].filter(x=>x.dataset.asset);
 return {url:location.href,ready:document.readyState,visible:{intro:shown('prototypeIntro'),loading:shown('loading'),hud:shown('hud'),failed:!!document.querySelector('.loadingCard.failed')},state:txt('loadState'),detail:txt('loadDetail'),count:txt('loadCount'),percent:txt('loadPercent'),quest:txt('questTitle'),boot:window.__genesisBoot,routeErrors:(window.__genesisRouteAssetErrors||[]).slice(-12),assetProgress:{total:prog.length,complete:prog.filter(x=>x.phase==='listo').length,pending:missing.slice(0,15)},modelCounts:{total:modelCounts.length,ready:modelCounts.filter(x=>!!x.contentEntity).length},diagErrors:diag?.errors?.slice(-10)||[],lastNav:performance.getEntriesByType('navigation').map(x=>({type:x.type,duration:Math.round(x.duration)}))};
 });}catch(e){data={evaluateError:String(e)}}const record={s:t(),label,...data};out.snapshots.push(record);log('snapshot',{label,s:record.s,visible:data.visible,state:data.state,detail:data.detail,count:data.count,percent:data.percent,models:data.modelCounts,assets:data.assetProgress,errors:data.routeErrors?.slice(-3)});return data;}
(async()=>{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const mobile=mode==='mobile';
 ctx=await browser.newContext({viewport:mobile?{width:854,height:393}:{width:1440,height:900},deviceScaleFactor:1,ignoreHTTPSErrors:true,serviceWorkers:'block',isMobile:mobile,hasTouch:mobile});
 page=await ctx.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>{const msg=String(e.stack||e).slice(0,850);out.errors.push({type:'pageerror',message:msg});log('pageerror',msg)});
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning'){let msg=m.text().slice(0,650);out.errors.push({type:m.type(),message:msg});log('console',msg)}});
 page.on('requestfailed',r=>{let obj={url:r.url().slice(0,220),error:r.failure()?.errorText};out.errors.push({type:'requestfailed',...obj});log('requestfailed',obj)});
 page.on('response',r=>{if(r.status()>=400){let obj={status:r.status(),url:r.url().slice(0,220)};out.errors.push({type:'http',...obj});log('http-error',obj)}});
 page.on('crash',()=>{out.errors.push({type:'crash'});log('crash','Renderer crashed')});
 page.on('framenavigated',f=>{if(f===page.mainFrame())log('navigation',f.url())});
 if(process.env.GENESIS_PATCH_BOOT==='1') {
  await page.route('https://gburdesedev.github.io/Project-genesis/',async route=>{
   const response=await route.fetch();
   const original=await response.text();
   const old="await prepareRoute('Herrero');setLoadUI(100,'Juego completo listo'";
   const patched="await prepareRoute('Herrero');routeLoading=false;setLoadUI(100,'Juego completo listo'";
   if(original.split(old).length!==2)throw Error('Live HTML did not match expected preboot guard');
   await route.fulfill({response,body:original.replace(old,patched)});
   log('patched-live-html',{bytes:original.length,changedOnly:'routeLoading=false after preboot'});
  });
 }
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:100000});
 let intro=false;
 for(let i=0;i<55;i++){
  let x=await snapshot('pre-'+i);
  if(x.visible?.intro){intro=true;break}
  if(x.visible?.failed){out.result='BOOT_FAILED';break}
  await page.waitForTimeout(5000);
 }
 await shot('01-before-herrero');
 if(!intro){out.result=out.result==='BOOT_FAILED'?out.result:'INTRO_TIMEOUT';return}
 const button=page.locator('[data-profession="Herrero"]').first();
 if(!await button.count()){out.result='NO_HERRERO_BUTTON';return}
 await button.click({force:true,timeout:15000});log('selected','Herrero');
 await shot('02-after-click');
 for(let i=0;i<40;i++){
  let x=await snapshot('route-'+i);
  if(x.visible?.failed){out.result='ROUTE_FAILED';break}
  if(!x.visible?.loading&&!x.visible?.intro&&x.quest){out.result='GAME_ENTERED';break}
  if(i===39)out.result='ROUTE_STALLED';
  await page.waitForTimeout(5000);
 }
 await shot('03-final');
})().catch(e=>{out.result='TEST_EXCEPTION';out.exception=String(e.stack||e);log('exception',out.exception.slice(0,1500))}).finally(async()=>{
 out.finished=new Date().toISOString();out.elapsed=t();
 fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(out,null,2));
 console.log('GENESIS_HERRERO_RESULT',JSON.stringify({mode,result:out.result,elapsed:out.elapsed,last:out.snapshots.at(-1),errors:out.errors.slice(-12)}).slice(0,4500));
 try{await ctx?.close()}catch{}try{await browser?.close()}catch{}
 if(out.result!=='GAME_ENTERED')process.exitCode=2;
});
