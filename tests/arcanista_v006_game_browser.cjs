/* Project Genesis - actual live PlayCanvas two complete workshops QA */
const {chromium}=require('playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'previews','arcanista-v006-game-qa');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const f=path.resolve(root,'.'+p);
  if(!f.startsWith(root+path.sep))throw Error('403');
  res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});
  fs.createReadStream(f).on('error',()=>res.destroy()).pipe(res);
 }catch(e){res.writeHead(404);res.end(String(e));}
});
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 fs.mkdirSync(dest,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 const errors=[];page.on('pageerror',err=>errors.push(String(err)));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>{const a=window.__genesisProductionHerreroV015;return a?.phase==='running'||a?.phase==='error'},null,{timeout:180000});
  let blacksmith=await page.evaluate(()=>{
    const s=window.__genesisProductionHerreroV015;
    const root=document.getElementById('compactBlacksmithRoot')?.entity;
    return {s,mounted:!!root?.findByName('Genesis production Herrero V013 · real open windows and forge flue')};
  });
  assert.equal(blacksmith.s.phase,'running',JSON.stringify(blacksmith.s.errors));
  assert(blacksmith.mounted,'Herrero V013 must have all four real PBR walls');
  // V082 adds two deliberate arch-fitting masonry meshes to the 8 approved V013 renderers.
  assert.equal(blacksmith.s.assets.walls.renderers,10,'V082 arch stones must preserve the original eight wall meshes');
  assert.equal(blacksmith.s.doorVisual,'V082-B','Herrero approved iron door missing');
  assert.equal(blacksmith.s.doorProfile,'arched','Facade opening no longer matches V082 door silhouette');
  console.log('HERRERO_FOUR_WALLS_V013_VALIDATED');
  await page.waitForFunction(()=>{
    const a=window.__genesisArcanistaFourWallsV006;
    return a?.installed||a?.phase==='error'||a?.phase==='village-unavailable';
  },null,{timeout:220000});
  const arcane=await page.evaluate(()=>{
    const app=document.getElementById('genesisApp')?.app;
    const building=app?.root.findByName('Arcanista · fachada cerrada');
    const s=window.__genesisArcanistaFourWallsV006;
    return {s,building:!!building,
      newWalls:!!building?.findByName('GENESIS_ARCANISTA_FOUR_WALLS_V006'),
      originalFacadeEnabled:building?.children[0]?.enabled,
      originalRoofEnabled:building?.children[1]?.enabled,
      originalDoorEnabled:building?.children[2]?.enabled,
      originalDoorName:building?.children[2]?.name,
      realMagicDoorPresent:!!building?.findByName('Arcanista · puerta mágica V027 · cerrada'),
      realMagicDoorEnabled:building?.findByName('Arcanista · puerta mágica V027 · cerrada')?.enabled,
      installedChildren:building?.children?.map(x=>x.name).slice(0,12)};
  });
  console.log('ARCANISTA_V006',JSON.stringify(arcane));
  assert.equal(arcane.s.installed,true,arcane.s.error||'Arcanista not mounted');
  assert(arcane.newWalls,'New slate full-wall GLB not present');
  assert.equal(arcane.originalFacadeEnabled,false,'Old facade was not replaced');
  assert.equal(arcane.originalRoofEnabled,true,'Existing roof was modified');
  assert.equal(arcane.realMagicDoorPresent,true,'Approved V027 magic door missing');
  assert.equal(arcane.realMagicDoorEnabled,true,'Approved V027 animated magic door was hidden');
  assert.equal(arcane.s.magicDoorEnabled,true,'Arcanista module did not verify the actual V027 door');
  assert(arcane.s.modelMeshes<=16,'Unbatched arcanist GLB');
  fs.writeFileSync(path.join(dest,'results.json'),JSON.stringify({
    status:'PASS_TWO_FULL_GAME_WORKSHOPS',
    blacksmith: blacksmith.s,
    arcanista:arcane,
    headlessErrors:errors.slice(0,20),
    graphicsBenchmarks:'NOT_PERFORMED'
  },null,2));
  console.log('PASS_HERRERO_ARCANISTA_REAL_GAME');
 }finally{await browser.close()}
})().catch(e=>{console.error('FAILED_REAL_GAME_TEST',e);process.exitCode=1}).finally(()=>server.close());
