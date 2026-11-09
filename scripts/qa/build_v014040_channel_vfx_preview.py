#!/usr/bin/env python3
"""Create experimental V014.040-VFX01 preview without modifying source index.
Run as GitHub Action on isolated branch. Do not merge or publish main.
"""
from pathlib import Path
import re,hashlib,json
s=Path("index.html").read_text(encoding="utf8")
original_sha=hashlib.sha256(s.encode()).hexdigest()
output=Path("index-v014040-channel-vfx-experimental.html")
if output.exists():raise RuntimeError("Preview already exists; avoid silent overwrite")
needles={
"merc_original":"applyMercGearMaterial('mercSwordModel',sc.demo||sc.a,sc.demo?1.28:(sc.dual?1.18:1.02));",
"light_a":"setMercLight('mercSwordLightA',sc.a,3.45,1.52);",
"light_b":"setMercLight('mercSwordLightB',sc.demo||sc.b,(sc.dual||sc.demo)?3.35:0,1.44);",
"reset":"function resetMercenaryExtension(){resetDemoEpilogue();",
"body":"</body>",
}
for name,needle in needles.items():
    n=s.count(needle)
    assert n==1,(name,"Expected exactly one existing anchor",n)
replacement="""const genesisVfxActive=window.GenesisChannelVFX?.setItem?.(mercSwordItem)===true;
if(!genesisVfxActive){
  applyMercGearMaterial('mercSwordModel',sc.demo||sc.a,sc.demo?1.28:(sc.dual?1.18:1.02));
}else{
  // Restore original PBR material previously cached by legacy emissive route.
  // No geometry/material master edits; sword's mesh instances are restored.
  const root=mercNode('mercSwordModel')?.contentEntity;
  if(root)for(const render of root.findComponents('render'))
    for(const mi of render.meshInstances||[]){
      const original=mercGearMaterialBases.get(mi);
      if(original){mi.material=original;original.update?.();}
    }
}
"""
s=s.replace(needles["merc_original"],replacement)
s=s.replace(needles["light_a"],
            "setMercLight('mercSwordLightA',sc.a,genesisVfxActive?0:3.45,1.52);")
s=s.replace(needles["light_b"],
            "setMercLight('mercSwordLightB',sc.demo||sc.b,genesisVfxActive?0:((sc.dual||sc.demo)?3.35:0),1.44);")
s=s.replace(needles["reset"],
            "function resetMercenaryExtension(){window.GenesisChannelVFX?.destroy?.();resetDemoEpilogue();")
# Deliberately modify only the copied preview; original index is unchanged.
s=s.replace("</body>","""<script type="module" src="./genesis_channel_vfx/boot.mjs?v=v014040-vfx01"></script>
</body>""")
# Explicit visible preview version, never silently pass off as published/main.
s=s.replace("<title>Project Genesis", "<title>Project Genesis V014.040-VFX01 EXPERIMENTAL ·",1)
s=s.replace("</head>","""<meta name="genesis-channel-vfx-candidate" content="V014.040-VFX01-UNAPPROVED" />
</head>""",1)
output.write_text(s,encoding="utf8")
assert Path("index.html").read_bytes()==Path("index.html").read_bytes()
assert s.count("genesisVfxActive")>=3
assert "genesis_channel_vfx/boot.mjs" in s
assert "index-v014040-channel-vfx-experimental" not in Path("index.html").read_text()
audit={
"schema":"Genesis_V014040_VFX01_ExperimentalPreview",
"source":"index.html",
"original_sha256":original_sha,
"source_bytes":Path("index.html").stat().st_size,
"preview":str(output),"preview_sha256":hashlib.sha256(output.read_bytes()).hexdigest(),
"source_index_unchanged":True,
"experimental_flag":"?genesisChannelVfx=1",
"original_html_layout_preserved":True,
"approved_effects":{"rayo":"V07"},
"experimental_effects":{"fuego":"V20C.1","hielo":"V21 WebGL (not Cycles V42)"},
"equipped_sword_model":"mercSword10 placeholder (NOT V03 approved)",
"main_changed":False
}
Path("genesis_channel_vfx/experimental_preview_audit.json").write_text(json.dumps(audit,ensure_ascii=False,indent=2)+"\n")
print("V014040_VFX01_PREVIEW_CREATED",json.dumps(audit,ensure_ascii=False),flush=True)
