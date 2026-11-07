#!/usr/bin/env python3
"""Read-only GLB rig compatibility audit: existing Ordan ranger vs player peasant
and canonical UAL1 clips. Never edit masters or derive a substitute model."""
import json,struct,pathlib,collections
FILES={
  'ordan_ranger':'assets/vendor/genesis/externals/rangerMale086/src/male_ranger.glb',
  'artisan_peasant':'assets/vendor/genesis/externals/peasantMale086/src/male_peasant.glb',
  'universal_animation':'assets/vendor/genesis/externals/ual1086/src/UAL1.glb',
}
def glb(path):
 b=pathlib.Path(path).read_bytes()
 assert b[:4]==b'glTF' and struct.unpack_from('<II',b,4)==(2,len(b))
 jlen,kind=struct.unpack_from('<I4s',b,12)
 assert kind==b'JSON'
 return json.loads(b[20:20+jlen].decode('utf-8'))
def summary(g):
 nodes=g.get('nodes',[])
 node=lambda i:nodes[i].get('name',f'unnamed:{i}')
 skins=g.get('skins',[])
 anims=g.get('animations',[])
 tracks=[]
 for a in anims:
  for ch in a.get('channels',[]):
   target=ch.get('target',{})
   tracks.append({'animation':a.get('name','unnamed'),'node':node(target['node']) if 'node' in target else None,'path':target.get('path')})
 return {
  'node_count':len(nodes),
  'mesh_count':len(g.get('meshes',[])),
  'skin_count':len(skins),
  'sceneRoots':[[node(i) for i in sc.get('nodes',[])] for sc in g.get('scenes',[])],
  'skinnedMeshes':[{'node':node(i),'mesh':v.get('mesh'),'skin':v.get('skin')} for i,v in enumerate(nodes) if 'skin' in v],
  'jointNames':[[node(i) for i in skin.get('joints',[])] for skin in skins],
  'animationNames':[a.get('name','') for a in anims],
  'animationChannelCount':len(tracks),
  'animationTargetNames':sorted(set(x['node'] for x in tracks if x['node'] is not None)),
  'firstTracks':tracks[:35],
 }
def normalize(x):return x.lower().replace('mixamorig:','').replace('armature|','').replace(' ','').replace('.','').replace('_','').replace('-','')
all_summary={name:summary(glb(path)) for name,path in FILES.items()}
source=all_summary['universal_animation']
target=set(map(normalize,source['animationTargetNames']))
for name in ['ordan_ranger','artisan_peasant']:
 model=all_summary[name]
 joints=set(map(normalize,sum(model['jointNames'],[])))
 common=joints.intersection(target)
 model['animationJointMatches']={
  'count':len(common),'totalRigJoints':len(joints),'totalAnimationTargets':len(target),
  'common':sorted(common),'rigOnly':sorted(joints-target),'animationOnly':sorted(target-joints)
 }
 print('RIG_MATCH',name,'matches',len(common),'/',len(joints),'animations',len(target))
 print('RIG_SKINNED_MESHES',name,json.dumps(model['skinnedMeshes'][:35],ensure_ascii=False))
 print('RIG_JOINT_NAMES',name,json.dumps(sum(model['jointNames'],[])[:100],ensure_ascii=False))
 print('RIG_MISSING_BONES',name,json.dumps(sorted(joints-target)[:70],ensure_ascii=False))
print('UNIVERSAL_ANIMATION_NAMES',json.dumps(source['animationNames'],ensure_ascii=False))
print('UNIVERSAL_ANIMATION_TARGETS',json.dumps(source['animationTargetNames'][:100],ensure_ascii=False))
out=pathlib.Path('previews/v014026-rig-compatibility-audit')
out.mkdir(parents=True,exist_ok=True)
(out/'rig-report.json').write_text(json.dumps(all_summary,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
