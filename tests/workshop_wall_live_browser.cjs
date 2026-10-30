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
  // The full playable demo may already be running, with the chooser hidden.
  // In that case do not click a non-visible button. If it is still loading,
  // wait for the real intro instead of timing out prematurely.
  if(startup.introStyle==='grid'){
    await frame.locator('[data-profession="Herrero"]').first().click({timeout:30000});
  }else{
    await Promise.race([
      frame.locator('[data-profession="Herrero"]').first().waitFor({state:'visible',timeout:120000}).then(async()=>frame.locator('[data-profession="Herrero"]').first().click()),
      page.waitForFunction(()=>{
        const f=document.querySelector('#game')?.contentWindow;
        return !!f?.document?.querySelector('#prototypeIntro') && f?.document?.querySelector('#prototypeIntro')?.style.display==='none' && !!f?.document?.querySelector('#gameUI');
      },null,{timeout:120000})
    ]).catch(error=>console.log('INTRO WAIT diagnostic:',String(error)));
  }
  await page.waitForFunction(()=>document.querySelector('#state')?.textContent?.includes('Arcanista (aldea)'),null,{timeout:180000});
  await page.waitForTimeout(1200);
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
  assert(scene.herreroWall,'Actual Herrero village proxy did not receive the wall');
  assert(scene.arcanistaWall,'Actual Arcanista village proxy did not receive the wall');
  fs.mkdirSync(path.join(root,'previews/workshop-wall-test-reports'),{recursive:true});
  await page.screenshot({path:path.join(root,'previews/workshop-wall-test-reports/preview-v0.14.001.png')});
  await page.waitForTimeout(3000);
  const active=await frame.locator('body').evaluate(()=>({activeWall:!!document.getElementById('compactBlacksmithRoot')?.entity?.findByName('WALL_PREVIEW_Herrero'),status:window.__genesisWallWorkshopPreview}));
  console.log('ACTIVE',JSON.stringify(active));
  const report={status:'BROWSER_VALIDATED',url,scene,active,errors:errs.slice(0,20),tested_at:new Date().toISOString()};
  fs.writeFileSync(path.join(root,'previews/workshop-wall-test-reports/preview-v0.14.001.json'),JSON.stringify(report,null,2));
  console.log('PASS PlayCanvas live workshop wall preview');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
