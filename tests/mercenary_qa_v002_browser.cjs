/* Real full-game mercenary QA: no mocked fabrication objects. */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out='/tmp/mercenary-qa-v002';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname),f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep))throw Error('blocked');res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).on('error',()=>res.destroy()).pipe(res)}catch(e){res.writeHead(404);res.end('error')}});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',e=>errors.push(String(e)));
 page.on('console',e=>{if(e.type()==='error')errors.push(e.text().slice(0,600))});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?mercenary-qa=1',{waitUntil:'domcontentloaded',timeout:120000});
  try {
    await page.waitForFunction(()=>['ready','error'].includes(window.GenesisMercenaryQA?.phase),null,{timeout:150000});
  } catch(err) {
    const state=await page.evaluate(()=>({
      url:location.href,title:document.title,readyState:document.readyState,
      boot:window.__genesisBoot,qa:window.GenesisMercenaryQA,
      intro:document.getElementById('intro')?.style.display,
      loading:document.getElementById('loading')?.style.display,
      canvas:document.querySelector('canvas')?.getBoundingClientRect().toJSON(),
      scripts:[...document.scripts].map(x=>x.src).filter(Boolean).slice(-14),
      performance:performance.getEntriesByType('resource').filter(x=>/jsdelivr|playcanvas|github|cdn/.test(x.name)).slice(-12).map(x=>({name:x.name,duration:x.duration,transferSize:x.transferSize}))
    }));
    fs.writeFileSync(path.join(out,'boot-failure.json'),JSON.stringify({state,errors},null,2));
    await page.screenshot({path:path.join(out,'boot-failure.png'),timeout:15000}).catch(()=>{});
    console.error('BOOT DIAGNOSTICS',JSON.stringify({state,errors:errors.slice(-20)}).slice(0,12000));
    throw err;
  }
  // A busy external WebGL render must never prevent gameplay validation.
  const safeScreenshot=async(name)=>{
    const dest=path.join(out,name);
    try{
      if(process.env.GENESIS_SCREENSHOT==='1')await page.locator('.mercV04').screenshot({path:dest,timeout:8500,animations:'disabled'});
      console.log('SCREENSHOT_SAVED',name);
    }catch(err){console.warn('SCREENSHOT_SKIPPED',name,String(err.message).slice(0,200));}
  };
  const qa=await page.evaluate(()=>{const x=window.GenesisMercenaryQA;return {phase:x.phase,steps:x.steps,items:x.items,errors:x.errors,emissive:x.emissive,remainingMaterialUnits:x.remainingMaterialUnits}});
  fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({qa,errors},null,2));
  assert.equal(qa.phase,'ready',JSON.stringify(qa.errors));
  assert.deepEqual(qa.items.map(i=>i.rarity),['Inútil','Bueno','Inútil','Común']);
  assert.equal(qa.remainingMaterialUnits,0);
  assert.equal(await page.locator('.mcItemSlot').count(),2);
  assert.equal(await page.locator('.mcV4Row').count(),3); // Base only versus Buena Base+2
  assert.equal(await page.locator('.mercV04').count(),1);
  await safeScreenshot('equipamiento-espadas-16x9.png');
  const layout=await page.evaluate(()=>{
    const fields=['#modalLayer','#modal','.mercV04','[data-action="family-second"]'];
    return fields.map(sel=>{const el=document.querySelector(sel);if(!el)return {sel,missing:true};const style=getComputedStyle(el),rect=el.getBoundingClientRect();return {sel,display:style.display,visibility:style.visibility,opacity:style.opacity,width:rect.width,height:rect.height,top:rect.top,left:rect.left,inlineDisplay:el.style.display};});
  });
  console.log('MERCENARY_QA_LAYOUT',JSON.stringify(layout));
  // Real browser pixels must follow the approved 1670x942 artboard, not collapse to zero.
  const clickTargets=await page.evaluate(()=>{
    const names=['family-first','family-second','inspect','equip','back'];
    return names.map(name=>{
      const node=document.querySelector('.mercV04 [data-action="'+name+'"]');
      const b=node?.getBoundingClientRect();
      return {name,width:b?.width||0,height:b?.height||0,hitVisible:!!node&&getComputedStyle(node).display!=='none'};
    });
  });
  console.log('MERCENARY_QA_CLICK_TARGETS',JSON.stringify(clickTargets));
  console.log('MERCENARY_QA_HOTSPOT_DEBUG',JSON.stringify(await page.evaluate(()=>{
    const e=document.querySelector('.mercV04 [data-action="family-second"]'),b=e?.getBoundingClientRect(),s=e?getComputedStyle(e):null;
    const parent=e?.offsetParent,p=parent?.getBoundingClientRect();
    return {outerHTML:e?.outerHTML,cssText:e?.style?.cssText,rect:b?.toJSON?.(),computed:s&&{position:s.position,display:s.display,visibility:s.visibility,width:s.width,height:s.height,left:s.left,top:s.top,transform:s.transform,contain:s.contain,boxSizing:s.boxSizing},offsetParent:parent?.className,parentBounds:p?.toJSON?.(),boardDimensions:document.querySelector('.mercV04')?.getBoundingClientRect()?.toJSON?.()};
  })));
  assert.ok(clickTargets.every(t=>t.hitVisible&&t.width>20&&t.height>15),'Approved art hotspots must have physical pointer targets');
  await page.locator('[data-action="family-second"]').click();
  assert.equal(await page.locator('.mcV4Row').count(),2); // Base+1 from Common
  await safeScreenshot('equipamiento-escudos-16x9.png');
  await page.locator('[data-action="family-first"]').click();
  // Choose Buena sword from artisan's family: click index 1.
  await page.locator('[data-item="1"]').click();
  await page.locator('[data-action="family-second"]').click();
  await page.locator('[data-item="1"]').click();
  await page.locator('[data-action="equip"]').click();
  await page.waitForTimeout(1000);
  const applied=await page.evaluate(()=>({
    qa:window.GenesisMercenaryQA?.phase,
    text:document.body.innerText.includes('Equipo actualizado'),
    mercOverlay:!!document.querySelector('#modal .mercSheetBody'),
    swordEnabled:!!document.querySelector('#mercSwordModel')?.entity?.enabled,
    shieldEnabled:!!document.querySelector('#mercShieldModel')?.entity?.enabled
  }));
  assert.ok(applied.mercOverlay,'Mercenary dossier should open on equip');
  assert.ok(applied.swordEnabled&&applied.shieldEnabled,'3D objects should remain attached');
  await safeScreenshot('mercenario-equipado.png');
  console.log('PASS MERCENARY FULL GAME',JSON.stringify({rarities:qa.items.map(x=>x.rarity),count:qa.items.length,steps:qa.steps.length,emissive:qa.emissive,applied,errors:errors.slice(0,5)}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
