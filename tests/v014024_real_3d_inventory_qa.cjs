'use strict';
/* V014.024 real-GLB QA: genuine game session stocks + real <model-viewer> WebGL in Chromium.
   Never mark a PNG/JPG CSS rotation as 3D success. No invented game materials. */
const fs=require('fs'), path=require('path'), vm=require('vm'), crypto=require('crypto'), assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const out='previews/v014024-real-materials-3d';
fs.mkdirSync(out,{recursive:true});
const known=['Mineral de hierro','Carbón vegetal','Madera seca de roble','Madera seca de fresno',
  'Cuero bovino curtido','Cuero caprino curtido','Cordel de cáñamo','Hilo de lino'];
const manifestPath='assets/playcanvas/approved/materials/v014024_3d_glb_experimental_manifest.json';
assert(fs.existsSync(manifestPath),'Missing 3D source manifest from vendor script');
const source=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
assert.equal(source.assets.length,6,'Expected exactly six original source files');
for(const r of source.assets){
  const d=fs.readFileSync(r.path);
  assert.equal(d.toString('utf8',0,4),'glTF','Not real GLB: '+r.path);
  assert.equal(d.length,r.bytes,'Wrong committed source bytes: '+r.path);
  assert.equal(crypto.createHash('sha256').update(d).digest('hex'),r.sha256,'Wrong source SHA: '+r.path);
}
const html=fs.readFileSync('index.html','utf8');
const embedded=html.match(/<script\b[^>]*\bid=["']genesis-prototype-engines["'][^>]*>([\s\S]*?)<\/script>/i);
assert(embedded,'Cannot extract real GenesisPrototypeEngines');
const scope={window:{},console,Date,Math,performance:{now:()=>100}};
vm.runInNewContext(embedded[1],scope,{timeout:30000});
const game=scope.window.GenesisPrototypeEngines;
assert.equal(typeof game?.generateSession,'function','Actual engine missing');
const examples=new Map();
for(let seed=1;seed<=512&&examples.size<8;seed++){
  const session=game.generateSession('Herrero',{seed});
  const stock={...session.requiredStock};
  const ingots=stock['Lingote de hierro']||0;
  if(ingots){delete stock['Lingote de hierro'];stock['Mineral de hierro']=(stock['Mineral de hierro']||0)+ingots;}
  const secondary=Object.keys(stock).find(k=>/^(Cuero|Cordel|Hilo)/.test(k));
  const wood=Object.keys(stock).find(k=>k.startsWith('Madera seca'));
  const key=secondary+' | '+wood;
  if(!examples.has(key))examples.set(key,{seed,stock,key});
}
assert.equal(examples.size,8,'Expected 8 genuine combinations of seeded materials');
const result={version:'V014.024',at:new Date().toISOString(),source:'genuine game seed + real GLB + Chromium model-viewer 4.1.0',assets:source.assets,seedCombos:[],loaded:{},errors:[],screenshots:[],failedRequests:[],result:'IN_PROGRESS'};
let server,browser;
const delay=t=>new Promise(r=>setTimeout(r,t));
async function main(){
  server=spawn('python3',['-m','http.server','8772','--bind','127.0.0.1'],{stdio:'ignore'});
  await delay(1200);
  browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
  const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
  const page=await context.newPage();
  page.setDefaultTimeout(25000);
  page.on('pageerror',e=>result.errors.push(String(e).slice(0,700)));
  page.on('requestfailed',r=>{result.failedRequests.push({url:r.url(),error:r.failure()?.errorText});});
  page.on('console',m=>{if(m.type()==='error')result.errors.push('console: '+m.text().slice(0,500));});
  const fixture='<!doctype html><html><head><meta charset="utf-8">'+
     '<link rel="stylesheet" href="/preparacion.css"><link rel="stylesheet" href="/inventario_genesis_16x9.css">'+
     '<style>html,body{margin:0;background:#181310;height:100%;width:100%;}#modalLayer{width:100%;height:100%;display:grid;place-items:center}</style>'+
     '<script type="module" src="/node_modules/@google/model-viewer/dist/model-viewer.min.js"></script></head>'+
     '<body><div id="modalLayer"></div><script src="/inventario_genesis_16x9.js"></script></body></html>';
  await page.route('**/v014024-real-glb-fixture',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:fixture}));
  await page.goto('http://127.0.0.1:8772/v014024-real-glb-fixture',{waitUntil:'load',timeout:30000});
  await page.waitForFunction(()=>typeof customElements.get('model-viewer')==='function'&&typeof window.GenesisInventory16?.render==='function',null,{timeout:50000});
  const tested=new Set();
  for(const row of examples.values()){
    result.seedCombos.push({seed:row.seed,combo:row.key,stock:row.stock});
    for(const name of Object.keys(row.stock).filter(x=>known.includes(x))){
      if(tested.has(name))continue;
      tested.add(name);
      await page.evaluate(stock=>{
        const ctx={inventory:stock,getItems:()=>[],modal:markup=>document.getElementById('modalLayer').innerHTML=markup};
        window.GenesisInventory16.render(ctx,{renderMenu:()=>{},renderWorkspace:()=>{},sheetForItem:()=>''});
      },row.stock);
      const slot=page.locator('#genInv .genInvSlot[data-select]').filter({hasText:name}).first();
      // Slot itself is real interactive inventory; use aria-label for exact name.
      const exact=page.locator('#genInv .genInvSlot[data-select][aria-label="'+name+'"]');
      assert.equal(await exact.count(),1,'No live slot '+name);
      await exact.click({force:true});
      assert.equal((await page.locator('.genInvViewerTitle').textContent()).trim(),name,'Selection failed '+name);
      const viewer=page.locator('.genInvImageWrap model-viewer.genInvMaterialHeroModel');
      await viewer.waitFor({state:'attached',timeout:10000});
      const url=await viewer.getAttribute('src');
      assert(url.endsWith('.glb'),'Not a real 3D preview '+name+' '+url);
      const response=await page.request.get('http://127.0.0.1:8772/'+url);
      assert.equal(response.status(),200,'Model not served '+name+' '+url);
      const body=await response.body();
      assert.equal(body.toString('utf8',0,4),'glTF','Served bytes are not a real GLB');
      await page.waitForFunction(()=>{const v=document.querySelector('.genInvImageWrap model-viewer');return !!(v&&v.loaded&&!v.dataset.glbError)},null,{timeout:100000});
      const properties=await viewer.evaluate(v=>({loaded:v.loaded,modelIsVisible:v.modelIsVisible,meshCount:v.model?.materials?.length||null,tag:v.tagName,src:v.getAttribute('src')}));
      assert.equal(properties.loaded,true,'Model viewer never rendered '+name);
      // Trigger WebGL slot model only on genuine pointer hover, not by CSS perspective.
      const r=await exact.boundingBox();
      assert(r,'Slot is not visible '+name);
      await page.mouse.move(r.x+r.width*.02,r.y+r.height*.5);
      await page.waitForFunction(index=>!!document.querySelector('#genInv .genInvSlot[data-select="'+index+'"] model-viewer.genInvMaterialSlotModel'),await exact.getAttribute('data-select'),{timeout:8000});
      const left=await exact.locator('model-viewer').getAttribute('camera-orbit');
      await page.mouse.move(r.x+r.width*.98,r.y+r.height*.5);
      const right=await exact.locator('model-viewer').getAttribute('camera-orbit');
      assert(parseFloat(left)<-39&&parseFloat(right)>39,'Real-geometry orbit not ±45° '+name+' '+left+' '+right);
      await page.mouse.move(r.x+r.width+20,r.y+r.height+20);
      const reset=await exact.locator('model-viewer').getAttribute('camera-orbit');
      assert.equal(reset,'0deg 75deg auto','Real orbit did not reset '+name);
      const frame=await exact.evaluate(x=>getComputedStyle(x).backgroundImage);
      assert(frame.includes('Casilla_Basicos_01.png'),'Original ORA frame lost');
      const shot='material-3d-'+String(known.indexOf(name)+1).padStart(2,'0')+'.png';
      try{await page.screenshot({path:path.join(out,shot),animations:'disabled',timeout:12000});result.screenshots.push(shot);}
      catch(e){result.errors.push('Capture '+name+': '+String(e).slice(0,180));}
      result.loaded[name]={seed:row.seed,url,loaded:true,properties,slotHover:{left,right,reset},screenshot:result.screenshots.includes(shot)?shot:null};
      console.log('REAL_GLB_RENDERED',JSON.stringify({name,url,loaded:true,orbitLeft:left,orbitRight:right}));
      await page.waitForTimeout(250);
    }
  }
  assert.equal(tested.size,8,'Failed to get 8 real seed materials');
  assert.equal(Object.keys(result.loaded).length,8,'Not all 8 displayed as real GLB');
  assert(!result.failedRequests.some(x=>/\.glb($|\?)/.test(x.url)),'A GLB network transfer failed');
  assert(result.screenshots.length>=1,'Chromium could not produce a real GLB screenshot');
  result.result='PASS_REAL_GLB_8_8';
  console.log('3D_RUNTIME_PASS_8_OF_8',JSON.stringify({screenshots:result.screenshots.length,seeds:examples.size}));
}
main().catch(e=>{result.result='FAIL_REAL_3D';result.errors.push(String(e.stack||e));console.error('REAL_GLB_TEST_FAILED',e);process.exitCode=1}).finally(async()=>{
  fs.writeFileSync(path.join(out,'runtime-audit.json'),JSON.stringify(result,null,2));
  if(browser)await browser.close().catch(()=>{});
  if(server)server.kill('SIGTERM');
});
