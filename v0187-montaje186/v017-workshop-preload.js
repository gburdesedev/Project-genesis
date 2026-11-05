/* V017 · load actual workshop geometry and native Radiance HDR before the scene is revealed.
 * Source geometry remains immutable; this module does NOT replace Canvas artwork
 * or mount unreviewed candidate buildings in the world.
 */
(function(root,factory){
 const api=factory();
 root.GenesisWorkshopPreloadV017=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const HDR_ROOT='../assets/playcanvas/approved/lighting/studio_small_09/';
 const HDR_NAME='studio_small_09';
 function hdrFile(mobile=false){return HDR_ROOT+HDR_NAME+'_'+(mobile?'1k':'2k')+'.hdr'}
 function sameOrigin(file){
   const url=new URL(file,document.baseURI);
   if(url.origin!==location.origin)throw Error('Recurso V017 fuera de este repositorio: '+file);
   return url;
 }
 async function fetchWithProgress(file,emit){
   const url=sameOrigin(file);
   const controller=new AbortController();
   let lastProgress=Date.now(),received=0,total=null;
   const watchdog=setInterval(()=>{if(Date.now()-lastProgress>120000)controller.abort('120 segundos sin progreso')},1000);
   let reader;
   try{
     const response=await fetch(url,{signal:controller.signal});
     if(!response.ok)throw Error('HTTP '+response.status+': '+url.pathname);
     total=Number(response.headers.get('content-length'))||null;
     const parts=[];
     if(response.body?.getReader){
       reader=response.body.getReader();
       while(true){
         const next=await reader.read();
         if(next.done)break;
         parts.push(next.value);received+=next.value.byteLength;lastProgress=Date.now();
         emit('Descargando',received,total);
       }
     }else{
       const buffer=new Uint8Array(await response.arrayBuffer());
       parts.push(buffer);received=buffer.byteLength;emit('Descargando',received,total);
     }
     if(!received)throw Error('Archivo vacío: '+url.pathname);
     const bytes=new Uint8Array(received);
     let offset=0;
     for(const part of parts){bytes.set(part,offset);offset+=part.byteLength}
     return {url,bytes,received,total};
   }finally{clearInterval(watchdog);reader?.releaseLock?.()}
 }
 async function loadGlb(app,entry,onState,diag,resources){
   const emit=(status,received=0,total=null)=>{
     onState(entry.id,{name:entry.name,status,received,total});
     diag?.asset(entry.id,status==='Listo'?'ready':status.toLowerCase(),{loaded:received,total});
   };
   emit('Descargando');
   const result=await fetchWithProgress(entry.file,emit);
   if(result.bytes.byteLength<12||
       String.fromCharCode(...result.bytes.slice(0,4))!=='glTF'||
       new DataView(result.bytes.buffer).getUint32(8,true)!==result.bytes.length)throw Error('GLB inválido: '+entry.id);
   emit('Procesando GLB',result.received,result.total);
   const pc=globalThis.pc;
   // Workshop preview bug fix already verified in V0189: the previous Asset({url:remote},...,{buffer})
   // caused PlayCanvas to issue a SECOND HTTP GET per GLB after fetchWithProgress.
   // Decode ONLY the bytes already received, through an in-memory blob URL.
   // This preserves the original GLBs and does not change WebGL materials.
   const local=URL.createObjectURL(new Blob([result.bytes],{type:'model/gltf-binary'}));
   let asset,renderers=0;
   try{
     asset=new pc.Asset(entry.name,'container',{url:local,filename:entry.id+'.glb'});
     app.assets.add(asset);
     await new Promise((resolve,reject)=>{
       asset.once('load',resolve);asset.once('error',reject);app.assets.load(asset);
     });
     if(!asset.resource)throw Error('PlayCanvas no decodificó el GLB: '+entry.id);
     const temporary=asset.resource.instantiateRenderEntity();
     try{renderers=temporary.findComponents('render').length}finally{temporary.destroy()}
     if(renderers<1)throw Error('Modelo sin geometría: '+entry.id);
     resources.set(entry.id,asset);
   }finally{
     URL.revokeObjectURL(local);
   }
   emit('Listo',result.received,result.total);
   return {id:entry.id,renderers,received:result.received,source:result.url.pathname};
 }
 async function loadHDR(app,entry,onState,diag,mobile){
   const pc=globalThis.pc;
   if(!pc?.EnvLighting?.generateLightingSource||!pc.EnvLighting.generateAtlas){
     throw Error('PlayCanvas no soporta el atlas HDR de iluminación en este motor');
   }
   const file=hdrFile(mobile),id=entry.id;
   const emit=(status,received=0,total=null)=>{
     onState(id,{name:entry.name,status,received,total});
     diag?.asset(id,status==='Listo'?'ready':status.toLowerCase(),{loaded:received,total});
   };
   emit('Descargando');
   const download=await fetchWithProgress(file,emit);
   const header=new TextDecoder('ascii').decode(download.bytes.slice(0,256));
   if(!header.startsWith('#?RADIANCE')&&!header.startsWith('#?RGBE'))throw Error('Iluminación no es un HDR Radiance válido');
   if(!header.includes('FORMAT=32-bit_rle_rgbe'))throw Error('Se exige HDR/RGBE 32 bits, no JPEG/PNG LDR');
   emit('Procesando HDRI / atlas',download.received,download.total);
   const local=URL.createObjectURL(new Blob([download.bytes],{type:'application/octet-stream'}));
   let asset,source=null;
   try{
     // Explicit .hdr filename preserves the parser when the transport is a blob URL.
     asset=new pc.Asset('Genesis Studio HDRI · 32-bit RGBE','texture',
       {url:local,filename:HDR_NAME+'_'+(mobile?'1k':'2k')+'.hdr'});
     app.assets.add(asset);
     await new Promise((resolve,reject)=>{
       asset.once('load',resolve);asset.once('error',reject);app.assets.load(asset);
     });
     if(!asset.resource)throw Error('HDRI no se pudo decodificar en PlayCanvas');
     source=pc.EnvLighting.generateLightingSource(asset.resource);
     const atlas=pc.EnvLighting.generateAtlas(source);
     if(!atlas)throw Error('El atlas IBL de HDRI quedó vacío');
     // IBL is global: the same HDR light reaches metal doors, stone walls and other PBR meshes.
     // Do not draw the photography-studio HDR as the background of the medieval village.
     app.scene.envAtlas=atlas;
     app.scene.skyboxIntensity=.9;
     emit('Listo',download.received,download.total);
     return {ok:true,id,file,bytes:download.received,format:'Radiance RGBE 32-bit',atlas:true};
   }finally{
     source?.destroy?.();
     URL.revokeObjectURL(local);
   }
 }
 async function install(app,manifest,onState,diag){
   const resources=new Map(),errors=[],results=[];
   const mobile=matchMedia('(pointer:coarse)').matches;
   for(const entry of manifest.workshopAssets||[]){
     try{
       if(mobile&&entry.mobilePolicy==='deferred'){
         onState(entry.id,{name:entry.name,status:'Reservado para PC',received:0,total:0});
         diag?.asset(entry.id,'deferred-mobile',{reason:'HQ WebGL memory safety'});
         continue;
       }
       results.push(await loadGlb(app,entry,onState,diag,resources));
     }catch(error){
       const message=String(error?.message||error);
       onState(entry.id,{name:entry.name,status:'ERROR '+message,received:0,total:null});
       diag?.asset(entry.id,'error',{message});
       errors.push({id:entry.id,error:message});
     }
   }
   const hdrEntry=manifest.lightingAsset;
   let hdr=null;
   if(hdrEntry){
     try{hdr=await loadHDR(app,hdrEntry,onState,diag,mobile)}
     catch(error){
       const message=String(error?.message||error);
       onState(hdrEntry.id,{name:hdrEntry.name,status:'ERROR '+message,received:0,total:null});
       diag?.asset(hdrEntry.id,'error',{message});
       errors.push({id:hdrEntry.id,error:message});
     }
   }
   const result={ok:errors.length===0&&!!hdr?.ok,mobile,hdr,models:results,errors};
   globalThis.__GENESIS_V017_WORKSHOP_LOADER__={...result,assets:resources};
   return result;
 }
 return Object.freeze({install,hdrFile});
});
