#!/usr/bin/env python3
"""V0.14.022 only: swap uncontrolled pc-asset boot for controlled streamed queue.
No camera, quest, entity transform, NPC, approved model, or game state edits.
"""
import re
from pathlib import Path

path=Path("index.html")
src=path.read_text(encoding="utf-8")
if "genesis_v014022_stream_loader.js" in src:
    raise SystemExit("Already patched: refusing repeat")
def replace_exact(a,b,n=1):
    global src
    if src.count(a)!=n:
        raise RuntimeError("Expected %d occurrences (found %d) of: %s"%(n,src.count(a),a[:140]))
    src=src.replace(a,b)

replace_exact('<script src="./device_policy.js?v=0.11.017"></script>',
              '<script src="./device_policy.js?v=0.11.017"></script>\n<script src="./genesis_v014022_stream_loader.js?v=0.14.022-stream-v001"></script>')
style="""
/* GENESIS STREAM V014022: diagnostics replaces, not supplements, six old groups. */
#loadGroups{display:none!important}
.loadingCard{width:min(900px,98vw)!important;max-height:calc(100dvh - 8px)!important;min-height:min(360px,96dvh);padding:11px 13px!important;display:flex;flex-direction:column;gap:3px}
.loadingCard>h1{font-size:clamp(16px,2.5vw,25px)!important;margin:1px 0!important;line-height:1.12}
.loadingCard>p,.loadingCard>.spinner{display:none!important}
.loadingCard .loadProgress{margin:5px 0 2px!important;height:9px}
.loadingCard #loadCount{margin:2px!important;font-size:12px}
.loadingCard #loadDetail{margin:3px 0 0;max-height:30px;overflow:auto}
#genesisAssetDetails{width:100%;flex:1;min-height:130px;margin:3px 0 0!important;padding:7px!important;display:flex;flex-direction:column;overflow:hidden}
#genesisAssetDetails>div:first-child{flex:none;min-height:26px}
#genesisAssetRows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;align-content:start;flex:1;min-height:50px;max-height:unset!important;overflow-y:auto!important}
#genesisAssetRows>div{background:#102b3c;border:1px solid #4a6b7c!important;border-radius:5px;padding:5px!important;font:11px/1.35 ui-monospace,monospace;min-height:31px;overflow-wrap:anywhere}
#genesisTransportMeta{text-align:left;color:#f1c77a;font:11px/1.2 ui-monospace,monospace}
#loadRetry{flex:none;margin:3px auto!important}
@media(max-height:450px){
 .loadingCard{min-height:0;padding:6px 9px!important;gap:2px}
 .loadingCard>h1{font-size:clamp(12px,2.2vw,17px)!important}
 #genesisAssetDetails{min-height:95px!important}
 #genesisAssetRows>div{font-size:10px!important;padding:3px!important;min-height:22px}
 #loadDetail{display:none}
}
"""
replace_exact('</style>',style+'</style>')
# We retain original pc-asset tags and URLs exactly, but prevent eager loading.
assets=0
def lazy_asset(match):
    global assets
    tag=match.group(0)
    if 'src=' not in tag or ' lazy' in tag or re.search(r'\bsrc="data:',tag):
        return tag
    assets+=1
    return tag[:-1]+' lazy>'
src=re.sub(r'<pc-asset\b[^>]*>',lazy_asset,src)
if assets!=5:raise RuntimeError("Expected 5 original eager pc-assets, found "+str(assets))

# Preserve entire original PC model hierarchy and all transforms. Only defer
# the attribute that makes the browser automatically request the model.
boot_models=0
def model_attr(match):
    global boot_models
    tag=match.group(0)
    if 'data-route=' in tag or not re.search(r'\sasset="',tag):return tag
    boot_models+=1
    return re.sub(r'\sasset="([^"]+)"',r' data-genesis-boot-asset="\1"',tag,count=1)
src=re.sub(r'<pc-model\b[^>]*>',model_attr,src)
if boot_models!=7:raise RuntimeError("Expected 7 initial model elements, found "+str(boot_models))

clips=0
def clip_attr(match):
    global clips
    tag=match.group(0)
    if not re.search(r'\sasset="',tag):return tag
    clips+=1
    return re.sub(r'\sasset="([^"]+)"',r' data-genesis-boot-asset="\1"',tag,count=1)
