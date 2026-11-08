from pathlib import Path
from urllib.request import urlopen
import re
cur=Path('index.html').read_text()
legacy=urlopen('https://raw.githubusercontent.com/gburdesedev/Project-genesis/experiment/v014031-fuelle-inventario-aprobado-20261107/index.html',timeout=60).read().decode('utf-8')
for name,src in [('current',cur),('legacy',legacy)]:
 lines=src.splitlines()
 print('SOURCE',name,len(src))
 for pat in ['function startRoute(prof)', 'async function chooseProfessionRoute(prof)', 'function setWalking(', 'function frame(now)', 'const canMove=', 'let marketEscortWaypoint=', 'let gameStarted=', 'let marketCinematic=', 'marketCinematic=null', 'clearMovementInput()', 'marketCinematic?.active', 'let px=', 'intro.style.display=']:
  found=[(i+1,l) for i,l in enumerate(lines) if pat in l]
  print('TARGET',name,pat,'found',len(found))
  for i,line in found[:4]:print('SOURCE_LINE',name,i,line[:10000])
 print('CINEMATIC_BLOCK_START')
 st=next((i for i,l in enumerate(lines) if l.startswith('function marketCinemaBars()')),None)
 if st is not None:
  for i in range(st,min(st+80,len(lines))):
   print('CINEMA_LINE',i+1,lines[i])
 print('END')
