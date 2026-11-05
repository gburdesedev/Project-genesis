/* Project Genesis V0.14.022 · isolated browser smoke, not an artistic approval.
 * Exercises only the archived game in this branch. Never writes to main.
 */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs');
const {spawn}=require('node:child_process');
const out='previews/legacy-v014022-browser-qa';
fs.mkdirSync(out,{recursive:true});
const log=[];const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
server.stderr.on('data',chunk=>log.push({server:String(chunk).slice(0,700)}));
const origin='http://127.0.0.1:8765/';
async function run(engine,name,mobile){
 const browser=await engine.launch({headless:true,args:engine===chromium?['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']:[]});
 const context=await browser.newContext(mobile?{viewport:{width:844,height:390},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'}:{viewport:{width:1366,height:768}});
 const page=await context.newPage(),errors=[],network=[],navigation=[];
 page.on('pageerror',e=>errors.push('PAGE '+e.message));
 page.on('console',e=>{if(e.type()==='error')errors.push('CONSOLE '+e.text().slice(0,300))});
 page.on('requestfailed',req=>network.push({url:req.url(),err:req.failure()?.errorText}));
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigation.push({at:Date.now(),url:frame.url()})});
 let result={engine:name,mobile,start:Date.now(),intro:false,selected:false,gameEntered:false,diagnostic:false,navigation:[],errors:[],network:[]};
 try{
  await page.goto(origin+'index.html?genesis_qa=v014022',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>Boolean(window.GenesisAssetDiag),null,{timeout:15000});
  result.diagnostic=true;
  await page.waitForFunction(()=>{
    const intro=document.getElementById('prototypeIntro');
    const loading=document.getElementById('loading');
    return intro?.style.display==='grid'||intro?.style.display==='flex'||loading?.style.display==='none';
  },null,{timeout:180000}).catch(()=>null);
  result.intro=await page.locator('#prototypeIntro').evaluate(el=>getComputedStyle(el).display!=='none').catch(()=>false);
  result.before=await page.evaluate(()=>({stage:document.getElementById('loadState')?.textContent,loader:document.getElementById('loadCount')?.textContent,diagnostics:window.GenesisAssetDiag?.snapshot?.()}));
  await page.screenshot({path:out+'/'+name+'-before.png',fullPage:false,timeout:10000}).catch(e=>errors.push('SCREENSHOT before '+e.message));
  if(result.intro){
   const selector=page.locator('[data-profession="Herrero"]');
   await selector.click({timeout:15000});
   result.selected=true;
   await page.waitForFunction(()=>document.getElementById('loading')?.style.display==='none' && document.getElementById('hud')!=null,null,{timeout:180000}).catch(()=>null);
   result.gameEntered=await page.locator('#loading').evaluate(el=>getComputedStyle(el).display==='none').catch(()=>false);
   result.after=await page.evaluate(()=>({stage:document.getElementById('loadState')?.textContent,loader:document.getElementById('loadCount')?.textContent,diagnostics:window.GenesisAssetDiag?.snapshot?.()}));
   await page.screenshot({path:out+'/'+name+'-after.png',fullPage:false,timeout:10000}).catch(e=>errors.push('SCREENSHOT after '+e.message));
  }
 }catch(e){result.testError=e.stack||String(e)}
 finally{
  result.navigation=navigation;result.errors=errors.slice(-30);result.network=network.slice(-50);
  result.durationSeconds=Math.round((Date.now()-result.start)/1000);
  fs.writeFileSync(out+'/'+name+'.json',JSON.stringify(result,null,2));
  await browser.close();
 }
 return result;
}
(async()=>{
 await sleep(2500);
 const results=[];
 try{
 try{results.push(await run(chromium,'chromium-desktop',false));}
 catch(e){results.push({engine:'chromium-desktop',testError:String(e)})}
 try{results.push(await run(webkit,'webkit-mobile',true));}
 catch(e){results.push({engine:'webkit-mobile',testError:String(e)})}
 fs.writeFileSync(out+'/summary.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results.map(r=>({engine:r.engine,diagnostic:r.diagnostic,intro:r.intro,selected:r.selected,gameEntered:r.gameEntered,durationSeconds:r.durationSeconds,testError:r.testError,navCount:r.navigation?.length})),null,2));
 if(results.some(r=>r.testError||!r.diagnostic||!r.intro||!r.selected||!r.gameEntered))process.exitCode=1;
 }finally{server.kill('SIGTERM')}
})().catch(e=>{console.error(e);server.kill('SIGTERM');process.exitCode=1;});
