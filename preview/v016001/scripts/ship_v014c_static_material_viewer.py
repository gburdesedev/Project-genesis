#!/usr/bin/env python3
"""Project Genesis v0.14c - display materials static at large scale;
animate only small inventory slots on hover/touch. NO asset or art changes.
"""
from pathlib import Path
import json
js_path=Path('preparacion_control.js')
index_path=Path('index.html')
source=js_path.read_text(encoding='utf-8')
def replace_once(old,new):
    global source
    count=source.count(old)
    if count!=1: raise SystemExit(f'UI contract changed: expected one instance, got {count}: {old[:70]}')
    source=source.replace(old,new)
replace_once(
    '// El carbón aprobado se ve en 3D también en el visor central del inventario.\n    // Los otros recursos conservan su comportamiento aprobado (lingote central: PNG).\n    const render3D = !safePreviews && art.model && (type !== \'featured\' || material === CHARCOAL);',
    '// Regla aprobada: el visor grande muestra una imagen PNG estática.\n    // Sólo las casillas pequeñas usan GLB y giran cuando reciben hover.\n    const render3D = !safePreviews && art.model && type !== \'featured\';')
replace_once(
    "document.querySelectorAll('.prepSkinModal .prepSkinSlot .prepMaterialVisual, .prepSkinModal .workspaceViewer .prepMaterialVisual.charcoal').forEach(surface => {",
    "document.querySelectorAll('.prepSkinModal .prepSkinSlot .prepMaterialVisual').forEach(surface => {")
replace_once(
    "const slot = surface.closest('.prepSkinSlot') || surface.closest('.workspaceViewer');",
    "const slot = surface.closest('.prepSkinSlot');")
replace_once(
    "// Se crea después de skinDisplay: conectar el hover del carbón también en el visor central.\n    bindModelHover();",
    "// El visor grande es una imagen fija. El hover ya se conectó sólo a las casillas en skinDisplay().")
# Keep no autorepeat: the only requestAnimationFrame used for rotation is inside slot hover loop.
assert "const render3D = !safePreviews && art.model && type !== 'featured';" in source
assert ".workspaceViewer .prepMaterialVisual.charcoal').forEach" not in source
assert "surface.closest('.workspaceViewer')" not in source
assert source.count('bindModelHover();')==1
assert "if (active) angle = 45 * Math.sin(" in source
assert "viewer.cameraOrbit =" in source
assert "poster: 'assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_poster.png'" in source
assert "model: 'assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_final_3_piezas_web.glb'" in source
# In case large image appears on a surface with generic class, featured must use poster, regardless of model.
js_path.write_text(source,encoding='utf-8')

html=index_path.read_text(encoding='utf-8')
for before,after,expected in [
    ('v0.14b','v0.14c',10),
    ('20261031.01','20261031.02',4),
    ('./preparacion_control.js?v=0.14b.019-carbon-v011-final',
     './preparacion_control.js?v=0.14c.020-static-featured',1)
]:
    count=html.count(before)
    if count!=expected:raise SystemExit(f'Unexpected game build, {before} expected {expected}, got {count}')
    html=html.replace(before,after)
assert '<title>Project Genesis v0.14c · Build 20261031.02' in html
assert '<div id="brand">PROJECT GENESIS · v0.14c · BUILD 20261031.02' in html
assert 'playcanvas-v0.14c-build-20261031.02' in html
index_path.write_text(html,encoding='utf-8')
manifest={
 'game_version':'v0.14c','build':'20261031.02','date':'2026-10-31',
 'change':'Visor grande de materiales estático; giro ±45 sólo en casillas pequeñas con hover',
 'material':'Carbón vegetal V011 FINAL de demo',
 'slot_model_3D':'no cambia; giro ±45 sólo con hover; vuelve a 0 sin hover',
 'featured_large_image':'PNG fijo, jamás cargar GLB en featured',
 'approved_art_preserved':True,'geometry_uv_pbr_unchanged':True,
 'recipe_and_material_stock_unchanged':True,
 'rollback_game_version':'v0.14b Build 20261031.01'
}
Path('previews').mkdir(exist_ok=True)
Path('previews/v014c_static_featured_manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('PASS: '+json.dumps(manifest,ensure_ascii=False))
