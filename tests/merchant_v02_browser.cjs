// Gameplay-level smoke: actual approved merchant GLB loaded into existing market NPC.
// Does NOT bypass quests/purchases, and does not write to existing menu artwork.
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'previews','market-merchant-v022');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json','.glb':'model/gltf-binary','.webp':'image/webp'};
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const stream=fs.createReadStream(target);
 stream.once('error',()=>{if(!res.headersSent)res.writeHead(404);res.end();});
 res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
 stream.pipe(res);
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 const errors=[];
 const modelResponses=[];
 page.on('pageerror',err=>errors.push(String(err)));
 page.on('response',r=>{if(r.url().includes('mercader-v02-75962.glb'))modelResponses.push({status:r.status(),url:r.url()});});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!!window.__genesisMarket?.modelStatus,null,{timeout:180000});
  await page.waitForFunction(()=>['ready','fallback'].includes(window.__genesisMarket.modelStatus().state),null,{timeout:90000});
  const info=await page.evaluate(()=>{
    const market=window.__genesisMarket,app=document.getElementById('genesisApp').app;
    const npc=app.root.findByName('Mercader de suministros · NPC interactivo V001');
    const visual=npc?.findByName('Mercader V02 · Meshoptimizer · 75.962 triángulos');
    return {visualState:market.modelStatus(),hasNpc:!!npc,
      hasApprovedGLB:!!visual,
      renders:visual?.findComponents('render').length||0,
      position:npc?.getPosition()?.toString(),version:market.version,
      interactable:typeof market.open==='function'};
  });
  assert.equal(info.visualState.state,'ready',JSON.stringify(info));
  assert.equal(info.visualState.triangles,75962);
  assert(info.hasApprovedGLB&&info.renders>0,'Merchant GLB missing from village');
  assert.equal(info.version,'v0.14.022');
  assert(modelResponses.some(r=>r.status===200),'Actual GLB download did not return HTTP 200');

  // Camera-only screenshot from the market. Does not move the character or unlock quests.
  await page.evaluate(()=>{
    const app=document.getElementById('genesisApp').app;
    const camera=document.querySelector('#cameraRig')?.entity;
    if(!camera)return;
    const Vec3=app.root.getPosition().constructor;
    const eye=new Vec3(21.5,2.9,42.0),look=new Vec3(25.5,1.1,36.3);
    app.on('postupdate',()=>{camera.setPosition(eye);camera.lookAt(look);});
  });
  await page.waitForTimeout(2500);
  await page.screenshot({path:path.join(out,'merchant-v02-in-market.jpg'),type:'jpeg',quality:91,timeout:30000});
  fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify({info,modelResponses,errors:errors.slice(0,20)},null,2));
  console.log('PASS: actual merchant V02 GLB visible in market',JSON.stringify(info));
 }catch(error){
  const diag=await page.evaluate(()=>({loading:document.querySelector('#loadState')?.textContent,
    model:window.__genesisMarket?.modelStatus?.(),
    market:!!window.__genesisMarket,app:!!document.getElementById('genesisApp')?.app})).catch(()=>({}));
  fs.writeFileSync(path.join(out,'failed.json'),JSON.stringify({error:String(error),diag,errors},null,2));
  await page.screenshot({path:path.join(out,'merchant-v02-error.png'),timeout:10000}).catch(()=>{});
  throw error;
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
