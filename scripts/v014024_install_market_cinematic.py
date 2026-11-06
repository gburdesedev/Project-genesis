#!/usr/bin/env python3
"""Apply isolated cinematic to the existing V014.024 route without editing
approved GLBs, menus, quest recipes, save logic, main, or original asset URLs.
This source patch can be run repeatedly during Actions and stops on drift.
"""
from pathlib import Path
import json
p=Path('index.html')
source=p.read_text(encoding='utf8')
if 'genesis-market-cinematic-director-v001' in source:
    assert 'genesis_market_cinematic_v001.js?v=0.14.024' in source
    print('CINEMATIC_PATCH_ALREADY_PRESENT')
    raise SystemExit(0)
s=source
changes={}
def replace_once(old,new,label):
    global s
    n=s.count(old)
    if n!=1:raise RuntimeError(f'{label}: expected 1 source marker, found {n}')
    s=s.replace(old,new)
    changes[label]=True

replace_once(
 '<script src="./preparacion_control.js?v=0.14.024"></script>',
 '<script src="./genesis_market_cinematic_v001.js?v=0.14.024"></script>\n<script src="./preparacion_control.js?v=0.14.024"></script>',
 'load local cinematic director before game module')

replace_once('let marketEscortWaypoint=0,marketEscortWaiting=false;',
             'let marketEscortWaypoint=0,marketEscortWaiting=false,marketEscortCinematic=null,marketEscortCinemaNow=0;',
             'isolated cinematic variables')

replace_once("addEventListener('keydown',e=>{if(e.code==='Escape'){",
 "addEventListener('keydown',e=>{if(marketEscortCinematic){e.preventDefault();return}if(e.code==='Escape'){",
 'ignore user key commands while cinematic plays')

replace_once("const cameraInputBlocked=e=>{if(!gameStarted||",
             "const cameraInputBlocked=e=>{if(!!marketEscortCinematic||!gameStarted||",
             'freeze manual camera input during cinematic')

replace_once("function chooseInteractable(){if(modalLayer.style.display==='grid'",
             "function chooseInteractable(){if(marketEscortCinematic)return null;if(modalLayer.style.display==='grid'",
             'disable interaction only while cinematic plays')

replace_once("function startRoute(prof){village.setProfession(prof);",
             "function startRoute(prof){marketCinematicOverlay(false);marketEscortCinematic=null;village.setProfession(prof);",
             'cinematic teardown when starting a fresh game')

replace_once("const canMove=gameStarted&&modalLayer.style.display!=='grid'&&intro.style.display!=='grid';if(canMove){",
             "const canMove=gameStarted&&!marketEscortCinematic&&modalLayer.style.display!=='grid'&&intro.style.display!=='grid';if(canMove){",
             'prevent manual WASD from overriding scripted motion')

