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
# Distinct editable skins: remove both baked texts/boxes entirely. The
# active-state gold frame is cut as an original V07 sprite, NOT CSS border.
# The source recipe border artwork survives as a transparent reusable layer.
selection_source=original.crop((91,288,434,345)).convert('RGBA')
sel_alpha=Image.new('L',selection_source.size,0)
sa=sel_alpha.load()
fw,fh=selection_source.size
for yy in range(fh):
    for xx in range(fw):
        distance=min(xx,yy,fw-1-xx,fh-1-yy)
        if distance<=11:
            sa[xx,yy]=255 if distance<=9 else max(0,int((12-distance)*85))
selection_source.putalpha(sel_alpha)
selection_source.save(OUT/'05_marco_receta_seleccionada_ORIGINAL.png',optimize=True)
# Both list rows are reset using the source image's own unlettered panel grain.
# We include the former gold frame in the cleared bounds, then source the frame
# from the exact approved art when (and only when) the item is selected.
def clear_recipe_row(box):
    x1,y1,x2,y2=box
    tile=original.crop((150,558,422,748)).resize((x2-x1,y2-y1),Image.Resampling.BICUBIC)
    tile=ImageEnhance.Brightness(tile).enhance(.9)
    tile=tile.filter(ImageFilter.GaussianBlur(.7))
    im.paste(tile,(x1,y1))
clear_recipe_row((91,276,448,353))
clear_recipe_row((91,444,448,528))
# Center: baked sword is removed from runtime (not an invented other sword).
# Background is a blurred clone of the real source forge, as user approved.
donor((472,117,1090,804),(860,180,1050,721),.91,5.0)
# Title, old two-material layout and status are baked in the V07 source.
# Rebuild only their interiors and leave the gold boundaries untouched.
# IMPORTANT: replace the ORIGINAL baked right heading with a CLEAN ORA
# surface from the very same approved art, never a CSS rectangle over old text.
# The large source region includes old ESPADA DE HIERRO and its subtitle.
# Feather toward the original gold frame; text is drawn only by the live UI.
def clean_right_title():
    rect=(1122,116,1602,214)
    x1,y1,x2,y2=rect
    # Take blacksmith UI's original neutral panel grain, not generative art.
    donor_texture=original.crop((67,569,424,741)).resize((x2-x1,y2-y1),Image.Resampling.BICUBIC)
    donor_texture=ImageEnhance.Brightness(donor_texture).enhance(.77)
    donor_texture=donor_texture.filter(ImageFilter.GaussianBlur(1.0))
    # Continuous coverage under the heading; smooth transition at the edges.
    from PIL import ImageChops
    m=Image.new('L',(x2-x1,y2-y1),0)
    pix=m.load()
    for y in range(y2-y1):
        for x in range(x2-x1):
            feather=min(x,y,(x2-x1-1-x),(y2-y1-1-y))
            pix[x,y]=max(0,min(255,int(feather*255/12)))
    patch=Image.new('RGBA',original.size,(0,0,0,0))
    donor_texture.putalpha(m)
    patch.alpha_composite(donor_texture,(x1,y1))
    im.alpha_composite(patch)
    return patch
right_title_layer=clean_right_title()

donor((1150,242,1589,280),(49,541,422,723),.63,1.2)
donor((1151,286,1610,572),(49,541,422,723),.64,1.7)
# Avoid the sharp BLACK RECTANGLE shown in user screenshot. Cover the
# baked former state text using the right-side original artwork texture with
# feathered transparency: no visible box boundaries at full resolution.
def clean_state_inscription():
    rect=(1193,580,1582,669)
    x1,y1,x2,y2=rect
    sample=original.crop((285,566,423,763))
    soft=sample.resize((x2-x1,y2-y1),Image.Resampling.BICUBIC)
    soft=ImageEnhance.Brightness(soft).enhance(.92)
    soft=soft.filter(ImageFilter.GaussianBlur(.9)).convert('RGBA')
    alpha=Image.new('L',soft.size,0)
    ap=alpha.load()
    for yy in range(soft.height):
        for xx in range(soft.width):
            d=min(xx,yy,soft.width-1-xx,soft.height-1-yy)
            # Wide seam feather; the state title is then a separate live text.
            ap[xx,yy]=max(0,min(255,round(d*255/24)))
    soft.putalpha(alpha)
    im.alpha_composite(soft,(x1,y1))
clean_state_inscription()
# Original FABRICAR frame and original anvil are retained; clear baked label.
# Keep the ORIGINAL decorative FABRICAR button and original fixed label, pixel-identical.
# The two iron material icons must be replaced INSIDE the ORA raster,
# never on top of the already-painted generic icons with CSS.
# Recover the original row texture from the SAME source's empty right side.
# The source master stays untouched, the transparent V175 sprite stays editable.
ingot_path=Path('assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png')
approved_ingot=Image.open(ingot_path).convert('RGBA')
# Keep authentic alpha. Avoid a flat background square when original has one.
alpha=approved_ingot.getchannel('A')
if alpha.getextrema()==(255,255):
    print('NOTICE V175 poster is opaque: no unverified matting, crop and retain')
