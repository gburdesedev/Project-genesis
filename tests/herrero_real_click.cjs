'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const mode=process.env.TEST_BROWSER||'chromium';
const source=process.env.TEST_URL||'https://gburdesedev.github.io/Project-genesis/';
const url=source+(source.includes('?')?'&':'?')+'diag_nocache=20261108_main_381e1b5';
const dir=path.resolve(process.env.GITHUB_WORKSPACE||'.','previews','herrero-real-click',mode);
fs.mkdirSync(dir,{recursive:true});
const report={mode,url,started:new Date().toISOString(),samples:[],events:[],errors:[]};
const t0=Date.now(),elapsed=()=>+( (Date.now()-t0)/1000).toFixed(1);
function record(type,value){const r={elapsed:elapsed(),type,value};report.events.push(r);console.log('HERRERO_CLICK_PROBE',JSON.stringify(r).slice(0,2500))}
let browser,page,context;
async function screenshot(label){try{await page.screenshot({path:path.join(dir,label+'.png'),timeout:12000,animations:'disabled'});record('screenshot',label)}catch(e){record('screenshot_failed',String(e).slice(0,300))}}
async function state(label){
 const s=await page.evaluate(()=>{
  const by=id=>document.getElementById(id),text=(q)=>document.querySelector(q)?.textContent?.trim().slice(0,160)||'';
  const shown=(el)=>!!el&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0;
  const button=document.querySelector('[data-profession="Herrero"]'),r=button?.getBoundingClientRect(),cx=r?r.left+r.width/2:0,cy=r?r.top+r.height/2:0,target=document.elementFromPoint(cx,cy);
  const progress=Object.values(window.__genesisAssetProgress||{}),failure=progress.filter(x=>!['listo','ready'].includes(x.phase));
  return {
   ready:document.readyState,
   href:location.href,
   visible:{loading:shown(by('loading')),intro:shown(by('prototypeIntro')),hud:shown(by('hud')),chip:shown(by('professionChip'))},
   button:{exists:!!button,disabled:button?.disabled,style:button?{display:getComputedStyle(button).display,visibility:getComputedStyle(button).visibility,pointerEvents:getComputedStyle(button).pointerEvents}:null,rect:r?{x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)}:null,target:{tag:target?.tagName,id:target?.id,class:String(target?.className||'').slice(0,120),isInsideButton:!!button?.contains(target),outerHTML:target?.outerHTML.slice(0,160)}},
   stage:text('#loadState'),detail:text('#loadDetail'),count:text('#loadCount'),percent:text('#loadPercent'),quest:text('#quest h2'),chip:text('#professionChip'),
   boot:window.__genesisBoot,device:window.GenesisDevice?{safePreviews:window.GenesisDevice.safePreviews,profile:window.GenesisDevice.profile}:null,
   routeErrors:window.__genesisRouteAssetErrors?.slice(-5)||[],
   progress:{total:progress.length,complete:progress.length-failure.length,pending:failure.slice(0,5)},
   diag:window.GenesisAssetDiag?.snapshot?.()?.errors?.slice(-5)||[],trackedClicks:window.__GENESIS_PROBE_CLICKS||[],navigator:navigator.userAgent.slice(0,180)
  };
 }).catch(e=>({evaluateError:String(e)}));
 const sample={elapsed:elapsed(),label,...s};report.samples.push(sample);record('state',{label,t:sample.elapsed,visible:sample.visible,button:sample.button,stage:sample.stage,count:sample.count,detail:sample.detail,quest:sample.quest,chip:sample.chip,progress:sample.progress,trackedClicks:sample.trackedClicks?.length});return s;
}
(async()=>{
 browser=await chromium.launch(mode==='edge'?{channel:'msedge',headless:true,args:['--disable-gpu-sandbox','--disable-dev-shm-usage']}:{headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 context=await browser.newContext({viewport:{width:1365,height:768},deviceScaleFactor:1,serviceWorkers:'block',ignoreHTTPSErrors:true});
 page=await context.newPage();
 page.setDefaultTimeout(12000);
 await page.addInitScript(()=>{window.__GENESIS_PROBE_CLICKS=[];document.addEventListener('click',event=>{if(event.target.closest?.('[data-profession]'))window.__GENESIS_PROBE_CLICKS.push({target:event.target.tagName,at:performance.now(),prof:event.target.closest('[data-profession]').dataset.profession})},true)});
 page.on('console',m=>{if(['error','warning'].includes(m.type())){const msg=m.text().slice(0,600);report.errors.push({type:m.type(),message:msg});record('console_error',msg)}});
 page.on('pageerror',e=>{const msg=String(e.stack||e).slice(0,1500);report.errors.push({type:'pageerror',message:msg});record('pageerror',msg)});
 page.on('requestfailed',r=>{const d={url:r.url().slice(0,260),reason:r.failure()?.errorText};report.errors.push({type:'requestfailed',...d});record('failed_request',d)});
 page.on('response',r=>{if(r.status()>=400){const d={url:r.url().slice(0,260),status:r.status()};report.errors.push({type:'http',...d});record('http_error',d)}});
 page.on('crash',()=>record('crash','browser page crash'));
 page.on('framenavigated',f=>{if(f===page.mainFrame())record('navigation',f.url())});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:100000});
 let intro=false;
 for(let i=0;i<80;i++){
   const s=await state('pre'+i);
   if(s.visible?.intro){intro=true;break}
   if(s.diag?.length||s.routeErrors?.length)record('boot_diagnostic',s.diag||s.routeErrors);
   if(s.visible?.loading===false&&i>2)record('unusual_no_intro',s);
   await page.waitForTimeout(4000);
 }
 await screenshot('01-before-click');
 if(!intro){report.result='INTRO_NOT_READY';return}
 const button=page.locator('[data-profession="Herrero"]').first();
 const info=await state('before-real-click');
 if(info.button?.disabled){report.result='HERRERO_DISABLED';return}
 try{
   await button.click({timeout:30000});
   record('click_attempt','NORMAL_CLICK_COMPLETED');
 }catch(e){record('click_exception',String(e.stack||e).slice(0,1400));report.result='CLICK_BLOCKED';return}
 await screenshot('02-after-real-click');
 for(let i=0;i<12;i++){
   const s=await state('after'+i);
   if(s.visible?.chip&&!s.visible?.intro&&!!s.quest){report.result='PASS_GAME_ENTERED';break}
   if(s.visible?.intro&&i>3){report.result='INTRO_STILL_VISIBLE';break}
   await page.waitForTimeout(2000);
 }
 if(!report.result)report.result='CLICK_NO_GAME';
 await screenshot('03-final');
})().catch(e=>{report.result='EXCEPTION';report.exception=String(e.stack||e);record('exception',report.exception.slice(0,1800))}).finally(async()=>{
 report.finished=new Date().toISOString();report.duration=elapsed();
 fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));
 console.log('HERRERO_REAL_CLICK_RESULT',JSON.stringify({mode,result:report.result,elapsed:report.duration,last:report.samples.at(-1),errors:report.errors.slice(-5)}).slice(0,5000));
 try{await page?.close()}catch{}try{await context?.close()}catch{}try{await browser?.close()}catch{}
 if(report.result!=='PASS_GAME_ENTERED')process.exitCode=1;
});
