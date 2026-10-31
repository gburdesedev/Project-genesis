# Render mobile fallback image from the final three-piece GLB with genuine transparency.
from pathlib import Path
from mathutils import Vector
import bpy
out=Path('assets/playcanvas/approved/materials/charcoal/v010').resolve()
src=out/'carbon_vegetal_v010_tres_piezas_web.glb'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(src))
models=[o for o in bpy.context.scene.objects if o.type=='MESH']
if len(models)!=3: raise RuntimeError(f'Expected exactly 3 charcoal pieces, got {len(models)}')
bpy.context.view_layer.update()
coordinates=[ob.matrix_world@Vector(corner) for ob in models for corner in ob.bound_box]
middle=Vector([(min(v[i] for v in coordinates)+max(v[i] for v in coordinates))/2 for i in range(3)])
extents=[max(v[i] for v in coordinates)-min(v[i] for v in coordinates) for i in range(3)]
width=max(extents)
world=bpy.data.worlds.new('V010 neutral charcoal studio')
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.38,.4,.42,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.50
def soft(name, offset, power, diameter):
    d=bpy.data.lights.new(name,'AREA');d.shape='DISK';d.energy=power;d.size=diameter
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o)
    o.location=middle+Vector(offset)
    o.rotation_euler=(middle-o.location).to_track_quat('-Z','Y').to_euler()
soft('Front', (3,-4,5),630,4.5)
soft('Rim',(-3,2,4),480,3.0)
soft('Fill',(0,-2,1),180,4)
data=bpy.data.cameras.new('Charcoal V010 poster cam');data.type='ORTHO';data.ortho_scale=width*1.65
cam=bpy.data.objects.new('Charcoal V010 poster cam',data)
bpy.context.collection.objects.link(cam);cam.location=middle+Vector((3.1,-4.7,3.1))
cam.rotation_euler=(middle-cam.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=44
scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=True
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.05
poster=out/'carbon_vegetal_v010_poster.png'
scene.render.filepath=str(poster)
bpy.ops.render.render(write_still=True)
import numpy as np
pixels=bpy.data.images.load(str(poster),check_existing=False)
rgba=np.empty(pixels.size[0]*pixels.size[1]*4,dtype=np.float32)
pixels.pixels.foreach_get(rgba)
alpha=rgba[3::4]
if not (alpha.min()<.01 and alpha.max()>.99 and (alpha>.2).sum()>1000):
    raise RuntimeError('Poster must have real transparent background and nonempty subject')
if poster.stat().st_size<12000:raise RuntimeError('Poster implausibly small')
print('GENESIS_CARBON_V010_POSTER',poster,poster.stat().st_size,'alpha_minmax',float(alpha.min()),float(alpha.max()))
