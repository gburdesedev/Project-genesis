'use strict';
// V0187 — real browser input/door QA; no mock meshes, no replacements.
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='/tmp/genesis-v0187-camera-door';
fs.mkdirSync(out,{recursive:true});
const results=[];
async function run(mode,browser) {
 const page=await browser.newPage({
   viewport:{width:mode.mobile?844:1280,height:mode.mobile?390:720},
   isMobile:mode.mobile,hasTouch:mode.mobile,deviceScaleFactor:1
 });
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e.stack||e)));
 page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
 try{
  const qs='?qa=camera-door-'+mode.name;
  await page.goto('http://127.0.0.1:8765/v0187/'+qs,{waitUntil:'domcontentloaded',timeout:75000});
  await page.locator('#start-blacksmith').click({timeout:35000});
  await page.waitForFunction(()=>document.getElementById('v011-pause')?.textContent.includes('Carga finalizada'),null,{timeout:200000,polling:400});
  const loaded=await page.evaluate(()=>({
   a:window.__GENESIS_V011_AUDIT__?.(),
   cameraReady:!!window.__GENESIS_V0187_CAMERA__,
   interior:window.__GENESIS_V0186_INTERIOR__?.renderMeshCount,
   door:window.__GENESIS_V017_VILLAGE__?.layoutCorrections
  }));
  assert.equal(loaded.a?.version,'V018.7','Wrong version selected');
  assert.equal(loaded.a?.workshops?.ok,true,'Preload missing authentic assets');
  assert.equal(loaded.a?.workshops?.hdr,true,'HDR IBL missing');
  assert.equal(loaded.a?.village?.count,5,'Five workshops missing');
  assert(loaded.interior>=100,'Authentic Forge V038 not loaded');
  assert(loaded.cameraReady,'No camera instrumentation');
  assert(loaded.door.doorWidthIncreaseMetres>=.15,'Door increase not applied');
  assert(loaded.door.doorForwardMetres>=.15,'Doors still too recessed');
  assert(loaded.door.portalArchInnerOpening>loaded.door.allDoorsBodyWidthMetres,'Arch should allow full leaf');
  assert.equal(loaded.door.herreroOpenDegrees,92,'Should open INTO workshop');

  await page.locator('#v011-pause button').first().click({timeout:16000});
  await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.state==='arriving',null,{timeout:25000});
  await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.skip());
  await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.loadingHidden===false,null,{timeout:20000});

  const cameraBefore=await page.evaluate(()=>window.__GENESIS_V0187_CAMERA__.yaw);
  if(mode.mobile){
    assert.equal(await page.evaluate(()=>window.__GENESIS_V0187_CAMERA__.input),'touch');
    const look=page.locator('#lookZone'); assert(await look.isVisible());
    const b=await look.boundingBox();assert(b&&b.width>200);
    const y=b.y+Math.min(145,b.height*.45);
    const fromX=b.x+b.width*.80,toX=b.x+b.width*.27;
    await page.mouse.move(fromX,y);
    await page.mouse.down();
    for(let i=1;i<=10;i++)await page.mouse.move(fromX+(toX-fromX)*i/10,y,{steps:1});
    await page.mouse.up();
    // Physical mouse+touch emulation is not the same as touch pointerType: use touchscreen instead.
    const current=await page.evaluate(()=>window.__GENESIS_V0187_CAMERA__.yaw);
    if(Math.abs(current-cameraBefore)<.25){
      await page.evaluate(()=>{
        const zone=document.getElementById('lookZone'),r=zone.getBoundingClientRect();
        const x=r.left+r.width*.8,y=r.top+Math.min(145,r.height*.45);
        zone.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:47,clientX:x,clientY:y,isPrimary:true}));
        for(let i=1;i<=10;i++)window.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerType:'touch',pointerId:47,clientX:x-r.width*.53*i/10,clientY:y,isPrimary:true}));
        window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',pointerId:47,clientX:x-r.width*.53,clientY:y,isPrimary:true}));
      });
    }
    const cameraAfter=await page.evaluate(()=>window.__GENESIS_V0187_CAMERA__.yaw);
    assert(Math.abs(cameraAfter-cameraBefore)>.75,'Touch swipe too slow/no camera rotation: '+cameraAfter);
  }else{
    assert.equal(await page.evaluate(()=>window.__GENESIS_V0187_CAMERA__.input),'keyboard');
    const b=await page.locator('canvas#app').boundingBox();
    await page.mouse.click(b.x+b.width*.62,b.y+b.height*.65);
    await page.waitForFunction(()=>window.__GENESIS_V0187_CAMERA__?.mouseLocked===true,null,{timeout:8000});
    await page.mouse.move(b.x+b.width*.64,b.y+b.height*.65);
    await page.mouse.move(b.x+b.width*.74,b.y+b.height*.61,{steps:5});
    const cameraAfter=await page.evaluate(()=>window.__GENESIS_V0187_CAMERA__.yaw);
    assert(Math.abs(cameraAfter-cameraBefore)>.12,'Pointer lock did not rotate camera');
    await page.keyboard.press('KeyQ');
    const reset=await page.evaluate(()=>window.__GENESIS_V0187_CAMERA__.yaw);
    assert(Math.abs(reset)<1e-6,'Q did not recenter yaw');
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>window.__GENESIS_V0187_CAMERA__?.mouseLocked===false,null,{timeout:10000});
  }
  await page.screenshot({path:out+'/'+mode.name+'-camera-play.png',timeout:40000});

  // Source gameplay: fresh Q1 step 0, real Ordan interaction should animate inward.
  const before=await page.evaluate(()=>({
    step:window.__GENESIS_V013_LEGACY__?.game?.step(),
    angle:window.__GENESIS_V017_VILLAGE__?.doorAngle
  }));
  assert.equal(before.step,0,'QA must use isolated fresh save');
  assert(Math.abs(before.angle)<1.5,'Door should start closed');
  const triggered=await page.evaluate(()=>{
    const app=pc.Application.getApplication();
    const ui=window.__GENESIS_V013_LEGACY__,goal=ui.game.goal();
    if(goal.id!=='mentor')throw Error('Unexpected first Q1 goal '+goal.id);
    const actor=app.root.children.find(e=>e.name&&/Artesano|Artisan/i.test(e.name));
    const ordan=app.root.children.find(e=>e.name&&/Ordan/i.test(e.name)&&e.findComponents?.('render')?.length);
    if(actor&&ordan){const p=ordan.getPosition();actor.setPosition(p.x+.65,0,p.z+.35);}
    return ui.tryInteract();
  });
  await page.waitForFunction(()=>window.__GENESIS_V013_LEGACY__?.game?.step()>=1,null,{timeout:15000});
  // Complete Ordan's actual first dialogue before checking the unobscured
  // physical door animation. A suspended WebGL frame during a modal is not a swing.
  await page.locator('#legacyDialogueContinue').click({timeout:12000});
  await page.waitForFunction(()=>window.__GENESIS_V013_LEGACY__?.isModalOpen()===false,null,{timeout:10000});
  await page.waitForTimeout(1100);
  const doorDebug=await page.evaluate(()=>({step:window.__GENESIS_V013_LEGACY__?.game?.step(),angle:window.__GENESIS_V017_VILLAGE__?.doorAngle,gate:window.__GENESIS_V017_VILLAGE__?.doorQuestGate,updateFrames:window.__GENESIS_V017_VILLAGE__?.doorTickFrames,latestDt:window.__GENESIS_V017_VILLAGE__?.doorLastDelta,appTimeScale:pc.Application.getApplication()?.timeScale,paused:window.__GENESIS_V011_AUDIT__?.()?.paused,panel:document.querySelector('#v011-pause')?.style.display,modal:window.__GENESIS_V013_LEGACY__?.isModalOpen(),errors:window.GenesisV015Diagnostics?.events?.slice(-3)}));
  console.log('V0187 DOOR DEBUG',JSON.stringify(doorDebug));
  await page.waitForFunction(()=>window.__GENESIS_V017_VILLAGE__?.doorAngle>85,null,{timeout:12000});
  const after=await page.evaluate(()=>{
    const v=window.__GENESIS_V017_VILLAGE__,app=pc.Application.getApplication(),hinge=app.root.findByName('Herrero · bisagra izquierda original');
    return {step:window.__GENESIS_V013_LEGACY__.game.step(),angle:v.doorAngle,pivot:hinge?.getPosition().toString(),euler:hinge?.getEulerAngles().toString()};
  });
  assert(after.angle>85&&after.angle<94,'Door did not animate to 92deg inward');
  assert(errors.length===0,'Browser errors: '+errors.slice(0,3).join(' | ').slice(0,850));
  await page.addStyleTag({content:'#hud,#ui,#legacyQuest,#legacyPrompt,#modalLayer,#settings,#start-screen{display:none!important}'});
  await page.evaluate(()=>{
    const app=pc.Application.getApplication(),cam=app.root.findByName('Camara');
    const fix=()=>{cam.setPosition(.10,2.6,3.3);cam.lookAt(0,1.12,-.40)};
    app.on('prerender',fix);fix();
  });
  await page.waitForTimeout(900);
  await page.screenshot({path:out+'/'+mode.name+'-door-open-inward.png',timeout:40000});
  results.push({device:mode.name,cameraYawBefore:cameraBefore,door:loaded.door,doorAngle:after.angle,pivot:after.pivot,loading:loaded.a.workshops,forgeMeshes:loaded.interior,passed:true});
  console.log('PASS V0187 '+mode.name,JSON.stringify({doorAngle:after.angle,camera:cameraBefore,forgeMeshes:loaded.interior}));
 }finally{await page.close()}
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  for(const mode of [{name:'desktop',mobile:false},{name:'mobile',mobile:true}])await run(mode,browser);
  fs.writeFileSync(out+'/results.json',JSON.stringify({results,visualApproval:false},null,2));
 }finally{await browser.close()}
})().catch(err=>{fs.writeFileSync(out+'/failure.txt',String(err.stack||err));console.error('V0187 QA FAIL:',err.stack||err);process.exitCode=1});
