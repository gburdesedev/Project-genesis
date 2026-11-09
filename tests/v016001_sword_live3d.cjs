'use strict';
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews/v016001-v12b-live3d');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end()}
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
 fs.createReadStream(file).pipe(res);
});
const report={status:'INITIALIZING',consoleErrors:[],networkErrors:[]};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:700,height:800},serviceWorkers:'block'});
  page.on('pageerror',e=>report.consoleErrors.push(String(e).slice(0,450)));
  page.on('response',r=>{if(r.status()>=400&&report.networkErrors.length<25)report.networkErrors.push(r.status()+' '+r.url().slice(0,200))});
  await page.goto('http://127.0.0.1:'+server.address().port+'/genesis_sword_runtime_v001.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>['ready','error'].includes(window.__genesisSwordViewerStatus?.phase),null,{timeout:150000});
  report.viewer=await page.evaluate(()=>window.__genesisSwordViewerStatus);
  assert.equal(report.viewer.phase,'ready','Real V12B GLB could not render: '+report.viewer.error);
  assert.equal(report.viewer.node,'GENESIS_V048_APPROVED_SWORD_V12B_IN_RIGHT_HAND_STATIC');
  assert(report.viewer.meshes>=1);
  assert(report.viewer.dimensions.diagonal>0);
  await page.screenshot({path:path.join(out,'01-v12b-front-3d.png'),timeout:15000,animations:'allow'});
  const canvas=page.locator('#sword3d');const rect=await canvas.boundingBox();
  await page.mouse.move(rect.x+rect.width*.50,rect.y+rect.height*.5);
  await page.mouse.down();await page.mouse.move(rect.x+rect.width*.82,rect.y+rect.height*.68,{steps:12});await page.mouse.up();
  await page.waitForTimeout(350);
  await page.screenshot({path:path.join(out,'02-v12b-rotated-3d.png'),timeout:15000,animations:'allow'});
  report.status='PASS_GLTF_V12B_REAL_3D_INTERACTIVE';
 }finally{await browser.close()}
})().catch(err=>{report.status='FAIL';report.exception=String(err?.stack||err);console.error(report.exception);process.exitCode=1})
.finally(()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));server.close();console.log('GENESIS_V12B_RESULT',JSON.stringify(report).slice(0,4500))});
