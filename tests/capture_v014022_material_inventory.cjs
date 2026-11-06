'use strict';
// Evidence from the genuine V014.022 PlayCanvas inventory. No stock, quest, model or menu state is fabricated.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const output = 'previews/inventory-materials-v014022';
fs.mkdirSync(output, { recursive: true });
const now = () => new Date().toISOString();
const pause = ms => new Promise(r => setTimeout(r, ms));
const manifest = {
  version: 'V014.022 recovered, experimental chest location',
  capturedAt: now(),
  method: 'Real Chromium game; Ordan step 7 > key > chest > actual TAB inventory; physical clicks per material',
  source: 'actual session playerInventory, no invented materials',
  state: 'STARTED',
  materials: [],
  images: [],
  errors: [],
  browserErrors: [],
  expectedCatalogMaterials: [
    'Mineral de hierro', 'Lingote de hierro', 'Carbón vegetal',
    'Madera seca de roble', 'Madera seca de fresno',
    'Cuero caprino curtido', 'Cuero bovino curtido',
    'Cordel de cáñamo', 'Hilo de lino', 'Tela de lino'
  ]
};
const report = (msg, data) => console.log('GENESIS_MATERIAL_CAPTURE', msg, JSON.stringify(data || {}).slice(0, 1700));
const slug = name => String(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
let browser, server;
let page;
async function take(name) {
  const file = name + '.png';
  const full = path.join(output, file);
  try {
    // Raw Chromium DevTools capture avoids Playwright's GPU-heavy animation/stability wait.
    const session=await page.context().newCDPSession(page);
    try{
      const shot=await session.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true,optimizeForSpeed:true});
      fs.writeFileSync(full,Buffer.from(shot.data,'base64'));
    }finally{
      await session.detach().catch(()=>{});
    }
  }catch(e){
    report('CDP_CAPTURE_FALLBACK',{file,error:String(e).slice(0,200)});
    await page.screenshot({path:full,animations:'allow',timeout:60000});
  }
  const bytes=fs.statSync(full).size;
  manifest.images.push(file);
  report('SCREENSHOT_SAVED',{file,bytes});
  return file;
}
async function readGameState() {
  return page.evaluate(() => ({
    game: window.__GENESIS_MATERIAL_CAPTURE__?.() || null,
    loadingDisplay: document.getElementById('loading')?.style.display,
    introDisplay: document.getElementById('prototypeIntro')?.style.display,
    loadDetail: document.getElementById('loadDetail')?.textContent,
    loadCount: document.getElementById('loadCount')?.textContent,
    modalDisplay: document.getElementById('modalLayer')?.style.display,
    modalButtons: [...document.querySelectorAll('#modalLayer button')].map(x => ({id:x.id, text:x.textContent.trim().slice(0,45)})).slice(0,10),
    inventoryVisible: !!document.querySelector('#genInv'),
    inventoryTab: window.GenesisPreparation?.activeTab?.() || null
  }));
}
async function gameAction() {
  await page.keyboard.press('q');
  await pause(200);
  await page.keyboard.press('e');
  await pause(500);
}
async function run() {
  server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], {stdio:'ignore'});
  await pause(900);
  browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  const context = await browser.newContext({
    viewport: {width:960,height:540},
    deviceScaleFactor:1
  });
  page = await context.newPage();
  page.setDefaultTimeout(14000);
  page.on('pageerror', e => {
    const msg = String(e.stack || e);
    manifest.browserErrors.push(msg.slice(0,800));
    report('PAGE_ERROR', msg.slice(0,250));
  });
  page.on('console', m => {
    if(m.type()==='error') manifest.browserErrors.push(m.text().slice(0,500));
  });
  let probeInserted = false;
  await page.route('**/index.html*', async route => {
    const response = await route.fetch();
    let html = await response.text();
    const marker = 'requestAnimationFrame(frame);\n\nsetLoadUI';
    if (html.includes(marker)) {
      html = html.replace(marker, 'requestAnimationFrame(frame);\nwindow.__GENESIS_MATERIAL_CAPTURE__=()=>({step:tutorialStep,gameStarted,profession:selectedProfession,chestOpen,inventoryOpen,actualStock:Object.entries(playerInventory).filter(([,qty])=>qty>0),activeTab:window.GenesisPreparation?.activeTab?.()||null});\n\nsetLoadUI');
      probeInserted = true;
    }
    await route.fulfill({response,body:html,headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
  });
  await page.goto('http://127.0.0.1:8765/index.html?qa=material-screenshot', {waitUntil:'domcontentloaded',timeout:90000});
  for (let i=0;i<18;i++) {
    const state = await readGameState();
    if (state.introDisplay !== 'none' && await page.locator('[data-profession="Herrero"]').isVisible().catch(()=>false)) break;
    await pause(3500);
  }
  if (!await page.locator('[data-profession="Herrero"]').isVisible().catch(()=>false)) throw Error('INTRO_UNAVAILABLE');
  report('INTRO', {probeInserted,info:await readGameState()});
  await page.locator('[data-profession="Herrero"]').click({force:true,timeout:15000});
  let loaded = false;
  for (let i=0;i<36;i++) {
    await pause(5000);
    const state=await readGameState();
    if (i%3===0) report('LOADING', {i,step:state.game?.step,started:state.game?.gameStarted,loadCount:state.loadCount});
    if (state.game?.gameStarted && state.loadingDisplay === 'none' && state.introDisplay === 'none') {loaded=true;break;}
  }
  manifest.probeInserted = probeInserted;
  if (!loaded) {
    manifest.state = 'BLOCKED_LOADING';
    manifest.blocker = await readGameState();
    await take('00-load-failure').catch(()=>{});
    return;
  }
  report('READY', await readGameState());
  const initial = await readGameState();
  if (initial.game?.step !== 7) throw Error('EXPECTED_STEP_7_GOT_' + String(initial.game?.step));
  // Speak to Ordan and receive the key using the game's actual E key and dialogue button.
  for(let tries=0;tries<4;tries++){
    await gameAction();
    if(await page.locator('#dialogNext').isVisible().catch(()=>false))break;
  }
  await page.locator('#dialogNext').waitFor({state:'visible',timeout:16000});
  report('ORDAN_DIALOGUE', (await readGameState()).modalButtons);
  await page.locator('#dialogNext').click({force:true,timeout:12000});
  await pause(300);
  if ((await readGameState()).game?.step!==8) throw Error('KEY_NOT_RECEIVED');
  // The chest was moved into interaction range in this experimental version.
  for(let tries=0;tries<5;tries++){
    await gameAction();
    if ((await readGameState()).game?.step===9) break;
  }
  if((await readGameState()).game?.step!==9) throw Error('CHEST_NOT_OPENED');
  const mentorBtn=page.locator('#dialogNext');
  if(await mentorBtn.isVisible().catch(()=>false))await mentorBtn.click({force:true,timeout:9000});
  await pause(500);
  await page.keyboard.press('Tab');
  await pause(800);
  if (!await page.locator('#genInv').isVisible().catch(()=>false)) {
    await page.locator('#inventoryTouch').click({force:true,timeout:10000}).catch(()=>{});
  }
  await page.locator('#genInv').waitFor({state:'visible',timeout:45000});
  manifest.state='INVENTORY_OPEN';
  // Pause only GPU redraw AFTER entering actual inventory. DOM and clicks remain live.
  manifest.renderOptimization = await page.evaluate(() => {
    const app=document.querySelector('#genesisApp')?.app;
    if(!app)return {available:false};
    if(typeof app.autoRender==='boolean'){
      app.autoRender=false;app.renderNextFrame=false;
      return {available:true,autoRenderDisabled:true};
    }
    return {available:true,autoRenderDisabled:false};
  });
  await page.setViewportSize({width:1600,height:900});
  await pause(2600);
  await page.evaluate(() => document.fonts?.ready).catch(()=>{});
  const stock=(await readGameState()).game?.actualStock || [];
  manifest.initialStock = stock;
  const itemSlots=await page.locator('#genInv [data-select]').evaluateAll(els=>els.map((el,i)=>({
    index:i,
    name:el.getAttribute('aria-label'),
    qty:el.querySelector('span')?.textContent
  })));
  manifest.inventorySlots=itemSlots;
  manifest.slotNames=itemSlots.map(x=>x.name);
  report('ACTUAL_INVENTORY_MATERIALS', {stock,slots:itemSlots});
  await take('00-inventory-overview');
  for (const slot of itemSlots) {
    const selector='#genInv [data-select="' + slot.index + '"]';
    await page.locator(selector).click({force:true,timeout:12000});
    await pause(500);
    const inspection=await page.evaluate(() => {
      const name=document.querySelector('.genInvViewerTitle')?.textContent?.trim()||'';
      const viewer=document.querySelector('.genInvImageWrap');
      return {
        name,
        viewerImage:viewer?.querySelector('img')?.getAttribute('src')||null,
        viewerImageLoaded:!!(viewer?.querySelector('img')?.complete && viewer.querySelector('img')?.naturalWidth),
        viewerFallbackText:viewer?.querySelector('.genInvEmptyPreview')?.textContent||null,
        selected:document.querySelector('.genInvSlot[aria-pressed="true"]')?.getAttribute('aria-label')||null,
        visibleFamily:document.querySelector('.genInvGridTitle')?.textContent?.trim()||''
      };
    });
    const file=String(slot.index+1).padStart(2,'0')+'-'+slug(slot.name)+'.png';
    await take(file.replace(/\.png$/,''));
    manifest.materials.push({...slot,...inspection,file});
    report('MATERIAL_CAPTURED', {...slot,...inspection,file});
  }
  manifest.missingCatalogMaterials = manifest.expectedCatalogMaterials.filter(x=>!manifest.slotNames.includes(x));
  manifest.materialsWithoutImage = manifest.materials.filter(m=>!m.viewerImageLoaded).map(m=>m.name);
  manifest.state='CAPTURED';
}
(async()=>{
  try { await run(); }
  catch(e) {
    manifest.state='ERROR';
    manifest.errors.push(String(e.stack||e));
    report('ERROR', String(e.stack||e).slice(0,1000));
    if(page){try{await take('99-error-screen')}catch{}}
    process.exitCode=1;
  }
  finally{
    manifest.finishedAt=now();
    fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2));
    report('FINAL',{state:manifest.state,images:manifest.images.length,materials:manifest.materials.map(x=>x.name),withoutImage:manifest.materialsWithoutImage,missingCatalog:manifest.missingCatalogMaterials});
    if(browser)await browser.close().catch(()=>{});
    if(server)server.kill();
    if(manifest.state!=='CAPTURED')process.exitCode=1;
  }
})();
