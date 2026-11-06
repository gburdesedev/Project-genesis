#!/usr/bin/env python3
"""Narrow version/cache bump for the approved legacy 0.14.022 HTML; no layout changes."""
import json, pathlib, re
p=pathlib.Path("index.html")
s=p.read_text(encoding="utf-8")
original=s
before={label:len(list(re.finditer(re.escape(label),s,re.I))) for label in ["V014.022","v0.14.022","V0.14.022","V014022"]}
# Only change UI version spellings; avoid touching asset paths, unique file IDs and script names.
s=re.sub(r"\bV0?14\.022\b","V014.023",s,flags=re.I)
s=re.sub(r"\bv0\.14\.022\b","v0.14.023",s,flags=re.I)
# Give external gameplay module a new immutable fetch key so a cached v014022 file cannot persist.
s,prep_refs=re.subn(r"preparacion_control\.js(?:\?v=[A-Za-z0-9._-]+)?",
                     "preparacion_control.js?v=0.14.023",s)
s,inv_refs=re.subn(r"inventario_genesis_16x9\.js(?:\?v=[A-Za-z0-9._-]+)?",
                    "inventario_genesis_16x9.js?v=0.14.023",s)
if "<head>" not in s.lower():
    raise SystemExit("Could not locate HTML head; release not modified.")
s=s.replace("<head>","<head>\n<meta name=\"genesis-game-version\" content=\"V014.023\">",1)
changed=sum(1 for a,b in zip(original,s) if a!=b)
preview=pathlib.Path("previews/v014023-materials-speed")
preview.mkdir(parents=True,exist_ok=True)
info={"target":"V014.023","before":before,"prepScriptMatches":prep_refs,"inventoryScriptMatches":inv_refs,"sourceSize":len(original),"updatedSize":len(s),"changedPrefixBytesApprox":changed,"titleAfter":re.findall(r"<title[^>]*>(.*?)</title>",s,flags=re.I|re.S)[:1],"originalReleaseFound":bool(before["V014.022"]+before["v0.14.022"]+before["V0.14.022"])}
preview.joinpath("version-audit.json").write_text(json.dumps(info,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
if not info["originalReleaseFound"] and not re.search(r"v0?14\\.023",original,re.I):
    raise SystemExit("HTML contains neither V014.022 nor V014.023; inspect version audit.")
if prep_refs<1:
    raise SystemExit("No known preparation JS script reference found; refusing uncached release.")
p.write_text(s,encoding="utf-8")
print("V014023_RELEASE_AUDIT",json.dumps(info,ensure_ascii=False))
