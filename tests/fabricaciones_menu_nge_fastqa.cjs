'use strict';
// Playwright: genuine GenesisPreparation menu and NGE-generated recipe on the actual game HTML.
// This fast view deliberately skips village loading; screenshot is not a full 3D playthrough.
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const out=path.resolve(root,'previews/fabricaciones-real-game');
 fs.mkdirSync(out,{recursive:true});
 const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
   const full=fs.readFileSync(path.join(root,'index.html'),'utf8');
   const engineScript=full.match(/<script id="genesis-prototype-engines">([\s\S]*?)<\/script>/i)?.[1];
   assert.ok(engineScript&&engineScript.includes('window.GenesisPrototypeEngines'),'Original NGE script missing');
   const html=full.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
   await page.route('**/*',async route=>{
     const u=new URL(route.request().url());
     if(u.pathname==='/'||u.pathname==='/index.html')return route.fulfill({status:200,contentType:'text/html',body:html});
     const p=path.resolve(root,'.'+decodeURIComponent(u.pathname));
     if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())return route.abort();
     const ext=path.extname(p),mime={'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
     return route.fulfill({status:200,contentType:mime[ext]||'application/octet-stream',body:fs.readFileSync(p)});
   });
   await page.goto('http://genesis.local/index.html',{waitUntil:'domcontentloaded'});
   for(const name of ['preparacion.css','responsive.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,name),'utf8')});
   await page.evaluate(()=>{window.GenesisDevice={safePreviews:true};for(const id of ['loading','prototypeIntro']){const e=document.getElementById(id);if(e)e.style.display='none';}});
   await page.addScriptTag({content:engineScript});
   await page.addScriptTag({content:fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8')});
   const data=await page.evaluate(()=>{
     const engine=window.GenesisPrototypeEngines;
     const session=engine.generateSession('Herrero');
     const formula=session.formulas.espada_hierro;
     const stock={...session.stock};
     for(const r of formula.materials)stock[r.material]=Math.max(stock[r.material]||0,r.qty);
     const recipeList=Object.entries(session.formulas).flatMap(([id,f])=>{
       const recipe=engine.recipes[id],family=id==='espada_hierro'?'Espada':id==='escudo_hierro'?'Escudo':'';
       return family?[{id,family,subfamily:recipe.name,formula:f}]:[];
     });
     window.__fabQA={engine,session,stock,craft:null};
     window.GenesisPreparation.open({
       profession:'Herrero',inventory:stock,requiredStock:session.requiredStock||session.stock,
       formula,recipeName:engine.recipes.espada_hierro.name,startTab:'Fabricaciones',
       getItems:()=>window.__fabQA.craft?[window.__fabQA.craft]:[],
       getRecipeCatalog:()=>recipeList,
       canCraftRecipe:id=>id==='espada_hierro',
       onCraft:()=>{},
       onCraftRecipe:id=>{
         if(id!=='espada_hierro'||!window.GenesisPreparation.ready(formula,stock))throw Error('Uncraftable recipe');
         const raw=engine.fabricate(id,{craft:1,artisan:'Artesano del prototipo',formula});
         window.__fabQA.craft=engine.present(raw,new Set());
       },
       renderAsset:()=>'',recipeAsset:id=>id==='espada_hierro'
         ?'<img alt="Espada de hierro V175 V12B · render aprobado" src="./previews/fabricaciones-real-game/V12B_reference.png">'
         :'',
       modal(html,cl){
         const m=document.getElementById('modal');m.className='modal '+cl;m.innerHTML=html;
         document.getElementById('modalLayer').style.display='grid';
       },
       closeModal(){document.getElementById('modalLayer').style.display='none'}
     });
     return {recipe:engine.recipes.espada_hierro.name,formula,stock};
   });
   await page.waitForSelector('.prepArtboard[data-active-tab="Fabricaciones"]',{timeout:12000});
   await page.waitForFunction(()=>{const img=document.querySelector('.workspaceRecipeHero img');return img?.complete&&img.naturalWidth>0},null,{timeout:15000});
   const ui=await page.evaluate(()=>({tab:window.GenesisPreparation.activeTab(),families:[...document.querySelectorAll('.workspaceRecipeFamily')].map(e=>({text:e.querySelector('h4')?.textContent,locked:e.classList.contains('is-locked')})),poster:document.querySelector('.workspaceRecipeHero img')?.naturalWidth,bars:[...document.querySelectorAll('.fabricationDemoBar')].map(e=>({name:e.dataset.ptName,value:e.querySelector('b')?.textContent})),button:!document.getElementById('prepStart').disabled}));
   assert.equal(ui.tab,'Fabricaciones');assert.equal(ui.button,true);assert.ok(ui.poster>0);
   assert.ok(ui.families.find(x=>x.locked),'Escudo should be quest-locked');
   await page.screenshot({path:path.join(out,'FABRICACIONES_MENU_REAL_QA.png'),animations:'disabled',timeout:20000});
   await page.locator('#prepStart.workspaceAction').click({force:true});
   const crafted=await page.evaluate(()=>window.__fabQA.craft);
   assert.ok(crafted&&crafted.recipe==='espada_hierro','Real NGE must create iron sword');
   fs.writeFileSync(path.join(out,'FABRICACIONES_MENU_REAL_QA.json'),JSON.stringify({mode:'original index HTML + actual NGE + actual controller, scene preloading skipped',data,ui,crafted:{name:crafted.name,recipe:crafted.recipe,rarity:crafted.rarity},errors},null,2));
   console.log('PASS GENESIS_REAL_NGE_FABRICACIONES_MENU',JSON.stringify({ui,created:crafted.name}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
