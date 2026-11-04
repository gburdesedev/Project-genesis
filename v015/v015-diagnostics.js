/* Project Genesis v0.15: isolated development diagnostics; no gameplay changes. */
(function(){
  const started=performance.now(), events=[], assets=new Map(), blocks=new Map();
  const now=()=>Math.round(performance.now()-started);
  function emit(kind,id,status,detail={}){
    const e={atMs:now(),kind,id,status,...detail};events.push(e);
    if(events.length>3000)events.shift();
    if(status==='error'||status==='timeout')console.error('[Genesis v015]',e);
    else console.info('[Genesis v015]',e);
    render();return e;
  }
  function block(id,phase,detail={}){blocks.set(id,{phase,atMs:now(),...detail});return emit('block',id,phase,detail)}
  function asset(id,phase,detail={}){assets.set(id,{phase,atMs:now(),...assets.get(id),...detail});return emit('asset',id,phase,detail)}
  const panel=document.createElement('aside');panel.id='genesis-v015-diagnostics';
  panel.style.cssText='position:fixed;right:8px;top:8px;width:min(430px,45vw);max-height:65vh;overflow:auto;background:#091018ed;color:#e3eef5;border:1px solid #688;padding:10px;z-index:999999;font:12px monospace;white-space:pre-wrap;pointer-events:auto';
  function render(){
    if(!panel.isConnected)return;
    const last=events.slice(-24).map(e=>e.atMs+'ms '+e.kind+' '+e.id+' '+e.status+(e.loaded!=null?' '+e.loaded+'/'+(e.total||'?')+' bytes':'')+(e.message?' '+e.message:''));
    panel.textContent='GENESIS V0.15 DIAGNOSTICS\n'+last.join('\n');
  }
  function download(id,url,{idleTimeoutMs=120000}={}){
    asset(id,'request',{url,loaded:0,total:null});
    const ctrl=new AbortController();let last=performance.now(),reader;
    const watchdog=setInterval(()=>{if(performance.now()-last>idleTimeoutMs){asset(id,'timeout',{message:'No download progress for '+idleTimeoutMs+'ms'});ctrl.abort()}},1000);
    return (async()=>{
      try{
        const response=await fetch(url,{signal:ctrl.signal});
        if(!response.ok)throw Error('HTTP '+response.status);
        const total=Number(response.headers.get('content-length'))||null;
        asset(id,'downloading',{total});
        reader=response.body?.getReader();
        if(!reader){const data=await response.arrayBuffer();asset(id,'downloaded',{loaded:data.byteLength,total});return data}
        let loaded=0;const chunks=[];
        while(true){
          const next=await reader.read();if(next.done)break;
          loaded+=next.value.byteLength;chunks.push(next.value);last=performance.now();
          asset(id,'downloading',{loaded,total});
        }
        const bytes=new Uint8Array(loaded);let pos=0;
        for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.byteLength}
        asset(id,'downloaded',{loaded,total});
        return bytes.buffer;
      }catch(error){asset(id,'error',{message:String(error?.message||error),stack:String(error?.stack||'')});throw error}
      finally{clearInterval(watchdog);reader?.releaseLock?.()}
    })();
  }
  window.addEventListener('error',e=>emit('runtime','uncaught','error',{message:e.message,stack:String(e.error?.stack||''),source:e.filename,line:e.lineno}));
  window.addEventListener('unhandledrejection',e=>emit('runtime','promise','error',{message:String(e.reason?.message||e.reason),stack:String(e.reason?.stack||'')}));
  window.GenesisV015Diagnostics={block,asset,download,events,assets,blocks,exportJSON(){return JSON.stringify({build:'v0.15 V015',events,assets:Object.fromEntries(assets),blocks:Object.fromEntries(blocks)},null,2)}};
  document.addEventListener('DOMContentLoaded',()=>{if(new URLSearchParams(location.search).get('debug')==='1'){document.body.appendChild(panel);render()}});
  emit('block','bootstrap','started');
})();
