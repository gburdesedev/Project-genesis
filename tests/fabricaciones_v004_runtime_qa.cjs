'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews/fabricaciones-v004-runtime');
fs.mkdirSync(out,{recursive:true});
for(const p of [
 'assets/ui/fabricaciones_ora_v004/Fabricaciones_Base_Limpia_V004.png',
 'assets/ui/fabricaciones_ora_v004/V015_REAL_SHIELD_ICON_RGBA.png',
 'assets/ui/fabricaciones_ora_v004/V015_REAL_SHIELD_CROPPED.png',
 'assets/ui/fabricaciones_ora_v004/01_iconos_material_hierro_v175_RGBA.png',
 'assets/ui/fabricaciones_ora_v004/05_marco_receta_seleccionada_ORIGINAL.png',
 'assets/ui/fabricaciones_ora_v004/V12B_CYCLES_SOURCE_ALPHA_EXPERIMENTAL.png',
 'assets/ui/fabricaciones_ora_v004/escudo_hierro_v015_PBR2K_WEBP_v022.glb',
 'assets/playcanvas/approved/equipment/espada_v03_hierro_v175_v12b_cycles_hdri32.png',
 'assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png',
 'genesis_fabricacion_modular_v004.js','genesis_fabricacion_modular_v004.css'
])assert(fs.existsSync(path.join(root,p)),p+' missing');
const issues=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  page.on('pageerror',e=>issues.push('PAGE '+e.message));
  page.on('requestfailed',r=>issues.push('REQUEST '+r.url()+' '+r.failure()?.errorText));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#090705"><div id="modalLayer" style="position:fixed;inset:0;display:grid;place-items:center"><div id="modal" class="modal"></div></div></body></html>'});
   const p=path.resolve(root,decodeURIComponent(u.pathname).replace(/^\/+/,''));
   if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())return route.fulfill({status:404,body:'NOT_FOUND'});
   const ext=path.extname(p).toLowerCase();
   return route.fulfill({status:200,contentType:({'.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary','.css':'text/css','.js':'text/javascript'})[ext]||'application/octet-stream',body:fs.readFileSync(p)});
  });
  await page.goto('http://genesis.local/');
  for(const p of ['genesis_ui_approved.css','genesis_fabricacion_modular_v004.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,p),'utf8')});
  await page.evaluate(()=>{window.GenesisExperimentalFabricacionV004=true;});
  for(const p of ['genesis_fabricacion_modular_v004.js','genesis_ui_approved.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,p),'utf8')});
  await page.evaluate(()=>{
    const catalog=[
      {id:'espada_hierro',subfamily:'Espada de hierro',family:'Espadas',formula:{materials:[
       {material:'Lingote de hierro',qty:2},{material:'Madera seca de roble',qty:1},{material:'Carbón vegetal',qty:1}]}},
      {id:'escudo_hierro',subfamily:'Escudo de hierro',family:'Escudos',formula:{materials:[
       {material:'Lingote de hierro',qty:2},{material:'Madera seca de roble',qty:1},{material:'Carbón vegetal',qty:1}]}}
    ];
    const ctx={
      profession:'Herrero',inventory:{'Lingote de hierro':6,'Madera seca de roble':4,'Carbón vegetal':2},
      getRecipeCatalog:()=>catalog,selectedRecipeId:'espada_hierro',activeRecipeId:'espada_hierro',
      canCraftRecipe:id=>id==='espada_hierro',
      modal(html,cls){const el=document.getElementById('modal');el.className='modal '+cls;el.innerHTML=html}
    };
    const nav={craft(){window.__CRAFT__=ctx.selectedRecipeId},renderMenu(){},renderWorkspace(tab){window.GenesisApprovedUI.render(ctx,nav,tab)},close(){}};
    window.__CTX__=ctx;window.__NAV__=nav;
    window.GenesisApprovedUI.render(ctx,nav,'Fabricaciones');
  });
  await page.waitForSelector('.gApproved-Fabricaciones[data-ora-modular="V004"]');
  const board=page.locator('.gApproved-Fabricaciones');
  const recipe=()=>board.getAttribute('data-recipe');
  assert.equal(await recipe(),'espada_hierro');
  assert.equal(await page.locator('.gFabRecipe.is-selected').count(),1);
  assert.equal(await page.locator('.gFabV175Category').count(),0,'V175 must be in ORA art, not CSS overlays');
  assert.equal(await page.locator('.gFabRecipeSymbol').count(),0,'No invented cross-swords/diamonds over original UI');
  assert.equal(await page.locator('img.gFabSelectedFrame').count(),1,'Only the selected recipe gets ORIGINAL V07 frame');
  assert.equal(await page.locator('img.gFabSelectedFrame[src*="05_marco_receta_seleccionada_ORIGINAL"]').count(),1);
  assert.equal(await page.locator('.gFabRecipeText').count(),2);
  const firstRowCSS=await page.locator('.gFabRecipe.is-selected').evaluate(el=>({background:getComputedStyle(el).backgroundImage,boxShadow:getComputedStyle(el).boxShadow,border:getComputedStyle(el).borderStyle}));
  assert.equal(firstRowCSS.background,'none','No CSS gradient or rectangular fill');
  assert.equal(firstRowCSS.boxShadow,'none','No CSS box shadow overlay');
  // Original material icon has been erased from the raster; never double-render a V175 asset.
  assert.equal(await page.locator('.gApprovedBoard').evaluate(e=>getComputedStyle(e).backgroundImage.includes('Fabricaciones_Base_Limpia_V004.png')),true);

  assert.equal(await page.locator('.gFabMaterials[data-count="3"] .gFabMat').count(),3);
  assert.equal(await page.locator('.gFabMatAsset img[src*="iron_v175_transparent"]').count(),1);
  assert.equal(await page.locator('.gFabMatAsset img[src*="carbon_vegetal_v011_poster"]').count(),1);
  assert.equal(await page.locator('.gFabSwordPoster[src*="V12B_CYCLES_SOURCE_ALPHA"]').count(),1);
  assert.equal(await page.locator('.gFabTitle h2').count(),1,'Exactly one title element in right panel');
  assert.equal((await page.locator('.gFabTitle h2').textContent()).trim(),'Espada de hierro');

  assert.equal(await page.locator('button#gApprovedCraftAction:enabled').count(),1);
  await page.waitForTimeout(800);
  await page.screenshot({path:path.join(out,'01-fabricaciones-espada-v12b-real-v004.png'),animations:'allow',timeout:35000});
  await page.locator('.gFabRecipe.is-selected').screenshot({path:path.join(out,'03-recuadro-seleccion-arte-ora.png')});
  await page.locator('.gFabStatus').screenshot({path:path.join(out,'04-estado-sin-recuadro-css.png')});
  await page.locator('#gApprovedCraftAction').click();
  assert.equal(await page.evaluate(()=>window.__CRAFT__),'espada_hierro');
  await page.evaluate(()=>{
    const c=window.__CTX__;
    c.activeRecipeId='escudo_hierro';
    c.canCraftRecipe=id=>id==='escudo_hierro';
    window.GenesisApprovedUI.render(c,window.__NAV__,'Fabricaciones');
  });
  assert.equal(await recipe(),'escudo_hierro','Ordan changes quest from sword to shield');
  assert.equal(await page.locator('.gFabRecipe.is-selected').count(),1);
  assert.equal(await page.locator('.gFabSelectedFrame').count(),1,'One ORA selection frame after switching to shield');
  assert.equal(await page.locator('.gFabShieldModel[src*="escudo_hierro_v015"]').count(),1);
  assert.equal(await page.locator('.gFabShieldPoster[src*="V015_REAL_SHIELD_CROPPED"]').count(),1);
  assert.equal(await page.locator('.gFabTitle h2').count(),1,'No duplicate right-side title for shield');
  assert.equal((await page.locator('.gFabTitle h2').textContent()).trim(),'Escudo de hierro');
  const headingFits=await page.locator('.gFabTitle h2').evaluate(el=>el.scrollWidth<=el.clientWidth+1);
  assert.equal(headingFits,true,'Right-panel shield title must fit fully without ellipsis');

  assert.equal(await page.locator('.gFabSwordPoster').count(),0,'Never leave old sword on shield screen');
  assert.equal(await page.locator('.gFabMaterials[data-count="3"] .gFabMat').count(),3);
  const overflow=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('.gFabMat')];
    return nodes.map(n=>{const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return {within:r.x>=p.x-1&&r.right<=p.right+1&&r.y>=p.y-1&&r.bottom<=p.bottom+1}});
  });
  assert(overflow.every(x=>x.within),'Ingredient rows must not overflow their material panel');
  await page.waitForTimeout(800);
  await page.screenshot({path:path.join(out,'02-fabricaciones-escudo-v015-real-v004.png'),animations:'allow',timeout:35000});
  await page.locator('#gApprovedCraftAction').click();
  assert.equal(await page.evaluate(()=>window.__CRAFT__),'escudo_hierro');
  await page.evaluate(()=>{
   window.__CTX__.inventory['Lingote de hierro']=0;
   window.GenesisApprovedUI.render(window.__CTX__,window.__NAV__,'Fabricaciones');
  });
  assert.equal(await page.locator('button#gApprovedCraftAction:disabled').count(),1,'No materials, no crafting');
  assert.equal(await page.locator('.gFabMat.is-missing').count(),1);
  assert.equal(await page.locator('.gFabStatus .gFabStatusBlocked').count(),1);
  const statusStyle=await page.locator('.gFabStatus').evaluate(el=>({background:getComputedStyle(el).backgroundColor,border:getComputedStyle(el).borderStyle}));
  assert.equal(statusStyle.background,'rgba(0, 0, 0, 0)','State must not introduce a black CSS rectangle');
  await page.locator('.gFabStatus').screenshot({path:path.join(out,'05-faltan-materiales-sin-rectangulo.png')});
  if(issues.length)throw Error('Browser errors: '+issues.join(' | '));
  // Public-facing lightweight preview uses the exact controller and real sprites.
  await page.goto('http://genesis.local/fabricaciones-v004-preview.html',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.gApproved-Fabricaciones[data-ora-modular="V004"]');
  assert.equal(await page.locator('.gApprovedBoard').getAttribute('data-recipe'),'espada_hierro');
  await page.locator('#previewShield').click();
  assert.equal(await page.locator('.gApprovedBoard').getAttribute('data-recipe'),'escudo_hierro');
  await page.locator('#previewStock').click();
  assert.equal(await page.locator('button#gApprovedCraftAction:disabled').count(),1);
  console.log('PUBLIC_PREVIEW_INDEPENDENT_LOADING_PASS');
  const report={state:'verified-interface-only',artwork:'experimental cropped approved V07',models:'real approved V12B image, V015 candidate binary',screens:2,noMixedRecipe:true,realMaterials:true,noOverlay:true,craftCallback:true,missingStockBlocksCraft:true,errors:issues};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS FABRICACIONES V004 RUNTIME',JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
