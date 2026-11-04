#!/usr/bin/env python3
"""Read-only V018 GLB world-space bound report; approved masters untouched."""
import json,struct,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATHS={
 "herrero_walls":"assets/playcanvas/approved/workshops/herrero/walls/v082/blacksmith_four_walls_arched_v082.glb",
 "arcanista_walls":"assets/playcanvas/approved/workshops/arcanista/walls/v006/arcanista_four_walls_preview.glb",
 "herrero_door":"assets/playcanvas/approved/workshops/herrero/doors/v082-b/door-herrero-v082-b.glb",
 "arcanista_door":"assets/playcanvas/approved/workshops/arcanista/doors/v027/Arcanist_Door_V027_WebGL.glb",
 "herrero_roof":"assets/vendor/genesis/externals/blacksmithRoofV013/src/blacksmith_roof_preview.glb",
 "herrero_chimney":"assets/vendor/genesis/externals/blacksmithChimneyV013/src/blacksmith_chimney_candidate_preview.glb"
}
def bounds(g):
 out=[]
 def ident():return [1.,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]
 def mul(a,b):return [sum(a[k*4+r]*b[c*4+k] for k in range(4))for c in range(4)for r in range(4)]
 def local(n):
  if "matrix" in n:return n["matrix"]
  x,y,z,w=n.get("rotation",[0,0,0,1]);sx,sy,sz=n.get("scale",[1,1,1]);tx,ty,tz=n.get("translation",[0,0,0])
  return [(1-2*(y*y+z*z))*sx,2*(x*y+z*w)*sx,2*(x*z-y*w)*sx,0,
    2*(x*y-z*w)*sy,(1-2*(x*x+z*z))*sy,2*(y*z+x*w)*sy,0,
    2*(x*z+y*w)*sz,2*(y*z-x*w)*sz,(1-2*(x*x+y*y))*sz,0,
    tx,ty,tz,1]
 def walk(i,m):
  n=g["nodes"][i];m=mul(m,local(n))
  if "mesh" in n:
   for p in g["meshes"][n["mesh"]]["primitives"]:
    a=g["accessors"][p["attributes"]["POSITION"]]
    if "min" not in a:continue
    for x in (a["min"][0],a["max"][0]):
     for y in (a["min"][1],a["max"][1]):
      for z in (a["min"][2],a["max"][2]):
       out.append([m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]])
  for child in n.get("children",[]):walk(child,m)
 for i in g["scenes"][g.get("scene",0)]["nodes"]:walk(i,ident())
 return [[round(min(q[i]for q in out),4)for i in range(3)],[round(max(q[i]for q in out),4)for i in range(3)]]
def main():
 result={}
 for k,p in PATHS.items():
  data=(ROOT/p).read_bytes();assert data[:4]==b'glTF'
  sz,ty=struct.unpack_from("<II",data,12);assert ty==0x4E4F534A
  g=json.loads(data[20:20+sz])
  mn,mx=bounds(g)
  result[k]={"size":len(data),"min":mn,"max":mx,"extent":[round(mx[i]-mn[i],4)for i in range(3)],"meshes":len(g["meshes"]),"nodes":len(g["nodes"])}
 print("V018 GLB BOUNDS "+json.dumps(result,ensure_ascii=False,indent=2))
 Path("v018-geometry-audit.json").write_text(json.dumps(result,indent=2))
if __name__=="__main__":main()
