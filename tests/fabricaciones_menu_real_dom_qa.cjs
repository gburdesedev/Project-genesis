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
async function shot(name){await page.screenshot({path:path.join(out,name+'.png'),timeout:60000,animations:'allow'});report.captured.push(name);}
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
   // Only for screenshot capture: stop WebGL game loop so Chromium can snapshot the modal.
   const loop='function frame(now){requestAnimationFrame(frame);';
   assert.equal(body.split(loop).length-1,1,'Expected single game animation loop');
   body=body.replace(loop,'function frame(now){/* Screenshot-only: freeze background 3D rendering */');
   await route.fulfill({response:res,body,headers:{...res.headers(),'content-type':'text/html; charset=utf-8'}});
 });
 try{
   await page.goto('http://127.0.0.1:8765/index.html?qa=fabricaciones-menu',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>!!window.__GENESIS_MENU_QA__&&!!window.GenesisPreparation&&!!window.GenesisPrototypeEngines,null,{timeout:70000});
   report.session=await page.evaluate(()=>window.__GENESIS_MENU_QA__.setup());
   report.renderDiagnostic=await page.evaluate(()=>({modalCount:document.querySelectorAll('.prepArtboard').length,activeTab:window.GenesisPreparation?.activeTab?.(),modalLayer:document.getElementById('modalLayer')?.style.display,modalClass:document.getElementById('modal')?.className,modalOuter:document.getElementById('modal')?.outerHTML.slice(0,320),loading:document.getElementById('loading')?.style.display,screen:innerWidth+'x'+innerHeight,htmlErrors:document.body?.innerText?.slice(-500)}));save();console.log('FABRICACIONES_RENDER_DIAG',JSON.stringify(report.renderDiagnostic));
   await page.evaluate(()=>{ const a=document.getElementById('genesisApp');if(a)a.style.visibility='hidden'; });
   await shot('00-menu-diagnostico-inmediato');
   await page.waitForSelector('.prepArtboard[data-active-tab="Fabricaciones"]',{state:'attached',timeout:20000});
   await page.waitForFunction(()=>{const e=document.querySelector('.workspaceRecipeHero img');return e?.complete&&e.naturalWidth>0},null,{timeout:25000});
   report.menu=await page.evaluate(()=>({tab:window.GenesisPreparation.activeTab(),family:[...document.querySelectorAll('.workspaceRecipeFamily')].map(e=>({name:e.querySelector('h4')?.textContent,locked:e.classList.contains('is-locked')})),pt:[...document.querySelectorAll('.fabricationDemoBar')].map(e=>({name:e.dataset.ptName,value:e.querySelector('b')?.textContent})),image:document.querySelector('.workspaceRecipeHero img')?.currentSrc,canCraft:!document.getElementById('prepStart')?.disabled}));
   assert.equal(report.menu.tab,'Fabricaciones');
   assert.equal(report.menu.canCraft,true);
   await shot('02-fabricaciones-menu-juego-real');
   await page.locator('#prepStart.workspaceAction').click({force:true});
   await page.waitForSelector('#resultContinue',{timeout:15000});
   report.result=await page.evaluate(()=>window.__GENESIS_MENU_QA__.state());
   assert.equal(report.result.created.length,1);
   assert.equal(report.result.created[0].recipe,'espada_hierro');
   await page.waitForFunction(()=>{const e=document.querySelector('.qaApprovedSwordPoster');return e?.complete&&e.naturalWidth>0},null,{timeout:20000});
   await shot('03-resultados-espada-motor-NGE');
   report.status='PASS_MENU_AND_CRAFT_REAL_ENGINE_NO_3D_VILLAGE';console.log('FAB_MENU_QA_PASS',JSON.stringify(report));save();
 }catch(e){report.status='FAILED';report.errors.push(String(e.stack||e));try{await shot('99-diagnostic')}catch{}save();throw e;}
 finally{save();await browser.close();server.kill();}
})().catch(e=>{console.error('FAB_MENU_QA_FAIL',e);process.exitCode=1});
