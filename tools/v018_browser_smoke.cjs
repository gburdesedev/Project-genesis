'use strict';
/* V018 isolated route: real PlayCanvas load of lossless V082-B, positioning,
 * HDRI, original camera, Ordan, cinematic and controls. Desktop and touch.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='/tmp/genesis-v018-evidence';
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
    await page.goto('http://127.0.0.1:8765/v018/?qa=layout-'+mode.name,{
      timeout:60000,waitUntil:'domcontentloaded'});
    await page.locator('#start-blacksmith').click({timeout:20000});
    await page.waitForFunction(()=>{
      const n=document.getElementById('v011-pause');
      return n?.style.display==='block'&&n.textContent.includes('Carga finalizada');
    },null,{timeout:180000,polling:250});
    const audit=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
    assert(audit,mode.name+' missing runtime diagnostics');
    assert.equal(audit.version,'V018','Must show V018, not V017.1');
    assert.equal(audit.workshops?.ok,true,'Optimized door or other GLB failed to load in actual PlayCanvas');
    assert.equal(audit.workshops.hdr,true,'HDRI 32-bit not loaded');
    assert.equal(audit.floors.status,'ready','63x63 real PBR floor lost');
    assert.equal(audit.village?.count,5,'Five workshops missing');
    assert.equal(audit.village.version,'V018','Wrong V018 village version');
    assert.equal(audit.village.doorTextureVariant.file,'lossless-webp');
    assert(audit.village.buildings.every(b=>b.renderers>=10),'Empty workshop GLB geometry');
    assert.deepEqual(new Set(audit.village.approved),new Set(['Herrero','Arcanista']));
    assert.equal(audit.village.layoutCorrections.arcanistaCentreX,0,'Arcanista must remain centred');
    assert.equal(audit.village.layoutCorrections.herreroOpenDegrees,90);
    assert(audit.village.layoutCorrections.herreroHingeOffset<-.75&&audit.village.layoutCorrections.herreroHingeOffset>-.82);
    assert.equal(audit.village.layoutCorrections.genericDoorsCentred,true);
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
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().village?.doorAngle>60,null,{timeout:20000});
    const door=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.().village);
    assert(door.doorAngle>60&&door.doorAngle<=90.1,'Blacksmith door does not open inward');
    assert.equal(door.doorStates.Arcanista,'closed','Arcanista must remain shut');
    // Screenshot is deliberately last: SwiftShader PNG capture may block game updates.
    try{await page.screenshot({path:out+'/v018-'+mode.name+'.png',timeout:35000});}
    catch(e){console.warn('Screenshot diagnostic failed',mode.name,String(e));}
    records.push({device:mode.name,loaded:true,models:audit.workshops.models,
      hdr:true,village:audit.village.count,lossless:true,questStep:after.legacy,
      hingeAngle:door.doorAngle,success:true});
    console.log('PASS V018 '+mode.name,JSON.stringify(records[records.length-1]));
   }finally{await page.close()}
  }
  if(failures.length)throw Error('Browser error(s): '+failures.join('; ').slice(0,2500));
 }finally{fs.writeFileSync(out+'/browser-results.json',JSON.stringify({records,failures},null,2));await browser.close()}
})().catch(err=>{console.error('V018 BROWSER QA FAIL',err.stack||String(err));process.exitCode=1});
