// Exercise the production DOM/CSS and preparation controller without loading
// the remote 3D scene. This verifies layout, not WebGL rendering or device input.
const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const output = '/tmp/genesis-responsive'; fs.mkdirSync(output, {recursive:true});
const html = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<link\b[^>]*>/gi, '');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 await page.route('**/*',route=>route.abort());
 for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1366,768],[1920,1080],[2560,1080]]){
  await page.setViewportSize({width,height});
  await page.setContent(html);
  await page.addStyleTag({content:fs.readFileSync(path.join(root,'preparacion.css'),'utf8')});
  await page.addStyleTag({content:fs.readFileSync(path.join(root,'responsive.css'),'utf8')});
  await page.evaluate(()=>{document.querySelector('#loading').style.display='none';document.querySelector('#prototypeIntro').style.display='none'});
  async function bounds(selector){
   const result=await page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,sw:el.scrollWidth,cw:el.clientWidth}});
   assert(result.left>=-1&&result.right<=width+1,`${width} ${selector} horizontal bounds ${JSON.stringify(result)}`);
   assert(result.sw<=result.cw+2,`${width} ${selector} horizontal overflow ${JSON.stringify(result)}`);
   return result;
  }
  await page.evaluate(()=>{const badge=document.querySelector('#tech');badge.classList.add('fpsCounter');badge.textContent='144 FPS · 6,9 ms'});
  await bounds('#tech');await bounds('#hud');await bounds('pc-app');
  // Real introduction is reachable at every size.
  await page.evaluate(()=>document.querySelector('#prototypeIntro').style.display='grid');
  await bounds('.protoIntroCard');
  await page.evaluate(()=>document.querySelector('#prototypeIntro').style.display='none');
  // Same production preparation logic and inventory state.
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8')});
  await page.evaluate(()=>{
   window.GenesisPreparation.open({profession:'Herrero',recipeName:'Espada de hierro',inventory:{'Mineral de hierro':10,'Lingote de hierro':2},requiredStock:{'Lingote de hierro':3},formula:{materials:[{material:'Lingote de hierro',qty:3}]},onCraft(){},closeModal(){document.querySelector('#modalLayer').style.display='none'},modal(html,extra){const box=document.querySelector('#modal');box.className='modal '+extra;box.innerHTML=html;document.querySelector('#modalLayer').style.display='grid'}});
  });
  const modal=await bounds('#modal');assert(modal.top>=-1&&modal.bottom<=height+1,`${width} modal vertical bounds`);
  await bounds('.prepArtboard');await bounds('.prepSkinScroll');
  await page.locator('#prepMore').click();
  assert.equal(await page.locator('.prepSkinQty b').textContent(),'2');
  await page.locator('#prepStart').scrollIntoViewIfNeeded();
  assert(await page.locator('#prepStart').isEnabled());
  await page.locator('#prepStart').click();
  await bounds('.prepArtboard');
  assert.equal(await page.locator('.prepSkinBellowButtons button').count(),3);
  await page.screenshot({path:`${output}/${width}x${height}-preparation.png`});
  await page.locator('#prepClose').click();
  // Side by side comparison becomes one column on narrow viewports.
  await page.evaluate(()=>{document.querySelector('#modal').className='modal';document.querySelector('#modal').innerHTML='<div class="compareScroll"><div class="compareGrid"><article class="itemCard"><h2>Espada de hierro</h2></article><article class="itemCard"><h2>Segunda fabricación</h2></article></div></div>';document.querySelector('#modalLayer').style.display='grid'});
  await bounds('.compareGrid');await bounds('#modal');
  console.log(`PASS ${width}x${height}: introduction, HUD, preparation menu + running + close, comparison`);
 }
 await browser.close();
})().catch(error=>{console.error(error);process.exitCode=1});
