#!/usr/bin/env python3
from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')
pattern=r"const results=await Promise\.allSettled\(els\.map\(el=>activateDeferredModel\(el,ROUTE_ASSET_TIMEOUT_MS,state=>\{[\s\S]*?\}\)\)\);"
matches=list(re.finditer(pattern,s))
print('Route instance parallel blocks found:',len(matches))
if len(matches)!=1:raise SystemExit('Expected exactly one route group block')
old=matches[0].group()
inner=old.split('state=>{',1)[1].rsplit('})));',1)[0]
new="""const results=[];
    for(const el of els){
     const result=await Promise.allSettled([activateDeferredModel(el,ROUTE_ASSET_TIMEOUT_MS,state=>{"""+inner+"""})]);
     results.push(result[0]);
     if(window.GenesisDevice?.safePreviews)await new Promise(r=>requestAnimationFrame(()=>r()));
    }"""
s=s[:matches[0].start()]+new+s[matches[0].end():]
p.write_text(s,encoding='utf-8')
print('Sequential route patch applied')
