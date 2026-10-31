/* Project Genesis v0.15.001 — production PlayCanvas WebGL smoke.
 * Asserts real V010 walls, raised V011 roof, HQ fountain and tree position.
 * Headless FPS is diagnostic ONLY, not a no-GPU benchmark.
 */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','v015-production-audit');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const f=path.resolve(root,'.'+p);
  if(!f.startsWith(root+path.sep))throw Error('403');
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).on('error',()=>res.destroy()).pipe(res);
 }catch(e){res.writeHead(404);res.end(String(e))}
});
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];
 page.on('pageerror',err=>errors.push(String(err)));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 try{
  const url='http://127.0.0.1:'+server.address().port+'/index.html';
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>{
   const s=window.__genesisProductionHerreroV015;
   return !!s&&(s.phase==='running'||s.phase==='error');
  },null,{timeout:180000});
  const status=await page.evaluate(()=>{
    const app=document.querySelector('#genesisApp')?.app;
    const s=window.__genesisProductionHerreroV015;
    const f=document.querySelector('#genesisFountainV011Model');
    const forge=document.querySelector('#forgeModel');
    const d=document.querySelector('#doorLeafModel');
    const tree=app?.root.findByName('Árbol 1 · Roble · plaza');
    const active=document.querySelector('#compactBlacksmithRoot')?.entity;
    const p=tree?.getLocalPosition();
    const rood=active?.findByName('Genesis RoofV011');
    const roofScale=rood?.getLocalScale();
    return {s,activeMounted:!!active?.findByName('Genesis production Herrero V010/V011 · detachable'),
      fountainAnchor:!!f,forgeSource:document.querySelector('#forgeStation')?.getAttribute('src'),
      forgeRotation:forge?.getAttribute('rotation'),
      originalDoorPosition:d?.getAttribute('position'),treePosition:p?[p.x,p.z]:null,
      roofScale:roofScale?[roofScale.x,roofScale.y,roofScale.z]:null,
      fountainStatus:window.__genesisHQFountainForgeQA?.fountain||null,
      app:!!app};
  });
  console.log('PRODUCTION_V015',JSON.stringify(status));
  assert.equal(status.s.phase,'running',JSON.stringify(status.s.errors));
  assert(status.app,'No PlayCanvas application');
  assert(status.activeMounted,'V010/V011 not installed in actual tutorial');
  assert(status.s.installed.some(x=>x.kind==='tutorial'),'Active Herrero not mounted');
  assert(status.fountainAnchor,'HQ fountain missing from scene');
  assert(status.forgeSource?.endsWith('Forge_V038_HeaderFixed_Preview.glb'),'Game still uses obsolete forge asset');
  assert.equal(status.originalDoorPosition,'-1.10 0 .12','The original door hinge moved');
  assert(status.roofScale?.[1]>1.2,'Roof pitch was not increased');
  assert(status.treePosition&&Math.abs(status.treePosition[0]-.4)<.01&&Math.abs(status.treePosition[1]-10.7)<.01,'Tree shadow displacement not live');
  await page.screenshot({path:path.join(out,'game-v015.png')});
  const payload={status:'BROWSER_MAIN_GAME_GLBS_CONFIRMED',...status,
    headlessErrors:errors.slice(0,12),testedAt:new Date().toISOString(),
    caveats:['No dedicated non-GPU performance validation','No collider regression QA','Forge high fidelity visually unapproved']};
  fs.writeFileSync(path.join(out,'status.json'),JSON.stringify(payload,null,2));
  console.log('PASS Production game V015 main');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>server.close());
