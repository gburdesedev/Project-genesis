# Project Genesis V018.5 read-only approved GLB geometry diagnosis
# Blender 4.5.13 LTS invoked on GitHub Actions; do not mutate the approved source.
import bpy, bmesh, json
from mathutils import Vector
from pathlib import Path
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
SRC=Path("assets/playcanvas/approved/workshops/herrero/walls/v082/blacksmith_four_walls_arched_v082.glb")
bpy.ops.import_scene.gltf(filepath=str(SRC.resolve()))
report={"blender":bpy.app.version_string,"source":str(SRC),"objects":[],"front_wood_parts":[]}
def extent(coords):
    if not coords:return None
    return [[round(min(v[i] for v in coords),4) for i in range(3)],
            [round(max(v[i] for v in coords),4) for i in range(3)]]
for obj in bpy.data.objects:
  if obj.type!='MESH':continue
  matrix=obj.matrix_world
  mesh=obj.data
  coords=[tuple(matrix@v.co) for v in mesh.vertices]
  info={"object":obj.name,"verts":len(coords),"faces":len(mesh.polygons),"bbox":extent(coords),
        "material":[m.name for m in obj.data.materials if m]}
  if 'Oak' in obj.name or any('Oak' in m.name for m in obj.data.materials if m):
      # Components separated by indexed edges. Duplicated normals create several,
      # but high-level geometry remains detectable by component bounding box.
      parent=list(range(len(mesh.vertices)))
      def root(i):
        while parent[i]!=i:
          parent[i]=parent[parent[i]];i=parent[i]
        return i
      for edge in mesh.edges:
        a,b=edge.vertices
        ra,rb=root(a),root(b)
        if ra!=rb:parent[rb]=ra
      groups={}
      for i,co in enumerate(coords):
        groups.setdefault(root(i),[]).append(co)
      comps=[]
      for vv in groups.values():
        bbox=extent(vv);low,hi=bbox
        front=low[1]<0.72 # Blender glTF front = -Y, height = Z
        centered=low[0]<2.7 and hi[0]>-2.7
        if front and centered:
          comp={"verts":len(vv),"bbox":bbox}
          comps.append(comp)
      comps.sort(key=lambda c:(-c["verts"],c["bbox"][0][0]))
      info["components_front_center"]=comps[:140]
      report["front_wood_parts"]+=comps
  report["objects"].append(info)
Path("/tmp/v0185_probe.json").write_text(json.dumps(report,indent=2,ensure_ascii=False))
print("PROBE V0185 Blender",report["blender"])
for ob in report["objects"]:
  print("NODE",ob["object"],"verts",ob["verts"],"bounds",ob["bbox"],"materials",ob["material"])
  if "components_front_center" in ob:
    for p in ob["components_front_center"][:85]:
      print("FRONT OAK COMPONENT",p)