a_bbox=alpha.getbbox() or (0,0,approved_ingot.width,approved_ingot.height)
ingot_cut=approved_ingot.crop(a_bbox)
icon_layer=Image.new('RGBA',original.size,(0,0,0,0))
# Exact same background zone restored in both subcategory material icons.
for x1,y1,x2,y2 in ((106,238,178,286),(106,417,178,466)):
    donor_box=(336,y1,336+(x2-x1),y2)
    tile=original.crop(donor_box)
    im.paste(tile,(x1,y1))
    # Fit the approved icon in the ORIGINAL icon slot, without covering "Hierro".
    fitted=ingot_cut.copy()
    fitted.thumbnail((48,29),Image.Resampling.LANCZOS)
    place=(x1+(x2-x1-fitted.width)//2,y1+(y2-y1-fitted.height)//2)
    icon_layer.alpha_composite(fitted,place)
# Save the REAL replaceable V175 layer and its cleared underlay separately.
background_no_ingots=im.copy()
OUT.joinpath('01_iconos_material_hierro_v175_RGBA.png').parent.mkdir(parents=True,exist_ok=True)
icon_layer.save(OUT/'01_iconos_material_hierro_v175_RGBA.png',optimize=True)
im.alpha_composite(icon_layer)
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
    # The previously baked right-side heading is cleaned in an editable layer.
    buf=io.BytesIO();right_title_layer.save(buf,'PNG')
    z.writestr('data/clean_right_title_panel.png',buf.getvalue(),compress_type=zipfile.ZIP_DEFLATED)
    ET.SubElement(stack,'layer',{'name':'03 / PANEL DERECHO / TITULO LIMPIO · sin texto horneado','src':'data/clean_right_title_panel.png','x':'0','y':'0','opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
    # Original V07 active recipe frame, isolated as a hidden reusable sprite.
    buf=io.BytesIO();selection_source.save(buf,'PNG')
    z.writestr('data/active_recipe_frame.png',buf.getvalue(),compress_type=zipfile.ZIP_DEFLATED)
    ET.SubElement(stack,'layer',{'name':'05 / RECUADRO SELECCION / ORIGINAL V07 · REUTILIZABLE','src':'data/active_recipe_frame.png','x':'91','y':'288','opacity':'1.0','visibility':'hidden','composite-op':'svg:src-over'})
    # The two authentic material sprites are a real editable ORA layer.
    buf=io.BytesIO();icon_layer.save(buf,'PNG')
    z.writestr('data/material_icons_v175.png',buf.getvalue(),compress_type=zipfile.ZIP_DEFLATED)
    ET.SubElement(stack,'layer',{'name':'02 / MATERIAL HIERRO / ORIGINAL V175 · 2 posiciones','src':'data/material_icons_v175.png','x':'0','y':'0','opacity':'1.0','visibility':'visible','composite-op':'svg:src-over'})
    for i,(filename,rect) in enumerate(reversed(sections)):
        x1,y1,x2,y2=rect;buf=io.BytesIO();background_no_ingots.crop(rect).save(buf,'PNG')
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
from collections import deque
# Only discard exterior navy pixels CONNECTED to the screenshot border.
# This preserves dark real iron spots inside the blade, unlike a brightness key.
samples=[p[3,3],p[sw-4,3],p[3,sh-4],p[sw-4,sh-4]]
bg=[sorted(z[k] for z in samples)[2] for k in (0,1,2)]
def is_outer_bg(xx,yy):
    r,g,b,a=p[xx,yy]
    return (r<105 and g<120 and b<143 and
      (abs(r-bg[0])+abs(g-bg[1])+abs(b-bg[2])<105 or
       (b-r>11 and b-g>1 and r<80)))
mask=Image.new('L',sword.size,255)
seen=bytearray(sw*sh)
queue=deque()
def visit(xx,yy):
    i=yy*sw+xx
    if seen[i] or not is_outer_bg(xx,yy):return
    seen[i]=1
    queue.append(i)
for xx in range(sw):
    visit(xx,0);visit(xx,sh-1)
for yy in range(sh):
    visit(0,yy);visit(sw-1,yy)
while queue:
    q=queue.popleft()
    xx=q%sw;yy=q//sw
    mask.putpixel((xx,yy),0)
    if xx>0:visit(xx-1,yy)
    if xx+1<sw:visit(xx+1,yy)
    if yy>0:visit(xx,yy-1)
    if yy+1<sh:visit(xx,yy+1)
mask=mask.filter(ImageFilter.GaussianBlur(.65))
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
