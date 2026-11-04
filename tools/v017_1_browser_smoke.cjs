'use strict';
/* Focused V017 live WebGL QA: exact workshop geometry in scene, honest
 * loading gate, HDRI, mobile fallback, original cinematic and controls.
 * No costly menu screenshots: V013/V014 have their own independent tests.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const OUT='/tmp/v017-browser-qa';
fs.mkdirSync(OUT,{recursive:true});
const errors=[],results=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const mode of [
    {name:'desktop',width:1280,height:720,mobile:false},
    {name:'mobile',width:844,height:390,mobile:true}
  ]){
   const page=await browser.newPage({
     viewport:{width:mode.width,height:mode.height},
     deviceScaleFactor:1,isMobile:mode.mobile,hasTouch:mode.mobile
   });
   page.on('pageerror',error=>errors.push(mode.name+': '+String(error.stack||error)));
   const time0=Date.now();
   try{
    await page.goto('http://127.0.0.1:8765/v017/?qa=v017-preview-'+mode.name,{waitUntil:'domcontentloaded',timeout:60000});
    await page.locator('#start-blacksmith').click({timeout:20000});
    await page.waitForFunction(()=>{
      const ui=document.getElementById('v011-pause');
      return ui?.style.display==='block'&&ui.textContent.includes('Carga finalizada');
    },null,{timeout:150000,polling:250});
    const data=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
    assert(data,'V017 browser audit not exposed');
    assert.equal(data.version,'V017.1');
    assert(data.cameraInput?.nativePointerLock,'Native mouse capture is missing');
    assert.equal(data.loadingHidden,true,'The village must not appear while the loading gate is open');
    assert.equal(data.workshops?.ok,true,'GLB preload/HDRI load failed');
    assert.equal(data.workshops.hdr,true,'No actual HDRI atlas');
    assert.equal(data.floors.status,'ready','Original PBR ground missing');
    assert.equal(data.village?.count,5,'Five real workshop facades not mounted');
    assert.deepEqual(new Set(data.village.approved),new Set(['Herrero','Arcanista']));
    assert.deepEqual(new Set(data.village.generic),new Set(['Carpintero','Curtidor','Joyero']));
    assert(data.village.buildings.every(b=>b.renderers>=10),'Workshop has no real GLB geometry');
    assert.deepEqual(data.village.buildings.find(b=>b.profession==='Herrero').x,0);
    assert.deepEqual(data.village.buildings.find(b=>b.profession==='Arcanista').x,25.5625);
    assert.equal(data.stages.animations,'Listo');
    for(const category of ['walls','doors','roofs','lighting','village'])assert.equal(data.stages[category],'Listo','Progress category '+category+' is premature/unfinished');
    assert.equal(data.village.buildings.find(b=>b.profession==='Arcanista').door,
      'approved','Arcanista V027 must display the original luminous door on every device');
    assert(data.rigs.artisan.controllers===3,'Original V011 animation rig missing');
    assert.equal(data.village.doorAngle,0,'Blacksmith door must initially be CLOSED');
    assert.equal(data.village.herreroDoor.inwardAngle,90,'Blacksmith must rotate INWARD (+Y)');
    assert.equal(data.village.arcanistaDoor.woodFallback,false,'Never replace approved Arcanista V027 with wood');
    assert.equal(data.village.arcanistaDoor.closed,true,'Arcanista door must initially remain closed');
    const pauseSeconds=(Date.now()-time0)/1000;
    await page.locator('#v011-pause button').first().click();
    await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.state==='arriving',null,{timeout:12000});
    assert.equal(await page.locator('#hud').evaluate(el=>getComputedStyle(el).visibility),'hidden');
    await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.snapshot()?.distance>0.2,null,{timeout:65000,polling:250});
    const moving=await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.snapshot());
    assert(moving.distance>0.2,'No actual autonomous movement');
    const skipped=await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.skip());
    assert.equal(skipped,true,'V016 cinematic skip must remain available');
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().loadingHidden===false,null,{timeout:12000});
    assert.equal(await page.locator('#hud').evaluate(el=>getComputedStyle(el).visibility),'visible');
    const after=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
    assert.equal(after.legacy,0,'The opening cinematic must not consume the first quest');
    assert(after.intro.ordanDistance<2.2,'Arrival skip must finish at Ordan');
    assert.equal(after.loaderVisible,false,'Loader overlay still obscures the view');
    assert.equal(after.village.doorAngle,0,'Door cannot open during the cinematic before Ordan');
    await page.evaluate(()=>window.__GENESIS_V013_LEGACY__?.tryInteract());
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().legacy===1,null,{timeout:15000});
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().village?.doorAngle>8,null,{timeout:20000});
    const firstDialogue=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
    assert(firstDialogue.village.doorAngle>0&&firstDialogue.village.doorAngle<=90,'Door opened in wrong direction or too late');
    assert.equal(firstDialogue.legacy,1,'Opening door consumed extra quest state');
    assert(firstDialogue.village.buildings.filter(b=>b.door!=='approved').every(b=>b.door==='generic-temporary'),'Generic workshop doors changed unexpectedly');
    // The original modal dialogue must close before mouse capture/walking resumes.
    await page.locator('#legacyDialogueContinue').click();
    if(!mode.mobile){
      const canvas=page.locator('#app');
      await canvas.click({position:{x:mode.width-85,y:mode.height-90},timeout:15000});
      await page.waitForFunction(()=>document.pointerLockElement?.id==='app',null,{timeout:12000});
      const captured=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
      assert(captured.cameraInput.locked,'Native mouse capture did not activate');
      await page.evaluate(()=>{const event=new MouseEvent('mousemove',{bubbles:true});Object.defineProperties(event,{movementX:{value:120},movementY:{value:12}});document.dispatchEvent(event)});
      await page.waitForFunction(()=>Math.abs(window.__GENESIS_V011_AUDIT__?.().cameraInput.yaw)>0.015,null,{timeout:12000});
      await page.keyboard.press('Escape');
      await page.keyboard.down('w');
      await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().rigs.artisan.parts.every(p=>p.state==='Walk_Loop'),null,{timeout:45000,polling:250});
      await page.keyboard.up('w');
      await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().rigs.artisan.parts.every(p=>p.state==='Idle_Loop'),null,{timeout:35000,polling:250});
    }else{
      assert.equal(await page.locator('#joy').isVisible(),true,'Original mobile joystick missing');
      assert.equal(await page.locator('#interact').isVisible(),true,'Original touch interaction button missing');
    }
    const elapsed=(Date.now()-time0)/1000;
    results.push({mode:mode.name,success:true,seconds:elapsed,loadSeconds:pauseSeconds,
       models:data.workshops.models,visibleWorkshops:data.village.count,
       approved:data.village.approved,generic:data.village.generic,
       arcanistDoor:data.village.buildings.find(b=>b.profession==='Arcanista').door,
       blacksmithDoorOpensInward:true,nativeMouseOnDesktop:!mode.mobile,
       hdr32:true,originalQuest:after.legacy,autonomousWalkDistance:moving.distance,
       noWorldBeforeLoad:data.loadingHidden});
    console.log('PASS V017.1 '+mode.name.toUpperCase()+' · original smooth camera, closed doors, mentor-triggered inward Herrero and luminous V027 mobile',JSON.stringify(results[results.length-1]));
   }finally{await page.close()}
  }
  assert.equal(errors.length,0,'JS page errors: '+errors.join('; '));
 }finally{
   fs.writeFileSync(OUT+'/results.json',JSON.stringify({results,errors},null,2));
   await browser.close();
 }
})().catch(e=>{console.error('V017 WEBGL QA FAIL',e.stack||String(e));process.exitCode=1});
