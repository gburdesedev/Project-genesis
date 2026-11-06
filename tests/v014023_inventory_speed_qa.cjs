'use strict';
/* V014.023 QA: real GenesisPrototypeEngines seed inventory + exact approved inventory component.
   Also checks gameplay thermal API. This is a DOM/image test, not a completed Ordan playthrough. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{spawn}=require('node:child_process');
const {chromium}=require('playwright');
const out='previews/v014023-materials-speed';
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync('index.html','utf8');
const match=html.match(/<script\b[^>]*\bid=["']genesis-prototype-engines["'][^>]*>([\s\S]*?)<\/script>/i);
assert(match,'Missing genuine embedded GenesisPrototypeEngines');
const engineCtx={window:{},console,Date,Math,performance:{now:()=>100}};
vm.runInNewContext(match[1],engineCtx,{timeout:30000});
const engine=engineCtx.window.GenesisPrototypeEngines;
assert.equal(typeof engine?.generateSession,'function');
const prepCtx={window:{GenesisDevice:{}},document:{},performance:{now:()=>0},addEventListener:()=>{},requestAnimationFrame:()=>0,console,Math,Date};
vm.runInNewContext(fs.readFileSync('preparacion_control.js','utf8'),prepCtx,{timeout:30000});
const prep=prepCtx.window.GenesisPreparation;
assert(prep,'Missing live GenesisPreparation');
const profile=prep.batchProfile(1);
const gain=prep.progressGain(72,72,profile,1);
const cooled=prep.passiveCooling(72,10,profile);
assert(Math.abs(gain-4.5)<0.00001,'Minigame progress is not +50%');
assert(Math.abs(profile.coolingPerSecond-0.765)<0.00001,'Forge temperature cooling is not +70%');
assert(Math.abs(cooled-64.35)<0.00001,'Thermal cooling contract mismatch');
const palette=['Mineral de hierro','Carbón vegetal','Madera seca de roble','Madera seca de fresno','Cuero bovino curtido','Cuero caprino curtido','Cordel de cáñamo','Hilo de lino'];
const examples=new Map();
for(let seed=1;seed<=512&&examples.size<8;seed++){
  const sess=engine.generateSession('Herrero',{seed});
  const stock={...sess.requiredStock},ingots=stock['Lingote de hierro']||0;
  if(ingots){delete stock['Lingote de hierro'];stock['Mineral de hierro']=(stock['Mineral de hierro']||0)+ingots;}
  const secondary=Object.keys(stock).find(x=>/^(Cuero|Cordel|Hilo)/.test(x));
  const wood=Object.keys(stock).find(x=>x.startsWith('Madera seca'));
  const key=secondary+' | '+wood;
  if(!examples.has(key))examples.set(key,{seed,stock,combo:key});
}
assert.equal(examples.size,8,'Expected eight real seed combinations');
const manifest={release:'V014.023',runAt:new Date().toISOString(),source:'genuine GenesisPrototypeEngines.generateSession + actual GenesisInventory16.render',thermal:{progressPerSecond:gain,coolingPerSecond:profile.coolingPerSecond,idealSecondsFor100:100/gain,baseIdealSecondsFor100:100/3,oldCoolingPerSecond:0.45},seedCases:[],materialImages:{},failures:[]};
let server,browser;
async function main(){
  server=spawn('python3',['-m','http.server','8766','--bind','127.0.0.1'],{stdio:'ignore'});
  await new Promise(r=>setTimeout(r,900));
  browser=await chromium.launch({headless:true,args:['--disable-gpu-sandbox']});
  const page=await browser.newPage({viewport:{width:1600,height:900}});
  page.setDefaultTimeout(10000);
  page.on('pageerror',e=>manifest.failures.push(String(e).slice(0,300)));
  await page.route('**/v014023-inventory-fixture',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/preparacion.css"><link rel="stylesheet" href="/inventario_genesis_16x9.css"><style>html,body{margin:0;width:100%;height:100%;background:#17130f}#modalLayer{width:100%;height:100%}</style></head><body><div id="modalLayer"></div><script src="/inventario_genesis_16x9.js"></script></body></html>'}));
  await page.goto('http://127.0.0.1:8766/v014023-inventory-fixture',{waitUntil:'load',timeout:30000});
  assert(await page.evaluate(()=>typeof window.GenesisInventory16?.render==='function'),'Inventory module not loaded');
  for(const row of examples.values()){
    await page.evaluate(stock=>{
      const ctx={inventory:stock,getItems:()=>[],modal:content=>{document.getElementById('modalLayer').innerHTML=content;}};
      window.GenesisInventory16.render(ctx,{renderMenu:()=>{},renderWorkspace:()=>{},sheetForItem:()=>''});
    },row.stock);
    const found=await page.locator('#genInv [data-select]').count();
    assert.equal(found,4,'Seed '+row.seed+' must have 4 starter materials');
    const caseData={seed:row.seed,combo:row.combo,materialImages:[]};
    for(let i=0;i<found;i++){
      const slot=page.locator('#genInv [data-select="'+i+'"]');
      const name=await slot.getAttribute('aria-label');
      await slot.click({force:true});
      const image=page.locator('#genInv .genInvImageWrap img').first();
      await image.waitFor({state:'attached',timeout:3000});
      await page.waitForFunction(()=>{const img=document.querySelector('#genInv .genInvImageWrap img');return !!(img&&img.complete);},null,{timeout:16000});
      const src=await image.getAttribute('src');
      const dims=await image.evaluate(img=>({naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,complete:img.complete}));
      assert(dims.naturalWidth>0,'Failed material image '+name+' from '+src+' seed '+row.seed);
      assert(palette.includes(name),'Unexpected seed material '+name);
      caseData.materialImages.push({name,src,...dims});
      manifest.materialImages[name]={src,...dims};
    }
    const file='seed-'+String(row.seed).padStart(3,'0')+'.png';
    await page.screenshot({path:path.join(out,file),timeout:30000,animations:'disabled'});
    caseData.screenshot=file;
    manifest.seedCases.push(caseData);
    console.log('VALID_SEED',row.seed,row.combo,'materials:',caseData.materialImages.map(x=>x.name).join(', '));
  }
  assert.equal(Object.keys(manifest.materialImages).length,8,'Must see all eight material images across seeds');
  manifest.result='PASS';
}
main().catch(e=>{manifest.result='FAIL';manifest.failures.push(String(e.stack||e));process.exitCode=1;console.error(e);}).finally(async()=>{
  manifest.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
  console.log('V014023_QA_FINAL',JSON.stringify({result:manifest.result,seeds:manifest.seedCases.length,uniqueMaterials:Object.keys(manifest.materialImages),thermal:manifest.thermal,failures:manifest.failures}).slice(0,4000));
  try{await browser?.close()}catch{};
  try{server?.kill('SIGTERM')}catch{};
});
