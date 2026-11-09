'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const asset=fs.readFileSync(path.join(root,'assets/playcanvas/approved/equipment/espada_v03_hierro_v175_v12b_cycles_hdri32.png'));
const art='data:image/png;base64,'+asset.toString('base64');
assert(asset.length>1500000);
assert(html.includes('renderGenesisHistoricCreationResult(item)}<div class="actions"'),'Game must actually invoke historic result');
assert(html.includes('Project Genesis v0.14.029'),'Build version must be incremented');
const start=html.indexOf('function renderGenesisHistoricCreationResult(item){');
const end=html.indexOf('function renderItemCard(item,second=false){',start);
assert(start>0&&end>start,'Historic renderer missing');
const code=html.slice(start,end);
const match=html.match(/<style id="genesisHistoricalResultStyle">([\s\S]*?)<\/style>/);
assert(match,'Historic art styles missing');
const context={
 window:{GenesisPrototypeEngines:{recipes:{espada_hierro:{name:'Espada de hierro',profession:'Herrero'}}}},
 itemVisual:()=>({c1:'#c3a16e',label:'CANAL BASE'}),
 AFFINITY_VISUAL:{Base:'#c3a16e',Fuego:'#ff6f2a'},
 esc:v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'),
 formulaWeightBreakdown:formula=>formula.materials,
 recipeKind:()=> 'Espadas',
 metricForChannel:(item,c,i)=>({label:i===0?'Daño base':'Fuego',display:String(c[1])}),
 itemAssetMarkup:()=>`<img class="genesisSwordV12BCycles" alt="Original V175 V12B Cycles HDRI32" src="${art}">`
};
const fn=vm.runInNewContext('('+code+')',context);
const baseItem={recipe:'espada_hierro',name:'Espada nacida de la forja',rarity:'Inútil',
 formula:{materials:[{material:'Lingote de hierro',qty:2},{material:'Carbón vegetal',qty:1},{material:'Madera seca de roble',qty:1}]},
 channels:[['Base',42.7]]};
const out=path.join(root,'previews/v014029-historic-result');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1});
  for(const [title,item,filename] of [
   ['Canal base',baseItem,'01-resultado-creacion-v175-v12b-base-1600x900.png'],
   ['Canal con afinidad', {...baseItem,channels:[['Base',42.7],['Fuego',63]]},'02-resultado-creacion-v175-v12b-fuego-1600x900.png']
  ]){
   const component=fn(item);
   assert(component.includes('RESULTADO DE FABRICACIÓN'));
   await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#090907;color:#e9d6b6;font:16px Georgia}*{box-sizing:border-box}.craftModal{width:98%;max-width:1480px;margin:20px auto}.actions{text-align:right}.actions button{background:#a77d42;color:#140c06;padding:12px 24px;cursor:pointer}</style><style>${match[1]}</style><div class="craftModal">${component}<div class="actions"><button id="resultContinue">Continuar</button></div></div>`);
   await page.waitForFunction(()=>{const img=document.querySelector('.genesisHistoricObject img');return img&&img.complete&&img.naturalWidth===1200&&img.naturalHeight===1500;},{timeout:10000}).catch(async()=>{await page.waitForTimeout(300);});
   const measures=await page.evaluate(()=>{
     const img=document.querySelector('.genesisHistoricObject img'),frame=document.querySelector('.genesisHistoricObject');
     const a=img.getBoundingClientRect(),b=frame.getBoundingClientRect();
     return {natural:[img.naturalWidth,img.naturalHeight],img:{x:a.x,y:a.y,w:a.width,h:a.height},frame:{x:b.x,y:b.y,w:b.width,h:b.height},within:a.x>=b.x-1&&a.y>=b.y-1&&a.right<=b.right+1&&a.bottom<=b.bottom+1,channels:document.querySelectorAll('.genesisHistoricChannel').length};
   });
   assert.deepEqual(measures.natural,[1200,1500]);
   assert(measures.within,'Sword image must remain entirely inside center viewer');
   assert.equal(measures.channels,item.channels.length);
   assert.equal(await page.locator('.genesisHistoricTitle').innerText().then(x=>x.includes('RESULTADO DE FABRICACIÓN')),true);
   assert.equal(await page.locator('.genesisHistoricMaterial').count(),3);
   await page.screenshot({path:path.join(out,filename),fullPage:true,animations:'disabled'});
   console.log('HISTORIC_RESULT_OK',title,JSON.stringify(measures));
  }
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({result:'PASS',build:'V014.029',source:'V03 V175 V12B Cycles HDRI EXR 32bit render',isLiveModel:false,channelsDynamic:true},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
