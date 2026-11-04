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
   assert.equal(before.version,'V012','Expected new floor release without replacing V011 rigs');
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
   console.log('DESKTOP V011 PASS',JSON.stringify({movement:delta(after.rigs.artisan.position,before.rigs.artisan.position),headBoneOffsets:pts.map(p=>delta(p,pts[0])),consoleErrors:errors.length}));
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
     await mobile.screenshot({path:'/tmp/v011-test/scene-mobile.png'});
   } finally {await mobile.close()}
 }finally{fs.mkdirSync('/tmp/v011-test',{recursive:true});await page.screenshot({path:'/tmp/v011-test/scene.png'}).catch(()=>{});fs.writeFileSync('/tmp/v011-test/errors.json',JSON.stringify(errors,null,2));await browser.close()}
})().catch(e=>{console.error('SMOKE V011 FAIL',e.stack||String(e));process.exitCode=1});
