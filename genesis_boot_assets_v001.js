/* Project Genesis — startup UI asset manifest v001
 * Generated from Preparación's 39 original SKIN_LAYERS plus referenced CSS
 * assets. This is a loader only: never modifies approved art or game rules.
 */
(function(){
 'use strict';
 const REQUIRED=[
  "assets/ui/preparacion/01_Capas/Fondo/FondoEstructural.png",
  "assets/ui/preparacion/01_Capas/Pestanas/Pestana_Inventario.png",
  "assets/ui/preparacion/01_Capas/Pestanas/Pestana_Preparacion.png",
  "assets/ui/preparacion/01_Capas/Pestanas/Pestana_Fabricaciones.png",
  "assets/ui/preparacion/01_Capas/Pestanas/Pestana_Comparacion.png",
  "assets/ui/preparacion/01_Capas/Paneles/PanelBasicos.png",
  "assets/ui/preparacion/01_Capas/Paneles/PanelPreparados.png",
  "assets/ui/preparacion/01_Capas/Paneles/FondoVisorHerreria.png",
  "assets/ui/preparacion/01_Capas/Paneles/PanelDatos.png",
  "assets/ui/preparacion/01_Capas/Paneles/PanelAccionSinBoton.png",
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
  "assets/ui/preparacion/01_Capas/Paneles/MarcoVisorSuperior.png",
  "assets/ui/preparacion/01_Capas/BotonPreparar/BotonPreparar_Normal.png",
  "assets/ui/preparacion/01_Capas/BotonPreparar/BotonPreparar_Hover.png",
  "assets/ui/preparacion/01_Capas/BotonPreparar/BotonPreparar_Presionado.png",
  "assets/ui/preparacion/01_Capas/BotonPreparar/BotonPreparar_Deshabilitado.png",
  "assets/ui/preparacion/01_Capas/Efectos/Pestana_Inventario_HoverBrillo.png",
  "assets/ui/preparacion/01_Capas/Efectos/Pestana_Preparacion_HoverBrillo.png",
  "assets/ui/preparacion/01_Capas/Efectos/Pestana_Fabricaciones_HoverBrillo.png",
  "assets/ui/preparacion/01_Capas/Efectos/Pestana_Comparacion_HoverBrillo.png"
];
 const OPTIONAL=[
  "assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png",
  "assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png",
  "assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_poster.png"
];
 let pending=null;
 const report={ready:false,total:0,loaded:0,failed:[],optionalFailed:[]};
 function imageReady(url,timeoutMs=25000){
  return new Promise((resolve,reject)=>{
   const img=new Image();let finished=false;
   const timer=setTimeout(()=>end(false,new Error('Tiempo agotado: '+url)),timeoutMs);
   function end(ok,error){if(finished)return;finished=true;clearTimeout(timer);img.onload=img.onerror=null;ok?resolve(url):reject(error||new Error('Imagen inválida: '+url));}
   img.onload=()=>end(img.naturalWidth>0,new Error('Imagen vacía: '+url));
   img.onerror=()=>end(false,new Error('No se pudo descargar: '+url));
   img.decoding='async';img.src=url;
   if(img.complete&&img.naturalWidth>0)end(true);
  });
 }
 function importStyle(url){
  return new Promise((resolve,reject)=>{
   if([...document.styleSheets].some(s=>s.href&&s.href.includes('inventario_genesis_16x9.css'))){resolve();return;}
   const el=document.createElement('link');el.rel='stylesheet';el.href=url;
   el.onload=resolve;el.onerror=()=>reject(new Error('No se pudo cargar CSS Inventario: '+url));
   document.head.appendChild(el);
  });
 }
 function importJS(url){
  return new Promise((resolve,reject)=>{
   if(window.GenesisInventory16?.render){resolve();return;}
   const s=document.createElement('script');s.src=url;
   s.onload=()=>window.GenesisInventory16?.render?resolve():reject(new Error('El inventario no registró su controlador'));
   s.onerror=()=>reject(new Error('No se pudo cargar JS Inventario: '+url));
   document.head.appendChild(s);
  });
 }
 async function retry(task,attempts=2){
  let error;for(let n=0;n<attempts;n++){try{return await task();}catch(e){error=e;if(n+1<attempts)await new Promise(r=>setTimeout(r,350*(n+1)));}}
  throw error;
 }
 async function prepare(onProgress){
  if(pending)return pending;
  pending=(async()=>{
   const tasks=[
    {name:'Interfaz · CSS',required:true,do:()=>importStyle('inventario_genesis_16x9.css?v=boot-001')},
    {name:'Interfaz · controlador',required:true,do:()=>importJS('inventario_genesis_16x9.js?v=boot-001')},
    ...REQUIRED.map(url=>({name:url,required:true,do:()=>imageReady(url)})),
    ...OPTIONAL.filter(url=>!REQUIRED.includes(url)).map(url=>({name:url,required:false,do:()=>imageReady(url)}))
   ];
   report.total=tasks.length;report.loaded=0;report.failed=[];report.optionalFailed=[];report.ready=false;
   let next=0;
   async function worker(){
    while(next<tasks.length){
     const t=tasks[next++];
     try{await retry(t.do);report.loaded++;}
     catch(e){(t.required?report.failed:report.optionalFailed).push({asset:t.name,error:String(e?.message||e)});}
     onProgress?.(report.loaded+report.failed.length+report.optionalFailed.length,report.total,t.name,report);
    }
   }
   await Promise.all(Array.from({length:4},()=>worker()));
   if(report.failed.length)throw new Error('Faltan '+report.failed.length+' recursos UI obligatorios: '+report.failed.slice(0,3).map(x=>x.asset).join(', '));
   report.ready=true;
   return report;
  })();
  try{return await pending;}catch(e){pending=null;throw e;}
 }
 window.GenesisBootAssets={prepare,report,get required(){return REQUIRED.slice();},get optional(){return OPTIONAL.slice();}};
})();
