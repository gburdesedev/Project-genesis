'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'previews/v016001-integrated-result-3d');fs.mkdirSync(out,{recursive:true});
const shell='<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#09090d;height:100vh}body{display:grid;place-items:center}#modal{width:1600px}</style><link rel="stylesheet" href="/genesis_result_dynamic_v001.css"></head><body><div id="modal" class="modal"></div><script src="/genesis_result_dynamic_v001.js"></script></body></html>';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
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
  for(const [n,item] of [['01-primera-espada-3d.png',base],['02-segunda-espada-3d.png',{...base,id:'sword-2',rarity:'Bueno',channels:[['Daño',78],['Fuego',82],['Rayo',55.5]],channelTechniques:{Fuego:[{nombre:'Quemadura',valor:32}]},description:'Resultado de fabricación con valores de ejemplo para los canales NGE.'}]]){
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
   await page.waitForFunction(()=>{const f=document.querySelector('iframe.grSwordInteractive');try{return f?.contentWindow?.__genesisSwordViewerStatus?.phase==='ready'}catch(e){return false}},null,{timeout:180000});
   let state=await page.evaluate(()=>({channels:[...document.querySelectorAll('.grChannelGroup')].map(x=>x.dataset.resultChannel),secondary:document.querySelectorAll('.grSub').length,viewer:document.querySelector('iframe.grSwordInteractive')?.contentWindow?.__genesisSwordViewerStatus}));
   assert.equal(state.viewer.phase,'ready');assert.equal(state.secondary,0);assert.equal(state.channels.length,item.channels.length);
   report.samples.push({name:n,channels:state.channels,viewer:state.viewer});
   await page.screenshot({path:path.join(out,n),timeout:20000,animations:'allow'});
  }
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  report.status='PASS_ORIGINAL_ORAS_WITH_INTERACTIVE_V12B_GLB_INSIDE_CRAFT_RESULT';
 }finally{await browser.close()}
})().catch(e=>{report.status='FAIL';report.exception=String(e.stack||e);console.error(report.exception);process.exitCode=1})
.finally(()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));srv.close();console.log('GENESIS_V016001_INTEGRATED_3D',JSON.stringify(report).slice(0,5500))});
