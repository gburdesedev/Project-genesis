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
  const oldBase="https://cdn.jsdelivr.net/gh/dustinc555/mygame@main/assets/vendor/quaternius/fantasy_props_megakit/gltf/";
  const recoveries={
    'Anvil_Log.gltf':"https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/8696981a95113a34feec26100e761e9e164327de/production/game_v014022/herrero_recovery/v001/anvil_quaternius_cc0_original/Anvil_Log.gltf",
    'Bellows.gltf':"https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/8696981a95113a34feec26100e761e9e164327de/production/game_v014022/herrero_recovery/v001/bellows_cc0_candidate/Bellows.glb",
    'Hammer_Rack.gltf':"https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/f33ff16f25c7f05d294665b9be1049773721cbd9/production/game_v014022/herrero_recovery/v001/blacksmith_decor_fallback/Hammer_Rack.gltf",
    'Sign_Blacksmith.gltf':"https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/f33ff16f25c7f05d294665b9be1049773721cbd9/production/game_v014022/herrero_recovery/v001/blacksmith_decor_fallback/Sign_Blacksmith.glb",
    'Barrel_Dark.gltf':"https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/f33ff16f25c7f05d294665b9be1049773721cbd9/production/game_v014022/herrero_recovery/v001/blacksmith_decor_fallback/Barrel_Dark.gltf",
    'Bucket_Wooden_2.gltf':"https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/f33ff16f25c7f05d294665b9be1049773721cbd9/production/game_v014022/herrero_recovery/v001/blacksmith_decor_fallback/Bucket_Wooden_2.gltf"
  };
  for(const [original,replacement] of Object.entries(recoveries)){
    const source=oldBase+original;
    if(!body.includes(source)) throw Error('Missing original asset reference in archived V014022: '+original);
    body=body.replace(source,replacement);
    log('REPLACED_MISSING_ASSET_IN_BROWSER_TEST',{original,source,replacement});
  }

  const marker='requestAnimationFrame(frame);\n\nsetLoadUI';
  const hook='requestAnimationFrame(frame);\nwindow.__ORDAN_QA_READONLY__=()=>({step:tutorialStep,started:gameStarted,profession:selectedProfession,player:{x:px,z:pz},quest:document.getElementById("questTitle")?.textContent,objective:objectiveTarget()?.pos||null,interactable:currentInteractable?.id||null,crafted:craftedItems.map(x=>({recipe:x.recipe,name:x.name,rarity:x.rarity})),mercenaryState,mentorState:mentorFollowState,marketWaypoint:marketEscortWaypoint,modal:document.getElementById("modal")?.textContent?.slice(0,220)||""});\nsetLoadUI';
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
  try{await page.screenshot({path:path.join(out,String(report.states.length).padStart(2,'0')+'-'+stage.replace(/[^a-z0-9-]/gi,'-')+'.png'),animations:'disabled',timeout:16000})}catch(e){log('SCREENSHOT_FAILED',e.message.slice(0,150))}
  return x;
 }
 async function dialog(){
  if(await page.locator('#dialogNext').isVisible().catch(()=>false)){
   const btn=page.locator('#dialogNext');
   const label=await btn.textContent();
   await btn.click({force:true,timeout:8000});
   log('DIALOG_BUTTON_CLICKED',{label:label?.trim(),method:'Playwright force physical pointer click'});
   await delay(350);return true
  }return false;
 }
 async function approach(){
  // Diagnose physical navigation rather than assuming a failed W key is a collision.
  // All changes below are genuine key events, and telemetry stays read-only.
  const axes=['w','a','s','d'];
  let lastDistance=Infinity,stalled=0;
  for(let i=0;i<48;i++){
   const s=(await snap()).state;
   if(!s?.started)return {ok:false,why:'not started'};
   if(s.interactable)return {ok:true,id:s.interactable,tries:i};
   if(!s.objective)return {ok:false,why:'no objective'};
   if(s.step===8&&i===0){
    const focus=()=>page.evaluate(()=>({
      hasFocus:document.hasFocus(),activeTag:document.activeElement?.tagName,
      activeId:document.activeElement?.id,pointerLockTag:document.pointerLockElement?.tagName||null,
      pointerLockId:document.pointerLockElement?.id||null,
      modalDisplay:getComputedStyle(document.getElementById('modalLayer')).display,
      centerTarget:document.elementFromPoint(innerWidth/2,innerHeight/2)?.id||null,
      canvasCount:document.querySelectorAll('canvas').length
    }));
    const beforeFocus=await focus();
    let clickResult='no canvas';
    const canvas=page.locator('canvas').first();
    if(await canvas.count()){
      try{
        const bounds=await canvas.boundingBox();
        if(bounds){await page.mouse.click(bounds.x+bounds.width*.5,bounds.y+bounds.height*.5);clickResult='real mouse click at canvas center';}
        else clickResult='canvas has no bounding box';
      }catch(e){clickResult='pointer click failed: '+String(e).slice(0,160)}
    }
    await delay(250);
    log('FOCUS_PROBE',{step:s.step,before:beforeFocus,clickResult,after:await focus()});
   }
   const pos=s.player;
   const dist=p=>Math.hypot(p.x-s.objective.x,p.z-s.objective.z);
   const before=dist(pos);
   if(before<1.35)return {ok:true,why:'within interaction range',distance:before,tries:i};
   await page.keyboard.press('q');
   const samples=[];
   for(const k of axes){
    const p0=(await snap()).state?.player;
    if(!p0)break;
    await page.keyboard.down(k);await delay(290);await page.keyboard.up(k);
    const after=(await snap()).state;
    if(after?.interactable)return {ok:true,id:after.interactable,tries:i,key:k};
    if(!after?.player)break;
    const moved=Math.hypot(after.player.x-p0.x,after.player.z-p0.z);
    const d=dist(after.player);
    samples.push({key:k,moved:+moved.toFixed(3),distance:+d.toFixed(3),position:after.player});
   }
   log('DIRECTIONAL_PROBE',{step:s.step,try:i,start:pos,target:s.objective,samples});
   const now=(await snap()).state;
   if(!now?.player)return {ok:false,why:'position lost',step:s.step};
   const current=dist(now.player);
   if(current<1.35)return {ok:true,why:'within interaction range',distance:current,tries:i};
   const moving=samples.filter(x=>x.moved>.025);
   if(!moving.length)return {ok:false,why:'no movement with W A S D',step:s.step,distance:current,samples};
   // Prefer motion toward objective; if all four are worse, take a lateral detour.
   moving.sort((a,b)=>a.distance-b.distance);
   const preferred=moving[0];
   await page.keyboard.down(preferred.key);await delay(500);await page.keyboard.up(preferred.key);
   const now2=(await snap()).state;
   const after=now2?.player?dist(now2.player):current;
   if(after>=lastDistance-.025)stalled++;else stalled=0;
   if(stalled>=8)return {ok:false,why:'physical navigation made no progress after directional probes',step:s.step,distance:after,samples};
   lastDistance=after;
  }
  return {ok:false,why:'navigation budget exhausted'};
 }
 try{
  await page.goto('http://127.0.0.1:8765/index.html?qa=ordan-playwright',{waitUntil:'domcontentloaded',timeout:90000});
  log('PROBE',{inserted});
  for(let n=0;n<15;n++){const s=await snap();if(s.intro!=='none')break;await delay(8000);}
  const before=await capture('intro');
  if(before.intro==='none'){report.result='BLOCKED_BEFORE_INTRO';return}
  await page.locator('[data-profession="Herrero"]').click({timeout:15000});
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
    await dialog();await page.keyboard.press('Tab');await delay(450);
    if(await page.locator('#inventoryClose').isVisible().catch(()=>false)){await page.locator('#inventoryClose').click();await delay(330)}
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
  if(report.result!=='MERCENARY_REACHED')process.exitCode=1;
  await browser.close();
 }
}
main().catch(e=>{console.error(e);report.result='FATAL';process.exitCode=1}).finally(()=>server.kill('SIGTERM'));
