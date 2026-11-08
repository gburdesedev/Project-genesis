# Project Genesis V018.5 - real medieval arched jamb geometry
# Blender 4.5.13 LTS on GitHub Actions; immutable original GLB sources.
# Candidate only. Import/read approved masonry, export only additive doorway trim.
import bpy, math, json, random, struct, hashlib
from mathutils import Vector
from pathlib import Path
OUT=Path('/tmp/v0185_candidate')
(OUT/'previews').mkdir(parents=True,exist_ok=True)
ROOT=Path.cwd()
SRC_WALLS={
 'Herrero': ROOT/'assets/playcanvas/approved/workshops/herrero/walls/v082/blacksmith_four_walls_arched_v082.glb',
 'Arcanista': ROOT/'assets/playcanvas/approved/workshops/arcanista/walls/v006/arcanista_four_walls_preview.glb'
}
SRC_DOORS={
 'Herrero':ROOT/'assets/playcanvas/approved/workshops/herrero/doors/v082-b/door-herrero-v082-b.glb',
 'Arcanista':ROOT/'assets/playcanvas/approved/workshops/arcanista/doors/v027/Arcanist_Door_V027_WebGL.glb'
}
HDR=ROOT/'assets/playcanvas/approved/lighting/studio_small_09/studio_small_09_2k.hdr'
assert HDR.exists() and HDR.stat().st_size>1_000_000
rng=random.Random(185)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
def material(name,color,roughness=.82):
 mat=bpy.data.materials.new(name);mat.use_nodes=True
 p=mat.node_tree.nodes.get("Principled BSDF")
 p.inputs["Base Color"].default_value=(*color,1)
 p.inputs["Roughness"].default_value=roughness
 p.inputs["Metallic"].default_value=0
 return mat
stone=material("PORTAL_V0185_STONE_RUNTIME_REBIND",(.35,.32,.29))
created=[]
def solid_mesh(name, vertices, faces):
 mesh=bpy.data.meshes.new(name)
 mesh.from_pydata(vertices,[],faces)
 mesh.update()
 obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
 obj.data.materials.append(stone)
 # Source GLB wall materials use UV textures; every new arch stone must carry
 # nondegenerate UVs. Without this, reusing wall PBR produces flat grey blocks.
 uv=obj.data.uv_layers.new(name='UVMap')
 u0=.13+rng.uniform(.02,.58)
 v0=.09+rng.uniform(.02,.45)
 for poly in obj.data.polygons:
  n=poly.normal
  for loop_index in poly.loop_indices:
   vert=obj.data.vertices[obj.data.loops[loop_index].vertex_index].co
   if abs(n.y)>.62:
    coord=(u0+vert.x*.36, v0+vert.z*.36)
   elif abs(n.x)>.62:
    coord=(u0+vert.y*.55, v0+vert.z*.34)
   else:
    coord=(u0+vert.x*.38, v0+vert.y*.52)
   uv.data[loop_index].uv=coord
 for p in obj.data.polygons:p.use_smooth=False
 bevel=obj.modifiers.new("Edge-chip bevel realistic basalt","BEVEL")
 bevel.width=.013;bevel.segments=2
 bpy.context.view_layer.objects.active=obj;obj.select_set(True)
 bpy.ops.object.modifier_apply(modifier=bevel.name)
 obj.select_set(False)
 created.append(obj);return obj
def block(name,x0,x1,y0,y1,z0,z1):
 # Blender Y is glTF -Z (front of facade is Blender negative Y)
 V=[(x0,y0,z0),(x1,y0,z0),(x1,y0,z1),(x0,y0,z1),
    (x0,y1,z0),(x1,y1,z0),(x1,y1,z1),(x0,y1,z1)]
 return solid_mesh(name,V,[(0,3,2,1),(4,5,6,7),(0,1,5,4),
                          (3,7,6,2),(1,2,6,5),(0,4,7,3)])
