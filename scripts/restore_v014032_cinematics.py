#!/usr/bin/env python3
"""Bounded backport: approved V016 first arrival + V014.026 market camera tour.
Run only in experimental branch; preserves main 0.14.032 streaming loader/UI.
"""
from pathlib import Path
from urllib.request import urlopen
index=Path('index.html')
text=index.read_text(encoding='utf8')
legacy=urlopen('https://raw.githubusercontent.com/gburdesedev/Project-genesis/experiment/v014031-fuelle-inventario-aprobado-20261107/index.html',timeout=60).read().decode('utf8')
def once(old,new,label):
 global text
 if text.count(old)!=1:
  raise RuntimeError(label+' expected exactly one anchor; got '+str(text.count(old)))
 text=text.replace(old,new,1)
def slice_func(source,start,end,label):
 a=source.find(start)
 if a<0:raise RuntimeError(label+' start missing')
 b=source.find(end,a)
 if b<0:raise RuntimeError(label+' end missing')
 return source[a:b]
market=slice_func(legacy,'function marketCinemaBars(){','function armMentorFollow()','V014026 cinematic')
old=slice_func(text,'function startOrdanMarketEscort(){','function armMentorFollow()','main escort')
once(old,market,'market escort replacement')
once('let marketEscortWaypoint=0,marketEscortWaiting=false;',
     'let marketEscortWaypoint=0,marketEscortWaiting=false,marketCinematic=null,arrivalCinematic=null;',
     'cinematic state')
once('<link rel="stylesheet" href="./responsive.css?v=0.11.017">',
     '<link rel="stylesheet" href="./responsive.css?v=0.11.017">\n<link rel="stylesheet" href="./genesis_market_cinematic_v001.css?v=0.14.032-experimental">\n<link rel="stylesheet" href="./genesis_arrival_v014032.css?v=0.14.032-experimental">',
     'cinematic CSS')
once('<script src="./mercenary_equipment_canvas_v001.js?v=0.1.001"></script>',
     '<script src="./genesis_market_cinematic_v001.js?v=0.14.032-experimental"></script>\n<script src="./v015/canvas-arrival-v016.js?v=0.14.032-experimental"></script>\n<script src="./mercenary_equipment_canvas_v001.js?v=0.1.001"></script>',
     'cinematic scripts')
once('marketEscortWaypoint=0;marketEscortWaiting=false;setMentorAnim(activeRoute.mentorIdle,.01);',
     "marketEscortWaypoint=0;marketEscortWaiting=false;marketCinematic=null;arrivalCinematic=null;document.body.classList.remove('genesis-market-cinematic','genesis-arrival-cinematic');setMentorAnim(activeRoute.mentorIdle,.01);",
     'route reset')
once('function applyDevFastTestState(){',
     'function applyDevFastTestState(){\n if(window.__GENESIS_WORLD_FULL)return false; // Restore original Q1 instead of test-only fast start.',
     'no tutorial bypass')
once("if(!gameStarted)return;if(e.code==='Tab')",
     "if(!gameStarted)return;if(arrivalCinematic?.active||marketCinematic?.active){e.preventDefault();return}if(e.code==='Tab')",
     'keyboard lock')
once('function interact(){const target=',
     'function interact(){if(arrivalCinematic?.active||marketCinematic?.active)return;const target=',
     'interaction lock')
once('function getInteractables(){if(!gameStarted||!activeRoute||tutorialStep<0)return[];',
     'function getInteractables(){if(!gameStarted||!activeRoute||tutorialStep<0||arrivalCinematic?.active||marketCinematic?.active)return[];',
     'interaction target lock')
once('const cameraInputBlocked=e=>{if(!gameStarted||',
     'const cameraInputBlocked=e=>{if(arrivalCinematic?.active||marketCinematic?.active||!gameStarted||',
     'camera lock')
