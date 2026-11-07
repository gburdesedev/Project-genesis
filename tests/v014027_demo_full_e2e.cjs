'use strict';
/* Browser QA for V014022 as shipped: test input is real keyboard and buttons;
   a read-only probe is inserted into the test response to observe quest state.
   No quest flags, geometry, assets, save state or scene logic are changed. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('fs'),path=require('path');
const {spawn}=require('child_process');
const out='previews/v014027-demo-full-e2e';
fs.mkdirSync(out,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const report={runAt:new Date().toISOString(),mode:'V014.027: REAL continuous play from new seed through swords, market, shields and the mercenary; read-only probe, original game',events:[],states:[],errors:[],failedRequests:[],navigation:[],result:'NOT_RUN'};
function log(event,data){report.events.push({event,data});console.log('ORDAN_QA',event,JSON.stringify(data).slice(0,2000))}
async function main(){
 await delay(1100);
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const context=await browser.newContext({viewport:{width:800,height:450},deviceScaleFactor:1,acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(13000);
 page.on('pageerror',e=>{report.errors.push(String(e.stack||e));log('PAGE_ERROR',String(e).slice(0,500))});
 page.on('console',m=>{if(m.type()==='error'){report.errors.push(m.text().slice(0,600));log('CONSOLE_ERROR',m.text().slice(0,200))}});
 page.on('requestfailed',r=>{const x={url:r.url(),error:r.failure()?.errorText};report.failedRequests.push(x);if(report.failedRequests.length<15)log('REQUEST_FAILED',x)});
 page.on('crash',()=>{report.errors.push('browser crash');log('CRASH','Chromium renderer crashed')});
 page.on('framenavigated',f=>{if(f===page.mainFrame())report.navigation.push(f.url())});
 let inserted=false;
 await page.route('**/index.html*',async route=>{
  const response=await route.fetch();let body=await response.text();
  // QA-only GPU budget: original game logic, player keys, physics, assets and
  // quest conditions are NOT changed. Chromium on CI has CPU SwiftShader.
  // Retain WebGL but lower only framebuffer and shadow rendering workload.
  const originalCanvas='<pc-app id="genesisApp" backend="webgl2" antialias ';
  assert.equal(body.split(originalCanvas).length-1,1,'Cannot identify PlayCanvas app once');
  body=body.replace(originalCanvas,'<pc-app id="genesisApp" backend="webgl2" max-pixel-ratio="0.25" ');
  const originalSun='cast-shadows shadow-distance="42" shadow-resolution="2048"';
  const originalForge='cast-shadows shadow-resolution="1024"';
  assert(body.includes(originalSun)&&body.includes(originalForge),'Required original lights changed');
  body=body.replace(originalSun,'shadow-distance="42" shadow-resolution="128"');
  body=body.replace(originalForge,'shadow-resolution="128"');
  report.visualQABudget={internalPixelRatio:.25,shadowCastingDisabledInTestOnly:true,gameSourceUnchanged:true};
  log('SWIFTSHADER_LOW_RES_QA_ONLY',report.visualQABudget);
  // Test-only read-only animation/camera diagnostics. No production game edit.
  const cinematicProbeMarker="questGoal:window.GenesisMarketQuest?.steps?.shop||11.75}};";
  assert.equal(body.split(cinematicProbeMarker).length-1,1,'Cannot find original cinematic read-only diagnostic once');
  body=body.replace(cinematicProbeMarker,
    "questGoal:window.GenesisMarketQuest?.steps?.shop||11.75,"+
    "walking:!!walking,running:!!running,walkClip:walkClip||null,"+
    "mentorWalk:ordanWalk||null,mentorIdle:ordanIdle||null,"+
    "mentorBodyClips:ordanAnim?.clips?.length||0,"+
    "mentorHeadClips:ordanHeadAnim?.clips?.length||0,"+
    "mentorHairClips:ordanHairAnim?.clips?.length||0,"+
    "playingState:playerAnimGroup?.[0]?.baseLayer?.activeState||null,"+
    "camDist,camPitch,camYaw}};");
  const marker='requestAnimationFrame(frame);\n\nsetLoadUI';
  const hook='requestAnimationFrame(frame);\nwindow.__ORDAN_QA_READONLY__=()=>({step:tutorialStep,started:gameStarted,profession:selectedProfession,player:{x:px,z:pz},quest:document.getElementById("questTitle")?.textContent,objective:objectiveTarget()?.pos||null,interactable:currentInteractable?.id||null,directInteractable:chooseInteractable()?.id||null,visibilityToObjective:tutorialStep===8?lineClearTo(objectiveTarget().pos):null,movementAllowed:gameStarted&&modalLayer.style.display!=="grid"&&intro.style.display!=="grid",crafted:craftedItems.map(x=>({recipe:x.recipe,name:x.name,rarity:x.rarity})),mercenaryState,mentorState:mentorFollowState,marketWaypoint:marketEscortWaypoint,nav:{ticks:window.__ORDAN_QA_TICKS__||0,keys:Array.from(keys),inputs:{x:moveX,y:moveY},canMove:gameStarted&&modalLayer.style.display!=="grid"&&intro.style.display!=="grid",modalDisplay:modalLayer.style.display,introDisplay:intro.style.display,camYaw,nearbyCollisions:{n:wallBlocked(px,pz-.1),s:wallBlocked(px,pz+.1),e:wallBlocked(px+.1,pz),w:wallBlocked(px-.1,pz)}},modal:document.getElementById("modal")?.textContent?.slice(0,220)||""});\nsetLoadUI';
  if(body.includes(marker)){body=body.replace(marker,hook);inserted=true;}
  const frameBegin='function frame(now){requestAnimationFrame(frame);';
  if(body.includes(frameBegin))body=body.replace(frameBegin,'function frame(now){window.__ORDAN_QA_TICKS__=(window.__ORDAN_QA_TICKS__||0)+1;requestAnimationFrame(frame);');
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
  if(process.env.GENESIS_RETRY_SCREENSHOTS==='1' && /^(intro|entered-game|final|exception|quest-(9|10|14|15|17|20|24)-)/.test(stage))try{await page.screenshot({path:path.join(out,String(report.states.length).padStart(2,'0')+'-'+stage.replace(/[^a-z0-9-]/gi,'-')+'.png'),animations:'disabled',timeout:3500})}catch(e){log('SCREENSHOT_FAILED',e.message.slice(0,150))}
  return x;
 }
 async function dialog(){
  if(await page.locator('#dialogNext').isVisible().catch(()=>false)){
   await page.locator('#dialogNext').click({force:true,timeout:8000});await delay(350);return true
  }return false;
 }
 async function realButton(selector){
   const b=page.locator(selector).first();
   if(!await b.count()||!await b.isVisible().catch(()=>false)||await b.isDisabled().catch(()=>true))return false;
   // Playwright's scheduled-navigation wait can hang at SwiftShader ~1fps even
   // though the physical mouse click has already updated the in-game UI.
   // Keep the real browser input; don't wait for a page navigation in this SPA.
   await b.click({force:true,timeout:8000,noWaitAfter:true});return true;
 }
 async function clickCraftableRecipe(){
   // Only real UI clicks: never set recipes, inventory, quest flags or the player.
   let confirm=page.locator('#prepStart.workspaceAction').first();
   const active=page.locator('.workspaceRecipeChoice[aria-pressed="true"]').first();
   log('CRAFT_CATALOG',{activeRecipe:(await active.textContent().catch(()=>''))?.trim(),
     choices:(await page.locator('.workspaceRecipeChoice').allTextContents().catch(()=>[])).map(x=>x.trim()),
     confirmVisible:await confirm.isVisible().catch(()=>false),
     confirmDisabled:await confirm.isDisabled().catch(()=>true)});
   if(await realButton('#prepStart.workspaceAction'))return true;
   // If the default recipe is not craftable, click known visible recipes
   // until the actual game enables the confirmation button.
   for(let i=0;i<Math.min(15,await page.locator('.workspaceRecipeChoice').count());i++){
     const recipe=page.locator('.workspaceRecipeChoice').nth(i);
     const label=(await recipe.textContent().catch(()=>''))?.trim();
     if(!await recipe.isVisible().catch(()=>false))continue;
     await recipe.click({force:true,timeout:8000});await delay(200);
     if(await realButton('#prepStart.workspaceAction')){log('CRAFT_RECIPE_BY_USER_CLICK',{label});return true;}
   }
   return false;
 }
 async function forgeAndCraft(){
   // Only physical clicks/keys. Never write stock, recipe, quest or item state.
   for(let batch=0;batch<5;batch++){
     const ready=await realButton('#prepFabricate');
     if(ready){
     log('CRAFT_MENU_OPENED',{batch});await delay(450);
     await delay(500);
   if(await page.locator('#resultContinue').isVisible().catch(()=>false)){log('CRAFT_DIRECT_RESULT',{batch});break;}
     if(await clickCraftableRecipe()){log('CRAFT_CONFIRMED_FROM_CATALOG',{batch});break;}
     log('CRAFT_CATALOG_NOT_READY',{batch});
   }
     const goPrep=page.locator('.prepSkinTab[data-tab="Preparacion"]');
     if(await goPrep.isVisible().catch(()=>false))await goPrep.click({force:true,timeout:8000});
     if(await page.locator('#prepStart').count()&&!await page.locator('#prepStart').isDisabled().catch(()=>true)){
       for(let j=0;j<28;j++){
         if(!await realButton('#prepMore'))break;
       }
       if(!await realButton('#prepStart'))return {ok:false,why:'prepStart not clickable',batch};
       log('THERMAL_GAME_STARTED',{batch,startedAtMs:Date.now()});
       for(let sample=0;sample<240;sample++){
         if(await page.locator('#prepResultBack').isVisible().catch(()=>false))break;
         const t=await page.evaluate(()=>{
           const g=document.getElementById('prepHeatGauge');
           const p=document.getElementById('prepCraftProgress');
           return {temp:Number(g?.getAttribute('aria-valuenow')||NaN),goal:parseFloat(document.querySelector('.prepHeatTarget')?.style.left||'NaN'),progress:Number(p?.getAttribute('aria-valuenow')||NaN)}
         });
         if(sample%15===0)log('THERMAL_PROGRESS',{batch,sample,...t});
         if(!Number.isFinite(t.temp)||!Number.isFinite(t.goal))return {ok:false,why:'no active thermal UI',batch};
         if(t.temp<t.goal-7)await page.keyboard.press('2');
         else if(t.temp<t.goal-2)await page.keyboard.press('1');
         await delay(350);
       }
       if(!await realButton('#prepResultBack'))return {ok:false,why:'thermal minigame incomplete',batch};
       log('THERMAL_PREPARED',{batch,finishedAtMs:Date.now()});
     } else log('NO_RAW_PREPARATION_AVAILABLE',{batch});
     const tab=page.locator('.prepSkinTab[data-tab="Fabricaciones"]');
     if(await tab.isVisible().catch(()=>false))await tab.click({force:true,timeout:8000});
     await delay(450);
     if(await clickCraftableRecipe()){log('CRAFT_FROM_CATALOG',{batch});break}
     // When materials are still insufficient, return to Preparation for the next batch.
     const menuTab=page.locator('.prepSkinTab[data-tab="Preparacion"]');
     if(await menuTab.isVisible().catch(()=>false))await menuTab.click({force:true,timeout:8000});
   }
   if(await page.locator('#resultContinue').isVisible().catch(()=>false)){
     await realButton('#resultContinue');
     log('CRAFT_RESULT_CONFIRMED',{});
     return {ok:true};
   }
   log('CRAFT_RESULT_MISSING_DIAGNOSTIC',{buttons:await page.locator('#modalLayer button').allTextContents().catch(()=>[]),recipeChoices:await page.locator('.workspaceRecipeChoice').allTextContents().catch(()=>[])});
   return {ok:false,why:'no resultContinue after crafting'};
 }
 // Real-input route recovered from successful action run 42213249938:
 // walk to the workshop wall; sidestep east at z ~ -1; then enter along -Z.
 // No teleport, quest writes, collision overrides or game-engine patching.
 // Navigation validation after chest relocation: never manipulate game position.
 // Q is the ACTUAL player key that points the camera at the objective, then
 // held W navigates its physically collidable path through the open doorway.
 async function approachForgeByEastPassage(){
   let noMovement=0;
   for(let i=0;i<18;i++){
     const before=(await snap()).state;
     if(!before?.started||!before.objective)return {ok:false,why:'objective unavailable',try:i};
     if(before.interactable||before.directInteractable)return {ok:true,id:before.interactable||before.directInteractable,try:i};
     const dist0=Math.hypot(before.player.x-before.objective.x,before.player.z-before.objective.z);
     if(dist0<1.35)return {ok:true,why:'in genuine interaction radius',dist:dist0,try:i};
     await page.keyboard.press('q');await delay(300);
     await page.keyboard.down('w');
     await delay(1750);
     const held=(await snap()).state;
     await page.keyboard.up('w');await delay(170);
     const after=(await snap()).state;
     const dist1=after?.objective&&after?.player?Math.hypot(after.player.x-after.objective.x,after.player.z-after.objective.z):Infinity;
     const travel=after?.player&&before?.player?Math.hypot(after.player.x-before.player.x,after.player.z-before.player.z):0;
     const frames=(held?.nav?.ticks||0)-(before.nav?.ticks||0);
     log('Q10_CHEST_RELOCATED_REAL_WALK',{i,from:before.player,to:after?.player,dist0,dist1,travel,frames,
       collisions:after?.nav?.nearbyCollisions,canMove:after?.nav?.canMove});
     if(after?.interactable||after?.directInteractable)return {ok:true,id:after.interactable||after.directInteractable,via:'reopened-center-aisle',try:i};
     if(dist1<1.40)return {ok:true,why:'within physical distance',dist:dist1,try:i};
     if(travel<.02){noMovement++;await delay(500);}
     else noMovement=0;
     if(noMovement>=7)return {ok:false,why:'no physical progress after chest was moved',dist:dist1,frames,collisions:after?.nav?.nearbyCollisions};
   }
   return {ok:false,why:'unlocked center route exceeded real WASD trials'};
 }
 // Ordan must traverse all actual escort waypoints; step 11.5 persists.
 // Only real keyboard keys; never edit quest flags or character positions.
 async function escortOrdanToMarket(){
   // The GAME drives both actors, no WASD or direct quest/position mutation.
   const start=Date.now(),observations=[];
   let lastProgress=-1,lastPose=null,seenActive=false,seenLetterbox=false;
   let walkingSamples=0,walkClipSamples=0,captureAttempted=false;
   const animationObservations=[];
   for(let i=0;i<520;i++){
     const state=(await snap()).state;
     const cine=await page.evaluate(()=>window.__GenesisMarketCinematicQA?.()||null);
     if(!cine)return {ok:false,why:'cinematic diagnostic missing from actual game'};
     if(state?.step===11.75||state?.step>=12){
       const d=Math.hypot(cine.player.x-25.5,cine.player.z-36.3);
       const out={ok:seenActive&&seenLetterbox&&!cine.active&&!cine.letterbox&&d<2.85,
         step:state.step,seconds:(Date.now()-start)/1000,playerMerchantDistance:d,
         controlLocked:cine.controlLocked,letterbox:cine.letterbox,
         walkingSamples,walkClipSamples,
         animationObservations:animationObservations.slice(-15),
         samples:observations.slice(-15)};
       // A walking flag alone is insufficient: the actual rigged Walk_Loop clip
       // must be requested while the actor advances in real PlayCanvas.
       if(walkingSamples<3||walkClipSamples<3){out.ok=false;out.why='walking animation not requested continuously'}
       log('CINEMATIC_REAL_RIG_ANIMATION_AUDIT',{walkingSamples,walkClipSamples,
         animationObservations:animationObservations.slice(-12)});
       log('CINEMATIC_ARRIVAL_AT_MERCHANT',out);return out;
     }
     if(state?.step!==11.5)return {ok:false,why:'unexpected quest state during cinematic',step:state?.step};
     if(cine.active){
       seenActive=true;if(cine.letterbox)seenLetterbox=true;
       if(lastProgress>=0 && cine.progress<lastProgress-.001)
         return {ok:false,why:'cinematic progress went backwards',lastProgress,current:cine.progress};
       if(lastPose){
         const walk=Math.hypot(cine.player.x-lastPose.x,cine.player.z-lastPose.z);
         const routeTravel=cine.progress-lastProgress;
         // CI's SwiftShader can stall screenshots for several seconds.
         // Movement is continuous if physical displacement never exceeds
         // the route arclength advanced between these two observations.
         if(walk>routeTravel+.10)return {ok:false,why:'apprentice left the continuous arc',walk,routeTravel,at:i};
       }
       if(!cine.controlLocked)return {ok:false,why:'player controls remained active during cinematic'};
       if(cine.progress>3 && (!/walk/i.test(String(cine.mentorWalk)) ||
          cine.mentorBodyClips<2 || cine.mentorHeadClips<2 || cine.mentorHairClips<2))
         return {ok:false,why:'Ordan clips not loaded and bound before cinematic',
           mentorWalk:cine.mentorWalk,mentorBodyClips:cine.mentorBodyClips,
           mentorHeadClips:cine.mentorHeadClips,mentorHairClips:cine.mentorHairClips};
       if(cine.progress>3 && cine.progress<cine.total-3){
         if(cine.walking)walkingSamples++;
         if(cine.walking && /walk/i.test(String(cine.walkClip)))walkClipSamples++;
         if(i%16===0)animationObservations.push({i,progress:+cine.progress.toFixed(2),
           walking:cine.walking,walkClip:cine.walkClip,playingState:cine.playingState,
           camDist:cine.camDist,camPitch:cine.camPitch});
       }
       lastProgress=cine.progress;lastPose=cine.player;
     }
     if(i%22===0){
       const data={i,progress:cine.progress,total:cine.total,waypoint:cine.waypoint,
         player:cine.player,mentor:cine.mentor,letterbox:cine.letterbox,step:state.step,
         walking:cine.walking,walkClip:cine.walkClip,playingState:cine.playingState,
         mentorWalk:cine.mentorWalk,mentorBodyClips:cine.mentorBodyClips,
         mentorHeadClips:cine.mentorHeadClips,mentorHairClips:cine.mentorHairClips,
         camDist:cine.camDist,camPitch:cine.camPitch};
       observations.push(data);log('ORDAN_MARKET_CINEMATIC_REAL',data);
       if(process.env.GENESIS_CINEMATIC_CAPTURE==='1'&&!captureAttempted&&i>=22&&cine.progress>7){
         captureAttempted=true;
         try{
           const file='cinematic-real-in-motion.png';
           await page.screenshot({path:path.join(out,file),animations:'allow',timeout:12000});
           log('CINEMATIC_REAL_FRAME_CAPTURED',{file,bytes:fs.statSync(path.join(out,file)).size,
             progress:cine.progress,walkClip:cine.walkClip});
         }catch(e){log('CINEMATIC_SCREENSHOT_LIMITATION',String(e).slice(0,250))}
       }
     }
     await delay(600);
   }
   return {ok:false,why:'Cinematic did not reach merchant in test budget',progress:lastProgress,
     seconds:(Date.now()-start)/1000,samples:observations.slice(-15)};
 }
 // Physical return: reverse Ordan's original approved road checkpoints via genuine
 // WASD input. The navigation reads player/camera state but never changes them.
 async function returnToSmithViaRoads(){
   const pathBack=require('../genesis_market_quest_v001.js').escortPath.slice().reverse().slice(1);
   // The final checkpoint is the original front-door corridor; the existing
   // approach() helper finishes the collision-tested doorway afterwards.
   const waypoints=pathBack;
   const samples=[];await page.keyboard.press('q');await delay(330);
   for(let i=0;i<waypoints.length;i++){
     const waypoint=waypoints[i];let stagnant=0,lastDist=Infinity;
     for(let tick=0;tick<120;tick++){
       const state=(await snap()).state;
       if(!state?.started||state.step!==12)return {ok:false,why:'game state lost in return',step:state?.step,i,tick,samples:samples.slice(-10)};
       if(!state.nav?.canMove)return {ok:false,why:'world movement locked',i,tick,state:state.nav};
       const dx=waypoint.x-state.player.x,dz=waypoint.z-state.player.z,dist=Math.hypot(dx,dz);
       if(dist<.82){samples.push({i,reached:true,dist:+dist.toFixed(2),at:state.player});break;}
       const yaw=(state.nav.camYaw||0)*Math.PI/180;
       const front=(dx*(-Math.sin(yaw))+dz*(-Math.cos(yaw)))/dist;
       const right=(dx*Math.cos(yaw)+dz*(-Math.sin(yaw)))/dist;
       const keys=[];
       if(front>.30)keys.push('w');else if(front<-.30)keys.push('s');
       if(right>.30)keys.push('d');else if(right<-.30)keys.push('a');
       if(!keys.length)return {ok:false,why:'unable to calculate real WASD direction',i,tick,front,right};
       for(const key of keys)await page.keyboard.down(key);
       await delay(1700);
       for(const key of keys)await page.keyboard.up(key);
       await delay(120);
       const after=(await snap()).state;
       const nextDist=after?.player?Math.hypot(waypoint.x-after.player.x,waypoint.z-after.player.z):Infinity;
       if(tick%10===0){const trace={i,tick,keys,distBefore:+dist.toFixed(2),distAfter:+nextDist.toFixed(2),player:after?.player,camYaw:state.nav.camYaw,blocked:after?.nav?.nearbyCollisions};samples.push(trace);log('RETURN_ROAD_REAL_WASD',trace);}
       if(!Number.isFinite(nextDist))return {ok:false,why:'no player position after input',i,tick};
       if(nextDist>=dist-.025)stagnant++;else stagnant=0;
       if(stagnant>=9)return {ok:false,why:'blocked at real road checkpoint',i,tick,waypoint,player:after?.player,dist:nextDist,samples:samples.slice(-12)};
       lastDist=nextDist;
       if(tick===119)return {ok:false,why:'waypoint exceeded physical WASD ticks',i,waypoint,lastDist,samples:samples.slice(-12)};
     }
   }
   return {ok:true,waypoints:waypoints.length,samples:samples.slice(-16),position:(await snap()).state?.player};
 }

 async function approach(){
  let noProgress=0;
  let attemptedPhysicalForgeRoute=false;
  for(let i=0;i<32;i++){
   const state=(await snap()).state;
   if(!state?.started)return {ok:false,why:'game not started'};
   if(state.step===10 && !attemptedPhysicalForgeRoute){
     attemptedPhysicalForgeRoute=true;
     const east=await approachForgeByEastPassage();
     log('Q10_EAST_PASSAGE_OUTCOME',east);
     if(east.ok)return east;
   }
   if(state.step===8){
     await page.keyboard.press('q');await delay(250);
     const t=(await snap()).state,dist=t?.objective&&t?.player?Math.hypot(t.player.x-t.objective.x,t.player.z-t.objective.z):Infinity;
     log('RELOCATED_CHEST_PROBE',{step:8,distance:dist,interactable:t?.interactable,lineClear:t?.visibilityToObjective});
     if(t?.interactable==='chest')return {ok:true,id:'chest',distance:dist};
   }
   const expected={8:'chest',10:'craft',11:'craft',11.75:'marketMerchant',12:'craft',13:'craft',17:'mercenary',21:'mentor',23:'demoFinalCraft'}[state.step];
   const present=[state.interactable,state.directInteractable].find(id=>id&&(!expected||id===expected));
   if(present)return {ok:true,id:present,step:state.step,tries:i};
   if(state.step===12&&i===0){
     const back=await returnToSmithViaRoads();log('REAL_ROAD_RETURN_MARKET_TO_SMITH',back);
     if(!back.ok)return {ok:false,why:'return journey failed',road:back};
   }
   const actionRadius={0:2.2,1:2.25,2:2.1,3:1.95,4:2.0,5:2.2,6:2.25,7:2.2,8:1.95,10:2,11:2,12:2,13:2,17:2.5,19:2.6,21:2.2,23:2}[state.step];
   const actionDist=state.objective&&state.player?Math.hypot(state.player.x-state.objective.x,state.player.z-state.objective.z):Infinity;
   if(actionRadius&&actionDist<actionRadius-.1){
     await page.keyboard.press('q');await delay(250);
     const actionable=(await snap()).state?.directInteractable;
     log('DIRECT_INTERACTION_PROBE',{step:state.step,distance:actionDist,radius:actionRadius,actionable:actionable||null});
     if(actionable&&(!expected||actionable===expected))return {ok:true,id:actionable,why:'actual target available without waiting for a graphics frame'};
   }
   if(!state.objective)return {ok:false,why:'no target',step:state.step};
   const dist=p=>Math.hypot(p.x-state.objective.x,p.z-state.objective.z);
   const d0=dist(state.player);
   if(d0<1.35)return {ok:true,why:'within radius',distance:d0,step:state.step};
   await page.keyboard.press('q');await delay(250);
   const probes=[];
   let closer=false,lateral=false;
   // Q always turns the real camera toward the current objective. W moves
   // forward; S would WALK AWAY from Ordan and caused the prior false failure.
   for(const key of ['w','a','d','s']){
    const b=(await snap()).state;
    await page.keyboard.down(key);
    await delay(key==='w'?2100:1300);
    const held=(await snap()).state;
    await page.keyboard.up(key);
    await delay(150);
    const a=(await snap()).state;
    const movement=b?.player&&a?.player?Math.hypot(a.player.x-b.player.x,a.player.z-b.player.z):0;
    const distance=a?.player?dist(a.player):Infinity;
    const trace={key,from:b?.player,to:a?.player,dx:movement,dist:distance,frames:b?.nav&&held?.nav?held.nav.ticks-b.nav.ticks:null,keyRegistered:held?.nav?.keys,allowed:held?.nav?.canMove,collisions:held?.nav?.nearbyCollisions};
    probes.push(trace);
    if(a?.interactable&&(!expected||a.interactable===expected)){log('REAL_MOVEMENT_REACHED_TARGET',{step:state.step,trace});return {ok:true,id:a.interactable,key,tries:i}}
    if(movement>.035&&distance<d0-.035){closer=true;break}
    if(movement>.035){lateral=true;break}
   }
   log('REAL_MOVEMENT_PROBES',{step:state.step,try:i,target:state.objective,start:state.player,probes});
   if(closer||lateral){noProgress=0;continue}
   // Try the player's actual on-screen joystick when keyboard focus is unresponsive.
   const joy=page.locator('#joy'),rect=await joy.boundingBox().catch(()=>null);
   if(rect&&rect.width>=20&&rect.height>=20){
     const cx=rect.x+rect.width/2,cy=rect.y+rect.height/2;
     const b=(await snap()).state;
     await page.mouse.move(cx,cy);await page.mouse.down();
     await page.mouse.move(cx,cy-31,{steps:3});await delay(1000);
     const held=(await snap()).state;
     await page.mouse.up();
     const a=(await snap()).state;
     const d=b?.player&&a?.player?Math.hypot(a.player.x-b.player.x,a.player.z-b.player.z):0;
     log('REAL_JOYSTICK_PROBE',{step:state.step,delta:d,frameDelta:held?.nav?.ticks-b?.nav?.ticks,inputs:held?.nav?.inputs});
     if(d>.035){noProgress=0;continue}
   }
   noProgress++;
   if(noProgress>=2)return {ok:false,why:'WASD and joystick could not move player',step:state.step,distance:d0,probes};
  }
  return {ok:false,why:'navigation exhausted'};
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
  let renderBoosted=false;
  for(let i=0;i<45;i++){
   const s=await snap(),st=s.state;
   await capture('quest-'+String(st?.step)+'-'+i);
   if(!st?.started){report.result='GAME_STATE_LOST';break}
   if(st.step>=10&&!renderBoosted){
     // Actual PlayCanvas gameplay must keep its original update/render loop.
     // Earlier headless QA set app.autoRender=false at Q10 and then saw zero
     // update ticks: this made physical movement intermittently impossible.
     // Read-only diagnostics only, NEVER change app engine settings.
     const diagnostic=await page.evaluate(()=>{
       const app=document.querySelector('#genesisApp')?.app;
       if(!app)return {available:false,changed:false};
       return {available:true,changed:false,autoRender:app.autoRender,renderNextFrame:app.renderNextFrame};
     });
     renderBoosted=true;
     report.testOnlyRenderSetting=diagnostic;
     log('HEADLESS_RENDER_LOOP_PRESERVED',diagnostic);
   }
   if(st.step>=14){
     const late=await page.evaluate(()=>({modal:document.getElementById('modal')?.innerText?.slice(0,1800),buttons:Array.from(document.querySelectorAll('button')).filter(x=>x.getClientRects().length).map(x=>({id:x.id,text:x.innerText?.trim()?.slice(0,85),className:x.className,disabled:x.disabled})).slice(-65),quest:document.getElementById('questTitle')?.innerText}));
     log('POST_SHIELD_LATE_QUEST_DIAGNOSTIC',{step:st.step,crafted:st.crafted,late});
     try{await page.screenshot({path:path.join(out,'post-shield-real-game.png'),animations:'disabled',timeout:9000})}catch(e){log('POST_SHIELD_SCREENSHOT_FAILED',e.message)}
     report.result=st.crafted?.length>=4?'FOUR_REAL_CREATIONS_REACHED_MERCENARY_PENDING':'POST_MARKET_INCOMPLETE_CRAFTING';
     break;
   }
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
   }else if(st.step===11.25){
    // The compare screen really opens after the second item. Before walking
    // back to Ordan, close it with the original UI's X, not with altered state.
    const before=await snap();
    log('Q11_25_COMPARE_VISIBLE',{modal:before.modal,buttons:before.modalButtons,
      panel:before.state?.modal,canMove:before.state?.nav?.canMove});
    if(before.modal==='grid'){
      if(!await realButton('#prepClose')){
        if(!await realButton('.prepSkinClose'))await page.keyboard.press('Escape');
      }
      await delay(500);
    }
    let after=await snap();
    log('Q11_25_COMPARE_CLOSED',{modal:after.modal,canMove:after.state?.nav?.canMove,
      step:after.state?.step});
    if(after.state?.step===11.25){
      if(!after.state.nav?.canMove){report.result='COMPARISON_STILL_BLOCKING_MOVEMENT';break}
      const path=await approach();log('APPROACH_AFTER_COMPARE',{step:st.step,...path});
      if(!path.ok){report.result='CANNOT_REACH_ORDAN_AFTER_COMPARE';break}
      await page.keyboard.press('e');await delay(550);
      await dialog();
      await delay(350);
    }
   }else if([0,1,2,3,4,5,6,7,8,10,11,12,13].includes(st.step)){
    const path=await approach();log('APPROACH',{step:st.step,...path});
    if(!path.ok){report.result='CANNOT_REACH_OBJECTIVE_'+st.step;break}
    await page.keyboard.press('e');await delay(550);
    await dialog();
    if([10,11,12,13].includes(st.step)){
      const done=await forgeAndCraft();log('CRAFT_UI_OUTCOME',{step:st.step,...done});
      if(!done.ok){report.result='CRAFT_UI_BLOCKED_'+st.step;break}
    } else {
      for(const id of ['confirmCraft','resultContinue','compareContinue']){
       const button=page.locator('#'+id);
       if(await button.isVisible().catch(()=>false)){await button.click({force:true});await delay(450)}
      }
    }
    await dialog();
   }else if(st.step===11.5){
    const path=await escortOrdanToMarket();
    log('FOLLOW_ORDAN_FULL_MARKET_ESCORT',path);
    if(!path.ok){report.result='MARKET_ESCORT_BLOCKED';break}
   }else if(st.step===11.75){
    // Interact with genuine NPC and click genuine free-purchase buttons.
    const route=await approach();
    log('MARKET_REAL_APPROACH',route);
    if(!route.ok){report.result='CANNOT_REACH_MARKET_MERCHANT';break}
    await page.keyboard.press('e');await delay(550);
    const rows=page.locator('#genesisMarketBoard .genesisMarketCard[data-slot]');
    const count=await rows.count();
    log('MARKET_MODAL_OPEN',{count,visible:await page.locator('#genesisMarketBoard').isVisible().catch(()=>false)});
    if(count<2){report.result='MARKET_MODAL_NOT_OPEN';break}
    const purchasing=[];
    for(let k=0;k<count;k++){
      const card=page.locator('#genesisMarketBoard .genesisMarketCard[data-slot="'+k+'"]');
      const name=(await card.locator('strong').textContent()).trim();
      const before=(await card.locator('small').textContent().catch(()=>''))||'';
      const btn=card.locator('button[data-buy]');
      if(!await btn.isVisible().catch(()=>false)){report.result='MARKET_BUY_BUTTON_MISSING';break;}
      await btn.click({force:true,timeout:8000});await delay(220);
      const after=await page.locator('#genesisMarketBoard .genesisMarketCard[data-slot="'+k+'"] small').textContent().catch(()=>'');
      purchasing.push({name,before,after});
    }
    log('MARKET_REAL_PURCHASES',{count,purchasing});
    if(report.result!=='NOT_RUN')break;
    await realButton('#genesisMarketClose');await delay(550);
    const current=(await snap()).state;
    log('MARKET_PURCHASES_QUEST_PROGRESS',{step:current?.step,crafted:current?.crafted?.length,marketNpc:current?.interactable});
    if(current?.step<12){report.result='MARKET_PURCHASES_DID_NOT_UNLOCK_SHIELDS';break;}
    log('CONTINUE_FROM_MARKET_TO_REAL_SHIELD_FABRICATION',{step:current.step,crafted:current.crafted?.length});
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
  if(report.result!=='DEMO_END_FULLY_VERIFIED') process.exitCode=1;
  await browser.close();
 }
}
main().catch(e=>{console.error(e);report.result='FATAL';process.exitCode=1}).finally(()=>server.kill('SIGTERM'));
