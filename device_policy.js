/* Project Genesis v0.11.011 · mobile orientation and dynamic render pixel budget.
   Screen rotation is requested only where the browser permits it (fullscreen + gesture).
   iOS Safari cannot lock physical orientation: portrait receives a blocking gate. */
(() => {
  'use strict';
  const media = expression => !!window.matchMedia?.(expression).matches;
  const safePreviews = /Android|iPad|iPhone|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    || media('(pointer: coarse)');
  if (safePreviews) document.documentElement.classList.add('mobile-device');

  const isPortrait = () => {
    const vp=window.visualViewport;
    const w=vp?.width || window.innerWidth, h=vp?.height || window.innerHeight;
    return h > w;
  };
  let appElement=null, frame=0, lastRatio=null;
  function configureMobileShadows() {
    if(!safePreviews)return;
    // Keep two expensive real-time shadow maps within mobile GPU budgets.
    for(const [id,resolution] of [['worldSunLight',512],['forgeCoreLight',256]]) {
      const light=document.getElementById(id);
      if(!light)continue;
      light.setAttribute('shadow-resolution',String(resolution));
      if(light.component)light.component.shadowResolution=resolution;
    }
  }
  function updateViewport() {
    frame=0;
    const vp=window.visualViewport, w=Math.max(1, vp?.width || window.innerWidth);
    const h=Math.max(1, vp?.height || window.innerHeight);
    document.documentElement.style.setProperty('--view-height', h+'px');
    document.documentElement.style.setProperty('--genesis-viewport-width',w+'px');
    document.documentElement.style.setProperty('--genesis-viewport-height',h+'px');
    document.documentElement.classList.toggle('genesis-landscape-required',safePreviews && isPortrait());

    // The art/layout is sized in CSS pixels; constrain only the 3D render buffer.
    // 1.9 Mpx is a conservative mobile budget; the browser can reduce DPR further.
    if (safePreviews && appElement) {
      const native = Math.max(1,Number(window.devicePixelRatio)||1);
      const budgetDpr = Math.sqrt(1900000 / Math.max(1,w*h));
      const dprCap=Math.max(w,h)>=1024?1.3:1.15;
      const ratio=Math.max(0.75, Math.min(native,dprCap,budgetDpr));
      if(lastRatio===null || Math.abs(lastRatio-ratio)>.025) {
        lastRatio=ratio;
        appElement.setAttribute('max-pixel-ratio',String(Number(ratio.toFixed(2))));
      }
    }
  }
  function scheduleViewport(){
    if(!frame)frame=requestAnimationFrame(updateViewport);
  }
  async function requestLandscape() {
    const status=document.getElementById('rotateStatus');
    if(status)status.textContent='Intentando activar el modo horizontal…';
    try {
      if(!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen({navigationUI:'hide'});
      }
      if(!screen.orientation || typeof screen.orientation.lock!=='function') {
        throw new Error('Este navegador no admite el bloqueo automático.');
      }
      await screen.orientation.lock('landscape');
      if(status)status.textContent='';
    } catch(error) {
      if(status)status.textContent='El navegador no permite girar automáticamente. Girá el teléfono físicamente y desactivá el bloqueo de rotación si fuese necesario.';
    }
    scheduleViewport();
  }
  function initOrientationGate() {
    const button=document.getElementById('rotateLock');
    if(button) {
      // Avoid an inert control on Safari iOS. The manual rotation message remains.
      button.hidden = !safePreviews || typeof screen.orientation?.lock!=='function';
      button.addEventListener('click',requestLandscape);
    }
    scheduleViewport();
  }
  addEventListener('resize',scheduleViewport,{passive:true});
  addEventListener('orientationchange',scheduleViewport,{passive:true});
  window.visualViewport?.addEventListener('resize',scheduleViewport,{passive:true});
  screen.orientation?.addEventListener?.('change',scheduleViewport);
  document.addEventListener('fullscreenchange',scheduleViewport);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initOrientationGate,{once:true});
  else initOrientationGate();

  window.GenesisDevice=Object.freeze({
    safePreviews,
    configureApp(element) {
      appElement=element;
      // Disable multisample antialiasing before web-components initialize WebGL.
      // This avoids large mobile color/depth render buffers when the scene moves.
      if(safePreviews)element.removeAttribute('antialias');
      configureMobileShadows();
      requestAnimationFrame(configureMobileShadows);
      updateViewport();
      if(typeof ResizeObserver!=='undefined')new ResizeObserver(scheduleViewport).observe(element);
    },
    requestLandscape,
    isPortrait
  });
})();