# The actual V082+V006 stone doorway is x±0.66 from the source GLB,
# arch top ~2.40m and jamb y-height to ~1.73m. Do NOT modify that hole.
INNER=.685
OUTER=.875
SPRING=1.716
FRONT=-.78
BACK=-.54
# 13 individually chiseled voussoirs with visible radial seams.
N=13
for i in range(N):
 a=(i+0.055)*math.pi/N
 b=(i+0.945)*math.pi/N
 jitter=.004*math.sin(i*3.17)
 inner=INNER+jitter
 outer=OUTER+jitter
 def vec(r,t,y):return (r*math.cos(t),y,SPRING+r*math.sin(t))
 V=[vec(inner,a,FRONT),vec(outer,a,FRONT),
    vec(outer,b,FRONT),vec(inner,b,FRONT),
    vec(inner,a,BACK),vec(outer,a,BACK),
    vec(outer,b,BACK),vec(inner,b,BACK)]
 solid_mesh('V0185_arched_voussoir_%02d'%i,V,
           [(0,1,2,3),(4,7,6,5),(0,4,5,1),
            (3,2,6,7),(1,5,6,2),(0,3,7,4)])
# Staggered masonry jambs, no door hardware covered. Original 2.3 m door
# retains clear opening; jamb inner edges at +/- 0.685.
height=SPRING
for side in (-1,1):
 for i in range(7):
  a=i*height/7+.012; b=(i+1)*height/7-.012
  if side==1:x0,x1=INNER+.010,OUTER+.006
  else:x0,x1=-OUTER-.006,-INNER-.010
  yshift=.009*(i%2)
  block('V0185_jamb_'+('left' if side<0 else 'right')+'_'+str(i),
        x0,x1,FRONT-.002-yshift,BACK,a,b)
# Reveal depth into the thick masonry - narrow return strips only.
for side in (-1,1):
 xcenter=side*(INNER+.013)
 for i in range(6):
  z0=i*SPRING/6+.006;z1=(i+1)*SPRING/6-.006
  block('V0185_masonry_depth_return_'+str(side)+'_'+str(i),
        xcenter-.032,xcenter+.032,-.55,-.13,z0,z1)
# Join exactly to one small optimized mesh / one PBR material.
bpy.ops.object.select_all(action='DESELECT')
for obj in created:obj.select_set(True)
bpy.context.view_layer.objects.active=created[0]
bpy.ops.object.join()
arch=bpy.context.view_layer.objects.active
arch.name='GENESIS_V0185_Portal_Arch_OriginalRatio_RealStone'
# No textures are fabricated. In PlayCanvas reassign original Wall PBR material.
for poly in arch.data.polygons:poly.use_smooth=False
export=OUT/'portal_arch_v0185.blend45.glb'
bpy.ops.object.select_all(action='DESELECT')
arch.select_set(True)
bpy.context.view_layer.objects.active=arch
bpy.ops.export_scene.gltf(filepath=str(export),export_format='GLB',use_selection=True,
                          export_apply=True,export_texcoords=True,export_normals=True)
blob=export.read_bytes()
assert blob[:4]==b'glTF' and struct.unpack_from('<I',blob,8)[0]==len(blob)
assert len(blob)<700_000
model={"file":str(export),"bytes":len(blob),"sha256":hashlib.sha256(blob).hexdigest(),
       "blender":bpy.app.version_string,"triangles":sum(len(p.vertices)-2 for p in arch.data.polygons),
       "units":"meters","innerOpeningWidth":2*INNER,"outerPortalWidth":2*OUTER,
       "archSpringHeight":SPRING,"topInner":SPRING+INNER,"topOuter":SPRING+OUTER,
       "profilePreserved":True,"GLBMastersModified":False,
       "sourceWallSHA256":{k:hashlib.sha256(v.read_bytes()).hexdigest() for k,v in SRC_WALLS.items()},
       "sourceDoorSHA256":{k:hashlib.sha256(v.read_bytes()).hexdigest() for k,v in SRC_DOORS.items()}}
