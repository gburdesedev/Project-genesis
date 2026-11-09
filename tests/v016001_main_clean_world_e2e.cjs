'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews/v016001-main-clean-world');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.mjs':'text/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.glb':'model/gltf-binary','.json':'application/json','.wasm':'application/wasm'};
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const insert="document.querySelectorAll('[data-profession]').forEach(btn=>btn.addEventListener";
if(!html.includes(insert))throw Error('Main route hook not found');
const bridge="window.__genesisE2E={snapshot:()=>({started:gameStarted,profession:selectedProfession,step:tutorialStep,items:craftedItems.map(i=>({name:i.name,recipe:i.recipe,channels:i.channels,rarity:i.rarity}))}),prime:()=>{if(!gameStarted||selectedProfession!=='Herrero')throw Error('Herrero world not started');chestOpen=true;playerInventory={...craftSession.stock};for(const f of Object.values(craftSession.formulas||{}))for(const m of f.materials)playerInventory[m.material]=Math.max(playerInventory[m.material]||0,m.qty*6+12);setTutorialStep(10);refreshInventorySummary()},craft:()=>performCraft()};";
html=html.replace(insert,bridge+insert);
const srv=http.createServer((req,res)=>{
let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch(e){res.writeHead(400);return res.end()}
if(name==='/'||name==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(html)}
const f=path.resolve(root,'.'+name);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end()}
res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
});
const report={status:'INITIALIZING',events:[],errors:[]};
(async()=>{
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},serviceWorkers:'block'});
 page.on('pageerror',e=>report.errors.push('JS '+e.message.slice(0,200)));
 page.on('response',r=>{if(r.status()>=400&&report.errors.length<20)report.errors.push('HTTP '+r.status()+' '+r.url().slice(0,160))});
 await page.goto('http://127.0.0.1:'+srv.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:50000});
 try{await page.locator('[data-profession="Herrero"]').waitFor({state:'visible',timeout:45000})}
 catch(e){report.boot=await page.evaluate(()=>({state:document.getElementById('loadState')?.textContent,count:document.getElementById('loadCount')?.textContent,detail:document.getElementById('loadDetail')?.textContent,loading:document.querySelector('#loading')?.style.display,intro:document.getElementById('prototypeIntro')?.style.display,introComputed:getComputedStyle(document.getElementById('prototypeIntro')).display,button:(()=>{const el=document.querySelector('[data-profession="Herrero"]');const r=el.getBoundingClientRect(),st=getComputedStyle(el);return {rect:r.toJSON(),display:st.display,visibility:st.visibility,opacity:st.opacity,disabled:el.disabled,closestHidden:el.closest('[hidden]')?.id,scrollParent:document.querySelector('#prototypeIntro .protoIntroCard')?.scrollTop}})(),overlay:(()=>{const b=document.querySelector('[data-profession="Herrero"]').getBoundingClientRect();return document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)?.outerHTML.slice(0,200)})(),boot:window.__genesisBoot}));throw Error('No visible Herrero selector after boot: '+JSON.stringify(report.boot))}
 report.events.push('MAIN HERRERO SELECTOR VISIBLE');
 await page.locator('[data-profession="Herrero"]').click({timeout:20000});
 await page.waitForFunction(()=>window.__genesisE2E?.snapshot()?.started===true,null,{timeout:90000});
 report.events.push('HERRERO GAME STARTED');
 await page.evaluate(()=>window.__genesisE2E.prime());
 report.events.push('TUTORIAL SHORTCUT: step 10');
 for(let i=1;i<=2;i++){
  await page.evaluate(()=>window.__genesisE2E.craft());
  await page.locator('#modal.genesisResultModal .grScreen').waitFor({timeout:20000});
  await page.waitForFunction(()=>document.querySelector('iframe.grSwordInteractive')?.contentWindow?.__genesisSwordViewerStatus?.phase==='ready',null,{timeout:150000});
  report.events.push({crafted:i,state:await page.evaluate(()=>window.__genesisE2E.snapshot())});
  await page.screenshot({path:path.join(out,'0'+i+'-ingame-espada.png'),animations:'allow',timeout:12000});
  await page.locator('#resultContinue').click();
 }
 report.status='PASS_FULL_WORLD_WITH_TUTORIAL_SHORTCUT';
}catch(e){report.status='FAIL';report.exception=String(e.stack||e);try{await page.screenshot({path:path.join(out,'00-failed-scene.png'),animations:'allow',timeout:5000})}catch{}}
finally{await browser.close()}
})().finally(()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('GENESIS_MAIN_CLEAN_WORLD',JSON.stringify(report).slice(0,4500));srv.close();if(report.status!=='PASS_FULL_WORLD_WITH_TUTORIAL_SHORTCUT')process.exitCode=1});
