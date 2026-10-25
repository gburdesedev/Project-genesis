// Verify mobile resource admission in Chromium and WebKit. This does not
// reproduce an iPhone's physical memory limit or run the full WebGL scene.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
(async()=>{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
  page.setDefaultTimeout(10000);
  const requests=[];await page.route('**/*',route=>{requests.push(route.request().url());return route.abort()});
  await page.setContent(html.replace('<head>','<head><base href="https://genesis.test/">'));
  for(const file of ['preparacion.css','responsive.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  for(const file of ['device_policy.js','preparacion_control.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
  await page.evaluate(()=>{
   GenesisDevice.configureApp(document.querySelector('pc-app'));
   document.querySelector('#loading').style.display='none';document.querySelector('#prototypeIntro').style.display='none';
   window.inventory={'Mineral de hierro':10,'Lingote de hierro':2};
   window.openTestMenu=()=>GenesisPreparation.open({profession:'Herrero',recipeName:'Espada de hierro',inventory,requiredStock:{'Lingote de hierro':3},formula:{materials:[{material:'Lingote de hierro',qty:3}]},onCraft(){},closeModal(){document.querySelector('#modalLayer').style.display='none';document.documentElement.classList.remove('modalOpen')},modal(html,extra){const box=document.querySelector('#modal');box.className='modal '+extra;box.innerHTML=html;document.querySelector('#modalLayer').style.display='grid';document.documentElement.classList.add('modalOpen')}});
   openTestMenu();
  });
  assert.equal(await page.locator('pc-app').getAttribute('max-pixel-ratio'),'1.5');
  for(let round=0;round<3;round++){
   assert.equal(await page.locator('model-viewer').count(),0);
   assert.equal(await page.locator('.prepSkinPiece[src]').count(),0);
   assert(await page.locator('.prepMaterialPoster').count()>0);
   await page.locator('#prepMore').click();assert.equal(await page.locator('.prepSkinQty b').textContent(),'2');
   await page.setViewportSize({width:844,height:390});
   await page.locator('#rotate').waitFor({state:'hidden'});
   assert.equal(await page.locator('.prepSkinQty b').textContent(),'2');
   const overflow=await page.locator('#modal').evaluate(el=>el.scrollWidth>el.clientWidth+2);assert.equal(overflow,false);
   await page.locator('#prepStart').scrollIntoViewIfNeeded();await page.locator('#prepStart').click();
   assert.equal(await page.locator('.prepSkinBellowButtons button').count(),3);
   await page.locator('#prepBellow1').scrollIntoViewIfNeeded();await page.locator('#prepBellow1').click();
   await page.locator('#prepClose').scrollIntoViewIfNeeded();await page.locator('#prepClose').click();
   await page.setViewportSize({width:390,height:844});await page.locator('#rotate').waitFor({state:'visible'});
   await page.evaluate(()=>openTestMenu());
  }
  assert.equal(requests.filter(url=>/\.glb/.test(url)).length,0,'mobile menu must not request GLB or hidden desktop skin assets');
  console.log(`PASS ${name}: mobile posters only, no hidden layers/GLB, 1.5 DPR cap, orientation, repeated menu use and thermal controls`);
  await browser.close();
 }
})().catch(error=>{console.error(error);process.exit(1)});
