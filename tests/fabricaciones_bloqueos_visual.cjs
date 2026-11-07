'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const out=path.resolve(root,'artifacts/fabricaciones-bloqueos');fs.mkdirSync(out,{recursive:true});
  try {
    const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
    await page.route('**/*',async route=>{
      const u=new URL(route.request().url());
      if(u.pathname==='/'||u.pathname==='/index.html')return route.fulfill({status:200,contentType:'text/html',body:html});
      const f=path.resolve(root,'.'+decodeURIComponent(u.pathname));
      if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.abort();
      const ext=path.extname(f),mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg'};
      return route.fulfill({status:200,contentType:mime[ext]||'application/octet-stream',body:fs.readFileSync(f)});
    });
    await page.goto('http://genesis.local/index.html');
    for(const f of ['preparacion.css','responsive.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,f),'utf8')});
    await page.evaluate(()=>{window.GenesisDevice={safePreviews:true};['loading','prototypeIntro'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none'})});
    await page.addScriptTag({content:fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8')});
    await page.evaluate(()=>{
      const recipes=[
        {id:'espada',family:'Espadas',subfamily:'Espada de hierro',formula:{materials:[{material:'Lingote de hierro',qty:2}]}},
        {id:'escudo',family:'Escudos',subfamily:'Escudo de hierro',formula:{materials:[{material:'Lingote de hierro',qty:6}]}},
        {id:'armadura',family:'Armaduras',subfamily:'Armadura de hierro',formula:{materials:[{material:'Lingote de hierro',qty:1}]},questLocked:true}
      ];
      window.GenesisPreparation.open({
        profession:'Herrero',inventory:{'Lingote de hierro':3,'Mineral de hierro':1},
        requiredStock:{'Lingote de hierro':2},formula:recipes[0].formula,
        recipeName:'Espada de hierro',startTab:'Fabricaciones',
        getItems:()=>[],getRecipeCatalog:()=>recipes,canCraftRecipe:id=>id!=='armadura',
        onCraft:()=>{},onCraftRecipe:()=>{},renderAsset:()=>'',recipeAsset:()=>'<div>VISOR DE PRUEBA</div>',
        modal(html,cls){const e=document.querySelector('#modal');e.className='modal '+cls;e.innerHTML=html;document.querySelector('#modalLayer').style.display='grid'},
        closeModal(){document.querySelector('#modalLayer').style.display='none'}
      });
    });
    await page.waitForSelector('.workspaceRecipeFamily');
    assert.equal(await page.locator('.workspaceRecipeFamily').count(),3,'Three families from actual supplied catalog');
    assert.equal(await page.locator('.workspaceRecipeFamily.is-locked').count(),2,'Two inaccessible families locked');
    assert.equal(await page.locator('.workspaceRecipeChoice.is-locked').count(),2,'Two inaccessible recipes locked');
    assert.equal(await page.locator('.workspaceRecipeChoice:disabled').count(),2,'Blocked actions disabled');
    assert.equal(await page.locator('.workspaceRecipeLock').count(),4,'Each blocked family/recipe has padlock');
    assert.equal(await page.locator('#prepStart').isDisabled(),false,'Ready sword remains craftable');
    await page.screenshot({path:path.join(out,'fabricaciones-candados-demo.png'),fullPage:false});
    console.log('PASS visual UI: recipe lock state and original CSS art; screenshot saved.');
  } finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
