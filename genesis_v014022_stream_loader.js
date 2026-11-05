/* Project Genesis V0.14.022 — controlled streaming transport for legacy PlayCanvas scene.
 * Does not change scene geometry, quests, camera, NPC coordinates, or approved materials.
 * Every GLB is fetched, validated and passed to pc.Asset as bytes; glTF keeps its
 * source URL for relative resources, but its request is queued and checked first.
 */
(()=>{
'use strict';
const running=new Map(),ready=new Map(),queue=[];
const audit=new Map();
let active=0, maximum=3;
let app=null, retryHandler=null, route='';
const idleLimit=120000;
const absolute=url=>new URL(url,location.href).href;
const stamp=()=>performance.now();
const notify=(url,state,received,total,error='')=>{
 const id=absolute(url),r=audit.get(id)||{url:id,received:0,total:null,state:'pendiente',attempts:0,updated:stamp(),error:''};
 if(Number.isFinite(total)&&total>0)r.total=total;
 if(Number.isFinite(received)&&received>r.received)r.received=received;
 if(state)r.state=state;
 if(error)r.error=String(error);
 r.updated=stamp();audit.set(id,r);
 window.GenesisAssetDiag?.touch?.(id,state,received,total,error);
 render();
};
const human=n=>n==null?'—':n<1048576?(n/1024).toFixed(0)+' KB':(n/1048576).toFixed(2)+' MB';
function requiredIds(){
 const ids=new Set();
 document.querySelectorAll('pc-model[data-genesis-boot-asset],pc-anim-clip[data-genesis-boot-asset]').forEach(el=>{
  if(!el.closest('pc-model[data-route]'))ids.add(el.dataset.genesisBootAsset.replace(/^#/,''));
 });
 if(route){
  document.querySelectorAll('pc-model[data-route="'+route+'"][data-priority="critical"]').forEach(el=>{
   if(el.dataset.asset)ids.add(el.dataset.asset.replace(/^#/,''));
  });
 }
 return ids;
}
function render(){
 const values=[...audit.values()],plan=requiredIds();
 if(!plan.size)return;
 const complete=[...plan].filter(id=>ready.has(id)).length;
 let partial=0;
 for(const id of plan){
  if(ready.has(id))continue;
  const el=document.getElementById(id),src=el?.getAttribute('src');
  if(!src||/^data:/i.test(src))continue;
  const rec=audit.get(absolute(src));
  if(rec&&rec.total)partial+=Math.min(.95,rec.received/rec.total);
 }
 const pending=values.filter(x=>x.state==='descargando').length;
 const x=document.getElementById('loadCount');
 if(x)x.textContent=complete+' de '+plan.size+' recursos necesarios preparados · '+pending+' descargando';
 const pctValue=Math.max(0,Math.min(99,Math.floor(100*(complete+partial)/plan.size)));
 const progress=document.getElementById('loadBarFill'),pct=document.getElementById('loadPercent');
 if(progress)progress.style.width=pctValue+'%';
 if(pct)pct.textContent=pctValue+'%';
 const total=values.reduce((sum,r)=>sum+(r.total||0),0);
 const bytes=values.reduce((sum,r)=>sum+Math.min(r.received,r.total||r.received),0);
 const meta=document.getElementById('genesisTransportMeta');
 if(meta)meta.textContent='TRANSFERENCIA REAL · '+human(bytes)+' / '+(total?human(total):'tamaño por determinar')+' · simultáneos '+active+'/'+maximum;
}
async function acquire(){
 if(active<maximum){active++;return}
 await new Promise(resolve=>queue.push(resolve));
 active++;
}
function release(){
 active=Math.max(0,active-1);
 queue.shift()?.();
}
async function download(url,{validate=true}={}){
 const id=absolute(url),controller=new AbortController();
 let last=stamp(),loaded=0,total=null,watchdog=null;
 await acquire();
 try{
  notify(id,'descargando',0,0);
  watchdog=setInterval(()=>{
   if(stamp()-last>=idleLimit)controller.abort(new Error('Sin avance durante 120 segundos'));
  },1000);
  const response=await fetch(id,{cache:'force-cache',signal:controller.signal});
  if(!response.ok)throw new Error('HTTP '+response.status);
  total=Number(response.headers.get('content-length'))||window.GenesisAssetDiag?.expected?.(id)||null;
  const chunks=[];
  if(response.body?.getReader){
   const reader=response.body.getReader();
   while(true){
    const {done,value}=await reader.read();
    if(done)break;
    if(value?.byteLength){chunks.push(value);loaded+=value.byteLength;last=stamp();notify(id,'descargando',loaded,total)}
   }
  }else{
   const buffer=await response.arrayBuffer(),value=new Uint8Array(buffer);
   chunks.push(value);loaded=value.byteLength;last=stamp();
  }
  if(!loaded)throw new Error('Recurso vacío');
  const buffer=new Uint8Array(loaded);
  let at=0;for(const chunk of chunks){buffer.set(chunk,at);at+=chunk.byteLength}
  if(validate&&/\.glb(?:\?|$)/i.test(id)){
   if(loaded<12||String.fromCharCode(...buffer.slice(0,4))!=='glTF'||new DataView(buffer.buffer).getUint32(8,true)!==loaded)
    throw new Error('GLB incompleto o cabecera inválida');
  }
  if(validate&&/\.gltf(?:\?|$)/i.test(id)){
   let json;
   try{json=JSON.parse(new TextDecoder().decode(buffer))}catch(e){throw new Error('glTF JSON inválido: '+e.message)}
   if(json.asset?.version!=='2.0')throw new Error('glTF 2.0 no válido');
  }
  notify(id,'descargado · verificando',loaded,total||loaded);
  return buffer.buffer;
 }catch(error){
  notify(id,'error de descarga',loaded,total,error?.message||String(error));
  throw error;
 }finally{
  if(watchdog)clearInterval(watchdog);
  release();
 }
}
function pause(label,attempt,error){
 if(retryHandler)return retryHandler(label,attempt,error);
 return new Promise(resolve=>setTimeout(resolve,Math.min(20000,2500*attempt)));
}
function awaitEngine(asset,timeout=120000){
 return new Promise((resolve,reject)=>{
  if(asset.resource){resolve(asset);return}
  let finished=false;
  const finish=(error)=>{
   if(finished)return;finished=true;clearTimeout(timer);
   asset.off('load',onLoad);asset.off('error',onError);
   error?reject(error instanceof Error?error:new Error(String(error))):resolve(asset);
  };
  const onLoad=()=>finish(asset.resource?null:new Error('Asset cargado sin recurso decodificado'));
  const onError=e=>finish(new Error(e?.message||String(e||'Falló la decodificación')));
  const timer=setTimeout(()=>finish(new Error('La decodificación no terminó')),timeout);
  asset.on('load',onLoad);asset.on('error',onError);
  try{app.assets.load(asset)}catch(error){finish(error)}
 });
}

/* V014022 transport v2: byte-owner for declared containers, trees, doors and PBR images.
 * No PlayCanvas HTTP request to the original GLB/glTF after the verified transfer.
 * glTF external .bin and image dependencies are streamed through this same queue.
 */
const urlAssets=new Map(),urlRunning=new Map();
const nameOf=url=>decodeURIComponent(new URL(url,location.href).pathname.split('/').pop()||'asset.glb');
const mimeOf=url=>/\.png(?:\?|$)/i.test(url)?'image/png':/\.webp(?:\?|$)/i.test(url)?'image/webp':/\.jpe?g(?:\?|$)/i.test(url)?'image/jpeg':'application/octet-stream';
async function staged(url){
 const original=absolute(url);
 const raw=await download(original);
 const links=[];
 if(!/\.gltf(?:\?|$)/i.test(original))return {contents:raw,links};
 const json=JSON.parse(new TextDecoder().decode(raw));
 const deps=[...(json.buffers||[]),...(json.images||[])].filter(x=>x.uri&&!/^(?:data:|blob:)/i.test(x.uri));
 try{
  await Promise.all(deps.map(async dep=>{
   const child=absolute(new URL(dep.uri,original).href);
   const bytes=await download(child,{validate:false});
   const objectUrl=URL.createObjectURL(new Blob([bytes],{type:mimeOf(child)}));
   links.push(objectUrl);
   dep.uri=objectUrl;
  }));
  return {contents:new TextEncoder().encode(JSON.stringify(json)).buffer,links};
 }catch(error){for(const link of links)URL.revokeObjectURL(link);throw error}
}
function releaseStaged(links){for(const link of links)URL.revokeObjectURL(link)}
async function loadDeclaredAsset(asset,url){
 const originalFile=asset.file||{};
 const {contents,links}=await staged(url);
 try{
  // Asset.file.contents is a supported PlayCanvas container fast path:
  // prevents its ResourceLoader from downloading this file a second time.
  asset.file={url:originalFile.url||url,filename:originalFile.filename||nameOf(url),
    hash:originalFile.hash,size:originalFile.size,opt:originalFile.opt,contents};
  await awaitEngine(asset);
  if(!asset.resource)throw new Error('PlayCanvas no decodificó '+nameOf(url));
  notify(url,'recurso preparado',null,null);
  return asset;
 }finally{
  // Drop the temporary binary once PlayCanvas owns the decoded resource.
  if(asset.file)asset.file.contents=null;
  releaseStaged(links);
 }
}
async function loadContainer(url,{maxAttempts=2}={}){
 if(!app)throw new Error('PlayCanvas no está listo');
 const id=absolute(url);
 if(urlAssets.get(id)?.resource)return urlAssets.get(id);
 if(urlRunning.has(id))return urlRunning.get(id);
 const job=(async()=>{
  let attempt=0;
  while(true){
   const {contents,links}=await staged(id).catch(async error=>{
    attempt++;
    notify(id,'carga en pausa',null,null,error?.message||String(error));
    if(attempt>=maxAttempts)throw error;
    await pause(nameOf(id),attempt,error?.message||String(error));
    return null;
   });
   if(!contents)continue;
   // A blob here is deliberately only an in-memory handoff. The actual
   // network download and glTF dependencies already passed our queue.
   const root=URL.createObjectURL(new Blob([contents],{
    type:/\.gltf(?:\?|$)/i.test(id)?'model/gltf+json':'model/gltf-binary'}));
   try{
    const asset=await new Promise((resolve,reject)=>{
     app.assets.loadFromUrlAndFilename(root,nameOf(id),'container',(error,loaded)=>{
      error?reject(error instanceof Error?error:new Error(String(error))):resolve(loaded);
     });
    });
    if(!asset?.resource)throw new Error('Contenedor sin recurso: '+nameOf(id));
    urlAssets.set(id,asset);
    notify(id,'recurso preparado',null,null);
    return asset;
   }catch(error){
    attempt++;
    notify(id,'carga en pausa',null,null,error?.message||String(error));
    if(attempt>=maxAttempts)throw error;
    await pause(nameOf(id),attempt,error?.message||String(error));
   }finally{
    URL.revokeObjectURL(root);
    releaseStaged(links);
   }
  }
 })().finally(()=>urlRunning.delete(id));
 urlRunning.set(id,job);
 return job;
}
async function loadImage(url,{maxAttempts=Infinity}={}){
 const id=absolute(url);
 let attempt=0;
 while(true){
  let objectUrl=null;
  try{
   const bytes=await download(id,{validate:false});
   objectUrl=URL.createObjectURL(new Blob([bytes],{type:mimeOf(id)}));
   const img=new Image();
   img.decoding='async';
   img.src=objectUrl;
   await img.decode();
   notify(id,'imagen decodificada',null,null);
   return img;
  }catch(error){
   attempt++;
   notify(id,'carga en pausa',null,null,error?.message||String(error));
   if(attempt>=maxAttempts)throw error;
   await pause(nameOf(id),attempt,error?.message||String(error));
  }finally{if(objectUrl)URL.revokeObjectURL(objectUrl)}
 }
}

async function innerPrepare(id,maxAttempts=Infinity){
 const el=document.getElementById(id);
 if(!el||el.localName!=='pc-asset')throw new Error('pc-asset no encontrado: '+id);
 await el.ready();
 if(!app)throw new Error('PlayCanvas no está listo');
 const asset=el.asset;
 if(!asset)throw new Error('pc-asset sin registro: '+id);
 const src=el.getAttribute('src')||asset.file?.url;
 if(!src)throw new Error('Asset sin URL: '+id);
 if(asset.resource){if(!/^data:/i.test(src))notify(src,'recurso preparado',null,null);return asset}
 const url=absolute(src);
 let attempt=0;
 while(true){
  try{
   if(asset.resource){if(!/^data:/i.test(src))notify(src,'recurso preparado',null,null);return asset}
   if(asset.loaded&&!asset.resource)asset.unload?.();
   if(/^data:/i.test(src)){
    await awaitEngine(asset);
   }else if(/\.(?:glb|gltf)(?:\?|$)/i.test(url)){
    await loadDeclaredAsset(asset,url);
   }else{
    // Keep only non-container legacy formats on the native handler.
    await download(url,{validate:false});
    await awaitEngine(asset);
   }
   if(!asset.resource)throw new Error('Asset sin recurso decodificado');
   if(!/^data:/i.test(src))notify(url,'recurso preparado',null,null);
   return asset;
  }catch(error){
   attempt++;
   const reason=error?.message||String(error);
   try{asset.unload?.()}catch(_){}
   if(!/^data:/i.test(src)){audit.get(url)&&(audit.get(url).attempts=attempt);notify(url,'carga en pausa',null,null,reason);}
   if(attempt>=maxAttempts)throw new Error('Tras '+attempt+' intentos: '+reason);
   await pause(id+' · '+(url.startsWith('data:')?'modelo interno':url.split('/').pop()),attempt,reason);
  }
 }
}
function prepare(id,{maxAttempts=Infinity}={}){
 const clean=String(id||'').replace(/^#/,'');
 if(ready.has(clean))return Promise.resolve(ready.get(clean));
 if(running.has(clean))return running.get(clean);
 const p=innerPrepare(clean,maxAttempts).then(asset=>{ready.set(clean,asset);return asset}).finally(()=>running.delete(clean));
 running.set(clean,p);return p;
}
function setApp(value){app=value;render()}
function trackRoute(prof){route=prof;render()}
function setRetryHandler(value){retryHandler=value}
function snapshot(){return{mode:'GENESIS STREAM V014022',active,queued:queue.length,assets:[...audit.values()]}}
window.GenesisStreamLoader=Object.freeze({prepare,loadContainer,loadImage,setApp,setRetryHandler,trackRoute,snapshot,render});
window.setInterval(render,600);
})();