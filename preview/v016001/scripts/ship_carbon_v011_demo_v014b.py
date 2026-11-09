#!/usr/bin/env python3
"""Ship user-approved V011 charcoal to LIVE PlayCanvas; move v0.14a -> v0.14b.
Atomic git commit of the model, poster, inventory mapping, catalog, and visible build metadata.
Preserve original V010 assets, recipes, shader, and all UI art.
"""
from pathlib import Path
import hashlib,json,shutil,struct
import trimesh
import numpy as np
from PIL import Image

SRC=Path('previews/carbon_vegetal_v011')
OLD=Path('assets/playcanvas/approved/materials/charcoal/v010')
DEST=Path('assets/playcanvas/approved/materials/charcoal/v011')
DEST.mkdir(parents=True,exist_ok=True)
model_from=SRC/'carbon_vegetal_v011_ceniza_sutil_candidato.glb'
image_from=SRC/'v011_poster_candidate.png'
model_dest=DEST/'carbon_vegetal_v011_final_3_piezas_web.glb'
image_dest=DEST/'carbon_vegetal_v011_poster.png'
v010_model=OLD/'carbon_vegetal_v010_tres_piezas_web.glb'
aud=json.loads((SRC/'AUDIT.json').read_text())
expected_v010=aud['source_sha256']
assert hashlib.sha256(v010_model.read_bytes()).hexdigest()==expected_v010, 'V010 backup changed; abort'
assert hashlib.sha256(model_from.read_bytes()).hexdigest()==aud['candidate_sha256'], 'V011 preview SHA mismatch; abort'
assert aud['normal_map_identical'] and aud['roughness_map_identical'] and aud['mesh_uv_identical']
assert aud['instances']==3 and aud['unique_meshes']==1
assert not aud['visual_approval'], 'Do not rewrite audit history; approval recorded in final catalog'
assert model_from.stat().st_size<1700000
shutil.copyfile(model_from,model_dest)
shutil.copyfile(image_from,image_dest)
scene=trimesh.load(model_dest,force='scene',file_type='glb')
original=trimesh.load(v010_model,force='scene',file_type='glb')
assert len(scene.geometry)==1 and len(scene.graph.nodes_geometry)==3
assert len(original.geometry)==1 and len(original.graph.nodes_geometry)==3
mesh=next(iter(scene.geometry.values()))
prev=next(iter(original.geometry.values()))
assert len(mesh.faces)==len(prev.faces)==23312
assert np.array_equal(mesh.vertices,prev.vertices)
assert np.array_equal(mesh.visual.uv,prev.visual.uv)
for channel in ('normalTexture','metallicRoughnessTexture'):
    assert np.array_equal(np.asarray(getattr(mesh.visual.material,channel)),np.asarray(getattr(prev.visual.material,channel))), channel
with Image.open(image_dest) as im:
    assert im.mode=='RGBA'
    assert im.getchannel('A').getextrema()==(0,255)
    assert im.width>=512 and im.height>=512
sha=hashlib.sha256(model_dest.read_bytes()).hexdigest()
lock={
 'id':'PG_CarbonVegetal_V011_FINAL_DEMO','status':'final_approved_by_user_integrated',
 'approval_date':'2026-10-31','version':'V011_CENIZA_SUTIL_PBR1536_3_PIEZAS',
 'source_candidate':model_from.as_posix(),'source_candidate_sha256':aud['candidate_sha256'],
 'backup_v010':v010_model.as_posix(),'backup_v010_sha256':expected_v010,
 'license':'CC0 Poly Haven Dead Tree Trunk 02 + Project Genesis carbonization and ash texturing',
 'model_path':model_dest.as_posix(),'poster_path':image_dest.as_posix(),
 'size_bytes':model_dest.stat().st_size,'sha256':sha,
 'unique_meshes':1,'instances':3,'triangles_per_instance':len(mesh.faces),
 'rendered_triangles':3*len(mesh.faces),'texture_resolution':'1536x1536',
 'shader':'glTF PBR metallicRoughness','pbr_normal_identical_to_v010':True,
 'pbr_roughness_identical_to_v010':True,'geometry_uv_identical_to_v010':True,
 'hover_degrees':45,'mobile_fallback':'RGBA poster',
 'status_game_build':'v0.14b Build 20261031.01','original_recipe_unchanged':True}
