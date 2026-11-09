#!/usr/bin/env python3
"""Prepare the actual V038 game build with ONLY the malformed GLB URL repaired.
Preserves all existing workshop logic, UI, collision, and ember/light animation.
"""
from pathlib import Path
import json
src=Path('forge-v038-preview.html')
out=Path('forge-v038-fixed-preview.html')
original='https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/production/auto-forge-breathing-coals-v038/public/models/forge-v038-web-hq.glb'
repaired='https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/feature/playcanvas-herrero-arcanista-walls-preview/public/models/Forge_V038_HeaderFixed_Preview.glb'
s=src.read_text(encoding='utf8')
assert original in s, 'Current V038 preview does not contain expected forge GLB reference; refusing speculative replacement.'
assert s.count(original) == 1, 'Refusing replacement because more than one forge reference exists.'
new=s.replace(original,repaired)
assert len(new)>1000000 and repaired in new and original not in new
out.write_text(new,encoding='utf8')
report={'status':'STATIC_V038_BROWSER_PREVIEW','source':str(src),'output':str(out),
'forge_glb_original':original,'forge_glb_repaired':repaired,'replacements':1,
'game_logic_untouched':True,'menu_art_untouched':True,'approval':'PENDING_BROWSER_AND_VISUAL'}
Path('reports/forge-v038-fixed-preview.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
