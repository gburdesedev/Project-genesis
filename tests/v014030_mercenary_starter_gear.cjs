'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const out='previews/v014030-mercenary-starter-gear';fs.mkdirSync(out,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const report={result:'NOT_STARTED',events:[],items:[],errors:[],network:[]};
const log=(type,data)=>{report.events.push({type,data});console.log('V014028',type,JSON.stringify(data).slice(0,2500));};
const server=spawn('python3',['-m','http.server','8775','--bind','127.0.0.1'],{stdio:'ignore'});
(async()=>{
 let browser,page;
 try{
  await delay(1000);
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling']});
  page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  page.setDefaultTimeout(16000);
  page.on('pageerror',e=>{report.errors.push('PAGE '+e.message);log('PAGE_ERROR',e.message)});
  page.on('console',m=>{if(m.type()==='error'&&report.errors.length<20)report.errors.push(m.text().slice(0,250))});
  page.on('requestfailed',r=>{if(report.network.length<30)report.network.push({url:r.url().slice(-150),failure:r.failure()?.errorText})});
  let injected=false;
  await page.route('**/index.html*',async route=>{
    const response=await route.fetch();let html=await response.text();
    const canvas='<pc-app id="genesisApp" backend="webgl2" antialias ';
    if(html.split(canvas).length!==2)throw Error('Original PlayCanvas marker not unique');
    html=html.replace(canvas,'<pc-app id="genesisApp" backend="webgl2" max-pixel-ratio="0.25" ');
    html=html.replace('cast-shadows shadow-distance="42" shadow-resolution="2048"','shadow-distance="42" shadow-resolution="128"').replace('cast-shadows shadow-resolution="1024"','shadow-resolution="128"');
    const hook=[
      'window.__GENESIS_V09_QA_SEED__=async function(){',
      'if(!gameStarted||selectedProfession!=="Herrero")throw Error("Herrero no iniciado");',
      'const e=window.GenesisPrototypeEngines;',
      'if(!e?.fabricate||!e?.present||craftedItems.length)throw Error("Motor NGE no listo o partida no limpia");',
      'const list=[["espada_hierro",1],["espada_hierro",2],["escudo_hierro",1],["escudo_hierro",2]];',
      'const generated=[];',
      'for(const [recipe,craft] of list){',
      'const formula=formulaFor(recipe);if(!formula)throw Error("Fórmula faltante "+recipe);',
      'const raw=e.fabricate(recipe,{craft,seed:((31863*3817+craft*197)+(recipe==="espada_hierro"?2:4))>>>0,artisan:"Artesano del prototipo",formula});',
      'if(raw.formula.signature!==formula.signature)throw Error("Firma real alterada");',
      'const item=e.present(raw,usedItemNames);usedItemNames.add(item.name.toLocaleLowerCase("es"));',
      'craftedItems.push(item);generated.push({id:item.id,name:item.name,rarity:item.rarity,recipe:item.recipe,channels:item.channels,formula:formula.signature,source:"GenesisPrototypeEngines.fabricate/present"});}',
      'refreshInventorySummary();setTutorialStep(15);await ensureMercenaryReady();',
      'mercCandidate=0;applyMercCandidateVisual();showMercenaryEquipment(false);',
      'return {step:tutorialStep,gameStarted,mercenaryInitialized,hasRealRoot:!!mercenaryRoot,generated};};',
      'window.__GENESIS_V09_QA_STATE__=()=>({step:tutorialStep,gameStarted,selectedProfession,created:craftedItems.length,mercCandidate,mercenaryInitialized,mercenaryState,gearAttached:mercGearAttached,sword:mercSwordItem?.id,shield:mercShieldItem?.id,starter:mercStarterGear?{candidate:mercStarterGear.candidate,sword:{id:mercStarterGear.sword.id,name:mercStarterGear.sword.name,rarity:mercStarterGear.sword.rarity,channels:mercStarterGear.sword.channels,owner:mercStarterGear.sword.owner},shield:{id:mercStarterGear.shield.id,name:mercStarterGear.shield.name,rarity:mercStarterGear.shield.rarity,channels:mercStarterGear.shield.channels,owner:mercStarterGear.shield.owner}}:null,playerContainsStarter:craftedItems.some(x=>x.starterGear)});'
    ].join('\n');
    const anchor='requestAnimationFrame(frame);\n\nsetLoadUI';
    if(!html.includes(anchor))throw Error('In-game hook insertion point missing');
    html=html.replace(anchor,'requestAnimationFrame(frame);\n'+hook+'\nsetLoadUI');
    injected=true;await route.fulfill({response,body:html,headers:{...response.headers(),'content-type':'text/html; charset=utf-8'}});
  });
  await page.goto('http://127.0.0.1:8775/index.html?qa=merc-v09',{waitUntil:'domcontentloaded',timeout:90000});
  if(!injected)throw Error('Original game was not loaded');
  let intro=false;
  for(let i=0;i<36;i++){if(await page.locator('[data-profession="Herrero"]').isVisible().catch(()=>false)){intro=true;break;}await delay(2500);}
  if(!intro)throw Error('Real Herrero profession selection unavailable');
  log('REAL_GAME_INTRO',{url:page.url(),title:await page.title()});
  await page.locator('[data-profession="Herrero"]').click({force:true,noWaitAfter:true});
  let ready=false;
  for(let i=0;i<80;i++){
    await delay(2600);
    const x=await page.evaluate(()=>({s:window.__GENESIS_V09_QA_STATE__?.(),loading:document.getElementById('loading')?.style.display,detail:document.getElementById('loadDetail')?.textContent?.slice(0,130)})).catch(()=>null);
    if(i%6===0)log('LOADING',{i,...x});
    if(x?.s?.gameStarted&&x?.s?.selectedProfession==='Herrero'&&x?.loading==='none'){ready=true;break;}
  }
  if(!ready)throw Error('Real PlayCanvas Herrero scene not fully loaded');
  log('GAME_READY',await page.evaluate(()=>window.__GENESIS_V09_QA_STATE__()));
  const generated=await page.evaluate(async()=>window.__GENESIS_V09_QA_SEED__());
  report.items=generated.generated;log('REAL_NGE_SEEDED',generated);
  if(generated.step!==16||generated.generated.length!==4)throw Error('Genuine game checkpoint did not reach step 16');
  const starter=await page.evaluate(()=>window.__GENESIS_V09_QA_STATE__());
  log('REAL_STARTER_EQUIPMENT',starter);
  if(starter.starter?.sword?.rarity!=='Común'||starter.starter?.shield?.rarity!=='Inútil')throw Error('Starter must be common sword and useless shield from NGE');
  if(starter.playerContainsStarter||starter.created!==4||!starter.gearAttached)throw Error('Starting items leaked into player inventory or not actually attached');
  const startSBase=Number(starter.starter.sword.channels?.[0]?.[1]);
  const startHBase=Number(starter.starter.shield.channels?.[0]?.[1]);
  const goodSwordBase=Number(generated.generated[1].channels?.[0]?.[1]);
  const commonShieldBase=Number(generated.generated[3].channels?.[0]?.[1]);
  if(!(goodSwordBase>startSBase && commonShieldBase>startHBase))throw Error('Starter gear is not a genuine downgrade of crafted equipment');
  const initialLabel=await page.locator('.pv9CompareEquipped').innerText();
  log('BASELINE_COMPARE_INITIAL',{initialLabel,startSBase,goodSwordBase,startHBase,commonShieldBase});
  if(!initialLabel.includes('Espada común de milicia'))throw Error('Comparison frame not showing starting sword');
  if(!await page.locator('.pv9Equip').isDisabled())throw Error('Equipping must require player-crafted sword and shield');

  if(await page.locator('.pv9Board').count()!==1)throw Error('V09 approved art not mounted inside real game');
  const count=await page.locator('.pv9Grid .mcInventorySlot.hasItem').count();if(count!==2)throw Error('Expected 2 genuine swords, got '+count);
  await page.locator('.pv9Grid [data-item="1"]').click({force:true,noWaitAfter:true});
  const swordCompare=await page.evaluate(()=>({
    equipped:document.querySelector('.pv9CompareEquipped')?.innerText,
    selected:document.querySelector('.pv9CompareSelected')?.innerText,
    channels:[...document.querySelectorAll('.pv9Channels .mcChannel')].map(x=>x.dataset.channel)
  }));
  log('COMMON_STARTER_SWORD_VS_REAL_GOOD_SWORD',swordCompare);
  if(!swordCompare.equipped.includes('Espada común de milicia')||!swordCompare.selected.includes('Espada'))throw Error('Sword comparison missing real starter vs good sword');
  if(!await page.locator('.pv9Equip').isDisabled())throw Error('Must not confirm with only sword selected');
  await page.screenshot({path:path.join(out,'01-espada-comun-equipada-vs-espada-buena-fabricada.png'),animations:'disabled',fullPage:true,timeout:25000});
  await page.locator('[data-family="second"]').click({force:true,noWaitAfter:true});
  if(await page.locator('.pv9Grid .mcInventorySlot.hasItem').count()!==2)throw Error('Two real shields not visible');
  await page.locator('.pv9Grid [data-item="1"]').click({force:true,noWaitAfter:true});
  const shieldCompare=await page.evaluate(()=>({
    equipped:document.querySelector('.pv9CompareEquipped')?.innerText,
    selected:document.querySelector('.pv9CompareSelected')?.innerText,
    channels:[...document.querySelectorAll('.pv9Channels .mcChannel')].map(x=>x.dataset.channel)
  }));
  log('USELESS_STARTER_SHIELD_VS_REAL_COMMON_SHIELD',shieldCompare);
  if(!shieldCompare.equipped.includes('Escudo gastado de milicia')||!shieldCompare.selected.trim())throw Error('Shield comparison missing real starter vs crafted shield');
  if(await page.locator('.pv9Equip').isDisabled())throw Error('Both player-crafted replacements now selected, equip must enable');
  await page.screenshot({path:path.join(out,'02-escudo-inutil-equipado-vs-escudo-comun-fabricado.png'),animations:'disabled',fullPage:true,timeout:25000});
  await page.locator('[data-family="first"]').click({force:true,noWaitAfter:true});
  await delay(1000);
  const screen=await page.evaluate(()=>({hasApp:!!document.getElementById('genesisApp')?.app,view:document.querySelector('.pv9Board')?.getBoundingClientRect().toJSON(),items:[...document.querySelectorAll('.pv9Grid .hasItem')].map(x=>x.title),channels:[...document.querySelectorAll('.pv9Channels .mcChannel')].map(x=>x.getAttribute('data-channel')),model:document.querySelector('.pv9Hero model-viewer')?.getAttribute('src'),modelDefined:!!customElements.get('model-viewer'),state:window.__GENESIS_V09_QA_STATE__()}));
  log('REAL_GAME_VISUAL_CHECK',screen);
  if(screen.items.length!==2||screen.channels.length===0||!screen.hasApp)throw Error('Real application data binding not verified');
  await page.screenshot({path:path.join(out,'03-juego-real-inventario-v09-comparacion-final.png'),fullPage:true,animations:'disabled',timeout:25000});
  await page.locator('.pv9Equip').click({force:true,noWaitAfter:true});await delay(1000);
  const equip=await page.evaluate(()=>window.__GENESIS_V09_QA_STATE__());log('EQUIP_IN_REAL_GAME',equip);
  if(equip.sword!==generated.generated[1].id || equip.shield!==generated.generated[3].id || equip.created!==4 || equip.playerContainsStarter)throw Error('Equipped item IDs do not match genuine crafted sword and shield, or starter inventory leaked');

  report.result=equip.step===17&&equip.gearAttached?'REAL_GAME_STARTER_GEAR_COMPARED_AND_REPLACED':'REAL_GAME_SCREENSHOT_STARTER_REPLACEMENT_FAILED';
  await page.screenshot({path:path.join(out,'04-juego-real-despues-equipar.png'),fullPage:true,animations:'disabled',timeout:25000});
 }catch(e){report.result='FAILED';report.errors.push(String(e.stack||e));log('FAILED',String(e.stack||e).slice(0,1500));if(page)try{await page.screenshot({path:path.join(out,'99-error-real-playwright.png'),fullPage:true,timeout:18000})}catch{}}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('V014028_RESULT',JSON.stringify({result:report.result,items:report.items,errors:report.errors.slice(-8),network:report.network.slice(-8)}).slice(0,7500));if(report.result==='FAILED')process.exitCode=1;if(browser)await browser.close();server.kill('SIGTERM');}
})();
