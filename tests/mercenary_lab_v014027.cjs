/* E2E branch-only: real mercenary menu and weapon/shield attach. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(ROOT,'previews','mercenary-lab-v014027');
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
   page.on('pageerror',e=>state.errors.push(String(e.message).slice(0,350)));
   page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')state.warnings.push(m.text().slice(0,300))});
   page.on('requestfailed',r=>{if(state.warnings.length<80)state.warnings.push('FAILED '+r.url().slice(0,200)+' '+(r.failure()?.errorText||''))});
   page.on('response',r=>{if(r.status()>=400&&state.responses.length<80)state.responses.push({url:r.url(),status:r.status()})});
   await page.goto('http://127.0.0.1:4173/?mercenario=1',{waitUntil:'domcontentloaded',timeout:45000});
   try{await page.locator('.mercConcept .mcBoard').waitFor({timeout:35000});}
   catch(e){state.lab=await page.evaluate(()=>window.__GENESIS_MERCENARY_LAB||null);state.snapshots.push(await page.evaluate(()=>({title:document.title,loading:document.querySelector('#loading')?.innerText?.slice(0,1300),intro:document.querySelector('#prototypeIntro')?.style?.display,body:document.body?.innerText?.slice(0,2200),app:!!document.querySelector('pc-app')?.app,ui:(()=>{const ids=['modalLayer','modal','prototypeIntro'];const u={};for(const id of ids){const e=document.getElementById(id),r=e?.getBoundingClientRect();u[id]={inline:e?.style.display,display:e?getComputedStyle(e).display:null,visibility:e?getComputedStyle(e).visibility:null,width:r?.width,height:r?.height,classes:e?.className}};for(const cls of ['.mercConcept','.mcBoard']){const e=document.querySelector(cls),r=e?.getBoundingClientRect();u[cls]={present:!!e,display:e?getComputedStyle(e).display:null,width:r?.width,height:r?.height}};return u})(),models:[...document.querySelectorAll('pc-model')].filter(x=>x.hasAttribute('asset')).slice(0,20).map(x=>({id:x.id,asset:x.getAttribute('asset'),ready:!!x.contentEntity}))})));throw new Error('El menú no apareció: '+JSON.stringify(state.lab)+'; '+String(e.message).slice(0,150))}
   state.stage='menu';
   state.lab=await page.evaluate(()=>window.__GENESIS_MERCENARY_LAB);
   assert.equal(state.lab.items,4,'exactly four items generated from NGE');
   assert.equal(await page.locator('.mercConcept .mcSlot').count(),11);
   assert.equal(await page.locator('.mercConcept .mcInventorySlot').count(),2);
   await page.screenshot({path:path.join(OUT,'01-menu-espadas.png'),fullPage:true});
   await page.locator('[data-family="second"]').click();
   assert.equal(await page.locator('.mercConcept .mcInventorySlot').count(),2);
   await page.screenshot({path:path.join(OUT,'02-menu-escudos.png'),fullPage:true});
   await page.locator('[data-action="equip"]').click();
   await page.waitForTimeout(2500);
   state.lab=await page.evaluate(()=>window.__GENESIS_MERCENARY_LAB);
   if(state.lab.status!=='equipped')throw new Error('El equipamiento físico falló: '+JSON.stringify(state.lab));
   state.stage='equipped';
   await page.screenshot({path:path.join(OUT,'03-mercenario-equipado-en-mundo.png'),fullPage:true});
   await page.keyboard.press('e');
   await page.waitForTimeout(900);
   state.dossierVisible=await page.locator('.mercSheetBody').count()>0;
   if(state.dossierVisible)await page.screenshot({path:path.join(OUT,'04-dossier-interaccion.png'),fullPage:true});
   assert.ok(state.dossierVisible,'mercenary world interaction should open dossier');
   state.stage='passed';
   console.log('PASS: real NGE items, 16:9 menu, sword/shield family, world equipment, E interaction');
 }catch(err){state.failure=String(err?.stack||err);console.error('FAIL:',state.failure);if(page&&state.stage!=='started')try{await page.screenshot({path:path.join(OUT,'error-debug.png'),fullPage:true,timeout:8000})}catch(_){ }process.exitCode=1}
 finally{try{if(page)state.lab=state.lab||await page.evaluate(()=>window.__GENESIS_MERCENARY_LAB||null)}catch(_){}fs.writeFileSync(path.join(OUT,'diagnostico.json'),JSON.stringify(state,null,2));if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
