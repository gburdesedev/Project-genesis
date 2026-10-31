#!/usr/bin/env python3
"""Bounded source excerpts for the forge workshop repair integration, isolated candidate branch."""
import re,json
from pathlib import Path
s=Path('index.html').read_text('utf8')
patterns=[
 'id="forgeModel"','id="forgeStation"','id="chimneySootModel"','id="modularWalls089"',
 'Back wall forge masonry','Right wall forge masonry','forgeCoreEntity',
 'function frame(now)','function igniteForgeVisual','function interact',
 'function tryInteract','function interactWith','function checkInteraction',
 'function setTutorialStep','function chooseProfessionRoute','function setObjective',
 'const E=','const C=','const app=','window.Genesis','gameStarted',
 'addEventListener','function render','forgeHot','collider','collision',
 'pc-rigidbody','pc-collision','pc-entity','function onKeyDown',
 'new pc.','pc.Application','data-asset="wallBrick2A"',
 'const village=','const scene=','const {','let px=','let pz=','player.position',
 'tutorialStep','playerStep','tutorial','sound'
]
contexts={}
for pat in patterns:
  matches=list(re.finditer(re.escape(pat),s,re.I))
  if pat in ['addEventListener','pc-entity','collision','collider','tutorial','sound','const {','new pc.']:
    matches=matches[:8]+matches[-8:]
  else: matches=matches[:14]+matches[-5:]
  contexts[pat]={'count':len(list(re.finditer(re.escape(pat),s,re.I))),'samples':[{'pos':m.start(),'text':s[max(0,m.start()-700):min(len(s),m.end()+1500)]} for m in matches[:18]]}
# Also pull specific long sections for repair placement and movement
long=[]
for pat,before,after in [
 ('id="forgeModel"',2800,3700),
 ('function frame(now)',1000,3500),
 ('function igniteForgeVisual',300,5500),
 ('function chooseProfessionRoute',600,3800),
 ('const E=',800,3000),
 ('id="modularWalls089"',350,6500)
]:
 p=s.find(pat)
 if p>=0:long.append({'pattern':pat,'pos':p,'text':s[max(0,p-before):p+after]})
d={'sha':'HEAD_CANDIDATE','html_bytes':len(s),'lines':s.count('\n')+1,'start':s[:1200],'patterns':contexts,'long':long}
out=Path('reports/workshop-reconstruction-inspection.json')
out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(d,ensure_ascii=False,indent=2),'utf8')
print('INSPECT_OK',len(s),out.stat().st_size,flush=True)
