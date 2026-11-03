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


  // Recovery for historical third-party URLs that now return HTTP 404.
  // Preserve original declarations for restoration; substitute existing local
  // embedded GLBs and omit nonessential decoration from the mandatory route.
  function rescueMissingVendorProps(){
    for(const [id,local] of [['anvilModel','anvil085'],['bellowsModel','bellows085']]){
      const model=document.getElementById(id),asset=document.getElementById(local);
      if(model&&asset){model.dataset.asset=local;model.dataset.genesisRescue='local';}
    }
    // Curtidor is plaza scenery only in this vertical slice. Its gameplay
    // models and animation clips must never request missing vendor assets.
    // Keep DOM/entity references so dormant legacy handlers cannot throw.
    const tannerModels=[...document.querySelectorAll('pc-model[data-route="Curtidor"]')];
    for(const model of tannerModels){
      delete model.dataset.asset;
      model.removeAttribute('asset');
      model.dataset.genesisRescue='decorative-only';
      model.querySelectorAll('pc-anim-clip').forEach(clip=>clip.removeAttribute('asset'));
    }
    // Some clips are independent Web Components and preload at bootstrap;
    // remove only the known broken chest source, not the village structures.
    const brokenChest=document.getElementById('tannerChest09');
    if(brokenChest)brokenChest.removeAttribute('src');
    for(const id of ['hammerRackModel2A','blacksmithSignModel2A']){
      const model=document.getElementById(id);
      if(model){delete model.dataset.asset;model.dataset.genesisRescue='vendor-unavailable';model.enabled=false;}
    }
    console.info('Genesis: Herrero local recovery; Curtidor scenery only, '+tannerModels.length+' gameplay models deferred');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',rescueMissingVendorProps,{once:true});
  else rescueMissingVendorProps();

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
