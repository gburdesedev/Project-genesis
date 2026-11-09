#!/usr/bin/env python3
"""Rebuild editable runtime background from the exact approved Fabricaciones V07 raster.
No generative redrawing. Only pixel-preserving crops/textured patches of its own file.
Historical ORA V004 remains separate; this is the GitHub runtime-equivalent candidate.
"""
from PIL import Image,ImageEnhance,ImageFilter,ImageDraw
from pathlib import Path
import hashlib,json,zipfile,io,xml.etree.ElementTree as ET
SRC=Path('assets/ui/approved/Fabricaciones_V07_APROBADA_1672x941.png')
OUT=Path('assets/ui/fabricaciones_ora_v004')
OUT.mkdir(parents=True,exist_ok=True)
original=Image.open(SRC).convert('RGBA')
assert original.size==(1672,941)
im=original.copy()
def donor(rect,patch=(48,535,423,783),brightness=.82,blur=1):
    x1,y1,x2,y2=rect
    tile=original.crop(patch).resize((x2-x1,y2-y1),Image.Resampling.BICUBIC)
    if brightness!=1:tile=ImageEnhance.Brightness(tile).enhance(brightness)
    if blur:tile=tile.filter(ImageFilter.GaussianBlur(blur))
    im.paste(tile,(x1,y1))
# Keep THE ORIGINAL upper navigation, gold filigree, header, outer panel borders,
# side-list rows/metal icons and bottom PT. Erase only dynamic baked content.
# The selected row and alternate row must not retain baked labels or selection.
donor((98,282,433,345),(150,544,426,612),.88,1.6)
donor((98,452,433,522),(150,544,426,612),.88,1.6)
# Center: baked sword is removed from runtime (not an invented other sword).
# Background is a blurred clone of the real source forge, as user approved.
donor((472,117,1090,804),(860,180,1050,721),.91,5.0)
# Title, old two-material layout and status are baked in the V07 source.
# Rebuild only their interiors and leave the gold boundaries untouched.
donor((1173,128,1574,205),(49,541,422,723),.62,1.5)
donor((1150,242,1589,280),(49,541,422,723),.63,1.2)
donor((1151,286,1610,572),(49,541,422,723),.64,1.7)
donor((1210,592,1579,667),(49,541,422,723),.69,1.1)
# Original FABRICAR frame and original anvil are retained; clear baked label.
donor((1327,687,1537,744),(49,541,422,723),.76,2)
# Keep screenshot's static PT until separately migrated to live PT.
name='Fabricaciones_Base_Limpia_V004.png'
im.save(OUT/name,optimize=True)
# Independently reusable alpha-section sprites with exact original coordinates.
sections=[
 ('00_cabecera.png',(0,0,1672,115)),
 ('01_recetario.png',(0,115,459,823)),
 ('02_visor.png',(459,115,1097,823)),
 ('03_panel_derecho.png',(1097,115,1672,823)),
 ('04_pt.png',(0,823,1672,941))
]
for filename,rect in sections:im.crop(rect).save(OUT/filename,optimize=True)
# Valid OpenRaster with separated, editable exported raster blocks.
image=ET.Element('image',{'w':'1672','h':'941','name':'Genesis Fabricaciones V004 - runtime reconstruction'})
stack=ET.SubElement(image,'stack')
with zipfile.ZipFile(OUT/'Fabricaciones_Runtime_V004.ora','w') as z:
    z.writestr('mimetype','image/openraster',compress_type=zipfile.ZIP_STORED)
    # Top to bottom: PT > panel right > viewer > recipes > header
    for i,(filename,rect) in enumerate(reversed(sections)):
        x1,y1,x2,y2=rect;buf=io.BytesIO();im.crop(rect).save(buf,'PNG')
        key=f'data/layer{i:02d}.png';z.writestr(key,buf.getvalue(),compress_type=zipfile.ZIP_DEFLATED)
        ET.SubElement(stack,'layer',{'name':filename,'src':key,'x':str(x1),'y':str(y1),'opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
    key='data/source_original_untouched.png'
    buf=io.BytesIO();original.save(buf,'PNG');z.writestr(key,buf.getvalue(),compress_type=zipfile.ZIP_DEFLATED)
    ET.SubElement(stack,'layer',{'name':'99 / ORIGINAL APPROVED V07 UNMODIFIED - HIDDEN','src':key,'x':'0','y':'0','opacity':'1.0','visibility':'hidden','composite-op':'svg:src-over'})
    z.writestr('stack.xml',ET.tostring(image,encoding='utf-8',xml_declaration=True))
    buf=io.BytesIO();im.save(buf,'PNG');z.writestr('mergedimage.png',buf.getvalue())
    thumb=im.copy();thumb.thumbnail((360,202));buf=io.BytesIO();thumb.save(buf,'PNG');z.writestr('Thumbnails/thumbnail.png',buf.getvalue())
# Game-art ONLY: strip the original V12B render's navy preview backdrop.
# This is alpha keying of the REAL approved Cycles source, not invented geometry.
sword_path=Path('assets/playcanvas/approved/equipment/espada_v03_hierro_v175_v12b_cycles_hdri32.png')
sword=Image.open(sword_path).convert('RGBA')
sw,sh=sword.size
p=sword.load()
mask=Image.new('L',sword.size,0);m=mask.load()
for yy in range(sh):
    for xx in range(sw):
        r,g,b,a=p[xx,yy]
        brightness=max(r,g,b)
        is_navy=(b-r>7 and b-g>1 and r<114)
        if is_navy or brightness<50: alpha=0
        elif brightness<90: alpha=min(255,max(0,int((brightness-48)*6)))
        else: alpha=255
        m[xx,yy]=min(a,alpha)
mask=mask.filter(ImageFilter.GaussianBlur(.55))
bbox=mask.getbbox()
if bbox:
    padded=(max(0,bbox[0]-18),max(0,bbox[1]-18),min(sw,bbox[2]+18),min(sh,bbox[3]+18))
    sword.putalpha(mask)
    sword=sword.crop(padded)
    sword.save(OUT/'V12B_CYCLES_SOURCE_ALPHA_EXPERIMENTAL.png',optimize=True)
    print('V12B_SOURCE_ALPHA',sw,sh,'bbox',padded,'rgba',sword.size)
# V015 is fetched from the ORIGINAL Mercenary branch at a later workflow step.
shield_path=OUT/'V015_REAL_SHIELD_ICON_RGBA.png'
if shield_path.exists():
    shield=Image.open(shield_path).convert('RGBA')
    bbox=shield.getchannel('A').getbbox()
    if bbox:
        padded=(max(0,bbox[0]-6),max(0,bbox[1]-6),min(shield.width,bbox[2]+6),min(shield.height,bbox[3]+6))
        shield.crop(padded).save(OUT/'V015_REAL_SHIELD_CROPPED.png',optimize=True)
        print('V015_REAL_SHIELD_CROPPED',shield.size,padded)
(OUT/'manifest.json').write_text(json.dumps({'source':str(SRC),'source_sha256':hashlib.sha256(SRC.read_bytes()).hexdigest(),'status':'experimental runtime candidate, artwork V07 remains untouched','layout':[1672,941],'method':'pixel crops and clone patches from same source; visor blurred by approved decision','assets':'authentic material posters and V12B image are loaded separately at runtime','notes':['not the historical local ORA V004 binary','gold outer decoration original source','no source geometry or model substitution']},ensure_ascii=False,indent=2))
print('BUILD_FABRICACION_V004_RUNTIME_OK',str(OUT/name),sum(1 for _ in sections))
