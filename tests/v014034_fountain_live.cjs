'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews','v014034-fountain');
fs.mkdirSync(out,{recursive:true});
const srv=http.createServer((req,res)=>{
 try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end()}
 res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.glb':'model/gltf-binary','.json':'application/json'})[path.extname(file)]||'application/octet-stream'});
 fs.createReadStream(file).pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e))}
});
(async()=>{
 await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
 const page=await browser.newPage({viewport:{width:1366,height:768},serviceWorkers:'block'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
 await page.goto('http://127.0.0.1:'+srv.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>document.getElementById('prototypeIntro')?.style.display==='grid'||document.querySelector('.loadingCard.failed'),null,{timeout:150000});
 assert.equal(await page.locator('.loadingCard.failed').count(),0,'Startup failed before selecting Herrero');
 await page.locator('[data-profession="Herrero"]').click();
 await page.waitForFunction(()=>document.getElementById('professionChip')?.style.display!=='none'&&document.getElementById('prototypeIntro')?.style.display==='none'||document.querySelector('.loadingCard.failed'),null,{timeout:200000});
 assert.equal(await page.locator('.loadingCard.failed').count(),0,'Game failed after Herrero selection');
 const state=await page.evaluate(()=>({village:window.__genesisLiteVillage,treeStatus:window.__genesisTreeStatus,hasScene:!!window.__genesisVillage?.root,hasRealColliders:!!window.__genesisVillage?.trees?.collisionSnapshot}));
 assert.equal(state.village?.workshops,1);assert.equal(state.village?.trees,14);assert.equal(state.village?.treeLOD,'LOD2');
 await page.waitForFunction(()=>window.__genesisLiteVillage?.treeLoadFinished===true,null,{timeout:180000});
 const result=await page.evaluate(()=>({village:window.__genesisLiteVillage,status:window.__genesisVillage.trees.status(),colliders:window.__genesisVillage.trees.collisionSnapshot()}));
 assert.equal(result.village.treeVariants,4,'Four approved LOD2 species need to load');
 assert.equal(result.village.treeErrors,0,'Tree GLB load failed');
 assert.equal(result.status.planned,14);assert.equal(result.status.plaza,4);
 assert(result.colliders.filter(x=>x.region==='plaza'&&x.loaded&&x.measured).length===4,'All plaza trees need physically measured bark');
 assert.equal(result.status.lod2Only,true);
 await page.waitForFunction(()=>['ready','error'].includes(window.__genesisDolphinFountain?.phase),null,{timeout:200000});
 const fountain=await page.evaluate(()=>({...window.__genesisDolphinFountain}));
 assert.equal(fountain.phase,'ready','Approved fountain V011 GLB did not mount: '+JSON.stringify(fountain));
 assert(fountain.meshInstances>0,'Approved dolphin fountain must have real render geometry');
 assert.equal(fountain.collisionRadius,2.1);
 console.log('V014034_FOUNTAIN_GLBS_READY',JSON.stringify(fountain));
 await page.screenshot({path:path.join(out,'01-herrero-with-fountain.png'),timeout:20000});
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result,errors},null,2));
 console.log('V014034_FOUNTAIN_PASS',JSON.stringify({status:result.status,village:result.village,httpErrors:errors.filter(x=>/^4|^5/.test(x)).slice(0,8)}));
 }finally{await browser.close()}
})().catch(e=>{console.error('V014034_FOUNTAIN_FAIL',e);process.exitCode=1}).finally(()=>srv.close());
