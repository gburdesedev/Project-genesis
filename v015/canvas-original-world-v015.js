/* Project Genesis V015 — Restore the approved 63×63 Canvas village in the
 * already-working V011–V014 PlayCanvas scene. No replacement approximations
 * for approved GLBs. Only market stall geometry originates verbatim from
 * genesis_market_v001.js; all building/tree/fountain meshes reference their
 * approved, same-origin assets from root main.
 */
(function(global){
'use strict';
const plan=global.GenesisVillagePlan;
const ASSETS={
 walls:'../assets/vendor/genesis/externals/blacksmithWallsV082/src/blacksmith_four_walls_arched_v082.glb',
 roof:'../assets/vendor/genesis/externals/blacksmithRoofV013/src/blacksmith_roof_preview.glb',
 chimney:'../assets/vendor/genesis/externals/blacksmithChimneyV013/src/blacksmith_chimney_candidate_preview.glb',
 smithDoor:'../assets/vendor/genesis/externals/blacksmithDoorV082/src/door-herrero-v082-b.glb',
 arcaneDoor:'../assets/vendor/genesis/externals/arcanistDoorV027/src/Arcanist_Door_V027_WebGL.glb',
 fountain:'../assets/vendor/genesis/externals/genesisFountainV011HQAsset/src/PG_Dolphin_Fountain_V011_PlayCanvas_HQ_Optimized.glb',
 trees:{
  oak:'../assets/vendor/genesis/externals/tree_v005_oak_lod2/src/lod2.glb',
  ash:'../assets/vendor/genesis/externals/tree_v005_ash_lod2/src/lod2.glb',
  linden:'../assets/vendor/genesis/externals/tree_v005_linden_lod2/src/lod2.glb',
  maple:'../assets/vendor/genesis/externals/tree_v005_maple_lod2/src/lod2.glb'
 }
};
const TREES=Object.freeze([
 ['oak',.4,10.7],['maple',11.8,11.7],['linden',2.2,20.3],['ash',11.8,20.3],
 ['ash',-19,-8],['oak',25,-8],['linden',-21,1],['ash',-21,26],
 ['maple',-12,45],['oak',-3,45],['maple',35,44],
 ['linden',22,6],['ash',-8,23],['maple',19,24]
]);
const MERCHANT={x:25.5,y:0,z:36.3}, STALL={x:28.35,y:0,z:37.6};
const snapshot={version:'V015',layout:'village_plan.js',bounds:plan?.bounds||null,
 plaza:plan?.plaza||null,market:plan?.market||null,
 workshops:[],trees:[],merchant:{...MERCHANT},stall:{...STALL},
 walls:'pending',roof:'pending',chimney:'pending',smithDoor:'pending',
 arcaneDoor:'pending',fountain:'deferred',errors:[],ready:false};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function create(app,{merchant,logger=()=>{}}={}){
 if(!plan||!app||!global.pc)throw Error('V015: missing original village plan or PlayCanvas engine');
 const pc=global.pc,root=new pc.Entity('Aldea original 63x63 · V015');
 app.root.addChild(root);
 const reported=(k,v,detail)=>{snapshot[k]=v;logger('v015.world.'+k,v,detail||{});};
 const rgb=(name,r,g,b,metal=.02)=>{const m=new pc.StandardMaterial();m.name=name;m.diffuse=new pc.Color(r,g,b);m.metalness=metal;m.useMetalness=metal>0;m.gloss=.24;m.update();return m;};
 const stone=rgb('Piedra existente de la aldea',.48,.45,.39);
 const wood=rgb('Puesto de mercado - roble usado',.26,.16,.09);
 const edge=rgb('Puesto - herrajes envejecidos',.26,.25,.22);
 const flax=rgb('Puesto - toldo lino crudo',.60,.52,.38);
 const ochre=rgb('Puesto - franjas ocres',.47,.28,.14);
 const crate=rgb('Puesto - cajas de transporte',.39,.26,.14);
 const stock=rgb('Puesto - sacos con mineral',.24,.22,.18);
 function box(parent,name,x,y,z,w,h,d,material,cast=true){
  const e=new pc.Entity(name);e.addComponent('render',{type:'box',material,castShadows:cast,receiveShadows:true});
  e.setLocalPosition(x,y,z);e.setLocalScale(w,h,d);parent.addChild(e);return e;
 }
 // Source: genesis_market_v001.js buildStall — same coordinates, dimensions and colors.
 const stall=new pc.Entity('Mercado · puesto de suministros provisional');
 root.addChild(stall);stall.setPosition(STALL.x,STALL.y,STALL.z);
 box(stall,'Mesa madera maciza',0,1.02,0,2.35,.17,1.26,wood);
 for(const x of [-.98,.98])for(const z of [-.43,.43]){
  box(stall,'Pata estructural',x,.52,z,.13,1.04,.13,wood);
  box(stall,'Poste vertical toldo',x,1.82,z,.10,1.75,.10,wood);
 }
 box(stall,'Toldo de lona cruda',0,2.72,0,2.84,.13,1.77,flax,false);
 for(const x of [-1.15,-.46,.23,.92])box(stall,'Cinta textil ocre',x,2.795,0,.26,.015,1.68,ochre,false);
 box(stall,'Frente madera',0,.86,-.61,2.35,.34,.06,wood);
 box(stall,'Herraje frontal',0,.95,-.648,2.15,.035,.014,edge);
 for(const [x,z] of [[-.82,-.18],[.18,.18],[.77,-.08]]){
  box(stall,'Caja de materiales del mercado',x,1.24,z,.56,.30,.45,crate);
  box(stall,'Saco con material sin etiqueta',x,1.42,z,.40,.13,.30,stock,false);
 }
 box(stall,'Cajon inferior',-1.10,.31,.63,.72,.62,.58,crate);
 if(merchant){
  merchant.setPosition(MERCHANT.x,0,MERCHANT.z);
  merchant.setEulerAngles(0,90,0);
 }
 // Reproduce the same reference perimeter of village_world.js.
 const market=plan.market;
 const marker=rgb('Referencia mercado',.55,.42,.22);
 for(const x of [market.x-market.w/2,market.x+market.w/2])
  box(root,'Borde mercado',x,.025,market.z,.12,.05,market.d,marker,false);
 for(const z of [market.z-market.d/2,market.z+market.d/2])
  box(root,'Borde mercado',market.x,.025,z,market.w,.05,.12,marker,false);
 const bounds=plan.bounds;
 for(const x of [bounds.minX,bounds.maxX])box(root,'Límite aldea',x,.12,17,.25,.24,63,stone,false);
 for(const z of [bounds.minZ,bounds.maxZ])box(root,'Límite aldea',7,.12,z,63,.24,.25,stone,false);
 // Canvas-textured village sign, exactly on original sign marker anchors.
 function sign(title,subtitle,x,z,yaw,height=2.9,width=3.2){
  const c=document.createElement('canvas');c.width=512;c.height=192;
  const g=c.getContext('2d');g.fillStyle='#101e25';g.fillRect(0,0,512,192);
  g.strokeStyle='#c7a56b';g.lineWidth=7;g.strokeRect(7,7,498,178);
  g.textAlign='center';g.fillStyle='#eed39b';g.font='bold 33px Georgia';g.fillText(title,256,78,480);
  g.fillStyle='#c9c9bf';g.font='22px system-ui';g.fillText(subtitle,256,130,470);
  const t=new pc.Texture(app.graphicsDevice,{name:'Letrero '+title,magFilter:pc.FILTER_LINEAR,minFilter:pc.FILTER_LINEAR});t.setSource(c);
  const mat=rgb('Letrero '+title,.9,.9,.9);
  mat.diffuseMap=t;mat.emissiveMap=t;mat.emissive=new pc.Color(.20,.18,.13);mat.emissiveIntensity=.25;mat.cull=pc.CULLFACE_NONE;mat.update();
  const plate=box(root,'Cartel '+title,x,height,z,width,.65,.04,mat,false);
  plate.setEulerAngles(0,yaw,0);
  box(root,'Poste '+title,x,.65,z,.13,1.3,.13,wood,false);
 }
 for(const p of plan.workshops)
  sign(p.label,p.existing?'Taller de oficio':'Taller cerrado',p.x,p.z,p.yaw);
 sign('MERCADO','Suministros',market.x-market.w/2+1,market.z-market.d/2+1,-90,2.1,5);
 sign('PLAZA CENTRAL','Aldea de los artesanos',plan.plaza.x-plan.plaza.w/2-1,
  plan.plaza.z-plan.plaza.d/2,0,1.9,4.4);
 function getGLB(key,url){
  return new Promise((resolve,reject)=>{
   app.assets.loadFromUrl(url,'container',(error,asset)=>{
    if(error||!asset?.resource){reject(Error(key+': '+String(error||'No container resource')));return}
    try{
     const first=asset.resource.instantiateRenderEntity();
     if(!first?.findComponents('render')?.some(r=>(r.meshInstances||[]).length)){
      first?.destroy();reject(Error(key+': GLB without renderable meshes'));return}
     resolve(first);
    }catch(e){reject(e)}
   });
  });
 }
 function reportOptional(key,promise){
  return promise.catch(err=>{reported(key,'error',{message:String(err)});snapshot.errors.push(key+': '+String(err));return null});
 }
 const ready=(async()=>{
  // Critical architecture, but never wait for foliage or the 16.7MB Draco fountain.
  const [walls,roof]=await Promise.all([
   getGLB('walls',ASSETS.walls).then(x=>(reported('walls','ready'),x)),
   getGLB('roof',ASSETS.roof).then(x=>(reported('roof','ready'),x))
  ]);
  const chimneyPromise=reportOptional('chimney',getGLB('chimney',ASSETS.chimney));
  const chimney=await chimneyPromise;
  // Source genesis_workshop_live_v015.js: exact native Blender-to-shell scale.
  const horizontal=12/7.875,roofRise=1.30*1.35;
  for(const p of plan.workshops){
   const frame=new pc.Entity(p.profession+' · fachada cerrada');
   root.addChild(frame);frame.setPosition(p.x,0,p.z);
   frame.setLocalEulerAngles(0,p.yaw,0);
   frame.setLocalScale(plan.workshopScale,1,plan.workshopScale);
   const modelRoot=new pc.Entity('Taller aprobado · escala original Blender');
   frame.addChild(modelRoot);modelRoot.setLocalScale(horizontal,1,horizontal);
   const wall=walls.clone(),roofPart=roof.clone();
   modelRoot.addChild(wall);modelRoot.addChild(roofPart);
   wall.setLocalPosition(0,0,0);
   roofPart.setLocalScale(1,roofRise,1);
   roofPart.setLocalPosition(0,-3.2*(roofRise-1),0);
   if(p.profession==='Herrero'&&chimney){
    const flue=chimney.clone();modelRoot.addChild(flue);
    flue.setLocalScale(1,roofRise,1);
    flue.setLocalPosition(0,-3.2*(roofRise-1),0);
   }
   if(p.profession==='Arcanista'){
    for(const render of wall.findComponents('render'))for(const instance of render.meshInstances||[]){
     if(instance.material?.clone){const m=instance.material.clone();
      if(m.diffuse)m.diffuse.set(m.diffuse.r*.76,m.diffuse.g*.81,m.diffuse.b*.94);
      m.update();instance.material=m}
    }
   }
   snapshot.workshops.push({profession:p.profession,x:p.x,z:p.z,yaw:p.yaw,w:p.w,d:p.d,visual:'approved-blacksmith-V082-shell'});
  }
  walls.destroy();roof.destroy();chimney?.destroy();
  snapshot.ready=true;
  reported('scene','workshops-ready',{count:snapshot.workshops.length,market:MERCHANT});
  return {workshops:snapshot.workshops.length,market:{...MERCHANT},fountain:snapshot.fountain};
 })().catch(e=>{snapshot.errors.push('critical: '+String(e));reported('scene','error',{message:String(e)});return{workshops:snapshot.workshops.length,error:String(e)}});
 // After the original scene architecture, install approved unique entrance doors
 // and fountain opportunistically, never delaying gameplay or UI.
 ready.then(async()=>{
  const smith=app.root.findByName('Herrero · fachada cerrada');
  const arcane=app.root.findByName('Arcanista · fachada cerrada');
  const doorSpecs=[['smithDoor',ASSETS.smithDoor,smith],['arcaneDoor',ASSETS.arcaneDoor,arcane]];
  for(const [key,url,frame] of doorSpecs){
   if(!frame)continue;
   void reportOptional(key,getGLB(key,url).then(model=>{
    // Door pivot is the original village_world.js (-1.1,0,.12), in workshop-local coordinates.
    frame.addChild(model);model.setLocalPosition(-1.1,0,.12);
    reported(key,'ready');return model;
   }));
  }
 });
 // Foliage is streamed one species at a time, not as a startup Promise.all.
 // Sites/positions match village_trees.js (14 trees, including 4 in the square).
 const treesDone=ready.then(async()=>{
  let n=0;
  for(const species of ['oak','maple','linden','ash']){
   try{
    const prototype=await getGLB('tree:'+species,ASSETS.trees[species]);
    const renderers=prototype.findComponents('render').flatMap(r=>r.meshInstances||[]);
    let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
    for(const m of renderers){const bb=m.aabb;if(!bb)continue;
     minX=Math.min(minX,bb.getMin().x);minY=Math.min(minY,bb.getMin().y);minZ=Math.min(minZ,bb.getMin().z);
     maxX=Math.max(maxX,bb.getMax().x);maxY=Math.max(maxY,bb.getMax().y);maxZ=Math.max(maxZ,bb.getMax().z)}
    const h=Number.isFinite(maxY)&&Number.isFinite(minY)?Math.max(.1,maxY-minY):9;
    const design={oak:9.1,ash:9.7,linden:8.7,maple:8.5}[species];
    for(let i=0;i<TREES.length;i++){
     const [type,x,z]=TREES[i];if(type!==species)continue;
     const anchor=new pc.Entity('Árbol aprobado · '+species+' · '+(i+1));
     anchor.setPosition(x,0,z);anchor.setEulerAngles(0,(i*137.508)%360,0);
     root.addChild(anchor);
     const model=prototype.clone();anchor.addChild(model);
     const size=.90+((i*7)%9)*.025,scale=design*size*(i<4?.86:1)/h;
     model.setLocalScale(scale,scale,scale);
     if(Number.isFinite(minY))model.setLocalPosition(-(minX+maxX)*scale/2,-minY*scale,-(minZ+maxZ)*scale/2);
     snapshot.trees.push({id:i+1,species,x,z,asset:'approved-v005-lod2'});
     n++;
    }
    prototype.destroy();
    reported('trees','partial',{count:n});
   }catch(e){snapshot.errors.push('tree:'+species+': '+String(e));reported('trees','partial',{count:n,error:String(e)})}
  }
  reported('trees','ready',{count:n});
 });
 // Do not block the 3D scene if Draco decoder is unavailable in this client.
 const fountainDone=ready.then(async()=>{
  try{
   if(pc.WasmModule?.setConfig){
    pc.WasmModule.setConfig('DracoDecoderModule',{
     glueUrl:'https://developer.playcanvas.com/assets/modules/draco/draco.wasm.js',
     wasmUrl:'https://developer.playcanvas.com/assets/modules/draco/draco.wasm.wasm',
     fallbackUrl:'https://developer.playcanvas.com/assets/modules/draco/draco.js'
    });
   }
   const model=await getGLB('fountain',ASSETS.fountain);
   root.addChild(model);model.setPosition(plan.plaza.x,0,plan.plaza.z);
   reported('fountain','ready');
   // Play all embedded GLB animation tracks when present.
   const a=app.assets.findByUrl(ASSETS.fountain);
   const tracks=a?.resource?.animations||[];
   if(tracks.length){
    model.addComponent('anim',{activate:false});
    for(const [i,asset] of tracks.entries()){
     const t=asset.resource;if(!t)continue;
     const name='water-'+i;
     try{model.anim.assignAnimation(name,t);if(i===0)model.anim.baseLayer.play(name)}catch(err){snapshot.errors.push('fountain animation: '+String(err))}
    }
   }
  }catch(e){snapshot.errors.push('fountain: '+String(e));reported('fountain','error',{message:String(e)})}
 });
 function blocked(x,z,r=.33){
  if(x<bounds.minX+r||x>bounds.maxX-r||z<bounds.minZ+r||z>bounds.maxZ-r)return true;
  // Talleres cerrados, except open front of existing Herrero.
  for(const w of plan.workshops){
   if(w.existing&&w.profession==='Herrero')continue;
   if(Math.abs(x-w.cx)<w.w/2+r&&Math.abs(z-w.cz)<w.d/2+r)return true;
  }
  // Real fountain site: approved 4.26m basin. NPCs and table do not block entry path.
  if(Math.hypot(x-plan.plaza.x,z-plan.plaza.z)<2.13+r)return true;
  for(const [type,tx,tz] of TREES)if(Math.hypot(x-tx,z-tz)<.43+r)return true;
  if(Math.abs(x-STALL.x)<1.2+r&&Math.abs(z-STALL.z)<.8+r)return true;
  return false;
 }
 global.__GENESIS_V015_WORLD__=Object.freeze({snapshot:()=>JSON.parse(JSON.stringify(snapshot)),ready,treesDone,fountainDone,blocked,root});
 return global.__GENESIS_V015_WORLD__;
}
global.GenesisOriginalVillageV015=Object.freeze({create,plan,assets:ASSETS,treeSites:TREES,merchant:MERCHANT,stall:STALL});
})(globalThis);
