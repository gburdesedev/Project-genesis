#!/usr/bin/env python3
"""Build isolated playable forge V038 from backed-up main. Never mutate index.html."""
import re,json,base64,struct
from pathlib import Path
html=Path('index.html').read_text(encoding='utf8')
original=html
assert 'id="forgeStation"' in html and 'id="forgeModel"' in html
asset=re.compile(r'(<pc-asset\s+id="forgeStation"\s+type="container"\s+src=")data:model/gltf-binary;base64,([^"]+)("[^>]*></pc-asset>)')
m=asset.search(html)
assert m,'Embedded forge GLB not found'
raw=base64.b64decode(m.group(2),validate=True)
assert raw[:4]==b'glTF'
oldgltf=json.loads(raw[20:20+struct.unpack_from('<I',raw,12)[0]])
url='https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/production/auto-forge-breathing-coals-v038/public/models/forge-v038-web-hq.glb'
html=html[:m.start()]+m.group(1)+url+m.group(3)+html[m.end():]
old_model='<pc-model id="forgeModel" name="Blacksmith forge" data-asset="forgeStation" data-route="Herrero" data-priority="critical" rotation="0 180 0"'
new_model='<pc-model id="forgeModel" name="Blacksmith forge V038" data-asset="forgeStation" data-route="Herrero" data-priority="critical" rotation="0 0 0"'
assert html.count(old_model)==1
html=html.replace(old_model,new_model,1)
# Exactly the old art-only controller; game interactions, tutorial, audio, and props are retained.
pattern=r'function igniteForgeVisual\(\)\{.*?\}\s*\nigniteForgeVisual\(\);'
patch='''function igniteForgeVisual(){
 const root=forgeModelEl?.contentEntity;
 if(!root)return;
 if(!forgeHotMaterialPatched){
  const materialClones=new Map();
  root.findComponents('render').forEach(r=>r.meshInstances.forEach(mi=>{
   const src=mi.material;
   if(!src||!src.clone)return;
   const name=(src.name||'').toLowerCase();
   if(!(name.includes('forge_cracked_hot_charcoal_ember_map')||name.includes('hotcoal')))return;
   let mat=materialClones.get(src);
   if(!mat){mat=src.clone();materialClones.set(src,mat);forgeCoalMaterials.push(mat)}
   mi.material=mat;
  }));
  forgeHotMaterialPatched=true;
 }
 forgeCoalMaterials.forEach(mat=>{
  // Preserve GLB fissure texture: don't paint over emissive colors.
  mat.emissiveIntensity=forgeHot?22:.075;
  mat.update?.();
 });
 if(!forgeHot){if(forgeCoreComp)forgeCoreComp.intensity=.04;if(forgeBounceComp)forgeBounceComp.intensity=.015}
}
igniteForgeVisual();'''
html,count=re.subn(pattern,lambda _:patch,html,count=1,flags=re.S)
assert count==1,'Ignition art hook changed in source'
old="if(forgeHot){const flick=.88+Math.sin(now*.011)*.075+Math.sin(now*.027)*.045,boost=1+forgeImpulse*.55;if(forgeCoreComp)forgeCoreComp.intensity=3.45*flick*boost;if(forgeBounceComp)forgeBounceComp.intensity=.96*(.93+Math.sin(now*.008)*.06)*(1+forgeImpulse*.42)}"
new="""if(!forgeHotMaterialPatched)igniteForgeVisual();
 if(forgeHot){const breath=.68+.64*(.5-.5*Math.cos(now*Math.PI/2000)),boost=1+forgeImpulse*.22;
  if(forgeCoreComp)forgeCoreComp.intensity=3.2*breath*boost;
  if(forgeBounceComp)forgeBounceComp.intensity=.88*breath*boost;
  forgeCoalMaterials.forEach(mat=>{mat.emissiveIntensity=22*breath;mat.update?.()});
 }"""
assert html.count(old)==1,'Old rapid flicker changed in source'
html=html.replace(old,new,1)
assert html.count('v0.14a')>0
html=html.replace('v0.14a','v0.14a.001').replace('Build 20261029.02','Build 20261029.FV038.01')
html=html.replace('</head>','<meta name="genesis-preview" content="FORGE_V038_CANDIDATE_ONLY">\n</head>',1)
path=Path('forge-v038-preview.html')
path.write_text(html,encoding='utf8')
assert path.stat().st_size>2000000
assert html.count('id="forgeModel"')==1 and html.count('id="forgeStation"')==1
assert 'Math.sin(now*.011)' not in html
assert 'id="bellowsModel"' in html and 'chimneySootModel' in html
assert 'm.emissiveIntensity=22*breath' not in html
assert original==Path('index.html').read_text(encoding='utf8')
report={'status':'STATIC_PREVIEW_BUILT','source':'index.html','output':path.name,
'source_bytes':len(original.encode()),'preview_bytes':path.stat().st_size,
'asset_url':url,'source_forge_glb_bytes':len(raw),'source_forge_meshes':len(oldgltf.get('meshes',[])),
'checks':{'source_unchanged':True,'asset_replaced':True,'interaction_id_preserved':True,
'rapid_flicker_removed':True,'synchronized_emissive_and_light_cycle':True,
'soot_and_bellows_retained':True},'browser_test':'NOT_RUN','approval':'PENDING_VISUAL_REVIEW'}
Path('reports').mkdir(exist_ok=True)
Path('reports/forge-v038-preview-build.json').write_text(json.dumps(report,indent=2)+'\n')
print('FORGE_V038_PREVIEW_BUILT',json.dumps(report),flush=True)
