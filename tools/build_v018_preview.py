#!/usr/bin/env python3
"""Build isolated V018 from existing V017.1 without changing any approved assets."""
import json,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'v017'
OUT=ROOT/'v018'
APPROVED=ROOT/'assets/playcanvas/approved/workshops/herrero/doors/v082-b/door-herrero-v082-b.glb'
TEXTURES=OUT/'assets/experimental/herrero-v082-b-textures'
if OUT.exists():shutil.rmtree(OUT)
shutil.copytree(BASE,OUT)
TEXTURES.mkdir(parents=True,exist_ok=True)
subprocess.run([sys.executable,str(ROOT/'tools/v018_herrero_lossless_webp.py'),str(APPROVED),str(TEXTURES)],check=True)
candidate=TEXTURES/'door-herrero-v082-b-lossless-webp-candidate.glb'
assert candidate.stat().st_size<APPROVED.stat().st_size*0.60
oldsave='project-genesis/canvas-original/v017-preview'
newsave='project-genesis/canvas-original/v018-preview'
for f in OUT.rglob('*'):
    if f.suffix in ('.js','.json','.html','.css','.md') and f.is_file():
        t=f.read_text('utf-8')
        if oldsave in t:f.write_text(t.replace(oldsave,newsave),'utf-8')
scene=OUT/'v017-village.js'
s=scene.read_text('utf-8')
def patch(old,new,why):
    global s
    count=s.count(old)
    if count!=1:raise AssertionError(f'{why}: expected 1 match, got {count}')
    s=s.replace(old,new)
patch('const ROOF_BOOST=1.30*1.35;', 'const ROOF_BOOST=1.20;', 'roof only +20%')
patch('const NAMES=Object.freeze({', 'const DOOR_LEAF_CENTER_X=0.603; // verified GLB pivot\n const NAMES=Object.freeze({','pivot constant')
patch("hinge.setLocalPosition(-1.10,0,.12);","hinge.setLocalPosition(-DOOR_LEAF_CENTER_X*HORIZONTAL,0,.12);",'herrero true hinge')
patch("const door=addModel(resources,hinge,'door-herrero-v082-b','Herrero V082-B · hierro aprobado');",
      "const door=addModel(resources,hinge,'door-herrero-v082-b','Herrero V082-B · textura lossless en prueba',[0,0,0],[HORIZONTAL,1,HORIZONTAL]);",
      'herrero leaf scales with opening')
patch("pivot.setLocalPosition(0,0,.12);","pivot.setLocalPosition(-DOOR_LEAF_CENTER_X*HORIZONTAL,0,.12);",'arcanista aligned')
patch("const visual=addModel(resources,pivot,'door-arcanista-v027','Arcanista V027 · puerta arcana iluminada aprobada');",
      "const visual=addModel(resources,pivot,'door-arcanista-v027','Arcanista V027 · puerta arcana iluminada aprobada',[0,0,0],[HORIZONTAL,1,HORIZONTAL]);",
      'arcanista scales with opening')
patch('doorAngle=gate()>=1?-92:0;','doorAngle=gate()>=1?90:0;','initial inward direction')
patch('const desired=gate()>=1?-92:0;','const desired=gate()>=1?90:0;','animate inward')
patch("installed:true,version:'V017.1',count:buildings.length,",
      "installed:true,version:'V018',count:buildings.length,roofBoost:ROOF_BOOST,",'scene version/roof')
patch("map:'GenesisVillagePlan / original workshop coordinates',",
      "herreroDoor:{hingeLocal:[-DOOR_LEAF_CENTER_X*HORIZONTAL,0,.12],leafScale:[HORIZONTAL,1,HORIZONTAL],closedAngle:0,inwardAngle:90,textureVariant:'lossless-webp-candidate'},\n      arcanistaDoor:{hingeLocal:[-DOOR_LEAF_CENTER_X*HORIZONTAL,0,.12],leafScale:[HORIZONTAL,1,HORIZONTAL],closed:true,woodFallback:false},\n      map:'GenesisVillagePlan / original workshop coordinates',",
      'scene transform QA metadata')
scene.write_text(s,'utf-8')
manifest=OUT/'manifest.json'
m=json.loads(manifest.read_text('utf-8'))
assert m['version']=='0.15-v017.1'
m['version']='0.15-v018-preview'
m['revision']='V018 preview · reduced Herrero material + door alignment'
m['note']='V018 PREVIEW; V017.1 and approved GLBs untouched. WebP candidate awaits browser/visual approval.'
assert m['canvasOriginal']['progressStore']==newsave
e=next(e for e in m['workshopAssets'] if e['id']=='door-herrero-v082-b')
assert e['version']=='V082-B'
e['file']='./assets/experimental/herrero-v082-b-textures/door-herrero-v082-b-lossless-webp-candidate.glb'
e['approval']='experimental_lossless_texture_reencoding_of_approved_v082-b'
e['version']='V082-B / WebP lossless candidate'
e['originalApprovedMaster']='../assets/playcanvas/approved/workshops/herrero/doors/v082-b/door-herrero-v082-b.glb'
e['originalBytes']=APPROVED.stat().st_size
e['candidateBytes']=candidate.stat().st_size
m['villageScene']['stage']='V018-preview'
m['villageScene']['roofBoost']=1.2
manifest.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n','utf-8')
html=OUT/'index.html'
t=html.read_text('utf-8')
t=t.replace('V017.1','V018 · VISTA PREVIA').replace('0.15-v017.1','0.15-v018-preview')
assert newsave in t and oldsave not in t
html.write_text(t,'utf-8')
(OUT/'README-PREVIEW.md').write_text(
'# V018 — vista previa experimental, NO asset aprobado\n\n'
'- V016 y V017.1 intactas. Partida guardada aislada: '+newsave+'\n'
'- Herrero V082-B: geometría original, WebP sin pérdida experimental; bisagra real, apertura interior +90 grados al hablar con Ordan.\n'
'- Arcanista V027: geometría aprobada, puerta centrada al vano, luz azul intacta.\n'
'- Techo V013: +20% y malla sin modificar; chimenea original intacta, pendiente de revisión visual.\n'
'- Plano 63x63, NPCs, mercader, cinemática, misiones, HUD originales intactos.\n'
'- NO promover candidato sin comparación visual y prueba WebGL escritorio/móvil.\n','utf-8')
assert APPROVED.stat().st_size==15887816
assert '0.15-v017.1' in (ROOT/'v017/manifest.json').read_text('utf-8')
assert m['cinematicArrival']['entry']==[7,0,31]
assert m['cinematicArrival']['mentor']==[1.72,0,1.9]
assert m['cinematicArrival']['npcPositions']['merchant']==[25.5,0,36.3]
assert len(m['workshopAssets'])==6
assert 'const ROOF_BOOST=1.20' in s
assert 'doorAngle=gate()>=1?90:0' in s
assert 'v018-preview' in (OUT/'canvas-legacy-logic.js').read_text('utf-8')
print('V018 PREVIEW BUILT',json.dumps({'path':str(OUT),'original_bytes':APPROVED.stat().st_size,'candidate_bytes':candidate.stat().st_size,'saved_game':newsave,'workshops':5},ensure_ascii=False))
