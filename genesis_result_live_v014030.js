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
    // The source SHA identifies the original V03/V175 mesh; it does NOT
    // certify the V12B game export or grant a redistribution licence.
    if(!entry || entry.status!=='approved' || entry.gameExportApproved!==true ||
       entry.distributionRightsConfirmed!==true ||
       entry.sourceSha256!==SWORD_SHA || entry.recipe!=='espada_hierro' ||
       entry.materialPreset!=='Genesis_Espada_V03_Hierro_V175_V12B' ||
       !/^[a-f0-9]{64}$/.test(entry.exportSha256||'') ||
       entry.exportSha256===SWORD_SHA ||
       typeof entry.url!=='string' || !/^\.\/assets\/playcanvas\/approved\/equipment\/[A-Za-z0-9_/-]+\.glb$/.test(entry.url)) return null;
    return entry.url;
  }
  function render(item,fallbackMarkup) {
    const url=approvedModel(item);
    const original=String(fallbackMarkup||'');
    const encoded=escapeHtml(JSON.stringify(channels(item)));
    if(!url) return '<div class="genesisLiveAsset" data-genesis-model-state="licensed-source-pending" data-real-channels="'+encoded+'">'+original+'</div>';
    return '<div class="genesisLiveAsset" data-genesis-model-state="loading" data-real-channels="'+encoded+'">'+
      '<model-viewer class="genesisRealCraftModel" data-genesis-real-model="1" data-genesis-real-src="'+escapeHtml(url)+'" alt="'+escapeHtml(item.name||'Objeto fabricado')+
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
    const entry=g.GenesisApprovedRuntimeModels?.espada_hierro;
    const fallback=wrap.querySelector('.genesisRealCraftFallback');
    const failed=()=>{
      wrap.dataset.genesisModelState='asset-load-failed';
      fallback?.removeAttribute('hidden');
    };
    const source=viewer.getAttribute('data-genesis-real-src');
    const exportSha=entry?.exportSha256;
    // Validate actual GLB BYTES before giving them to the renderer.
    // Metadata alone is not proof of an authentic V12B game export.
    (async()=>{
      if(!source || !g.crypto?.subtle || !g.fetch || !g.URL?.createObjectURL)throw Error('3D verification unavailable');
      const response=await g.fetch(source,{credentials:'same-origin',cache:'force-cache'});
      if(!response.ok)throw Error('Approved model unavailable: '+response.status);
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength<12)throw Error('Empty/corrupt GLB');
      const view=new DataView(bytes);
      if(view.getUint32(0,true)!==0x46546c67 || view.getUint32(4,true)!==2 || view.getUint32(8,true)!==bytes.byteLength)
        throw Error('Invalid GLB 2.0 header');
      const digest=await g.crypto.subtle.digest('SHA-256',bytes);
      const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      if(actual!==exportSha)throw Error('V12B game GLB SHA-256 mismatch');
      if(!root.isConnected)return;
      const objectUrl=g.URL.createObjectURL(new g.Blob([bytes],{type:'model/gltf-binary'}));
      const cleanup=()=>g.URL.revokeObjectURL(objectUrl);
      viewer.addEventListener('load',()=>{
        if(viewer.loaded && viewer.modelIsVisible){
          wrap.dataset.genesisModelState='live-glb';
          fallback?.setAttribute('hidden','');
        }else failed();
        cleanup();
      },{once:true});
      viewer.addEventListener('error',()=>{failed();cleanup();},{once:true});
      viewer.setAttribute('src',objectUrl);
    })().catch(e=>{
      failed();
      console.warn('[Genesis V014.030] Authentic 3D unavailable:',e.message);
    });
    // Each real NGE channel is recorded, but independent 3D VFX assets
    // MUST be approved and mounted separately; never synthesize fake bloom.
    return {status:wrap.dataset.genesisModelState,channels:channels(item)};
  }
  g.GenesisRealCraftViewer=Object.freeze({version:VERSION,channels,approvedModel,render,activate});
})(window);
