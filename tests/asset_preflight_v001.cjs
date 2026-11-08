'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'genesis_asset_preflight_v001.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,'preparacion_control.js'),'utf8');
// Asegurar que el módulo principal conserva sintaxis JavaScript válida.
const gameModule=[...html.matchAll(/<script\b[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).find(code=>code.includes('async function activateRouteGroups'));
assert(gameModule,'main game module should be present');
const parse=spawnSync(process.execPath,['--input-type=module','--check'],{input:gameModule,encoding:'utf8'});
assert.equal(parse.status,0,parse.stderr||'Invalid main module');
assert(html.includes('./genesis_asset_preflight_v001.js'),'preflight loaded before the game');
assert(html.includes('./inventario_genesis_16x9.css'),'Inventory CSS preloaded');
assert(html.includes('./inventario_genesis_16x9.js'),'Inventory JS preloaded');
assert(html.includes('await uiAssetsPromise'),'UI must finish before intro');
assert(html.includes("routeModels('SharedMercenary','ondemand')"),'mercenary assets included before play');
assert(!html.includes('streamRouteDecor(prof)'), 'no background decor after game started');
assert(html.includes('if(!report.failed)break;'),'route failures keep the real Herrero entry locked');
assert(html.includes('await loaderRetryDelay('),'resource failure must pause and retry without full-page reboot');
assert(html.lastIndexOf('routeReady.add(prof)')>html.indexOf('if(!report.failed)break;'),'Herrero is admitted only after all actual download groups complete');
assert(!html.includes('Promise.race([all,guard])'),'removed the 6.5 s early route gate');
assert(js.includes('GenesisPreflight?.modelUrl(art.model)'),'menu small models use preloaded URLs');
let active=0,peak=0,fetchCount=0,imagesRequested=0;
class FakeImage{
  set src(url){
    imagesRequested++;active++;peak=Math.max(peak,active);
    queueMicrotask(()=>{this.complete=true;this.naturalWidth=64;active--;this.onload?.()});
  }
  decode(){return Promise.resolve()}
}
const ctx={window:{},Image:FakeImage,setTimeout,clearTimeout,console,
 fetch:async()=>{fetchCount++;active++;peak=Math.max(peak,active);await Promise.resolve();active--;return{ok:true,blob:async()=>({size:256})}},
 AbortController,URL:{createObjectURL:()=> 'blob:genesis-preview'},Promise,Map,Object,Error};
vm.runInNewContext(source,ctx,{filename:'genesis_asset_preflight_v001.js'});
const loader=ctx.window.GenesisPreflight;
assert(loader,'window.GenesisPreflight must be exposed');
assert.equal(loader.images.length,42);
assert.equal(loader.models.length,7);
for(const filename of loader.images){
 assert(fs.existsSync(path.join(root,filename)), 'missing approved image: '+filename);
}
const statuses=[];
Promise.all([loader.preloadUi(s=>statuses.push(s)),loader.preloadUi()]).then(([a,b])=>{
 assert.equal(a.total,49);assert.equal(b.total,49);
 assert.equal(a.failed,0);
 assert.equal(a.completed,49);
 assert.equal(fetchCount,7,'binary models only fetched once');
 assert.equal(imagesRequested,42,'UI image fetched once');
 assert(peak<=4,'at most four resources should load concurrently');
 assert(statuses.length>0);
 assert.equal(loader.modelUrl(loader.models[0]),'blob:genesis-preview');
 console.log('PASS preload: 42 images + 7 3D previews, deduplicated, concurrency max '+peak);
}).catch(error=>{console.error(error);process.exitCode=1});
