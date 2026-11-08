/* Real Chromium/PlayCanvas audit of the actual GLB V02 loaded into the market.
 * Preserve market purchase and Ordan quests; screenshot tests appearance only.
 */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews/merchant-v02-game');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.glb':'model/gltf-binary','.png':'image/png','.webp':'image/webp','.json':'application/json'};
const server=http.createServer((req,res)=>{
  try{
    const p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!p.startsWith(root+path.sep))throw Error('403');
    const stream=fs.createReadStream(p);
    stream.once('error',()=>{if(!res.headersSent)res.writeHead(404);res.end()});
    res.setHeader('Content-Type',mime[path.extname(p)]||'application/octet-stream');
    stream.pipe(res);
  }catch(e){res.writeHead(404);res.end(String(e));}
});
(async()=>{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1600,height:900}});
  const errors=[],assetResponses=[];
  page.on('pageerror',err=>errors.push('PAGE '+String(err)));
  page.on('console',msg=>{if(msg.type()==='error')errors.push('CONSOLE '+msg.text())});
  page.on('response',res=>{if(res.url().includes('merchant_v02_75962.glb'))assetResponses.push({url:res.url(),status:res.status()})});
  try{
    await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:120000});
    // The marketplace may mount before the profession selector finishes painting.
    // Wait for the actual model status; no redundant Herrero click in headless mode.
    await page.waitForFunction(()=>['ready','fallback'].includes(window.__genesisMarket?.visual?.phase),null,{timeout:180000});
    const status=await page.evaluate(()=>{
      const app=document.querySelector('#genesisApp')?.app;
      const root=app?.root.findByName('Mercader de suministros · NPC interactivo V001');
      const entity=root?.findByName('Mercader V02 · Meshoptimizer 75962 tri');
      const renderers=entity?.findComponents('render')||[];
      const count=renderers.reduce((n,r)=>n+(r.meshInstances?.length||0),0);
      const boxes=renderers.flatMap(r=>r.meshInstances||[]).map(mi=>{
        const b=mi.aabb;return b?{center:[b.center.x,b.center.y,b.center.z],
          minY:b.getMin().y,maxY:b.getMax().y,half:[b.halfExtents.x,b.halfExtents.y,b.halfExtents.z]}:null;
      }).filter(Boolean);
      const origin=root?.getPosition();
      const horizontalOffset=boxes.length&&origin?
        Math.max(...boxes.map(b=>Math.hypot(b.center[0]-origin.x,b.center[2]-origin.z))):null;
      return {visual:{...window.__genesisMarket?.visual},root:!!root,entity:!!entity,
        rootChildren:root?.children.map(x=>x.name),
        count,position:root?.getPosition().toString(),
        enabled:{root:root?.enabled,entity:entity?.enabled,renderers:renderers.map(r=>r.enabled)},
        boxes,horizontalOffset,
        marketVersion:window.__genesisMarket?.version,
        app:!!app};
    });
    console.log('MERCHANT_V02_IN_GAME',JSON.stringify(status),JSON.stringify(assetResponses));
    assert(status.app&&status.root,'NPC anchor missing from PlayCanvas market');
    assert.equal(status.visual.phase,'ready','V02 GLB failed: '+JSON.stringify(status.visual));
    assert.equal(status.marketVersion,'v0.14.022');
    assert(status.entity&&status.count>0,'Real V02 mesh not mounted');
    assert(status.enabled.root&&status.enabled.entity&&status.enabled.renderers.every(Boolean),'Merchant mesh or parent disabled');
    assert(Number.isFinite(status.horizontalOffset)&&status.horizontalOffset<2,'Merchant mesh displaced from market anchor: '+JSON.stringify(status.boxes));
    assert(status.boxes.some(b=>b.minY>-0.25&&b.minY<0.25),'Merchant mesh floats/sinks: '+JSON.stringify(status.boxes));
    assert.deepEqual(status.rootChildren,['Mercader V02 · Meshoptimizer 75962 tri'],
      'Old clone or procedural apron is still occupying same NPC');
    assert(assetResponses.some(x=>x.status===200),'GLB did not load via game HTTP server');
    await page.evaluate(()=>{
      const app=document.querySelector('#genesisApp')?.app;
      const cams=app?.root.findComponents('camera')||[];
      const camera=cams.find(c=>c.enabled&&c.entity?.enabled)||cams[0];
      if(!camera)throw Error('Camera missing in real game');
      camera.entity.setPosition(21.65,1.78,36.3);
      camera.entity.lookAt(25.5,1.35,36.3);
      window.__merchantScreenshotCamera=camera.entity.name;
    });
    // Write durable QA evidence before optional GPU screenshot capture. On some
    // headless GPU runners Chromium fails to service screenshots, despite a real
    // imported GLB. Do not misreport that as a broken model.
    fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({status,assetResponses,errors:errors.slice(0,25)},null,2));
    try{
      await page.setViewportSize({width:960,height:540});
      await page.waitForTimeout(350);
      await page.screenshot({path:path.join(out,'merchant-v02-in-game.png'),timeout:8000,animations:'disabled'});
      console.log('SCREENSHOT_CAPTURED',path.join(out,'merchant-v02-in-game.png'));
    }catch(screenshotError){
      console.log('SCREENSHOT_SKIPPED_GPU_RUNNER',String(screenshotError).slice(0,300));
      fs.writeFileSync(path.join(out,'screenshot-limitation.txt'),
        'The real GLB was imported successfully, but headless GPU screenshot failed: '+String(screenshotError));
    }
    assert(!errors.some(x=>/merchant_v02_75962|Merchant V02|merchant V02/i.test(x)),
      'Merchant loading errors: '+JSON.stringify(errors));
  }catch(error){
    const diagnostic=await page.evaluate(()=>({visual:window.__genesisMarket?.visual||null,
      loadState:document.querySelector('#loadState')?.textContent,renderers:!!document.querySelector('#genesisApp')?.app})).catch(e=>({error:String(e)}));
    fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(error),diagnostic,errors,assetResponses},null,2));
    await page.screenshot({path:path.join(out,'merchant-v02-failure.png'),timeout:12000}).catch(()=>{});
    throw error;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
