'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews/v014029-result-real-vfx');fs.mkdirSync(out,{recursive:true});
const shell='<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#09090d;height:100vh}body{display:grid;place-items:center}#modal{width:1600px}</style><link rel="stylesheet" href="/genesis_result_dynamic_v001.css"></head><body><div id="modal" class="modal"></div><script src="/genesis_result_dynamic_v001.js"></script></body></html>';
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((req,res)=>{const target=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(target==='/'){res.writeHead(200,{'Content-Type':'text/html'});return res.end(shell)}
 const f=path.resolve(root,'.'+target);if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end()}
 res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);
});
const report={status:'START',errors:[],samples:[]};
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},serviceWorkers:'block'});
  page.on('pageerror',e=>report.errors.push('JS '+e.message));page.on('response',r=>{if(r.status()>=400&&report.errors.length<30)report.errors.push('HTTP '+r.status()+' '+r.url().slice(0,130))});
  await page.goto('http://127.0.0.1:'+srv.address().port+'/',{waitUntil:'domcontentloaded',timeout:90000});
  const base={id:'sword-1',recipe:'espada_hierro',name:'Espada de hierro',rarity:'Inútil',channels:[['Daño',42.64]],description:'Primer cierre de fabricación: Canal Base obtenido por NGE.'};
  // Test cases are intentionally isolated visual fixtures; they DO NOT certify a full game playthrough.
  const scenarios=[
   ['01-base-0-0.png',base,0],
   ['02-fuego-25-rayo-80.png',{...base,id:'sword-f25r80',rarity:'Bueno',channels:[['Daño',78],['Fuego',25],['Rayo',80]],description:'Canales con intensidades controladas.'},0.25],
   ['03-fuego-80-rayo-25.png',{...base,id:'sword-f80r25',rarity:'Bueno',channels:[['Daño',78],['Fuego',80],['Rayo',25]],description:'Canales con intensidades controladas.'},2.2],
   ['04-fuego-100-rayo-100.png',{...base,id:'sword-f100r100',rarity:'Raro',channels:[['Daño',78],['Fuego',100],['Rayo',100]],description:'Intensidad máxima de ambos módulos.'},4.4]
  ];
  for(const [n,item,time] of scenarios){
   await page.evaluate(data=>{const el=document.getElementById('modal');el.className='modal';window.GenesisResultDynamic.decorate(el,data)},item);
   try{
    await page.waitForFunction(()=>Array.from(document.querySelectorAll('.grOra')).every(img=>img.complete&&img.naturalWidth>0),null,{timeout:60000,polling:600});
   }catch(e){
    report.oraFault=await page.evaluate(()=>({images:[...document.querySelectorAll('.grOra')].map(x=>({complete:x.complete,width:x.naturalWidth,src:x.src})),groups:document.querySelectorAll('.grChannelGroup').length,modal:document.querySelector('#modal')?.className,iframe:document.querySelector('iframe.grSwordInteractive')?.contentWindow?.__genesisSwordViewerStatus?.phase,resources:performance.getEntriesByType('resource').length}));
    await page.screenshot({path:path.join(out,'FAILED-second-ora.png'),timeout:12000,animations:'allow'}).catch(()=>{});
    throw e;
   }
   const iframe=page.frameLocator('iframe.grSwordInteractive');
   await iframe.locator('canvas#sword3d').waitFor({state:'visible',timeout:18000});
   await page.waitForFunction(()=>{const f=document.querySelector('iframe.grSwordInteractive');try{return ['ready','error'].includes(f?.contentWindow?.__genesisSwordViewerStatus?.phase)}catch(e){return false}},null,{timeout:90000});
   let state=await page.evaluate(()=>({channels:[...document.querySelectorAll('.grChannelGroup')].map(x=>x.dataset.resultChannel),secondary:document.querySelectorAll('.grSub').length,viewer:document.querySelector('iframe.grSwordInteractive')?.contentWindow?.__genesisSwordViewerStatus}));
   assert.equal(state.viewer.phase,'ready',JSON.stringify(state.viewer));assert.equal(state.viewer.vfxReady,true);assert.equal(state.secondary,0);
   assert.equal(state.channels.length,item.channels.length);
   const expected=Object.fromEntries(item.channels.map(c=>[c[0]==='Daño'?'Base':c[0],c[1]]));
   assert.equal(state.viewer.effects.Fuego.intensity,expected.Fuego||0);
   assert.equal(state.viewer.effects.Rayo.intensity,expected.Rayo||0);
   assert.equal(state.viewer.effects.Rayo.approvedVisual,true);
   assert.equal(state.viewer.effects.Fuego.approvedVisual,false);
   assert.equal(state.viewer.effects.Rayo.animated,true);
   assert.equal(state.viewer.effects.Fuego.animated,true);
   const fx=await iframe.locator('canvas#sword3d').evaluate(async (canvas,t)=>window.__genesisVfxStep(t),time);
   assert.equal(fx.time,time);
   report.samples.push({name:n,channels:state.channels,viewer:state.viewer});
   await page.screenshot({path:path.join(out,n),timeout:20000,animations:'allow'});
  }
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  report.status='PASS_ORIGINAL_ORAS_V12B_INTERACTIVE_CHANNEL_INTENSITIES_AND_ANIMATIONS';
 }finally{await browser.close()}
})().catch(e=>{report.status='FAIL';report.exception=String(e.stack||e);console.error(report.exception);process.exitCode=1})
.finally(()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));srv.close();console.log('GENESIS_V014029_VFX_CANDIDATE',JSON.stringify(report).slice(0,5500))});
