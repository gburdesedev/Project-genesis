/* Real PlayCanvas browser smoke, no production mutation */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','herreria-v011-browser-reports');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  let file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep))throw Error('403');
  const st=fs.statSync(file);
  if(st.isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
 }catch(e){res.writeHead(404);res.end('Missing '+e.message)}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1366,height:768}});
 const problems=[];
 page.on('pageerror',err=>problems.push(String(err)));
 page.on('console',message=>{if(message.type()==='error')problems.push(message.text())});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/previews/herreria-v011-playcanvas.html',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>{
    const d=document.querySelector('iframe')?.contentWindow?.__genesisBlacksmithRoofPreview;
    return !!d && (d.phase==='scene mounted where available'||d.phase==='failed');
  },null,{timeout:160000});
  const before=await page.frameLocator('#game').locator('body').evaluate(()=>window.__genesisBlacksmithRoofPreview);
  console.log('INITIAL',JSON.stringify(before));
  assert.equal(before.phase,'scene mounted where available',JSON.stringify(before.errors));
  for(const name of ['walls','roof','chimney'])assert(before.models[name]?.loaded,'Missing real '+name+' GLB');
  await page.waitForTimeout(8000);
  const mounted=await page.frameLocator('#game').locator('body').evaluate(()=>{
    const app=document.querySelector('pc-app')?.app || document.querySelector('pc-app')?.application;
    const village=app?.root.findByName('Herrero · fachada cerrada');
    const active=document.getElementById('compactBlacksmithRoot')?.entity;
    return {app:!!app,village:!!village,active:!!active,
      villageChildren:village?.children?.map(x=>x.name).slice(0,12),
      activeChildren:active?.children?.map(x=>x.name).slice(0,15),
      villageMounted:!!village?.findByName('GENESIS_HERRERO_WORKSHOP_V011'),
      activeMounted:!!active?.findByName('GENESIS_HERRERO_WORKSHOP_V011'),
      preview:window.__genesisBlacksmithRoofPreview};
  });
  console.log('MOUNTED',JSON.stringify(mounted));
  fs.writeFileSync(path.join(out,'status.json'),JSON.stringify(mounted,null,2));
  await page.screenshot({path:path.join(out,'preview.png')});
  assert(mounted.villageMounted||mounted.activeMounted,
    'No V010/V011 walls and roof were mounted in any real PlayCanvas workshop');
  await page.locator('#roof').click();
  await page.waitForTimeout(2000);
  const toggled=await page.frameLocator('#game').locator('body').evaluate(()=>window.__genesisBlacksmithRoofPreview);
  assert.equal(toggled.roofVisible,false,'Roof toggle does not affect game scene');
  await page.locator('#roof').click();
  console.log('PASS PlayCanvas V010/V011',JSON.stringify({mounted:mounted.preview.installations,errors:mounted.preview.errors,consoleErrors:problems.slice(0,15)}));
 }finally{await browser.close()}
})().catch(e=>{console.error('FAILED',e);process.exitCode=1}).finally(()=>server.close());
