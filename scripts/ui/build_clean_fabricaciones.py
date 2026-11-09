#!/usr/bin/env python3
"""Experimental clean Fabricaciones art, derived ONLY from immutable existing approved assets.
Exports a sprite atlas replacement and the clean visual structure as separate files.
Never alters Fabricaciones_V07_APROBADA_1672x941.png or the Preparacion source.
"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageEnhance
import hashlib, json

root=Path(__file__).resolve().parents[2]
source=root/'assets/ui/approved/Fabricaciones_V07_APROBADA_1672x941.png'
backdrop=root/'assets/ui/preparacion/01_Capas/Paneles/FondoVisorHerreria.png'
output=root/'assets/ui/fabricaciones/module_v001'
output.mkdir(parents=True,exist_ok=True)
raw=source.read_bytes()
EXPECTED='55464a0de649f538700101d110504fe2f66afbf875288af2e484dd875a4bcb7f'
assert hashlib.sha256(raw).hexdigest()==EXPECTED,'approved source changed; refusing to generate'
art=Image.open(source).convert('RGBA')
assert art.size==(1672,941)
background=art.copy()
# A genuine empty leather area from the ORIGINAL artwork. Re-use its original
# pixels, not a painted new UI or unrelated generated visual.
leather=art.crop((55,570,420,783)).convert('RGBA')
def clean_interior(box):
    x0,y0,x1,y1=box
    texture=leather.resize((x1-x0,y1-y0),Image.Resampling.BICUBIC)
    background.paste(texture,(x0,y0))
# Preserve gold outer frames/header/footer, replace ONLY baked inner contents.
clean_interior((51,178,442,811))
clean_interior((1133,115,1605,817))
# Re-use EXISTING empty forge viewport from Preparation. It is a reusable source
# without the sword baked into the V07 art, not a new concept artwork.
forge=Image.open(backdrop).convert('RGBA')
view=(476,118,1098,814); w=view[2]-view[0];h=view[3]-view[1]
# The source may be a full-screen transparent layer. Prefer its non-transparent
# bounding rectangle when the alpha coverage is sparse.
bbox=forge.getchannel('A').getbbox()
if bbox and bbox!=(0,0,*forge.size):
    q=forge.crop(bbox)
else:q=forge
# Fitted 16:9 scenic backdrop, centered; original artwork remains pixel-origin.
ratio=max(w/q.width,h/q.height)
scaled=q.resize((max(w,round(q.width*ratio)),max(h,round(q.height*ratio))),Image.Resampling.LANCZOS)
ox=(scaled.width-w)//2;oy=(scaled.height-h)//2
scenic=scaled.crop((ox,oy,ox+w,oy+h))
base=Image.new('RGBA',(w,h),(11,9,7,255));base.alpha_composite(scenic)
background.paste(base,view[:2])
background.save(output/'fabricaciones_estructura_limpia_v001.png',optimize=True)

def sprite(name,rect,inside):
    piece=art.crop(rect)
    # Remove baked labels/icons while preserving authentic outer ornamental
    # pixel boundaries from the original art. Interior is original leather.
    ix0,iy0,ix1,iy1=inside
    tex=leather.resize((ix1-ix0,iy1-iy0),Image.Resampling.BICUBIC)
    piece.paste(tex,(ix0,iy0))
    piece.save(output/name,optimize=True)
    return list(piece.size)
exports={}
exports['frame_familia_v001.png']=sprite('frame_familia_v001.png',(40,185,437,240),(56,6,382,49))
exports['frame_receta_v001.png']=sprite('frame_receta_v001.png',(94,453,438,509),(9,7,334,49))
exports['frame_receta_activa_v001.png']=sprite('frame_receta_activa_v001.png',(94,287,438,343),(9,7,334,49))
exports['frame_material_v001.png']=sprite('frame_material_v001.png',(1144,277,1593,422),(15,12,433,133))
# The FABRICAR label and anvil are static shared art; approved crop is not altered.
craft=art.crop((1144,647,1593,747))
craft.save(output/'boton_fabricar_v001.png',optimize=True)
exports['boton_fabricar_v001.png']=list(craft.size)
report={
  'version':'module_v001','source':str(source.relative_to(root)),'approved_sha256':EXPECTED,
  'background':'fabricaciones_estructura_limpia_v001.png',
  'forge_source':str(backdrop.relative_to(root)),
  'sprites':exports,
  'original_unchanged':hashlib.sha256(source.read_bytes()).hexdigest()==EXPECTED,
  'note':'Only original approved pixels/cropped assets; experimental reconstructed composition, pending visual approval.'
}
(output/'asset_report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2,ensure_ascii=False))
