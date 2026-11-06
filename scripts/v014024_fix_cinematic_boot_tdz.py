#!/usr/bin/env python3
"""Safe one-line initialization-order correction for V014.024 cinematic branch.
The mouse controller calls cameraInputBlocked synchronously during creation;
the cinematic state must be declared before this callback is invoked.
"""
from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf8')
assert 'genesis-market-cinematic-director-v001' in s,'Cinematic patch missing'
early='let gameStarted=false,selectedProfession=null,activeRoute=null,tutorialStep=-1,currentInteractable=null;'
late='let marketEscortWaypoint=0,marketEscortWaiting=false,marketEscortCinematic=null,marketEscortCinemaNow=0;'
early_new=early+'\nlet marketEscortCinematic=null,marketEscortCinemaNow=0;'
late_new='let marketEscortWaypoint=0,marketEscortWaiting=false;'
if late in s:
  assert s.count(early)==1 and s.count(late)==1
  assert early_new not in s
  s=s.replace(early,early_new).replace(late,late_new)
  p.write_text(s,encoding='utf8')
  print('CINEMATIC_BOOT_TDZ_FIXED')
else:
  assert s.count(early_new)==1 and s.count(late_new)==1
  print('CINEMATIC_BOOT_TDZ_ALREADY_FIXED')
assert s.count('let marketEscortCinematic=null,marketEscortCinemaNow=0;')==1
assert s.index('let marketEscortCinematic=null')<s.index('const cameraInputBlocked=e=>')
