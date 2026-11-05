#!/usr/bin/env python3
from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
needle="window.__genesisPreloadProgress=function(event){"
a=s.find(needle);b=s.find("window.__genesisAppError=function(event){",a)
if a<0 or b<=a:raise RuntimeError("Preload source not found")
replacement="""window.__genesisPreloadProgress=function(event){
  // Legacy pc-app progress is observed, never allowed to overwrite GENESIS STREAM.
  window.__genesisBoot.loaded=Number(event.loaded)||0;
  window.__genesisBoot.total=Number(event.total)||0;
};
"""
s=s[:a]+replacement+s[b:]
old="async function prepareRoute(prof){"
if s.count(old)!=1:raise RuntimeError("Unexpected route anchors "+str(s.count(old)))
s=s.replace(old,old+"\n window.GenesisStreamLoader.trackRoute(prof);")
oldcss="#genesisAssetRows>div{background:#102b3c;border:1px solid #4a6b7c!important;border-radius:5px;padding:5px!important;font:11px/1.35 ui-monospace,monospace;min-height:31px;overflow-wrap:anywhere}"
newcss="#genesisAssetRows>div{background:#102b3c;border:1px solid #4a6b7c!important;border-radius:5px;padding:5px!important;min-height:44px;overflow:hidden}"
if s.count(oldcss)!=1:raise RuntimeError("Expected original card CSS")
s=s.replace(oldcss,newcss)
s=s.replace("#genesisAssetRows>div{font-size:10px!important;padding:3px!important;min-height:22px}",
            "#genesisAssetRows>div{padding:3px!important;min-height:37px}")
assert "GenesisStreamLoader.trackRoute(prof)" in s
assert "Legacy pc-app progress is observed" in s
p.write_text(s,encoding="utf-8")
print("Updated V0.14.022 streaming progress ownership, route accounting and mobile boxes")
