# Blender 4.5.13 LTS / Cycles / original HDRI 32-bit. Art-only review: never edits GLB.
import bpy
import hashlib
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
DOOR=ROOT/'assets/playcanvas/approved/workshops/herrero/doors/v082-b/door-herrero-v082-b.glb'
HDR=ROOT/'assets/playcanvas/approved/lighting/studio_small_09/studio_small_09_2k.hdr'
OUT=ROOT/'reports/v017-herrero-door-hdri32'
OUT.mkdir(parents=True,exist_ok=True)
assert tuple(bpy.app.version[:3])==(4,5,13),f'Blender wrong version: {bpy.app.version_string}'
assert DOOR.is_file() and HDR.is_file()
hdr_bytes=HDR.read_bytes()
assert b'FORMAT=32-bit_rle_rgbe' in hdr_bytes[:256]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

bpy.ops.import_scene.gltf(filepath=str(DOOR))
meshes=[obj for obj in bpy.context.scene.objects if obj.type=='MESH']
assert meshes,'GLB contains no meshes'
points=[obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
mins=Vector(tuple(min(p[i] for p in points) for i in range(3)))
maxs=Vector(tuple(max(p[i] for p in points) for i in range(3)))
center=(mins+maxs)/2
span=maxs-mins
assert max(span)>0,'Empty geometry'
triangles=sum(sum(max(1,len(p.vertices)-2) for p in ob.data.polygons) for ob in meshes)
materials=sorted(set(m.name for ob in meshes for m in ob.data.materials if m))
assert len(materials)>0,'GLB imported without any material'

scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=1152
scene.render.resolution_y=1152
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.view_settings.exposure=.4
scene.render.image_settings.color_mode='RGBA'
scene.render.engine='CYCLES'
world=bpy.data.worlds.new('Studio Small 09 · Original 32-bit Radiance HDR')
scene.world=world
world.use_nodes=True
nodes=world.node_tree.nodes
nodes.clear()
out=nodes.new('ShaderNodeOutputWorld')
bg=nodes.new('ShaderNodeBackground')
tex=nodes.new('ShaderNodeTexEnvironment')
tex.image=bpy.data.images.load(str(HDR),check_existing=True)
bg.inputs['Strength'].default_value=1.10
world.node_tree.links.new(tex.outputs['Color'],bg.inputs['Color'])
world.node_tree.links.new(bg.outputs['Background'],out.inputs['Surface'])

cam_data=bpy.data.cameras.new('V017 evaluation camera')
cam=bpy.data.objects.new('V017 evaluation camera',cam_data)
bpy.context.collection.objects.link(cam)
scene.camera=cam
cam_data.type='ORTHO'
cam_data.ortho_scale=max(span.x,span.z,span.y)*1.50
# Neutral key/fill preserves the original HDRI. Extra soft area illumination ONLY
# compensates for deep black forged iron in art review; not baked into the GLB.
def add_fill(name,offset,power,size,color):
    light=bpy.data.lights.new(name,'AREA')
    light.energy=power
    light.shape='DISK'
    light.size=size
    light.color=color
    obj=bpy.data.objects.new(name,light)
    bpy.context.collection.objects.link(obj)
    obj.location=center+Vector(offset)
    obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
    return obj
add_fill('Review key · broad neutral softbox',(-2.7,-3.5,3.2),1150,4.6,(1.0,.95,.89))
add_fill('Review rim · soft cold bounce',(2.4,2.6,3.4),650,3.8,(.88,.94,1.0))

def render(name,direction):
    direction=Vector(direction).normalized()
    cam.location=center+direction*max(4,max(span)*3)
    track=center-cam.location
    cam.rotation_euler=track.to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(OUT/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    assert Path(scene.render.filepath).stat().st_size>10000,'Empty rendered image'

for name,point in [
 ('front',(0,-1,.26)),
 ('three_quarter',(1,-1,.34)),
 ('side',(1,0,.12)),
 ('rear',(0,1,.25)),
]:
    render(name,point)

report={
 'source':str(DOOR.relative_to(ROOT)),
 'original_sha256':hashlib.sha256(DOOR.read_bytes()).hexdigest(),
 'source_bytes':DOOR.stat().st_size,
 'blender':bpy.app.version_string,
 'renderer':'Cycles',
 'samples':scene.cycles.samples,
 'environment':'studio_small_09_2k.hdr',
 'environment_format':'Radiance HDR 32-bit RGBE',
 'environment_sha256':hashlib.sha256(hdr_bytes).hexdigest(),
 'lighting_note':'Same 32-bit HDRI, exposure +0.4 EV plus 2 neutral review-only soft area fills; no asset edits',
 'mesh_objects':len(meshes),
 'triangles':triangles,
 'materials':materials,
 'bounds_m':list(span),
 'views':['front.png','three_quarter.png','side.png','rear.png'],
 'decision':'PENDING_USER_VISUAL_REVIEW',
}
(OUT/'validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print('V017_HERRERO_DOOR_HDRI_REVIEW',json.dumps(report,ensure_ascii=False))