src=re.sub(r'<pc-anim-clip\b[^>]*>',clip_attr,src)
if clips<30:raise RuntimeError("Unexpected clip count "+str(clips))
# Zero default native network downloads; the streamer requests assets by ID.
replace_exact("const bootPrepTotal=[...document.querySelectorAll('pc-model[asset]:not([data-route])'),",
              "const bootPrepTotal=[...document.querySelectorAll('pc-model[data-genesis-boot-asset]:not([data-route])'),")
replace_exact("const modelEls=[...document.querySelectorAll('pc-model[asset]:not([data-route])')];",
              "const modelEls=[...document.querySelectorAll('pc-model[data-genesis-boot-asset]:not([data-route])')];")
replace_exact("const label=(item.label+' '+(item.el.getAttribute('asset')||'')).toLowerCase();",
              "const label=(item.label+' '+(item.el.getAttribute('asset')||item.el.dataset.genesisBootAsset||'')).toLowerCase();")
replace_exact("window.GenesisFPS.attach(appEl.app,document.getElementById('tech'));",
              "window.GenesisStreamLoader.setApp(appEl.app);\n window.GenesisStreamLoader.setRetryHandler(loaderRetryDelay);\n window.GenesisFPS.attach(appEl.app,document.getElementById('tech'));")
start=src.find(" async function bootPrepareItem(item){")
end=src.find(" // Each group has a truthful,",start)
if start<0 or end<start:raise RuntimeError("Boot preparation anchors absent")
new_boot=""" async function bootPrepareItem(item){
  const originalId=item.el.dataset.genesisBootAsset;
  let attempt=0;
  while(true){
   try{
    // This is the actual download and decode gate. pc-model/clip cannot
    // auto-request; we expose their asset only after the streamed asset loads.
    if(originalId){
     await window.GenesisStreamLoader.prepare(originalId);
     if(item.el.getAttribute('asset')!==originalId)item.el.setAttribute('asset',originalId);
    }
    await bootWait(item.el.ready(),item.label);
    if(item.kind==='modelo'&&!item.el.contentEntity)throw new Error('No pudo instanciarse: '+item.label);
    return;
   }catch(error){
    attempt++;
    await loaderRetryDelay(item.label,attempt,error?.message||String(error));
    if(originalId&&item.el.getAttribute('asset')===originalId){
     item.el.removeAttribute('asset');
     await new Promise(resolve=>setTimeout(resolve,80));
    }
   }
  }
 }
"""
src=src[:start]+new_boot+src[end:]
# Native progress counters never own the UI. The new transport is sole source.
start=src.find("function showBootProgress(stage,detail=''){")
end=src.find("if(bootState.total>0)syncPreloadProgress",start)
if start<0 or end<start:raise RuntimeError("Preload UI anchors absent")
src=src[:start]+"""function showBootProgress(stage,detail=''){
 if(stage)loadState.textContent=stage;
 if(detail)loadDetail.textContent=detail;
 window.GenesisStreamLoader?.render?.();
}
function syncPreloadProgress(){
 window.GenesisStreamLoader?.render?.();
}
"""+src[end:]
# All deferred routes use the same streamed and retryable transport.
replace_exact("try{return await loadDeferredModelAsset(el,primary,timeout)}catch(primaryError)",
              "try{await window.GenesisStreamLoader.prepare(primary,{maxAttempts:fallback?2:Infinity});return await loadDeferredModelAsset(el,primary,timeout)}catch(primaryError)")
replace_exact("try{return await loadDeferredModelAsset(el,fallback,Math.min(timeout,8000))}catch(fallbackError)",
              "try{await window.GenesisStreamLoader.prepare(fallback);return await loadDeferredModelAsset(el,fallback,Math.min(timeout,8000))}catch(fallbackError)")
# Transport telemetry area sits adjacent to per-file boxes.
replace_exact('<div id="loadCount" aria-live="polite">Identificando recursos de la partida...</div>',
              '<div id="loadCount" aria-live="polite">GENESIS STREAM · Identificando recursos...</div>\n   <div id="genesisTransportMeta">Descarga controlada · máximo 3 archivos simultáneos</div>')
path.write_text(src,encoding="utf-8")
print("Patched V014022 stream engine: %d deferred asset URLs, %d boot models, %d clip bindings"%(assets,boot_models,clips))
assert "genesis_v014022_stream_loader.js" in src
assert 'data-genesis-boot-asset="peasantMale086"' in src
assert 'data-genesis-boot-asset="ual1086"' in src
