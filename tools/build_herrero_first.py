#!/usr/bin/env python3
"""Herrero-first incremental boot. Preserve approved resources and defer unrelated scenery."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
index=root/'index.html';s=index.read_text()
old="async function prepareRoute(prof){if(window.__GENESIS_LITE_BOOT){routeReady.add(prof);setLoadUI(100,'Modo rescate','Escenario simple: decoración 3D desactivada.');return;}"
new="async function prepareRoute(prof){if(window.__GENESIS_LITE_BOOT&&prof!=='Herrero'){routeReady.add(prof);return;}"
assert s.count(old)==1, 'route guard changed'
s=s.replace(old,new)
index.write_text(s)
p=root/'village_world.js';s=p.read_text()
a=s.index("  if(globalThis.__GENESIS_LITE_BOOT){",s.index("export async function mountVillage("))
b=s.index("\n const plan=globalThis.GenesisVillagePlan;",a)
replacement="""  if(globalThis.__GENESIS_LITE_BOOT){
   const plan=globalThis.GenesisVillagePlan,root=new Entity('Project Genesis · Herrero primero');
   app.root.addChild(root);
   // NPCs, merchant and economy subscribe to this callback.
   onRootReady(root);
   const floor=material('Suelo de aldea',[.32,.36,.30]);
   mesh(root,'Suelo','plane',7,-.04,17,63,1,63,floor);
   const pathMat=material('Caminos',[.48,.44,.36]);
   for(const lane of plan.roads)mesh(root,lane.name,'plane',lane.x,-.02,lane.z,lane.w,1,lane.d,pathMat);
   const buildings=new Map();
   const w=plan.workshops.find(p=>p.profession==='Herrero');
   if(!w)throw new Error('Herrero no figura en village plan');
   // The existing workshop shell and door are reused, not fabricated geometry.
   const building=new Entity('Herrero · taller completo');
   root.addChild(building);
   building.setLocalPosition(w.x,0,w.z);
   building.setLocalScale(plan.workshopScale,1,plan.workshopScale);
   building.setLocalEulerAngles(0,w.yaw,0);
   for(const [source,position] of [[shell,[0,0,0]],[roof,[0,3.40,-5.05]],[door,[-1.1,0,.12]]]){
    if(!source)continue;
    const clone=source.clone();
    clone.enabled=true;
    clone.setLocalPosition(...position);
    if(source===roof)clone.setLocalScale(1.28,.70,.86);
    building.addChild(clone);
   }
   // If the optional roof template was deferred, add only a lightweight roof.
   if(!roof)mesh(building,'Cubierta básica Herrero','box',0,3.4,-5.05,11.5,.18,8,material('Tejado',[.30,.24,.21]));
   buildings.set('Herrero',building);
   const trees={update(){},blocked(){return false},status(){return{loaded:0}},release(){}};
   globalThis.__genesisLiteVillage={mode:'herrero-first',trees:0,roads:plan.roads.length,workshops:1};
   return Object.freeze({root,plan,trees,arcanePortals:[],
    setProfession(prof){building.enabled=true;},
    blocked(x,z,r=.33){return plan.blocked(x,z,r)}});
  }
"""
s=s[:a]+replacement+s[b:];p.write_text(s)
p=root/'genesis_workshop_live_v015.js';s=p.read_text()
old="if(!globalThis.__GENESIS_LITE_BOOT)init().catch(e=>"
new="init().catch(e=>"
assert s.count(old)==1
s=s.replace(old,new);p.write_text(s)
print('Herrero-first boot: route restored, original workshop + NPC callback, trees/fountain/arcanist deferred')
