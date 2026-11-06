'use strict';
/* Playwright isolated UI verification using authentic generateSession stock and
   the actual game inventory JS/CSS. Separately run the full game E2E. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {chromium}=require('playwright');
const out='previews/v014024-material-3d';
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync('index.html','utf8');
const m=html.match(/<script\\b[^>]*\\bid=["']genesis-prototype-engines["'][^>]*>([\\s\\S]*?)<\\/script>/i);
assert(m,'Original game engine missing');
const sandbox={window:{},console,Date,Math,performance:{now:()=>100}};
vm.runInNewContext(m[1],sandbox,{timeout:30000});
const game=sandbox.window.GenesisPrototypeEngines;
const materials=['Mineral de hierro','Carbón vegetal','Madera seca de roble','Madera seca de fresno','Cuero bovino curtido','Cuero caprino curtido','Cordel de cáñamo','Hilo de lino'];
const cases=new Map();
for(let seed=1;seed<=512&&cases.size<8;seed++){
 const session=game.generateSession('Herrero',{seed}),inventory={...session.requiredStock};
 const ingot=inventory['Lingote de hierro']||0;
 if(ingot){delete inventory['Lingote de hierro'];inventory['Mineral de hierro']=(inventory['Mineral de hierro']||0)+ingot;}
 for(const material of materials)if(inventory[material]>0&&!cases.has(material))cases.set(material,{seed,inventory});
}
assert.equal(cases.size,8);
const manifest={qa:'V014.024 real GLB in isolated genuine inventory component',materials:{},issues:[],fullGamePlaythrough:'separate job'};
const sleep=n=>new Promise(r=>setTimeout(r,n));
async function main(){
 const server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1'],{stdio:'ignore'});
 let browser;
 try{
   await sleep(900);
   browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
   for(const [index,name] of materials.entries()){
     const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
     const page=await context.newPage();page.setDefaultTimeout(18000);
     page.on('pageerror',e=>{manifest.issues.push({material:name,error:String(e.message)})});
     await page.route('**/v014024-3d-fixture',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/preparacion.css"><link rel="stylesheet" href="/inventario_genesis_16x9.css"><style>html,body{margin:0;width:100%;height:100%;background:#17130f}#modalLayer{width:100%;height:100%}</style><script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js"></script></head><body><div id="modalLayer"></div><script src="/inventario_genesis_16x9.js"></script></body></html>'}));
     await page.goto('http://127.0.0.1:8766/v014024-3d-fixture',{waitUntil:'domcontentloaded'});
     await page.waitForFunction(()=>!!customElements.get('model-viewer'),null,{timeout:45000});
     const test=cases.get(name);
     await page.evaluate(stock=>{
       const ctx={inventory:stock,getItems:()=>[],modal:(content)=>document.getElementById('modalLayer').innerHTML=content};
       window.GenesisInventory16.render(ctx,{renderMenu:()=>{},renderWorkspace:()=>{},sheetForItem:()=>''});
     },test.inventory);
     const slot=page.locator('.genInvSlot[data-select]').filter({has:page.locator('.genInvMaterialThumb')}).filter({hasText:name});
     // The buttons have aria-labels, not necessarily text nodes.
     const target=page.locator('.genInvSlot[data-select][aria-label="'+name+'"]');
     assert.equal(await target.count(),1,'Missing real seed slot '+name);
     await target.click({force:true});
     assert.equal((await page.locator('.genInvViewerTitle').textContent()).trim(),name);
     const hero=page.locator('.genInvImageWrap model-viewer.genInvMaterialHeroModel');
     assert.equal(await hero.count(),1,'Hero is not actual GLB for '+name);
     const src=await hero.getAttribute('src');
     assert(src.endsWith('.glb'),'Not GLB: '+src);
     await page.waitForFunction(()=>{
       const el=document.querySelector('.genInvImageWrap model-viewer');
       return el?.loaded===true||el?.dataset.glbLoaded==='true'||!!document.querySelector('.genInvImageWrap [data-model-error]');
     },null,{timeout:85000});
     assert(await hero.count(),'3D model fallback rendered for '+name);
     const loaded=await hero.evaluate(e=>({loaded:e.loaded,flag:e.dataset.glbLoaded,src:e.getAttribute('src')}));
     assert(loaded.loaded||loaded.flag==='true','WebGL renderer did not finish loading '+name);
     const rect=await target.boundingBox();assert(rect);
     await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
     const slotModel=target.locator('model-viewer.genInvMaterialSlotModel');
     await slotModel.waitFor({state:'attached',timeout:12000});
     await page.mouse.move(rect.x+rect.width*.02,rect.y+rect.height*.5);
     const left=await slotModel.getAttribute('camera-orbit');
     await page.mouse.move(rect.x+rect.width*.98,rect.y+rect.height*.5);
     const right=await slotModel.getAttribute('camera-orbit');
     assert(parseFloat(left)<-39&&parseFloat(right)>39,'Not real ±45° GLB orbit '+name+' '+left+'/'+right);
     await page.mouse.move(rect.x+rect.width+20,rect.y+rect.height+20);
     assert.equal(await slotModel.getAttribute('camera-orbit'),'0deg 75deg auto','GLB orbit reset '+name);
     assert(await target.evaluate(el=>getComputedStyle(el).backgroundImage.includes('Casilla_Basicos_01.png')),'ORA frame changed');
     const filename=String(index+1).padStart(2,'0')+'-'+name.replace(/[^a-z0-9]+/gi,'_')+'.png';
     try{await page.screenshot({path:path.join(out,filename),timeout:10000,animations:'disabled'})}
     catch(e){manifest.issues.push({material:name,screenshotFailure:String(e.message).slice(0,250)})}
     manifest.materials[name]={seed:test.seed,src,loaded,slotOrbit:{left,right,reset:'0deg 75deg auto'},screenshot:filename};
     console.log('REAL_3D_MATERIAL_VERIFIED',name,JSON.stringify(manifest.materials[name]));
     await context.close();
   }
   assert.equal(Object.keys(manifest.materials).length,8);
   manifest.result='PASS';
 }finally{
   fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
   if(browser)await browser.close();
   server.kill();
 }
}
main().catch(e=>{console.error('REAL_3D_QA_FAILED',e.stack||e);process.exitCode=1});
