'use strict';
/* V018 visual QA: clean 3D screenshots of the actual GLBs, not HUD/dialog overlays.
 * Uses PlayCanvas Application.getApplication() and a postUpdate camera override.
 * This script neither modifies approved models nor publishes to the game.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='/tmp/genesis-v018-focused-renders';
fs.mkdirSync(out,{recursive:true});
const errors=[],results=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const mode of [
    {name:'desktop',width:1280,height:720,mobile:false},
    {name:'mobile',width:844,height:390,mobile:true}
  ]){
   const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},isMobile:mode.mobile,hasTouch:mode.mobile});
   page.on('pageerror',e=>errors.push(mode.name+': '+String(e.stack||e)));
   try{
    await page.goto('http://127.0.0.1:8765/v018/?visual-review='+mode.name,{waitUntil:'domcontentloaded',timeout:60000});
    await page.locator('#start-blacksmith').click({timeout:30000});
    await page.waitForFunction(()=>{const n=document.getElementById('v011-pause');return n?.style.display==='block'&&n.textContent.includes('Carga finalizada')},null,{timeout:165000});
    const a=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
    assert.equal(a.version,'V018');
    assert(a.workshops.ok&&a.workshops.hdr&&a.village.count===5,'V018 incomplete load');
    await page.locator('#v011-pause button').first().click();
    await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.state==='arriving',null,{timeout:20000});
    await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.skip());
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().loadingHidden===false,null,{timeout:20000});
    const test=await page.evaluate(()=>{
      const app=pc.Application.getApplication('app')||pc.Application.getApplication();
      if(!app)throw Error('PlayCanvas app unavailable');
      const camera=app.root.findByName('Camara');
      if(!camera)throw Error('Camera entity missing');
      const door=app.root.findByName('Herrero V082-B · PBR sin pérdida experimental');
      if(!door)throw Error('Candidate Herrero door visual missing');
      const meshes=door.findComponents('render').flatMap(x=>x.meshInstances||[]);
      const mapped=meshes.filter(x=>{const m=x.material;return !!(m?.diffuseMap||m?.normalMap||m?.metalnessMap||m?.glossMap)});
      if(!mapped.length)throw Error('WEBP candidate loaded with no material textures');
      if(!app.scene.envAtlas)throw Error('Real HDRI lighting missing');
      const style=document.createElement('style');
      style.textContent='#modalLayer,#hud,#legacyQuest,#legacyPrompt,#start-screen,#v011-pause,#mobile,#cameraGuide,#orientation,#settings{display:none!important;visibility:hidden!important}';
      document.head.appendChild(style);
      window.__GENESIS_V018_SHOT__={position:[0,3,10],target:[0,2,-2]};
      const apply=()=>{
        const p=window.__GENESIS_V018_SHOT__;
        camera.setPosition(...p.position);
        camera.lookAt(...p.target);
      };
      app.on('postUpdate',apply);
      apply();
      return {app:!!app,mappedMeshes:mapped.length,allMeshes:meshes.length,materials:new Set(meshes.map(x=>x.material?.name)).size,hdri:!!app.scene.envAtlas};
    });
    assert(test.mappedMeshes>0);
    console.log('V018 REAL TEXTURED PBR MATERIALS '+mode.name,JSON.stringify(test));
    const views=mode.mobile?[
     {name:'herrero-closed',pos:[0,2.35,4.8],at:[0,1.43,0]},
     {name:'arcanista-closed',pos:[17.8,2.7,16],at:[25.5625,1.6,16]}
    ]:[
     {name:'herrero-facade',pos:[0,4.3,12],at:[0,2,-2]},
     {name:'herrero-door-close',pos:[0,2.5,5.2],at:[0,1.65,0]},
     {name:'herrero-oblique',pos:[7,4.3,9],at:[0,2,-2]},
     {name:'arcanista-facade',pos:[17.3,4.4,16],at:[25.5625,2,16]},
     {name:'arcanista-door-close',pos:[20.8,2.5,16],at:[25.5625,1.5,16]}
    ];
    for(const view of views){
      await page.evaluate(v=>{window.__GENESIS_V018_SHOT__={position:v.pos,target:v.at}},view);
      await page.waitForTimeout(450);
      await page.screenshot({path:out+'/'+mode.name+'-'+view.name+'.png',timeout:35000});
      console.log('V018 RENDERED IMAGE',mode.name,view.name);
    }
    results.push({device:mode.name,mappedMeshes:test.mappedMeshes,views:views.length});
   }finally{await page.close()}
  }
  if(errors.length)throw Error(errors.join('; ').slice(0,2500));
 }finally{fs.writeFileSync(out+'/focused-results.json',JSON.stringify({results,errors},null,2));await browser.close()}
})().catch(e=>{console.error('V018 FOCUSED QA FAIL',e.stack||String(e));process.exitCode=1});