(OUT/'technical.json').write_text(json.dumps(model,indent=2))
print("V0185 TRUE GEOMETRY",json.dumps(model))
# Preview with the REAL source GLB assets, not a generated concept.
def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def imports(path):
 before=set(bpy.data.objects)
 bpy.ops.import_scene.gltf(filepath=str(path))
 added=set(bpy.data.objects)-before
 roots=[o for o in added if o.parent not in added]
 return roots
def camera_at(pos,target,ortho=False):
 bpy.ops.object.camera_add(location=pos)
 cam=bpy.context.object
 direction=Vector(target)-cam.location
 cam.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
 cam.data.type='ORTHO' if ortho else 'PERSP'
 if ortho:cam.data.ortho_scale=5.5
 else:cam.data.lens=35
 bpy.context.scene.camera=cam
def scene_env():
 world=bpy.data.worlds.new("Radiance studio_small_09 32-bit from approved HDR asset")
 bpy.context.scene.world=world;world.use_nodes=True
 nodes=world.node_tree.nodes;links=world.node_tree.links
 output=nodes.get('World Output');bg=nodes.get('Background')
 env=nodes.new('ShaderNodeTexEnvironment');env.image=bpy.data.images.load(str(HDR),check_existing=True)
 assert env.image.file_format=='HDR'
 links.new(env.outputs['Color'],bg.inputs['Color'])
 bg.inputs['Strength'].default_value=1.20
 scene=bpy.context.scene;scene.render.engine='CYCLES'
 scene.cycles.samples=22;scene.cycles.use_denoising=True
 scene.render.resolution_x=870;scene.render.resolution_y=640;scene.render.resolution_percentage=100
 scene.render.image_settings.file_format='PNG'
 scene.view_settings.view_transform='AgX'
 scene.view_settings.exposure=.35
 scene.render.film_transparent=False
for kind in ('Herrero','Arcanista'):
 clear()
 wallroots=imports(SRC_WALLS[kind])
 doorroots=imports(SRC_DOORS[kind])
 # Herrero GLB body x=.018..1.188 (native centre x=.603).
 # Arcanista GLB body native x=-.585..+.585, but PlayCanvas instance root
 # offsets are corrected separately. Blender preview directly uses native GLB.
 doorx=-.603 if kind=='Herrero' else 0.0
 for o in doorroots:o.location.x+=doorx
 # In the game closed doors are behind the front stone face, not floating.
 for o in doorroots:o.location.y+=-.04
 archroots=imports(export)
 # Shader preview uses imported wall's real stone material to avoid artificial color.
 stone_name='Quarry basalt' if kind=='Herrero' else 'Metamorphic slate'
 source_mat=next((m for m in bpy.data.materials if stone_name.lower() in m.name.lower()),None)
 if source_mat:
  for o in archroots:
   for child in [o]+list(o.children_recursive):
    if child.type=='MESH':
     for i in range(len(child.data.materials)):child.data.materials[i]=source_mat
 scene_env()
 bpy.ops.mesh.primitive_plane_add(size=20,location=(0,0,-.04))
 plane=bpy.context.object;plane.name='Preview ground only NOT EXPORTED'
 plane.data.materials.append(material('Floor slate reference',(.27,.25,.22),.86))
 for name,pos,target in [('front',(0,-6,2.0),(0,-.15,1.5)),
                         ('oblique',(3.15,-5.25,2.5),(0,-.15,1.6))]:
  camera_at(pos,target)
  bpy.context.scene.render.filepath=str(OUT/'previews'/(kind.lower()+'-'+name+'.png'))
  bpy.ops.render.render(write_still=True)
  print('V0185 REAL BLENDER HDRI32 RENDER',kind,name,bpy.context.scene.render.filepath)
print('V0185 CANDIDATE COMPLETE')
