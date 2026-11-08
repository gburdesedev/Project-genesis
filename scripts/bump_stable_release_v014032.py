#!/usr/bin/env python3
"""Bounded 8-Nov-2026 release version/cache bump for the main integration candidate.
No world model, approved artwork, game logic or save keys are modified.
"""
from pathlib import Path
import re
index = Path("index.html")
prep = Path("preparacion_control.js")
src = index.read_text(encoding="utf-8")
js = prep.read_text(encoding="utf-8")
old_version = "v0.14.022"
new_version = "v0.14.032"
old_build = "20261102.04"
new_build = "20261108.01"
old_cache = "genesis_ui_approved.js?v=20261108.1"
new_cache = "genesis_ui_approved.js?v=20261108.2"
old_css_cache = "genesis_ui_approved.css?v=20261108.1"
new_css_cache = "genesis_ui_approved.css?v=20261108.2"
if new_version in src:
    print("RELEASE_TAGS_ALREADY_AT_V014032")
    raise SystemExit(0)
if src.count(old_version) != 10:
    raise RuntimeError(f"Version occurrences changed on main: {src.count(old_version)} != 10")
if src.count(old_build) < 3:
    raise RuntimeError(f"Build identifier missing: {src.count(old_build)}")
if js.count(old_cache) != 1 or js.count(old_css_cache) != 1:
    raise RuntimeError("Approved UI script/cache source changed unexpectedly")
src = src.replace(old_version, new_version).replace(old_build, new_build)
# Revalidate every entry point that actually references Preparation.
src, num_refs = re.subn(r"(preparacion_control\.js\?v=)[A-Za-z0-9._-]+",r"\g<1>0.14.032-20261108.01",src)
if num_refs > 3:
    raise RuntimeError("Unexpected duplicated Preparation cache entries: "+str(num_refs))
js = js.replace(old_cache,new_cache).replace(old_css_cache,new_css_cache)
assert old_version not in src and old_build not in src
assert "v0.14.032" in src and "20261108.01" in src
assert "genesis_ui_approved.js?v=20261108.2" in js
index.write_text(src, encoding="utf-8")
prep.write_text(js, encoding="utf-8")
print("RELEASE_TAG_PATCH",{"visible_version":new_version,"build":new_build,
    "title_hud_identifiers":10,"preparation_index_cache_refs":num_refs,
    "ui_js_cache":"20261108.2","files":["index.html","preparacion_control.js"]})
