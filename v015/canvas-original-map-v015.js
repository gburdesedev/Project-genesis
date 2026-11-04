/* Project Genesis V015 — reconstruction of the approved original Canvas village.
 * Coordinates are read from ../village_plan.js; no new settlement layout.
 * Existing V012 PBR streets, V011 rigged characters, V013 quests and V014 HUD remain authoritative.
 */
(function(global) {
 'use strict';
 const plan=global.GenesisVillagePlan;
 const ORIGINAL=global.GenesisOriginalWorkshopSources;
 const report={version:'0.15-v015',phase:'not-mounted',workshops:[],trees:0,merchant:null,market:null,plaza:null,fountain:'pending',originalAssets:{},errors:[]};
 const path='./assets/vendor/genesis/externals/';
 const glbs=Object.freeze({
   walls:'../assets/vendor/genesis/externals/blacksmithWallsV082/src/blacksmith_four_walls_arched_v082.glb',
   roof:'../assets/vendor/genesis/externals/blacksmithRoofV013/src/blacksmith_roof_preview.glb',
   chimney:'../assets/vendor/genesis/externals/blacksmithChimneyV013/src/blacksmith_chimney_candidate_preview.glb',
   doorSmith:'../assets/vendor/genesis/externals/blacksmithDoorV082/src/door-herrero-v082-b.glb',
   doorArcane:'../assets/vendor/genesis/externals/arcanistDoorV027/src/Arcanist_Door_V027_WebGL.glb',
   fountain:'../assets/vendor/genesis/externals/genesisFountainV011HQAsset/src/PG_Dolphin_Fountain_V011_PlayCanvas_HQ_Optimized.glb'
 });
 const forest=Object.freeze({
   oak:'../assets/vendor/genesis/externals/tree_v005_oak_lod2/src/lod2.glb',
   ash:'../assets/vendor/genesis/externals/tree_v005_ash_lod2/src/lod2.glb',
   linden:'../assets/vendor/genesis/externals/tree_v005_linden_lod2/src/lod2.glb',
   maple:'../assets/vendor/genesis/externals/tree_v005_maple_lod2/src/lod2.glb'
 });
 const height=Object.freeze({oak:9.1,ash:9.7,linden:8.7,maple:8.5});
 const treeSites=Object.freeze([
   ['oak',.4,10.7,'plaza'],['maple',11.8,11.7,'plaza'],
   ['linden',2.2,20.3,'plaza'],['ash',11.8,20.3,'plaza'],
   // Same exterior site order and species shuffle as village_trees.js.
   ...(()=>{const s=[[-19,-8],[25,-8],[-21,1],[-21,26],[-12,45],[-3,45],[35,44],[22,6],[-8,23],[19,24]];
     const pool=['oak','oak','ash','ash','ash','linden','linden','maple','maple','maple'];
     let seed=0x6a53c21d;
     for(let i=pool.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[pool[i],pool[j]]=[pool[j],pool[i]]}
     return s.map(([x,z],i)=>[pool[i],x,z,'exterior']);
   })()
 ]);
 function issue(label,err) {
   report.errors.push({asset:label,message:String(err?.message||err)});
   console.warn('[Project Genesis V015 map]',label,err);
 }
 function inline(app,pc,name,base64){
   return new Promise((resolve,reject)=>{
     try {
       const binary=atob(base64),bytes=new Uint8Array(binary.length);
       for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
       const asset=new pc.Asset(name,'container',{url:'data:model/gltf-binary;base64,'+base64,filename:name+'.glb'},null,{buffer:bytes.buffer});
       app.assets.add(asset);
       asset.once('load',()=>resolve(asset));
       asset.once('error',reject);
       app.assets.load(asset);
     }catch(e){reject(e)}
   });
 }
 function remote(app,label,url) {
   return new Promise((resolve,reject)=>{
     try {
       const absolute=new URL(url,document.baseURI);
       if(absolute.origin!==location.origin)throw Error('External village asset blocked: '+label);
       app.assets.loadFromUrl(absolute.href,'container',(error,asset)=>{
         if(error||!asset?.resource){reject(error||Error(label+' missing'));return}
         resolve(asset);
       });
     }catch(e){reject(e)}
   });
 }
 const usable=asset=>{
   const entity=asset.resource.instantiateRenderEntity();
   if(!entity?.findComponents('render')?.length)throw Error('Asset without render meshes: '+asset.name);
   return entity;
 };
 function material(pc,name,r,g,b) {
   const m=new pc.StandardMaterial();
   m.name=name;m.diffuse=new pc.Color(r,g,b);m.gloss=.20;m.update();return m;
 }
 function box(pc,root,name,x,y,z,w,h,d,m){
   const e=new pc.Entity(name);
   e.addComponent('render',{type:'box',material:m,castShadows:true,receiveShadows:true});
   e.setLocalPosition(x,y,z);e.setLocalScale(w,h,d);root.addChild(e);return e;
 }
 function placeWorkshop(app,pc,root,definition,shell,door){
   const pivot=new pc.Entity(definition.label+' · Canvas original');
   pivot.setPosition(definition.x,0,definition.z);
   pivot.setLocalEulerAngles(0,definition.yaw,0);
   pivot.setLocalScale(plan.workshopScale,1,plan.workshopScale);
   root.addChild(pivot);
   const wall=usable(shell);wall.name=definition.profession+' · fachada original';pivot.addChild(wall);
   wall.setLocalPosition(0,0,0);
   const hinge=new pc.Entity(definition.profession+' · bisagra puerta original');
   hinge.setLocalPosition(-1.10,0,.12);pivot.addChild(hinge);
   const leaf=usable(door);leaf.name=definition.profession+' · hoja original';
   hinge.addChild(leaf);
   const item={profession:definition.profession,position:[definition.x,0,definition.z],yaw:definition.yaw,
     original:!!definition.existing,shell:wall,hinge,door:leaf,pivot};
   report.workshops.push({profession:item.profession,position:item.position,yaw:item.yaw,visible:true,originalSource:'root/index.html'});
   return item;
 }
 function marketStall(pc,world){
   // Exact approved provisional market stall footprint from genesis_market_v001.js.
   const root=new pc.Entity('Mercado · puesto de suministros original');
   world.addChild(root);root.setPosition(28.35,0,37.6);
   const wood=material(pc,'Puesto de mercado - roble usado',.26,.16,.09);
   const edge=material(pc,'Puesto - herrajes envejecidos',.26,.25,.22);
   const flax=material(pc,'Puesto - toldo lino crudo',.60,.52,.38);
   const ochre=material(pc,'Puesto - franjas ocres',.47,.28,.14);
   const crate=material(pc,'Puesto - cajas de transporte',.39,.26,.14);
   const stock=material(pc,'Puesto - sacos con mineral',.24,.22,.18);
   box(pc,root,'Mesa madera maciza',0,1.02,0,2.35,.17,1.26,wood);
   for(const x of [-.98,.98])for(const z of [-.43,.43]){
     box(pc,root,'Pata estructural',x,.52,z,.13,1.04,.13,wood);
     box(pc,root,'Poste vertical toldo',x,1.82,z,.10,1.75,.10,wood);
   }
   box(pc,root,'Toldo de lona cruda',0,2.72,0,2.84,.13,1.77,flax);
   for(const x of [-1.15,-.46,.23,.92])box(pc,root,'Cinta textil ocre',x,2.795,0,.26,.015,1.68,ochre);
   box(pc,root,'Frente madera',0,.86,-.61,2.35,.34,.06,wood);
   box(pc,root,'Herraje frontal',0,.95,-.648,2.15,.035,.014,edge);
   for(const [x,z] of [[-.82,-.18],[.18,.18],[.77,-.08]]){
     box(pc,root,'Caja de materiales del mercado',x,1.24,z,.56,.30,.45,crate);
     box(pc,root,'Saco con material sin etiqueta',x,1.42,z,.40,.13,.30,stock);
   }
   box(pc,root,'Cajon inferior',-1.10,.31,.63,.72,.62,.58,crate);
   return root;
 }
 async function approvedSmith(app,items){
   const smith=items.get('Herrero');if(!smith)return;
   try{
     // Keep original shell visible until ALL three approved replacements load.
     const [wallAsset,roofAsset,chimneyAsset]=await Promise.all([
       remote(app,'herrero-walls',glbs.walls),remote(app,'herrero-roof',glbs.roof),remote(app,'herrero-chimney',glbs.chimney)
     ]);
     const walls=usable(wallAsset),roof=usable(roofAsset),chimney=usable(chimneyAsset);
     const block=new global.pc.Entity('Herrero · aprobados V082 walls + V013 roof/chimney');
     block.setLocalScale(12/7.875,1,12/7.875);smith.pivot.addChild(block);
     const boost=1.30*1.35;
     walls.name='Walls V082';roof.name='Roof V013';chimney.name='Chimney V013';
     block.addChild(walls);block.addChild(roof);block.addChild(chimney);
     roof.setLocalScale(1,boost,1);roof.setLocalPosition(0,-3.2*(boost-1),0);
     chimney.setLocalScale(1,boost,1);chimney.setLocalPosition(0,-3.2*(boost-1),0);
     smith.shell.enabled=false;
     report.originalAssets.herrero='approved V082/V013 with preserved original door hinge';
   }catch(e){issue('herrero approved walls-roof-chimney',e)}

 }
 async function approvedSmithDoor(app,items){
   const smith=items.get('Herrero');if(!smith)return;
   try{
     const asset=await remote(app,'herrero-door',glbs.doorSmith),leaf=usable(asset);
     smith.hinge.addChild(leaf);smith.door.enabled=false;smith.door=leaf;
     report.originalAssets.doorSmith='approved V082-B';
   }catch(e){issue('herrero door V082-B',e)}
 }
 async function arcaneDoor(app,items){
   const arcane=items.get('Arcanista');if(!arcane)return;
   try{
     const leaf=usable(await remote(app,'arcanist door',glbs.doorArcane));
     arcane.hinge.addChild(leaf);arcane.door.enabled=false;arcane.door=leaf;
     report.originalAssets.doorArcane='approved V027';
   }catch(e){issue('Arcanist door V027',e)}
 }
 async function addTrees(app,pc,root) {
   // Original LOD2 models and same 14 approved locations; never block gameplay.
   const prototypes={};
   for(const [species,url] of Object.entries(forest)){
     try{prototypes[species]=usable(await remote(app,'tree:'+species,url))}
     catch(e){issue('tree:'+species,e)}
   }
   treeSites.forEach(([species,x,z,region],i)=>{
     const prototype=prototypes[species];if(!prototype)return;
     try {
       const tree=new pc.Entity('Árbol original '+(i+1)+' · '+species);
       root.addChild(tree);tree.setPosition(x,0,z);tree.setEulerAngles(0,(i*137.508)%360,0);
       const model=prototype.clone();
       const boxes=model.findComponents('render').flatMap(r=>r.meshInstances||[]).map(mi=>mi.aabb).filter(Boolean);
       let yMin=Infinity,yMax=-Infinity,cxMin=Infinity,cxMax=-Infinity,czMin=Infinity,czMax=-Infinity;
       for(const b of boxes){
         yMin=Math.min(yMin,b.center.y-b.halfExtents.y);
         yMax=Math.max(yMax,b.center.y+b.halfExtents.y);
         cxMin=Math.min(cxMin,b.center.x-b.halfExtents.x);cxMax=Math.max(cxMax,b.center.x+b.halfExtents.x);
         czMin=Math.min(czMin,b.center.z-b.halfExtents.z);czMax=Math.max(czMax,b.center.z+b.halfExtents.z);
       }
       if(!Number.isFinite(yMin)||yMax-yMin<.1)throw Error('Invalid original tree bounds');
       const siteSize=.90+((i*7)%9)*.025;
       const scale=height[species]*siteSize*(region==='plaza'?.86:1)/(yMax-yMin);
       model.setLocalScale(scale,scale,scale);
       model.setLocalPosition(-(cxMin+cxMax)*.5*scale,-yMin*scale,-(czMin+czMax)*.5*scale);
       tree.addChild(model);report.trees++;
     }catch(e){issue('tree placement '+species+' '+i,e)}
   });
   report.originalAssets.trees='approved local LOD2 '+report.trees+'/14 at original coordinates';
 }
 async function fountain(app,pc,root){
   // Approved HQ asset, only visible after real geometry is loaded. No stand-in.
   try {
     if(pc.WasmModule?.setConfig) {
       pc.WasmModule.setConfig('DracoDecoderModule',{
         glueUrl:'https://developer.playcanvas.com/assets/modules/draco/draco.wasm.js',
         wasmUrl:'https://developer.playcanvas.com/assets/modules/draco/draco.wasm.wasm',
         fallbackUrl:'https://developer.playcanvas.com/assets/modules/draco/draco.js'
       });
       pc.WasmModule.getInstance('DracoDecoderModule',()=>{});
     }
     const model=usable(await remote(app,'original fountain V011',glbs.fountain));
     model.name='Fuente de delfines V011 HQ original';
     root.addChild(model);model.setPosition(plan.plaza.x,0,plan.plaza.z);
     report.fountain='ready at original '+plan.plaza.x+','+plan.plaza.z;
   }catch(e){report.fountain='unavailable';issue('fountain V011 HQ',e)}
 }
 function updateDoor(app,smith,getStep){
   let current=0;
   app.on('update',dt=>{
     if(!smith?.hinge)return;
     const target=Number(getStep?.()||0)>=2?-92:0;
     current+=(target-current)*Math.min(1,Math.max(0,dt)*2.8);
     smith.hinge.setLocalEulerAngles(0,current,0);
   });
 }
 function blocked(x,z,r=.33){
   const b=plan.bounds;
   if(x<b.minX+r||x>b.maxX-r||z<b.minZ+r||z>b.maxZ-r)return true;
   if(plan.blocked(x,z,r))return true;
   if(Math.hypot(x-plan.plaza.x,z-plan.plaza.z)<2.13+r)return true;
   if(Math.hypot(x-25.5,z-36.3)<.34+r)return true;
   if(Math.abs(x-28.35)<1.5+r&&Math.abs(z-37.6)<1.1+r)return true;
   return false;
 }
 function mount({app,people,game,diag}) {
   let decorStarted=false;
   let decorPromise=null;
   let prepared=null;
   function startDecor(){
     if(decorStarted)return decorPromise;
     decorStarted=true;report.phase='loading-approved-scenery';
     decorPromise=(async()=>{
       const {root,workshops}=await ready;
       await approvedSmith(app,workshops);
       await arcaneDoor(app,workshops);
       await addTrees(app,global.pc,root);
       await fountain(app,global.pc,root);
       await approvedSmithDoor(app,workshops);
       report.phase='approved-scenery-settled';
       diag?.block('v015-village','scenery-complete',{trees:report.trees,fountain:report.fountain,errors:report.errors});
     })().catch(error=>{issue('deferred scenery',error);report.phase='scenery-partial'});
     return decorPromise;
   }
   if(!plan?.workshops||!plan.market||!ORIGINAL?.workshopShell||!ORIGINAL?.doorLeaf)throw Error('Missing exact original Canvas village specification/assets');
   const pc=global.pc;
   const root=new pc.Entity('ALDEA ORIGINAL · 63 × 63 · Canvas V015');
   app.root.addChild(root);
   const ready=(async()=>{
     report.phase='loading-exact-canvas-shell';
     const [shell,door]=await Promise.all([
       inline(app,pc,'Original Canvas workshopShell',ORIGINAL.workshopShell),
       inline(app,pc,'Original Canvas doorLeaf083',ORIGINAL.doorLeaf)
     ]);
     const workshops=new Map();
     for(const p of plan.workshops)workshops.set(p.profession,placeWorkshop(app,pc,root,p,shell,door));
     const merchant=people.get('merchant');
     if(merchant){
       // Original actual market coordinates, not the temporary V014 plaza test position.
       merchant.setPosition(25.5,0,36.3);merchant.setEulerAngles(0,90,0);
       report.merchant={position:[25.5,0,36.3],source:'approved merchant V02'};
     }
     marketStall(pc,root);
     report.market={center:[plan.market.x,plan.market.z],stall:[28.35,0,37.6]};
     report.plaza={center:[plan.plaza.x,plan.plaza.z]};
     updateDoor(app,workshops.get('Herrero'),()=>game?.step());
     report.phase='original-footprints-ready';
     diag?.block('v015-village','ready',{workshops:report.workshops.length,merchant:report.merchant,market:report.market});
     // Heavy approved scenery loads AFTER interactive arrival, strictly one group
     // at a time. This protects mobile browsers from simultaneous huge GLB
     // decoding and guarantees the original 63x63 playable map appears first.
     return {root,workshops};
   })().catch(e=>{report.phase='error';issue('original map primary',e);throw e});
   return Object.freeze({ready,startDecor,blocked,report,treeSites});
 }
 global.GenesisCanvasMapV015=Object.freeze({mount,report,treeSites});
})(globalThis);
