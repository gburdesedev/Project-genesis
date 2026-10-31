#!/usr/bin/env python3
"""V038 forge texture dimensions, encodings and source fidelity report.
This is a read-only audit: never upscale and pretend to gain missing detail.
"""
import io,json,struct,urllib.request
from pathlib import Path
from PIL import Image
url='https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/feature/playcanvas-herrero-arcanista-walls-preview/public/models/Forge_V038_HeaderFixed_Preview.glb'
raw=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'ProjectGenesis-V038-PBR-Quality-Audit'}),timeout=120).read()
assert raw[:4]==b'glTF' and struct.unpack_from('<I',raw,8)[0]==len(raw)
jlen,chunk=struct.unpack_from('<I4s',raw,12)
assert chunk==b'JSON'
gltf=json.loads(raw[20:20+jlen])
offset=20+jlen
blen,typ=struct.unpack_from('<I4s',raw,offset)
assert typ==b'BIN\x00'
blob=raw[offset+8:offset+8+blen]
views=gltf.get('bufferViews',[])
imgs=[]
for index,image in enumerate(gltf.get('images',[])):
  v=views[image['bufferView']]
  payload=blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
  assert len(payload)==v['byteLength']
  pic=Image.open(io.BytesIO(payload))
  imgs.append({'index':index,'name':image.get('name','unnamed'),'dimensions':list(pic.size),
               'format':pic.format,'channels':pic.mode,'encoded_bytes':len(payload)})
report={
 'status':'INSPECTED_EMBEDDED_TEXTURES',
 'asset':'V038 forge corrected GLB', 'source_url':url,
 'glb_bytes':len(raw),
 'materials':len(gltf.get('materials',[])),
 'meshes':len(gltf.get('meshes',[])),
 'images':imgs,
 'small_textures':[x for x in imgs if min(x['dimensions'])<=512],
 'notes':'Higher texture filtering improves sampling, not original PBR detail. No unsupported upscaling claimed.'
}
out=Path('reports/forge-v038-pbr-quality-audit.json')
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps(report,indent=2))
print('FORGE_TEXTURE_AUDIT',json.dumps(report))
