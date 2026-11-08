'use strict';
// V014.031. QA del arte original sobre el inventario real (fixture controlado);
// no reemplaza la prueba de partida de PlayCanvas.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'previews','main-v014031-inventory-approved');
fs.mkdirSync(out,{recursive:true});
const src='assets/ui/inventario/INVENTARIO_BASE_LIMPIA_APROBADA_16x9.png';
const approved=fs.readFileSync(path.join(root,src));
const sha256=crypto.createHash('sha256').update(approved).digest('hex');
const expected=JSON.parse(fs.readFileSync(path.join(root,'assets/ui/inventario/manifest.json'),'utf8')).original_sha256;
const expectedWidth=1672,expectedHeight=941;
assert.equal(sha256,expected,'Artwork bytes differ from the approved original');
assert.equal(approved.readUInt32BE(16),expectedWidth,'Artwork width changed');
assert.equal(approved.readUInt32BE(20),expectedHeight,'Artwork height changed');
const check=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const html=check('index.html');
assert.match(html,/<title>/);
assert.match(check('preparacion_control.js'),/inventario_arte_aprobado_1to1\.css\?v=0\.14\.031-main/);
assert.match(check('inventario_genesis_16x9.js'),/INVENTARIO_16x9_V014031_ORA_APROBADO_1A1/);


