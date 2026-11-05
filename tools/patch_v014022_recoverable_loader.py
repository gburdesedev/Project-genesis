#!/usr/bin/env python3
"""Patch ONLY the isolated 0.14.022 loader. No art, camera, quests or main changes."""
from pathlib import Path

p=Path("index.html")
body=p.read_text(encoding="utf-8")
assert "Project Genesis v0.14.022" in body, "Unexpected game version"
assert "V014022 REPEATABLE LOADER" not in body, "Patch already applied"

def replace_one(old,new,what):
    global body
    count=body.count(old)
    if count!=1:
        raise RuntimeError(f"{what}: expected one exact source anchor, got {count}")
    body=body.replace(old,new,1)
    print("PATCH",what)

replace_one(
"""function failLoading(message,detail=''){
 loadingCard.classList.add('failed');loadState.textContent='ERROR DE CARGA';loadDetail.textContent=detail||message;
 loadRetry.style.display='inline-block';loadRetry.onclick=()=>location.reload();console.error('Genesis loading:',message);
}
""",
"""/* V014022 REPEATABLE LOADER: never automatically reload after an asset failure. */
function failLoading(message,detail=''){
 loadingCard.classList.add('failed');loadState.textContent='ERROR CRÍTICO · JUEGO EN PAUSA';loadDetail.textContent=detail||message;
 loadRetry.textContent='REINICIAR SOLO SI FALLÓ WEBGL';
 loadRetry.style.display='inline-block';
 loadRetry.onclick=()=>location.reload(); // only a deliberate, explicitly labeled user action
 console.error('Genesis loading:',message);
}
function loaderRetryDelay(label,attempt=1,detail=''){
 return new Promise(resolve=>{
  const ms=Math.min(20000,Math.max(2500,3000*Math.pow(1.55,Math.min(attempt-1,5))));
  let done=false;
  const finish=()=>{if(done)return;done=true;clearTimeout(timer);loadRetry.onclick=null;loadRetry.style.display='none';loadingCard.classList.remove('failed');resolve();};
  const timer=setTimeout(finish,ms);
  loading.style.display='grid';loadingCard.classList.add('failed');
  loadState.textContent='CARGA EN PAUSA · REINTENTO AUTOMÁTICO';
  loadDetail.textContent=label+' · intento '+attempt+' · '+detail+' · se reintentará en '+Math.round(ms/1000)+' s';
  loadRetry.textContent='REINTENTAR AHORA · SIN RECARGAR';
  loadRetry.style.display='inline-block';loadRetry.onclick=finish;
  window.GenesisAssetDiag?.save?.();
 });
}
""","retry box and deliberate fatal reload")

replace_one(
""" const bootWait=(promise,label,timeout=18000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Tiempo agotado preparando '+label)),timeout))]);
""",
""" const bootWait=(promise,label,timeout=120000)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Tiempo agotado preparando '+label)),timeout);
  Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)});
 });
 async function bootPrepareItem(item){
  let attempt=0;
  while(true){
   try{
    await bootWait(item.el.ready(),item.label);
    if(item.kind==='modelo'&&!item.el.contentEntity)throw new Error('No pudo instanciarse: '+item.label);
    return;
   }catch(error){
    attempt++;
    await loaderRetryDelay(item.label,attempt,error?.message||String(error));
    const assetRef=item.el.getAttribute('asset');
    const assetEl=assetRef?.startsWith('#')?document.getElementById(assetRef.slice(1)):null;
    try{
     if(assetEl?.asset&&!assetEl.asset.loaded&&!assetEl.asset.loading)appEl.app?.assets?.load(assetEl.asset);
     if(item.kind==='modelo'&&assetRef){
      item.el.removeAttribute('asset');
      await new Promise(resolve=>setTimeout(resolve,70));
      item.el.setAttribute('asset',assetRef);
     }
    }catch(retryError){console.warn('Genesis: siguiente reintento',item.label,retryError)}
   }
  }
 }
""","boot retries without page reset")

