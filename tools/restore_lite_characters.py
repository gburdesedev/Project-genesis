#!/usr/bin/env python3
from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
print('disabled clips',s.count('data-disabled-asset='))
s,n=re.subn(r'(<pc-anim-clip[^>]*?) data-disabled-asset="([^"]+)"',lambda m:m.group(1)+' asset="'+m.group(2)+'"',s)
print('restored animation clips',n)
if n<1:raise SystemExit('No animation clips to restore')
old="const clipEls=(window.__GENESIS_LITE_BOOT||window.GenesisDevice?.safePreviews)?[]:"
new="const clipEls=window.GenesisDevice?.safePreviews?[]:"
if old not in s:raise SystemExit('Clip loader gate not found')
s=s.replace(old,new,1)
old="if(window.__GENESIS_LITE_BOOT||window.GenesisDevice?.safePreviews){"
new="if(window.GenesisDevice?.safePreviews){"
if old not in s:raise SystemExit('Animation readiness gate not found')
s=s.replace(old,new,1)
# Animation library is required by the original clips; restore eager readiness
s,n=re.subn(r'(<pc-asset id="ual1086"[^>]*?) lazy(></pc-asset>)',r'\1\2',s,count=1)
print('restored UAL1 library',n)
if n!=1:raise SystemExit('UAL1 lazy declaration missing')
p.write_text(s,encoding='utf-8')
print('Playable lite: animations restored, decoration remains disabled')
