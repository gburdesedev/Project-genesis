/* Project Genesis V0.14.022 transport contract: no visual/scene changes.
 * Runs in Node with synthetic network and PlayCanvas asset registry.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');
const requests=[];
const goodGlb=new Uint8Array(12);
goodGlb.set(Buffer.from('glTF'));
new DataView(goodGlb.buffer).setUint32(4,2,true);
new DataView(goodGlb.buffer).setUint32(8,12,true);
const gltf={
 asset:{version:'2.0'},
 buffers:[{uri:'parts.bin',byteLength:4}],
 images:[{uri:'texture.png'}]
};
const data=new Map([
 ['https://test.local/a.glb',goodGlb],
 ['https://test.local/test.gltf',new TextEncoder().encode(JSON.stringify(gltf))],
 ['https://test.local/parts.bin',new Uint8Array([1,2,3,4])],
 ['https://test.local/texture.png',new Uint8Array([137,80,78,71,1])],
]);
let failOnce=true;
const fetch=async url=>{
 requests.push(url);
 if(url==='https://test.local/a.glb'&&failOnce){failOnce=false;throw new Error('test: lost connection')}
 const bytes=data.get(url);
 if(!bytes)return{ok:false,status:404};
 return{ok:true,headers:{get(key){return key==='content-length'?String(bytes.byteLength):null}},
  body:{getReader(){let done=false;return{async read(){if(done)return{done:true};done=true;return{done:false,value:bytes}}}}}}
 };
};
const assets=new Map();
function assetFor(id,url){
 const listeners=new Map();
 const asset={file:{url},resource:null,loaded:false,
  on(event,callback){listeners.set(event,callback)},
  off(event){listeners.delete(event)},
  unload(){this.resource=null;this.loaded=false},
  emit(event,value){listeners.get(event)?.(value)}
 };
 assets.set(id,{localName:'pc-asset',async ready(){},getAttribute(k){return k==='src'?url:null},asset});
 return asset;
}
const app={assets:{
 load(asset){
  assert(asset.file.contents instanceof ArrayBuffer,'native loader must receive bytes, not re-fetch');
  setImmediate(()=>{asset.resource={decoded:true};asset.loaded=true;asset.emit('load',asset)})
 },
 loadFromUrlAndFilename(url,name,type,cb){
  assert(url.startsWith('blob:'),'dynamic container must receive staged bytes');
  assert.equal(type,'container');
  setImmediate(()=>cb(null,{resource:{decoded:true},name}));
 }
}};
const win={setInterval(){return 0},GenesisAssetDiag:{touch(){},expected(){return null}}};
const doc={querySelectorAll(){return []},getElementById(id){return assets.get(id)||null}};
const sandbox={window:win,document:doc,location:{href:'https://test.local/'},
 fetch,Image:class{async decode(){}},URL,Blob,TextDecoder,TextEncoder,AbortController,
 setInterval,clearInterval,setTimeout,clearTimeout,performance,console};
vm.runInNewContext(fs.readFileSync('genesis_v014022_stream_loader.js','utf8'),sandbox);
const loader=win.GenesisStreamLoader;
loader.setApp(app);
loader.setRetryHandler(async()=>{});
const a=assetFor('a','https://test.local/a.glb');
const g=assetFor('g','https://test.local/test.gltf');
(async()=>{
 await loader.prepare('a');
 assert(a.resource?.decoded);
 assert.equal(requests.filter(x=>x.endsWith('/a.glb')).length,2,'failed download must retry once');
 await loader.prepare('a');
 assert.equal(requests.filter(x=>x.endsWith('/a.glb')).length,2,'prepared asset must not redownload');
 await loader.prepare('g');
 assert(g.resource?.decoded);
 assert.equal(requests.filter(x=>x.endsWith('/test.gltf')).length,1);
 assert.equal(requests.filter(x=>x.endsWith('/parts.bin')).length,1);
 assert.equal(requests.filter(x=>x.endsWith('/texture.png')).length,1);
 assert.equal(g.file.contents,null,'decoded container should release transient bytes');
 const c=await loader.loadContainer('https://test.local/a.glb');
 assert(c.resource?.decoded);
 assert.equal(requests.filter(x=>x.endsWith('/a.glb')).length,3,'dynamic container uses controlled fetch');
 await loader.loadContainer('https://test.local/a.glb');
 assert.equal(requests.filter(x=>x.endsWith('/a.glb')).length,3,'dynamic container should reuse resource');
 const src=fs.readFileSync('village_trees.js','utf8')+fs.readFileSync('village_arcanist.js','utf8');
 assert(!src.includes('app.assets.loadFromUrl('),'tree and door cannot bypass transport');
 const world=fs.readFileSync('village_world.js','utf8');
 assert(world.includes('GenesisStreamLoader.loadImage('),'world textures must use controlled queue');
 console.log('PASS: retry, byte handoff, glTF dependencies, tree/door/world routing, reuse');
})().catch(e=>{console.error(e);process.exitCode=1});
