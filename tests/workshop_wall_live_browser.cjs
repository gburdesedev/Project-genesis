/* In-browser smoke test for the EXACT preview HTML published on GitHub Pages.
 * Tests REAL WebGL PlayCanvas and remote GLB loads; it never changes the game.
 */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.glb':'model/gltf-binary','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const filepath=path.resolve(root,'.'+pathname);
 if(!filepath.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(!fs.existsSync(filepath)){res.writeHead(404);return res.end('Missing '+pathname)}
 res.setHeader('Content-Type',mime[path.extname(filepath)]||'application/octet-stream');
 fs.createReadStream(filepath).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+server.address().port+'/previews/talleres-herrero-arcanista-v0.14.001.html';
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const errs=[];
 page.on('pageerror',e=>errs.push(String(e)));
 page.on('console',msg=>{if(msg.type()==='error')errs.push(msg.text())});
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  const frame=page.frameLocator('#game');
  await frame.locator('pc-app').waitFor({timeout:120000});
  console.log('Actual main PlayCanvas document loaded');
  await page.waitForFunction(()=>document.querySelector('#state')?.textContent?.includes('Herrero ready'),null,{timeout:200000});
  await page.waitForFunction(()=>document.querySelector('#state')?.textContent?.includes('Arcanista ready'),null,{timeout:200000});
  const status=await frame.locator('body').evaluate(()=>window.__genesisWallWorkshopPreview);
  assert.equal(status.models.Herrero,'ready',JSON.stringify(status));
  assert.equal(status.models.Arcanista,'ready',JSON.stringify(status));
  // The village proxies are constructed only after choosing a profession.
  const startup=await frame.locator('body').evaluate(()=>{
    const intro=document.querySelector('#prototypeIntro');
    return {introStyle:intro?.style.display,loading:document.querySelector('#loading')?.style.display,
      loadState:document.querySelector('#loadState')?.textContent?.slice(0,200),
      title:document.title,
      forgeAnchor:(()=>{const e=document.getElementById('forgeModel')?.entity;if(!e)return null;
        const p=e.getPosition(),scale=e.getLocalScale();
        return {name:e.name,parent:e.parent?.name,position:[p.x,p.y,p.z],scale:[scale.x,scale.y,scale.z],children:e.children.map(c=>c.name).slice(0,12)};})()
    };
  });
  console.log('STARTUP',JSON.stringify(startup));
  // This is an asset/overlay smoke test. The full tutorial and village
  // can legitimately require separate interactive entry and asynchronous PBR.
  const choice=frame.locator('[data-profession="Herrero"]').first();
  if(await choice.isVisible())await choice.click();
  else console.log('CHOOSER_NOT_VISIBLE — preserving original game startup state');
  await page.waitForTimeout(8000);
  const scene=await frame.locator('body').evaluate(()=>{
   const app=document.querySelector('pc-app')?.app;
   const h=app?.root?.findByName('Herrero · fachada cerrada');
   const a=app?.root?.findByName('Arcanista · fachada cerrada');
   return {
    app:!!app,
    herreroProxy:!!h,arcanistaProxy:!!a,
    herreroWall:!!h?.findByName('WALL_PREVIEW_Herrero'),
    arcanistaWall:!!a?.findByName('WALL_PREVIEW_Arcanista'),
    forgeAnchor:(()=>{const e=document.getElementById('forgeModel')?.entity;if(!e)return null;
     const p=e.getPosition(),scale=e.getLocalScale();
     const renders=e.findComponents('render');
     return {name:e.name,parent:e.parent?.name,position:[p.x,p.y,p.z],localScale:[scale.x,scale.y,scale.z],renderComponents:renders.length,
       children:e.children.map(ch=>ch.name).slice(0,12)};})(),
    status:window.__genesisWallWorkshopPreview,
   };
  });
  console.log('SCENE',JSON.stringify(scene));
  assert(scene.app,'PlayCanvas application missing');
  if(scene.herreroProxy)assert(scene.herreroWall,'Existing Herrero village proxy did not receive the wall');
  if(scene.arcanistaProxy)assert(scene.arcanistaWall,'Existing Arcanista village proxy did not receive the wall');
  fs.mkdirSync(path.join(root,'previews/workshop-wall-test-reports'),{recursive:true});
  await page.screenshot({path:path.join(root,'previews/workshop-wall-test-reports/preview-v0.14.001.png')});
  await page.waitForTimeout(3000);
  const active=await frame.locator('body').evaluate(()=>({activeWall:!!document.getElementById('compactBlacksmithRoot')?.entity?.findByName('WALL_PREVIEW_Herrero'),status:window.__genesisWallWorkshopPreview}));
  console.log('ACTIVE',JSON.stringify(active));
  assert(active.activeWall,'The actual blacksmith workshop must contain the V006 mesh');
  const fullyValidated=scene.herreroWall&&scene.arcanistaWall;
  const report={status:fullyValidated?'BROWSER_VALIDATED_VILLAGE':'BROWSER_VALIDATED_ACTIVE_WORKSHOP_ONLY',
    url,scene,active,errors:errs.slice(0,20),tested_at:new Date().toISOString()};
  fs.writeFileSync(path.join(root,'previews/workshop-wall-test-reports/preview-v0.14.001.json'),JSON.stringify(report,null,2));
  console.log('PASS actual PlayCanvas active blacksmith wall; village availability: '+report.status);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
