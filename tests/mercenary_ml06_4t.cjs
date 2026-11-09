/* E2E branch-only: real mercenary menu and weapon/shield attach. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'previews','mercenary-lab-ml06-4t');
fs.mkdirSync(OUT,{recursive:true});
const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const script=html.match(/<script type="module">\s*(import \{ whenReady \}[\s\S]*?)<\/script>/i);
assert.ok(script,'PlayCanvas core inline module exists');
fs.writeFileSync('/tmp/genesis-mercenary-core.mjs',script[1]);
execFileSync('node',['--check','/tmp/genesis-mercenary-core.mjs'],{stdio:'inherit'});
assert.match(html,/function launchMercenaryLab\(\)/);
assert.match(html,/GENESIS_MERCENARY_LAB/);
assert.match(html,/showMercenaryEquipment\(false\)/);
console.log('PASS: inline module syntax + experimental jump installed');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  const local=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/+/, '')||'index.html';
  const filename=path.resolve(ROOT,local);
  if(!filename.startsWith(ROOT+path.sep)&&filename!==ROOT){res.writeHead(403);res.end('forbidden');return}
  fs.readFile(filename,(err,data)=>{
    if(err){res.writeHead(404);res.end('not found');return}
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  });
});
(async()=>{
 await new Promise(done=>server.listen(4173,'127.0.0.1',done));
 let browser, page, state={stage:'started',errors:[],warnings:[],signals:[],responses:[],snapshots:[]};
 try{
   browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-software-rasterizer=false']});
   page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
   page.on('pageerror',e=>state.errors.push(String(e.stack||e.message).slice(0,1400)));
   page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')state.warnings.push(m.text().slice(0,300))});
   page.on('requestfailed',r=>{if(state.warnings.length<80)state.warnings.push('FAILED '+r.url().slice(0,200)+' '+(r.failure()?.errorText||''))});
   page.on('response',r=>{if(r.status()>=400&&state.responses.length<80)state.responses.push({url:r.url(),status:r.status()})});
   await page.goto('http://127.0.0.1:4173/?mercenario=1',{waitUntil:'domcontentloaded',timeout:45000});
   try{await page.locator('.mercConcept .mcBoard').waitFor({timeout:125000});}
   catch(e){state.lab=await page.evaluate(()=>window.__GENESIS_MERCENARY_LAB||null);state.snapshots.push(await page.evaluate(()=>({title:document.title,loading:document.querySelector('#loading')?.innerText?.slice(0,1300),intro:document.querySelector('#prototypeIntro')?.style?.display,body:document.body?.innerText?.slice(0,2200),app:!!document.querySelector('pc-app')?.app,ui:(()=>{const ids=['modalLayer','modal','prototypeIntro'];const u={};for(const id of ids){const e=document.getElementById(id),r=e?.getBoundingClientRect();u[id]={inline:e?.style.display,display:e?getComputedStyle(e).display:null,visibility:e?getComputedStyle(e).visibility:null,width:r?.width,height:r?.height,classes:e?.className}};for(const cls of ['.mercConcept','.mcBoard']){const e=document.querySelector(cls),r=e?.getBoundingClientRect();u[cls]={present:!!e,display:e?getComputedStyle(e).display:null,width:r?.width,height:r?.height}};return u})(),models:[...document.querySelectorAll('pc-model')].filter(x=>x.hasAttribute('asset')).slice(0,20).map(x=>({id:x.id,asset:x.getAttribute('asset'),ready:!!x.contentEntity}))})));throw new Error('El menú no apareció: '+JSON.stringify(state.lab)+'; '+String(e.message).slice(0,150))}
   state.stage='menu';
   state.lab=await page.evaluate(()=>window.__GENESIS_MERCENARY_LAB);
   assert.equal(state.lab.items,4,'exactly four items generated from NGE');
   assert.equal(state.lab.initialSwordRarity,'Común','Actual starter sword must be NGE Común');
   assert.equal(state.lab.initialShieldRarity,'Inútil','Actual starter shield must be NGE Inútil');
   assert.equal(state.lab.selectedSwordRarity,'Bueno','Bench sword should be a better NGE item');
   assert.equal(state.lab.selectedShieldRarity,'Común','Bench shield should be a better NGE item');
   assert.equal(state.lab.equipped,true,'starter must be physically equipped, not only shown in comparison');
   assert.equal(state.lab.starterEquipped3d,true,'V050 must be attached before opening menu');
   assert.equal(state.lab.halo3d?.visible,true,'The visible V050 must carry active NGE-colored lights');
   assert.equal(state.lab.halo3d?.shieldChannel,'Base','Inútil shield has neutral Base halo');
   assert.ok(state.lab.halo3d?.swordIntensity>0 && state.lab.halo3d?.shieldIntensity>0);
   const activeSlotHalos=await page.locator('.pg4tShell .mcEquipSlot .pg4tItemVisual').evaluateAll(els=>
     els.map(el=>({affinity:el.dataset.affinity,strength:Number(getComputedStyle(el).getPropertyValue('--fx-strength')),
       glow:getComputedStyle(el,'::before').backgroundImage})));
   assert.equal(activeSlotHalos.length,2,'Both equipped weapon/defense icons must have channel halos');
   assert.ok(activeSlotHalos.every(h=>h.strength>.1&&h.glow.includes('radial-gradient')),
     'Equipped item halos must be visibly styled even for neutral Base: '+JSON.stringify(activeSlotHalos));
   assert.equal(await page.locator('.pg4tHeroEquippedHalo,.pg4tHeroAnimatedChannel').count(),2,
     'The approved character preview must reflect both equipped NGE channel effects');
   const previewChannels=await page.locator('.pg4tHeroAnimatedChannel').evaluateAll(els=>
     els.map(e=>({channel:e.dataset.affinity,kind:e.dataset.equipmentHalo,
       animation:getComputedStyle(e,'::before').animationName})));
   assert.ok(previewChannels.every(x=>['Fuego','Hielo','Rayo'].includes(x.channel)&&x.animation!=='none'),
     'Preview cues must animate only the three existing channel visuals: '+JSON.stringify(previewChannels));

   assert.equal(await page.locator('.pg4tShell .pv9Grid .pg4tAlreadyEquipped').count(),1,
     'Initial Common sword remains visible but disabled in the inventory');
   assert.equal(await page.locator('.pg4tShell .pv9Grid .pg4tAlreadyEquipped').isDisabled(),true);
   assert.equal(await page.locator('.pg4tShell .pv9Grid .mcInventorySlot.selected').count(),1,
     'A different weapon is selected as a compare candidate');

   assert.equal(state.lab.approved3d,true,'V050 must be present in the world');
   assert.equal(state.lab.equipmentRevision,0,'no replacement before user clicks Equipar');
   assert.equal(state.lab.shaderAnimation?.status,'bound',
     'Actual existing GLSL shader effects must bind to the V050 equipment subnodes: '+
       JSON.stringify(state.lab.shaderAnimation));
   assert.equal(state.lab.shaderAnimation?.ready,6,
     'Three actual GLSL shaders for each V050 gear item must be instantiated: '+
       JSON.stringify(state.lab.shaderAnimation?.errors));
   // Clock tick confirms shader uniforms advance, not necessarily GPU rendering.
   // World frames and suspended-modal fallback frames are diagnosed separately.
   await page.waitForFunction(()=>Number(window.__GENESIS_MERCENARY_LAB?.shaderAnimation?.updateFrames)>2,
       null,{timeout:25000});
   const shaderClock=await page.evaluate(()=>({
     source:window.__GENESIS_MERCENARY_LAB.shaderAnimation.lastClock,
     frames:window.__GENESIS_MERCENARY_LAB.shaderAnimation.updateFrames,
     appFrames:window.__GENESIS_MERCENARY_LAB.shaderAnimation.playCanvasFrames,
     clockFrames:window.__GENESIS_MERCENARY_LAB.shaderAnimation.previewClockFrames
   }));
   assert.ok(['playcanvas','preview-clock'].includes(shaderClock.source));
   assert.ok(shaderClock.frames>2,'Shader uniforms must advance on a live frame clock');
   state.shaderClock=shaderClock;
   assert.equal(await page.evaluate(()=>!!window.__GENESIS_MERCENARY_LAB?.shaderAnimation?.runtimeError),false,
       'Animated GLSL programs must update on actual PlayCanvas frames without exceptions');
   assert.ok(state.lab.shaderAnimation?.originalModelUnchanged);
   assert.equal(state.lab.shaderAnimation?.effects?.Rayo,'visual-approved-v07');
   assert.equal(state.lab.shaderAnimation?.effects?.Fuego,'experimental-v18');
   assert.equal(state.lab.shaderAnimation?.effects?.Hielo,'experimental-v21');
   const realChannels=['Fuego','Hielo','Rayo'];
   for(const kind of ['sword','shield']){
      const current=state.lab.halo3d?.[kind+'Channel'];
      if(realChannels.includes(current)){
        assert.ok(Number(state.lab.shaderAnimation?.active?.[kind]?.[current])>0,
          'NGE '+kind+' '+current+' animation must run at actual saved channel intensity');
      }
   }

   assert.equal(await page.locator('.pv9CompareEquipped .pv9ComparisonRarity').innerText(),'Común');
   assert.equal(await page.locator('.pv9CompareSelected .pv9ComparisonRarity').innerText(),'Bueno');
   assert.ok(await page.locator('.pv9CompareEquipped img').count()>0,'The equipped item is not an empty mock slot');
   assert.notEqual(await page.locator('.pv9CompareEquipped .pv9ComparisonName').innerText(),
                   await page.locator('.pv9CompareSelected .pv9ComparisonName').innerText());

   assert.equal(await page.locator('.mercConcept .pv9Slot').count(),10,'V09 must keep exactly ten original gear slots');
   const gearCenters=await page.locator('.pg4tShell .mcEquipSlot').evaluateAll(els=>els.map(el=>{
     const r=el.getBoundingClientRect(),board=el.closest('.pv9Board').getBoundingClientRect();
     return {x:+((r.left+r.width/2-board.left)/board.width).toFixed(3),
       y:+((r.top+r.height/2-board.top)/board.height).toFixed(3)};
   }));
   assert.equal(gearCenters.length,2);
   assert.ok(gearCenters.every(x=>Math.abs(x.x-.587)<.008),
     'Weapon/shield center must match 4-T right-hand gold frame (not V09): '+JSON.stringify(gearCenters));

   assert.equal(await page.locator('.mercConcept .pv9Viewer').count(),1,'real V049 GLB viewer must exist');
   assert.match(await page.locator('.pv9Viewer').getAttribute('data-asset-src'),/V050_4T_SHIELD_FIT_V12B_V015\.glb/);
   assert.match(await page.locator('.pg4tShell').evaluate(el=>getComputedStyle(el).backgroundImage),/Genesis_Mercenario_4T_Estado_Vacio_APROBADO/);
   state.approvedSources=await page.evaluate(()=>({runtime:window.GenesisMercenaryConcept?.version,otherInventory:window.GenesisInventory16?.version,hero:document.querySelector('.pv9Viewer')?.getAttribute('data-asset-src')}));
   assert.equal(state.approvedSources.runtime,'MERCENARY_APPROVED_4T_ML06_LIVE_EXPERIMENT');
   const approvedPng=path.join(ROOT,'assets/ui/mercenary/4t/Genesis_Mercenario_4T_Estado_Vacio_APROBADO.png');
   assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(approvedPng)).digest('hex'),'3e4236ca819ab449dce5ee6677b43a2684bd51f650d6cdbcd46a4868d6ebdbca','Approved 4T plate must remain untouched');
   state.poster=await page.locator('.pv9RealCyclesPoster').evaluate(e=>({complete:e.complete,w:e.naturalWidth,h:e.naturalHeight,opacity:getComputedStyle(e).opacity,rect:e.getBoundingClientRect().toJSON()}));
   assert.ok(state.poster.complete&&state.poster.w>200,'Authentic V050 Cycles image fallback must be visible when WebGL is busy');
   assert.ok(state.poster.rect.width<390,'Proportional mercenary viewport must fit center panel');
   assert.equal(await page.locator('.pg4tShell .mcInventorySlot.hasItem img[src$="V12B_REAL_SWORD_ICON_RGBA.png"]').count(),2,'Both real sword icons must appear in the 4T small slots');
   assert.equal(await page.locator('.mercConcept .mcInventorySlot').count(),20,'V09 must keep 20 original cells');
   assert.equal(await page.locator('.mercConcept .mcInventorySlot.hasItem').count(),2,'two authentic NGE creations in the current family');
   await page.locator('.pv9Viewer').evaluate(async(el)=>{try{await Promise.race([el.updateComplete||new Promise(()=>{}),new Promise(r=>setTimeout(r,25000))])}catch(_){}});
   state.hero=await page.locator('.pv9Viewer').evaluate(el=>({loaded:el.loaded,visible:el.modelIsVisible,src:el.getAttribute('data-asset-src')}));
   await page.screenshot({path:path.join(OUT,'01-4t-espadas-v050.png'),fullPage:true,timeout:25000});
   await page.locator('[data-action="inventory"]').click();
   await page.locator('.genInvCanonical').waitFor({timeout:15000});
   assert.match(await page.locator('.genInvCanonical').evaluate(el=>getComputedStyle(el).backgroundImage),/GENESIS_INVENTARIO_V05_CABECERA_PREPARACION/);
   assert.equal(await page.locator('.genInvSlot').count(),20);
   state.v05=await page.evaluate(()=>{
     const geom=(selector)=>{const el=document.querySelector(selector);if(!el)return null;const r=el.getBoundingClientRect(),c=getComputedStyle(el);return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),display:c.display,position:c.position,font:c.fontSize};};
     return {background:getComputedStyle(document.querySelector('.genInvCanonical')).backgroundImage,items:[...document.querySelectorAll('.genInvSlot:not(:disabled)')].map(e=>e.getAttribute('aria-label')),geometry:Object.fromEntries(['.genInvCanonical','.genInvMain','.genInvInfo','.genInvInfoLine','.genInvInfoLine>b','.genInvChannels','.genInvNgeText','.genInvViewer','.genInvViewerTitle','.genInvFamilies'].map(s=>[s,geom(s)]))};
   });
   await page.screenshot({path:path.join(OUT,'02-inventario-general-v05.png'),fullPage:true,timeout:25000});
   await page.locator('[data-nav="Preparacion"]').click();
   await page.locator('.pv9Board').waitFor({timeout:10000});
   await page.locator('[data-family="second"]').click();
   assert.equal(await page.locator('.mercConcept .mcInventorySlot').count(),20,'V09 must keep 20 original cells');
   assert.equal(await page.locator('.mercConcept .mcInventorySlot.hasItem').count(),2,'two authentic NGE creations in the current family');
   assert.equal(await page.locator('.pg4tShell .mcInventorySlot.hasItem img[src$="V015_REAL_SHIELD_ICON_RGBA.png"]').count(),2,'Both actual shield icons must appear in 4T small slots');
   assert.equal(await page.locator('.pv9CompareEquipped .pv9ComparisonRarity').innerText(),'Inútil');
   assert.equal(await page.locator('.pv9CompareSelected .pv9ComparisonRarity').innerText(),'Común');
   assert.ok(await page.locator('.pv9CompareEquipped img').count()>0,'Initial equipped shield must be present');
   const namesBefore=await page.locator('.pg4tShell :is(.pv9CompareEquipped,.pv9CompareSelected) .pv9ComparisonName').allInnerTexts();
   assert.notEqual(namesBefore[0],namesBefore[1],'A genuine alternate shield must differ from the original equipped shield');
   const shieldEquipped=page.locator('.pg4tShell .pv9Grid .pg4tAlreadyEquipped');
   assert.equal(await shieldEquipped.count(),1,'Exactly one shield is equipped');
   assert.equal(await shieldEquipped.isDisabled(),true,'Equipped shield must not be selectable');
   const previousCandidateName=await page.locator('.pv9CompareSelected .pv9ComparisonName').innerText();
   await shieldEquipped.evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));
   assert.equal(await page.locator('.pv9CompareSelected .pv9ComparisonName').innerText(),
     previousCandidateName,'Even a synthetic click must never compare an object against itself');
   assert.notEqual(await page.locator('.pv9CompareEquipped .pv9ComparisonName').innerText(),
     await page.locator('.pv9CompareSelected .pv9ComparisonName').innerText());

   assert.equal(await page.locator('.pg4tShell img[src*="Origen_V09"]').count(),0,'Obsolete V09 ORA sprites must not be used');
   const shields=await page.locator('.pg4tShell .mcInventorySlot.hasItem .pg4tItemVisual').evaluateAll(els=>els.map(el=>({affinity:el.dataset.affinity,strength:getComputedStyle(el).getPropertyValue('--fx-strength').trim(),img:el.querySelector('img')?.getAttribute('src')})));
   assert.equal(shields.length,2,'Both shields must have channel-bound live visual wrappers');
   assert.ok(shields.every(s=>s.img.includes('V015_REAL_SHIELD_ICON_RGBA.png')));
   state.channelFX={shield:shields,obsoleteOraLoaded:false};
   // ML08: all displayed channels must load their actual recovered V3.2 ORA PNGs.
   await page.locator('img[data-approved-ora="Base"]').waitFor({timeout:9000});
   await page.waitForFunction(()=>[...document.querySelectorAll('.pg4tShell img[data-approved-ora]')].every(x=>x.complete&&x.naturalWidth>=980),null,{timeout:10000});
   const oraRows=await page.locator('.pg4tShell .mcChannel').evaluateAll(els=>els.map(el=>{
     const img=el.querySelector('img[data-approved-ora]');
     return {name:el.dataset.channel,src:img?.getAttribute('src'),loaded:img?.naturalWidth>0};
   }));
   assert.ok(oraRows.length>0,'must show actual NGE channels in comparison');
   assert.ok(oraRows.every(c=>c.loaded&&c.src.includes('assets/ui/resultado/oras/')),'No placeholder / old ORA');
   assert.equal(await page.locator('.pg4tShell .pg4tChannelPending').count(),0);
   assert.equal(await page.locator('.pg4tShell .pg4tOraLoadError').count(),0);
   // Compare actual rectangles of each icon inner box against the live slot bounds.
   const bounds=await page.locator('.pg4tShell').evaluate(root=>{
     const groups=['.pv9Grid .mcInventorySlot.hasItem','.pv9Slot.mcEquipSlot','.pv9ComparisonIcon'];
     const result=[];
     for(const selector of groups)for(const slot of root.querySelectorAll(selector)){
       const inner=slot.querySelector('.pg4tIconFit');if(!inner)continue;
       const box=slot.getBoundingClientRect(),r=inner.getBoundingClientRect(),epsilon=1;
       result.push({kind:selector,contained:r.left>=box.left-epsilon&&r.right<=box.right+epsilon&&r.top>=box.top-epsilon&&r.bottom<=box.bottom+epsilon,
         ratio:+(r.width/Math.max(1,box.width)).toFixed(2)});
     }
     return result;
   });
   assert.ok(bounds.length>=4,'need tested icons in inventory/gear/comparison');
   assert.ok(bounds.every(x=>x.contained),'Icon out of its slot: '+JSON.stringify(bounds));
   state.ml08={oraRows,bounds};
   const cmpBounds=await page.locator('.pg4tShell .pv9CompareSelected').evaluate(card=>{
     const box=card.getBoundingClientRect(),name=card.querySelector('.pv9ComparisonName').getBoundingClientRect(),
       icon=card.querySelector('.pv9ComparisonIcon').getBoundingClientRect();
     return {nameWithin:name.left>=box.left-1&&name.right<=box.right+1&&name.bottom<=box.bottom+1,
       nameBelowIcon:name.top>=icon.top+icon.height-2};
   });
   assert.ok(cmpBounds.nameWithin&&cmpBounds.nameBelowIcon,'Procedural names must stay below the golden icon without overlapping: '+JSON.stringify(cmpBounds));
   state.ml09={initialSword:state.lab.initialSwordRarity,initialShield:state.lab.initialShieldRarity,
     chosenShield:state.lab.selectedShieldRarity,cmpBounds};
   await page.screenshot({path:path.join(OUT,'03-4t-escudos-v015.png'),fullPage:true,timeout:25000});
   await page.locator('[data-action="equip"]').click();
   await page.waitForFunction(()=>window.__GENESIS_MERCENARY_LAB?.status==='equipped',null,{timeout:125000}).catch(()=>null);
   state.lab=await page.evaluate(()=>window.__GENESIS_MERCENARY_LAB);
   if(state.lab.status!=='equipped'||state.lab.approved3d!==true||!String(state.lab.model).includes('V050'))throw new Error('El equipamiento V050 V12B/V015 falló: '+JSON.stringify(state.lab));
   assert.equal(state.lab.equipmentRevision,1,'Equip should update the equipped state exactly once');
   assert.equal(state.lab.equippedShieldRarity,'Común','Equipping the shield must replace the original Inútil');
   assert.equal(state.lab.equippedSwordRarity,'Común',
      'Equipping a shield MUST NOT silently replace the sword in the other family');
   assert.equal(state.lab.shaderAnimation?.status,'bound',
     'GLSL shader layer must survive gear replacement');
   assert.equal(state.lab.shaderAnimation?.active?.shield?.Fuego>0,true,
     'Actual NGE Fuego shield must activate existing Fire shader, not generic halo');

   assert.notEqual(state.lab.halo3d?.shieldChannel,'Base',
      'After equipping the upgraded shield the light must switch to the actual NGE element');
   state.stage='equipped';
   await page.screenshot({path:path.join(OUT,'04-v050-equipado-en-mundo.png'),fullPage:true,timeout:25000});
   await page.keyboard.press('e');
   await page.waitForTimeout(900);
   state.dossierVisible=await page.locator('.mercSheetBody').count()>0;
   if(state.dossierVisible)await page.screenshot({path:path.join(OUT,'05-dossier-mercenario.png'),fullPage:true,timeout:12000,animations:'disabled'}).catch(e=>state.warnings.push('Dossier screenshot skipped (low FPS): '+String(e.message).slice(0,95)));
   assert.ok(state.dossierVisible,'mercenary world interaction should open dossier');
   await page.locator('#mercSheetChangeGear').click();
   await page.locator('.pg4tShell .pv9CompareEquipped .pv9ComparisonRarity').waitFor({timeout:9000});
   await page.locator('[data-family="second"]').click();
   assert.equal(await page.locator('.pv9CompareEquipped .pv9ComparisonRarity').innerText(),'Común',
     'Reopening the equipment menu must retain the new equipped shield');
   assert.equal(await page.locator('.pv9CompareSelected .pv9ComparisonRarity').innerText(),'Inútil',
     'After replacement the former equipped item is the new alternative');
   assert.equal(await page.locator('.pg4tShell .pv9Grid .pg4tAlreadyEquipped').count(),1);
   assert.equal(await page.locator('.pg4tShell .pv9Grid .pg4tAlreadyEquipped').isDisabled(),true);
   assert.notEqual(await page.locator('.pv9CompareEquipped .pv9ComparisonName').innerText(),
     await page.locator('.pv9CompareSelected .pv9ComparisonName').innerText(),
     'The current shield must never be compared with itself');
   state.persistedAfterReopen=true;
   await page.screenshot({path:path.join(OUT,'06-4t-escudo-equipado-persistente.png'),fullPage:true,timeout:25000});
   await page.locator('[data-family="first"]').click();
   assert.equal(await page.locator('.pv9CompareEquipped .pv9ComparisonRarity').innerText(),'Común');
   assert.equal(await page.locator('.pv9CompareSelected .pv9ComparisonRarity').innerText(),'Bueno');
   assert.equal(await page.locator('.pg4tShell .pv9Grid .pg4tAlreadyEquipped').isDisabled(),true);
   await page.locator('[data-action="equip"]').click();
   await page.waitForFunction(()=>window.__GENESIS_MERCENARY_LAB?.equipmentRevision===2,null,{timeout:30000});
   state.lab=await page.evaluate(()=>window.__GENESIS_MERCENARY_LAB);
   assert.equal(state.lab.equippedSwordRarity,'Bueno','Sword must now upgrade via real NGE item');
   assert.equal(state.lab.equippedShieldRarity,'Común','Previously upgraded shield must remain equipped');
   assert.equal(state.lab.shaderAnimation?.status,'bound');
   const improvedSword=state.lab.halo3d?.swordChannel;
   if(['Hielo','Fuego','Rayo'].includes(improvedSword))
      assert.ok(Number(state.lab.shaderAnimation?.active?.sword?.[improvedSword])>0);
   await page.screenshot({path:path.join(OUT,'07-dossier-ambos-mejorados.png'),fullPage:true,timeout:25000});
   await page.locator('#mercSheetChangeGear').click();
   await page.locator('.pv9Board').waitFor({timeout:9000});
   assert.equal(await page.locator('.pv9CompareEquipped .pv9ComparisonRarity').innerText(),'Bueno');
   assert.equal(await page.locator('.pv9CompareSelected .pv9ComparisonRarity').innerText(),'Común');
   assert.equal(await page.locator('.pg4tShell .pv9Grid .pg4tAlreadyEquipped').isDisabled(),true);
   await page.screenshot({path:path.join(OUT,'08-comparacion-sin-objeto-contra-si-mismo.png'),fullPage:true,timeout:12000,animations:'disabled'})
     .catch(e=>state.warnings.push('Final screenshot skipped at low FPS (gameplay assertions passed): '+String(e.message).slice(0,140)));
   state.stage='passed';
   console.log('PASS: exact original approved Mercenary 4-T art, actual V050 V12B and smaller V015, NGE 4 items with real render-derived thumbnails, world + E dossier');
 }catch(err){state.failure=String(err?.stack||err);console.error('FAIL:',state.failure);if(page&&state.stage!=='started')try{await page.screenshot({path:path.join(OUT,'error-debug.png'),fullPage:true,timeout:8000})}catch(_){ }process.exitCode=1}
 finally{try{if(page)state.lab=state.lab||await page.evaluate(()=>window.__GENESIS_MERCENARY_LAB||null)}catch(_){}fs.writeFileSync(path.join(OUT,'diagnostico.json'),JSON.stringify(state,null,2));if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
