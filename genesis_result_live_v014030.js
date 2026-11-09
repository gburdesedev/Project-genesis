/* Project Genesis V014.030: controlled 3D output for the ACTUAL NGE-crafted item.
 * No imported substitute geometry, invented affinity, or unlicensed V12B source.
 * Exact V12B model SHA recorded in Assets2 approved preset; model NOT in this repo.
 * The 32-bit HDRI Cycles image remains the verified visual fallback.
 */
(function(g) {
  'use strict';
  const VERSION='V014.030';
  const SWORD_SHA='e2228f078b2572768416c48c0e63c2d908f214e2c0625a2ab754c877a099112b';
  const SWORD_DIR='./assets/playcanvas/approved/equipment/';
  const VALID_CHANNELS=new Set(['Base','Luz','Sombra','Fuego','Hielo','Naturaleza','Tierra','Rayo']);
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function channels(item) {
    // Never synthesize elements or intensity: use ONLY the persisted NGE result.
    return (Array.isArray(item?.channels)?item.channels:[]).filter(c=>
      Array.isArray(c)&&VALID_CHANNELS.has(c[0])&&Number.isFinite(Number(c[1]))
    ).map(([name,value])=>Object.freeze({name,intensity:Number(value)}));
  }
  function approvedModel(item) {
    if(item?.recipe!=='espada_hierro')return null;
    const entry=g.GenesisApprovedRuntimeModels?.espada_hierro;
    if(!entry || entry.status!=='approved' ||
       entry.sha256!==SWORD_SHA || entry.recipe!=='espada_hierro' ||
       typeof entry.url!=='string' || !/^\\.\\/assets\\/playcanvas\\/approved\\/equipment\\/[A-Za-z0-9_/-]+\\.glb$/.test(entry.url)) return null;
    return entry.url;
  }
  function render(item,fallbackMarkup) {
    const url=approvedModel(item);
    const original=String(fallbackMarkup||'');
    const encoded=escapeHtml(JSON.stringify(channels(item)));
    if(!url) return '<div class="genesisLiveAsset" data-genesis-model-state="licensed-source-pending" data-real-channels="'+encoded+'">'+original+'</div>';
    return '<div class="genesisLiveAsset" data-genesis-model-state="loading" data-real-channels="'+encoded+'">'+
      '<model-viewer class="genesisRealCraftModel" data-genesis-real-model="1" src="'+escapeHtml(url)+'" alt="'+escapeHtml(item.name||'Objeto fabricado')+
      '" camera-controls auto-rotate rotation-per-second="12deg" shadow-intensity=".65" exposure="1.0" environment-image="neutral" interaction-prompt="none"></model-viewer>'+
      '<div class="genesisRealCraftFallback">'+original+'</div></div>';
  }
  function activate(item,scope) {
    const root=(scope||document).querySelector('.genesisHistoricResult');
    if(!root)return {status:'not-mounted'};
    const wrap=root.querySelector('.genesisLiveAsset');
    if(!wrap)return {status:'not-mounted'};
    const viewer=wrap.querySelector('model-viewer[data-genesis-real-model]');
    if(!viewer)return {status:'licensed-source-pending'};
    const hide=()=>{wrap.dataset.genesisModelState='live-glb';wrap.querySelector('.genesisRealCraftFallback')?.setAttribute('hidden','');};
    const failed=()=>{wrap.dataset.genesisModelState='asset-load-failed';wrap.querySelector('.genesisRealCraftFallback')?.removeAttribute('hidden');};
    viewer.addEventListener('load',()=>{
      // model-viewer "load" alone is not a proof of visible geometry.
      if(viewer.loaded && viewer.modelIsVisible)hide();else failed();
    },{once:true});
    viewer.addEventListener('error',failed,{once:true});
    if(viewer.loaded && viewer.modelIsVisible)hide();
    // Real 3D channel effects are a separate asset gate; no fabricated bloom.
    return {status:wrap.dataset.genesisModelState,channels:channels(item)};
  }
  g.GenesisRealCraftViewer=Object.freeze({version:VERSION,channels,approvedModel,render,activate});
})(window);
