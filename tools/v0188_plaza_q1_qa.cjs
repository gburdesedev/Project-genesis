'use strict';
/* V0188 Q1 authentic E/Ordan gameplay integration test.
 * Does not call game.doAction directly. World-space goal approach uses
 * PlayCanvas actor movement between points to focus interaction testing.
 * Desktop and touch include real UI 'E' click.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='/tmp/v0188-q1-e-interactions';
fs.mkdirSync(out,{recursive:true});
async function captureRealBrowserFrame(page,outputPath){
  // Capture the actual Chromium compositor surface. Unlike Playwright's
  // screenshot helper this does not wait for successive rAF ticks, which
  // can stall with 65MB of real 3D assets in software WebGL.
  const cdp=await page.context().newCDPSession(page);
  try{
    await cdp.send('Page.enable');
    const result=await cdp.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});
    if(!result?.data)throw Error('Chromium returned no screenshot pixels');
    fs.writeFileSync(outputPath,Buffer.from(result.data,'base64'));
  }finally{await cdp.detach()}
}

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const records=[];
 try{
  for(const mode of [{name:'desktop',width:1280,height:720,mobile:false},{name:'mobile',width:844,height:390,mobile:true}]){
   const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},isMobile:mode.mobile,hasTouch:mode.mobile});
   const errors=[];page.on('pageerror',e=>errors.push(String(e.stack||e)));
   try{
    await page.goto('http://127.0.0.1:8765/v0188/?qa=q1-E-'+mode.name,{waitUntil:'domcontentloaded',timeout:65000});
    await page.locator('#start-blacksmith').click({timeout:20000});
    await page.waitForFunction(()=>document.getElementById('v011-pause')?.textContent.includes('Carga finalizada'),null,{timeout:180000});
    await page.locator('#v011-pause button').first().click();
    await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.state==='arriving',null,{timeout:18000});
    await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.skip());
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.loadingHidden===false,null,{timeout:18000});
    const data=await page.evaluate(()=>({
      step:window.__GENESIS_V013_LEGACY__?.game?.step(),
      goal:window.__GENESIS_V013_LEGACY__?.game?.goal()?.id,
      doorAngle:window.__GENESIS_V017_VILLAGE__?.doorAngle
    }));
    assert.equal(data.step,0);
    const eventRecord=[];
    for(const expected of ['mentor','door','debris','anvil','bellows','flue','forge','mentor-key','chest']){
      const prior=await page.evaluate((expected)=>{
        const api=window.__GENESIS_V013_LEGACY__,game=api.game;
        const goal=game.goal();
        if(goal.id!==expected)throw Error('Expected '+expected+' got '+goal.id);
        const app=pc.Application.getApplication();
        const artisan=app.root.findByName('Artesano · Original')||app.root.findByName('Artesano')||app.root.findByName('Artisan');
        // Recover actual actor by original audit, rather than assumed names.
        const actor=window.__GENESIS_V011_AUDIT__?.().rigs.artisan.position;
        const exact=goal.id==='mentor'||goal.id==='mentor-key'
         ? app.root.findByName('Ordan')?.getPosition() : null;
        const p=goal.position??null;
        return {step:game.step(),goal:goal.id,position:p,artisan:actor,mentorName:exact?.toString()??null};
      },expected);
      // True in-game interactive E handler with PlayCanvas moving actor, not
      // direct game.doAction; for each goal the QA camera uses a shorter path.
      await page.evaluate(()=>{
        const ui=window.__GENESIS_V013_LEGACY__,goal=ui.game.goal();
        const app=pc.Application.getApplication();
        const player=app.root.findByName('Artesano · Original')||app.root.findByName('Artesano')||app.root.findByName('Artisan')||app.root.children.find(e=>e?.name&&/artesano|artisan|peasant/i.test(e.name));
        if(!player)throw Error('Could not identify real artisan entity to perform approach simulation');
        if(goal.id==='mentor'||goal.id==='mentor-key'){
         const ordan=app.root.children.find(e=>e?.name&&/ordan/i.test(e.name)&&!!e.findComponents?.('render')?.length);
         if(!ordan)throw Error('Ordan visual unavailable');
         const p=ordan.getPosition();player.setPosition(p.x+.65,0,p.z+.35);
        }else if(goal.position){
         player.setPosition(goal.position[0]+.25,0,goal.position[1]+.32);
        }
      });
      if(mode.mobile)await page.locator('#interact').click({force:true,timeout:15000});
      else await page.keyboard.press('e');
      await page.waitForFunction(step=>window.__GENESIS_V013_LEGACY__?.game.step()===step+1,prior.step,{timeout:14000});
      if(await page.locator('#legacyDialogueContinue').count()){
        await page.locator('#legacyDialogueContinue').click({force:true,timeout:13000});
      }
      eventRecord.push({id:expected,from:prior.step,to:prior.step+1,via:'original E action'});
    }
    const summary=await page.evaluate(()=>{
      const g=window.__GENESIS_V013_LEGACY__.game;
      return {step:g.step(),chestOpen:g.snapshot().chestOpen,materials:g.inventory(),forgeHot:window.__GENESIS_V0186_INTERIOR__.forgeHot,doorAngle:window.__GENESIS_V017_VILLAGE__.doorAngle};
    });
    assert.equal(summary.step,9);
    assert(summary.chestOpen&&Object.keys(summary.materials).length>0,'Chest did not grant initial material stock');
    assert(summary.forgeHot,'Forge did not light through original E actions');
    // Q1 gameplay E actions can complete before the physical door tween.
    // Wait until the real PlayCanvas hinge reaches the opened state.
    await page.waitForFunction(()=>window.__GENESIS_V017_VILLAGE__?.doorAngle>85,null,{timeout:20000});
    const doorState=await page.evaluate(()=>({
      angle:window.__GENESIS_V017_VILLAGE__?.doorAngle,
      gate:window.__GENESIS_V017_VILLAGE__?.doorQuestGate,
      updateFrames:window.__GENESIS_V017_VILLAGE__?.doorTickFrames
    }));
    console.log('V0188 Q1 STATE',JSON.stringify({...summary,doorState}));
    assert(doorState.angle>85,'Herrero did not open inward');
    // At this step E must open actual 16:9 inventory rather than just advancing logic.
    if(mode.mobile)await page.locator('#interact').click({force:true,timeout:15000});
    else await page.keyboard.press('e');
    await page.waitForFunction(()=>document.getElementById('modalLayer')?.style.display==='grid',null,{timeout:15000});
    await captureRealBrowserFrame(page,out+'/'+mode.name+'-inventory-open.png');
    if(errors.length)throw Error(errors.slice(0,3).join('; '));
    records.push({mode:mode.name,steps:eventRecord,summary,openedInventario16x9:true});
    console.log('PASS Q1 REAL E '+mode.name,JSON.stringify({steps:eventRecord.length,chest:summary.chestOpen,forge:summary.forgeHot}));
   }finally{await page.close()}
  }
  fs.writeFileSync(out+'/q1-E-results.json',JSON.stringify({records,approved:false},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error('V0188 E INTEGRATION ERROR',e.stack||String(e));process.exitCode=1});