replace_one(
"""  await Promise.all(tasks.map(async item=>{
   await bootWait(item.el.ready(),item.label);
   if(item.kind==='modelo'&&!item.el.contentEntity)throw new Error('No pudo instanciarse: '+item.label);
   prepared++;bootProgress.prepared=prepared;bootGroups[group].ready++;
   showBootProgress(groupStage(group),item.label+' · '+bootGroups[group].ready+' de '+bootGroups[group].total);
  }));
""",
"""  let next=0;
  await Promise.all(Array.from({length:Math.min(3,tasks.length)},async()=>{
   while(next<tasks.length){
    const item=tasks[next++];
    await bootPrepareItem(item);
    prepared++;bootProgress.prepared=prepared;bootGroups[group].ready++;
    showBootProgress(groupStage(group),item.label+' · '+bootGroups[group].ready+' de '+bootGroups[group].total);
   }
  }));
""","3-worker initial asset gate")

replace_one(
"""function loadDeferredModelAsset(el,asset,timeout=12000)""",
"""function loadDeferredModelAsset(el,asset,timeout=120000)""","2-minute deferred default")

replace_one(
"""async function activateDeferredModel(el,timeout=12000)""",
"""async function activateDeferredModel(el,timeout=120000)""","2-minute route default")

old="""async function activateRouteGroups(prof,priority,onProgress){const groups=groupRouteModels(routeModels(prof,priority));if(!groups.length){onProgress?.(1,1,'Ruta ya preparada');return{total:0,loaded:0,failed:0,timedOut:false}}let complete=0,loaded=0,failed=0;const jobs=groups.map(([asset,els])=>Promise.allSettled(els.map(el=>activateDeferredModel(el,12000))).then(results=>{const ok=results.some(r=>r.status==='fulfilled'&&r.value?.contentEntity);if(ok)loaded++;else failed++;complete++;onProgress?.(loaded,groups.length,(ok?'✓ ':'↻ ')+asset);if(ok){try{refreshRouteBindings(prof)}catch(_){}}return ok}));const all=Promise.allSettled(jobs);const guard=sleep(6500).then(()=>null);const result=await Promise.race([all,guard]);const timedOut=result===null;if(timedOut){onProgress?.(loaded,groups.length,'Entrada habilitada · los modelos restantes continúan cargando')}return{total:groups.length,loaded,failed,timedOut}}"""
new="""async function activateRouteGroups(prof,priority,onProgress){
 const groups=groupRouteModels(routeModels(prof,priority));
 if(!groups.length){onProgress?.(1,1,'Ruta ya preparada');return{total:0,loaded:0,failed:0,timedOut:false,errors:[]}}
 let next=0,loaded=0,failed=0;const errors=[];
 async function worker(){
  while(next<groups.length){
   const [asset,els]=groups[next++];
   const results=await Promise.allSettled(els.map(el=>activateDeferredModel(el,120000)));
   const ok=els.some(el=>!!el.contentEntity);
   if(ok){loaded++;try{refreshRouteBindings(prof)}catch(_){}}
   else{
    failed++;
    const reason=results.filter(r=>r.status==='rejected').map(r=>r.reason?.message||String(r.reason)).join(' | ');
    errors.push(asset+' · '+(reason||'sin modelo instanciado'));
   }
   onProgress?.(loaded,groups.length,(ok?'✓ ':'ERROR · ')+asset);
  }
 }
 await Promise.all(Array.from({length:Math.min(2,groups.length)},worker));
 return{total:groups.length,loaded,failed,timedOut:false,errors};
}"""
replace_one(old,new,"two-worker route loader without 6.5s unsafe gate")

