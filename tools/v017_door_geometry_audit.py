#!/usr/bin/env python3
"""Report unmodified approved GLB geometry, node origins and door bounding boxes.
Used only by GitHub Actions; no Blender export, no production source modifications.
"""
import json,struct
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
FILES={
 'door_herrero': 'assets/playcanvas/approved/workshops/herrero/doors/v082-b/door-herrero-v082-b.glb',
 'walls_herrero': 'assets/playcanvas/approved/workshops/herrero/walls/v082/blacksmith_four_walls_arched_v082.glb',
 'door_arcanista':'assets/playcanvas/approved/workshops/arcanista/doors/v027/Arcanist_Door_V027_WebGL.glb'
}
def gltf(path):
 data=(ROOT/path).read_bytes()
 assert data[:4]==b'glTF' and int.from_bytes(data[8:12],'little')==len(data)
 off=12
 while off<len(data):
  size,typ=struct.unpack_from('<I4s',data,off)
  off+=8
  if typ==b'JSON':return json.loads(data[off:off+size])
  off+=size
 raise RuntimeError('GLB has no JSON chunk')
def main():
 for label,p in FILES.items():
  g=gltf(p)
  print('\n===',label,'===',p)
  for i,n in enumerate(g.get('nodes',[])):
   if n.get('mesh') is None and not any(word in str(n.get('name','')).lower() for word in ('door','hinge','leaf','front','portal')):continue
   m=g['meshes'][n['mesh']] if n.get('mesh') is not None else None
   groups=[]
   if m:
    for prim in m.get('primitives',[]):
     pos=g['accessors'][prim['attributes']['POSITION']]
     groups.append(dict(min=pos.get('min'),max=pos.get('max')))
   print('node',i,'name',n.get('name'),'mesh',n.get('mesh'),'translation',n.get('translation'),'scale',n.get('scale'),'rotation',n.get('rotation'),'matrix',n.get('matrix'),'bounds',groups[:4])
if __name__=='__main__':main()
