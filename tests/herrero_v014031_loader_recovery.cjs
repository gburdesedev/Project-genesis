'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve('previews/herrero-recovery-live');
fs.mkdirSync(out,{recursive:true});
const report={started:new Date().toISOString(),events:[],errors:[],states:[],result:'STARTING'};
const log=(kind,data)=>{report.events.push({kind,t:Date.now(),data});console.log('STAGED_HERRERO',JSON.stringify({kind,data}).slice(0,2500));};
(async()=>{
 const browser=await chromium.launch(process.env.TEST_CHANNEL==='msedge'?{channel:'msedge',headless:true}:{headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,serviceWorkers:'block',ignoreHTTPSErrors:true});
  const page=await context.newPage();
  page.on('pageerror',e=>{let msg=String(e.stack||e);report.errors.push(msg);log('pageerror',msg.slice(0,1100))});
  page.on('console',m=>{if(m.type()==='error'){let msg=m.text();report.errors.push(msg);log('console-error',msg.slice(0,700))}});
  page.on('requestfailed',r=>log('requestfailed',{url:r.url().slice(0,210),message:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)log('http-error',{status:r.status(),url:r.url().slice(0,210)})});
  const url='https://gburdesedev.github.io/Project-genesis/';
  const html=fs.readFileSync('index.html','utf8');
  if(!html.includes("setLoadUI(100,'Núcleo listo'")||html.includes("await prepareRoute('Herrero');routeLoading=false;"))throw Error('Patch not applied before QA');
  await page.route(url,async route=>{
   const response=await route.fetch();
   await route.fulfill({response,body:html});
   log('patched-dom-served',{bytes:html.length,contentIsLocalBranch:true,assetsStillFromPages:true});
  });
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  const state=()=>page.evaluate(()=>{
   const el=id=>document.getElementById(id);
   const shown=e=>!!e&&e.style.display!=='none'&&getComputedStyle(e).display!=='none';
   const progress=Object.values(window.__genesisAssetProgress||{});
   return {loading:shown(el('loading')),intro:shown(el('prototypeIntro')),chip:shown(el('professionChip')),gameTitle:document.querySelector('#quest h2')?.textContent?.trim().slice(0,140),status:el('loadState')?.textContent?.trim(),detail:el('loadDetail')?.textContent?.trim(),count:el('loadCount')?.textContent?.trim(),failed:!!document.querySelector('.loadingCard.failed'),buttonDisabled:document.querySelector('[data-profession="Herrero"]')?.disabled,models:progress.length,ready:progress.filter(x=>x.phase==='listo').length,errors:window.__genesisRouteAssetErrors?.slice(-3)};
  });
  let ready=false;for(let i=0;i<40;i++){const s=await state();report.states.push({phase:'initial',i,...s});if(i%5===0)log('initial',s);if(s.intro&&!s.loading){ready=true;break}await page.waitForTimeout(2000)}
  if(!ready)throw Error('Selector de profesión no apareció antes de cargar los 24 GLB: '+JSON.stringify(report.states.at(-1)));
  const first=report.states.at(-1);if(first.status!=='Núcleo listo')throw Error('Stage-1 status wrong: '+first.status);
  log('SELECTOR_READY',{count:first.count,state:first.status});
  await page.screenshot({path:path.join(out,'01-profession-ready.png'),timeout:15000}).catch(e=>log('screenshot-failed',e.message));
  await page.locator('[data-profession="Herrero"]').click({timeout:20000});
  log('HERRERO_CLICKED_NORMAL',true);
  let entered=false;
  for(let i=0;i<155;i++){const s=await state();report.states.push({phase:'route',i,...s});if(i%5===0)log('route',s);if(s.chip&&!s.intro&&!s.loading&&s.gameTitle&&!/iniciá como herrero/i.test(s.gameTitle)){entered=true;break}await page.waitForTimeout(2000)}
  if(!entered)throw Error('Route did not complete: '+JSON.stringify(report.states.at(-1)));
  const last=report.states.at(-1);log('ENTERED_GAME',{quest:last.gameTitle,stage:last.status,ready:last.ready,models:last.models});
  await page.screenshot({path:path.join(out,'02-herrero-entered.png'),timeout:15000}).catch(e=>log('screenshot-failed',e.message));
  if(last.ready!==last.models)throw Error('Route gameplay started with outstanding model states: '+JSON.stringify(last));
  report.result='PASS';
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{report.result='FAIL';report.exception=String(e.stack||e);log('exception',report.exception)}).finally(()=>{
 report.finished=new Date().toISOString();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 console.log('GENESIS_STAGED_BOOT_RESULT',JSON.stringify({result:report.result,last:report.states.at(-1),exception:report.exception?.slice(0,1500)}));
 if(report.result!=='PASS')process.exitCode=1;
});
