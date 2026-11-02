/* Project Genesis: recursos críticos listos antes de habilitar partida. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'genesis_asset_preflight_v001.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const prep=fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8');
assert(html.includes('genesis_asset_preflight_v001.js?v=preflight-v001'),'Preflight debe cargarse antes del juego');
assert(html.includes('inventario_genesis_16x9.js?v=preflight-v001'),'Controlador de Inventario debe llegar antes del inicio');
assert(html.includes('inventario_genesis_16x9.css?v=preflight-v001'),'CSS de Inventario debe llegar antes del inicio');
assert(!html.includes('streamRouteDecor(prof)'),'No puede haber decoración streaming durante la partida');
assert(!html.includes('Promise.race([all,guard])'),'No puede abrirse la ruta con carga pendiente');
assert(html.includes("await stage('critical',true);")&&html.includes("await stage('stream',false);"),'Ruta y decoración deben finalizar antes de jugar');
assert(prep.includes('GenesisAssetPreflight?.urlFor(art.model)'),'El visor de materiales debe usar el archivo precargado');
assert(html.includes('await ensureMercenaryReady()'),'El mercenario debe estar listo al inicio');

const begin=html.indexOf('<script type="module">\nimport { whenReady }');
assert(begin>=0,'Módulo principal no hallado');
const end=html.indexOf('</script>',begin);
assert(end>begin,'Cierre del módulo ausente');
const program=html.slice(begin+'<script type="module">'.length,end);
const check=spawnSync(process.execPath,['--check','--input-type=module'],{input:program,encoding:'utf8',maxBuffer:1024*1024});
assert.equal(check.status,0,'Sintaxis del módulo principal inválida: '+check.stderr.slice(0,1000));

async function simulation({mobile=false,missing=''}={}){
 let active=0,peak=0,blobCounter=0;
 const window={GenesisDevice:{safePreviews:mobile}};
 class FakeImage{
  set src(value){
   active++;peak=Math.max(peak,active);
   queueMicrotask(()=>{
    active--;
    this.naturalWidth=value.includes(missing)&&missing?0:256;
    if(!this.naturalWidth)this.onerror?.(new Error('404'));
    else this.onload?.();
   });
  }
 }
 class FakeURL extends URL{
   static createObjectURL(){return 'blob:preloaded-'+(++blobCounter)}
   static revokeObjectURL(){}
 }
 const fetch=async(url)=>{
   active++;peak=Math.max(peak,active);
   await Promise.resolve();active--;
   return {ok:true,blob:async()=>({size:2048})};
 };
 vm.runInNewContext(code,{
  window,document:{baseURI:'https://gburdesedev.github.io/Project-genesis/'},
  Image:FakeImage,URL:FakeURL,fetch,AbortController,Promise,Map,Set,Error,
  setTimeout,clearTimeout,queueMicrotask
 },{timeout:2000});
 return {api:window.GenesisAssetPreflight,peak};
}
(async()=>{
 const {api}=await simulation();
 const manifest=api.manifest();
 assert.equal(manifest.length,47,'47 recursos UI deduplicados (39 capas, 3 posters, 5 previews)');
 assert.equal(manifest.filter(x=>x.mandatory).length,39);
 const observed=[];
 const result=await api.prepare({onProgress:p=>observed.push(p.complete)});
 assert.equal(result.ready,47);
 assert.equal(result.total,47);
 assert.equal(result.failed,0);
 assert.equal(result.mandatoryFailures.length,0);
 assert.equal(observed.length,47);
 assert.equal(Math.max(...observed),47);
 assert.equal(new Set(manifest.map(x=>x.url)).size,47);
 assert(api.urlFor(manifest.find(x=>x.kind==='model').url).startsWith('blob:'));
 assert(api.ready,'Interfaz lista sólo cuando terminan todas las tareas');

 const {api:mobile}=await simulation({mobile:true});
 assert.equal(mobile.manifest().length,42,'La vista móvil PNG no debe descargar GLB 3D innecesarios');
 const mobileResults=await mobile.prepare();
 assert.equal(mobileResults.total,42);

 const {api:unavailable}=await simulation({missing:'FondoEstructural'});
 await assert.rejects(unavailable.prepare(),/No se completó el arte obligatorio/);
 assert.equal(unavailable.ready,false);
 console.log('PASS Genesis preflight: 39 PNG críticos, 3 posters, 5 GLB opcionales, carga limitada, sin streaming tardío.');
})().catch(error=>{console.error(error);process.exitCode=1});