old="""async function prepareRoute(prof){if(routeReady.has(prof))return;routeLoading=true;intro.style.display='none';loading.style.display='grid';loadRetry.style.display='none';const planned=groupRouteModels(routeModels(prof,'critical')).length;loadCount.textContent='0 de '+planned+' assets del '+prof;setLoadUI(0,'Preparando '+prof,'Los modelos se cargan en paralelo. Los que falten seguirán en segundo plano.');const report=await activateRouteGroups(prof,'critical',(done,total,label)=>{setLoadUI(100*done/Math.max(1,total),'Preparando '+prof,label);loadCount.textContent=done+' de '+total+' assets del '+prof+' cargados'});try{refreshRouteBindings(prof)}catch(err){console.warn('Bindings parciales de ruta:',err)}routeReady.add(prof);if(!report?.timedOut&&report?.failed===0)setLoadUI(100,prof+' listo','Ruta preparada. El decorado secundario continuará en segundo plano.');else setLoadUI(100*report.loaded/Math.max(1,report.total),prof+' disponible',''+report.loaded+' de '+report.total+' assets listos; los restantes seguirán en segundo plano.');loadCount.textContent=report.loaded+' de '+report.total+' assets del '+prof+' cargados';await sleep(90)}"""
new="""async function prepareRoute(prof){
 if(routeReady.has(prof))return;
 routeLoading=true;intro.style.display='none';loading.style.display='grid';
 loadRetry.style.display='none';loadingCard.classList.remove('failed');
 let attempt=0;
 while(true){
  const report=await activateRouteGroups(prof,'critical',(done,total,label)=>{
   setLoadUI(100*done/Math.max(1,total),'Preparando '+prof,label);
   loadCount.textContent=done+' de '+total+' assets críticos del '+prof+' listos';
  });
  if(report.failed===0)break;
  attempt++;
  const err=report.errors.slice(0,3).join(' | ');
  console.warn('Ruta pausada; reintento sin reload:',prof,err);
  await loaderRetryDelay('Herrero · '+report.failed+' modelos críticos pendientes',attempt,err);
 }
 try{refreshRouteBindings(prof)}catch(err){console.warn('Bindings de ruta:',err)}
 routeReady.add(prof);
 loadingCard.classList.remove('failed');loadRetry.style.display='none';
 setLoadUI(100,prof+' listo','Todos los modelos críticos instanciados. Decoración restante en segundo plano.');
 await sleep(90);
}"""
replace_one(old,new,"never enter Herrero before critical models are ready")

replace_one(
"""async function chooseProfessionRoute(prof){if(routeLoading||gameStarted)return;const buttons=[...document.querySelectorAll('[data-profession]')];buttons.forEach(b=>b.disabled=true);try{await prepareRoute(prof);startRoute(prof);loading.style.display='none';streamRouteDecor(prof)}catch(err){console.error(err);failLoading(err?.message||String(err),'No se habilitó la ruta. Reintentá; el resto del prototipo no se cargó.');intro.style.display='none'}finally{routeLoading=false;buttons.forEach(b=>b.disabled=false)}}""",
"""async function chooseProfessionRoute(prof){
 if(routeLoading||gameStarted)return;
 const buttons=[...document.querySelectorAll('[data-profession]')];buttons.forEach(b=>b.disabled=true);
 try{
  await prepareRoute(prof);
  startRoute(prof);loading.style.display='none';streamRouteDecor(prof);
 }catch(err){
  console.error(err);
  failLoading(err?.message||String(err),'Ruta en pausa; reintento sin reiniciar la página.');
  loadRetry.textContent='REINTENTAR RUTA · SIN RECARGAR';
  loadRetry.onclick=()=>{routeLoading=false;loadingCard.classList.remove('failed');chooseProfessionRoute(prof)};
  intro.style.display='none';
 }finally{routeLoading=false;buttons.forEach(b=>b.disabled=false)}
}""","route exception retry without navigation")

# Safety checks: user approved scene/story must be identical
assert body.count("V014022 REPEATABLE LOADER")==1
assert "await sleep(90)" in body
assert "loadRetry.onclick=()=>location.reload()" in body  # explicit fatal WebGL only, never automatic
assert "const guard=sleep(6500)" not in body
assert "Todos los modelos críticos instanciados" in body
p.write_text(body,encoding="utf-8")
print("V014022 loader changed; original game content preserved outside exact anchors")
