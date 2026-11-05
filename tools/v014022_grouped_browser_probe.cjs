const {chromium}=require('playwright');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const out='previews/legacy-v014022-grouped-probe';
fs.mkdirSync(out,{recursive:true});
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await sleep(1200);
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 const errors=[],failedRequests=[],samples=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 const capture=async at=>{
  const state=await page.evaluate(()=>{
   const g=window.GenesisStreamLoader?.snapshot?.();
   return {
    phase:document.getElementById('loadState')?.textContent,
    detail:document.getElementById('loadDetail')?.textContent,
    count:document.getElementById('loadCount')?.textContent,
    percent:document.getElementById('loadPercent')?.textContent,
    groups:[...document.querySelectorAll('#loadGroups>.loadGroup')].map(x=>({label:x.textContent.trim(),state:x.dataset.state})),
    intro:getComputedStyle(document.getElementById('prototypeIntro')).display,
    loading:getComputedStyle(document.getElementById('loading')).display,
    tree:window.__genesisTreeStatus||null,
    active:g?.active,queued:g?.queued,
    recentAssets:g?.assets?.slice(-12).map(x=>({url:x.url.split('/').pop(),state:x.state,error:x.error,received:x.received}))
   };
  }).catch(e=>({evalError:e.message}));
  samples.push({seconds:at,state});
  console.log('GROUPED PROBE',at,JSON.stringify(state).slice(0,3000));
  return state;
 };
 try{
  await page.goto('http://127.0.0.1:8765/index.html?qa=grouped',{waitUntil:'domcontentloaded',timeout:40000});
  await page.waitForFunction(()=>!!window.GenesisStreamLoader&&document.querySelectorAll('#loadGroups>.loadGroup').length===8,null,{timeout:25000});
  await capture(0);
  for(let i=1;i<=10;i++){await sleep(12000);await capture(i*12)}
  const visible=await page.locator('#prototypeIntro').isVisible();
  if(visible){
    await page.locator('[data-profession="Herrero"]').click({timeout:10000,force:true});
    for(let i=1;i<=4;i++){await sleep(12000);await capture(120+i*12)}
  }
  await page.screenshot({path:out+'/last.png',timeout:10000,animations:'disabled'}).catch(()=>{});
 }catch(e){errors.push('PROBE: '+e.stack)}
 finally{
  fs.writeFileSync(out+'/report.json',JSON.stringify({samples,errors,failedRequests:failedRequests.slice(-100)},null,2));
  await browser.close();
  server.kill('SIGTERM');
 }
 if(!samples.some(x=>x.state?.groups?.length===8))process.exitCode=1;
 // Mark an incomplete boot as a real failure rather than calling UI visibility a pass.
 if(!samples.some(x=>x.state?.intro&&x.state.intro!=='none'))process.exitCode=1;
 if(errors.some(x=>x.startsWith('PROBE:')))process.exitCode=1;
})().catch(e=>{console.error(e);server.kill('SIGTERM');process.exitCode=1});
