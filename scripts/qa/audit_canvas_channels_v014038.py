#!/usr/bin/env python3
"""Read-only audit of ORIGINAL Genesis Canvas and v014038 release candidate.
No rendered art, source mutation, or deployment.
"""
from pathlib import Path
import json,re,hashlib

root=Path(".")
paths=[
    ("Canvas_original_v010a27",root/"index_v0.10a27.html"),
    ("V014038_release_candidate",root/"index.html")
]
patterns={
 "channel_state":r"\.channels\b|\.affinities\b",
 "affinity_mapping":r"AFFINITY_VISUAL|AFFINITY_COLORS|AFFINITY_COLOR|affinityColor",
 "mercenary_channel_logic":r"applyMercGearChannels|gearColors|mercElementEffects",
 "emissive_material":r"emissiveIntensity|emissive\.set|\.emissive\b",
 "light_halo":r"setMercLight|mercSwordLight|mercShieldLight|weaponGlow|elementHalo",
 "original_channel_names":r"\b(Luz|Sombra|Fuego|Hielo|Naturaleza|Tierra|Rayo)\b",
 "vfx_modules":r"Genesis_Rayo_Helicoidal_V07|Genesis_Fuego_V20C|Genesis_Hielo_V21|Genesis_Fuego_HaloFino_V18|ChannelVFXManager|ElementalVFXManager",
 "model_refs":r"mercSwordModel|mercShieldModel|model-viewer|\.glb|\.gltf",
 "fabrication_logic":r"resolvePrototypeChannels|fabricate\(|metricForChannel|fabricaci[oó]n",
}
functions=["applyMercGearChannels","applyMercGearMaterial","setMercLight","gearColors","itemVisual","renderItemCard","resolvePrototypeChannels","fabricate","mercElementEffects","metricForChannel","EQUIP_MODEL_URLS"]
report={"schema":"ProjectGenesis_OriginalCanvas_And_ReleaseV014038_ReadOnly_ChannelAudit",
        "no_source_modified":True,"no_main_modified":True,"files":{}}
for label,p in paths:
    raw=p.read_bytes()
    if len(raw)<200000:raise RuntimeError("CANVAS_SOURCE_UNEXPECTEDLY_SMALL: "+str(p)+" "+str(len(raw)))
    s=raw.decode("utf-8",errors="replace")
    lines=s.splitlines()
    counts={k:len(list(re.finditer(v,s,re.I))) for k,v in patterns.items()}
    snippets={}
    for name in functions:
        # Report first named function only (avoid extracting any embedded image bytes)
        match=re.search(r"(?:function\s+|const\s+|let\s+|var\s+)"+re.escape(name)+r"\b",s,re.I)
        if match:
            start=match.start()
            line=s.count("\n",0,start)+1
            snippets[name]={"line":line,"start":s[start:start+450].replace("\n"," ")}
    matched={}
    for name in ("emissiveIntensity","setMercLight","mercSwordLight","MercSwordModel","Genesis_Rayo_Helicoidal_V07","Genesis_Fuego_V20C","Genesis_Hielo_V21"):
        hits=list(re.finditer(re.escape(name),s,re.I))
        matched[name]=[{"line":s.count("\n",0,m.start())+1,
                        "context":s[max(0,m.start()-90):m.start()+170].replace("\n"," ")} for m in hits[:5]]
    report["files"][label]={
      "bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),
      "pattern_counts":counts,"functions":snippets,"matched":matched,
    }
    print("=== "+label+" ===")
    print("bytes:",len(raw),"sha256:",report["files"][label]["sha256"],flush=True)
    print("counts:",json.dumps(counts,ensure_ascii=False),flush=True)
    for n,v in snippets.items():
        print("FUNC",n,"LINE",v["line"],v["start"][:330],flush=True)
    for n,items in matched.items():
        if items:
            print("MATCH",n,json.dumps(items[:2],ensure_ascii=False),flush=True)
    print(flush=True)
out=Path("/tmp/canvas_channel_audit_v014038.json")
out.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf8")
print("AUDIT_SUCCESS",out,flush=True)
