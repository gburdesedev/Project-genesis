#!/usr/bin/env python3
"""Generate game-ready 3-piece charcoal from already-reviewed V009, preserving the CC0 V008 scanned fibre geometry."""
from pathlib import Path
import io, hashlib, json, requests
import trimesh
from PIL import Image
from trimesh.visual.material import PBRMaterial
import numpy as np

ROOT=Path('assets/playcanvas/approved/materials/charcoal/v010')
ROOT.mkdir(parents=True,exist_ok=True)
SOURCE='https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/main/previews/charcoal_pile_v009/model_web.glb'
response=requests.get(SOURCE,timeout=80,headers={'User-Agent':'ProjectGenesis-Automated-Asset-Integration/1'})
response.raise_for_status()
if not (1000000 < len(response.content) < 4000000): raise ValueError('Unexpected source asset size')
scene=trimesh.load(io.BytesIO(response.content),file_type='glb',force='scene')
if len(scene.geometry)!=1: raise ValueError('Expected single shared photographic scan mesh')
original=next(iter(scene.geometry.values()))
if not 20000 <= len(original.faces) <= 30000 or original.visual.uv is None: raise ValueError('Unexpected scan geometry or missing UV')
pieces=['01_carbon_base','02_carbon_cross','03_carbon_diagonal']
if not all(n in scene.graph.nodes_geometry for n in pieces): raise ValueError('Three original shapes not found')
source_material=original.visual.material
game_material=PBRMaterial(name='Genesis_CarbonVegetal_V010_CC0_PBR1536')
for kind in ('baseColorTexture','normalTexture','metallicRoughnessTexture'):
    original_image=getattr(source_material,kind,None)
    if original_image is None: raise ValueError('Missing source texture '+kind)
    im=original_image.convert('RGB').resize((1536,1536),Image.Resampling.LANCZOS)
    stream=io.BytesIO(); im.save(stream,format='JPEG',quality=94,subsampling=0,optimize=True)
    setattr(game_material,kind,Image.open(io.BytesIO(stream.getvalue())))
game_material.metallicFactor=0.0
game_material.roughnessFactor=1.0
game_material.doubleSided=True
mesh=original.copy()
mesh.visual=trimesh.visual.TextureVisuals(uv=original.visual.uv.copy(),material=game_material)
game_scene=trimesh.Scene()
for i,n in enumerate(pieces):
    transform,geometry=scene.graph[n]
    if not np.isfinite(transform).all(): raise ValueError('Invalid transform')
    if i==0:game_scene.add_geometry(mesh,geom_name='Carbon_V008_Real_Scan_Shared',node_name=n,transform=transform)
    else:game_scene.graph.update(frame_to=n,frame_from=game_scene.graph.base_frame,matrix=transform,geometry='Carbon_V008_Real_Scan_Shared')
dest=ROOT/'carbon_vegetal_v010_tres_piezas_web.glb'
dest.write_bytes(game_scene.export(file_type='glb'))
check=trimesh.load(dest,file_type='glb',force='scene')
assert len(check.geometry)==1 and len(check.graph.nodes_geometry)==3
assert set(check.graph.nodes_geometry)==set(pieces)
assert len(next(iter(check.geometry.values())).faces)==len(original.faces)
assert next(iter(check.geometry.values())).visual.uv is not None
for kind in ('baseColorTexture','normalTexture','metallicRoughnessTexture'):
    assert getattr(next(iter(check.geometry.values())).visual.material,kind) is not None
assert dest.stat().st_size<1600000, 'Web bundle exceeds 1.6 MB target'
manifest={
 'id':'PG_CarbonVegetal_V010_3Pieces','status':'integrated_visual_approval_for_playcanvas_test',
 'source':SOURCE,'source_sha256':hashlib.sha256(response.content).hexdigest(),
 'license':'CC0 Poly Haven Dead Tree Trunk 02 + Project Genesis carbonization and assembly',
 'model_path':dest.as_posix(),'poster_path':(ROOT/'carbon_vegetal_v010_poster.png').as_posix(),
 'size_bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),
 'unique_meshes':1,'instances':3,'triangles_per_instance':len(mesh.faces),'rendered_triangles':3*len(mesh.faces),
 'texture_resolution':'1536x1536','pbr_maps':['albedo','normal','roughness'],
 'original_recipe_unchanged':True,'hover_degrees':45,'mobile_fallback':'RGBA poster'}
(ROOT/'asset-lock.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))
print('GENESIS_CARBON_WEB',json.dumps(manifest,ensure_ascii=False))
