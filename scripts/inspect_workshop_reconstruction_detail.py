#!/usr/bin/env python3
import re,json,base64,struct
from pathlib import Path
s=Path('index.html').read_text('utf8')
patterns={'interactables':['function getInteractables','function objectiveTarget','function lineClearTo','function interact(){','debrisCleared','auxCleared'],
'geom':['function wallBlocked','function workshopWallCollision','id="workshopShellModel"','id="modularWalls089"','window.__genesisVillage','const player=','const app='],
'init':['const {Entity','const {Vec3','const pc=','const app','createApp','const W=','function startRoute','function setTutorialStep','function updateInteractionUI'],
'inputs':['addEventListener(\'keydown\'','function frame(now)','function toast','function workPoint','const E=id'],
'visual':['id="workshopShell"','id="wallBrick2A"','Left wall middle'] }
d={}
for group,arr in patterns.items():
 d[group]=[]
 for q in arr:
  matches=list(re.finditer(re.escape(q),s))
  for m in (matches[:1]+matches[-2:] if len(matches)>2 else matches):
   d[group].append({'key':q,'pos':m.start(),'text':s[max(0,m.start()-1000):min(len(s),m.end()+(6500 if q in ('function getInteractables','function lineClearTo','function objectiveTarget','function wallBlocked','function workshopWallCollision','function startRoute') else 2400))]})
# Inspect GLB scene node/material names (no uploading embedded content)
for aid in ['workshopShell','wallBrick2A','wallWoodGrid2A']:
 m=re.search(r'<pc-asset id="'+aid+r'"[^>]*src="data:model/gltf-binary;base64,([^"]+)"',s)
 if not m:continue
 data=base64.b64decode(m.group(1))
 doc=json.loads(data[20:20+struct.unpack_from('<I',data,12)[0]])
 d[aid]={'bytes':len(data),'meshes':len(doc.get('meshes',[])),'nodes':[{'name':n.get('name',''),'mesh':n.get('mesh'),'translation':n.get('translation'),'rotation':n.get('rotation'),'scale':n.get('scale')} for n in doc.get('nodes',[])][:330],
 'materials':[x.get('name') for x in doc.get('materials',[])][:80]}
out=Path('reports/workshop-reconstruction-detail.json')
out.write_text(json.dumps(d,ensure_ascii=False,indent=2),'utf8')
print('WORKSHOP_DETAIL_READY',out.stat().st_size)
