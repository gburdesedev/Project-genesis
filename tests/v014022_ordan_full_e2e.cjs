'use strict';
/* Browser QA for V014022 as shipped: test input is real keyboard and buttons;
   a read-only probe is inserted into the test response to observe quest state.
   No quest flags, geometry, assets, save state or scene logic are changed. */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path');
const {spawn}=require('child_process');
const out='previews/v014022-ordan-playwright';
fs.mkdirSync(out,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const report={runAt:new Date().toISOString(),mode:'V014022 as shipped, read-only QA probe',events:[],states:[],errors:[],failedRequests:[],navigation:[],result:'NOT_RUN'};
function log(event,data){report.events.push({event,data});console.log('ORDAN_QA',event,JSON.stringify(data).slice(0,2000))}
async function main(){
 await delay(1100);
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(13000);
 page.on('pageerror',e=>{report.errors.push(String(e.stack||e));log('PAGE_ERROR',String(e).slice(0,500))});
 page.on('console',m=>{if(m.type()==='error'){report.errors.push(m.text().slice(0,600));log('CONSOLE_ERROR',m.text().slice(0,200))}});
 page.on('requestfailed',r=>{const x={url:r.url(),error:r.failure()?.errorText};report.failedRequests.push(x);if(report.failedRequests.length<15)log('REQUEST_FAILED',x)});
 page.on('crash',()=>{report.errors.push('browser crash');log('CRASH','Chromium renderer crashed')});
 page.on('framenavigated',f=>{if(f===page.mainFrame())report.navigation.push(f.url())});
 let inserted=false;
 await page.route('**/index.html*',async route=>{
  const response=await route.fetch();let body=await response.text();
  const marker='requestAnimationFrame(frame);\n\nsetLoadUI';
  const hook='requestAnimationFrame(frame);\nwindow.__ORDAN_QA_READONLY__=()=>({step:tutorialStep,started:gameStarted,profession:selectedProfession,player:{x:px,z:pz},quest:document.getElementById("questTitle")?.textContent,objective:objectiveTarget()?.pos||null,interactable:currentInteractable?.id||null,visibilityToObjective:tutorialStep===8?lineClearTo(objectiveTarget().pos):null,movementAllowed:gameStarted&&modalLayer.style.display!=="grid"&&intro.style.display!=="grid",crafted:craftedItems.map(x=>({recipe:x.recipe,name:x.name,rarity:x.rarity})),mercenaryState,mentorState:mentorFollowState,marketWaypoint:marketEscortWaypoint,modal:document.getElementById("modal")?.textContent?.slice(0,220)||""});\nsetLoadUI';
  if(body.includes(marker)){body=body.replace(marker,hook);inserted=true;}
  await route.fulfill({response,body,headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 async function snap(){
  return page.evaluate(()=>{
   const get=id=>document.getElementById(id);
   const display=id=>getComputedStyle(get(id)).display;
   const diag=window.GenesisAssetDiag?.snapshot?.();
   const streamer=window.GenesisStreamLoader?.snapshot?.();
   return {time:Date.now(),state:window.__ORDAN_QA_READONLY__?.()||null,
    loader:display('loading'),intro:display('prototypeIntro'),modal:display('modalLayer'),
    loadState:get('loadState')?.textContent,loadDetail:get('loadDetail')?.textContent,
    count:get('loadCount')?.textContent,loadingFailed:get('loading')?.className||'',
    assetErrors:diag?.errors?.slice(-8)||[],
    stream:streamer?{active:streamer.active,queued:streamer.queued,notReady:streamer.assets?.filter(a=>!/(listo|ready)/i.test(a.state||'')).slice(-12).map(a=>({url:a.url?.split('/').pop(),state:a.state,error:a.error,received:a.received}))}:null,
    modalButtons:[...document.querySelectorAll('#modalLayer button')].map(x=>({id:x.id,text:x.textContent.trim().slice(0,60)})).slice(0,14)};
  });
 }
 async function capture(stage){
  const x=await snap();report.states.push({stage,...x});
  log('SNAP',{stage,step:x.state?.step,quest:x.state?.quest,player:x.state?.player,objective:x.state?.objective,
   interactable:x.state?.interactable,loader:x.loader,intro:x.intro,loadState:x.loadState,detail:x.loadDetail,count:x.count,assetErrors:x.assetErrors,stream:x.stream,buttons:x.modalButtons});
  if(/^(intro|entered-game|final|exception|quest-(9|10|14|15|17|20|24)-)/.test(stage))try{await page.screenshot({path:path.join(out,String(report.states.length).padStart(2,'0')+'-'+stage.replace(/[^a-z0-9-]/gi,'-')+'.png'),animations:'disabled',timeout:3500})}catch(e){log('SCREENSHOT_FAILED',e.message.slice(0,150))}
  return x;
 }
 async function dialog(){
  if(await page.locator('#dialogNext').isVisible().catch(()=>false)){
   await page.locator('#dialogNext').click({force:true,timeout:8000});await delay(350);return true
  }return false;
 }
 async function approach(){
  for(let i=0;i<28;i++){
   const st=(await snap()).state;if(!st?.started)return {ok:false,why:'not started'};
   if(st.step===8){
     // A chest within range of the actual player should be activated by ordinary Q + E,
     // without teleporting the actor or changing quest flags.
     await page.keyboard.press('q'); await delay(300);
     const aligned=(await snap()).state;
     const chestDistance=aligned?.player&&aligned?.objective?Math.hypot(aligned.player.x-aligned.objective.x,aligned.player.z-aligned.objective.z):null;
     log('RELOCATED_CHEST_PROBE',{step:8,player:aligned?.player,goal:aligned?.objective,distance:chestDistance,interactable:aligned?.interactable,lineClear:aligned?.visibilityToObjective,movementAllowed:aligned?.movementAllowed});
     if(chestDistance!==null&&chestDistance<1.95){
       // Genuine player interaction. Never change quest state through JS.
       return {ok:true,id:aligned?.interactable||'chest-in-range',why:'chest within measured interaction range',distance:chestDistance,visible:aligned?.visibilityToObjective};
     }
   }
   if(st.interactable)return {ok:true,id:st.interactable};
   if(!st.objective)return {ok:false,why:'no objective'};
   const dist=Math.hypot(st.player.x-st.objective.x,st.player.z-st.objective.z);
   if(dist<1.35)return {ok:true,why:'close',dist};
   await page.keyboard.press('q');
   const old=st.player;
   await page.keyboard.down('w');await delay(430);await page.keyboard.up('w');
   const next=(await snap()).state;
   if(next?.player&&Math.hypot(next.player.x-old.x,next.player.z-old.z)<.02){return {ok:false,why:'blocked by collision',step:st.step,dist}}
  }return {ok:false,why:'movement budget'};
 }
 try{
  await page.goto('http://127.0.0.1:8765/index.html?qa=ordan-playwright',{waitUntil:'domcontentloaded',timeout:90000});
  log('PROBE',{inserted});
  for(let n=0;n<15;n++){const s=await snap();if(s.intro!=='none')break;await delay(8000);}
  const before=await capture('intro');
  if(before.intro==='none'){report.result='BLOCKED_BEFORE_INTRO';return}
  await page.locator('[data-profession="Herrero"]').click({force:true,timeout:15000});
  log('SELECTED','Herrero clicked');
  let entered=false;
  for(let i=0;i<17;i++){
   await delay(9000);
   const s=await snap();log('LOAD_SAMPLE',{seconds:(i+1)*9,step:s.state?.step,started:s.state?.started,loader:s.loader,detail:s.loadDetail,count:s.count,stream:s.stream});
   if(s.state?.started&&s.loader==='none'&&s.intro==='none'){entered=true;break}
   if(report.navigation.length>1){report.result='UNEXPECTED_RELOAD';break}
  }
  await capture(entered?'entered-game':'blocked-after-selection');
  if(!entered){if(report.result==='NOT_RUN')report.result='BLOCKED_AFTER_SELECTING_HERRERO';return}
  for(let i=0;i<24;i++){
   const s=await snap(),st=s.state;
   await capture('quest-'+String(st?.step)+'-'+i);
   if(!st?.started){report.result='GAME_STATE_LOST';break}
   if(st.step>=15){report.result='MERCENARY_REACHED';break}
   if(st.step===9){
    // Q9 requires an actual inventory open-and-close, not a direct quest mutation.
    await dialog();
    const before=await page.evaluate(()=>({modal:document.getElementById('modalLayer')?.style.display,inventoryTab:window.GenesisPreparation?.activeTab?.()}));
    await page.keyboard.press('Tab');await delay(700);
    const opened=await page.evaluate(()=>({modal:document.getElementById('modalLayer')?.style.display,inventoryTab:window.GenesisPreparation?.activeTab?.(),closeButtons:[...document.querySelectorAll('#prepClose,#inventoryClose')].map(e=>({id:e.id,visible:getComputedStyle(e).display!=='none'}))}));
    log('Q9_INVENTORY_OPEN',{before,opened});
    if(opened.inventoryTab!=='Inventario'&&!await page.locator('#inventoryClose').count()){
      report.result='INVENTORY_DID_NOT_OPEN';break;
    }
    const closeButton=page.locator('#prepClose:visible, #inventoryClose:visible').first();
    if(await closeButton.count())await closeButton.click({force:true,timeout:8000});
    else await page.keyboard.press('Escape');
    await delay(550);
    const closed=await page.evaluate(()=>({modal:document.getElementById('modalLayer')?.style.display,inventoryTab:window.GenesisPreparation?.activeTab?.()}));
    log('Q9_INVENTORY_CLOSED',closed);
    await dialog();
   }else if([0,1,2,3,4,5,6,7,8,10,11,11.25,12,13].includes(st.step)){
    const path=await approach();log('APPROACH',{step:st.step,...path});
    if(!path.ok){report.result='CANNOT_REACH_OBJECTIVE_'+st.step;break}
    await page.keyboard.press('e');await delay(550);
    await dialog();
    for(const id of ['confirmCraft','resultContinue','compareContinue']){
     const button=page.locator('#'+id);
     if(await button.isVisible().catch(()=>false)){await button.click();await delay(450)}
    }
    await dialog();
   }else if(st.step===11.5){
    const path=await approach();log('FOLLOW_ORDAN',path);
    if(!path.ok){report.result='MARKET_ESCORT_BLOCKED';break}
    await delay(1000);
   }else if(st.step===11.75){
    report.result='MARKET_REACHED_NEEDS_TRADE_UI_SCRIPT';break;
   }else{report.result='UNSUPPORTED_STEP_'+st.step;break}
   const next=(await snap()).state;log('ADVANCE',{from:st.step,to:next?.step,crafted:next?.crafted?.length});
   if(next?.step===st.step){report.result='STUCK_AT_STEP_'+st.step;break}
  }
  if(report.result==='NOT_RUN')report.result='STEPS_EXHAUSTED';
  await capture('final');
 }catch(e){
  report.result='TEST_EXCEPTION';report.errors.push(String(e.stack||e));log('EXCEPTION',String(e.stack||e).slice(0,1100));
  try{await capture('exception')}catch{}
 }finally{
  report.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('ORDAN_QA_FINAL',JSON.stringify({result:report.result,steps:report.states.map(x=>x.state?.step).filter(x=>x!=null),errors:report.errors.slice(-6),network:report.failedRequests.slice(-8),navigation:report.navigation}).slice(0,8500));
  if(report.result!=='MERCENARY_REACHED') process.exitCode=1;
  await browser.close();
 }
}
main().catch(e=>{console.error(e);report.result='FATAL';process.exitCode=1}).finally(()=>server.kill('SIGTERM'));
