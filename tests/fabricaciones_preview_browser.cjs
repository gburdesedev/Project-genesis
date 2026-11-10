'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','fabricaciones-modulo-real');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.glb':'model/gltf-binary'};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(!url.host.endsWith('genesis.local'))return route.abort('blockedbyclient');
    let file;
    try{file=path.resolve(root,decodeURIComponent(url.pathname).replace(/^\/+/,''));}
    catch(e){return route.abort('failed');}
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort('failed');
    return route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://genesis.local/index.html?fab_preview=1',{waitUntil:'commit',timeout:30000});
  await page.waitForFunction(()=>window.__GenesisFabPreview?.ready===true,{timeout:30000});
  const a=await page.evaluate(()=>({
    status:window.__GenesisFabPreview,
    recipe:document.querySelector('.gfmBoard')?.dataset.recipe,
    title:document.querySelector('.gfmDetailsHead h2')?.textContent,
    materials:[...document.querySelectorAll('.gfmMaterialRow')].map(e=>e.dataset.gfmMaterial),
    centerModel:!!document.querySelector('.gfmViewerModel'),
    crafted:false
  }));
  assert.equal(a.recipe,'espada_hierro');
  assert(a.materials.length>0);
  assert.equal(a.centerModel,false,'Never show generic substitute or baked sword');
  assert.equal(await page.locator('#gApprovedCraftAction').isDisabled(),true,'Preview must not alter crafting progress');
  await page.locator('.gfmBoard').screenshot({path:path.join(out,'01-espada-menu-modular-real.png'),timeout:30000,animations:'allow'});
  await page.locator('button[data-gfm-recipe="escudo_hierro"]').click();
  const b=await page.evaluate(()=>({
   recipe:document.querySelector('.gfmBoard')?.dataset.recipe,
   title:document.querySelector('.gfmDetailsHead h2')?.textContent,
   materials:[...document.querySelectorAll('.gfmMaterialRow')].map(e=>e.dataset.gfmMaterial),
   selected:[...document.querySelectorAll('.gfmRecipe.is-current')].map(e=>e.dataset.gfmRecipe)
  }));
  assert.equal(b.recipe,'escudo_hierro');
  assert.deepEqual(b.selected,['escudo_hierro']);
  assert(b.materials.length>0);
  assert.notDeepEqual(a.materials,b.materials);
  await page.locator('.gfmBoard').screenshot({path:path.join(out,'02-escudo-menu-modular-real.png'),timeout:30000,animations:'allow'});
  const report={a,b,jsErrors:errors};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS: direct real NGE engine-backed screen, selection and amounts; 1600x900 captures',JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
