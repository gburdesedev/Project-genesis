#!/usr/bin/env python3
"""Reduce WebKit simultaneous model instantiation and expose phase diagnostics."""
from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old="""const results=await Promise.allSettled(els.map(el=>activateDeferredModel(el,ROUTE_ASSET_TIMEOUT_MS,state=>{
     const size=state.bytes!=null?' · '+(state.bytes/1048576).toFixed(1)+' MiB':' · bytes no informados';
     onProgress?.(loaded,total,asset+' · '+state.phase+size+' · '+state.seconds+' / 120 s');
    })));"""
new="""const results=[];
    for(const el of els){
     const result=await Promise.allSettled([activateDeferredModel(el,ROUTE_ASSET_TIMEOUT_MS,state=>{
      const size=state.bytes!=null?' · '+(state.bytes/1048576).toFixed(1)+' MiB':' · bytes no informados';
      onProgress?.(loaded,total,asset+' · '+state.phase+size+' · '+state.seconds+' / 120 s');
      window.GenesisAssetDiag?.touch?.(describeRouteAsset(asset).url, state.phase, state.bytes, null, state.phase==='error'?asset:'');
     })]);
     results.push(result[0]);
     if(window.GenesisDevice?.safePreviews)await new Promise(r=>requestAnimationFrame(()=>r()));
    }"""
if old not in s:raise SystemExit('Exact route worker block not found')
s=s.replace(old,new,1)
# Preserve diagnostics during readiness; clear existing timer only after all main prep.
# Avoid memory-intensive multiple long-lived webGL model constructors on mobile.
p.write_text(s,encoding='utf-8')
print('Sequential per-asset instantiation patch applied')
