#!/usr/bin/env python3
"""Bump visible V014.023 only on experimental V014.024. Never rebuild the approved UI."""
import json,pathlib,re
p=pathlib.Path("index.html");before=p.read_text(encoding="utf-8")
s=before
s=re.sub(r"\b[Vv]014\.023\b","V014.024",s)
s=re.sub(r"\b[Vv]0\.14\.023\b","v0.14.024",s)
for filename in ("preparacion_control.js","inventario_genesis_16x9.js","inventario_genesis_16x9.css"):
    s,n=re.subn(re.escape(filename)+r"(?:\?v=[\w.\-]+)?",filename+"?v=0.14.024",s)
    if filename=="preparacion_control.js" and n<1:raise SystemExit("Missing preparation script reference: "+filename)
s=re.sub(r'(<meta name="genesis-game-version" content=")[^"]+(")',r'\g<1>V014.024\2',s)
if "<head>" not in s.lower() or not re.search(r"0\.14\.024|014\.024",s,re.I):
    raise SystemExit("V014.024 header update failed")
p.write_text(s,encoding="utf-8")
print(json.dumps({"release":"V014.024","changed":len(before)!=len(s) or before!=s,"before_bytes":len(before),"after_bytes":len(s)},indent=2))
