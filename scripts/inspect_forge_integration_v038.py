#!/usr/bin/env python3
"""Inspect current PlayCanvas release without changing its gameplay."""
import re,json
from pathlib import Path
root=Path('.')
html=(root/'index.html').read_text(encoding='utf8')
patterns=[
 r'forge',r'fragua',r'brasas',r'coal',r'ember',r'glow',r'\.glb',r'new pc\.Application',
 r'pc\.Application',r'createForge',r'forgeGroup',r'forgeMesh',r'window\.app',
 r'function create',r'playcanvas',r'case.*forge'
]
output={'bytes':len(html.encode()),'lines':html.count('\n')+1,'start':html[:900],
        'ending':html[-1200:],'matches':{}}
for pat in patterns:
    m=list(re.finditer(pat,html,re.I))
    # systematic snippets spread across source, for code inside large inline scripts
    chosen=(m[:25]+m[-12:]) if len(m)>37 else m
    seen=set();parts=[]
    for a in chosen:
        if a.start() in seen:continue
        seen.add(a.start())
        lo=max(0,a.start()-390); hi=min(len(html),a.end()+850)
        parts.append({'offset':a.start(),'snippet':html[lo:hi]})
    output['matches'][pat]={'count':len(m),'fragments':parts}
for path in root.glob('*.js'):
    content=path.read_text('utf-8',errors='replace')
    output.setdefault('external_js',{})[str(path)]={'bytes':len(content),'matches':[{'offset':m.start(),'snippet':content[max(0,m.start()-160):m.end()+380]} for m in list(re.finditer('forge|fragua|ember|coal',content,re.I))[:15]]}
dest=root/'reports'/'forge-v038-code-inspection.json'
dest.parent.mkdir(exist_ok=True,parents=True)
dest.write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf8')
print('INSPECTION_COMPLETE',len(html),dest, dest.stat().st_size, flush=True)
