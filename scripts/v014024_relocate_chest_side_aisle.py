#!/usr/bin/env python3
"""V014.024 isolated: move the already-existing Herrero starter chest out of
the physical entrance corridor, preserving model, scale, quest and original game.
Deterministic source patch for GitHub Actions only; never edit main.
"""
from pathlib import Path
import json,math,re,sys
p=Path("index.html")
s=p.read_text(encoding="utf-8")
changes=[
  ('position=".266666666667 0 -2.2" scale="1.333333333333 1 1.333333333333">\n<pc-model id="chestModel"',
   'position="-2.133333333333 0 -1.2" scale="1.333333333333 1 1.333333333333">\n<pc-model id="chestModel"'),
  ('[.266666666667,-2.2,.76]','[-2.133333333333,-1.2,.76]'),
  ("x:center+.2,y:0,z:-1.65","x:center-1.6,y:0,z:-.9"),
  ("x:c+.266666666667,y:0,z:-2.2","x:c-2.133333333333,y:0,z:-1.2"),
]
changed=[]
for old,new in changes:
    n=s.count(old)
    if n==1:
        s=s.replace(old,new)
        changed.append(dict(old=old,new=new))
    elif n==0 and s.count(new)==1:
        pass
    else:
        raise SystemExit(f"Unexpected original match count {n} for {old!r}")
# Only the above four explicit strings are modified, without changing
# chest art/GLB, nav controller, workshop wall geometry or other route logic.
assert "id=\"chestModel\"" in s
assert '[.266666666667,-2.2,.76]' not in s
assert '[-2.133333333333,-1.2,.76]' in s
assert 'x:center-1.6,y:0,z:-.9' in s
assert 'x:c-2.133333333333,y:0,z:-1.2' in s
assert s.count('id="chestModel"')==1
# Geometry-only predictive audit. These are the ACTUAL constants from the
# game's wallBlocked() formula and GenesisVillagePlan.workshopScale = .75.
scale=.75
r=.33
new_center=(-2.133333333333*scale,-1.2*scale)
old_center=(.266666666667*scale,-2.2*scale)
def blocked_by_chest(point,at):return math.dist(point,at)<.76+r
def entryportal(x,z):
    lx,lz=x/scale,z/scale
    rr=r/scale
    return (-2.45-rr < lz < 2.20+rr and abs(lx)<1.08-rr)
samples=[]
for step in range(68):
    z=-.165-step*.05
    pos=(.075,z)
    collision=blocked_by_chest(pos,new_center)
    if collision:raise SystemExit(f'New chest still blocks center passage at {pos}')
    samples.append({'x':pos[0],'z':round(z,3),'portal':entryportal(*pos),'chest_blocked':collision})
# Q8 target is reachable from original Herrero fast test spawn.
spawn=(.075,-.165)
distance=math.dist(spawn,new_center)
assert distance<1.95, f"New chest too far for actual Q8 interaction: {distance}"
# The previous chest blocked the pass immediately after unlocked doorway.
assert any(blocked_by_chest((.075,-.165-i*.05),old_center) and
               not entryportal(.075,-.165-i*.05)
               for i in range(68))
if changed:p.write_text(s,encoding="utf-8")
manifest={"release":"V014.024","experimental_only":True,"art_preserved":True,
  "old_chest_world":old_center,"new_chest_world":new_center,
  "quest8_spawn":spawn,"quest8_distance":distance,"quest8_interaction_radius":1.95,
  "original_entrance_collision_reproduced":True,"new_collision_free_centerline_samples":len(samples),
  "modified_exact_strings":len(changed),"path_samples":samples}
out=Path("previews/v014024-chest-side-aisle");out.mkdir(parents=True,exist_ok=True)
(out/"static-geometry-audit.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
print('CHEST_ENTRANCE_QA_PASS',json.dumps({k:v for k,v in manifest.items() if k!='path_samples'}),flush=True)