replace_once(
"function startOrdanMarketEscort(){\n if(selectedProfession!=='Herrero'||tutorialStep!==window.GenesisMarketQuest.steps.talk)return;\n marketEscortWaypoint=0;marketEscortWaiting=false;mentorFollowState='market';\n mentorGestureAt=Infinity;mentorGestureReturn=0;\n setTutorialStep(window.GenesisMarketQuest.steps.escort);\n setMentorAnim(activeRoute.mentorWalk||activeRoute.mentorIdle,.2);\n}",
"""// Only the black bars and input visibility are new; no approved ORA artwork
// is replaced. The art and original inventory return when the walk finishes.
function marketCinematicOverlay(enabled){
 let style=document.getElementById('genesis-market-cinema-style');
 if(!style){
  style=document.createElement('style');style.id='genesis-market-cinema-style';
  style.textContent='#genesisMarketCinemaBars{position:fixed;inset:0;z-index:2147482000;pointer-events:none;display:none}'+
   '#genesisMarketCinemaBars .top,#genesisMarketCinemaBars .bottom{position:absolute;left:0;width:100%;height:7.5%;background:#050708}'+
   '#genesisMarketCinemaBars .top{top:0}#genesisMarketCinemaBars .bottom{bottom:0}'+
   'html.genesis-market-cinematic #mobile,html.genesis-market-cinematic #buttonsTop,'+
   'html.genesis-market-cinematic #quest,html.genesis-market-cinematic #professionChip,'+
   'html.genesis-market-cinematic #materialsPanel,html.genesis-market-cinematic #prompt,'+
   'html.genesis-market-cinematic #interactMarker,html.genesis-market-cinematic #cameraGuide,'+
   'html.genesis-market-cinematic #npcTag,html.genesis-market-cinematic #brand,'+
   'html.genesis-market-cinematic #tech{opacity:0!important;pointer-events:none!important}';
  document.head.appendChild(style);
 }
 let bars=document.getElementById('genesisMarketCinemaBars');
 if(!bars){bars=document.createElement('div');bars.id='genesisMarketCinemaBars';
  bars.setAttribute('aria-hidden','true');bars.innerHTML='<div class="top"></div><div class="bottom"></div>';document.body.appendChild(bars)}
 bars.style.display=enabled?'block':'none';
 document.documentElement.classList.toggle('genesis-market-cinematic',enabled);
 if(enabled&&document.pointerLockElement)document.exitPointerLock?.();
}
function startOrdanMarketEscort(){
 if(selectedProfession!=='Herrero'||tutorialStep!==window.GenesisMarketQuest.steps.talk)return;
 const director=window.GenesisMarketCinematic;
 if(!director?.create){console.error('Genesis market cinematic director missing');toast('La escena del mercado no pudo iniciarse.',1800);return}
 const pos=activeRoute.mentor().getPosition();
 try{
  marketEscortCinematic=director.create({
   player:{x:px,z:pz},mentor:{x:pos.x,z:pos.z},
   waypoints:window.GenesisMarketQuest.escortPath,
   isBlocked:(x,z)=>wallBlocked(x,z)
  });
 }catch(error){console.error('Genesis cinematic route unavailable',error);toast('No se pudo preparar el recorrido al mercado.',1800);return}
 marketEscortCinemaNow=performance.now();
 marketEscortWaypoint=0;marketEscortWaiting=false;mentorFollowState='market';
 mentorGestureAt=Infinity;mentorGestureReturn=0;
 clearMovementInput();
 marketCinematicOverlay(true);
 setTutorialStep(window.GenesisMarketQuest.steps.escort);
 setMentorAnim(activeRoute.mentorIdle,.18);
}
window.__GenesisMarketCinematicReadOnly=()=>({
 active:!!marketEscortCinematic,
 state:marketEscortCinematic?.snapshot()||null,
 tutorialStep,
 player:{x:px,z:pz}
}); // Read-only diagnostics; no mutation or quest shortcuts.
""",
'start cinematic after approved Ordan dialogue')

replace_once(
"function updateOrdanMarketEscort(dt,now){\n const quest=window.GenesisMarketQuest;\n if(!gameStarted||selectedProfession!=='Herrero'||tutorialStep!==quest.steps.escort)return;\n const entity=activeRoute.mentor(),p=entity.getPosition();",
"""function updateOrdanMarketEscort(dt,now){
 const quest=window.GenesisMarketQuest;
 if(!gameStarted||selectedProfession!=='Herrero'||tutorialStep!==quest.steps.escort)return;
 if(marketEscortCinematic){
  // The ordinary game loop caps dt for physics; this scene advances by actual
  // elapsed time with 12cm collision substeps, including software WebGL at 1fps.
  const elapsed=Math.max(0,Math.min(.70,(now-marketEscortCinemaNow)/1000));
  marketEscortCinemaNow=now;
  const motion=marketEscortCinematic.tick(elapsed);
  const p0={x:px,z:pz};
  px=motion.player.x;pz=motion.player.z;
  player.setPosition(px,0,pz);
  if(playerFillEntity)playerFillEntity.setPosition(px,3.25,pz);
  if(motion.playerMoved>.0001){
   player.setEulerAngles(0,deg(Math.atan2(px-p0.x,pz-p0.z)),0);
   setWalking(true,false);
  }else setWalking(false);
  const mentor=activeRoute.mentor(),old=mentor.getPosition();
  mentor.setPosition(motion.mentor.x,0,motion.mentor.z);
  if(motion.mentorMoved>.0001){
   mentorYaw=deg(Math.atan2(motion.mentor.x-old.x,motion.mentor.z-old.z));
   mentor.setEulerAngles(0,mentorYaw,0);
  }
  if(motion.phase==='walk'&&!marketEscortWaiting){
   marketEscortWaiting=true;setMentorAnim(activeRoute.mentorWalk||activeRoute.mentorIdle,.20);
  }
  marketEscortWaypoint=motion.mentorWaypoint;
  if(motion.blocked){
   console.error('CINEMATIC_ESCORT_COLLISION',JSON.stringify(motion.blocked));
   marketCinematicOverlay(false);marketEscortCinematic=null;
   setWalking(false);setMentorAnim(activeRoute.mentorIdle,.2);
   toast('El paso al mercado está obstruido; podés seguir caminando.',3200);
   return;
  }
  if(motion.complete){
   marketCinematicOverlay(false);marketEscortCinematic=null;
   setWalking(false);mentorFollowState='market_arrived';setMentorAnim(activeRoute.mentorIdle,.25);
   const merchant=genesisMarket?.interactable?.position?.();
   if(merchant)camYaw=deg(Math.atan2(-(merchant.x-px),-(merchant.z-pz)));
   mentorGestureAt=now+2600;
   setTutorialStep(quest.steps.shop);
   toast('Ordan: Llegamos al puesto. Conseguí lo necesario para dos escudos.',3100);
  }
  return;
 }
 const entity=activeRoute.mentor(),p=entity.getPosition();""",
'script both real rigged actors along original route and finish at merchant')

