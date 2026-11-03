#!/usr/bin/env python3
"""Produce focused boot source excerpts without publishing the 2.4MB index."""
from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf-8')
lines=s.splitlines()
terms=[
 r'recursos listos',r'ERROR DE CARGA',r'REINTENTAR CARGA',r'prepareRoute',
 r'boot.*(gate|asset|error|progress|ready)',r'load.*(asset|resource|model)',
 r'Promise\.all',r'fetch\(',r'XMLHttpRequest',r'pc\.app',r'asset\.ready',
 r'resource.*(total|count)',r'Paredes',r'Árboles',r'Animaciones',
]
hits=[]
for term in terms:
 pattern=re.compile(term,re.I)
 matches=[i for i,line in enumerate(lines) if pattern.search(line)]
 for i in matches[:18]:
  hits.append((i,term))
hits.sort()
out=['# Index boot locations','Characters: '+str(len(s)),'Lines: '+str(len(lines))]
seen=set()
for i,term in hits[:150]:
 start=max(0,i-7);end=min(len(lines),i+12)
 if any(j in seen for j in range(start,end)):continue
 seen.update(range(start,end))
 out.append('\n### '+str(i+1)+' ('+term+')')
 out.extend(f'{j+1}: {lines[j][:280]}' for j in range(start,end))
Path('tools/boot_inspection_excerpts.txt').write_text('\n'.join(out)[:120000],encoding='utf-8')
print('Extracted',len(hits),'matches; output',len(out),'lines')

# Focused exact blocks for editing
for first,last in [(900,1135),(1650,1805)]:
 out=['# Boot source lines '+str(first)+'-'+str(last)]
 out.extend(f'{i+1}: {lines[i]}' for i in range(first-1,min(last,len(lines))))
 Path(f'tools/boot_source_{first}_{last}.txt').write_text('\n'.join(out),encoding='utf-8')