once('mentorGestureReturn=0}}\ndocument.querySelectorAll(\'[data-profession]\')',
     'mentorGestureReturn=0}if(!fastSetup&&prof===\'Herrero\')startInitialArrival()}\ndocument.querySelectorAll(\'[data-profession]\')',
     'start route -> arrival')
arrival="""
function startInitialArrival(){
 if(!window.GenesisCanvasArrivalV016||!window.__GENESIS_WORLD_FULL)return;
 const ctl=window.GenesisCanvasArrivalV016.create({
  artisan:player,game:{step:()=>tutorialStep},
  playAnimation:clip=>setWalking(clip==='Walk_Loop',false),
  onFinish:()=>{
   document.body.classList.remove('genesis-arrival-cinematic');
   camDist=4.7;camPitch=24;clearMovementInput();
   mouseCapture?.refresh();
   toast('Ordan te espera en la entrada de la herrería. Acercate y pulsá E.',2400);
  }
 });
 arrivalCinematic=ctl;
 if(!ctl.active)return;
 const p=ctl.position();px=p[0];pz=p[2];
 camYaw=12;camPitch=27;camDist=cameraSolvedDist=6.15;
 clearMovementInput();
 if(document.pointerLockElement)document.exitPointerLock?.();
 let bars=document.getElementById('genesisArrivalLetterbox');
 if(!bars){bars=document.createElement('div');bars.id='genesisArrivalLetterbox';bars.setAttribute('aria-hidden','true');
  bars.innerHTML='<div class="genesisArrivalCaption">EL DESTELLO CELESTIAL · LLEGADA A LA ALDEA</div>';
  document.body.appendChild(bars)}
 document.body.classList.add('genesis-arrival-cinematic');
 ctl.begin();
}
function updateInitialArrival(dt,now){
 if(!arrivalCinematic?.active)return;
 arrivalCinematic.update(dt);
 const p=arrivalCinematic.position();px=p[0];pz=p[2];
 if(playerFillEntity)playerFillEntity.setPosition(px,3.25,pz);
 if(now-lastPlayerStep>450){footstepSound(false,.013);lastPlayerStep=now}
}
window.__GenesisArrivalQA=()=>arrivalCinematic?.snapshot?.()||null;
"""
once('// ---------- Frame ----------',arrival+'\n// ---------- Frame ----------','arrival functions')
once("const canMove=gameStarted&&modalLayer.style.display!=='grid'&&intro.style.display!=='grid';",
     "const canMove=gameStarted&&modalLayer.style.display!=='grid'&&intro.style.display!=='grid'&&!marketCinematic?.active&&!arrivalCinematic?.active;",
     'cinematic movement lock')
once('const w=workshopAt(px,pz);updateMentorFollow(dt,now,w);',
     'updateInitialArrival(dt,now);const w=workshopAt(px,pz);updateMentorFollow(dt,now,w);',
     'arrival frame tick')
# Reuse original V014026 condition so the walking controller is not forced to idle
# while a cinematic controls the avatar.
# Only the frame movement line is touched, not any unrelated menu handler.
frame_start=text.index('const canMove=gameStarted&&')
frame_end=text.index(chr(10),frame_start)
frame_line=text[frame_start:frame_end]
if 'else setWalking(false);' not in frame_line:
 raise RuntimeError('The original frame still must contain an idle fallback')
frame_line=frame_line.replace('else setWalking(false);',
 'else if(!marketCinematic?.active&&!arrivalCinematic?.active)setWalking(false);')
text=text[:frame_start]+frame_line+text[frame_end:]
# Existing source may not have the above newline in this version; intentional fail
# rather than silently skip. Only approved script/layout are preserved.
if 'window.GenesisMarketCinematic' not in text or 'window.GenesisCanvasArrivalV016' not in text:
 raise RuntimeError('cinematic controllers not integrated')
index.write_text(text,encoding='utf8')
print('CINEMATICS_BACKPORT',{'arrival':'V016 original 6-waypoint fountain bypass','market':'V014026 original cinematic','saved_stream_loader':'unchanged','menu_art':'unchanged'})
