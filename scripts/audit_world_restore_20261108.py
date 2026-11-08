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

print('=== FOCUSED LOGIC COMPARISON ===')
for name,src in [('current',cur),('legacy',legacy)]:
 lines=src.splitlines()
 print('FOCUS',name,'lines',len(lines))
 key_rx=re.compile(r'cinema|cinem[aá]t|letterbox|escort|mentorFollow|auto.?walk|intro.?walk|marketCinematic|arrivalSequence|startIntro|enterVillage|tour|spawn|tutorialStep.*(talk|escort|shop)',re.I)
 items=[(i+1,l.strip()) for i,l in enumerate(lines) if key_rx.search(l)]
 print('SYMBOL_HITS',name,len(items))
 for i,l in items[:100]:print('SYMBOL',name,i,l[:320])
 functions=[(i+1,l.strip()) for i,l in enumerate(lines) if re.match(r'\\s*(?:async\\s+)?function\\s+[A-Za-z_][A-Za-z0-9_]*\\s*\\(',l)]
 for i,l in functions:
  if re.search(r'escort|cinema|arrival|mentor|profession|intro|camera|tutorial|market|start|update',l,re.I):
   print('FUNCTION',name,i,l[:240])
for start,end in [(1220,1290),(1310,1450),(1820,1895)]:
 for name,src in [('current',cur),('legacy',legacy)]:
  lines=src.splitlines();print('FOCUSED_RANGE',name,start,end)
  for i in range(start-1,min(end,len(lines))):
   l=lines[i]
   if any(t in l for t in ['mentor','Ordan','Cinematic','escort','market','Mercado','cinema','setTutorialStep','pointerLock','gameStarted','intro','chosenProfession','activeRoute','walk']) or (start<=i+1<=end and len(l)<170):
    print('LINE',name,i+1,l[:400])
