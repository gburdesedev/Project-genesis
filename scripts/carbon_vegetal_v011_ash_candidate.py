#!/usr/bin/env python3
"""Project Genesis - V011 ash accent test only. V010 is immutable.
Changes only the ALBEDO texture. The real scan mesh, UVs, normal map,
metallic-roughness map, instancing and physical shader remain unchanged.
"""
from pathlib import Path
import hashlib, json, io
import numpy as np
from PIL import Image, ImageFilter
import trimesh
from trimesh.visual.material import PBRMaterial

BASE=Path('assets/playcanvas/approved/materials/charcoal/v010/carbon_vegetal_v010_tres_piezas_web.glb')
ROOT=Path('previews/carbon_vegetal_v011')
ROOT.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'carbon_vegetal_v011_ceniza_sutil_candidato.glb'
src=trimesh.load(BASE,file_type='glb',force='scene')
assert len(src.geometry)==1 and len(src.graph.nodes_geometry)==3, 'V010 three-piece source changed'
mesh=next(iter(src.geometry.values()))
mat=mesh.visual.material
original=mat.baseColorTexture.convert('RGB')
normal=mat.normalTexture.convert('RGB')
rough=mat.metallicRoughnessTexture.convert('RGB')
W,H=original.size
assert (W,H)==(1536,1536) and normal.size==rough.size==original.size

pix=np.asarray(original,dtype=np.float32)
lum=(pix[:,:,0]*.2126+pix[:,:,1]*.7152+pix[:,:,2]*.0722)
rng=np.random.default_rng(31102011)
def field(x,y):
    raw=rng.integers(0,256,(y,x),dtype=np.uint8)
    blurred=Image.fromarray(raw,'L').resize((W,H),Image.Resampling.BICUBIC)
    arr=np.asarray(blurred,dtype=np.float32)
    p15,p88=np.percentile(arr,[15,88])
    return np.clip((arr-p15)/max(1,p88-p15),0,1)
macro=field(28,28)
micro=field(91,91)
patch=.68*macro+.32*micro
def smoothstep(a,b,v):
    q=np.clip((v-a)/(b-a),0,1)
    return q*q*(3-2*q)
# Ash lives in sparse connected pockets, NOT in a uniform screen overlay.
pockets=smoothstep(.58,.87,patch)
filtered=np.asarray(original.filter(ImageFilter.GaussianBlur(3.5)),dtype=np.float32)
low=(filtered[:,:,0]*.2126+filtered[:,:,1]*.7152+filtered[:,:,2]*.0722)
fibres=np.clip((lum-low+5.0)/11.0,0,1)
normalpix=np.asarray(normal,dtype=np.float32)
# Prefer protruding scanned relief over implausibly coating all dark crevices.
ridge=np.clip((normalpix[:,:,2]-147)/105,0,1)
ash=np.clip(pockets*(.12+.22*fibres)*(.6+.4*ridge),0,.34)
# A very sparse grey-cool graphite/powder tint; black core stays black.
ash_color=np.array([90,94,96],dtype=np.float32)
result=np.clip(pix*(1-ash[:,:,None])+ash_color[None,None,:]*ash[:,:,None],0,255).astype(np.uint8)
new_color=Image.fromarray(result,'RGB')
new_color.save(ROOT/'V011_albedo_ash_QA.png',optimize=True)
Image.fromarray(np.uint8(np.clip(ash*255/.34,0,255)),'L').save(ROOT/'V011_ash_distribution_QA.png')
# Same PBR texture slots and same shader. Retain the normals and roughness bitwise.
newmat=PBRMaterial(name='PG_Charcoal_V011_AshTint_PBR_OriginalNormals')
newmat.baseColorTexture=new_color
newmat.normalTexture=normal.copy()
newmat.metallicRoughnessTexture=rough.copy()
newmat.metallicFactor=mat.metallicFactor
newmat.roughnessFactor=mat.roughnessFactor
newmat.doubleSided=mat.doubleSided
updated=mesh.copy()
updated.visual=trimesh.visual.TextureVisuals(uv=np.array(mesh.visual.uv,copy=True),material=newmat)
out=trimesh.Scene()
names=['01_carbon_base','02_carbon_cross','03_carbon_diagonal']
for i,name in enumerate(names):
    transform,geom=src.graph[name]
    if i==0:out.add_geometry(updated,geom_name='Carbon_V008_AnatomicalMesh',node_name=name,transform=transform)
    else:out.graph.update(frame_to=name,frame_from=out.graph.base_frame,matrix=transform,geometry='Carbon_V008_AnatomicalMesh')
OUT.write_bytes(out.export(file_type='glb'))
chk=trimesh.load(OUT,file_type='glb',force='scene')
assert len(chk.geometry)==1 and set(chk.graph.nodes_geometry)==set(names)
chm=next(iter(chk.geometry.values()))
assert len(chm.faces)==len(mesh.faces)
assert np.array_equal(chm.vertices,mesh.vertices), 'Geometry was changed'
assert np.array_equal(chm.visual.uv,mesh.visual.uv), 'UVs were changed'
assert np.array_equal(np.asarray(chm.visual.material.normalTexture),np.asarray(normal)), 'Normal map was changed'
assert np.array_equal(np.asarray(chm.visual.material.metallicRoughnessTexture),np.asarray(rough)), 'Roughness map was changed'
assert OUT.stat().st_size<1700000, 'V011 budget exceeded'
stats={
 'version':'V011_ceniza_sutil','status':'candidate_review_only_V010_active',
 'source_approved_v010':str(BASE),'source_sha256':hashlib.sha256(BASE.read_bytes()).hexdigest(),
 'candidate_path':str(OUT),'candidate_bytes':OUT.stat().st_size,
 'candidate_sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),
 'source_triangles':len(mesh.faces),'candidate_triangles':len(chm.faces),
 'instances':3,'unique_meshes':1,'pbr_resolution':[W,H],
 'normal_map_identical':True,'roughness_map_identical':True,'mesh_uv_identical':True,
 'original_albedo_mean':float(pix.mean()),'candidate_albedo_mean':float(result.mean()),
 'ash_pixel_coverage_over_8pct_opacity':float(np.mean(ash>.08)),
 'max_ash_opacity':float(ash.max()),'mean_ash_opacity':float(ash.mean()),
 'exposure_changed_in_material':False,
 'visual_approval':False,'notes':'Sparsely masked cool-grey ash only on albedo; V010 live inventory remains unchanged'
}
(ROOT/'AUDIT.json').write_text(json.dumps(stats,indent=2,ensure_ascii=False))
print('CHARCOAL V011 ASH QA',json.dumps(stats,ensure_ascii=False))
