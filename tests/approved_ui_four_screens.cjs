'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'previews','approved-ui-four-screens');
fs.mkdirSync(out,{recursive:true});
const arts={
 Preparacion:['assets/ui/approved/Preparacion_APROBADA_1672x941.png','dabe6157e8c4c26fb1785ae94b494cae4e073f7448ca460f65515880e650dd77'],
 Fabricaciones:['assets/ui/approved/Fabricaciones_V07_APROBADA_1672x941.png','55464a0de649f538700101d110504fe2f66afbf875288af2e484dd875a4bcb7f'],
 Inventario:['assets/ui/approved/Inventario_V11_APROBADO_1672x941.png','e2e70033efaa8a20a3ab8b3ea332228831bedfa6a6a99e8d442220e17408d2e9']
};
for(const [name,[file,hash]] of Object.entries(arts)){
 const b=fs.readFileSync(path.join(root,file));
 assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash,`${name}: PNG changed`);
 assert.equal(b.readUInt32BE(16),1672);assert.equal(b.readUInt32BE(20),941);
}
assert.match(fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8'),/GenesisApprovedUI\.render/);
const issues=[];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  page.on('pageerror',e=>issues.push('JS '+e.message));
  page.on('requestfailed',r=>issues.push('RESOURCE '+r.url()+' '+r.failure()?.errorText));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body style="margin:0;background:#080605"><div id="modalLayer" style="position:fixed;inset:0;display:grid;place-items:center"><div id="modal" class="modal"></div></div></body></html>'});
   const p=path.resolve(root,decodeURIComponent(u.pathname).replace(/^\/+/,''));
   if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())return route.abort('failed');
   const ext=path.extname(p);return route.fulfill({status:200,contentType:ext==='.png'?'image/png':ext==='.jpg'?'image/jpeg':ext==='.glb'?'model/gltf-binary':ext==='.css'?'text/css':'application/javascript',body:fs.readFileSync(p)});
  });
  await page.goto('http://genesis.local/');
  await page.addStyleTag({content:fs.readFileSync(path.join(root,'genesis_ui_approved.css'),'utf8')});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'genesis_ui_approved.js'),'utf8')});
  await page.evaluate(()=>{
   window.GenesisDevice={safePreviews:true};
   const item={id:'s1',name:'Espada de hierro',recipe:'espada_hierro',rarity:'Común',channels:[['Base',30],['Fuego',15]],formula:{materials:[{material:'Lingote de hierro',qty:2}]}};
   const shield={id:'e1',name:'Escudo de hierro',recipe:'escudo_hierro',rarity:'Bueno',channels:[['Base',28]],formula:{materials:[{material:'Lingote de hierro',qty:2}]}};
   const recipes=[{id:'espada_hierro',subfamily:'Espada de hierro',family:'Espadas',formula:{materials:[{material:'Lingote de hierro',qty:2},{material:'Madera seca de roble',qty:1}]}},{id:'escudo_hierro',subfamily:'Escudo de hierro',family:'Escudos',formula:{materials:[{material:'Lingote de hierro',qty:2}]}}];
   const ctx={profession:'Herrero',inventory:{'Mineral de hierro':3,'Lingote de hierro':6,'Madera seca de roble':4},getItems:()=>[item,shield],getRecipeCatalog:()=>recipes,activeRecipeId:'espada_hierro',selectedRecipeId:'espada_hierro',count:1,canCraftRecipe:()=>true,canCraftNow:()=>true,
     modal(html,cls){const m=document.getElementById('modal');m.className='modal '+cls;m.innerHTML=html;},
     renderAsset:i=>'<img src="assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png" alt="'+i.name+'">',
     recipeAsset:()=>'<img src="assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png" alt="receta">',
     metricForChannel:(i,c,j)=>({label:j===0?'Daño base':'Daño de '+c[0],display:j===0?String(c[1]):'+'+c[1]+'%'})};
   const nav={renderMenu(){window.__LAST_NAV__='Preparacion';window.GenesisApprovedUI.render(ctx,nav,'Preparacion')},renderWorkspace(tab){window.__LAST_NAV__=tab;if(tab!=='Comparacion')window.GenesisApprovedUI.render(ctx,nav,tab)},start(){window.__START__=true},craft(){window.__CRAFT__=ctx.selectedRecipeId},close(){window.__CLOSE__=true}};
   window.__CTX__=ctx;window.__NAV__=nav;
   window.GenesisApprovedUI.render(ctx,nav,'Inventario');
  });
  await page.waitForSelector('.gApproved-Inventario');
  assert.equal(await page.locator('.gApprovedSlot').count(),20);
  assert.equal(await page.locator('.gApprovedHit[data-go]').count(),5);
  assert.equal(await page.locator('.gApprovedSlot:not(:disabled)').count(),3);
  assert.equal(await page.locator('.gApprovedInfoValues span').first().innerText(),'Mineral de hierro');
  assert.equal(await page.locator('.gApprovedSheet').count(),0);
  assert.equal(await page.locator('.genInvChannels').count(),0,'No channels in Inventory');
  const background=await page.locator('.gApprovedBoard').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert(background.includes('Inventario_V11_APROBADO_1672x941.png'));
  await page.screenshot({path:path.join(out,'01-inventario-v11-1600x900.png'),animations:'disabled'});
  await page.locator('[data-family="Espadas"]').click();
  assert.equal(await page.locator('.gApprovedSlot:not(:disabled)').count(),1);
  await page.locator('#gApprovedInfoButton').click();
  assert.equal(await page.locator('.gApprovedSheet').count(),1);
  assert.match(await page.locator('.gApprovedSheet').innerText(),/Daño de Fuego/);
  await page.locator('#gApprovedSheetClose').click();
  await page.locator('[data-go="Preparacion"]').click();
  assert.equal(await page.locator('.gApproved-Preparacion').count(),1);
  assert.equal(await page.locator('.gApprovedPrepSlot').count(),3);
  await page.screenshot({path:path.join(out,'02-preparacion-1600x900.png'),animations:'disabled'});
  await page.locator('#gPrepAction').click();assert.equal(await page.evaluate(()=>window.__START__),true);
  await page.locator('[data-go="Fabricaciones"]').click();
  assert.equal(await page.locator('.gApproved-Fabricaciones').count(),1);
  await page.screenshot({path:path.join(out,'03-fabricaciones-v07-1600x900.png'),animations:'disabled'});
  await page.locator('#gApprovedCraftAction').click();assert.equal(await page.evaluate(()=>window.__CRAFT__),'espada_hierro');
  await page.locator('[data-recipe="escudo_hierro"]').click();
  assert.equal(await page.locator('.gApprovedRecipeHeroSwap').count(),1);
  // Regression: V07 must honor the game engine's quest lock even if a
  // recipe has sufficient stock and an over-permissive canCraftRecipe callback.
  await page.evaluate(()=>{
    const recipe=window.__CTX__.getRecipeCatalog().find(r=>r.id==='espada_hierro');
    recipe.questLocked=true;window.__CTX__.selectedRecipeId=recipe.id;
    window.__NAV__.renderWorkspace('Fabricaciones');
  });
  assert.equal(await page.locator('#gApprovedCraftAction').isDisabled(),true,'Quest-locked recipe must never craft');
  assert.equal(await page.locator('button[data-recipe="espada_hierro"]').isDisabled(),true,'Quest-locked recipe must not activate');
  assert.match(await page.locator('.gApprovedCraftState').innerText(),/Bloqueada por misión/);
  await page.evaluate(()=>{window.__CTX__.getRecipeCatalog().find(r=>r.id==='espada_hierro').questLocked=false;window.__CTX__.selectedRecipeId='escudo_hierro';window.__NAV__.renderWorkspace('Fabricaciones')});
  await page.screenshot({path:path.join(out,'04-fabricaciones-escudo-1600x900.png'),animations:'disabled'});
  await page.setViewportSize({width:1280,height:720});
  await page.locator('[data-go="Inventario"]').click();
  await page.screenshot({path:path.join(out,'05-inventario-v11-1280x720.png'),animations:'disabled'});
  const ratio=await page.locator('.gApprovedBoard').evaluate(e=>{const r=e.getBoundingClientRect();return r.width/r.height});
  assert(Math.abs(ratio-1672/941)<.005);
  // Verificar la ruta real del controlador: carga diferida, Preparación e Inventario.
  await page.evaluate(()=>{delete window.GenesisApprovedUI;document.getElementById('modal').innerHTML='';});
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8')});
  await page.evaluate(()=>{
    const ctx=window.__CTX__;
    window.GenesisPreparation.open({...ctx,requiredStock:{'Lingote de hierro':2},
      formula:{materials:[{material:'Lingote de hierro',qty:2}]},
      onCraft(){window.__REAL_CRAFT__=true},onCraftRecipe(id){window.__REAL_CRAFT_RECIPE__=id},closeModal(){document.getElementById('modal').innerHTML='';}});
  });
  await page.waitForSelector('.gApproved-Preparacion',{timeout:12000});
  assert.equal(await page.evaluate(()=>window.GenesisPreparation.activeTab()),'Preparacion');
  assert.equal(await page.evaluate(()=>window.GenesisPreparation.navigate('Inventario')),true);
  await page.waitForSelector('.gApproved-Inventario');
  assert.equal(await page.evaluate(()=>window.GenesisPreparation.activeTab()),'Inventario');
  assert.equal(await page.evaluate(()=>window.GenesisPreparation.navigate('Fabricaciones')),true);
  await page.waitForSelector('.gApproved-Fabricaciones');
  await page.locator('#gApprovedCraftAction').click();
  assert.equal(await page.evaluate(()=>window.__REAL_CRAFT_RECIPE__),'escudo_hierro',
    'Fabricar must invoke the actual procedural crafting callback with selected recipe');
  assert.equal(issues.length,0,issues.join('\n'));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result:'PASS',artwork:'EXACT SHA256',screens:['Inventario V11','Preparación','Fabricaciones V07'],resultScreen:'Existing dynamic renderItemCard; provisional, not visually approved',ratio,issues},null,2));
  console.log('PASS GENESIS_THREE_APPROVED_ARTWORKS_INTEGRATED',JSON.stringify({ratio,slots:20,issues}));
 }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||err);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result:'FAIL',error:String(err.stack||err),issues},null,2));process.exit(1)});