replace_once(
 "const inside=!!w,focusY=inside?1.44:1.32;",
 "if(!marketEscortCinematic){const inside=!!w,focusY=inside?1.44:1.32;",
 'switch camera to non-interactive wide cinematic view')

replace_once(
 "tmpCam.set(lastGood[0],lastGood[1],lastGood[2]);camera.setPosition(tmpCam);camera.lookAt(tmpTarget);\n if(gameStarted",
 """tmpCam.set(lastGood[0],lastGood[1],lastGood[2]);camera.setPosition(tmpCam);camera.lookAt(tmpTarget);
 }else{
  // Wider 3D camera tracking the midpoint of the two existing animated rigs.
  // No geometry or materials are changed.
  const mentor=activeRoute.mentor().getPosition();
  const midX=(px+mentor.x)*.5,midZ=(pz+mentor.z)*.5;
  const spread=Math.hypot(px-mentor.x,pz-mentor.z);
  const far=Math.min(10.7,Math.max(7.4,spread*1.05+5.8));
  const aim=new Vec3(midX,1.62,midZ);
  const angle=rad(31);
  camera.setPosition(midX+Math.sin(angle)*far*.91,1.62+far*.53,midZ+Math.cos(angle)*far*.91);
  camera.lookAt(aim);
 }
 if(gameStarted""",
 'keep both animated characters in a wider cinematic camera')

# The scripted section replaces neither quest logic nor material references.
assert s.count('genesis-market-cinematic-director-v001')==0
assert 'window.__GenesisMarketCinematicReadOnly' in s
assert s.count('if(marketEscortCinematic){')>=2
assert s.count('genesis_market_cinematic_v001.js?v=0.14.024')==1
assert len(changes)==11,changes
s=s.replace(
 '// Only the black bars and input visibility are new; no approved ORA artwork',
 '// genesis-market-cinematic-director-v001\n// Only the black bars and input visibility are new; no approved ORA artwork')
p.write_text(s,encoding='utf8')
manifest={'version':'V014.024-cinematic-experimental','modified_file':'index.html',
  'applied_changes':list(changes),'source_chars':len(source),'patched_chars':len(s),
  'master_asset_changes':0,'main_changed':False,'scripted_path':'GenesisMarketQuest.escortPath',
  'game_quest_transition':'11.25 -> 11.5 cinematic -> 11.75 merchant',
  'player_collision_checks':'every 0.12m via actual wallBlocked','visual':'two 7.5% letterbox bars; existing real rig animations; wide camera'}
out=Path('previews/v014024-market-cinematic');out.mkdir(parents=True,exist_ok=True)
(out/'patch-receipt.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
print('CINEMATIC_PATCH_APPLIED',json.dumps(manifest,ensure_ascii=False))
