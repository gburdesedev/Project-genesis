'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'previews','resultado-dinamico-v4');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  const unexpected=[];
  page.on('pageerror',e=>unexpected.push(e.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.pathname==='/')return route.fulfill({status:200,contentType:'text/html',
     body:'<!doctype html><html><head><meta charset="utf-8"></head><body style="background:#080607;margin:0"><div style="height:100vh;display:grid;place-items:center"><div id="modal" class="modal" style="width:1600px"></div></div></body></html>'});
   const p=path.resolve(root,decodeURIComponent(u.pathname).replace(/^\/+/,''));
   if(!p.startsWith(root+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile())return route.fulfill({status:404,body:'not found'});
   const ext=path.extname(p).toLowerCase(),types={'.png':'image/png','.css':'text/css','.js':'application/javascript'};
   return route.fulfill({status:200,body:fs.readFileSync(p),contentType:types[ext]||'application/octet-stream'});
  });
  await page.goto('http://genesis.local/');
  await page.addStyleTag({url:'http://genesis.local/genesis_result_dynamic_v001.css'});
  await page.addScriptTag({url:'http://genesis.local/genesis_result_dynamic_v001.js'});
  async function show(item){
    await page.evaluate(data=>{
      const el=document.getElementById('modal');
      el.className='modal';
      window.GenesisResultDynamic.decorate(el,data);
    },item);
  }
  const model={
    id:'craft-sword-test',recipe:'espada_hierro',name:'Espada de hierro',rarity:'Inútil',
    channels:[['Daño',42.64]],description:'Primera espada de la demostración.'
  };
  await show(model);
  assert.equal(await page.locator('.grChannelGroup').count(),1);
  assert.equal(await page.locator('[data-result-channel=Base]').count(),1);
  await page.locator('.grChannelRow.grHasOra').first().waitFor({state:'attached'});
  assert.equal(await page.locator('.grChannelRow.grHasOra').count(),1,'ORA Base no cargada');
  assert.equal(await page.locator('.grOra').first().evaluate(img=>img.naturalWidth),990);
  await page.screenshot({path:path.join(out,'01-espada-base.png')});
  await show({...model,id:'craft-sword-2',rarity:'Bueno',channels:[['Daño',78],['Fuego',82],['Rayo',55.5]],
    channelTechniques:{Fuego:[{nombre:'Quemadura',valor:32}]}});
  assert.equal(await page.locator('.grChannelGroup').count(),3);
  assert.equal(await page.locator('.grSub').count(),0,'V016.001: técnicas secundarias excluidas');
  assert.equal(await page.getByText('Quemadura').count(),0);
  assert.equal(await page.locator('[data-result-channel=Luz]').count(),0);
  await page.waitForFunction(()=>document.querySelectorAll('.grChannelRow.grHasOra').length===3);
  assert.equal(await page.locator('.grChannelRow.grHasOra').count(),3,'No aparecen las tres ORA originales');
  await page.screenshot({path:path.join(out,'02-espada-tres-canales.png')});
  const body=await page.locator('.grScreen').boundingBox();
  assert.ok(body?.width>1200&&body?.height>600);
  assert.deepEqual(unexpected,[],'Browser JS errors');
  console.log('OK: 2 screenshots (one and three active channels), original sword poster and preserved result event target.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
