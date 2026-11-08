'use strict';
/* V018 isolated route: real PlayCanvas load of lossless V082-B, positioning,
 * HDRI, original camera, Ordan, cinematic and controls. Desktop and touch.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='/tmp/genesis-v0185-open-qa';
fs.mkdirSync(out,{recursive:true});
const failures=[],records=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try {
  for(const mode of [
   {name:'desktop',width:1280,height:720,mobile:false},
   {name:'mobile',width:844,height:390,mobile:true}
  ]){
   const page=await browser.newPage({
      viewport:{width:mode.width,height:mode.height},isMobile:mode.mobile,
      hasTouch:mode.mobile,deviceScaleFactor:1});
   page.on('pageerror',e=>failures.push(mode.name+': '+(e.stack||String(e))));
   page.on('console',x=>{if(x.type()==='error')failures.push(mode.name+' console: '+x.text())});
   try{
    await page.goto('http://127.0.0.1:8765/v0185/?qa=layout-'+mode.name,{
      timeout:60000,waitUntil:'domcontentloaded'});
    await page.locator('#start-blacksmith').click({timeout:20000});
    await page.waitForFunction(()=>{
      const n=document.getElementById('v011-pause');
      return n?.style.display==='block'&&n.textContent.includes('Carga finalizada');
    },null,{timeout:180000,polling:250});
    const audit=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
    assert(audit,mode.name+' missing runtime diagnostics');
    assert.equal(audit.version,'V018.5','Must show V018, not V017.1');
    assert.equal(audit.workshops?.ok,true,'Optimized door or other GLB failed to load in actual PlayCanvas');
    assert.equal(audit.workshops.hdr,true,'HDRI 32-bit not loaded');
    assert.equal(audit.floors.status,'ready','63x63 real PBR floor lost');
    assert.equal(audit.village?.count,5,'Five workshops missing');
    const sceneStatus=await page.evaluate(()=>{
      const v=window.__GENESIS_V017_VILLAGE__;
      return v?{version:v.version,doorTextureVariant:v.doorTextureVariant,layoutCorrections:v.layoutCorrections}:null;
    });
    assert.equal(sceneStatus?.version,'V018.5','Wrong V018 village version');
    assert.equal(sceneStatus.doorTextureVariant.file,'lossless-webp');
    assert(audit.village.buildings.every(b=>b.renderers>=10),'Empty workshop GLB geometry');
    assert.deepEqual(new Set(audit.village.approved),new Set(['Herrero','Arcanista']));
    assert(sceneStatus.layoutCorrections.arcanistaCentreX<-.79&&sceneStatus.layoutCorrections.arcanistaCentreX>-.86,'V018.5 natural arcane mesh not aligned');
    assert.equal(sceneStatus.layoutCorrections.herreroOpenDegrees,-92);
    assert(Math.abs(sceneStatus.layoutCorrections.doorPivotWorldX+.61506)<0.04);
    assert.equal(sceneStatus.layoutCorrections.genericDoorsCentred,true);
    assert(Math.abs(sceneStatus.layoutCorrections.allDoorsBodyWidthMetres-1.1934)<.04);
    assert.equal(audit.village.doorAngle,0,'Doors must remain closed before Ordan');
    assert.equal(audit.rigs.artisan.controllers,3,'Original animated character rig lost');
    await page.locator('#v011-pause button').first().click();
    await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.state==='arriving',null,{timeout:18000});
    await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.snapshot()?.distance>.15,null,{timeout:55000,polling:250});
    assert.equal(await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.skip()),true,'Arrival skip failed');
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().loadingHidden===false,null,{timeout:18000});
    const after=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
    assert.equal(after.legacy,0,'Arrival modified quest');
    assert(after.intro.ordanDistance<2.2,'Artisan failed to reach Ordan');
    assert.equal(after.village.doorAngle,0,'Herrero opened before speaking to Ordan');
    if(mode.mobile){
      assert.equal(await page.locator('#joy').isVisible(),true,'Missing Canvas original mobile joystick');
      assert.equal(await page.locator('#interact').isVisible(),true,'Missing Canvas original E button');
    }else{
      assert(Math.abs(after.cameraControl.degreesPerPixel-.2)<.003,'Original 0.2 degree sensitivity lost');
      assert.equal(after.cameraControl.smoothed,true,'Smooth camera regression');
    }
    await page.evaluate(()=>window.__GENESIS_V013_LEGACY__?.tryInteract());
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().legacy===1,null,{timeout:18000});
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().village?.doorAngle< -60,null,{timeout:20000});
    const door=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.().village);
    assert(door.doorAngle< -60&&door.doorAngle>=-92.1,'Herrero failed to restore outward opening');
    assert.equal(door.doorStates.Arcanista,'closed','Arcanista must remain shut');
    // Capture the genuinely OPEN state after the actual Ordan Q1 interaction.
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().village?.doorAngle< -85,null,{timeout:20000});
    const doorOpen=await page.evaluate(()=>{
      const app=window.pc.Application.getApplication?.()||window.pc.app;
      const root=app.root.findByName('Project Genesis V017 · aldeia cinco talleres');
      const hinge=root?.findByName('Herrero · bisagra izquierda original');
      const e=hinge?.getPosition(),rot=hinge?.getEulerAngles();
      return {pivot:e&&[e.x,e.y,e.z],rotation:rot&&[rot.x,rot.y,rot.z]};
    });
    assert(doorOpen.pivot,'Missing live hinge after first Ordan dialogue');
    assert(Math.abs(doorOpen.pivot[0]+.61506)<.04,'Natural-ratio door hinge not aligned with stone arch');
    await page.addStyleTag({content:'#hud,#mobile,#orientation,#settings,#controls,#ui,#legacyQuest,#legacyPrompt,#prompt,#cameraGuide,#modalLayer{display:none!important}'});
    await page.evaluate(()=>{
      const app=window.pc.Application.getApplication?.()||window.pc.app;
      const cam=app.root.findByName('Camara');
      const fix=()=>{cam.setPosition(0,1.75,5.35);cam.lookAt(0,1.45,-.4)};
      app.on('prerender',fix);
      fix();
      window.__GENESIS_OPEN_QA_UNHOOK__=()=>app.off('prerender',fix);
    });
    await page.waitForTimeout(500);
    await page.screenshot({path:out+'/v0185-open-'+mode.name+'.png',timeout:60000});
    await page.evaluate(()=>{
      window.__GENESIS_OPEN_QA_UNHOOK__?.();
      const app=window.pc.Application.getApplication?.()||window.pc.app;
      const cam=app.root.findByName('Camara');
      const side=()=>{cam.setPosition(-3.2,2.2,3.65);cam.lookAt(0,1.45,-.4)};
      app.on('prerender',side);side();
      window.__GENESIS_OPEN_QA_UNHOOK__=()=>app.off('prerender',side);
    });
    await page.waitForTimeout(450);
    await page.screenshot({path:out+'/v0185-open-side-'+mode.name+'.png',timeout:60000});
    await page.evaluate(()=>window.__GENESIS_OPEN_QA_UNHOOK__?.());
    console.log('CAPTURE OPEN',mode.name,JSON.stringify(doorOpen));
    records.push({device:mode.name,loaded:true,models:audit.workshops.models,
      hdr:true,village:audit.village.count,lossless:true,questStep:after.legacy,
      hingeAngle:door.doorAngle,success:true});
    console.log('PASS V018.5 '+mode.name,JSON.stringify(records[records.length-1]));
   }finally{await page.close()}
  }
  if(failures.length)throw Error('Browser error(s): '+failures.join('; ').slice(0,2500));
 }finally{fs.writeFileSync(out+'/browser-results.json',JSON.stringify({records,failures},null,2));await browser.close()}
})().catch(err=>{console.error('V018 BROWSER QA FAIL',err.stack||String(err));process.exitCode=1});
