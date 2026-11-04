const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>{errors.push('pageerror:'+e.message);console.log('PAGEERROR',e.stack)});
 page.on('console',msg=>{if(msg.type()==='error'){errors.push('console:'+msg.text());console.log('CONSOLE-ERROR',msg.text().slice(0,500))}});
 try{
   await page.goto('http://127.0.0.1:8765/v015/?build=V011-smoke',{waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('#start-blacksmith').click({timeout:15000});
   let reason='',reachedEnd=false;
   for(let k=0;k<25;k++){
     await page.waitForFunction(()=>{const e=document.querySelector('#v011-pause');return !!e&&e.style.display==='block'},null,{timeout:150000});
     reason=await page.locator('#v011-pause').innerText();
     console.log('PAUSE',k,reason.slice(0,420).replace(/\n/g,' '));
     if(reason.includes('Carga finalizada')){reachedEnd=true;break}
     await page.locator('#v011-pause button').first().click();
   }
   const before=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
   console.log('BEFORE',JSON.stringify(before));
   assert(reachedEnd,'No final loading pause');
   assert(before,'No runtime instrumentation');
   assert.equal(before.version,'V015','Expected original village on V013 gameplay, V014 HUD, and V012 floors');
   assert.equal(before.legacy,0,'Original Canvas tutorial not at first step');
   assert.equal(before.floors.status,'ready','Original village PBR floors did not finish loading');
   assert.equal(before.floors.surfaces,16,'Original 63x63 plaza, nine roads and market flooring is incomplete');
   assert.equal(before.floors.textures,8,'Missing original PBR color, normal, gloss or AO maps');
   for(const id of ['artisan','ordan','mercenary'])assert.equal(before.rigs[id].controllers,3,id+' requires 3 independent body/head/hair animation controllers');
   for(const id of ['artisan','ordan','mercenary'])for(const part of before.rigs[id].parts)assert(part.playing&&part.hasAnim,'Missing playing animation on '+part.id);
   const pts=before.rigs.artisan.parts.map(p=>p.rootBoneWorld);
   assert(pts.every(Boolean),'Missing Head bones in body/head/hair');
   const delta=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
   console.log('BONE HEAD ALIGNMENT',pts.map(p=>delta(p,pts[0])));
   for(const id of ['artisan','ordan','mercenary']){const bones=before.rigs[id].parts.map(p=>p.rootBoneWorld);assert(bones.every(Boolean),id+' missing Head bones');assert(bones.every(p=>delta(p,bones[0])<.14),id+' Head/hair skeletons out of alignment')}
   await page.locator('#v011-pause button').first().click();
   await page.waitForTimeout(400);
   const mapState=await page.evaluate(()=>{
     const world=window.__GENESIS_V015_MAP__;
     return {report:world?.report,merchant:window.__GENESIS_V011_AUDIT__?.().rigs?.mercenary?.position,arrival:window.__GENESIS_V015_ARRIVAL__?.snapshot()};
   });
   assert.equal(mapState.report?.workshops.length,5,'Not all five original Canvas workshop footprints were reconstructed');
   assert.deepEqual(mapState.report?.merchant?.position,[25.5,0,36.3],'Merchant must be in original market, not old plaza test position');
   assert.deepEqual(mapState.report?.plaza?.center,[7,16],'Canvas plaza moved from original coordinates');
   assert.deepEqual(mapState.report?.market?.center,[26,36],'Canvas market moved from original coordinates');
   assert(mapState.arrival?.state==='arriving'||mapState.arrival?.state==='pending','First playthrough must start autonomous plaza arrival');
   await page.evaluate(()=>window.__GENESIS_V015_ARRIVAL__.skip());
   const skipped=await page.evaluate(()=>window.__GENESIS_V015_ARRIVAL__.snapshot());
   assert.equal(skipped.state,'skipped','Intro skip did not complete the existing Ordan approach');
   assert(skipped.ordanDistance<2.2,'Skip did not leave player inside original Ordan interaction radius');
   console.log('V015 ORIGINAL VILLAGE PASS',JSON.stringify({workshops:mapState.report.workshops.length,merchant:mapState.report.merchant,plaza:mapState.report.plaza,arrival:skipped}));
   const afterContinue=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
   assert(!afterContinue.paused&&!afterContinue.loaderVisible&&!afterContinue.pauseVisible,'Panels remain after continue');
   await page.keyboard.down('w');
   await page.waitForTimeout(900);
   const walking=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
   assert(walking.rigs.artisan.parts.every(p=>p.state==='Walk_Loop'),'Not all artisan rigs transitioned to Walk_Loop');
   await page.keyboard.up('w');
   // PBR shader compilation can delay a render frame in software Chromium.
   // Verify the actual transition rather than sampling at a fixed 250 ms.
   await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.().rigs.artisan.parts.every(p=>p.state==='Idle_Loop'),null,{timeout:10000});
   const after=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
   console.log('AFTER',JSON.stringify(after));
   assert(delta(after.rigs.artisan.position,before.rigs.artisan.position)>.6,'Artisan did not move on W key');
   assert(after.rigs.artisan.parts.every(p=>p.state==='Idle_Loop'),'Idle did not resume after walking');
   assert(after.camera[1]>1.3&&after.camera[1]<5,'Camera height outside original bounds');
   const desktopHud=await page.evaluate(()=>{
     const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:innerWidth-r.right}};
     return {quest:rect('quest'),camera:rect('cameraSettingsBtn'),brand:rect('brand')};
   });
   assert(Math.abs(desktopHud.quest.x-14)<=1,'Canvas quest should sit 14px from desktop left edge');
   assert(Math.abs(desktopHud.quest.y-42)<=1,'Canvas quest must sit 42px below desktop top');
   assert(Math.abs(desktopHud.camera.right-12)<=1,'Canvas camera settings must be at original 12px right');
   assert(Math.abs(desktopHud.brand.y-12)<=1,'Canvas version badge lost original top edge');
   console.log('V014 DESKTOP HUD PASS',JSON.stringify(desktopHud));
   console.log('DESKTOP V011 PASS',JSON.stringify({movement:delta(after.rigs.artisan.position,before.rigs.artisan.position),headBoneOffsets:pts.map(p=>delta(p,pts[0])),consoleErrors:errors.length}));
   assert(await page.locator('#quest').isVisible(),'Original Canvas quest position missing');
   assert.equal(await page.locator('#legacyQuest').count(),0,'Duplicate V013 floating quest must not return');
   await page.keyboard.down('w');
   await page.waitForFunction(()=>{
     const p=window.__GENESIS_V011_AUDIT__?.().rigs.artisan.position;
     return p && Math.hypot(p[0]-1.72,p[2]-1.9)<2.1;
   },null,{timeout:15000});
   await page.keyboard.up('w');
   await page.keyboard.press('e');
   await page.waitForFunction(()=>window.__GENESIS_V013_LEGACY__?.snapshot()?.step===1,null,{timeout:5000});
   assert(await page.locator('#legacyDialogueContinue').isVisible(),'Ordan original dialogue not shown');
   await page.locator('#legacyDialogueContinue').click();
   assert.equal(await page.locator('#modalLayer').evaluate(el=>el.style.display),'none','Original dialogue did not close');
   console.log('V013 ORIGINAL GAMEPLAY PASS: walking to Ordan, E interaction, real original dialogue, Q1 advance');
   // Exercise the approved real 16:9 inventory and preparation modules in-browser.
   // Domain invariants and the entire Q1-Q3 route are separately tested by
   // tests/canvas_legacy_v013.cjs; bypass distance only to reach these UI screens.
   await page.evaluate(()=>{
     const ui=window.__GENESIS_V013_LEGACY__,game=ui.game;
     for(const id of ['door','debris','anvil','bellows','flue','forge','mentor-key','chest']){
       const result=game.doAction(id);
       if(!result.ok)throw Error('Cannot set up original menu test at '+id);
     }
     ui.refresh();
   });
   assert.equal(await page.evaluate(()=>window.__GENESIS_V013_LEGACY__.snapshot().step),9);
   await page.keyboard.press('Tab');
   await page.locator('#genInv').waitFor({state:'visible',timeout:10000});
   assert(await page.locator('#genInv img').count()>0,'Original inventory art did not mount');
   await page.waitForTimeout(500);
   await page.screenshot({path:'/tmp/v011-test/original-inventory.png'});
   await page.keyboard.press('Escape');
   assert.equal(await page.evaluate(()=>window.__GENESIS_V013_LEGACY__.snapshot().step),10,'Inventory close did not advance original tutorial');
   await page.evaluate(()=>window.__GENESIS_V013_LEGACY__.openWorkspace('Preparacion'));
   await page.locator('.prepSkinScroll').waitFor({state:'visible',timeout:10000});
   assert(await page.locator('.prepSkinPiece').count()>=20,'Original 39-layer preparation art not mounted');
   await page.waitForTimeout(600);
   await page.screenshot({path:'/tmp/v011-test/original-preparation.png'});
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#modalLayer').evaluate(el=>el.style.display),'none','Preparation did not close');
   assert.equal(errors.length,0,'Original UI produced JS errors: '+errors.join('; '));
   console.log('V013 ORIGINAL MENUS PASS: inventory from real stock, close-to-advance, 39-layer preparation art');

   const mobile=await browser.newPage({viewport:{width:844,height:390},deviceScaleFactor:1,isMobile:true,hasTouch:true});
   mobile.on('pageerror',e=>{errors.push('mobile-pageerror:'+e.message);console.log('MOBILE-PAGEERROR',e.stack)});
   try{
     await mobile.goto('http://127.0.0.1:8765/v015/?build=V011-mobile-smoke',{waitUntil:'domcontentloaded',timeout:30000});
     await mobile.locator('#start-blacksmith').click({timeout:15000});
     let reachedMobileEnd=false;
     for(let k=0;k<25;k++){
       await mobile.waitForFunction(()=>{const e=document.querySelector('#v011-pause');return !!e&&e.style.display==='block'},null,{timeout:150000});
       const msg=await mobile.locator('#v011-pause').innerText();
       if(msg.includes('Carga finalizada')){reachedMobileEnd=true;break}
       await mobile.locator('#v011-pause button').first().click();
     }
     assert(reachedMobileEnd,'Mobile load did not finish');
     const beforeMobile=await mobile.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
     assert.equal(beforeMobile.rigs.artisan.controllers,3,'Missing mobile artisan animation rigs');
     assert.equal(beforeMobile.floors.status,'ready','Mobile original floors failed');
     assert.equal(beforeMobile.floors.surfaces,16,'Mobile original floor surfaces missing');
     assert.equal(beforeMobile.floors.textures,8,'Mobile original PBR textures missing');
     const mobileHud=await mobile.evaluate(()=>{
       const r=id=>{const el=document.getElementById(id),b=el.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,right:innerWidth-b.right,bottom:innerHeight-b.bottom}};
       return {joystick:r('joy'),interact:r('interact'),inventory:r('inventoryTouch'),zoomIn:r('zoomIn'),zoomOut:r('zoomOut'),camera:r('cameraSettingsBtn'),quest:r('quest'),look:r('lookZone')};
     });
     const approx=(n,expect,tolerance=2)=>Math.abs(n-expect)<=tolerance;
     assert(approx(mobileHud.joystick.w,108)&&approx(mobileHud.joystick.h,108),'Original 108x108 joystick lost');
     assert(approx(mobileHud.joystick.x,18)&&approx(mobileHud.joystick.bottom,22),'Original joystick anchor changed');
     assert(approx(mobileHud.interact.w,70)&&approx(mobileHud.interact.h,70),'Original 70px E button lost');
     assert(approx(mobileHud.interact.right,22)&&approx(mobileHud.interact.bottom,28),'Original E button anchor changed');
     assert(approx(mobileHud.inventory.w,58)&&approx(mobileHud.inventory.h,58),'Original 58px INV lost');
     assert(approx(mobileHud.inventory.right,104)&&approx(mobileHud.inventory.bottom,35),'Original INV anchor changed');
     assert(approx(mobileHud.zoomIn.w,42)&&approx(mobileHud.zoomOut.h,42),'Original 42px zoom buttons lost');
     assert(approx(mobileHud.zoomIn.right,25)&&approx(mobileHud.zoomOut.right,25),'Zoom column right anchor changed');
     assert(approx(mobileHud.camera.right,12),'Original desktop/mobile camera button right anchor changed');
     assert(mobileHud.look.w>400,'Original right-hand camera look zone missing');
     console.log('V014 MOBILE HUD PASS',JSON.stringify(mobileHud));
     await mobile.waitForTimeout(3200);
     assert.equal(await mobile.evaluate(()=>window.__GENESIS_V015_ARRIVAL__?.active),true,'Autonomous walk ended before crossing original plaza');
     await mobile.screenshot({path:'/tmp/v011-test/original-plaza-arrival.png'});
     await mobile.waitForFunction(()=>window.__GENESIS_V015_ARRIVAL__?.snapshot()?.state==='arrived',null,{timeout:45000});
     const arrivalEnd=await mobile.evaluate(()=>window.__GENESIS_V015_ARRIVAL__.snapshot());
     assert(arrivalEnd.ordanDistance<2.2,'Animated original walk did not stop near Ordan');
     assert(arrivalEnd.distance>18,'Autonomous walk to Ordan bypassed plaza');
     console.log('V015 ANIMATED MOBILE ARRIVAL PASS',JSON.stringify(arrivalEnd));
     const b=await mobile.locator('#joy').boundingBox();
     assert(b&&b.width>60,'Touch joystick not visible');
     await mobile.locator('#v011-pause button').first().click();
     const cdp=await mobile.context().newCDPSession(mobile);
     const x=b.x+b.width/2,y=b.y+b.height/2;
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-30,id:1}]});
     await mobile.waitForFunction(initial=>{
       const pos=window.__GENESIS_V011_AUDIT__?.().rigs.artisan.position;
       return pos && Math.hypot(pos[0]-initial[0],pos[1]-initial[1],pos[2]-initial[2])>.35;
     },beforeMobile.rigs.artisan.position,{timeout:10000});
     const movingMobile=await mobile.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     const mobileMove=delta(movingMobile.rigs.artisan.position,beforeMobile.rigs.artisan.position);
     assert(mobileMove>.35,'Mobile joystick did not move artisan: '+mobileMove);
     assert(movingMobile.rigs.artisan.parts.every(p=>p.state==='Walk_Loop'),'Mobile joystick did not start walking animation');
     assert(!movingMobile.loaderVisible&&!movingMobile.pauseVisible,'Mobile loader still visible');
     console.log('MOBILE V011 PASS',JSON.stringify({movement:mobileMove,headBone: movingMobile.rigs.artisan.parts.map(p=>p.rootBoneWorld)}));
     await mobile.locator('#cameraSettingsBtn').click();
     assert(await mobile.locator('#settings').evaluate(el=>el.classList.contains('open')),'Original camera button cannot open settings above touch zone');
     await mobile.locator('#cameraSettingsBtn').click();
     assert(!(await mobile.locator('#settings').evaluate(el=>el.classList.contains('open'))),'Camera settings did not close');
     const zoomBefore=Number(await mobile.locator('#distance').inputValue());
     await mobile.locator('#zoomIn').click();
     const zoomAfter=Number(await mobile.locator('#distance').inputValue());
     assert(zoomAfter<zoomBefore,'Original Canvas zoom + is not wired to V011 camera');
     assert.equal(await mobile.locator('#inventoryTouch').getAttribute('aria-disabled'),'true','INV should stay locked before chest');
     await mobile.screenshot({path:'/tmp/v011-test/scene-mobile.png'});
   } finally {await mobile.close()}
 }finally{fs.mkdirSync('/tmp/v011-test',{recursive:true});await page.screenshot({path:'/tmp/v011-test/scene.png'}).catch(()=>{});fs.writeFileSync('/tmp/v011-test/errors.json',JSON.stringify(errors,null,2));await browser.close()}
})().catch(e=>{console.error('SMOKE V011 FAIL',e.stack||String(e));process.exitCode=1});
