/* Render 16:9 layout from the ACTUAL embedded Genesis procedural engine. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out='/tmp/mercenary-qa-v002';
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const match=html.match(/<script id="genesis-prototype-engines">([\s\S]*?)<\/script>/);
assert.ok(match,'embedded item engine present');
const scope={window:{},Date,Math,JSON,Set,Map,Object,Array,String,Number};
vm.runInNewContext(match[1],scope,{timeout:10000});
const engine=scope.window.GenesisPrototypeEngines,session=engine.generateSession('Herrero',{seed:0x47454e31});
const glyphStart=html.indexOf('function svgUri(svg)'),glyphEnd=html.indexOf('const EQUIP_MODEL_URLS=',glyphStart);
assert.ok(glyphStart>=0&&glyphEnd>glyphStart,'original object icons present');
const glyphs=new Function(html.slice(glyphStart,glyphEnd)+';return ITEM_GLYPHS;')();
const inventoryIcons={espada_hierro:glyphs.Espada,escudo_hierro:glyphs.Escudo};
const fabricated=[],used=new Set();
for(const [id,craft,wanted] of [['espada_hierro',1,'Inútil'],['espada_hierro',2,'Bueno'],['escudo_hierro',1,'Inútil'],['escudo_hierro',2,'Común']]){
 let item;
 for(let attempt=0;attempt<1500;attempt++){
  const seed=(session.seed+craft*1000003+(id==='espada_hierro'?0x10000000:0x20000000)+attempt*7919)>>>0;
  item=engine.fabricate(id,{craft,seed,formula:session.formulas[id],artisan:'Artesano del prototipo'});
  if(item.rarity===wanted)break;
 }
 assert.equal(item.rarity,wanted);
 const named=engine.present(item,used);used.add(named.name.toLowerCase());fabricated.push(JSON.parse(JSON.stringify(named)));
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage'],headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#080705"><div id="modalLayer" style="position:fixed;inset:0;display:grid;place-items:center"><div id="modal"></div></div></body></html>');
 try{await page.addScriptTag({url:'https://ajax.googleapis.com/ajax/libs/model-viewer/4.4.0/model-viewer.min.js',type:'module'});}catch(e){console.warn('Model viewer CDN unavailable:',e.message)}
 await page.addStyleTag({path:path.join(root,'mercenary_equipment_canvas_v001.css')});
 await page.addScriptTag({path:path.join(root,'mercenary_equipment_canvas_v001.js')});
 const data={first:fabricated.slice(0,2),second:fabricated.slice(2),icons:inventoryIcons};
 await page.evaluate(d=>window.GenesisMercenaryConcept.open({
  modal:(markup,extra)=>{const node=document.getElementById('modal');node.className='modal '+extra;node.innerHTML=markup},
  mercName:'Guerrero 01',candidate:0,body:'peasant',editing:true,
  labelFirst:'Arma',labelSecond:'Escudo',familyFirst:'Espadas',familySecond:'Escudos',
  poolFirst:d.first,poolSecond:d.second,selectedFirst:d.first[1],selectedSecond:d.second[1],
  equippedFirst:d.first[0],equippedSecond:d.second[0],
  itemIcon:(id)=>d.icons[id]||'',statsHTML:'',getMercInventoryHTML:()=>'<p>Inventario</p>',
  onConfirm:()=>{}
 }),data);
 try{await page.locator('.mcV4Body model-viewer').evaluate(async x=>{if(typeof x.updateComplete==='object')await x.updateComplete;});await page.waitForTimeout(2400);}catch(e){console.warn('Mercenary GLB preview:',e.message)}
 await page.screenshot({path:path.join(out,'concept-espada-buena-real.png')});
 assert.equal(await page.locator('.mcV4Row').count(),3);
 await page.locator('[data-action="family-second"]').click();
 assert.equal(await page.locator('.mcV4Row').count(),1); // equipped shield Base; candidate not selected yet
 await page.screenshot({path:path.join(out,'concept-escudo-comun-real.png')});
 console.log('PASS approved 16:9 comparison from actual NGE engine',fabricated.map(i=>i.rarity));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
