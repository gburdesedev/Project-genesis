const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const types = {'.png':'image/png','.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.glb':'model/gltf-binary'};
const server = http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 let p=path.resolve(root,'.'+decodeURIComponent(u.pathname));
 if (!(p===root||p.startsWith(root+path.sep))) {res.writeHead(403).end();return;}
 fs.readFile(p,(error,b)=>{if(error){res.writeHead(404).end('Not Found');return;}res.writeHead(200,{'Content-Type':types[path.extname(p)]||'application/octet-stream'});res.end(b);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader','--enable-webgl']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/preview_empty.html`,{waitUntil:'load'});
  assert.equal(await page.locator('.pv9Board').count(),1,'approved V09 layout must be mounted');
  assert.equal(await page.locator('.pv9Grid .mcInventorySlot').count(),20,'exactly 20 empty item slots');
  assert.equal(await page.locator('.pv9Slot').count(),10,'10 equipment locations incl necklace and exactly two rings');
  assert.equal(await page.locator('.pv9Slot[aria-label^="Anillo"]').count(),2,'one ring on each hand');
  assert.equal(await page.locator('.mcChannel').count(),0,'no dummy channels without genuine items');
  assert.equal(await page.locator('.pv9Grid img').count(),0,'no fictitious swords/shields');
  assert.equal(await page.locator('[data-action="equip"]').isDisabled(),true,'empty equip cannot be triggered');
  const bg=await page.evaluate(async()=>{
    const im =new Image();im.src='/assets/ui/mercenary/v09/V09_Plantilla_Vacia_Referencia.png';await im.decode();
    const ref=new Image();ref.src='/assets/ui/mercenary/v09/Concept_V09_Original_INTACTO.png';await ref.decode();
    const shell=document.querySelector('.pv9Shell');let b=shell.getBoundingClientRect();
    return {width:im.naturalWidth,height:im.naturalHeight,originalWidth:ref.naturalWidth,originalHeight:ref.naturalHeight,ratio:b.width/b.height,bg:getComputedStyle(shell).backgroundImage};
  });
  assert.deepEqual([bg.width,bg.height],[1670,942]);
  assert.deepEqual([bg.originalWidth,bg.originalHeight],[1671,941]);
  assert.ok(Math.abs(bg.ratio-1670/942)<.006);
  assert.ok(bg.bg.includes('V09_Plantilla_Vacia_Referencia.png'));
  await page.locator('[data-family="second"]').click();
  assert.equal(await page.locator('.mcChannel').count(),0);
  assert.equal(await page.locator('.pv9Grid .mcInventorySlot').count(),20);
  const out=path.resolve(root,'previews/mercenary-v09/approved-empty-1600x900.png');fs.mkdirSync(path.dirname(out),{recursive:true});
  await page.screenshot({path:out,fullPage:true});
  assert.deepEqual(errors,[],'browser must not throw runtime errors');
  console.log('PASS V09: immutable original art, existing empty plate, 16:9, 20 empty squares, 10 anatomical slots, 2 rings, genuine-data-only, blank compare, no equip without items.');
  console.log('Screenshot:',out);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
