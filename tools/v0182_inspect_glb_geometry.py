#!/usr/bin/env python3
"""Read-only GLB geometry audit: find openings in front wall via true mesh triangles."""
import json,struct,math
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
MODELS={
"herrero-walls":"assets/playcanvas/approved/workshops/herrero/walls/v082/blacksmith_four_walls_arched_v082.glb",
"arcanista-walls":"assets/playcanvas/approved/workshops/arcanista/walls/v006/arcanista_four_walls_preview.glb",
"herrero-door":"assets/playcanvas/approved/workshops/herrero/doors/v082-b/door-herrero-v082-b.glb",
"arcanista-door":"assets/playcanvas/approved/workshops/arcanista/doors/v027/Arcanist_Door_V027_WebGL.glb"
}
def glb_load(path):
 b=Path(path).read_bytes()
 assert b[:4]==b"glTF"
 json_size,typ=struct.unpack_from("<II",b,12)
 assert typ==0x4e4f534a
 j=json.loads(b[20:20+json_size])
 ix=20+((json_size+3)//4)*4
 bin_size,bin_typ=struct.unpack_from("<II",b,ix)
 assert bin_typ==0x004e4942
 binary=memoryview(b)[ix+8:ix+8+bin_size]
 return j,binary
DT={5120:np.dtype("i1"),5121:np.dtype("u1"),5122:np.dtype("<i2"),5123:np.dtype("<u2"),5125:np.dtype("<u4"),5126:np.dtype("<f4")}
NUM={"SCALAR":1,"VEC2":2,"VEC3":3,"VEC4":4}
def accessor(j,b,i):
 a=j["accessors"][i];bv=j["bufferViews"][a["bufferView"]]
 dt=DT[a["componentType"]];n=NUM[a["type"]]
 offset=bv.get("byteOffset",0)+a.get("byteOffset",0)
 stride=bv.get("byteStride",n*dt.itemsize)
 if stride==n*dt.itemsize:
  return np.frombuffer(b,dtype=dt,count=a["count"]*n,offset=offset).reshape((-1,n))
 return np.ndarray((a["count"],n),dtype=dt,buffer=b,offset=offset,strides=(stride,dt.itemsize))
def mat4(node):
 if "matrix" in node:return np.asarray(node["matrix"],dtype=float).reshape((4,4),order="F")
 x,y,z,w=node.get("rotation",[0,0,0,1]);sx,sy,sz=node.get("scale",[1,1,1]);tx,ty,tz=node.get("translation",[0,0,0])
 M=np.array([
 [1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w),tx],
 [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w),ty],
 [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y),tz],
 [0,0,0,1]],dtype=float)
 M[:3,:3]@=np.diag([sx,sy,sz])
 return M
def world_verts(points,M):
 return points.astype(float)@M[:3,:3].T+M[:3,3]
def collect(j,b):
 faces=[];nodes=[]
 def walk(i,M):
  n=j["nodes"][i];m=M@mat4(n)
  if "mesh" in n:
   for pi,p in enumerate(j["meshes"][n["mesh"]]["primitives"]):
    pos=world_verts(accessor(j,b,p["attributes"]["POSITION"]),m)
    idx=accessor(j,b,p["indices"])[:,0].astype("i4") if "indices" in p else np.arange(len(pos))
    tris=pos[idx.reshape(-1,3)]
    faces.append(tris)
    nodes.append({"node":i,"name":n.get("name"),"mesh":n["mesh"],"primitive":pi,"vertices":len(pos),"triangles":len(tris),"min":pos.min(axis=0).round(3).tolist(),"max":pos.max(axis=0).round(3).tolist()})
  for c in n.get("children",[]):walk(c,m)
 for i in j["scenes"][j.get("scene",0)]["nodes"]:walk(i,np.eye(4))
 return faces,nodes
def profile(faces,front_z):
 zcut=front_z-0.65
 # Collect front-facing near-vertical stone triangles, not roof/side surfaces.
 # Rasterize projected x,y triangle footprints at heights 0.8-1.8m.
 bx=np.arange(-2.75,2.76,0.10)
 ys=np.arange(.60,2.61,.16)
 coverage=np.zeros((len(ys),len(bx)),dtype="i4")
 by_mesh=[]
 for faceset in faces:
  p0,p1,p2=faceset[:,0],faceset[:,1],faceset[:,2]
  norm=np.cross(p1-p0,p2-p0)
  cen=faceset.mean(axis=1)
  mask=(np.abs(norm[:,2])>0.4*np.linalg.norm(norm,axis=1))&(cen[:,2]>zcut)&(cen[:,1]<2.9)&(cen[:,1]>0)
  selected=faceset[mask]
  by_mesh.append({"frontTriangles":int(np.count_nonzero(mask)),"zMedian":float(np.median(cen[mask,2])) if np.any(mask) else None})
  for tri in selected:
   a,b,c=tri[:,:2]
   xlo=max(0,np.searchsorted(bx,min(a[0],b[0],c[0]))-1)
   xhi=min(len(bx),np.searchsorted(bx,max(a[0],b[0],c[0]))+1)
   ylo=max(0,np.searchsorted(ys,min(a[1],b[1],c[1]))-1)
   yhi=min(len(ys),np.searchsorted(ys,max(a[1],b[1],c[1]))+1)
   area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
   if abs(area)<1e-9:continue
   for iy in range(ylo,yhi):
    for ix in range(xlo,xhi):
     q=np.array([bx[ix],ys[iy]])
     u=((b[0]-q[0])*(c[1]-q[1])-(b[1]-q[1])*(c[0]-q[0]))/area
     v=((c[0]-q[0])*(a[1]-q[1])-(c[1]-q[1])*(a[0]-q[0]))/area
     w=1-u-v
     if min(u,v,w)>=-1e-4:coverage[iy,ix]+=1
 return bx,ys,coverage,by_mesh
out={}
for key,path in MODELS.items():
 j,b=glb_load(ROOT/path)
 faces,nodes=collect(j,b)
 item={"path":path,"nodes":nodes}
 if key.endswith("walls"):
  front=max(n["max"][2] for n in nodes)
  bx,ys,coverage,frontm=profile(faces,front)
  item["frontZ"]=front
  item["frontNodes"]=frontm
  item["coverage"]={"x":bx.round(2).tolist(),"y":ys.round(2).tolist(),"rows":["".join("#" if n>0 else "." for n in row) for row in coverage]}
  item["central-void-analysis"]=[]
  for iy,y in enumerate(ys):
   if .8<y<2.3:
    xopen=[float(bx[ix]) for ix,v in enumerate(coverage[iy]) if v==0 and abs(bx[ix])<2.2]
    item["central-void-analysis"].append({"y":round(float(y),2),"uncovered_x_range":[min(xopen),max(xopen)] if xopen else None})
 out[key]=item
 print("NODE BOUNDS",key,json.dumps(nodes,ensure_ascii=False))
 if key.endswith("walls"):
  print("FRONT COVERAGE",key,"front_z",front)
  for y,row in zip(ys,item["coverage"]["rows"]):print(f"y={y:.2f} {row}")
  print("VOID",key,json.dumps(item["central-void-analysis"]))
Path("/tmp/genesis-v0182-geometry-report.json").write_text(json.dumps(out,ensure_ascii=False,indent=2))
print("GEOMETRY REPORT WRITTEN")
