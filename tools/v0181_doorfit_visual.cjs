'use strict';
// Standalone V018.1 visual-only QA: no gameplay code or approved GLB changed.
// Places the real PlayCanvas camera into reproducible facade angles AFTER gameplay works.
const {chromium}=require('playwright');
const fs=require('fs'),assert=require('node:assert/strict');
const OUT='/tmp/v0181-doorfit-visual';
fs.mkdirSync(OUT,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const details=[];
 try{
  for(const mode of [{name:'pc',width:1280,height:720,isMobile:false},{name:'mobile',width:844,height:390,isMobile:true}]){
   const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},isMobile:mode.isMobile,hasTouch:mode.isMobile,deviceScaleFactor:1});
   const errors=[];page.on('pageerror',e=>errors.push(String(e.stack||e)));
   try{
    await page.goto('http://127.0.0.1:8765/v018/?visual=1-'+mode.name,{waitUntil:'domcontentloaded',timeout:60000});
    await page.locator('#start-blacksmith').click({timeout:20000});
    await page.waitForFunction(()=>document.querySelector('#v011-pause')?.textContent.includes('Carga finalizada'),null,{timeout:170000});
    assert.equal((await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.()))?.workshops?.ok,true);
    await page.locator('#v011-pause button').first().click();
    await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.state==='arriving',null,{timeout:25000});
    await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.skip());
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.loadingHidden===false,null,{timeout:25000});
    // Capture CLOSED doors at Q1 step 0, before Ordan dialog.
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.village?.doorAngle<2,null,{timeout:20000});
    const diagnosis=await page.evaluate(()=>{
      const app=window.pc?.Application?.getApplication?.()||window.pc?.app;
      const cam=app?.root?.findByName('Camara');
      return {appFound:!!app,camFound:!!cam,camEnabled:!!cam?.camera,preRenderEvent:'prerender'};
    });
    console.log('V018.1 visual cam probe',mode.name,JSON.stringify(diagnosis));
    assert(diagnosis.camFound&&diagnosis.camEnabled,'Cannot recover real PlayCanvas camera for diagnostics');
    // Hide UI for architecture comparison only. This does not alter gameplay.
    await page.addStyleTag({content:'#hud,#mobile,#orientation,#settings,#controls,#ui,#legacyQuest,#legacyPrompt,#prompt,#cameraGuide,#modalLayer{display:none!important}'});
    // Visual QA fixed camera: camera override only for screenshots in this browser tab.
    for(const shot of [
      {name:'arcanista-front',eye:[17.1,2.8,16],target:[25.5625,2.0,16]},
      {name:'curtidor-front',eye:[14,2.5,7.5],target:[14,2,-1.6]},
      {name:'herrero-front',eye:[0,2.5,7.5],target:[0,2.0,-1.6]}
    ]){
      await page.evaluate(({eye,target})=>{
        const app=window.pc.Application.getApplication?.()||window.pc.app;
        const cam=app.root.findByName('Camara');
        if(window.__GENESIS_V018_VISUAL_STOP__)window.__GENESIS_V018_VISUAL_STOP__();
        let handler=()=>{cam.setPosition(...eye);cam.lookAt(...target)};
        app.on('prerender',handler);
        window.__GENESIS_V018_VISUAL_STOP__=()=>app.off('prerender',handler);
        handler();
      },shot);
      await page.waitForTimeout(400);
      const filename=OUT+'/'+mode.name+'-'+shot.name+'.png';
      await page.screenshot({path:filename,timeout:60000});
      details.push({mode:mode.name,shot:shot.name,filename,eye:shot.eye,target:shot.target});
      console.log('CAPTURE',filename);
    }
    await page.evaluate(()=>window.__GENESIS_V018_VISUAL_STOP__?.());
    // Verify the original Ordan first-dialog interaction still opens the Herrero.
    await page.evaluate(()=>window.__GENESIS_V013_LEGACY__?.tryInteract());
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.legacy===1,null,{timeout:20000});
    await page.getByRole('button',{name:'Continuar',exact:true}).click({timeout:15000});
    await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.village?.doorAngle>85,null,{timeout:20000});
    await page.evaluate(()=>{
      const app=window.pc.Application.getApplication?.()||window.pc.app;
      const cam=app.root.findByName('Camara');
      const handler=()=>{cam.setPosition(0,2.5,7.5);cam.lookAt(0,2,-1.6)};
      app.on('prerender',handler);
      window.__GENESIS_V018_VISUAL_STOP__=()=>app.off('prerender',handler);
    });
    await page.waitForTimeout(750);
    await page.screenshot({path:OUT+'/'+mode.name+'-herrero-open.png'});
    details.push({mode:mode.name,shot:'herrero-open'});
    await page.evaluate(()=>window.__GENESIS_V018_VISUAL_STOP__?.());
    if(errors.length)throw Error('JavaScript errors: '+errors.join('; ').slice(0,2000));
   } finally {await page.close()}
  }
  fs.writeFileSync(OUT+'/visual-audit.json',JSON.stringify({details,source:'actual V018 GLB WebGL PlayCanvas',approved:false},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error('V018.1 VISUAL QA FAILED',e.stack||String(e));process.exitCode=1});
