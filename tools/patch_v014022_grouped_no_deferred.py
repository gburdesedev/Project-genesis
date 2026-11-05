#!/usr/bin/env python3
"""V0.14.022 grouped loader experiment. Changes loading only, never quests/camera/art/main."""
from pathlib import Path

p=Path("index.html")
s=p.read_text(encoding="utf-8")
assert "Project Genesis v0.14.022" in s
assert "V014022 GROUPED NO DEFERRED" not in s, "patch already applied"

def change(before,after,desc):
    global s
    matches=s.count(before)
    if matches!=1:
        raise RuntimeError(f"{desc}: expected exactly 1 match, found {matches}")
    s=s.replace(before,after,1)
    print("PATCH",desc)

change("#loadGroups{display:none!important}",r"""
/* V014022 GROUPED NO DEFERRED: real stage gates, not purely visual counters */
#loadGroups{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:3px 0;max-height:94px;overflow-y:auto}
#loadGroups>.loadGroup{min-width:0;font-size:10px;line-height:1.16;padding:5px 6px;white-space:normal}
#loadGroups>.loadGroup strong{display:block;font-size:11px;margin-top:2px}
#loadGroups>.loadGroup[data-state="active"]{border-color:#efc874!important;background:#19354a!important}
#loadGroups>.loadGroup[data-state="error"]{border-color:#f48670!important;background:#472a28!important}
@media(max-height:450px){
 #loadGroups{grid-template-columns:repeat(4,minmax(0,1fr));max-height:65px!important;gap:2px}
 #loadGroups>.loadGroup{font-size:9px;padding:2px 3px}
 #loadGroups>.loadGroup strong{font-size:9px;margin-top:1px}
}
""","restore grouped loading rows")

change("""const groupSpec=[
 ['paredes','Paredes'],['puertas','Puertas'],['objetos','Objetos'],
 ['animaciones','Animaciones'],['arboles','Árboles'],['suelos','Suelos y caminos']
];""","""const groupSpec=[
 ['paredes','Estructuras'],['objetos','Personajes y objetos'],['animaciones','Animaciones'],
 ['suelos','Suelos y caminos'],['arboles','Árboles'],['puertas','Puertas'],
 ['herreroCritico','Herrero esencial'],['herreroEscena','Herrero completo']
];""","show eight concrete load groups")

change("bootGroups.arboles.total=4;","bootGroups.arboles.total=globalThis.GenesisDevice?.safePreviews===true?4:8;","count all required tree LODs")
change("""  row.querySelector('strong').textContent=group.ready+' / '+(group.total||'—');
  row.dataset.state=group.total>0&&group.ready>=group.total?'ready':activeBootGroup===id?'active':'waiting';
 }
}""","""  const fail=group.failed||0;
  row.querySelector('strong').textContent=group.ready+' / '+(group.total||'—')+(fail?' · '+fail+' error':'');
  row.dataset.state=fail?'error':group.total>0&&group.ready>=group.total?'ready':activeBootGroup===id?'active':'waiting';
 }
 window.GenesisStreamLoader?.setGroupPlan?.(activeBootGroup.startsWith('herrero')?'Herrero':'Inicio',bootGroups);
}""","actual group counters + error states")
change("""function showBootProgress(stage,detail=''){
 if(stage)loadState.textContent=stage;
 if(detail)loadDetail.textContent=detail;
 window.GenesisStreamLoader?.render?.();
}""","""function showBootProgress(stage,detail=''){
 if(stage)loadState.textContent=stage;
 if(detail)loadDetail.textContent=detail;
 syncGroupRows();
}""","derive HUD progress from actual completed group models")
change("""  onResourceLoaded:name=>{
   const group=name.startsWith('tree:')?'arboles':name.startsWith('door:')?'puertas':'suelos';
   bootProgress.world++;bootGroups[group].ready++;
   activeBootGroup=group;
   showBootProgress(groupStage(group),name+' · '+bootGroups[group].ready+' de '+bootGroups[group].total);
  }""","""  onResourceLoaded:(name,result={ok:true})=>{
   const group=name.startsWith('tree:')?'arboles':name.startsWith('door:')?'puertas':'suelos';
   bootProgress.world++;bootGroups[group].ready++;
   if(result.ok===false)bootGroups[group].failed=(bootGroups[group].failed||0)+1;
   activeBootGroup=group;
   showBootProgress(groupStage(group),name+' · '+bootGroups[group].ready+' de '+bootGroups[group].total+(result.ok===false?' · ERROR':''));
  }""","report both successful and failed tree LODs")

