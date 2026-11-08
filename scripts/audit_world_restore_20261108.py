#!/usr/bin/env python3
"""Read-only forensic audit: current v014032 versus legacy v014031 world+NPC+cinematics."""
from pathlib import Path
from urllib.request import urlopen
import re,json
cur=Path('index.html').read_text(encoding='utf-8')
url='https://raw.githubusercontent.com/gburdesedev/Project-genesis/experiment/v014031-fuelle-inventario-aprobado-20261107/index.html'
legacy=urlopen(url,timeout=60).read().decode('utf-8')
patterns={
 'world_mode':r'__GENESIS_LITE_BOOT',
 'world_constructor':r'mountVillage\(',
 'market_api':r'mountGenesisMarket',
 'market_import':r'genesis_market_v001',
 'market_quest':r'GenesisMarketQuest|genesis_market_quest_v001',
 'market_cinematic':r'GenesisMarketCinematic|genesis_market_cinematic_v001',
 'arrival':r'arrival|introCinematic|arrivalCinematic|cinematicaLlegada|cinematicArrival|startArrival|introWalk|autoWalk',
 'merchant_entity':r'marketMerchant|Mercader|Comerciante|merchant',
 'fountain':r'genesisFountain|fountain|fuente',
 'stage':r'beginVillage|loadVillage|villageReady|village\.root|villagePromise',
 'quest':r'questStep|questPhase|questStage|startMarket',
 'animation':r'playerAnim|ordanAnim|npcOrdan',
}
for name,src in [('current',cur),('legacy',legacy)]:
 print('AUDIT_VERSION',name,'bytes',len(src))
 for key,pat in patterns.items():
  ms=list(re.finditer(pat,src,re.I))
  print('AUDIT',name,key,'count',len(ms))
  for m in ms[:7]:
   start=max(0,m.start()-310);end=min(len(src),m.end()+480)
   print('EXCERPT',name,key,'line',src.count('\n',0,m.start())+1,repr(src[start:end]))
 print('REFERENCES',name)
 for line_no,line in enumerate(src.splitlines(),1):
  if any(x in line for x in ['genesis_market_v001.js','genesis_market_cinematic_v001.js','genesis_market_quest_v001.js','genesisFountainV011','genesis_market_domain','genesis_ui_approved','village_world.js']):
   print('REF',name,line_no,line[:500])
print('FILES_EXIST',json.dumps({x:Path(x).exists() for x in ['genesis_market_v001.js','genesis_market_cinematic_v001.js','genesis_market_cinematic_v001.css','village_world.js','village_trees.js','assets/playcanvas/approved/characters/merchant_v02_75962.glb']}))
