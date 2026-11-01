/* Approved inventory artwork and LIVE data/browser regression test. No fabricated game content. */
const { chromium }=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const MIME={'.png':'image/png','.webp':'image/webp','.css':'text/css','.js':'application/javascript','.html':'text/html','.glb':'model/gltf-binary'};
(async()=>{
const b=await chromium.launch({headless:true});
try{
 const page=await b.newPage({viewport:{width:1672,height:941}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'');
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());const filename=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(u.pathname==='/'||u.pathname==='/index.html')return route.fulfill({status:200,contentType:'text/html',body:html});
  if(!filename.startsWith(root+path.sep)||!fs.existsSync(filename))return route.abort();
  return route.fulfill({status:200,contentType:MIME[path.extname(filename)]||'application/octet-stream',body:fs.readFileSync(filename)});
 });
 await page.goto('http://genesis.local/index.html');
 for(const p of ['preparacion.css','responsive.css','inventario_genesis_16x9.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,p),'utf8')});
 for(const p of ['art_registry_genesis_inventory.js','inventario_genesis_16x9.js','preparacion_control.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,p),'utf8')});
 await page.evaluate(()=>{
  window.stock={'Lingote de hierro':3,'Mineral de hierro':7};window.items=[];
  window.openLive=()=>GenesisPreparation.open({profession:'Herrero',inventory:stock,
    requiredStock:{'Lingote de hierro':4},formula:{materials:[{material:'Lingote de hierro',qty:1}]},
    recipeName:'Espada de hierro',startTab:'Inventario',getItems:()=>items,renderAsset:item=>`<span class="test-asset">${item.name}</span>`,
    onCraft(){},modal(html,extra){const m=document.getElementById('modal');m.className='modal '+extra;m.innerHTML=html;document.getElementById('modalLayer').style.display='grid'},
    closeModal(){document.getElementById('modalLayer').style.display='none'}
  });openLive();
 });
 await page.waitForSelector('#genesisInvApproved');
 assert.equal(await page.locator('.invSlot').count(),20);
 assert.equal(await page.locator('.fam').count(),1);
 assert.equal(await page.locator('[data-family="Espadas"]').count(),0);
 assert.equal(await page.locator('.sheet').count(),0);
 assert.equal(await page.locator('.invSlot:disabled').count(),18);
 assert.equal(await page.locator('[data-tab]').count(),4);
 const src=await page.locator('.pgInv').evaluate(e=>getComputedStyle(e).backgroundImage);
 assert(src.includes('Inventario_skin_sin_datos.png'),'approved skin is the actual UI background');
 const imgs=await page.evaluate(()=>Promise.all(["assets/ui/inventario_v2/Inventario_skin_sin_datos.png","assets/ui/inventario_v2/family_normal.png"].map(async src=>{
   const i=new Image();i.src=src;try{await i.decode()}catch{}return {src,ok:i.naturalWidth>0};
 })));
 assert(imgs.every(i=>i.ok),'original extracted graphics must load');
 await page.evaluate(()=>{stock={};items=[];openLive()});
 assert.equal(await page.locator('.invSlot:disabled').count(),20);
 assert.equal(await page.locator('.fam').count(),0);
 const out='/tmp/genesis-approved-inventory';fs.mkdirSync(out,{recursive:true});
 await page.screenshot({path:out+'/inventario-aprobado-vacio.png'});
 await page.evaluate(()=>{stock={'Lingote de hierro':3};items=[
  {id:'obj-01',name:'Escudo de hierro',family:'Escudos',rarity:'Común',channels:[['Base',44],['Tierra',31]],ngeStory:'Historia registrada en el objeto al cierre.'},
  {id:'obj-02',name:'Espada de hierro',family:'Espadas',rarity:'Común',channels:[['Base',18]]}
 ];openLive();});
 assert.equal(await page.locator('.fam').count(),3);
 await page.locator('[data-family="Escudos"]').click();
 assert.equal(await page.locator('.invSlot:disabled').count(),19);
 assert.equal(await page.locator('.channel').count(),2);
 assert((await page.locator('.channel').last().innerText()).includes('31'));
 assert((await page.locator('.nge').innerText()).includes('Historia registrada'));
 assert.equal(await page.locator('.sheet').count(),1);
 assert.equal(await page.locator('#genInvGoCraft').count(),0);
 await page.screenshot({path:out+'/inventario-aprobado-escudos.png'});
 await page.locator('.sheet').click();
 assert.equal(await page.locator('.panelOverlay').count(),1);
 assert((await page.locator('.panelOverlay').innerText()).includes('Historia registrada'));
 await page.locator('.panelOverlay .close').click();
 assert.equal(await page.locator('.panelOverlay').count(),0);
 await page.locator('[data-tab="Fabricaciones"]').click();
 assert.equal(await page.locator('.prepArtboard[data-active-tab="Fabricaciones"]').count(),1);
 assert.deepEqual(errors,[]);
 console.log('PASS: original approved exact skin, 16:9, 20 slots, live families, live channels and NGE, full public sheet and navigation');
}finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});
