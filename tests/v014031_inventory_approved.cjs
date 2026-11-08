'use strict';
// V014.031. QA del arte original sobre el inventario real (fixture controlado);
// no reemplaza la prueba de partida de PlayCanvas.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'previews','v014031-inventory-approved');
fs.mkdirSync(out,{recursive:true});
const src='assets/ui/inventario/GENESIS_INVENTARIO_V05_CABECERA_PREPARACION_1820x1024.png';
const approved=fs.readFileSync(path.join(root,src));
const sha256=crypto.createHash('sha256').update(approved).digest('hex');
const expected='0eecbcd19f4f997b45dedcd5a2f00acd0051254ece358b7bdc8f05c84c0bd6cf';
const expectedWidth=1820,expectedHeight=1024;
assert.equal(sha256,expected,'Artwork bytes differ from the approved original');
assert.equal(approved.readUInt32BE(16),expectedWidth,'Artwork width changed');
assert.equal(approved.readUInt32BE(20),expectedHeight,'Artwork height changed');
const check=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const html=check('index.html');
assert.match(html,/genesis-game-version" content="V014\.031"/);
assert.match(html,/<title>Project Genesis v0\.14\.031/);
assert.match(check('preparacion_control.js'),/inventario_arte_aprobado_1to1\.css\?v=0\.14\.031/);
assert.match(check('inventario_genesis_16x9.js'),/INVENTARIO_V05_V014031_PREPARACION_EXACTA/);
assert.match(check('index.html'),/id="bellowsModel"[^>]+scale="\.35 \.35 \.35"/);
assert.match(check('index.html'),/\[4\.92,-8\.42,\.32\]/);
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
     inventory:{'Mineral de hierro':3,'Carbón vegetal':2,'Madera seca de roble':1,'Madera seca de fresno':2,'Cuero bovino curtido':4,'Cuero caprino curtido':3,'Cordel de cáñamo':5,'Hilo de lino':4},
     getItems:()=>[],
     modal(html,cls){const m=document.getElementById('modal');m.className='modal '+cls;m.innerHTML=html;},
     renderAsset:()=>'',profession:'Herrero'
   };
   window.__INVENTORY_TEST_CONTEXT__=ctx;
   window.GenesisInventory16.render(ctx,{renderMenu(){window.__NAV__='Preparacion'},renderWorkspace(tab){window.__NAV__=tab},sheetForItem:()=>''});
 });
 await page.waitForSelector('.genInvCanonical',{timeout:11000});
 await page.waitForFunction(()=>document.querySelector('#genInv')?.dataset.approvedArt==='v05-preparacion-1820x1024');
 assert.equal(await page.locator('.genInvSlot').count(),20);
 assert.equal(await page.locator('.genInvTab').count(),4);
 assert.equal(await page.locator('.genInvFamily').count(),1);
 assert.equal(await page.locator('#genInvGoCraft').count(),0);
 assert.equal(await page.locator('.genInvSlot:not(:disabled)').count(),8,'Eight real material entries');
 const geom=await page.evaluate(()=>{
  const root=document.querySelector('#genInv'),css=getComputedStyle(root),r=root.getBoundingClientRect(),nodes={};
  for(const sel of ['.genInvNav','.genInvFamilies','.genInvViewer','.genInvInfo','.genInvGrid','.genInvSlots']){
    const e=root.querySelector(sel),g=e.getBoundingClientRect();nodes[sel]={x:Math.round(g.x-r.x),y:Math.round(g.y-r.y),w:Math.round(g.width),h:Math.round(g.height)};
  }
  return{width:r.width,height:r.height,ratio:r.width/r.height,background:css.backgroundImage,approved:root.dataset.approvedArt,nodes};
 });
 assert(Math.abs(geom.ratio-1820/1024)<.004,'V05 exact Preparation panorama aspect');
 assert(geom.background.includes('GENESIS_INVENTARIO_V05_CABECERA_PREPARACION_1820x1024.png'),'must draw user-reviewed V05 candidate');
 assert(geom.nodes['.genInvSlots'].w>300,'slots layer must occupy intended panel');

 // The four clickable regions must coincide with the ORIGINAL Preparation buttons,
 // not only use the same general appearance or approximate widths.
 const tabBoxes=await page.locator('.genInvTab').evaluateAll((nodes)=>
   nodes.map(node=>{const parent=document.querySelector('#genInv').getBoundingClientRect();const r=node.getBoundingClientRect();
     return {x:r.x-parent.x,y:r.y-parent.y,w:r.width,h:r.height}}));
 const k=geom.width/1820;
 for(const [i,[x,y,w,h]] of [[306,42,294,94],[600,42,320,94],[920,42,328,94],[1248,42,298,94]].entries()){
   const b=tabBoxes[i];
   for(const [key,v] of Object.entries({x,y,w,h})){
     assert(Math.abs(b[key]-v*k)<1.7,'Preparation original tab '+i+' '+key+' expected '+v*k+' actual '+b[key]);
   }
 }
 const slotsRects=await page.locator('.genInvSlot').evaluateAll(nodes=>
   nodes.map(node=>{const p=document.querySelector('#genInv').getBoundingClientRect();const r=node.getBoundingClientRect();
     return{x:r.x-p.x,y:r.y-p.y,w:r.width,h:r.height}}));
 assert.equal(slotsRects.length,20);
 const s1=slotsRects[0],s10=slotsRects[9],s11=slotsRects[10];
 assert(s1.x>390*k && s1.x<425*k && s1.y>590*k && s1.y<625*k,'First slot aligned with painted first frame');
 assert(s10.x>1490*k && s10.x<1525*k,'Tenth slot aligned with painted last frame');
 assert(s11.y>700*k && s11.y<745*k,'Second slot row aligned with bottom painted row');
 logs.push({tabs:tabBoxes,slotFirst:s1,slotTenth:s10,slotSecondRowFirst:s11});

 logs.push({resolution:'1600x900',geometry:geom});
 await page.screenshot({path:path.join(out,'01-inventario-1600x900.png'),fullPage:false,animations:'disabled'});
 await page.locator('.genInvTab[data-nav="Preparacion"]').click();
 assert.equal(await page.evaluate(()=>window.__NAV__),'Preparacion','tab interaction should work');
 await page.setViewportSize({width:1280,height:720});
 logs.push({resolution:'1280x720',visibleSlots:await page.locator('.genInvSlot').count()});
 await page.screenshot({path:path.join(out,'02-inventario-1280x720.png'),fullPage:false,animations:'disabled'});
 assert.equal(issues.length,0,issues.join('\n'));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result:'PASS',version:'V014.031',approvedSourceSHA256:sha256,issues,logs},null,2));
 console.log('PASS V014031_V05_EXACT_PREPARATION_TABS_AND_8_MATERIAL_SLOTS',JSON.stringify({approvedSourceSHA256:sha256,ratio:geom.ratio,slots:20,live:8}));
}finally{await browser.close()}
})().catch(err=>{
 console.error(err.stack||String(err));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result:'FAIL',error:String(err.stack||err),issues,logs},null,2));
 process.exit(1);
});
