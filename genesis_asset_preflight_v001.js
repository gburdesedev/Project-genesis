/* Project Genesis — preload de interfaz aprobado. No altera ni modifica sprites.
 * Una única descarga/decodificación previa al juego, con 4 trabajos simultáneos.
 * Inventario: PlayCanvas 58 pc-assets, 114 pc-model; 39 capas originales UI + posters.
 * La ruta seleccionada se verifica después, antes de habilitar movimiento.
 */
(function(){
'use strict';
const images=Object.freeze([
  "assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_poster.png",
  "assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png",
  "assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png",
  "assets/ui/preparacion/01_Capas/BotonPreparar/BotonPreparar_Deshabilitado.png",
  "assets/ui/preparacion/01_Capas/BotonPreparar/BotonPreparar_Hover.png",
  "assets/ui/preparacion/01_Capas/BotonPreparar/BotonPreparar_Normal.png",
  "assets/ui/preparacion/01_Capas/BotonPreparar/BotonPreparar_Presionado.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_01.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_02.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_03.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_04.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_05.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_06.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_07.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_08.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_09.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Basicos_10.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_01.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_02.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_03.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_04.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_05.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_06.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_07.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_08.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_09.png",
  "assets/ui/preparacion/01_Capas/Casillas/Casilla_Preparados_10.png",
  "assets/ui/preparacion/01_Capas/Efectos/Pestana_Comparacion_HoverBrillo.png",
  "assets/ui/preparacion/01_Capas/Efectos/Pestana_Fabricaciones_HoverBrillo.png",
  "assets/ui/preparacion/01_Capas/Efectos/Pestana_Inventario_HoverBrillo.png",
  "assets/ui/preparacion/01_Capas/Efectos/Pestana_Preparacion_HoverBrillo.png",
  "assets/ui/preparacion/01_Capas/Fondo/FondoEstructural.png",
  "assets/ui/preparacion/01_Capas/Paneles/FondoVisorHerreria.png",
  "assets/ui/preparacion/01_Capas/Paneles/MarcoVisorSuperior.png",
  "assets/ui/preparacion/01_Capas/Paneles/PanelAccionSinBoton.png",
  "assets/ui/preparacion/01_Capas/Paneles/PanelBasicos.png",
  "assets/ui/preparacion/01_Capas/Paneles/PanelDatos.png",
  "assets/ui/preparacion/01_Capas/Paneles/PanelPreparados.png",
  "assets/ui/preparacion/01_Capas/Pestanas/Pestana_Comparacion.png",
  "assets/ui/preparacion/01_Capas/Pestanas/Pestana_Fabricaciones.png",
  "assets/ui/preparacion/01_Capas/Pestanas/Pestana_Inventario.png",
  "assets/ui/preparacion/01_Capas/Pestanas/Pestana_Preparacion.png"
]);
const models=Object.freeze([
  "assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_55k_pbr1536_v007.glb",
  "assets/playcanvas/candidates/materials/iron_ingot/v175/iron_v175_web_candidate.glb",
  "assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_final_3_piezas_web.glb",
  "https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/props/sword.glb",
  "https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/props/shield_round.glb",
  "https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/characters/male_peasant.glb",
  "https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/characters/male_ranger.glb"
]);
const modelBlobs=new Map();
let pending=null;
let report=null;
const state={total:images.length+models.length,completed:0,failed:0,bytes:0,phase:'pendiente',errors:[]};
const waitImage=url=>new Promise((resolve,reject)=>{
 const image=new Image();let settled=false;
 const timer=setTimeout(()=>{if(settled)return;settled=true;image.onload=image.onerror=null;reject(new Error('Tiempo agotado: '+url))},30000);
 const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;error?reject(error):resolve()};
 image.onload=async()=>{try{if(typeof image.decode==='function')await image.decode()}catch(e){finish(new Error('PNG inválido: '+url));return}finish()};
 image.onerror=()=>finish(new Error('No se pudo cargar imagen: '+url));
 image.src=url;
 if(image.complete && image.naturalWidth>0)image.onload();
});
async function waitModel(url){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),60000);
 try{
  const response=await fetch(url,{signal:abort.signal,cache:'force-cache',mode:'cors'});
  if(!response.ok)throw new Error('HTTP '+response.status+' · '+url);
  const blob=await response.blob();
  if(!blob.size)throw new Error('Archivo 3D vacío: '+url);
  modelBlobs.set(url,URL.createObjectURL(blob));
  state.bytes+=blob.size;
 }finally{clearTimeout(timer)}
}
function snapshot(){return{total:state.total,completed:state.completed,failed:state.failed,bytes:state.bytes,phase:state.phase,errors:[...state.errors],imageCount:images.length,previewModelCount:models.length}}
async function preloadUi(onProgress){
 if(pending){const value=await pending;onProgress?.(snapshot());return value}
 const jobs=[...images.map(url=>({kind:'imagen',url})),...models.map(url=>({kind:'visor 3D',url}))];
 state.phase='Descargando interfaz e inventarios';
 pending=(async()=>{
  let next=0;
  const worker=async()=>{
   while(next<jobs.length){
    const job=jobs[next++];let error;
    try{
     if(job.kind==='imagen')await waitImage(job.url);
     else await waitModel(job.url);
    }catch(e){error=e;state.failed++;state.errors.push(e?.message||String(e))}
    state.completed++;
    onProgress?.({...snapshot(),last:job.url,error:error?.message||null});
   }
  };
  await Promise.all(Array.from({length:Math.min(4,jobs.length)},worker));
  state.phase=state.failed?'Error de recursos':'Interfaz e inventarios preparados';
  report=snapshot();
  if(state.failed)throw new Error('Fallaron '+state.failed+' recursos previos: '+state.errors.slice(0,3).join(' | '));
  return report;
 })();
 return pending;
}
function modelUrl(original){return modelBlobs.get(original)||original}
window.GenesisPreflight=Object.freeze({preloadUi,modelUrl,snapshot,images,models});
})();
