#!/usr/bin/env python3
"""Cinematic animation continuity: do not reset the real animator to Idle in
the normal player-input branch immediately before the cinematic Walk clip.
"""
from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf8')
old='}}else setWalking(false);\n const w=workshopAt(px,pz);updateMentorFollow(dt,now,w);'
new='}}else if(!marketEscortCinematic)setWalking(false);\n const w=workshopAt(px,pz);updateMentorFollow(dt,now,w);'
if old in s:
 assert s.count(old)==1
 s=s.replace(old,new)
 print('CINEMATIC_PLAYER_WALK_ANIMATION_PRESERVED')
else:
 assert s.count(new)==1
 print('CINEMATIC_PLAYER_WALK_ANIMATION_ALREADY_PRESERVED')
old_qa=' state:marketEscortCinematic?.snapshot()||null,\n tutorialStep,\n player:{x:px,z:pz}'
new_qa=' state:marketEscortCinematic?.snapshot()||null,\n tutorialStep,\n walking,running,walkClip:walkClip||null,\n activeAnimationState:playerAnimGroup?.[0]?.baseLayer?.activeState||null,\n player:{x:px,z:pz}'
if old_qa in s:
 assert s.count(old_qa)==1
 s=s.replace(old_qa,new_qa)
elif new_qa not in s:
 raise SystemExit('Read-only QA hook drift detected')
assert s.count(new)==1
assert s.count('walking,running,walkClip:walkClip||null')==1
p.write_text(s,encoding='utf8')
