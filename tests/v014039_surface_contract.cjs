'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../village_world.js'),'utf8');
for(const token of [
 "globalThis.__genesisVillageSurface={phase:'loading',fallback:true}",
 "await maps(app,'cobble',false,onResourceLoaded)",
 "await maps(app,'traffic',false,onResourceLoaded)",
 "floorEntity.render.material=pavedMaterial(",
 "entity.render.material=pavedMaterial(",
 "globalThis.__genesisVillageSurface={phase:'ready',fallback:false",
 "mountVillageTrees(app,root,{onResourceLoaded,lod2Only:true})",
 "mountGenesisDolphinFountain(app,root,{afterTrees:trees.fullReady})",
 "mountClosedWorkshopsV014036(app,root,plan,{"
])assert(code.includes(token),'V014039 missing surface/world restoration: '+token);
console.log('PASS_V014039_SURFACE_CONTRACT');
