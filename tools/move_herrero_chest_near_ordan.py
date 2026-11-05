#!/usr/bin/env python3
"""Move only the Herrero's material chest to within interaction range of Ordan's key handoff.
Experiment only. Preserve the original mesh/material/animation and all approved game branches.
Original parent local (-4.08, -3.02), world (-3.06,-2.265), relocated to
parent local (-1.80,-1.266666666667), world (-1.35,-0.95) with workshopScale .75.
"""
from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
changes=[
  ('position="-4.08 0 -3.02" scale="1.333333333333 1 1.333333333333">\n<pc-model id="chestModel"',
   'position="-1.80 0 -1.266666666667" scale="1.333333333333 1 1.333333333333">\n<pc-model id="chestModel"'),
  ('[-4.08,-3.02,.76]', '[-1.80,-1.266666666667,.76]'),
  ("{x:center-4.02,y:0,z:-3.03}", "{x:center-1.35,y:0,z:-.95}"),
  ("{x:c-4.02,y:0,z:-3.03})}:{label:'Baúl de materiales'",
   "{x:c-1.80,y:0,z:-1.266666666667})}:{label:'Baúl de materiales'")
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
assert 'position="-1.80 0 -1.266666666667"' in s
p.write_text(s,encoding='utf-8')
print('VERIFIED: Herrero chest moved; tanner chest unchanged')
