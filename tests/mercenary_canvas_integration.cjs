/* Project Genesis V04 approved art — isolated PlayCanvas UI integration check.
   Values below exist only in test fixtures. The shipping renderer receives game objects. */
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1670,height:942},deviceScaleFactor:1});
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body style="background:#090807;margin:0"><div id="modalLayer" style="position:fixed;inset:0;display:grid;place-items:center"><div id="modal"></div></div></body></html>');
  await page.addStyleTag({path:path.resolve(__dirname,'../mercenary_equipment_canvas_v001.css')});
  await page.addScriptTag({path:path.resolve(__dirname,'../mercenary_equipment_canvas_v001.js')});
  await page.evaluate(()=>{
    const a={id:'a',recipe:'espada_hierro',name:'Espada original',rarity:'Común',channels:[['Base',85],['Luz',42]]};
    const b={id:'b',recipe:'espada_hierro',name:'Espada nueva',rarity:'Bueno',channels:[['Base',92],['Fuego',78],['Rayo',17]]};
    const c={id:'c',recipe:'escudo_hierro',name:'Escudo original',rarity:'Inútil',channels:[['Base',12]]};
    const d={id:'d',recipe:'escudo_hierro',name:'Escudo nuevo',rarity:'Común',channels:[['Base',17],['Hielo',24]]};
    window.testEquip=null;
    window.GenesisMercenaryConcept.open({
      modal:(html,cls)=>{const el=document.querySelector('#modal');el.innerHTML=html;el.className='modal '+cls},
      mercName:'Guerrero 01',candidate:0,body:'peasant',editing:true,
      labelFirst:'Arma',labelSecond:'Escudo',familyFirst:'Espadas',familySecond:'Escudos',
      poolFirst:[a,b],poolSecond:[c,d],selectedFirst:b,selectedSecond:d,
      equippedFirst:a,equippedSecond:c,
      itemIcon:()=>'',statsHTML:'<p>Datos del mercenario</p>',
      onConfirm:(first,second)=>{window.testEquip=[first.id,second.id]},
      onBack:()=>{window.testBack=true}
    });
  });
  assert.equal(await page.locator('.mercV04').count(),1);
  assert.equal(await page.locator('.mcV4Row').count(),4);
  assert.equal(await page.locator('[data-action="slot-first"]').count(),1);
  assert.equal(await page.locator('[data-action="slot-second"]').count(),1);
  assert.equal(await page.locator('.mercV04 .mcV4Body model-viewer').count(),1);
  const ratio=await page.locator('.mercV04').evaluate(x=>x.clientWidth/x.clientHeight);
  assert.ok(Math.abs(ratio-1670/942)<.04,'approved aspect ratio should hold');
  await page.locator('[data-action="family-second"]').click();
  assert.equal(await page.locator('.mcV4Row').count(),1,'equipped shield base only until new shield selected');
  await page.locator('[data-item="1"]').click();
  assert.equal(await page.locator('.mcV4Row').count(),2,'shield dynamically displays base + hielo');
  await page.locator('[data-action="equip"]').click();
  assert.deepEqual(await page.evaluate(()=>window.testEquip),['b','d']);
  await page.locator('[data-action="inventory"]').click();
  assert.equal(await page.locator('.mcV4Overlay').count(),1);
  await page.locator('[data-action="dismiss"]').click();
  await page.locator('[data-action="family-first"]').click();
  assert.equal(await page.locator('.mcV4Row').count(),2,'only actual equipped sword channels are shown until selecting a new item');
  await page.locator('[data-item="1"]').click();
  assert.equal(await page.locator('.mcV4Row').count(),4);
  await page.screenshot({path:'/tmp/mercenary-concept-16x9.png',fullPage:true});
  console.log('PASS approved V04 visual base, 2 rings in original art, dynamic channels, family switching, item selection and equip callback');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});