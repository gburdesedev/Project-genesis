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
   assert.equal(before.rigs.artisan.controllers,3,'Artisan requires 3 independent rig animation controllers (body/head/hair)');
   for(const part of before.rigs.artisan.parts)assert(part.playing&&part.hasAnim,'Missing playing animation on '+part.id);
   const pts=before.rigs.artisan.parts.map(p=>p.rootBoneWorld);
   assert(pts.every(Boolean),'Missing Head bones in body/head/hair');
   const delta=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
   console.log('BONE HEAD ALIGNMENT',pts.map(p=>delta(p,pts[0])));
   assert(pts.every(p=>delta(p,pts[0])<.14),'Head/hair skeletons out of alignment');
   await page.locator('#v011-pause button').first().click();
   await page.waitForTimeout(400);
   const afterContinue=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
   assert(!afterContinue.paused&&!afterContinue.loaderVisible&&!afterContinue.pauseVisible,'Panels remain after continue');
   await page.keyboard.down('w');
   await page.waitForTimeout(900);
   await page.keyboard.up('w');
   const after=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
   console.log('AFTER',JSON.stringify(after));
   assert(delta(after.rigs.artisan.position,before.rigs.artisan.position)>.6,'Artisan did not move on W key');
   assert(after.camera[1]>1.3&&after.camera[1]<5,'Camera height outside original bounds');
   console.log('SMOKE V011 PASS',JSON.stringify({movement:delta(after.rigs.artisan.position,before.rigs.artisan.position),headBoneOffsets:pts.map(p=>delta(p,pts[0])),consoleErrors:errors.length}));
 }finally{fs.mkdirSync('/tmp/v011-test',{recursive:true});await page.screenshot({path:'/tmp/v011-test/scene.png'}).catch(()=>{});fs.writeFileSync('/tmp/v011-test/errors.json',JSON.stringify(errors,null,2));await browser.close()}
})().catch(e=>{console.error('SMOKE V011 FAIL',e.stack||String(e));process.exitCode=1});
