/* Real full-game mercenary QA: no mocked fabrication objects. */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out='/tmp/mercenary-qa-v002';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw Error('blocked');res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).on('error',()=>res.destroy()).pipe(res)}catch(e){res.writeHead(404);res.end('error')}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',e=>{if(e.type()==='error')errors.push(e.text().slice(0,600))});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?mercenary-qa=1',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>['ready','error'].includes(window.GenesisMercenaryQA?.phase),null,{timeout:240000});
  const qa=await page.evaluate(()=>{const x=window.GenesisMercenaryQA;return {phase:x.phase,steps:x.steps,items:x.items,errors:x.errors,emissive:x.emissive,remainingMaterialUnits:x.remainingMaterialUnits}});
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({qa,errors},null,2));
  assert.equal(qa.phase,'ready',JSON.stringify(qa.errors));
  assert.deepEqual(qa.items.map(i=>i.rarity),['Inútil','Bueno','Inútil','Común']);
  assert.equal(qa.remainingMaterialUnits,0);
  assert.equal(await page.locator('.mcInventorySlot:not(.mcEmptySlot)').count(),2);
  assert.equal(await page.locator('.mcChannel').count(),3); // Base only versus Buena Base+2
  assert.equal(await page.locator('.mercConcept').count(),1);
  await page.screenshot({path:path.join(out,'equipamiento-espadas-16x9.png')});
  await page.locator('[data-family="second"]').click();
  assert.equal(await page.locator('.mcChannel').count(),2); // Base+1 from Common
  await page.screenshot({path:path.join(out,'equipamiento-escudos-16x9.png')});
  await page.locator('[data-family="first"]').click();
  // Choose Buena sword from artisan's family: click index 1.
  await page.locator('[data-item="1"]').click();
  await page.locator('[data-family="second"]').click();
  await page.locator('[data-item="1"]').click();
  await page.locator('[data-action="equip"]').click();
  await page.waitForTimeout(1000);
  const applied=await page.evaluate(()=>({
    qa:window.GenesisMercenaryQA?.phase,
    text:document.body.innerText.includes('Equipo actualizado'),
    mercOverlay:!!document.querySelector('#modal .mercSheetBody'),
    swordEnabled:!!document.querySelector('#mercSwordModel')?.entity?.enabled,
    shieldEnabled:!!document.querySelector('#mercShieldModel')?.entity?.enabled
  }));
  assert.ok(applied.mercOverlay,'Mercenary dossier should open on equip');
  assert.ok(applied.swordEnabled&&applied.shieldEnabled,'3D objects should remain attached');
  await page.screenshot({path:path.join(out,'mercenario-equipado.png')});
  console.log('PASS MERCENARY FULL GAME',JSON.stringify({rarities:qa.items.map(x=>x.rarity),count:qa.items.length,steps:qa.steps.length,emissive:qa.emissive,applied,errors:errors.slice(0,5)}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
