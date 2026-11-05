#!/usr/bin/env python3
"""All existing V014022 visual modules share controlled groups, no independent post-start downloads."""
from pathlib import Path
p=Path("index.html")
s=p.read_text(encoding="utf-8")
assert "V014022 GROUPED NO DEFERRED" in s
assert "V014022 GATED AUXILIARY ASSETS" not in s

def swap(before,after,label):
 global s
 assert s.count(before)==1,(label,s.count(before))
 s=s.replace(before,after,1)
 print("GATE",label)

swap("window.__genesisVillage=village;\nlet genesisMarket=null;",
"""window.__genesisVillage=village;
/* V014022 GATED AUXILIARY ASSETS: other modules may not start standalone downloads. */
bootGroups.paredes.total++;
activeBootGroup='paredes';
showBootProgress('Cargando estructuras','Preparando paredes del Arcanista V006 desde la misma cola.');
try{
 let begin=globalThis.GenesisBeginArcanistaWallsV006;
 for(let i=0;i<40&&!begin;i++){await new Promise(resolve=>setTimeout(resolve,250));begin=globalThis.GenesisBeginArcanistaWallsV006}
 if(!begin)throw Error('No se inició el módulo de Arcanista');
 await begin();
 bootGroups.paredes.ready++;
 showBootProgress('Estructuras listas','Paredes del Arcanista terminadas.');
}catch(error){
 bootGroups.paredes.ready++;bootGroups.paredes.failed=(bootGroups.paredes.failed||0)+1;
 showBootProgress('Estructura de Arcanista: respaldo','Se conserva la fachada anterior: '+String(error?.message||error));
}
let genesisMarket=null;""","Arcanista initial-world gate")

swap(""" });
} catch (error) { console.error('Mercado V001 no pudo instalarse',error); }

function hideCollisionMeshes""",
""" });
 bootGroups.objetos.total++;
 activeBootGroup='objetos';
 showBootProgress('Cargando personajes y objetos','Preparando mercader aprobado, sin carga diferida.');
 await genesisMarket.initialReady;
 bootGroups.objetos.ready++;
 if(genesisMarket.visual.phase!=='ready')bootGroups.objetos.failed=(bootGroups.objetos.failed||0)+1;
 showBootProgress('Mercado preparado','Mercader: '+genesisMarket.visual.phase);
} catch (error) { console.error('Mercado V001 no pudo instalarse',error); }

function hideCollisionMeshes""","market NPC completed before intro")

swap("""  group.total=groupRouteModels(routeModels(prof,priority)).length;
  group.ready=0;group.failed=0;activeBootGroup=id;""",
"""  const overlayCount=(priority==='stream'&&prof==='Herrero')?4:0;
  const coreTotal=groupRouteModels(routeModels(prof,priority)).length;
  group.total=coreTotal+overlayCount;
  group.ready=0;group.failed=0;activeBootGroup=id;""","include existing V015 approved workshop visuals in Herrero group")
swap("""    group.ready=Math.min(group.total,already+done);""",
"""    group.ready=Math.min(coreTotal,already+done);""","account for native route models only")
swap("""    group.ready=group.total;group.failed=0;
    showBootProgress(prof+' · '+description+' preparado','Todos los assets de este grupo están instanciados.');
    break;""",
"""    group.ready=coreTotal;group.failed=0;
    showBootProgress(prof+' · '+description+' preparado','Modelos de ruta instanciados.');
    break;""","reserve visual module slots until real completion")
swap("""  }
 }
 try{refreshRouteBindings(prof)}catch(err){console.warn('Bindings de ruta:',err)}""",
"""  }
  if(overlayCount){
   const extraReady=new Set();
   showBootProgress('Cargando herrería · geometría aprobada','Paredes, techo, chimenea y puerta; se integran antes de jugar.');
   try{
    let begin=globalThis.GenesisBeginHerreroV015;
    for(let i=0;i<40&&!begin;i++){await sleep(250);begin=globalThis.GenesisBeginHerreroV015}
    if(!begin)throw Error('Módulo visual de herrería no disponible');
    await begin(name=>{
     if(extraReady.has(name))return;
     extraReady.add(name);group.ready=coreTotal+extraReady.size;
     showBootProgress('Cargando herrería · geometría aprobada',name+' · '+extraReady.size+' de 4');
    });
    group.ready=group.total;group.failed=0;
    showBootProgress('Herrería completa','Los cuatro modelos visuales también están listos.');
   }catch(error){
    // The original workshop geometry stays intact. No unbounded task remains
    // in the background, and the exact failed module stays visible.
    group.failed=Math.max(1,overlayCount-extraReady.size);
    showBootProgress('Herrería · visual de respaldo','No se modificó el taller original: '+String(error?.message||error));
   }
  }
 }
 try{refreshRouteBindings(prof)}catch(err){console.warn('Bindings de ruta:',err)}""","finish V015 visuals before game, fallback without background request")
assert "GenesisBeginArcanistaWallsV006" in s
assert "genesisMarket.initialReady" in s
assert "GenesisBeginHerreroV015" in s
assert "streamRouteDecor(prof);" not in s
p.write_text(s,encoding="utf-8")
print("Gated merchant, Arcanista and approved Herrero visuals: no independent downloads.")
