const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try {
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body style="background:#010101;margin:0"><div id="modalLayer" style="position:fixed;inset:0;display:grid;place-items:center"><div id="modal"></div></div></body></html>');
  await page.addStyleTag({path:path.resolve(__dirname,'../mercenary_equipment_canvas_v001.css')});
  await page.addScriptTag({path:path.resolve(__dirname,'../mercenary_equipment_canvas_v001.js')});
  await page.evaluate(()=>{
    const a={id:'a',recipe:'espada_hierro',name:'Espada original',rarity:'Bueno',channels:[['Base',85],['Luz',42]]};
    const b={id:'b',recipe:'espada_hierro',name:'Espada del artesano',rarity:'Excelente',channels:[['Base',92],['Fuego',78],['Rayo',17]]};
    const c={id:'c',recipe:'escudo_hierro',name:'Escudo actual',rarity:'Común',channels:[['Base',12]]};
    const d={id:'d',recipe:'escudo_hierro',name:'Escudo candidato',rarity:'Bueno',channels:[['Base',17],['Hielo',24]]};
    window.testEquip=null;
    window.GenesisMercenaryConcept.open({
      modal:(html,cls)=>{const el=document.querySelector('#modal');el.innerHTML=html;el.className='modal '+cls;},
      mercName:'Guerrero 01',candidate:0,body:'peasant',editing:true,tanner:false,
      labelFirst:'Arma',labelSecond:'Escudo',familyFirst:'Espadas',familySecond:'Escudos',
      poolFirst:[a,b],poolSecond:[c,d],selectedFirst:b,selectedSecond:d,
      equippedFirst:a,equippedSecond:c,
      itemIcon:()=>'',statsHTML:'<p>Valores del mercenario</p>',
      onDraft:()=>{},onConfirm:(first,second)=>{window.testEquip=[first.id,second.id]},
      onBack:()=>{window.testBack=true}
    });
  });
  assert.equal(await page.locator('.mercConcept').count(),1);
  assert.equal(await page.locator('.mcSlot').count(),11);
  assert.equal(await page.locator('.mcChannel').count(),4);
  assert.ok(await page.locator('.mcChannels').evaluate(x=>getComputedStyle(x).overflowY==='auto'));
  const ratio=await page.locator('.mercConcept').evaluate(x=>x.clientWidth/x.clientHeight);
  assert.ok(Math.abs(ratio-16/9)<.04,'16:9 should hold; '+ratio);
  await page.locator('[data-family="second"]').click();
  assert.equal(await page.locator('.mcChannel').count(),2);
  await page.locator('[data-action="inventory"]').click();
  assert.ok(await page.getByText('INVENTARIO DEL MERCENARIO',{exact:true}).count()>0);
  await page.locator('[data-action="dismiss"]').click();
  await page.locator('[data-action="equip"]').click();
  assert.deepEqual(await page.evaluate(()=>window.testEquip),['b','d']);
  await page.locator('[data-family="first"]').click();
  await page.locator('[data-action="inspect"]').click();
  assert.equal(await page.locator('.mcOverlay').count(),1);
  await page.locator('[data-action="dismiss"]').click();
  await page.screenshot({path:'/tmp/mercenary-concept-16x9.png',fullPage:true});
  console.log('PASS: 16:9, 11 gear slots, exact rings, family filters, real-channel comparison, scroll, inspect, inventory, equip callback');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
