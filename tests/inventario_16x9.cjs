
/* A browser check against the real inventory controller and the original 39 image assets.
   Only the test session data are fixtures; production reads ctx.inventory/getItems. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.glb':'model/gltf-binary'};
(async()=>{
const browser=await chromium.launch({headless:true});
try{
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const raw=fs.readFileSync(path.join(root,'index.html'),'utf8');
const cleaned=raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/'||url.pathname==='/index.html') return route.fulfill({status:200,contentType:'text/html',body:cleaned});
  const p=path.resolve(root,'.'+decodeURIComponent(url.pathname));
  if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())return route.abort();
  return route.fulfill({status:200,contentType:mime[path.extname(p)]||'application/octet-stream',body:fs.readFileSync(p)});
});
await page.goto('http://genesis.local/index.html');
for(const f of ['preparacion.css','responsive.css','inventario_genesis_16x9.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,f),'utf8')});
await page.evaluate(()=>{window.GenesisDevice={safePreviews:true};for(const id of ['loading','prototypeIntro']){const el=document.getElementById(id);if(el)el.style.display='none'}});
await page.addScriptTag({content:fs.readFileSync(path.join(root,'inventario_genesis_16x9.js'),'utf8')});
await page.addScriptTag({content:fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8')});
await page.evaluate(()=>{
  window.stock={'Lingote de hierro':3,'Mineral de hierro':7};
  window.items=[];
  window.openLive=()=>GenesisPreparation.open({
    profession:'Herrero',inventory:stock,requiredStock:{'Lingote de hierro':4},
    formula:{materials:[{material:'Lingote de hierro',qty:1}]},
    recipeName:'Espada de hierro',startTab:'Inventario',
    getItems:()=>items,
    renderItem:i=>'<span>'+i.name+'</span>',
    renderAsset:i=>i?'<div class="testCreation3D">'+i.name+'</div>':'',
    recipeAsset:()=>'<span>Espada de hierro</span>',
    namingReason:item=>'Objeto cerrado: '+item.name,
    onCraft:()=>{},
    modal(html,extra){const m=document.querySelector('#modal');m.className='modal '+extra;m.innerHTML=html;document.querySelector('#modalLayer').style.display='grid'},
    closeModal(){document.querySelector('#modalLayer').style.display='none'}
  });openLive();
});
await page.waitForSelector('#genInv');
assert.equal(await page.locator('.genInvSlot').count(),20,'20 slots in active family');
assert.equal(await page.locator('#genInvGoCraft').count(),0,'approved inventory has no redundant Ir a Fabricaciones button');
assert.equal(await page.locator('.genInvTab').count(),4,'only four original navigation tabs');
assert.equal(await page.locator('.genInvFamily').count(),1,'Only material family appears before any creation exists');
assert.equal(await page.locator('.genInvFamily span:last-child').first().innerText(),'Materiales');
assert.equal(await page.locator('.genInvImageWrap img').count(),1,'known material has a fixed poster');
const bounds=await page.locator('.genInv').boundingBox();
assert(Math.abs(bounds.width/bounds.height-16/9)<.005,'16:9 interior artboard');
const geometries=await page.evaluate(()=>{
 const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
 return {left:box('.genInvFamilies'),hero:box('.genInvViewer'),info:box('.genInvInfo'),grid:box('.genInvGrid'),slot:box('.genInvSlot'),heroImg:box('.genInvImageWrap img'),heroWrap:box('.genInvImageWrap'),
 viewerBg:getComputedStyle(document.querySelector('.genInvViewer')).backgroundImage};
});
assert(geometries.left.right<=geometries.hero.left+2,'family tree must not overlap the viewer');
assert(geometries.hero.right<=geometries.info.left+2,'viewer must not overlap information');
assert(geometries.hero.bottom<=geometries.grid.top+2,'viewer must not overlap 20-slot grid');
assert(geometries.slot.width/geometries.slot.height>=.8&&geometries.slot.width/geometries.slot.height<=1.32,'slots need nearly square proportions');
assert(geometries.heroImg.bottom < geometries.heroWrap.bottom+1,'preview image must remain inside its viewer');
assert(!geometries.viewerBg.includes('FondoVisorHerreria'),'no baked anvil under the inventory item');
assert.equal(await page.locator('.genInvSlot:not(:disabled)').count(),2);
await page.evaluate(()=>{stock={};items=[];openLive()});
assert.equal(await page.locator('.genInvSlot:not(:disabled)').count(),0,'empty live inventory must show twenty empty slots');
assert.equal(await page.locator('[data-family="Espadas"]').count(),0,'no invented family without actual creations');
await page.evaluate(()=>{stock={'Lingote de hierro':3,'Mineral de hierro':7};openLive()});
const out='/tmp/genesis-responsive';fs.mkdirSync(out,{recursive:true});
await page.waitForFunction(()=>Array.from(document.querySelectorAll('.genInvTab img')).length===4&&Array.from(document.querySelectorAll('.genInvTab img')).every(i=>i.complete&&i.naturalWidth>0));
await page.screenshot({path:out+'/inventario-16x9-materiales.png',fullPage:false});
await page.evaluate(()=>{
  items.push({name:'Espada de hierro',recipe:'espada',rarity:'Común',channels:[['Base',18]],ngeStory:'Relato original de la espada registrado al cierre.'});
  items.push({name:'Escudo de hierro',recipe:'escudo',rarity:'Bueno',channels:[['Base',30]]});
  openLive();
});
assert.equal(await page.locator('.genInvFamily').count(),3);
await page.locator('[data-family="Espadas"]').click();
assert.equal(await page.locator('.genInvSlot:not(:disabled)').count(),1);
assert.equal(await page.locator('.genInvInfoTitle').innerText(),'INFORMACIÓN');
assert.equal(await page.locator('.genInvChannel').count(),1,'Actual channel entries only');
assert((await page.locator('.genInvChannel').first().innerText()).includes('18'),'Channel intensity comes from item snapshot');
assert((await page.locator('.genInvNgeText').innerText()).includes('Relato original'),'NGE narrative comes from saved object');
assert.equal(await page.locator('#genInvDetails span').innerText(),'CONSULTAR FICHA DEL OBJETO');
assert(await page.locator('#genInvDetails').isVisible(),'full item sheet button must remain visible');
const fit=await page.evaluate(()=>{
 const parent=document.querySelector('.genInvInfo').getBoundingClientRect();
 const rows=[...document.querySelectorAll('.genInvInfo .genInvChannel,.genInvInfo .genInvNgeText,.genInvInfoMore')];
 return rows.map(el=>({name:el.className,top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,limit:parent.bottom}));
});
assert(fit.every(r=>r.top>=0&&r.bottom<=r.limit+1),'NGE, channels and button must fit entirely inside info panel');
assert.equal(await page.locator('.genInvViewer .genInvViewLabel').innerText(),'Objeto fabricado · visor 360°');
await page.waitForFunction(()=>Array.from(document.querySelectorAll('.genInvTab img')).length===4&&Array.from(document.querySelectorAll('.genInvTab img')).every(i=>i.complete&&i.naturalWidth>0));
await page.screenshot({path:out+'/inventario-16x9-espadas.png',fullPage:false});
await page.locator('#genInvGoCraft').click();
assert.equal(await page.locator('.prepArtboard[data-active-tab="Fabricaciones"]').count(),1);
assert.equal(errors.length,0,errors.join('\n'));
console.log('PASS Inventory V01: live stock source, 20 slots, dyn families, static material poster, 16:9, navigation.');
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
