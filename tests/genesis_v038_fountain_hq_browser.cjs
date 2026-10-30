/* Real WebGL smoke test for the separate Project Genesis V038 + V011 HQ page.
 * Must not claim success based only on HTML, downloaded bytes or preview labels.
 */
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'genesis-v038-fuente-hq-preview.html');
if(!fs.existsSync(file)||fs.statSync(file).size<1_000_000)throw Error('Generated game preview missing');
const reportDir=path.join(root,'reports','v038-fuente-hq-browser');
fs.mkdirSync(reportDir,{recursive:true});
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const full=path.resolve(root,'.'+name);
 if(!full.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 if(!fs.existsSync(full)){res.writeHead(404);return res.end('Not found '+name)}
 res.setHeader('Content-Type',MIME[path.extname(full)]||'application/octet-stream');
 fs.createReadStream(full).pipe(res);
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const errors=[],requests=[];
 page.on('pageerror',e=>errors.push('PAGE '+String(e)));
 page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errors.push('CONSOLE '+m.text().slice(0,300))});
 page.on('requestfailed',r=>requests.push({url:r.url().slice(0,260),reason:r.failure()?.errorText}));
 let status='FAILED',details={};
 try{
  const url='http://127.0.0.1:'+server.address().port+'/genesis-v038-fuente-hq-preview.html';
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  await page.locator('#genesisApp').waitFor({timeout:120000});
  await page.waitForFunction(()=>document.querySelector('#genesisApp')?.app?.root,{timeout:180000});
  // Pick Herrero only when the profession chooser is actually visible.
  const choice=page.locator('[data-profession="Herrero"]').first();
  for(let attempt=0;attempt<60;attempt++){
    if(await choice.isVisible().catch(()=>false))break;
    await page.waitForTimeout(1000);
  }
  if(await choice.isVisible().catch(()=>false))await choice.click({timeout:30000});
  await page.waitForFunction(()=>window.__genesisHQFountainForgeQA?.fountain!=='WAITING',{timeout:180000});
  const actual=await page.evaluate(()=>{
    const app=document.querySelector('#genesisApp')?.app;
    const f=document.getElementById('genesisFountainV011Model');
    const v=document.getElementById('forgeModel');
    const evaluateModel=node=>{
      const root=node?.contentEntity;
      if(!root)return {root:false,renderComponents:0,meshes:0,enabled:false};
      const components=root.findComponents('render');
      const meshes=components.reduce((n,c)=>n+(c.meshInstances?.length||0),0);
      let enabled=true;
      for(let e=root;e;e=e.parent){if(!e.enabled){enabled=false;break}}
      const pos=node.entity?.getPosition();
      return {root:true,renderComponents:components.length,meshes,enabled,
        position:pos?[pos.x,pos.y,pos.z]:null};
    };
    return {app:!!app,qa:window.__genesisHQFountainForgeQA,
       fountain:evaluateModel(f),forge:evaluateModel(v),
       clip:f?.querySelector('pc-anim')?.clips||[],
       draco:!!document.getElementById('genesisHQDracoDecoder')};
  });
  details=actual;
  await page.screenshot({path:path.join(reportDir,'actual-game.png'),fullPage:false,timeout:60000});
  assert(actual.draco,'Draco was not present at game startup');
  assert(actual.fountain.root&&actual.fountain.enabled&&actual.fountain.meshes>10,'Fountain not visible / insufficient GLB meshes: '+JSON.stringify(actual.fountain));
  assert.equal(actual.clip.length,1,'Fountain GLB should expose a single 8s animation clip');
  // Wait for actual blacksmith route to finish mounting; not for fixed timer.
  await page.waitForFunction(()=>document.getElementById('forgeModel')?.contentEntity?.findComponents('render')?.length>0,
    {timeout:90000}).catch(()=>{});
  const forge=await page.evaluate(()=>{
    const el=document.getElementById('forgeModel'),root=el?.contentEntity;
    const renders=root?.findComponents('render')||[];
    return {asset:el?.getAttribute('asset'),meshes:renders.reduce((n,c)=>n+(c.meshInstances?.length||0),0)};
  });
  details.forgeAfterRoute=forge;
  assert(forge.meshes>10,'V038 forge not rendered after Herrero profession selected: '+JSON.stringify(forge));
  status='BROWSER_VALIDATED_BOTH_MODELS';
  console.log('PASS '+status+' '+JSON.stringify({fountain:actual.fountain,forge,clip:actual.clip}));
 }catch(e){errors.push('ASSERT '+String(e));console.error(e);process.exitCode=1;}
 finally{
   fs.writeFileSync(path.join(reportDir,'qa.json'),JSON.stringify({status,details,errors:errors.slice(0,60),failedRequests:requests.slice(0,40),testedAt:new Date().toISOString()},null,2));
   await browser.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
