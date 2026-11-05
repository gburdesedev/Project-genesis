'use strict';
// Read-only end-to-end test of the REAL GitHub Pages MAIN entrypoint.
// Browser clicks and keyboard input only: NEVER calls gameplay functions,
// teleports entities, changes tutorialStep or patches page code.
const { chromium } = require('playwright');
const fs=require('node:fs');
const dir='/tmp/genesis-main-ordan-e2e';
fs.mkdirSync(dir,{recursive:true});
const url='https://gburdesedev.github.io/Project-genesis/';
const events=[],samples=[],result={url,branch:'main',sourceCommit:'6ea1c5ecb0134f306ebc70394c8a5d8fe968038e',at:new Date().toISOString(),stages:[],errors:[]};
const begun=Date.now(),stamp=()=>Math.round((Date.now()-begun)/1000);
const log=(kind,data)=>{const e={s:stamp(),kind,data};events.push(e);console.log('GENESIS_E2E',JSON.stringify(e).slice(0,3500));};
let browser, page, ctx;
function short(x,n=300){return String(x??'').slice(0,n)}
async function state(){
 try{return await page.evaluate(()=>{
 const text=id=>document.getElementById(id)?.textContent?.trim().slice(0,900)||'';
 const shown=id=>{let e=document.getElementById(id);if(!e)return false;let s=getComputedStyle(e);let r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
 const xyz=id=>{try{const e=document.getElementById(id);const p=e?.entity?.getPosition?.()||e?.contentEntity?.getPosition?.();return p?[+p.x.toFixed(3),+p.y.toFixed(3),+p.z.toFixed(3)]:null}catch{return null}};
 return {at:new Date().toISOString(),url:location.href,ready:document.readyState,visible:{intro:shown('prototypeIntro'),loading:shown('loading'),hud:shown('hud'),modal:shown('modalLayer')},stage:text('loadState'),detail:text('loadDetail'),count:text('loadCount'),percent:text('loadPercent'),quest:text('questTitle'),questText:text('questText'),questEy:text('questEy'),prompt:text('prompt'),modal:text('modal').slice(0,550),dialogNext:shown('dialogNext'),buttons:[...document.querySelectorAll('#modal button')].filter(x=>getComputedStyle(x).display!=='none').map(x=>({id:x.id,text:x.textContent.slice(0,65)})).slice(0,18),person:{player:xyz('playerModel'),ordan:xyz('ordanModel')},diagnostic:window.GenesisAssetDiag?.snapshot?.()?{errors:window.GenesisAssetDiag.snapshot().errors?.slice(-6),count:window.GenesisAssetDiag.snapshot().records?.length}:null,runtime:window.__GENESIS_RUNTIME_ERRORS?.slice(-6)||[],boot:window.__genesisBoot||null};
 });}catch(e){return {error:String(e)}}
}
async function capture(label){
 const v=await state();const x={seconds:stamp(),label,...v};samples.push(x);log('snapshot',{label,s:x.seconds,visible:v.visible,stage:v.stage,detail:v.detail,count:v.count,quest:v.quest,person:v.person,errors:v.diagnostic?.errors,boot:v.boot});
 try{await page.screenshot({path:dir+'/'+String(samples.length).padStart(2,'0')+'-'+label.replace(/[^a-z0-9-]/gi,'_')+'.png',timeout:17000,animations:'disabled'});}catch(e){log('screenshot-error',{label,error:String(e)})}
 return v;
}
async function keyboard(k,ms=1000){try{await page.keyboard.down(k);await page.waitForTimeout(ms);}finally{await page.keyboard.up(k)}}
async function dismiss(){
 const b=page.locator('#dialogNext');
 if(await b.isVisible().catch(()=>false)){await b.click({timeout:9000});await page.waitForTimeout(300);log('dialogue-click','dialogNext');return true}
 return false;
}
async function moveToward(goal){
 // Locomotion is performed using genuine player-key events, not coordinates writes.
 // Sample each direction, choose one that actually lowers player-to-goal distance.
 const start=(await state()).person?.player;
 if(!start||!goal)return {reason:'player or target world position unavailable'};
 const dist=p=>Math.hypot(p[0]-goal[0],p[2]-goal[2]);let best=dist(start),bestKey=null;
 for(const k of ['KeyW','KeyS','KeyA','KeyD']){
  await keyboard(k,350);
  const p=(await state()).person?.player; if(!p)break;
  const d=dist(p);log('locomotion-sample',{key:k,pos:p,distance:+d.toFixed(3)});
  if(d<best-0.08){best=d;bestKey=k}
 }
 if(!bestKey)return {reason:'no keyboard direction approached the target',start,current:(await state()).person?.player,best};
 for(let i=0;i<7&&best>1.35;i++){
  await keyboard(bestKey,470);
  const p=(await state()).person?.player; if(!p)break;
  const d=dist(p);log('locomotion-step',{key:bestKey,pos:p,distance:+d.toFixed(3)});
  if(d>best+.04)break;
  best=d;
 }
 return {best,bestKey,current:(await state()).person?.player};
}
(async()=>{
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 ctx=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,ignoreHTTPSErrors:true,serviceWorkers:'block'});
 page=await ctx.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>{result.errors.push({type:'pageerror',message:short(e.stack||e,1500)});log('pageerror',short(e,500))});
 page.on('console',m=>{if(m.type()==='error'){result.errors.push({type:'console',message:short(m.text(),450)});log('console-error',short(m.text(),450))}});
 page.on('requestfailed',r=>log('requestfailed',{url:short(r.url(),180),error:r.failure()?.errorText}));
 page.on('response',r=>{if(r.status()>=400)log('http-error',{status:r.status(),url:short(r.url(),160)})});
 page.on('crash',()=>log('renderer-crash','chromium crashed'));
 page.on('framenavigated',f=>{if(f===page.mainFrame())log('navigate',f.url())});
 log('begin',{url});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:95000});
 for(let i=0;i<22;i++){
  const q=await state();
  if(i%3===0)log('boot-watch',{sec:stamp(),visible:q.visible,stage:q.stage,count:q.count,detail:q.detail});
  if(q.visible?.intro){await capture('intro-visible');break}
  if(i===21){await capture('intro-timeout');result.blocker='intro did not appear';break}
  await page.waitForTimeout(7000);
 }
 if(!result.blocker){
  let sel=page.locator('[data-profession="Herrero"]').first();
  await sel.click({timeout:15000});
  log('selected-herrero',true);
  for(let i=0;i<28;i++){
   const q=await state();
   if(i%2===0)log('route-watch',{sec:stamp(),visible:q.visible,stage:q.stage,count:q.count,detail:q.detail,quest:q.quest});
   if(!q.visible?.loading&&!q.visible?.intro&&q.quest){await capture('game-entered');result.gameEntered=true;break}
   if(i===27){await capture('route-timeout');result.blocker='Route not entered after selecting Herrero';break}
   await page.waitForTimeout(7000);
  }
 }
 if(result.gameEntered){
  const a=await state();log('first-quest',{quest:a.quest,questText:a.questText,person:a.person,buttons:a.buttons});
  for(let n=0;n<14;n++){
   await dismiss();
   let snap=await state();if(snap.visible?.modal){await capture('modal-blocker-'+n);result.blocker='Unexpected modal blocks progression';break}
   if(!snap.quest){result.blocker='Quest label missing';break}
   const quest=snap.quest,goal=snap.person?.ordan;
   await page.keyboard.press('KeyQ').catch(()=>{});
   await page.keyboard.press('KeyE').catch(()=>{});
   await page.waitForTimeout(600);
   let next=await state();
   if(next.visible?.modal){await capture('interaction-modal-'+n);await dismiss();next=await state()}
   if(next.quest!==quest){await capture('quest-advanced-'+n);result.stages.push({quest,advancedTo:next.quest});continue}
   const movement=await moveToward(goal);
   log('move-toward-ordan',{quest,movement});
   await page.keyboard.press('KeyQ').catch(()=>{});
   await page.keyboard.press('KeyE').catch(()=>{});
   await page.waitForTimeout(500);
   next=await state();
   if(next.visible?.modal){await capture('after-move-modal-'+n);await dismiss();next=await state()}
   if(next.quest!==quest){await capture('quest-advanced-move-'+n);result.stages.push({quest,advancedTo:next.quest});continue}
   await capture('quest-stalled-'+n);
   result.blocker='Could not advance quest through player input: '+quest;
   break;
  }
 }
 const last=await capture('final');
 result.final=last;result.durationSeconds=stamp();result.events=events;result.samples=samples;
 fs.writeFileSync(dir+'/report.json',JSON.stringify(result,null,2));
 log('final-result',{gameEntered:result.gameEntered,blocker:result.blocker,completedTransitions:result.stages,quest:last.quest,errors:result.errors.slice(-8)});
 if(!result.gameEntered)process.exitCode=2;
})().catch(async e=>{
 result.exception=short(e.stack||e,2800); log('exception',result.exception);
 try{result.final=await capture('exception')}catch{};
 result.events=events;result.samples=samples;fs.writeFileSync(dir+'/report.json',JSON.stringify(result,null,2));
 process.exitCode=1;
}).finally(async()=>{try{await ctx?.close()}catch{}try{await browser?.close()}catch{}});
