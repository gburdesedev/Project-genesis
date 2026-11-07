'use strict';
// QA: actual game JS / NGE / GenesisPreparation, but no 3D village preload.
// Screenshot is a live menu in the game DOM, not full village gameplay.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{chromium}=require('playwright');
const out=path.resolve('previews/fabricaciones-real-game');fs.mkdirSync(out,{recursive:true});
const report={mode:'Original Project Genesis HTML + actual Fabricaciones controller + real NGE session, 3D village load bypassed',captured:[],errors:[],status:'RUNNING'};
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));let browser,page;
const save=()=>fs.writeFileSync(path.join(out,'menu-qa-report.json'),JSON.stringify(report,null,2));
let snapshotBrowser;
async function shot(name){
  // Capture exactly the DOM assembled by the actual Genesis game controller.
  // A separate lightweight Chromium page isolates screenshots from the original
  // game page's continuous WebGL/compositor (which hung both screenshot APIs).
  const snapshot=await page.evaluate(()=>({
    css:[...document.head.querySelectorAll('link[rel="stylesheet"],style')].map(x=>x.outerHTML).join('\n'),
    markup:document.querySelector('#modalLayer')?.outerHTML,
    bodyClass:document.body.className,
    bodyStyle:document.body.getAttribute('style')||''
  }));
  if(!snapshot.markup)throw Error('Real game modalLayer missing');
  const html='<!doctype html><html><head><meta charset="utf-8"><base href="http://127.0.0.1:8765/">'+snapshot.css+
    '<style>html,body{width:100%;min-height:100%;margin:0;}canvas{display:none!important}</style></head>'+
    '<body class="'+snapshot.bodyClass+'" style="'+snapshot.bodyStyle+'">'+snapshot.markup+'</body></html>';
  fs.writeFileSync(path.join(out,name+'.dom-snapshot.html'),html);
  if(!snapshotBrowser)snapshotBrowser=await chromium.launch({headless:true,args:['--disable-gpu','--disable-dev-shm-usage','--no-sandbox']});
  const visual=await snapshotBrowser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  try {
    await visual.setContent(html,{waitUntil:'domcontentloaded',timeout:25000});
    await visual.waitForTimeout(700);
    await visual.screenshot({path:path.join(out,name+'.png'),timeout:25000,animations:'disabled'});
    report.captured.push(name);
  }catch(error){
    report.errors.push('Isolated DOM screenshot '+name+': '+String(error));
    throw error;
  }finally{await visual.close().catch(()=>{});}
}
(async()=>{
 await sleep(1400);
 browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>{report.errors.push(String(e).slice(0,500));});
 await page.route('**/index.html*',async route=>{
   const res=await route.fetch();let body=await res.text();
   const anchor='// ---------- Frame ----------';
   assert.equal(body.split(anchor).length-1,1);
   const old='function itemIcon(recipeId){return ITEM_GLYPHS[recipeKind(recipeId)]||ITEM_GLYPHS.Espada}';
   assert.equal(body.split(old).length-1,1);
   body=body.replace(old,"function itemIcon(recipeId){if(recipeId==='espada_hierro')return './previews/fabricaciones-real-game/V12B_reference.png';return ITEM_GLYPHS[recipeKind(recipeId)]||ITEM_GLYPHS.Espada}");
   const hook=String.raw`
window.__GENESIS_MENU_QA__={
  setup:()=>{
    const engine=window.GenesisPrototypeEngines;
    if(!engine?.generateSession)throw Error('Genuine NGE engine not ready');
    selectedProfession='Herrero';
    activeRoute=ROUTES.Herrero;
    craftSession=engine.generateSession('Herrero');
    gameStarted=true;chestOpen=true;usedItemNames=new Set();craftedItems=[];
    tutorialStep=10;
    const recipe=activeRoute.recipes[0],formula=craftSession.formulas[recipe];
    if(!formula?.materials?.length)throw Error('Generated recipe missing');
    playerInventory={...craftSession.stock};
    for(const m of formula.materials)playerInventory[m.material]=Math.max(playerInventory[m.material]||0,m.qty);
    setTutorialStep(10);
    // QA-only sword result view: real approved V12B still-image, NOT a final GLB.
    const originalAsset=itemAssetMarkup;
    itemAssetMarkup=item=>item?.recipe==='espada_hierro'
      ?'<img class="qaApprovedSwordPoster" src="./previews/fabricaciones-real-game/V12B_reference.png" alt="Espada V175 V12B render aprobado">'
      :originalAsset(item);
    document.getElementById('prototypeIntro').style.display='none';
    document.getElementById('loading').style.display='none';
    showCraftConfirm();
    if(!window.GenesisPreparation.navigate('Fabricaciones'))throw Error('Actual Fabricaciones menu not reachable');
    return {recipe,formula,stock:{...playerInventory}};
  },
  state:()=>({step:tutorialStep,created:craftedItems.map(i=>({name:i.name,recipe:i.recipe,rarity:i.rarity})),inventory:{...playerInventory},selected:selectedProfession})
};
`;
   body=body.replace(anchor,hook+'\n'+anchor);
   await route.fulfill({response:res,body,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 try{
   await page.goto('http://127.0.0.1:8765/index.html?qa=fabricaciones-menu',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>!!window.__GENESIS_MENU_QA__&&!!window.GenesisPreparation&&!!window.GenesisPrototypeEngines,null,{timeout:70000});
   report.session=await page.evaluate(()=>window.__GENESIS_MENU_QA__.setup());
   // Allow local approved V12B poster to finish color-key composition before DOM snapshot.
   await sleep(1300);
   report.domImmediately=await page.evaluate(()=>({
     modalClass:document.getElementById('modal')?.className,
     modalHTML:document.getElementById('modal')?.innerHTML?.slice(0,600),
     modalLayerStyle:document.getElementById('modalLayer')?.style.display,
     modalLayerComputed:getComputedStyle(document.getElementById('modalLayer')).display,
     artboardCount:document.querySelectorAll('.prepArtboard').length,
     artboardActive:document.querySelector('.prepArtboard')?.dataset?.activeTab||null,
     prepRootCount:document.querySelectorAll('.prepRoot').length,
     scriptReady:typeof window.GenesisPreparation?.open,
     bodyClasses:document.body.className
   }));
   await shot('01-diagnostico-tras-abrir-menu');
   // Read live game DOM directly; Playwright's CSS selector wait hangs despite
   // the menu existing in the captured live document.
   report.menu=await page.evaluate(()=>({
     tab:window.GenesisPreparation.activeTab(),
     exists:!!document.querySelector('.prepArtboard[data-active-tab="Fabricaciones"]'),
     family:[...document.querySelectorAll('.workspaceRecipeFamily')].map(e=>({name:e.querySelector('h4')?.textContent,locked:e.classList.contains('is-locked')})),
     pt:[...document.querySelectorAll('.fabricationDemoBar')].map(e=>({name:e.dataset.ptName,value:e.querySelector('b')?.textContent})),
     image:document.querySelector('.workspaceRecipeHero img')?.getAttribute('data-approved-src')||document.querySelector('.workspaceRecipeHero img')?.currentSrc?.slice(0,180),
     imageLoaded:document.querySelector('.workspaceRecipeHero img')?.naturalWidth>0,
     canCraft:!!document.getElementById('prepStart')&&!document.getElementById('prepStart').disabled
   }));
   assert.equal(report.menu.tab,'Fabricaciones');
   assert.equal(report.menu.exists,true);
   assert.equal(report.menu.canCraft,true);
   await shot('02-fabricaciones-menu-juego-real');
   report.clicked=await page.evaluate(()=>{
     const btn=document.getElementById('prepStart');
     if(!btn)throw Error('Missing live game craft button');
     if(btn.disabled)throw Error('Live game craft button disabled');
     btn.click();
     return true;
   });
   await sleep(1700);
   report.result=await page.evaluate(()=>({
     ...window.__GENESIS_MENU_QA__.state(),
     resultButtonPresent:!!document.getElementById('resultContinue'),
     modalClass:document.getElementById('modal')?.className
   }));
   assert.equal(report.result.created.length,1);
   assert.equal(report.result.created[0].recipe,'espada_hierro');
   await shot('03-resultados-espada-motor-NGE');
   report.status='PASS_MENU_AND_CRAFT_REAL_ENGINE_NO_3D_VILLAGE';console.log('FAB_MENU_QA_PASS',JSON.stringify(report));save();
 }catch(e){report.status='FAILED';report.errors.push(String(e.stack||e));try{await shot('99-diagnostic')}catch{}save();throw e;}
 finally{save();if(snapshotBrowser)await snapshotBrowser.close().catch(()=>{});await browser.close();server.kill();}
})().catch(e=>{console.error('FAB_MENU_QA_FAIL',e);process.exitCode=1});
