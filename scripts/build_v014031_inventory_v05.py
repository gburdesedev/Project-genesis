#!/usr/bin/env python3
"""Reconstruct the exact V05 candidate artwork from immutable original assets.

Output matches Genesis_Inventario_V05_CABECERA_EXACTA_EDITABLE.ora mergedimage
pixel for pixel. Never alter the original inventory image or Preparation PNGs.
"""
from pathlib import Path
from PIL import Image, ImageEnhance
import hashlib
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/ui/inventario/INVENTARIO_BASE_LIMPIA_APROBADA_16x9.png'
PREP=ROOT/'assets/ui/preparacion/01_Capas'
OUTPUT=ROOT/'assets/ui/inventario/GENESIS_INVENTARIO_V05_CABECERA_PREPARACION_1820x1024.png'
EXPECTED='aa535e3149bf4d7535f70dc09db5e14a0cf6a2ba54aaf30b0c3d2a907ae302fe'
R=Image.Resampling.LANCZOS
def read(p):return Image.open(p).convert('RGBA')
src=read(SOURCE);pb=read(PREP/'Fondo/FondoEstructural.png')
assert src.size==(1672,941) and pb.size==(1536,1024)
w,h=src.size;scale=h/1024;xoff=(w-1536*scale)/2
old=pb.resize((w,h),R)
old.alpha_composite(src.crop((0,98,w,h)).resize((w,h-140),R),(0,140))
old.alpha_composite(pb.crop((0,0,1536,153)).resize((round(1536*scale),round(153*scale)),R),(round(xoff),0))
tabs=[('Inventario',164,42,294,94),('Preparacion',458,42,320,94),('Fabricaciones',778,42,328,94),('Comparacion',1106,42,298,94)]
for name,x,y,tw,th in tabs:
    im=read(PREP/('Pestanas/Pestana_'+name+'.png'))
    assert im.size==(tw,th)
    if name in ('Inventario','Preparacion'):
        rgb=ImageEnhance.Brightness(im.convert('RGB')).enhance(1.18 if name=='Inventario' else .53).convert('RGBA')
        rgb.putalpha(im.getchannel('A'));im=rgb
    im=im.resize((round(tw*scale),round(th*scale)),R)
    old.alpha_composite(im,(round(xoff+x*scale),round(y*scale)))
glow=read(PREP/'Efectos/Pestana_Inventario_HoverBrillo.png').resize((round(294*scale),round(94*scale)),R)
old.alpha_composite(glow,(round(xoff+164*scale),round(42*scale)))
W,H=1820,1024
body=old.resize((W,H),R)
body.putalpha(Image.new('L',(W,H),255))
body.paste((0,0,0,0),(0,0,W,159))
left=(W-1536)//2
header=Image.new('RGBA',(W,159),(0,0,0,255))
header.alpha_composite(pb.crop((0,0,1536,159)),(left,0))
header.alpha_composite(pb.crop((0,0,left,159)).transpose(Image.Transpose.FLIP_LEFT_RIGHT),(0,0))
header.alpha_composite(pb.crop((1536-left,0,1536,159)).transpose(Image.Transpose.FLIP_LEFT_RIGHT),(left+1536,0))
merged=Image.new('RGBA',(W,H),(0,0,0,0))
merged.alpha_composite(body);merged.alpha_composite(header,(0,0))
for name,x,y,tw,th in tabs:
    im=read(PREP/('Pestanas/Pestana_'+name+'.png'))
    assert im.size==(tw,th)
    merged.alpha_composite(im,(left+x,y))
merged.alpha_composite(ImageEnhance.Brightness(read(PREP/'Pestanas/Pestana_Preparacion.png')).enhance(.51),(left+458,42))
merged.alpha_composite(ImageEnhance.Brightness(read(PREP/'Pestanas/Pestana_Inventario.png')).enhance(1.34),(left+164,42))
merged.alpha_composite(read(PREP/'Efectos/Pestana_Inventario_HoverBrillo.png'),(left+164,42))
pixhash=hashlib.sha256(merged.tobytes()).hexdigest()
assert pixhash==EXPECTED, f'V05 deviates from user-reviewed ORA: {pixhash}'
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
merged.save(OUTPUT,optimize=True)
print('V014031_V05_EXACT_PIXEL_MATCH',str(OUTPUT),W,H,pixhash,OUTPUT.stat().st_size)