const issues=[],logs=[];
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 page.on('pageerror',e=>issues.push('JS '+e.message));
 page.on('requestfailed',req=>issues.push('RESOURCE '+req.url()+' '+req.failure()?.errorText));
 await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body style="margin:0;background:#101010"><div id="modalLayer" style="position:fixed;inset:0;display:grid;place-items:center"><div id="modal" class="modal"></div></div></body></html>'});
   const pathname=decodeURIComponent(url.pathname).replace(/^\/+/,'');
   const p=path.resolve(root,pathname);
   if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())return route.abort('failed');
   const mime=path.extname(p)==='.png'?'image/png':path.extname(p)==='.css'?'text/css':'application/javascript';
   return route.fulfill({status:200,contentType:mime,body:fs.readFileSync(p)});
 });
 await page.goto('http://genesis.local/');
 for(const p of ['inventario_genesis_16x9.css','inventario_arte_aprobado_1to1.css'])await page.addStyleTag({content:check(p)});
 await page.evaluate(()=>window.GenesisDevice={safePreviews:true});
 await page.addScriptTag({content:check('inventario_genesis_16x9.js')});
 await page.evaluate(()=>{
   const ctx={
     inventory:{'Mineral de hierro':3,'Lingote de hierro':2},
     getItems:()=>[],
     modal(html,cls){const m=document.getElementById('modal');m.className='modal '+cls;m.innerHTML=html;},
     renderAsset:()=>'',profession:'Herrero'
   };
   window.__INVENTORY_TEST_CONTEXT__=ctx;
   window.GenesisInventory16.render(ctx,{renderMenu(){window.__NAV__='Preparacion'},renderWorkspace(tab){window.__NAV__=tab},sheetForItem:()=>''});
 });
 await page.waitForSelector('.genInvCanonical',{timeout:11000});
 await page.waitForFunction(()=>document.querySelector('#genInv')?.dataset.approvedArt==='original-1672x941');
 assert.equal(await page.locator('.genInvSlot').count(),20);
 assert.equal(await page.locator('.genInvTab').count(),4);
 // Contrato visual V05: pestañas originales en coordenadas de Preparación.
 const navCheck=await page.evaluate(()=>{
   const root=document.getElementById('genInv'),board=root.getBoundingClientRect();
   const nav=root.querySelector('.genInvNav').getBoundingClientRect();
   const tabs=[...root.querySelectorAll('.genInvTab')].map(el=>{
     const rect=el.getBoundingClientRect(),img=el.querySelector('img');
     return {left:(rect.left-board.left)/board.width,top:(rect.top-board.top)/board.height,
       width:rect.width/board.width,height:rect.height/board.height,
       visible:getComputedStyle(img).visibility==='visible',
       loaded:img?.complete&&img?.naturalWidth>0,
       current:el.getAttribute('aria-current')};
   });
   return {x:(nav.left-board.left)/board.width,y:(nav.top-board.top)/board.height,
     width:nav.width/board.width,height:nav.height/board.height,
     tabs,underlay:getComputedStyle(root,'::before').backgroundImage};
 });
 assert(Math.abs(navCheck.x-.16824)<.01,'V05 header X does not match Preparacion');
 assert(Math.abs(navCheck.y-.0385)<.01,'V05 header Y does not match Preparacion');
 assert(Math.abs(navCheck.width-.68115)<.01,'V05 tabs must retain exact Preparacion width');
 assert(Math.abs(navCheck.height-.0918)<.015,'V05 tabs must retain exact Preparacion height');
 assert(navCheck.underlay.includes('FondoEstructural.png'),'V05 header must reuse approved structural source');
 assert(navCheck.tabs.every(t=>t.visible&&t.loaded),'Original Preparacion tab PNGs must be visibly rendered');
 assert.equal(navCheck.tabs.filter(t=>t.current==='page').length,1,'Only Inventario is active');
 const ratios=[294,320,328,298].map(n=>n/1240);
 navCheck.tabs.forEach((tab,i)=>{
   assert(Math.abs(tab.width/navCheck.width-ratios[i])<.012,'V05 tab '+i+' has wrong relative width');
 });

 assert.equal(await page.locator('.genInvFamily').count(),1);
 assert.equal(await page.locator('#genInvGoCraft').count(),0);
 assert.equal(await page.locator('.genInvSlot:not(:disabled)').count(),2);
 const geom=await page.evaluate(()=>{
  const root=document.querySelector('#genInv'),css=getComputedStyle(root),r=root.getBoundingClientRect(),nodes={};
  for(const sel of ['.genInvNav','.genInvFamilies','.genInvViewer','.genInvInfo','.genInvGrid','.genInvSlots']){
    const e=root.querySelector(sel),g=e.getBoundingClientRect();nodes[sel]={x:Math.round(g.x-r.x),y:Math.round(g.y-r.y),w:Math.round(g.width),h:Math.round(g.height)};
  }
  return{width:r.width,height:r.height,ratio:r.width/r.height,background:css.backgroundImage,approved:root.dataset.approvedArt,nodes};
 });
 assert(Math.abs(geom.ratio-1672/941)<.004,'1:1 approved art aspect');
 assert(geom.background.includes('INVENTARIO_BASE_LIMPIA_APROBADA_16x9.png'),'must draw approved artwork');
 assert(geom.nodes['.genInvSlots'].w>300,'slots layer must occupy intended panel');
 logs.push({resolution:'1600x900',geometry:geom});
 await page.screenshot({path:path.join(out,'01-inventario-1600x900.png'),fullPage:false,animations:'disabled'});
 await page.locator('.genInvTab[data-nav="Preparacion"]').click();
 assert.equal(await page.evaluate(()=>window.__NAV__),'Preparacion','tab interaction should work');
 await page.setViewportSize({width:1280,height:720});
 logs.push({resolution:'1280x720',visibleSlots:await page.locator('.genInvSlot').count()});
 await page.screenshot({path:path.join(out,'02-inventario-1280x720.png'),fullPage:false,animations:'disabled'});
 assert.equal(issues.length,0,issues.join('\n'));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result:'PASS',version:'main / Inventario V014.031',approvedSourceSHA256:sha256,issues,logs},null,2));
 console.log('PASS MAIN_V014031_INVENTORY_APPROVED_SOURCE_MATCH',JSON.stringify({approvedSourceSHA256:sha256,ratio:geom.ratio,slots:20,live:2}));
}finally{await browser.close()}
})().catch(err=>{
 console.error(err.stack||String(err));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result:'FAIL',error:String(err.stack||err),issues,logs},null,2));
 process.exit(1);
});
