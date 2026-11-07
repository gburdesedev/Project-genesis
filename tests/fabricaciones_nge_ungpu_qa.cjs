'use strict';
// QA del menú REAL dentro del HTML del juego y motor NGE original.
// Se omite exclusivamente el arranque WebGL de la aldea para impedir el bloqueo de capturas.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {spawn}=require('child_process'),{chromium}=require('playwright');
const out=path.resolve('previews/fabricaciones-real-game');fs.mkdirSync(out,{recursive:true});
const report={kind:'actual index.html UI/controller and original NGE engine; GPU village omitted; approved V12B PNG preview, no approved GLB yet',screens:[],errors:[],status:'RUNNING'};
const save=()=>fs.writeFileSync(path.join(out,'ui-qa-report.json'),JSON.stringify(report,null,2));
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));let browser,page;
(async()=>{
 await wait(1200);
 browser=await chromium.launch({headless:true});
 page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>report.errors.push(String(e).slice(0,250)));
 await page.addInitScript(()=>{window.GenesisDevice={safePreviews:true};});
 const index=fs.readFileSync('index.html','utf8');
 const engineScript=index.match(/<script id="genesis-prototype-engines">([\s\S]*?)<\/script>/);
 assert(engineScript,'Genuine NGE engine missing from index.html');
 await page.route('**/index.html*',async route=>{
  const response=await route.fetch();
  let html=await response.text();
  // Preserve all HTML and CSS from game but never start the 3D game, preloaders or modules.
  html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  html=html.replace('<head>','<head><style>pc-app{display:none!important}#loading,#prototypeIntro{display:none!important}</style>');
  await route.fulfill({response,body:html,headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 try{
  await page.goto('http://127.0.0.1:8765/index.html?qa=real-fab-ui',{waitUntil:'domcontentloaded',timeout:35000});
  await page.addStyleTag({content:fs.readFileSync('preparacion.css','utf8')});
  await page.addStyleTag({content:fs.readFileSync('responsive.css','utf8')});
  await page.addScriptTag({content:engineScript[1]});
  await page.addScriptTag({content:fs.readFileSync('preparacion_control.js','utf8')});
  report.realEngine=await page.evaluate(()=>({
    hasEngine:!!window.GenesisPrototypeEngines?.generateSession,
    hasController:!!window.GenesisPreparation?.open,
    pbrPoster:'V175 V12B approved static image (not GLB)'
  }));
  report.session=await page.evaluate(()=>{
   const engine=window.GenesisPrototypeEngines;
   const session=engine.generateSession('Herrero',{seed:112358});
   const activeRecipe='espada_hierro';
   const formula=session.formulas[activeRecipe];
   if(!formula?.materials?.length)throw Error('Generated formula missing');
   const recipes=Object.entries(session.formulas).filter(([id])=>engine.recipes[id]?.profession==='Herrero')
    .map(([id,form])=>({id,family:engine.recipes[id].type+'s',subfamily:engine.recipes[id].name,formula:form}));
   const stock={...session.stock};
   for(const m of formula.materials)stock[m.material]=Math.max(Number(stock[m.material]||0),m.qty);
   const crafted=[];
   const image='<img class="qaV12B" src="./previews/fabricaciones-real-game/V12B_reference.png" alt="Espada de hierro V175-V12B aprobada">';
   const showModal=(html,cls='')=>{const el=document.getElementById('modal');el.className='modal '+cls;el.innerHTML=html;document.getElementById('modalLayer').style.display='grid';};
   window.__FAB_ACTIVE_QA__={crafted,stock,session,formula,recipes,engine,showModal};
   const onCraftRecipe=id=>{
      if(id!==activeRecipe||!window.GenesisPreparation.ready(formula,stock))return;
      for(const mat of formula.materials)stock[mat.material]-=mat.qty;
      const raw=engine.fabricate(id,{craft:1,artisan:'Artesano del prototipo',formula});
      const it=engine.present(raw,new Set());crafted.push(it);
      const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
      showModal('<div class="craftHeader"><div><div class="questTag">CIERRE DE FABRICACIÓN · MOTOR NGE</div><div class="recipe">Resultado certificado</div></div></div>'+
       '<div class="craftPlanner"><section class="craftPreview"><h2>'+esc(it.name)+'</h2>'+image+'</section>'+
       '<section class="craftPlanPanel"><h3>'+esc(it.rarity)+'</h3><div>Receta: '+esc(it.recipe)+'</div>'+
       '<div>Canales: '+esc((it.channels||[]).map(c=>c[0]+' '+c[1]).join(' · '))+'</div>'+
       '<p>Resultado calculado por el motor NGE del juego.</p></section></div><div class="actions"><button id="resultContinue">Continuar</button></div>','craftModal');
   };
   window.GenesisPreparation.open({
     profession:'Herrero',inventory:stock,requiredStock:session.requiredStock||session.stock,
     formula,recipeName:engine.recipes[activeRecipe].name,startTab:'Fabricaciones',
     getItems:()=>crafted,getRecipeCatalog:()=>recipes,canCraftRecipe:id=>id===activeRecipe,
     onCraft:()=>{},onCraftRecipe,renderAsset:()=>image,recipeAsset:()=>image,
     modal:showModal,closeModal(){document.getElementById('modalLayer').style.display='none'}
   });
   return {id:activeRecipe,formula,stockBefore:{...stock},knownRecipes:recipes.map(x=>x.id)};
  });
  await page.waitForSelector('.prepArtboard[data-active-tab="Fabricaciones"]',{timeout:13000});
  await page.waitForFunction(()=>{const img=document.querySelector('.workspaceRecipeHero img');return img?.complete&&img.naturalWidth>0},null,{timeout:12000});
  report.menu=await page.evaluate(()=>({tab:window.GenesisPreparation.activeTab(),families:[...document.querySelectorAll('.workspaceRecipeFamily')].map(e=>({family:e.querySelector('h4')?.textContent,locked:e.classList.contains('is-locked')})),bars:[...document.querySelectorAll('.fabricationDemoBar')].map(e=>({name:e.dataset.ptName,progress:e.querySelector('b')?.textContent})),materialRows:[...document.querySelectorAll('.workspaceMetric')].map(e=>e.innerText),posterWidth:document.querySelector('.workspaceRecipeHero img').naturalWidth,canCraft:!document.querySelector('#prepStart.workspaceAction').disabled}));
  assert.equal(report.menu.tab,'Fabricaciones');assert(report.menu.canCraft);
  await page.screenshot({path:path.join(out,'04-fabricaciones-controlador-real-nge.png'),timeout:16000});
  report.screens.push('04-fabricaciones-controlador-real-nge.png');
  await page.locator('#prepStart.workspaceAction').click();
  await page.waitForSelector('#resultContinue',{timeout:10000});
  report.crafted=await page.evaluate(()=>window.__FAB_ACTIVE_QA__.crafted.map(it=>({name:it.name,recipe:it.recipe,rarity:it.rarity,channels:it.channels})));
  assert.equal(report.crafted.length,1);
  assert.equal(report.crafted[0].recipe,'espada_hierro');
  await page.waitForFunction(()=>{const img=document.querySelector('.qaV12B');return img?.complete&&img.naturalWidth>0},null,{timeout:12000});
  await page.screenshot({path:path.join(out,'05-fabricacion-resultado-nge-real.png'),timeout:16000});
  report.screens.push('05-fabricacion-resultado-nge-real.png');
  report.status='SUCCESS_UI_REAL_NGE_NO_3D_VILLAGE';save();console.log('FAB_REAL_UI_NGE_SUCCESS',JSON.stringify(report));
 }catch(e){report.status='FAIL';report.errors.push(String(e.stack||e));save();try{await page.screenshot({path:path.join(out,'99-ui-error.png'),timeout:12000})}catch{}throw e}
 finally{save();await browser.close();server.kill()}
})().catch(e=>{console.error('FAB_REAL_UI_NGE_ERROR',e);process.exitCode=1});
