#!/usr/bin/env python3
"""Temporary LIGHT rescue boot; retains all authored source models for restoration."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
def replace(path,old,new,label):
 p=root/path;s=p.read_text(encoding='utf-8')
 n=s.count(old)
 if n!=1:raise RuntimeError(f'{path}: {label}: expected 1 exact occurrence, found {n}')
 p.write_text(s.replace(old,new,1),encoding='utf-8')
 print('patched',path,label)
# Light mode always on for this rescue build; desktop and iOS get identical baseline.
p=root/'index.html'
s=p.read_text(encoding='utf-8')
# The workflow commits the built index on this branch; subsequent pushes must
# operate idempotently on the already-generated HTML instead of reapplying.
if 'window.__GENESIS_LITE_BOOT=true' in s:
 print('Lite rescue already built: ensuring the HQ fountain declaration is lazy')
 import re
 s,n=re.subn(r'(<pc-asset id="genesisFountainV011HQAsset"[^>]*?)(?<! lazy)(></pc-asset>)',
              lambda m:m.group(1)+' lazy'+m.group(2),s,count=1)
 if n==0 and not re.search(r'<pc-asset id="genesisFountainV011HQAsset"[^>]*\\blazy',s):
  raise RuntimeError('Cannot verify lazy HQ fountain')
 p.write_text(s,encoding='utf-8')
 raise SystemExit(0)
def one(old,new,label):
 global s
 n=s.count(old)
 if n!=1:raise RuntimeError(f'index.html {label}: found {n} matches')
 s=s.replace(old,new,1)
one('window.__genesisBoot={loaded:0,total:0,error:null};',
    'window.__GENESIS_LITE_BOOT=true;window.__genesisBoot={loaded:0,total:0,error:null};',
    'lite flag')
# Preserve original entities and approved asset declarations. Disable only loading.
# Fountain model and roof template keep their IDs and original asset references in data-disabled-asset.
for ident in ('genesisFountainV011Model','villageRoofSource'):
 pattern=r'(<pc-model id="'+ident+r'"[^>]*?) asset="([^"]+)"'
 match=re.search(pattern,s)
 if not match:raise RuntimeError('missing optional model '+ident)
 s=s[:match.start()]+match.group(1)+' data-disabled-asset="'+match.group(2)+'" data-route="LiteDecor"'+s[match.end():]
# The fountain asset declaration was eager; mark lazy, preserve original URL.
s,n=re.subn(r'(<pc-asset id="genesisFountainV011HQAsset"[^>]*?)(></pc-asset>)',
            lambda m:m.group(1)+' lazy'+m.group(2),s,count=1)
if n!=1:raise RuntimeError('fountain lazy asset declaration missing')
# No missing entity required: source roof is intentionally inactive while using basic village.
one("roof:document.getElementById('villageRoofSource').entity,",
    "roof:document.getElementById('villageRoofSource')?.entity||null,",
    'optional roof')
# Avoid the global UI precache, which is not needed to enter the world.
one("const uiAssetsPromise=window.GenesisPreflight",
    "const uiAssetsPromise=window.__GENESIS_LITE_BOOT?Promise.resolve({report:{total:0,completed:0,failed:0}}):window.GenesisPreflight",
    'skip expensive UI prefetched files')
# Heavy 3D route assets were lazy. Skip route instantiation completely in rescue mode.
one("async function prepareRoute(prof){",
    "async function prepareRoute(prof){if(window.__GENESIS_LITE_BOOT){routeReady.add(prof);setLoadUI(100,'Modo rescate','Escenario simple: decoración 3D desactivada.');return;}",
    'route bypass')
# Skip demanding visual modules that download GLBs, and don't keep their 2 items in progress total.
one("async function waitVisualModulesBeforePlay(){",
    "async function waitVisualModulesBeforePlay(){if(window.__GENESIS_LITE_BOOT){bootProgress.externals=bootProgress.externalsTotal;return;}",
    'visual modules bypass')
# Disable optional animations in this rescue build: their library costs several MiB.
one("const clipEls=window.GenesisDevice?.safePreviews?[]:",
    "const clipEls=(window.__GENESIS_LITE_BOOT||window.GenesisDevice?.safePreviews)?[]:",
    'skip nonessential animation gate')
one("if(window.GenesisDevice?.safePreviews){",
    "if(window.__GENESIS_LITE_BOOT||window.GenesisDevice?.safePreviews){",
    'animation readiness bypass')
# Heavy UAL1 (7.6MB) was eager; defer, animation clips won't gate boot.
s,n=re.subn(r'(<pc-asset id="ual1086"[^>]*?)(></pc-asset>)',r'\1 lazy\2',s,count=1)
if n!=1:raise RuntimeError('UAL1 pc-asset not found')
# Preserve original clip nodes and their asset identifiers for the final project.
s,clips=re.subn(r'(<pc-anim-clip[^>]*?) asset="([^"]+)"',
                 lambda m:m.group(1)+' data-disabled-asset="'+m.group(2)+'"',s)
print('Temporarily disabled animation clip requests:',clips)
# Keep player and Ordan models, camera, light, original game systems unchanged.
# The workshop PBR models remain in markup but are all lazy route models in lite boot.
p.write_text(s,encoding='utf-8')
print('index.html lightweight rescue ready',len(s))

# Early-return geometry-only village, zero requests for tree LODs or 4K road maps.
path=root/'village_world.js'
s=path.read_text(encoding='utf-8')
needle="export async function mountVillage(app,{shell,roof,door,onResourceLoaded=()=>{},onPhase=()=>{},onRootReady=()=>{}}){\n stampVersion();"
if s.count(needle)!=1:raise RuntimeError('village stampVersion mark missing')
replacement="""export async function mountVillage(app,{shell,roof,door,onResourceLoaded=()=>{},onPhase=()=>{},onRootReady=()=>{}}){\n stampVersion();
  if(globalThis.__GENESIS_LITE_BOOT){
   const plan=globalThis.GenesisVillagePlan,root=new Entity('Project Genesis · Aldea básica modo rescate');
   app.root.addChild(root);
   const floor=material('Terreno básico sin textura',[.32,.36,.30]);
   mesh(root,'Terreno básico','plane',7,-.04,17,63,1,63,floor);
   const pathMat=material('Camino básico',[.48,.44,.36]);
   for(const lane of plan.roads)mesh(root,lane.name,'plane',lane.x,-.02,lane.z,lane.w,1,lane.d,pathMat);
   const wall=material('Taller sencillo de prueba',[.48,.46,.40]);
   const roofMat=material('Cubierta sencilla de prueba',[.30,.24,.21]);
   const buildings=new Map();
   for(const w of plan.workshops){
    const building=new Entity(w.profession+' · fachada cerrada');root.addChild(building);
    building.setLocalPosition(w.x,0,w.z);
    mesh(building,w.label+' pared posterior','box',0,1.5,-5.2,9,3,.20,wall);
    mesh(building,w.label+' pared izquierda','box',-4.5,1.5,-2.6,.2,3,5.2,wall);
    mesh(building,w.label+' pared derecha','box',4.5,1.5,-2.6,.2,3,5.2,wall);
    mesh(building,w.label+' techo','box',0,3.2,-2.6,9,.18,5.2,roofMat);
    buildings.set(w.profession,building);
   }
   const trees={update(){},blocked(){return false},status(){return{loaded:0}},release(){}};
   globalThis.__genesisLiteVillage={mode:'basic',trees:0,roads:plan.roads.length,workshops:buildings.size};
   return Object.freeze({root,plan,trees,arcanePortals:[],
    setProfession(prof){for(const w of plan.workshops){const entity=buildings.get(w.profession);if(entity)entity.enabled=w.profession!==prof;}},
    blocked(x,z,r=.33){return plan.blocked(x,z,r)}});
  }
"""
path.write_text(s.replace(needle,replacement,1),encoding='utf-8')
print('village_world.js simple level enabled')
# Don't fetch HQ workshop architecture while lite mode active.
for file,old,new in [
 ('genesis_workshop_live_v015.js',"init().catch(e=>","if(!globalThis.__GENESIS_LITE_BOOT)init().catch(e=>"),
 ('genesis_arcanista_four_walls_v006.js',"mount().catch(error=>","if(!globalThis.__GENESIS_LITE_BOOT)mount().catch(error=>")
]:
 replace(file,old,new,'suspend optional heavy module')
