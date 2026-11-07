'use strict';
// QA en navegador REAL: PlayCanvas, NGE y el controlador de Fabricaciones del juego.
// Sólo la respuesta HTML de esta prueba introduce un acceso directo al quest Q10.
// No publica estados, modifica guardados, simula resultados ni altera main.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const folder=path.resolve('previews/fabricaciones-real-game');
fs.mkdirSync(folder,{recursive:true});
const report={mode:'real PlayCanvas app / genuine NGE fabrication / QA quest shortcut',runAt:new Date().toISOString(),steps:[],errors:[],failures:[],assets:[],status:'RUNNING'};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
let browser, page;
const dump=()=>fs.writeFileSync(path.join(folder,'qa-report.json'),JSON.stringify(report,null,2));
async function capture(label){
 try{await page.screenshot({path:path.join(folder,label+'.png'),animations:'disabled',timeout:12000});report.steps.push(label)}
 catch(e){report.errors.push('screenshot '+label+': '+String(e).slice(0,300))}
}
(async()=>{
 await wait(1300);
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
 const context=await browser.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1});
 page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>report.errors.push('JS '+String(e).slice(0,400)));
 page.on('requestfailed',r=>{if(report.failures.length<30)report.failures.push({url:r.url(),error:r.failure()?.errorText})});
 page.on('response',res=>{if(/V12B_reference/.test(res.url()))report.assets.push({url:res.url(),status:res.status()})});
 await page.route('**/index.html*',async route=>{
   const response=await route.fetch();let body=await response.text();
   const marker='// ---------- Frame ----------';
   assert.equal(body.split(marker).length-1,1,'Expected unique game frame marker');
   const fn='function itemIcon(recipeId){return ITEM_GLYPHS[recipeKind(recipeId)]||ITEM_GLYPHS.Espada}';
   assert.equal(body.split(fn).length-1,1,'Expected original game SVG icon function');
   const poster='/previews/fabricaciones-real-game/V12B_reference.png';
   body=body.replace(fn,"function itemIcon(recipeId){if(recipeId==='espada_hierro')return '"+poster+"';return ITEM_GLYPHS[recipeKind(recipeId)]||ITEM_GLYPHS.Espada}");
   // Sólo en la sesión de captura: mostrar el render V12B en las fichas,
   // jamás disfrazar el GLB mercSword10 como V12B.
   const hook=`
window.__GENESIS_FAB_QA__={
  state:()=>({gameStarted,selectedProfession,tutorialStep,chestOpen,
    currentRecipe:gameStarted?currentRecipe():null,ready:!!craftSession,
    craftedCount:craftedItems.length,crafted:craftedItems.map(x=>({name:x.name,recipe:x.recipe,rarity:x.rarity})),
    stock:{...playerInventory},loader:loading.style.display}),
  enter:()=>{
    if(!gameStarted||selectedProfession!=='Herrero'||!craftSession)throw Error('Route not ready');
    const recipe=activeRoute.recipes[0],formula=craftSession.formulas[recipe];
    if(!formula||!formula.materials?.length)throw Error('No real NGE session formula');
    // Only QA shortcut: bypass quests/preparation; use actual generated session recipe.
    workshopKey=true;debrisCleared=true;auxCleared=true;chestOpen=true;forgeHot=true;
    playerInventory={...craftSession.stock};
    for(const m of formula.materials)playerInventory[m.material]=Math.max(playerInventory[m.material]||0,m.qty);
    refreshInventorySummary();setTutorialStep(10);
    // Approved 2D render is only visual fallback; never assert it is a V12B GLB.
    const previous=itemAssetMarkup;
    itemAssetMarkup=item=>item?.recipe==='espada_hierro'
      ?'<img class="qaApprovedSwordPoster" src="/previews/fabricaciones-real-game/V12B_reference.png" alt="Espada de hierro V175-V12B render aprobado">'
      :previous(item);
    showCraftConfirm();
    if(!window.GenesisPreparation?.navigate?.('Fabricaciones'))throw Error('Could not open actual fabrication tab');
    return {recipe,formula,stock:{...playerInventory}};
  }
};
`;
   body=body.replace(marker,hook+'\n'+marker);
   const canvas='<pc-app id="genesisApp" backend="webgl2" antialias ';
   if(body.includes(canvas))body=body.replace(canvas,'<pc-app id="genesisApp" backend="webgl2" max-pixel-ratio="0.5" ');
   const light='cast-shadows shadow-distance="42" shadow-resolution="2048"';
   if(body.includes(light))body=body.replace(light,'shadow-distance="42" shadow-resolution="128"');
   await route.fulfill({response,body,headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 try{
   await page.goto('http://127.0.0.1:8765/index.html?qa=fabricacion-real',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>{const a=document.getElementById('prototypeIntro');return a&&getComputedStyle(a).display!=='none'},{timeout:150000,polling:1500});
   await capture('00-inicio-del-juego');
   await page.locator('[data-profession="Herrero"]').click({force:true});
   await page.waitForFunction(()=>{const q=window.__GENESIS_FAB_QA__?.state?.();return q?.gameStarted&&getComputedStyle(document.querySelector('#loading')).display==='none'},{timeout:220000,polling:1500});
   await capture('01-herrero-en-el-juego');
   report.shortcut=await page.evaluate(()=>window.__GENESIS_FAB_QA__.enter());
   await page.waitForSelector('.prepArtboard[data-active-tab="Fabricaciones"]',{timeout:15000});
   await page.waitForFunction(()=>{const img=document.querySelector('.workspaceRecipeHero img');return img?.complete&&img.naturalWidth>0},{timeout:20000});
   report.before=await page.evaluate(()=>window.__GENESIS_FAB_QA__.state());
   report.menu=await page.evaluate(()=>({activeTab:window.GenesisPreparation?.activeTab?.(),families:[...document.querySelectorAll('.workspaceRecipeFamily')].map(x=>({name:x.querySelector('h4')?.textContent,locked:x.classList.contains('is-locked')})),bars:[...document.querySelectorAll('.fabricationDemoBar')].map(x=>({name:x.dataset.ptName,value:x.querySelector('b')?.textContent})),posterLoaded:document.querySelector('.workspaceRecipeHero img')?.naturalWidth}));
   assert.equal(report.menu.activeTab,'Fabricaciones');
   assert.ok(report.menu.posterLoaded>0);
   await capture('02-fabricaciones-dentro-del-juego');
   const btn=page.locator('#prepStart.workspaceAction');
   assert.equal(await btn.isEnabled(),true,'Real recipe should be craftable with the prepared QA stock');
   await btn.click({force:true});
   await page.waitForSelector('#resultContinue',{timeout:25000});
   report.after=await page.evaluate(()=>window.__GENESIS_FAB_QA__.state());
   assert.equal(report.after.craftedCount,report.before.craftedCount+1,'NGE engine must craft exactly one sword');
   assert.equal(report.after.crafted[0].recipe,'espada_hierro','Must be the real sword recipe');
   await page.waitForFunction(()=>{const img=document.querySelector('#modal .qaApprovedSwordPoster');return img?.complete&&img.naturalWidth>0},{timeout:16000});
   await capture('03-resultado-espada-real');
   report.status='SUCCESS_ACTUAL_GAME_WITH_APPROVED_V12B_STATIC_POSTER';
   dump();
   console.log('GENESIS_REAL_FABRICACION_OK',JSON.stringify({before:report.before,menu:report.menu,after:report.after,status:report.status}));
 }catch(e){
   report.status='FAILED_REAL_GAME';report.errors.push(String(e.stack||e));
   await capture('99-error-juego');dump();throw e;
 }finally{dump();await browser.close();server.kill();}
})().catch(e=>{console.error('GENESIS_REAL_FABRICACION_FAIL',e);process.exitCode=1});
