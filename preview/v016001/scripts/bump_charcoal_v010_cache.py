#!/usr/bin/env python3
"""One-time version bump of the exact two assets modified for charcoal V010. Protect all other main-game code."""
from pathlib import Path
f=Path('index.html')
s=f.read_text(encoding='utf8')
for old,new in [
 ('./preparacion.css?v=0.11.017','./preparacion.css?v=0.14.018-charcoal-v010'),
 ('./preparacion_control.js?v=0.11.017','./preparacion_control.js?v=0.14.018-charcoal-v010')
]:
  if old in s:
    if s.count(old)!=1:raise SystemExit('Multiple game HTML cache occurrences: '+old)
    s=s.replace(old,new)
  elif new not in s:
    raise SystemExit('Unexpected index version; not touching game HTML: '+old)
if './preparacion_control.js?v=0.14.018-charcoal-v010' not in s:
  raise SystemExit('Missing charcoal runtime loader')
f.write_text(s,encoding='utf8')
print('PASS: preserved existing index.html, only bumped preparation model/CSS cache signatures')
