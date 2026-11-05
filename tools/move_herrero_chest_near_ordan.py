#!/usr/bin/env python3
"""Move only the Herrero's material chest to within interaction range of Ordan's key handoff.
Experiment only. Preserve the original mesh/material/animation and all approved game branches.
Original parent local (-4.08, -3.02), world (-3.06,-2.265), relocated to
parent local (0.266666666667,-2.2), world (0.2,-1.65) with workshopScale .75.
"""
from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
# Handle the immediately previous experimental position. This keeps the patch
# reversible/idempotent for both old V014022 and already-patched branches.
previous=[
 ('position="-1.80 0 -1.266666666667" scale="1.333333333333 1 1.333333333333">',
  'position=".266666666667 0 -2.2" scale="1.333333333333 1 1.333333333333">'),
 ('[-1.80,-1.266666666667,.76]', '[.266666666667,-2.2,.76]'),
 ('{x:center-1.35,y:0,z:-.95}', '{x:center+.2,y:0,z:-1.65}'),
 ('{x:c-1.80,y:0,z:-1.266666666667}', '{x:c+.266666666667,y:0,z:-2.2}')
]
for old,new in previous:
    if old in s:
        s=s.replace(old,new)
        print('MIGRATED previous experiment',old[:70])
changes=[
  ('position="-4.08 0 -3.02" scale="1.333333333333 1 1.333333333333">\n<pc-model id="chestModel"',
   'position=".266666666667 0 -2.2" scale="1.333333333333 1 1.333333333333">\n<pc-model id="chestModel"'),
  ('[-4.08,-3.02,.76]', '[.266666666667,-2.2,.76]'),
  ("{x:center-4.02,y:0,z:-3.03}", "{x:center+.2,y:0,z:-1.65}"),
  ("{x:c-4.02,y:0,z:-3.03})}:{label:'Baúl de materiales'",
   "{x:c+.266666666667,y:0,z:-2.2})}:{label:'Baúl de materiales'")
]
for old,new in changes:
    n=s.count(old)
    if n==1:
        s=s.replace(old,new,1)
        print('PATCHED',old[:92])
    elif n==0 and new in s:
        print('ALREADY PATCHED',new[:85])
    else:
        raise SystemExit(f'Expected exactly one match ({n}): {old}')
# Ensure the Curtidor chest remains in its original location.
assert 'id="tannerChestModel"' in s
assert 'position="-4.02 .024 -3.03"' in s
assert 'position=".266666666667 0 -2.2"' in s
p.write_text(s,encoding='utf-8')
print('VERIFIED: Herrero chest moved; tanner chest unchanged')
