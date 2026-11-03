#!/usr/bin/env python3
"""Diagnostic: disable wallBrick2A in HTML asset declarations, preserve source files."""
from pathlib import Path
import re
p=Path('index.html');s=p.read_text(encoding='utf-8')
# Disable all pc-asset declarations whose id or src references wallBrick2A.
pattern=re.compile(r'<pc-asset\b[^>]*>',re.I)
hits=[]
def disable(m):
 tag=m.group(0)
 if not re.search(r'wallBrick2A|Wall_UnevenBrick_Straight',tag,re.I):return tag
 hits.append(tag[:220])
 tag=re.sub(r'\s+src="([^"]+)"',lambda x:' data-disabled-src="'+x.group(1)+'"',tag)
 tag=re.sub(r'\s+asset="([^"]+)"',lambda x:' data-disabled-asset="'+x.group(1)+'"',tag)
 return tag.replace('<pc-asset','<pc-asset lazy',1) if not re.search(r'\blazy\b',tag) else tag
s=pattern.sub(disable,s)
# Stop pc-model instances that directly reference the wallBrick2A asset.
s,n=re.subn(r'(<pc-model\b[^>]*?)\sdata-asset="wallBrick2A"',r'\1 data-disabled-asset="wallBrick2A"',s,flags=re.I)
print('wallBrick2A model references disabled:',n)
assert n>=2, 'Expected two Herrero wall models to be disabled'
p.write_text(s,encoding='utf-8')
print('wallBrick2A declarations disabled:',len(hits))
for hit in hits:print(hit)
if not hits and not n:raise SystemExit('No wallBrick2A declarations found')
