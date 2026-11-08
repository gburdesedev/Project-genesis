#!/usr/bin/env python3
"""Experimental restoration of existing full PlayCanvas world on staged 0.14.032.
Deliberately retains tested lightweight streaming loader and untouched original assets.
"""
from pathlib import Path
index=Path('index.html')
world=Path('village_world.js')
arcane=Path('genesis_arcanista_four_walls_v006.js')
s=index.read_text(encoding='utf8')
w=world.read_text(encoding='utf8')
a=arcane.read_text(encoding='utf8')
def once(src,old,new,label):
 if old not in src:raise RuntimeError(label+' anchor not found')
 if src.count(old)!=1:raise RuntimeError(label+' anchor count '+str(src.count(old)))
 return src.replace(old,new,1)
s=once(s,"window.__GENESIS_LITE_BOOT=true;window.__GENESIS_TEST_NO_DOOR_FORGE=true;",
       "window.__GENESIS_LITE_BOOT=true;window.__GENESIS_WORLD_FULL=true;window.__GENESIS_TEST_NO_DOOR_FORGE=true;",
       'full-world flag')
w=once(w,'if(globalThis.__GENESIS_LITE_BOOT){',
       'if(globalThis.__GENESIS_LITE_BOOT && !globalThis.__GENESIS_WORLD_FULL){','full builder selection')
a=once(a,'if(!globalThis.__GENESIS_LITE_BOOT)mount()',
       'if(!globalThis.__GENESIS_LITE_BOOT||globalThis.__GENESIS_WORLD_FULL)mount()','Arcanista mount')
s=once(s,'data-disabled-asset="genesisFountainV011HQAsset" data-route="LiteDecor"',
       'data-asset="genesisFountainV011HQAsset" data-route="Herrero" data-priority="stream"','fountain preload')
s=once(s,"'./village_world.js?v=0.14.022-mobile-rescue'","'./village_world.js?v=0.14.032-full-village-experimental'",
       'world import bust')
s=once(s,"./genesis_arcanista_four_walls_v006.js?v=0.16.006b",
       "./genesis_arcanista_four_walls_v006.js?v=0.14.032-full-village-experimental",'arcane import bust')
for path,text in [(index,s),(world,w),(arcane,a)]:path.write_text(text,encoding='utf8')
print("FULL_VILLAGE_PATCH",{"staged_only":True,"full_builder":True,"lite_streaming_preserved":True,
 "14_tree_sites":len(__import__('re').findall(r'x:',Path('village_trees.js').read_text()[:2500])),
 "fountain":"HQ GLB in Herrero stream group","merchant":"existing V02 model preserved","cinematics":"separate next step"})
