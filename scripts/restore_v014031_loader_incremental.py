#!/usr/bin/env python3
"""Incremental Project Genesis main loader repair based on working v014.031.
Only touches inline PlayCanvas route boot logic in index.html.
Retains ALL current approved art, menus, gameplay, NPCs and assets.
"""
from pathlib import Path
import sys
p=Path('index.html')
s=p.read_text(encoding='utf-8')
def replace_once(old,new,label):
    global s
    c=s.count(old)
    if c!=1: raise RuntimeError(f'{label}: expected exactly one source, found {c}')
    s=s.replace(old,new,1)
def replace_section(begin,end,replacement,label):
    global s
    if s.count(begin)!=1 or s.count(end)!=1: raise RuntimeError(f'{label}: boundaries must be unique')
    i=s.index(begin);j=s.index(end,i)
    s=s[:i]+replacement+s[j:]
loader = """function loadDeferredModelAsset(el,asset,timeout=ROUTE_ASSET_TIMEOUT_MS,onProgress=()=>{}){
 return new Promise((resolve,reject)=>{
  let done=false,seenBytes=0,lastPhase='',lastAdvance=performance.now();
  const started=performance.now(),label=el.getAttribute('name')||el.id||asset;
  function publish(){
   if(done)return;
   const info=describeRouteAsset(asset),seconds=Math.round((performance.now()-started)/1000);
   const phase=el.contentEntity?'listo':info.resourceReady?'instanciando':info.downloadComplete?'procesando modelo':'descargando';
   if(phase!==lastPhase||(info.bytes||0)>seenBytes){
    lastPhase=phase;seenBytes=Math.max(seenBytes,info.bytes||0);lastAdvance=performance.now();
   }
   routeAssetProgress[asset]={asset,label,seconds,phase,bytes:info.bytes,downloadComplete:info.downloadComplete,instanceReady:!!el.contentEntity};
   onProgress(routeAssetProgress[asset]);
   if(el.contentEntity)finish(true);
  }
  function finish(ok,message){
   if(done)return;
   done=true;clearInterval(poller);clearInterval(watchdog);
   el.removeEventListener('load',onLoad);el.removeEventListener('error',onError);
   const info=describeRouteAsset(asset);
   routeAssetProgress[asset]={asset,label,seconds:Math.round((performance.now()-started)/1000),
    phase:ok?'listo':'error',bytes:info.bytes,downloadComplete:info.downloadComplete,instanceReady:!!el.contentEntity};
   if(!ok&&!el.contentEntity){try{el.removeAttribute('asset')}catch(_){}}
   ok?resolve(el):reject(new Error(message||('No pudo cargarse '+label+' ['+asset+']')));
  }
  function onLoad(){if(el.contentEntity)finish(true);else publish()}
  function onError(e){finish(false,(e?.message||'Falló la carga')+' · '+label+' ['+asset+']')}
  const poller=setInterval(publish,500);
  // v014.031: timeout por inactividad REAL, no tiempo fijo desde el comienzo.
  const watchdog=setInterval(()=>{
   if(done)return;
   if(el.contentEntity){finish(true);return}
   if(performance.now()-lastAdvance<timeout)return;
   const info=describeRouteAsset(asset);
   finish(false,'Sin avance durante '+Math.round(timeout/1000)+' s: '+label+' ['+asset+'] · '+
    (info.resourceReady?'instancia pendiente':info.downloadComplete?'procesamiento pendiente':'descarga pendiente')+
    (info.bytes!=null?' · '+(info.bytes/1048576).toFixed(1)+' MiB recibidos':''));
  },1000);
  el.addEventListener('load',onLoad);el.addEventListener('error',onError);
  if(el.getAttribute('asset')!==asset)el.setAttribute('asset',asset);
  else if(!el.contentEntity){el.removeAttribute('asset');requestAnimationFrame(()=>{if(!done)el.setAttribute('asset',asset)})}
  publish();
 });
}
"""
replace_section('function loadDeferredModelAsset(','async function activateDeferredModel(',loader,'loader watchdog')
routeGroups = """async function activateRouteGroups(prof,priority,onProgress){
 // v014.031: load one priority group at a time, never a 24-model all-or-nothing batch.
 const models=priority==='critical'?routeModels(prof,'critical'):
  priority==='stream'?routeModels(prof,'stream'):
  priority==='mercenaries'?routeModels('SharedMercenary','ondemand'):
  [...routeModels(prof,'critical'),...routeModels(prof,'stream'),...routeModels('SharedMercenary','ondemand')];
 const grouped=groupRouteModels(models),total=grouped.length;
 if(!total){onProgress?.(1,1,'Grupo ya preparado');return{total:0,loaded:0,failed:0,errors:[],instances:0}}
 let next=0,loaded=0,failed=0;const errors=[];
 onProgress?.(0,total,'Plan: '+models.length+' instancias; '+total+' recursos únicos');
 async function worker(){
  while(next<grouped.length){
   const [asset,els]=grouped[next++];
   const results=await Promise.allSettled(els.map(el=>activateDeferredModel(el,ROUTE_ASSET_TIMEOUT_MS,state=>{
    const size=state.bytes!=null?' · '+(state.bytes/1048576).toFixed(1)+' MiB':' · bytes no informados';
    onProgress?.(loaded,total,asset+' · '+state.phase+size+' · '+state.seconds+' s');
   })));
   const ok=results.every((r,i)=>r.status==='fulfilled'&&!!els[i].contentEntity);
   if(ok){loaded++;try{refreshRouteBindings(prof)}catch(_){}}
   else{
    failed++;errors.push(asset+': '+results.filter(r=>r.status==='rejected').map(r=>r.reason?.message||String(r.reason)).join(' | '));
   }
   onProgress?.(loaded,total,(ok?'Listo: ':'Pendiente: ')+asset);
   if(window.GenesisDevice?.safePreviews)await new Promise(r=>requestAnimationFrame(r));
  }
 }
 await Promise.all(Array.from({length:Math.min(window.GenesisDevice?.safePreviews?1:2,total)},worker));
 return{total,loaded,failed,errors,instances:models.length};
}
"""
replace_section('async function activateRouteGroups(prof,priority,onProgress){','function refreshRouteBindings(prof)',routeGroups,'priority groups')
prep = """function loaderRetryDelay(label,attempt=1,detail=''){
 return new Promise(resolve=>{
  const ms=Math.min(20000,Math.max(2500,3000*Math.pow(1.55,Math.min(attempt-1,5))));
  let done=false;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);loadRetry.onclick=null;
   loadRetry.style.display='none';loadingCard.classList.remove('failed');resolve()};
  const timer=setTimeout(finish,ms);
  loading.style.display='grid';loadingCard.classList.add('failed');
  loadState.textContent='CARGA EN PAUSA · REINTENTO SIN REINICIAR';
  loadDetail.textContent=label+' · intento '+attempt+' · '+detail+' · reintento en '+Math.round(ms/1000)+' s';
  loadRetry.textContent='REINTENTAR AHORA · SIN RECARGAR';
  loadRetry.style.display='inline-block';loadRetry.onclick=finish;
  window.GenesisAssetDiag?.save?.();
 });
}
async function prepareRoute(prof){
 if(window.__GENESIS_LITE_BOOT&&prof!=='Herrero'){routeReady.add(prof);return}
 if(routeReady.has(prof))return;
 routeLoading=true;intro.style.display='none';loading.style.display='grid';
 loadingCard.classList.remove('failed');loadRetry.style.display='none';
 const stages=[['critical','Modelos esenciales'],['stream','Herrería y decoración'],['mercenaries','Mercenario y equipamiento']];
 let stageIndex=0;
 for(const [priority,label] of stages){
  let attempt=0;
  while(true){
   const pending=groupRouteModels(priority==='mercenaries'?routeModels('SharedMercenary','ondemand'):routeModels(prof,priority)).length;
   setLoadUI(100*stageIndex/stages.length,'Cargando '+prof+' · '+label,'Quedan '+pending+' recursos únicos; ningún modelo se carga dos veces.');
   const report=await activateRouteGroups(prof,priority,(done,total,detail)=>{
    setLoadUI(100*(stageIndex+(total?done/total:1))/stages.length,'Cargando '+prof+' · '+label,detail);
    loadCount.textContent=done+' de '+total+' recursos únicos del grupo · etapa '+(stageIndex+1)+' de '+stages.length;
   });
   if(!report.failed)break;
   attempt++;
   const reason=report.errors.slice(0,3).join(' | ');
   console.warn('Genesis Herrero carga parcial · '+priority+' · '+reason);
   await loaderRetryDelay(prof+' · '+label+' · '+report.failed+' recursos pendientes',attempt,reason);
  }
  stageIndex++;
 }
 try{refreshRouteBindings(prof)}catch(err){console.warn('Genesis bindings de ruta:',err)}
 routeReady.add(prof);loadingCard.classList.remove('failed');loadRetry.style.display='none';
 setLoadUI(100,'Ruta de '+prof+' completa','Todos los modelos de Herrero y mercenario fueron procesados antes de entrar.');
 loadCount.textContent='3 de 3 grupos preparados · sin carga diferida';
}
async function chooseProfessionRoute(prof){
 if(routeLoading||gameStarted)return;
 const buttons=[...document.querySelectorAll('[data-profession]')];
 buttons.forEach(b=>b.disabled=true);
 try{
  await prepareRoute(prof);
  startRoute(prof);
  loading.style.display='none';
 }catch(err){
  console.error(err);
  failLoading(err?.message||String(err),'Ruta en pausa; podés reintentar sin reiniciar la página.');
  loadRetry.textContent='REINTENTAR RUTA · SIN RECARGAR';
  loadRetry.onclick=()=>{routeLoading=false;loadingCard.classList.remove('failed');chooseProfessionRoute(prof)};
  intro.style.display='none';
 }finally{
  routeLoading=false;buttons.forEach(b=>b.disabled=false);
 }
}
"""
replace_section('async function prepareRoute(prof){','function startRoute(prof)',prep,'deferred profession selection and recoverable loading')
old="await prepareRoute('Herrero');routeLoading=false;setLoadUI(100,'Juego completo listo','Herrero preparado antes de elegir profesión.');clearInterval(loadTimer);loadElapsed.textContent=((performance.now()-loadStarted)/1000).toFixed(1)+' s';setTimeout(()=>{loading.style.display='none';intro.style.display='grid'},360);"
new="routeLoading=false;setLoadUI(100,'Núcleo listo','Personaje y controles preparados. La herrería se cargará al seleccionar Herrero.');clearInterval(loadTimer);loadElapsed.textContent=((performance.now()-loadStarted)/1000).toFixed(1)+' s';setTimeout(()=>{loading.style.display='none';intro.style.display='grid'},360);"
replace_once(old,new,'initial profession boot')
for locked in ['genesis_ui_approved.js','preparacion_control.js','genesis_ui_approved.css']:
    assert locked not in ('' if not p.exists() else p.name)
assert "await prepareRoute('Herrero');routeLoading=false;" not in s
assert "window.GenesisStreamLoader" not in s
assert 'loaderRetryDelay(' in s and 'Núcleo listo' in s
p.write_text(s,encoding='utf-8')
print('APPLIED: V014.031 staged loader to current index.html, preserving all other files and assets.')
print('OUTCOME: no initial Herrero preload, 3 grouped stages on click, idle watchdog, retry without reload.')
