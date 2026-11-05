/* Project Genesis V0186 — REAL archived Forge V038, working original Q1 visual state.
 * NO new concept asset, no replacement of approved doors/walls, no texture relighting.
 * Independent from V018.5. Restores physically plausible doorway/forge navigation
 * while using the existing NGE quest stages as the only source of truth.
 */
(function(root,factory){
  const api=factory();root.GenesisHerreroInteriorV0186=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const FORGE_ID='forge-station-v038';
 const FORGE_POS=Object.freeze([2.27,0,-6.36]);
 const FORGE_HALF=Object.freeze([1.075,.89]);
 const INTERIOR=Object.freeze({left:-4.5,right:4.5,front:0,back:-7.875});
 const PLAYER_R=.24;
 function inRoom(p,margin=0){
   return p.x>INTERIOR.left+margin&&p.x<INTERIOR.right-margin&&p.z<INTERIOR.front-margin&&p.z>INTERIOR.back+margin;
 }
 // A swept segment check (not teleport) lets only the actual stone arch be traversed.
 // Outward Herrero leaf is opened by the ORIGINAL Ordan first-dialogue step.
 function canWalk(from,to,step){
   if(!Number.isFinite(to.x)||!Number.isFinite(to.z))return false;
   const oldInside=inRoom(from),newInside=inRoom(to);
   // Only validate the actual masonry boundary, not an outer padded shell:
   // that outer margin would block reaching the opening at all.
   if(oldInside!==newInside){
     const dz=to.z-from.z;
     const crossesFront=dz!==0&&((from.z>=INTERIOR.front&&to.z<INTERIOR.front)||
       (from.z<=INTERIOR.front&&to.z>INTERIOR.front));
     const t=crossesFront?(INTERIOR.front-from.z)/dz:0;
     const entryX=from.x+(to.x-from.x)*t;
     const doorClearance=Math.abs(entryX)<=.61-PLAYER_R*.25;
     if(!(crossesFront&&t>=-1e-4&&t<=1.0001&&doorClearance&&step>=1)){
       // If moving parallel to the front or over a side wall, reject only
       // the perimeter crossing. Leaving an already permitted interior stays possible.
       return false;
     }
   }
   if(newInside){
     const nearForge=Math.abs(to.x-FORGE_POS[0])<FORGE_HALF[0]+PLAYER_R&&
       Math.abs(to.z-FORGE_POS[2])<FORGE_HALF[1]+PLAYER_R;
     if(nearForge)return false;
   }
   return true;
 }
 function install(app,resources,game){
   const pc=globalThis.pc,asset=resources?.get(FORGE_ID);
   if(!pc?.Entity||!app?.root||!game?.step||!asset?.resource?.instantiateRenderEntity)
     throw Error('V0186: Forge V038, Q1 or actual PlayCanvas scene missing');
   const real=asset.resource.instantiateRenderEntity();
   real.name='Herrero · fragua V038 real, estado Q1';
   // Existing V038 was authored at the real meter scale: 2.09x3.22x1.67,
   // its floor base begins at y=-0.063m. No invented 1.8x X stretching.
   real.setPosition(FORGE_POS[0],.065,FORGE_POS[2]);
   for(const r of real.findComponents('render')){r.castShadows=true;r.receiveShadows=true}
   const rendered=real.findComponents('render'),meshes=rendered.flatMap(r=>r.meshInstances||[]);
   if(!meshes.length){real.destroy();throw Error('V0186: V038 GLB has no render mesh')}
   // Do not affect the original V038 resource shared by previews: clone only
   // ember materials that are changed by this per-instance Q1 state.
   const emberMaterials=new Map();
   for(const mi of meshes){
     const src=mi.material;
     if(!src||!/ember|glow|hot_charcoal/i.test(src.name||''))continue;
     let mat=emberMaterials.get(src);
     if(!mat){
       mat=src.clone();
       mat.name=(src.name||'forge-ember')+' · Q1 off until first lighting';
       emberMaterials.set(src,mat);
     }
     mi.material=mat;
   }
   app.root.addChild(real);
   let forgeHot=null;
   const update=()=>{
     const hot=game.step()>=7;  // Q1 forge action (step 6) was completed.
     if(hot===forgeHot)return;
     forgeHot=hot;
     for(const material of emberMaterials.values()){
       material.emissiveIntensity=hot?2.1:0;
       material.update();
     }
   };
   update();app.on('update',update);
   const publicStatus={
     source:'assets/vendor/genesis/externals/forgeStation/src/Forge_V038_HeaderFixed_Preview.glb',
     id:FORGE_ID,geometry:'original archive, 109 meshes, no procedural stand-in',
     worldPosition:FORGE_POS,realDimensionsMetres:[2.0934,3.2238,1.6742],
     repairedOnQuestStep:7, originalPbrPreserved:true,
     get forgeHot(){update();return forgeHot},
     get questStep(){return game.step()},
     get renderMeshCount(){return meshes.length}
   };
   globalThis.__GENESIS_V0186_INTERIOR__=publicStatus;
   return Object.freeze({real,status:publicStatus,canWalk:(from,to)=>canWalk(from,to,game.step()),
     dispose(){app.off('update',update);real.destroy();for(const m of emberMaterials.values())m.destroy?.()}});
 }
 return Object.freeze({install,canWalk,FORGE_POS,INTERIOR});
});
