#!/usr/bin/env python3
"""Safe, idempotent boot diagnostics patch, produced/tested on GitHub runner."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
index=root/'index.html'
data=index.read_text(encoding='utf-8')
def once(old,new,name):
 global data
 if old in data:
  assert data.count(old)==1,(name,'unexpected count',data.count(old))
  data=data.replace(old,new,1)
 elif new not in data:
  raise RuntimeError('Cannot locate '+name)
once('</head>','<script src="./genesis_asset_diagnostics_v001.js?v=20261103.1"></script>\n</head>','diagnostic early hook')
once('const bootWait=(promise,label,timeout=18000)=>','const bootWait=(promise,label,timeout=120000)=>','boot model readiness timeout')
once("bootWait(whenReady(selector),selector,18000)","bootWait(whenReady(selector),selector,120000)",'animation fallback timeout')
once("const deadline=performance.now()+90000;","const deadline=performance.now()+120000;",'architecture timeout')
once("await Promise.all(tasks.map(async item=>{","await (window.GenesisDevice?.safePreviews ? (async()=>{for(const item of tasks){await (async()=>{", 'mobile initial serialize start')
once("   }));\n  }\n  const [p,o,c]=", "   })()}})() : Promise.all(tasks.map(async item=>{await bootWait(item.el.ready(),item.label);if(item.kind==='modelo'&&!item.el.contentEntity)throw new Error('No pudo instanciarse: '+item.label);prepared++;bootProgress.prepared=prepared;bootGroups[group].ready++;showBootProgress(groupStage(group),item.label+' · '+bootGroups[group].ready+' de '+bootGroups[group].total)})));\n  }\n  const [p,o,c]=", 'mobile initial serialize end')
# At boot arrival, load the full Herrero route before showing selection.
once("setLoadUI(100,'Núcleo listo','Edric, cámara y controles preparados. El taller se cargará después de elegir profesión.');clearInterval(loadTimer);",
     "await prepareRoute('Herrero');setLoadUI(100,'Juego completo listo','Herrero preparado antes de elegir profesión.');clearInterval(loadTimer);",
     'eager Herrero admission')
# Mobile-only 1-worker admission; desktop remains at 3. Protect WebKit decode.
once("await Promise.all(Array.from({length:Math.min(3,total)},worker));",
     "await Promise.all(Array.from({length:Math.min(window.GenesisDevice?.safePreviews?1:3,total)},worker));",
     'mobile resource worker budget')
# Model instance creation grouped by asset and serialized on mobile.
once("const results=await Promise.allSettled(els.map(el=>activateDeferredModel(el,ROUTE_ASSET_TIMEOUT_MS,state=>{",
     "const results=await Promise.allSettled(els.map(async (el,index)=>{if(window.GenesisDevice?.safePreviews&&index>0){for(let i=0;i<index;i++)while(!els[i].contentEntity&&els[i].dataset.asset===asset)await sleep(100)}return activateDeferredModel(el,ROUTE_ASSET_TIMEOUT_MS,state=>{",
     'serial resource instance start')
once("onProgress?.(loaded,total,asset+' · '+state.phase+size+' · '+state.seconds+' / 120 s');\n    })));",
     "onProgress?.(loaded,total,asset+' · '+state.phase+size+' · '+state.seconds+' / 120 s');\n    })}));",
     'serial resource instance end')
index.write_text(data,encoding='utf-8')
# This manifest supplies actual bytes for local assets; remote files use reported Content-Length.
assets={}
for prefix in ('assets/vendor/genesis/externals','assets/playcanvas/approved','assets/ui'):
 p=root/prefix
 if p.exists():
  for file in p.rglob('*'):
   if file.is_file() and file.suffix.lower() in ('.glb','.gltf','.bin','.png','.jpg','.jpeg','.webp','.ktx2'):
    assets['./'+file.relative_to(root).as_posix()]=file.stat().st_size
(root/'tools/genesis_asset_sizes.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Boot patched, local resources indexed:',len(assets),'bytes in HTML:',len(data))
