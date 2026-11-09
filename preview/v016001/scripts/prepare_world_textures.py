"""Derive web maps from the existing approved road packages; no new artwork."""
from pathlib import Path
from PIL import Image, ImageOps
import zipfile, io, json, hashlib
out=Path('assets/world/v0.11.004');out.mkdir(parents=True,exist_ok=True)
provenance=[]
for name,archive,folder,run in [('cobble','/tmp/cobble-source.zip','Calle_Adoquin_4K',39890541030),('traffic','/tmp/traffic-source.zip','Camino_Transito_Intenso_4K',39950298390)]:
 with zipfile.ZipFile(archive) as z:
  files={}
  for source,suffix,size in [('BaseColor_sRGB.png','color',1024),('Normal_OpenGL_Blender.png','normal',1024),('Roughness_linear.png','gloss',512),('AO_linear.png','ao',512)]:
   raw=z.read(folder+'/'+source);im=Image.open(io.BytesIO(raw));im=im.convert('RGB' if suffix in ('color','normal') else 'L').resize((size,size),Image.Resampling.LANCZOS)
   if suffix=='normal':
    # Renormalize tangent-space vectors after resampling.
    import numpy as np
    a=np.array(im,dtype=np.float32)/127.5-1;n=np.linalg.norm(a,axis=2,keepdims=True);a/=np.maximum(n,1e-6);im=Image.fromarray(np.clip((a+1)*127.5,0,255).astype('uint8'))
   if suffix=='gloss':im=ImageOps.invert(im)
   dest=out/f'{name}_{suffix}.png';im.save(dest,optimize=True)
   files[dest.name]={'source':folder+'/'+source,'source_sha256':hashlib.sha256(raw).hexdigest(),'size':size}
  provenance.append({'material':name,'source_run':f'https://github.com/gburdesedev/genesis-blender-render/actions/runs/{run}','original_manifest':json.loads(z.read(folder+'/manifest.json')),'web_maps':files})
(out/'provenance.json').write_text(json.dumps(provenance,indent=2,ensure_ascii=False))
print('Web maps:',sum(p.stat().st_size for p in out.glob('*.png')),'bytes')
