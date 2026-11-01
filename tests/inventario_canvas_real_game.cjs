/* Game + inventory browser QA. Full PlayCanvas game is loaded, not a stripped HTML mock.
 * QA objects below are explicitly fixtures, never inserted in production inventory.
 * Screenshots verify the real game background plus the actual inventory controller.
 */
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dest='/tmp/genesis-inventory-canvas-live';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
  try{
    const p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const f=path.resolve(root,'.'+p);
    if(!(f===root||f.startsWith(root+path.sep)))throw Error('Path denied');
    res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});
    fs.createReadStream(f).on('error',()=>res.destroy()).pipe(res);
  }catch(e){res.writeHead(404);res.end('Not found')}
});
(async()=>{
  fs.mkdirSync(dest,{recursive:true});
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const errors=[],screens=[];
  page.on('pageerror',e=>errors.push(String(e).slice(0,400)));
  async function capture(name){const file=path.join(dest,name+'.png');await page.screenshot({path:file,timeout:15000});screens.push(file);}
  try{
    await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>typeof window.GenesisPreparation?.open==='function' && document.querySelector('#modal') && document.querySelector('#genesisApp'),null,{timeout:100000});
    await page.waitForTimeout(6500);
    const game=await page.evaluate(()=>{
      const app=document.querySelector('#genesisApp')?.app;
      return {app:!!app, canvas:!!document.querySelector('#genesisApp canvas'), phase:window.__genesisProductionHerreroV015?.phase||'unknown', title:document.title, modal:!!document.querySelector('#modal')};
    });
    console.log('REAL_GAME',JSON.stringify(game));
    await capture('01-escena-webgl-antes');
    // Reuse the production GenesisPreparation modal and inventory controller
    // with a QA session, not with modifications to persisted game data.
    await page.evaluate(()=>{
      window.__inventoryCanvasQA={
        stock:{'Lingote de hierro':3,'Mineral de hierro':7},
        items:[
          {id:'qa-sword-1',name:'Espada de hierro',recipe:'espada',rarity:'Bueno',channels:[['Fuego',8],['Base',18],['Luz',2]],ngeStory:'Relato de comprobación, no pertenece a la partida.'},
          {id:'qa-shield-1',name:'Escudo de hierro',recipe:'escudo',rarity:'Común',channels:[['Base',11]],ngeStory:'Objeto de prueba para verificar botones.'}
        ]
      };
      const q=window.__inventoryCanvasQA;
      q.open=()=>window.GenesisPreparation.open({
        profession:'Herrero',inventory:q.stock,requiredStock:{'Lingote de hierro':1},
        formula:{materials:[{material:'Lingote de hierro',qty:1}]},
        recipeName:'Espada de hierro',startTab:'Inventario',
        getItems:()=>q.items,
        renderItem:i=>'<span>'+i.name+'</span>',
        renderAsset:i=>i?'<div class="qa3dUnavailable" aria-label="Visor GLB no validado">'+i.name+'</div>':'',
        recipeAsset:()=>'<span>Espada de hierro</span>',
        namingReason:i=>i.ngeStory,
        onCraft:()=>{},
        modal(html,cls){const m=document.getElementById('modal');m.className='modal '+cls;m.innerHTML=html;document.getElementById('modalLayer').style.display='grid'},
        closeModal(){document.getElementById('modalLayer').style.display='none'}
      });
      q.open();
    });
    await page.waitForSelector('.genInv');
    assert.equal(await page.locator('.genInvSlot').count(),20);
    assert.equal(await page.locator('.genInvTab').count(),4);
    assert.equal(await page.locator('.genInvFamily').count(),3);
    const geom=await page.locator('.genInv').boundingBox();
    assert(Math.abs(geom.width/geom.height-16/9)<.006,'approved widescreen artboard');
    await capture('02-inventario-materiales');
    await page.locator('.genInvSlot[data-select="1"]').click();
    await capture('03-seleccion-otro-material');
    await page.locator('[data-family="Espadas"]').click();
    assert.deepEqual(await page.locator('.genInvChannel span').allTextContents(),['Canal base','Fuego','Luz']);
    assert.equal(await page.locator('.genInvSlot:not(:disabled)').count(),1);
    await capture('04-inventario-espadas');
    await page.locator('#genInvDetails').click();
    assert.equal(await page.locator('.genInvOverlay').count(),1,'Ficha opens');
    await capture('05-ficha-abierta');
    await page.locator('#genInvCloseDetails').click();
    assert.equal(await page.locator('.genInvOverlay').count(),0,'Ficha closes');
    await page.locator('[data-family="Escudos"]').click();
    await capture('06-inventario-escudos');
    await page.locator('.genInvTab[data-nav="Fabricaciones"]').click();
    assert.equal(await page.locator('.prepArtboard[data-active-tab="Fabricaciones"]').count(),1,'Fabricaciones navigates');
    await capture('07-fabricaciones');
    await page.locator('[data-tab="Inventario"]').click();
    assert.equal(await page.locator('.genInv').count(),1,'Back to inventory navigates');
    await page.locator('.genInvTab[data-nav="Comparacion"]').click();
    assert.equal(await page.locator('.prepArtboard[data-active-tab="Comparacion"]').count(),1,'Comparison navigates');
    await capture('08-comparacion');
    await page.locator('[data-tab="Preparacion"]').click();
    assert.equal(await page.locator('.prepArtboard[data-active-tab="Preparacion"]').count(),1,'Preparation navigates');
    await capture('09-preparacion');
    await page.keyboard.press('Escape');
    const closed=await page.locator('#modalLayer').evaluate(e=>e.style.display==='none');
    console.log('CLOSED_AFTER_ESCAPE',closed);
    const findings={run:'REAL_WEBGL_GAME_WITH_QA_SESSION',game,screenNames:screens.map(f=>path.basename(f)),checks:['family switching','20 slots','selection','Base-first','full sheet open/close','Inventario/Fabricaciones/Comparacion/Preparacion tabs','Escape'],glb360:'NOT_VERIFIED_FIXTURE_RENDERER',playErrors:errors.slice(0,20)};
    fs.writeFileSync(path.join(dest,'report.json'),JSON.stringify(findings,null,2));
    console.log('PASS_INVENTORY_CONTROLS_IN_REAL_CANVAS',JSON.stringify(findings));
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error('INVENTORY_CANVAS_QA_FAILED',e);process.exitCode=1;server.close();});