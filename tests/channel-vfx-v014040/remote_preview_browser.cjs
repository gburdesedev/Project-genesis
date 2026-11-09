const{chromium}=require('playwright'),fs=require('fs');
(async()=>{
 const dir='vfx-v014040-remote-smoke';fs.mkdirSync(dir,{recursive:true});
 const url='https://raw.githack.com/gburdesedev/Project-genesis/experiment/v014038-mercenario-canal-vfx-3d-20261108/index-v014040-channel-vfx-experimental.html?genesisChannelVfx=1';
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 const log={url,mainUnchanged:true,console:[],failedRequests:[],pageErrors:[]};
 page.on('pageerror',e=>log.pageErrors.push(String(e).slice(0,300)));
 page.on('requestfailed',r=>log.failedRequests.push({url:r.url(),failure:r.failure()?.errorText}));
 page.on('console',m=>{if(m.type()==='error')log.console.push(m.text().slice(0,300))});
 const response=await page.goto(url,{timeout:100000,waitUntil:'domcontentloaded'});
 log.httpStatus=response?.status();
 await page.waitForTimeout(10000);
 log.state=await page.evaluate(()=>({
  title:document.title,
  vfx:window.GenesisChannelVFX?.status?.()||null,
  appExists:!!document.getElementById('genesisApp'),
  preflight:window.__genesisBoot||null,
  loadScreen:document.getElementById('loading')?.textContent?.slice(0,250)||null,
  introduced:!!document.getElementById('prototypeIntro'),
  scripts:[...document.scripts].filter(s=>s.src.includes('genesis_channel_vfx')).map(s=>s.src)
 }));
 await page.screenshot({path:dir+'/remote-preview.png',timeout:120000,animations:'disabled'});
 fs.writeFileSync(dir+'/audit.json',JSON.stringify(log,null,2));
 console.log('GENESIS_REMOTE_SMOKE',JSON.stringify(log).slice(0,8500));
 await browser.close();
 if(log.httpStatus!==200)throw Error('PREVIEW_HTTP_NOT_200');
 if(!log.state?.vfx?.featureFlagRequired||!log.state.vfx || log.state.vfx.status==='failed-legacy-fallback')
  throw Error('VFX_MANAGER_MISSING_IN_REMOTE_PLAYABLE_PREVIEW');
 if(log.pageErrors.length>0)throw Error('PAGE_CRASH_OR_MISSING_DEPENDENCY '+JSON.stringify(log.pageErrors.slice(0,3)));
 console.log('GENESIS_REMOTE_PLAYABLE_PREVIEW_PASSED');
})().catch(e=>{console.error('GENESIS_REMOTE_PLAYABLE_PREVIEW_FAILED',e.stack||e);process.exit(1)});