/* V014022 LOADER OBSERVABILITY — isolated diagnostic port from V015.
 * The original game, quests, approved art, camera and loading decisions are unchanged.
 * Installed before pc-app markup for earliest resource tracking.
 */
if (/\/(?:index\.html)?$/i.test(location.pathname)) {
/* Project Genesis · diagnóstico de descarga por recurso, sin duplicar solicitudes. */
(()=>{
'use strict';
const records=new Map(), started=performance.now(), errors=[];
const limit=120000;
let known={};
const human=n=>n==null?'—':n<1024?n+' B':n<1048576?(n/1024).toFixed(1)+' KiB':(n/1048576).toFixed(2)+' MiB';
const absolute=u=>{try{return new URL(u,location.href).href}catch(_){return String(u||'')}};
const key=u=>absolute(u);
function touch(url,state,loaded=null,total=null,reason=''){
 if(!url)return;
 const id=key(url),r=records.get(id)||{url:id,created:performance.now(),received:0,total:null,state:'pendiente',lastChange:performance.now(),error:''};
 if(total>0)r.total=total;
 if(loaded!=null&&loaded>r.received){r.received=loaded;r.lastChange=performance.now()}
 if(state)r.state=state;
 if(reason)r.error=String(reason);
 r.updated=performance.now();
 records.set(id,r);
 return r;
}
const expected=url=>known[key(url)]||null;
const get=url=>records.get(key(url))||null;
const originalOpen=XMLHttpRequest.prototype.open;
const originalSend=XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open=function(method,url,...rest){
 this.__genesisUrl=absolute(url);
 touch(this.__genesisUrl,'solicitado',null,expected(this.__genesisUrl));
 return originalOpen.call(this,method,url,...rest);
};
XMLHttpRequest.prototype.send=function(...args){
 const url=this.__genesisUrl;
 if(url){
  this.addEventListener('loadstart',()=>touch(url,'descargando'));
  this.addEventListener('progress',e=>touch(url,'descargando',e.loaded,e.lengthComputable?e.total:expected(url)));
  this.addEventListener('load',()=>{
   const bad=this.status>=400||this.status===0;
   const length=Number(this.getResponseHeader('Content-Length'))||expected(url);
   const bytes=Number(this.response?.byteLength)||Number(this.response?.size)||get(url)?.received||length;
   touch(url,bad?'error HTTP':'descargado',bytes,length,bad?'HTTP '+this.status:'');
  });
  this.addEventListener('error',()=>touch(url,'error de red',null,null,'Error XMLHttpRequest'));
  this.addEventListener('abort',()=>touch(url,'cancelado'));
  this.addEventListener('timeout',()=>touch(url,'timeout',null,null,'Tiempo agotado'));
 }
 return originalSend.apply(this,args);
};
const originalFetch=window.fetch?.bind(window);
if(originalFetch)window.fetch=function(resource,init){
 const url=absolute(typeof resource==='string'?resource:resource?.url);
 touch(url,'descargando',null,expected(url));
 return originalFetch(resource,init).then(response=>{
  const total=Number(response.headers.get('content-length'))||expected(url);
  touch(url,response.ok?'respuesta recibida':'error HTTP',null,total,response.ok?'':'HTTP '+response.status);
  return response;
 },error=>{touch(url,'error de red',null,null,error?.message);throw error});
};
try{
 new PerformanceObserver(list=>{
  for(const entry of list.getEntries()){
   const url=entry.name,size=entry.decodedBodySize||entry.encodedBodySize||0;
   touch(url,'descargado',size||get(url)?.received||null,expected(url)||entry.decodedBodySize||entry.encodedBodySize||null);
  }
 }).observe({type:'resource',buffered:true});
}catch(_){}
window.addEventListener('error',e=>{
 if(e.target&&e.target!==window){
  const src=e.target.src||e.target.getAttribute?.('src');
  if(src)touch(src,'error de recurso',null,null,'Error de elemento');
 }else if(e.message)errors.push(e.message);
},true);
window.addEventListener('unhandledrejection',e=>errors.push(String(e.reason?.message||e.reason)));
function initDeclared(){
 document.querySelectorAll('pc-asset[src]').forEach(el=>{
  const url=el.getAttribute('src'),r=touch(url,null,null,expected(url));
  r.assetId=el.id||r.assetId;
  if(el.asset?.loaded||el.asset?.resource)r.state='recurso preparado';
 });
}
function render(){
 if(!document.getElementById('loadCount'))return;
 initDeclared();
 let root=document.getElementById('genesisAssetDetails');
 if(!root){
  root=document.createElement('section');root.id='genesisAssetDetails';
  root.style.cssText='margin:12px auto 0;max-width:98%;border:1px solid #756039;border-radius:8px;padding:9px;text-align:left;font:12px/1.45 monospace;color:#d4dbe3;background:rgba(0,0,0,.3)';
  root.innerHTML='<div style="font-weight:bold;color:#f3d38b;margin-bottom:6px">V0.14.022 · ARCHIVOS · DESCARGA INDIVIDUAL <button id="genesisCopyDiagnostic" style="float:right;padding:4px 8px;background:#2a4150;color:white;border:1px solid #c1a46e;border-radius:5px">COPIAR INFORME</button></div><div id="genesisAssetRows" style="max-height:210px;overflow:auto"></div>';
  (document.getElementById('loadDetail')?.parentElement||document.body).appendChild(root);
  root.querySelector('button').addEventListener('click',()=>{
   const text=JSON.stringify(snapshot(),null,2);
   navigator.clipboard?.writeText(text).catch(()=>{});
   const box=document.createElement('textarea');box.value=text;box.style.cssText='width:100%;height:130px';root.appendChild(box);box.select();
  });
 }
 const rows=[...records.values()].filter(r=>/\.(glb|gltf|bin|png|jpg|jpeg|webp|ktx2|mp3|ogg|wav)(\?|$)/i.test(r.url));
 const priority=r=>/error|timeout|cancelado/.test(r.state)?0:/descargando|solicitado|respuesta/.test(r.state)?1:/pendiente/.test(r.state)?2:3;
 rows.sort((a,b)=>priority(a)-priority(b)||a.created-b.created);
 const container=document.getElementById('genesisAssetRows');
 if(!container)return;
 container.replaceChildren();
 const active=rows.filter(r=>priority(r)<3);
 const shown=[...active.slice(0,70),...rows.filter(r=>priority(r)===3).slice(-7)];
 for(const r of shown){
  const line=document.createElement('div');
  const short=new URL(r.url).pathname.split('/').slice(-3).join('/');
  const stale=/descargando|solicitado|respuesta/.test(r.state)&&performance.now()-r.lastChange>limit;
  line.textContent=(stale?'SIN AVANCE · ':'')+(r.assetId?'['+r.assetId+'] ':'')+short+' · '+human(r.received)+' / '+human(r.total)+' · '+r.state+(r.error?' · '+r.error:'');
  line.style.cssText='border-bottom:1px solid #283743;padding:3px 0;overflow-wrap:anywhere;color:'+(/error|timeout/.test(r.state)?'#ff988c':stale?'#ffcf8e':'inherit');
  container.appendChild(line);
 }
 if(!shown.length)container.textContent='Esperando solicitudes de recursos…';
 const heading=root.firstElementChild;
 heading.firstChild.textContent='V0.14.022 · ARCHIVOS · '+rows.length+' detectados · '+rows.filter(r=>priority(r)===3).length+' completados · '+active.length+' pendientes ';
}
function snapshot(){
 return{build:document.querySelector('.protoKicker')?.textContent||'',elapsedSeconds:Math.round((performance.now()-started)/1000),location:location.pathname,records:[...records.values()].map(r=>({...r,ageSeconds:Math.round((performance.now()-r.lastChange)/1000)})),errors};
}
window.GenesisAssetDiag={touch,get,snapshot,render,expected,format:human};
fetch('./tools/genesis_asset_sizes_v014022.json').then(r=>r.ok?r.json():{}).then(map=>{
 known=Object.fromEntries(Object.entries(map).map(([k,v])=>[absolute(k),v]));
 for(const r of records.values())if(!r.total)r.total=expected(r.url);
}).catch(()=>{});

const CRASH_LAST='genesis:boot:last:legacy-v014022',CRASH_PREVIOUS='genesis:boot:previous:legacy-v014022';
const runId=Date.now()+'-'+Math.random().toString(36).slice(2,7);
const readSaved=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}};
const previousRun=readSaved(CRASH_LAST);
if(previousRun?.runId!==runId&&Date.now()-(previousRun?.at||0)<30*60*1000){
 try{localStorage.setItem(CRASH_PREVIOUS,JSON.stringify(previousRun))}catch(_){}
}
function compactReport(){
 const all=[...records.values()];
 const unfinished=all.filter(r=>!/^(descargado|recurso preparado)$/.test(r.state));
 const failed=unfinished.filter(r=>/error|timeout|cancelado/i.test(r.state));
 const recent=all.filter(r=>r.received>0).sort((a,b)=>b.updated-a.updated).slice(0,8);
 const selected=[...new Set([...failed,...unfinished.slice(-22),...recent])].slice(0,40);
 const models=[...document.querySelectorAll('pc-model[data-route="Herrero"]')];
 return {schema:2,runId,at:Date.now(),seconds:Math.round((performance.now()-started)/1000),
  count:document.getElementById('loadCount')?.textContent||'',stage:document.getElementById('loadState')?.textContent||'',
  detail:document.getElementById('loadDetail')?.textContent||'',totalObserved:all.length,finished:all.length-unfinished.length,
  herreroModels:models.length,herreroInstantiated:models.filter(el=>!!el.contentEntity).length,
  errors:errors.slice(-5),files:selected.map(r=>({id:r.assetId||'',file:r.url.replace(location.origin,'').slice(-200),state:r.state,received:r.received,total:r.total,error:r.error||'',idleSeconds:Math.round((performance.now()-r.lastChange)/1000)}))};
}
function saveCrashSnapshot(){
 try{localStorage.setItem(CRASH_LAST,JSON.stringify(compactReport()));return true}catch(_){return false}
}
function showPreviousReport(){
 const prior=readSaved(CRASH_PREVIOUS);
 if(!prior||prior.runId===runId)return;
 let host=document.getElementById('genesisCrashRecovery');
 if(!host){
  host=document.createElement('section');host.id='genesisCrashRecovery';
  host.style.cssText='margin:8px auto;max-width:98%;border:2px solid #d9a25d;border-radius:8px;padding:10px;background:#2c211b;color:#fff3da;font:12px/1.5 monospace;text-align:left;overflow-wrap:anywhere';
  const label=document.createElement('div');label.textContent='ÚLTIMA CARGA INTERRUMPIDA · INFORME RECUPERADO';
  label.style.cssText='font-weight:bold;color:#ffcc81;margin-bottom:6px';
  const summary=document.createElement('div');summary.id='genesisCrashSummary';
  const view=document.createElement('details'),title=document.createElement('summary');
  title.textContent='Ver archivos pendientes y errores';
  const pre=document.createElement('pre');pre.id='genesisCrashText';
  pre.style.cssText='white-space:pre-wrap;max-height:210px;overflow:auto;font:11px/1.4 monospace';
  view.append(title,pre);
  const copy=document.createElement('button');copy.textContent='COPIAR INFORME RECUPERADO';
  copy.style.cssText='padding:8px;margin-top:8px;background:#664535;color:white;border:1px solid #c9a46c;border-radius:5px';
  copy.addEventListener('click',()=>{const txt=JSON.stringify(readSaved(CRASH_PREVIOUS)||prior,null,2);navigator.clipboard?.writeText(txt).catch(()=>{});const area=document.createElement('textarea');area.value=txt;area.style.cssText='width:100%;height:90px';host.appendChild(area);area.select()});
  host.append(label,summary,view,copy);
  (document.getElementById('loadDetail')?.parentElement||document.body).appendChild(host);
 }
 host.querySelector('#genesisCrashSummary').textContent=prior.seconds+' s · '+prior.count+' · '+prior.stage+' · Herrero '+prior.herreroInstantiated+'/'+prior.herreroModels+' modelos';
 host.querySelector('#genesisCrashText').textContent=JSON.stringify(prior,null,2);
}
window.GenesisAssetDiag.save=saveCrashSnapshot;
window.GenesisAssetDiag.previous=()=>readSaved(CRASH_PREVIOUS);
window.addEventListener('pagehide',saveCrashSnapshot);
setInterval(()=>{saveCrashSnapshot();showPreviousReport()},1500);

setInterval(()=>{const loading=document.getElementById('loading');if(loading&&loading.style.display!=='none')render()},700);
})();

}
