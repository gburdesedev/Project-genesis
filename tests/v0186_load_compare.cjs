'use strict';
/* Isolated browser diagnostic: reads the deployed V0186 and V0186.1; does not
 * change either preview, its loader, its GLBs or the approved main gameplay. */
const { webkit, chromium, devices } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const root = 'https://gburdesedev.github.io/Project-genesis/';
const outDir = process.env.DIAGNOSTICS_DIR || '/tmp/genesis-v0186-compare';
fs.mkdirSync(outDir, { recursive: true });
const overall = [];

function clip(x,n=700) { return String(x??'').slice(0,n); }
async function sample(page, version, elapsed) {
  try {
    return await page.evaluate(({ version, elapsed }) => {
      const txt=id=>document.getElementById(id)?.textContent?.trim().slice(0,1000)||'';
      const visible=id=>{const e=document.getElementById(id);if(!e)return false;const r=e.getBoundingClientRect();const s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
      let audit=null;try { audit=window.__GENESIS_V011_AUDIT__?.(); } catch(e) { audit={error:String(e)}; }
      const assets=[...document.querySelectorAll('#rows .asset')].map(x=>({name:x.querySelector('.asset-name')?.textContent, status:x.querySelector('.asset-state')?.textContent,meta:x.querySelector('.meta')?.textContent}));
      const stages=[...document.querySelectorAll('#stages .stage')].map(x=>x.textContent.trim().replace(/\s+/g,' ').slice(0,180));
      const gate=document.getElementById('v011-pause');
      return {version,elapsed,at:new Date().toISOString(),url:location.href,attempts:sessionStorage.getItem('__genesis_qa_nav_attempts'),readyState:document.readyState,visible:{start:visible('start-screen'),loader:visible('ui'),pause:visible('v011-pause'),canvas:visible('app'),hud:visible('hud')},bodyClass:document.body.className,status:txt('status'),startStatus:txt('start-status'),counts:txt('counts'),pause:gate?.textContent?.slice(0,1600)||'',assets,stages,resources:performance.getEntriesByType('resource').length,audit};
    },{version,elapsed});
  } catch(e) {return {version,elapsed,error:'page.evaluate failed: '+String(e)};}
}
async function one(version, engine, deviceName) {
  const id = version.replace(/[^a-z0-9]/ig,'-')+'-'+engine;
  const events=[],samples=[];
  let browser,context,page,crashed=false;
  const started=Date.now();
  let fatal=null;
  try {
    browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
    context=await browser.newContext({...devices[deviceName],ignoreHTTPSErrors:true});
    await context.addInitScript(()=>{try{let k='__genesis_qa_nav_attempts';sessionStorage.setItem(k,String((Number(sessionStorage.getItem(k))||0)+1));}catch(e){}});
    page=await context.newPage();
    page.setDefaultTimeout(25000);
    const evt=(name,detail)=>{events.push({seconds:Math.round((Date.now()-started)/1000),name,detail:clip(detail,1500)});if(['crash','pageerror','requestfailed','http','navigated'].includes(name))console.log('BOOT_EVENT',id,name,clip(detail,450));};
    page.on('crash',()=>{crashed=true;evt('crash','Browser renderer process crashed')});
    page.on('pageerror',e=>evt('pageerror',e.stack||String(e)));
    page.on('console',m=>{if(['error','warning'].includes(m.type()))evt('console-'+m.type(),m.text());});
    page.on('requestfailed',r=>evt('requestfailed',r.url()+' '+(r.failure()?.errorText||'')));
    page.on('response',r=>{if(r.status()>=400)evt('http',r.status()+' '+r.url());});
    page.on('framenavigated',f=>{if(f===page.mainFrame())evt('navigated',f.url())});
    page.on('close',()=>evt('closed','page closed'));
    const url=new URL(version+'/',root).href;
    console.log('BOOT_BEGIN',JSON.stringify({id,url,deviceName}));
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:90000});
    let before=await sample(page,version,0);
    samples.push(before);
    const button=page.locator('#start-blacksmith');
    if(!(await button.count())) throw new Error('#start-blacksmith absent');
    await button.click({timeout:30000});
    console.log('BOOT_STARTED',id);
    for(let i=0;i<17;i++) {
      await page.waitForTimeout(10000);
      const snap=await sample(page,version,Math.round((Date.now()-started)/1000));
      samples.push(snap);
      console.log('BOOT_PROGRESS',JSON.stringify({id,seconds:snap.elapsed,attempts:snap.attempts,counts:snap.counts,status:snap.status,pause:snap.pause.slice(0,155),stageLast:snap.stages?.slice(-3),errors:snap.assets?.filter(x=>/error/i.test(x.status||'')),audit:snap.audit?.version}));
      if(crashed || (snap.attempts && Number(snap.attempts)>1))break;
      if(snap.pause.includes('Carga finalizada')) {
        console.log('BOOT_PAUSED_AT_FINAL',id);
        const resume=page.locator('#v011-pause button').first();
        if(await resume.count()) {
          await resume.click({timeout:12000});
          await page.waitForTimeout(6000);
          samples.push(await sample(page,version,Math.round((Date.now()-started)/1000)));
          console.log('BOOT_CONTINUED',JSON.stringify({id,status:samples.at(-1).status,visible:samples.at(-1).visible,bodyClass:samples.at(-1).bodyClass,intro:samples.at(-1).audit?.intro}));
          for(let j=0;j<10;j++) {
            if(!samples.at(-1).bodyClass?.includes('genesis-v016-cinematic')) break;
            await page.waitForTimeout(5000);
            const continuation=await sample(page,version,Math.round((Date.now()-started)/1000));
            samples.push(continuation);
            console.log('BOOT_CINEMATIC',JSON.stringify({id,seconds:continuation.elapsed,bodyClass:continuation.bodyClass,visible:continuation.visible,intro:continuation.audit?.intro,rigs:continuation.audit?.rigs?.artisan?.position,paused:continuation.audit?.paused}));
          }
          if(samples.at(-1).bodyClass?.includes('genesis-v016-cinematic'))events.push({name:'cinematic-stall',detail:'Intro remains active after 50s following resume'});
        }
        break;
      }
      if(snap.pause.includes('Carga incompleta') || snap.pause.includes('Error al cargar') || snap.pause.includes('Error de animaciones') || snap.pause.includes('Error JavaScript') || snap.pause.includes('Promesa rechazada'))break;
    }
  } catch(e) {fatal=clip(e.stack||String(e),4000);console.log('BOOT_FAILURE',id,fatal);}
  if(page && !page.isClosed()) {
    try{await page.screenshot({path:path.join(outDir,id+'.png'),fullPage:true,timeout:15000});}catch(e){events.push({name:'screenshot-failed',detail:String(e)})}
    if(samples.length===0) samples.push(await sample(page,version,Math.round((Date.now()-started)/1000)));
  }
  const final=samples.at(-1)||{};
  const record={id,version,engine,deviceName,seconds:Math.round((Date.now()-started)/1000),fatal,crashed,events,samples,final};
  fs.writeFileSync(path.join(outDir,id+'.json'),JSON.stringify(record,null,2));
  console.log('BOOT_RESULT',JSON.stringify({id,seconds:record.seconds,fatal,crashed,attempts:final.attempts,counts:final.counts,pause:final.pause?.slice(0,320),status:final.status,visible:final.visible,assets:final.assets?.filter(x=>/error/i.test(x.status||'')),errors:events.filter(x=>x.name==='pageerror'||x.name==='requestfailed'||x.name==='http').slice(0,10)}));
  overall.push(record);
  try {await context?.close()}catch{}
  try {await browser?.close()}catch{}
}
(async()=>{
  // Fresh browser contexts avoid cache/preloaded-resource bias. WebKit models
  // Safari on iPhone; an extra Chromium run can be enabled later if needed.
  await one('v0186','webkit','iPhone 13');
  await one('v0186-1','webkit','iPhone 13');
  const summary=overall.map(({id,seconds,crashed,fatal,final,events})=>({id,seconds,crashed,fatal,attempts:final.attempts,counts:final.counts,pause:final.pause?.slice(0,300),status:final.status,visible:final.visible,failures:events.filter(e=>e.name==='pageerror'||e.name==='requestfailed'||e.name==='http').slice(0,25)}));
  fs.writeFileSync(path.join(outDir,'summary.json'),JSON.stringify(summary,null,2));
  console.log('BOOT_COMPARISON',JSON.stringify(summary));
})().catch(e=>{console.error('BOOT_UNEXPECTED',e.stack||e);process.exitCode=1});
