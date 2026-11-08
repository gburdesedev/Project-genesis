from pathlib import Path
from urllib.request import urlopen
import re
cur=Path('index.html').read_text()
legacy=urlopen('https://raw.githubusercontent.com/gburdesedev/Project-genesis/experiment/v014031-fuelle-inventario-aprobado-20261107/index.html',timeout=60).read().decode('utf-8')
for name,src in [('current',cur),('legacy',legacy)]:
 lines=src.splitlines()
 print('FOCUS',name,'total_lines',len(lines))
 for i,l in enumerate(lines):
  if l.lstrip().startswith(('function ','async function ')):
   if re.search(r'Ordan|Arrival|arrive|intro|mentor|cinematic|Cinematic|escort|Route|start|update',l,re.I):
    print('FUNCTION',name,i+1,l[:250])
 for token in ['let marketCinematic','startOrdanMarketEscort','updateOrdanMarketEscort','function startRoute','function startIntro','introArrival','cinematic','letterbox','arrival','setTutorialStep','marketEscortWaypoint','function update(']:
  hits=[i+1 for i,l in enumerate(lines) if token in l]
  print('HITS',name,token,':',hits[:35])
 for start,end in ([(1255,1310),(1320,1434),(1818,1845)] if name=='current' else [(1348,1443),(1980,2025),(1110,1188)]):
  print('RANGE',name,start,end)
  for i in range(start-1,min(end,len(lines))):
   print('CODE',name,i+1,lines[i][:320])