# The asset's own stream now has finite attempts. An entire group then offers
# bounded retry without resetting completed asset groups or the page.
change("window.GenesisStreamLoader.prepare(primary,{maxAttempts:fallback?2:Infinity})",
       "window.GenesisStreamLoader.prepare(primary,{maxAttempts:2})",
       "bound per-asset attempts for user-controlled grouped retry")
change("window.GenesisStreamLoader.prepare(fallback);return await loadDeferredModelAsset",
       "window.GenesisStreamLoader.prepare(fallback,{maxAttempts:2});return await loadDeferredModelAsset",
       "bound fallback attempts")

start=s.index("async function prepareRoute(prof){")
end=s.index("function startRoute(prof){",start)
assert "function streamRouteDecor(prof)" in s[start:end]
assert "streamRouteDecor(prof)" in s[start:end]
s=s[:start]+"""async function prepareRoute(prof){
 window.GenesisStreamLoader.trackRoute(prof);
 if(routeReady.has(prof))return;
 routeLoading=true;intro.style.display='none';loading.style.display='grid';
 loadRetry.style.display='none';loadingCard.classList.remove('failed');
 // No post-start streaming: both groups must finish before startRoute().
 for(const [priority,id] of [['critical','herreroCritico'],['stream','herreroEscena']]){
  const group=bootGroups[id],description=priority==='critical'?'modelos esenciales':'taller y decoración';
  group.total=groupRouteModels(routeModels(prof,priority)).length;
  group.ready=0;group.failed=0;activeBootGroup=id;
  showBootProgress('Cargando '+prof+' · '+description,'Preparando '+group.total+' assets; sin carga diferida.');
  let attempt=0;
  while(true){
   const missing=groupRouteModels(routeModels(prof,priority)).length;
   const already=Math.max(0,group.total-missing);
   group.ready=already;group.failed=0;
   const report=await activateRouteGroups(prof,priority,(done,total,label)=>{
    group.ready=Math.min(group.total,already+done);
    showBootProgress('Cargando '+prof+' · '+description,label);
   });
   if(report.failed===0){
    group.ready=group.total;group.failed=0;
    showBootProgress(prof+' · '+description+' preparado','Todos los assets de este grupo están instanciados.');
    break;
   }
   group.failed=report.failed;attempt++;
   showBootProgress(prof+' · grupo en pausa',report.errors.slice(0,3).join(' | '));
   await loaderRetryDelay(prof+' · '+description+' · '+report.failed+' pendientes',attempt,report.errors.slice(0,3).join(' | '));
  }
 }
 try{refreshRouteBindings(prof)}catch(err){console.warn('Bindings de ruta:',err)}
 routeReady.add(prof);loadingCard.classList.remove('failed');loadRetry.style.display='none';
 showBootProgress(prof+' · carga completa','No quedan modelos de la ruta para cargar durante la partida.');
 await sleep(90);
}
async function chooseProfessionRoute(prof){
 if(routeLoading||gameStarted)return;
 const buttons=[...document.querySelectorAll('[data-profession]')];buttons.forEach(b=>b.disabled=true);
 try{
  await prepareRoute(prof);
  startRoute(prof);
  loading.style.display='none';
  // Deliberately no streamRouteDecor(): the entire route is ready beforehand.
 }catch(err){
  console.error(err);
  failLoading(err?.message||String(err),'Ruta en pausa; reintento sin reiniciar la página.');
  loadRetry.textContent='REINTENTAR RUTA · SIN RECARGAR';
  loadRetry.onclick=()=>{routeLoading=false;loadingCard.classList.remove('failed');chooseProfessionRoute(prof)};
  intro.style.display='none';
 }finally{routeLoading=false;buttons.forEach(b=>b.disabled=false)}
}

"""+s[end:]

assert "function streamRouteDecor(prof)" not in s
assert "startRoute(prof);loading.style.display='none';streamRouteDecor(prof)" not in s
assert "window.GenesisStreamLoader?.setGroupPlan?" in s
assert "herreroEscena" in s
assert "#loadGroups{display:none!important}" not in s
assert "V014022 GROUPED NO DEFERRED" in s
p.write_text(s,encoding="utf-8")
print("GROUPED v014022 patch complete; scene transforms and mechanics unchanged.")
