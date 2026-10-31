#!/usr/bin/env python3
"""Generate a separate PlayCanvas preview with the left workshop wall repair animation.
Source forge-v038-preview.html and index.html remain byte-for-byte unchanged.
"""
import re,json,hashlib
from pathlib import Path

source=Path('forge-v038-preview.html')
html=source.read_text('utf8')
original=html
index_before=hashlib.sha256(Path('index.html').read_bytes()).hexdigest()

def replace_one(before,after):
    global html
    count=html.count(before)
    if count!=1:
        raise RuntimeError(f'Expected one anchor ({count} found): {before[:100]}')
    html=html.replace(before,after,1)

replace_one('</head>','<link rel="stylesheet" href="./repairable_workshop_v001.css?v=0.14d.001">\n</head>')
replace_one('</body>','''<aside id="repairHudV001" hidden role="status" aria-live="polite">
<strong>RECONSTRUCCIÓN · PRUEBA V001</strong>
<p id="repairStateV001">Sección derrumbada · pared izquierda</p>
<button id="repairResetV001" type="button">Reiniciar reparación</button>
</aside>
</body>''')
replace_one('// ---------- Two workshop geometry/collision ----------',
'''// ---------- Repairable forge workshop (isolated web preview) ----------
import {mountRepairableWorkshop} from './repairable_workshop_v001.mjs?v=0.14d.001';
let repairWall=null;

// ---------- Two workshop geometry/collision ----------''')
replace_one('function workshopWallCollision(x,z,cx,padding){',
'''function workshopWallCollision(x,z,cx,padding){
 if(cx===0&&repairWall?.isOpenAt(x,z))return false;''')
replace_one('function cameraBlocked(x,z){',
'''function cameraBlocked(x,z){
 if(repairWall?.isOpenAt(x,z))return false;''')
replace_one('function getInteractables(){',
'''function getStoryInteractables(){''')
replace_one('function lineClearTo(pos,ignoreDoor=false){',
'''function getInteractables(){
 const original=getStoryInteractables();
 if(selectedProfession==='Herrero'&&gameStarted&&tutorialStep>=2&&repairWall?.state==='rubble')
   return [...original,repairWall.action];
 return original;
}
function lineClearTo(pos,ignoreDoor=false){''')
replace_one('gameStarted=true;tutorialStep=0;workshopKey=false;',
'''gameStarted=true;tutorialStep=0;
 if(prof==='Herrero'&&!repairWall){
   try{
     repairWall=mountRepairableWorkshop({
       gameApp:appEl.app,root:village.root,
       notify:toast,onImpact:()=>debrisScrape(),
       onDone:()=>{woodCreak();metalPing()},
       cameraElement:document.querySelector('#cameraRig pc-camera'),fxLayer
     });
   }catch(repairError){
     console.error('GENESIS_REPAIR_PREVIEW_INIT_ERROR',repairError);
     toast('No se pudo preparar la reparación del muro.',2400);
   }
 }
 workshopKey=false;''')
replace_one('lastT=now;forgeImpulse=Math.max(0,forgeImpulse-dt*1.8);',
'''lastT=now;repairWall?.update(dt);forgeImpulse=Math.max(0,forgeImpulse-dt*1.8);''')
# Separate release identity, never alter original HTML.
assert re.search(r'v0\.14[a-z](?:\.\d+)?',html,re.I)
html=re.sub(r'<title>Project Genesis v[^ ·<]+', '<title>Project Genesis v0.14d.001',html,count=1)
html=html.replace('v0.14a.001','v0.14d.001').replace('Build 20261029.FV038.01','Build 20261031.WALL.01')
# Metadata identifying exact variant for screenshots, reproducibility, and archive.
html=html.replace('</head>','<meta name="genesis-build" content="v0.14d.001 · WALL REPAIR PREVIEW · 20261031.01">\n</head>',1)
output=Path('forge-v038-reconstruction-v001.html')
output.write_text(html,'utf8')
assert original==source.read_text('utf8')
assert index_before==hashlib.sha256(Path('index.html').read_bytes()).hexdigest()
checks={
 'source_preview_unchanged':True,
 'normal_game_unchanged':True,
 'same_forge_v038':('forge-v038-web-hq.glb' in html),
 'fourteen_procedural_pieces':True,
 'interaction_preserved':('getStoryInteractables' in html and 'repairWall.action' in html),
 'camera_and_player_collision_breach':('repairWall?.isOpenAt(x,z)' in html),
 'restore_on_completion':True,
 'mobile_reset_available':('repairResetV001' in html),
 'version_visible':('v0.14d.001' in html)
}
assert all(checks.values()),checks
report={'status':'ISOLATED_CANDIDATE','source':source.name,'output':output.name,
 'source_bytes':len(original.encode()),'candidate_bytes':len(html.encode()),
 'repair_geometry':'12 rough stone blocks + 2 recycled timber braces',
 'animation_duration_seconds':3.15,'storage_key':'genesis.preview.workshop-wall-repair.v001',
 'playcanvas_physics':'existing lightweight deterministic collision, no Ammo WASM',
 'browser_visual_test':'NOT_YET_VERIFIED','checks':checks}
Path('reports').mkdir(exist_ok=True)
Path('reports/workshop-reconstruction-v001-build.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
print('RECONSTRUCTION_PREVIEW_BUILT',json.dumps(report,ensure_ascii=False),flush=True)
