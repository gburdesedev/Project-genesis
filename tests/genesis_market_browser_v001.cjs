/* Real browser smoke for market v0.14.019. Headless screenshots are structural,
   not an endorsement of material PBR or final merchant art. */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'previews','market-v014019-qa');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.json':'application/json','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const target=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 const stream=fs.createReadStream(target);
 stream.once('error',()=>{if(!res.headersSent)res.writeHead(404);res.end();});
 res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');
 stream.pipe(res);
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!!window.__genesisMarket?.catalog,null,{timeout:180000});
  const npc=await page.evaluate(()=>({status:{version:window.__genesisMarket?.version,npc:window.__genesisMarket?.npc,center:window.__genesisMarket?.center},
    model:!!document.getElementById('genesisApp')?.app?.root.findByName('Mercader de suministros · NPC interactivo V001')}));
  assert(npc.model,'NPC not present in actual PlayCanvas scene');
  await page.locator('[data-profession="Herrero"]').click({timeout:180000});
  await page.waitForFunction(()=>window.__genesisMarket?.catalog()?.length>0,null,{timeout:180000});
  const items=await page.evaluate(()=>window.__genesisMarket.catalog());
  assert(items.length>=2,'Generated seed contained no known items');
  assert(!items.includes('Lingote de hierro'),'Market leaked prepared ingot');
  assert(items.includes('Mineral de hierro'),'Market lacks raw ore for iron');
  const opened=await page.evaluate(()=>window.__genesisMarket.open());
  assert.equal(opened,true);
  const rows=page.locator('.genesisMarketCard[data-slot]');
  assert.equal(await rows.count(),items.length,'UI did not match actual seed list');
  const first=rows.first();
  const before=await first.locator('small').textContent();
  await first.locator('button[data-buy]').click();
  const after=await page.locator('.genesisMarketCard[data-slot="0"] small').textContent();
  assert.notEqual(before,after,'Buy did not change live inventory count');
  assert.match(after,/Tenés 1 · Precio: 0 oro/);
  const summary={ok:true,npc:npc.status,catalog:items,before,after,errors:errors.slice(0,12)};
  fs.writeFileSync(path.join(out,'status.json'),JSON.stringify(summary,null,2));
  // A headless GPU runner may hang on screenshots even when the real market
  // and purchase pipeline passed. Preserve truthfully verified gameplay.
  try{
    await page.screenshot({path:path.join(out,'market-herrero.png'),timeout:7000,animations:'disabled'});
  }catch(err){
    fs.writeFileSync(path.join(out,'screenshot-limitation.txt'),String(err));
    console.warn('Marketplace screenshot unavailable on GPU runner:',String(err).slice(0,250));
  }
  console.log('PASS in-game seeded marketplace',JSON.stringify(summary));
 }catch(error){
  const diag=await page.evaluate(()=>({
    state:document.querySelector('#loadState')?.textContent,
    detail:document.querySelector('#loadDetail')?.textContent,
    retry:document.querySelector('#loadRetry')?.style.display,
    market:window.__genesisMarket?{version:window.__genesisMarket.version,npc:window.__genesisMarket.npc,center:window.__genesisMarket.center}:null,
    app:!!document.querySelector('#genesisApp')?.app
  })).catch(e=>({diagnosticError:String(e)}));
  fs.writeFileSync(path.join(out,'browser-error.json'),JSON.stringify({error:String(error),diag,errors:errors.slice(0,50)},null,2));
  await page.screenshot({path:path.join(out,'market-browser-error.png'),timeout:10000}).catch(()=>{});
  throw error;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
