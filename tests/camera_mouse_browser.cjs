const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:480,height:360}});
 page.setDefaultTimeout(10000);
 await page.setContent('<div id="world" style="position:fixed;inset:0;background:#123"></div><div id="hud"></div>');
 await page.addScriptTag({path:path.join(__dirname,'../camera_mouse.js')});
 await page.evaluate(()=>{
  window.totalRotation=0;window.active=true;
  window.controller=GenesisMouseCapture.create({surface:document.querySelector('#world'),hud:document.querySelector('#hud'),allowed:()=>active,blocked:()=>false,mode:()=> 'free',rotate:x=>totalRotation+=x});
 });
 await page.locator('#world').click({position:{x:100,y:100}});
 console.log('Native lock requested',await page.evaluate(()=>({locked:document.pointerLockElement?.id,focus:document.hasFocus()})));
 await page.waitForFunction(()=>document.pointerLockElement?.id==='world');
 await page.mouse.move(100,100);
 for(let i=0;i<10;i++)await page.mouse.move(100+(i+1)*200,100);
 assert(await page.evaluate(()=>totalRotation>1000),'camera must keep receiving movement beyond a 480px viewport');
 await page.setViewportSize({width:320,height:568});
 assert(await page.evaluate(()=>document.pointerLockElement?.id==='world'));
 await page.evaluate(()=>{active=false;controller.refresh()});
 await page.waitForFunction(()=>document.pointerLockElement===null);
 await browser.close();
 console.log('PASS native Chromium: capture, motion outside small viewport, resize while captured, menu release');
})().catch(e=>{console.error(e);process.exit(1)});
