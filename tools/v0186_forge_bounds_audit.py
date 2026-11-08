#!/usr/bin/env python3
"""Static forensic inspection of existing Project Genesis V038 forge master.
No source rewriting, no Blender material substitutions; inspect GLB and assets only.
"""
from __future__ import annotations
import json,struct,pathlib,math
root=pathlib.Path(__file__).resolve().parents[1]
p=root/'assets/vendor/genesis/externals/forgeStation/src/Forge_V038_HeaderFixed_Preview.glb'
raw=p.read_bytes()
magic,version,total=struct.unpack_from('<III',raw,0)
assert magic==0x46546c67 and version==2 and total==len(raw)
pos=12;j=None
while pos<len(raw):
    size,tag=struct.unpack_from('<II',raw,pos);pos+=8
    if tag==0x4e4f534a:
        j=json.loads(raw[pos:pos+size]);break
    pos+=size
assert j
def qrot(q):
    x,y,z,w=q;return [
        [1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],
        [2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],
        [2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]
def matmul(a,b):
    return [[sum(a[i][k]*b[k][z] for k in range(4)) for z in range(4)] for i in range(4)]
def transform(node):
    if 'matrix' in node:
        a=node['matrix'];return [[a[c*4+r] for c in range(4)] for r in range(4)]
    p=node.get('translation',[0,0,0]);s=node.get('scale',[1,1,1]);r=qrot(node.get('rotation',[0,0,0,1]))
    return [[r[i][k]*s[k] for k in range(3)]+[p[i]] for i in range(3)]+[[0,0,0,1]]
identity=[[int(i==k) for k in range(4)] for i in range(4)]
nodes=j.get('nodes',[]);meshes=j.get('meshes',[]);accessors=j.get('accessors',[])
entries=[]
def visit(index,parent,level=0):
    node=nodes[index];m=matmul(parent,transform(node))
    if 'mesh' in node:
        mesh=meshes[node['mesh']]
        box=[]
        for prim in mesh['primitives']:
            ai=prim.get('attributes',{}).get('POSITION')
            if ai is None:continue
            a=accessors[ai];mins=a.get('min');maxs=a.get('max')
            if not mins or not maxs:continue
            for x in (mins[0],maxs[0]):
                for y in (mins[1],maxs[1]):
                    for z in (mins[2],maxs[2]):
                        box.append([sum(m[i][q]*v for q,v in enumerate((x,y,z,1))) for i in range(3)])
        if box:
            mi=[min(a[k] for a in box) for k in range(3)]
            ma=[max(a[k] for a in box) for k in range(3)]
            entries.append(dict(node=node.get('name'),mesh=mesh.get('name'),min=[round(z,4) for z in mi],max=[round(z,4) for z in ma],size=[round(ma[i]-mi[i],4) for i in range(3)]))
    for child in node.get('children',[]):visit(child,m,level+1)
for n in j.get('scenes',[{}])[j.get('scene',0)].get('nodes',[]):visit(n,identity)
print(json.dumps(dict(source=str(p),bytes=len(raw),node_count=len(nodes),mesh_count=len(meshes),materials=[m.get('name') for m in j.get('materials',[])],renderable=entries[:40],bounds=dict(min=[min(e['min'][i] for e in entries) for i in range(3)],max=[max(e['max'][i] for e in entries) for i in range(3)])),indent=2))