(DEST/'asset-lock.json').write_text(json.dumps(lock,indent=2,ensure_ascii=False)+'\n',encoding='utf8')
catpath=Path('assets/playcanvas/approved/catalog.json')
cat=json.loads(catpath.read_text())
backup=next(x for x in cat['approved_existing_assets'] if x['id']=='material_charcoal_v010_three_pieces')
backup['current_status']='superseded_by_v011_retained_as_rollback'
backup['superseded_by']='material_charcoal_v011_three_pieces_final'
assert not any(x.get('id')=='material_charcoal_v011_three_pieces_final' for x in cat['approved_existing_assets'])
cat['approved_existing_assets'].append({
 'id':'material_charcoal_v011_three_pieces_final','profession':'Herrero',
 'category':'material_bruto_model','name':'Carbón vegetal','version':'V011_CENIZA_SUTIL_PBR1536',
 'approval':'final_approved_by_user','current_status':'integrated_in_live_playcanvas_inventory',
 'path':str(model_dest),'poster':str(image_dest),'integrity_manifest':str(DEST/'asset-lock.json'),
 'format':'GLB','pieces':3,'unique_geometry_meshes':1,
 'triangles_per_piece':len(mesh.faces),'rendered_triangles':len(mesh.faces)*3,
 'pbr_max_dimension':1536,'bytes':lock['size_bytes'],'sha256':sha,
 'pbr_normal_roughness_identical_to_v010':True,'geometry_uv_identical_to_v010':True,
 'v010_backup_untouched':True,'original_recipes_unchanged':True,
 'source_audit':'previews/carbon_vegetal_v011/AUDIT.json',
 'hover_degrees_range':[-45,45],
 'load_policy':'desktop model-viewer; mobile/safePreviews transparent PNG',
 'game_version':'v0.14b','game_build':'20261031.01'})
cat['updated_on']='2026-10-31'
catpath.write_text(json.dumps(cat,indent=2,ensure_ascii=False)+'\n',encoding='utf8')

runtime=Path('preparacion_control.js')
js=runtime.read_text(encoding='utf8')
for before,after in [
 ('assets/playcanvas/approved/materials/charcoal/v010/carbon_vegetal_v010_poster.png',
  'assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_poster.png'),
 ('assets/playcanvas/approved/materials/charcoal/v010/carbon_vegetal_v010_tres_piezas_web.glb',
  'assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_final_3_piezas_web.glb'),
 ("const exposure = material === CHARCOAL ? '1.10' : '1.45';",
  "const exposure = material === CHARCOAL ? '1.16' : '1.45';"),
]:
    assert js.count(before)==1, 'JS contract changed: '+before
    js=js.replace(before,after)
assert 'bindModelHover();' in js and "const CHARCOAL = 'Carbón vegetal';" in js
runtime.write_text(js,encoding='utf8')

main=Path('index.html')
html=main.read_text(encoding='utf8')
# Avoid overwriting any newer build if a separate developer pushed a different version.
assert html.count('v0.14a')==10, 'Found a different game version, abort'
assert html.count('20261029.02')==4, 'Found a different game build, abort'
assert html.count('./preparacion_control.js?v=0.14.018-charcoal-v010')==1
html=html.replace('v0.14a','v0.14b').replace('20261029.02','20261031.01')
html=html.replace('./preparacion_control.js?v=0.14.018-charcoal-v010',
                  './preparacion_control.js?v=0.14b.019-carbon-v011-final')
assert 'PROJECT GENESIS · v0.14b · BUILD 20261031.01' in html
assert 'playcanvas-v0.14b-build-20261031.01' in html
assert './preparacion_control.js?v=0.14b.019-carbon-v011-final' in html
main.write_text(html,encoding='utf8')

report=Path('previews/carbon_vegetal_v011/FINAL_DEMO_SHIP.json')
report.write_text(json.dumps({
 'game_version':'v0.14b','build':'20261031.01',
 'model':str(model_dest),'model_sha256':sha,'model_bytes':model_dest.stat().st_size,
 'fallback_poster':str(image_dest),'v010_rollback_retained':True,
 'same_shader_and_normal_roughness':True,'inventory':'Carbón vegetal',
 'actual_game_entrypoint':'index.html','ui_art_unchanged':True,
 'live_integration_pending_commit':True},indent=2,ensure_ascii=False)+'\n')
print('READY_TO_SHIP',json.dumps(lock,ensure_ascii=False))
