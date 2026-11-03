#!/usr/bin/env python3
from pathlib import Path
import re
p=Path('index.html');s=p.read_text()
# Diagnostic A/B: temporarily prevent door and forge asset requests and hide their visual entities.
# Preserve original references for one-click restoration.
pattern=r'(<pc-(?:model|asset)\b[^>]*\bid="([^"]+)"[^>]*?)\sasset="([^"]+)"'
hits=[]
def disable(m):
 tag,ident,asset=m.groups()
 if not re.search(r'forge|fragua|door|puerta|bellows|fuelle',ident,re.I):return m.group(0)
 hits.append((ident,asset))
 return tag+' data-disabled-asset="'+asset+'"'
s=re.sub(pattern,disable,s)
# Stop visual components even when they have no asset attribute.
s=s.replace('window.__GENESIS_LITE_BOOT=true;', 'window.__GENESIS_LITE_BOOT=true;window.__GENESIS_TEST_NO_DOOR_FORGE=true;',1)
# Existing route can keep nonvisual door collision/interaction entities.
p.write_text(s)
q=Path('genesis_workshop_live_v015.js');t=q.read_text()
# Do not request production V082 door GLB; keep production walls, roof, chimney.
t=t.replace(" door:'./assets/vendor/genesis/externals/blacksmithDoorV082/src/door-herrero-v082-b.glb'"," // Door intentionally disabled for isolation test")
t=t.replace("const upgraded=sources.door.clone();","const upgraded=null;")
t=t.replace(" upgraded.name='Genesis Herrero V082-B · hierro forjado · hoja arqueada';\n upgraded.setLocalPosition(0,0,0);\n upgraded.setLocalEulerAngles(0,0,0);\n const scale=2.18/1.20;\n upgraded.setLocalScale(scale,1,scale);\n door.addChild(upgraded);","")
t=t.replace("const v082Renderers=new Set(upgraded.findComponents('render'));","const v082Renderers=new Set();")
q.write_text(t)
print('Disabled door/forge asset attributes:',hits)
