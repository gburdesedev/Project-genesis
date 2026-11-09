# Project Genesis: apples-to-apples V010 vs V011 ash comparison, real imported GLBs.
# Blender 4.5.13 LTS; candidate only. No baked changes to shaders or geometry.
from pathlib import Path
import bpy,json
from mathutils import Vector
out=Path('previews/carbon_vegetal_v011').resolve()
out.mkdir(parents=True,exist_ok=True)
old=Path('assets/playcanvas/approved/materials/charcoal/v010/carbon_vegetal_v010_tres_piezas_web.glb').resolve()
new=out/'carbon_vegetal_v011_ceniza_sutil_candidato.glb'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
world=bpy.data.worlds.new('V011 controlled light comparison')
bpy.context.scene.world=world;world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(.32,.34,.36,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.54
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=40
scene.render.resolution_x=950;scene.render.resolution_y=760;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.18
def soft(name,at,relative,power,size):
    data=bpy.data.lights.new(name,'AREA')
    data.energy=power;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data)
    bpy.context.collection.objects.link(ob)
    ob.location=at+Vector(relative)
    ob.rotation_euler=(at-ob.location).to_track_quat('-Z','Y').to_euler()
    return ob
data=bpy.data.cameras.new('review');data.type='ORTHO'
cam=bpy.data.objects.new('review',data);bpy.context.collection.objects.link(cam);scene.camera=cam
center=None
for version,filepath in [('v010',old),('v011',new)]:
    for o in list(bpy.data.objects):
        if o.type=='MESH':bpy.data.objects.remove(o,do_unlink=True)
    bpy.ops.import_scene.gltf(filepath=str(filepath))
    meshes=[o for o in scene.objects if o.type=='MESH']
    if len(meshes)!=3:raise RuntimeError('The GLB must have precisely 3 charcoal pieces')
    bpy.context.view_layer.update()
    coordinates=[o.matrix_world@Vector(v) for o in meshes for v in o.bound_box]
    midpoint=Vector([(min(p[i] for p in coordinates)+max(p[i] for p in coordinates))/2 for i in range(3)])
    extent=max(max(p[i] for p in coordinates)-min(p[i] for p in coordinates) for i in range(3))
    if center is None:
        center=midpoint
        soft('Soft overhead',center,(3,-4,5),695,4.5)
        soft('Fibre rake',center,(-3,2,3),520,3.0)
        soft('Fill for cracks',center,(0,-2,1),220,4.0)
    elif (center-midpoint).length>0.0001:raise RuntimeError('Different transforms between V010 and V011')
    for name,position,factor in [
        ('three_quarter',(3.1,-4.7,3.1),1.67),
        ('side',(4.7,-2.3,2.1),1.55),
        ('upper',(1.5,-3.0,5.2),1.6),
    ]:
        cam.location=center+Vector(position)
        cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
        data.ortho_scale=max(.6,extent*factor)
        scene.render.filepath=str(out/(version+'_'+name+'.png'))
        bpy.ops.render.render(write_still=True)
    if version=='v011':
        # Candidate thumbnail only: do not overwrite V010 in-game mobile poster.
        scene.render.film_transparent=True
        scene.render.resolution_x=640;scene.render.resolution_y=640
        data.ortho_scale=max(.6,extent*1.67)
        cam.location=center+Vector((3.1,-4.7,3.1))
        cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(out/'v011_poster_candidate.png')
        bpy.ops.render.render(write_still=True)
print('V011_ASH_SHADE_COMPARISON_RENDERED', 'normal/roughness left intact')
