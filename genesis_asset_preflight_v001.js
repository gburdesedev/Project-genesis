/* Project Genesis | Preflight de recursos de interfaz v001
 * No modifica ningún asset ni textura. El juego abre sólo cuando termina.
 * Los modelos de la escena se instancian mediante PlayCanvas en sus fases.
 */
(function(g){
  'use strict';
  const REQUIRED_UI=[
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
  const OPTIONAL_POSTERS=[
  "assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png",
  "assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png",
  "assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_poster.png"
];
  const OPTIONAL_PREVIEWS=[
  "assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_55k_pbr1536_v007.glb",
  "assets/playcanvas/candidates/materials/iron_ingot/v175/iron_v175_web_candidate.glb",
  "assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_final_3_piezas_web.glb",
  "https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/props/sword.glb",
  "https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/props/shield_round.glb"
];
  const MERCENARY_PREVIEWS=[
    'https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/characters/male_ranger.glb',
    'https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/characters/male_peasant.glb'
  ];
  const URLS=Object.freeze([
    ...REQUIRED_UI.map(url=>({url,kind:'image',mandatory:true,group:'interfaz'})),
    ...OPTIONAL_POSTERS.map(url=>({url,kind:'image',mandatory:false,group:'materiales'})),
    ...OPTIONAL_PREVIEWS.map(url=>({url,kind:'model',mandatory:false,group:'visores'})),
    ...MERCENARY_PREVIEWS.map(url=>({url,kind:'model',mandatory:false,group:'mercenarioVisor'}))
  ]);
  function planned(){return g.GenesisDevice?.safePreviews?URLS.filter(x=>x.kind!=='model'||x.group==='mercenarioVisor'):URLS;}
  const records=new Map();
  let inflight=null;
  let done=false;
  let report=null;
  function safeURL(value){
    const u=new URL(value,document.baseURI);
    if(u.protocol!=='https:'&&u.protocol!=='http:')throw new Error('Protocolo no autorizado: '+value);
    return u.href;
  }
  function loadImage(raw){
    return new Promise((resolve,reject)=>{
      const url=safeURL(raw),img=new Image();
      let closed=false;
      const timeout=setTimeout(()=>finish(new Error('Tiempo agotado: '+raw)),20000);
      function finish(err){
        if(closed)return;
        closed=true;clearTimeout(timeout);
        img.onload=null;img.onerror=null;
        err?reject(err):resolve({status:'ready',bytes:null});
      }
      img.onload=()=>finish();
      img.onerror=()=>finish(new Error('Imagen ausente: '+raw));
      img.decoding='async';
      img.src=url;
      if(img.complete&&img.naturalWidth>0)finish();
    });
  }
  async function loadModel(raw){
    const url=safeURL(raw),controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(url,{mode:'cors',cache:'force-cache',signal:controller.signal});
      if(!response.ok)throw new Error('HTTP '+response.status+' al precargar '+raw);
      const data=await response.blob();
      if(!data.size)throw new Error('Modelo vacío: '+raw);
      const blobURL=URL.createObjectURL(data);
      return {status:'ready',bytes:data.size,blobURL};
    }finally{clearTimeout(timer)}
  }
  async function attempt(entry){
    if(records.has(entry.url))return records.get(entry.url);
    let error=null;
    for(let n=0;n<2;n++){
      try{
        const result=entry.kind==='model'?await loadModel(entry.url):await loadImage(entry.url);
        const value={...result,url:entry.url,group:entry.group,mandatory:entry.mandatory};
        records.set(entry.url,value);return value;
      }catch(err){error=err;if(n===0)await new Promise(done=>setTimeout(done,180))}
    }
    const value={status:'failed',url:entry.url,mandatory:entry.mandatory,group:entry.group,error:String(error?.message||error)};
    records.set(entry.url,value);return value;
  }
  function prepare(options={}){
    if(inflight)return inflight;
    inflight=(async()=>{
      const byURL=new Map(planned().map(a=>[a.url,a]));
      const entries=[...byURL.values()];
      const totals={total:entries.length,ready:0,failed:0,mandatoryFailures:[],bytes:0};
      let next=0;
      async function worker(){
        while(next<entries.length){
          const entry=entries[next++];
          const result=await attempt(entry);
          if(result.status==='ready'){totals.ready++;totals.bytes+=result.bytes||0}
          else{totals.failed++;if(entry.mandatory)totals.mandatoryFailures.push(result.error)}
          options.onProgress?.({...totals,complete:totals.ready+totals.failed,current:entry.url,group:entry.group});
        }
      }
      await Promise.all(Array.from({length:Math.min(4,entries.length)},()=>worker()));
      done=totals.mandatoryFailures.length===0;
      report={...totals,done,entries:entries.map(e=>records.get(e.url))};
      if(!done)throw new Error('No se completó el arte obligatorio: '+totals.mandatoryFailures.slice(0,3).join(' | '));
      return report;
    })();
    return inflight;
  }
  g.GenesisAssetPreflight=Object.freeze({
    prepare,
    manifest:()=>planned().map(x=>({...x})),
    get status(){return report},
    get ready(){return done},
    urlFor(url){const item=records.get(url);return item?.status==='ready'?(item.blobURL||url):null},
    available(url){return records.get(url)?.status==='ready'},
    release(){for(const record of records.values())if(record.blobURL)URL.revokeObjectURL(record.blobURL);records.clear();done=false}
  });
})(window);
