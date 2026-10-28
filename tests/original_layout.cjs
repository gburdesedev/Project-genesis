// Compare normalized artwork positions, not a redesigned mobile layout.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out='/tmp/genesis-responsive';fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'').replace('<head>','<head><base href="https://genesis.test/">');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({hasTouch:true,isMobile:true,viewport:{width:844,height:390}});page.setDefaultTimeout(10000);
 await page.route('**/*',route=>{const pathname=new URL(route.request().url()).pathname;const file=path.join(root,pathname);if(pathname.endsWith('.png')&&file.startsWith(root)&&fs.existsSync(file))return route.fulfill({body:fs.readFileSync(file),contentType:'image/png'});return route.abort()});
 await page.setContent(html);
 for(const file of ['preparacion.css','responsive.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,file),'utf8')});
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'device_policy.js'),'utf8')});
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8')});
 await page.evaluate(()=>{document.querySelector('#loading').style.display='none';document.querySelector('#prototypeIntro').style.display='none';GenesisPreparation.open({profession:'Herrero',recipeName:'Espada de hierro',inventory:{'Mineral de hierro':10,'Lingote de hierro':2},requiredStock:{'Lingote de hierro':3},formula:{materials:[{material:'Lingote de hierro',qty:3}]},onCraft(){},closeModal(){document.querySelector('#modalLayer').style.display='none'},modal(html,extra){const box=document.querySelector('#modal');box.className='modal '+extra;box.innerHTML=html;document.querySelector('#modalLayer').style.display='grid'}})});
 async function composition(selector,left,top,width,height){
  const r=await page.locator(selector).evaluate(el=>{const a=el.closest('.prepArtboard').getBoundingClientRect(),r=el.getBoundingClientRect();return [(r.left-a.left)/a.width,(r.top-a.top)/a.height,r.width/a.width,r.height/a.height]});
  [left,top,width,height].forEach((n,i)=>assert(Math.abs(r[i]-n)<.003,`${selector} changed original position: ${r}`));
 }
 for(const [width,height] of [[390,844],[844,390],[1366,768],[1920,1080]]){
  await page.setViewportSize({width,height});
  await page.waitForFunction(()=>{const a=document.querySelector('.prepArtboard').getBoundingClientRect(),w=document.querySelector('.prepSkinScroll').getBoundingClientRect();return a.width<=innerWidth&&a.height<=innerHeight&&Math.abs(a.width/a.height-1.5)<.005&&Math.abs(w.width/w.height-16/9)<.005&&a.left>=w.left&&a.right<=w.right+1});
  await composition('.prepSkinDetails',.751,.206,.221,.529);
  await composition('.prepSkinFeatured',.395,.274,.326,.28);
  await composition('#prepStart',1137/1536,777/1024,378/1536,122/1024);
  assert.equal(await page.locator('.prepSkinSlot.empty').first().isVisible(),true);
  assert.equal(await page.locator('.prepSkinPiece').first().isVisible(),true);
  assert.equal(await page.locator('.prepCompactTitle').isVisible(),false);
  const separated=await page.locator('.prepSkinQty>div').evaluate(el=>{const [less,value,more]=[...el.children].map(c=>c.getBoundingClientRect());return less.right<value.left&&value.right<more.left&&value.width>=value.height});
  assert(separated,'quantity must have its own centered space between controls');
  if(width===844){await page.evaluate(()=>Promise.all([...document.images].filter(i=>i.closest('.prepSkinModal')).map(i=>i.decode().catch(()=>{}))));await page.screenshot({path:`${out}/v0.11.003-original-menu-landscape.png`})}
 }
 await page.setViewportSize({width:844,height:390});await page.locator('#prepStart').click();
 await composition('.prepSkinCenter',.394,.21,.323,.66);
 await composition('.prepSkinDetails',.751,.206,.221,.529);
 await page.screenshot({path:`${out}/v0.11.003-original-minigame-landscape.png`});
 await browser.close();console.log('PASS original artwork composition: fixed asset positions, uniform scale, frames and minigame restored');
})().catch(e=>{console.error(e);process.exit(1)});
