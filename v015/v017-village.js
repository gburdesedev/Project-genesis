/* Project Genesis V017 — Original 63x63 village plan, five workshop facades.
 * User-approved assets: Herrero walls V082 / door V082-B; Arcanista walls V006 / door V027.
 * The other three use explicitly generic TEMPORARY stone-and-timber facades.
 * Every physical position comes from the existing GenesisVillagePlan; NGE remains untouched.
 * This module performs NO downloads. It mounts already-decoded, fully validated GLBs.
 */
(function(root,factory){
 const api=factory();
 root.GenesisVillageV017=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const HORIZONTAL=12/7.875;
 const ROOF_BOOST=1.30*1.35; // exact original V013 roof, raised around wall-top pivot
 const NAMES=Object.freeze({
  Herrero:{walls:'wall-herrero-v082',door:'door-herrero-v082-b'},
  Arcanista:{walls:'wall-arcanista-v006',door:'door-arcanista-v027'}
 });
 const WOOD={carpintero:[.36,.22,.12],curtidor:[.23,.18,.12],joyero:[.26,.22,.16]};
 function material(pc,name,diffuse,metalness=0,gloss=.12){
  const m=new pc.StandardMaterial();m.name=name;
  m.diffuse=new pc.Color(...diffuse);m.metalness=metalness;m.useMetalness=metalness>0;
  m.gloss=gloss;m.update();return m;
 }
 function component(pc,parent,name,type,pos,size,mat,{shadow=true}={}){
  const ent=new pc.Entity(name);
  ent.addComponent('render',{type,material:mat,castShadows:shadow,receiveShadows:true});
  ent.setLocalPosition(...pos);ent.setLocalScale(...size);parent.addChild(ent);
  return ent;
 }
 function instantiate(resources,id,name){
  const asset=resources.get(id);
  if(!asset?.resource?.instantiateRenderEntity)throw Error('V017 resource missing: '+id);
  const visual=asset.resource.instantiateRenderEntity();
  visual.name=name;
  const renderers=visual.findComponents('render');
  if(!renderers.length){visual.destroy();throw Error('V017 empty renderers: '+id)}
  for(const r of renderers){r.receiveShadows=true;r.castShadows=true}
  return visual;
 }
 function addModel(resources,parent,id,name,pos=[0,0,0],scale=[1,1,1]){
  const visual=instantiate(resources,id,name);
  visual.setLocalPosition(...pos);visual.setLocalScale(...scale);
  parent.addChild(visual);return visual;
 }
 function genericWoodDoor(pc,parent,profession){
  const color=WOOD[profession.toLowerCase()]||WOOD.carpintero;
  const wood=material(pc,profession+' · roble sin barnizar',color,0,.09);
  const grain=material(pc,profession+' · vetas oscuras',color.map(v=>v*.64),0,.11);
  const iron=material(pc,profession+' · clavos de hierro forjado',[.18,.16,.14],.65,.18);
  const door=new pc.Entity(profession+' · puerta temporal de tablones');
  // Old world layout uses the hinge at -1.10, 0, .12; this is a noninteractive closed facade.
  door.setLocalPosition(-1.10,0,.12);
  for(let i=0;i<5;i++){
   const x=(i-2)*.265;
   component(pc,door,'Tablón '+(i+1),'box',[x,1.11,0],[.268,2.22,.11],i%2?grain:wood);
  }
  for(const y of [.35,1.75]){
   component(pc,door,'Pletina de herrería','box',[0,y,.071],[1.39,.075,.029],iron);
  }
  component(pc,door,'Picaporte de hierro','box',[.45,1.05,.145],[.13,.10,.09],iron);
  parent.addChild(door);
  return door;
 }
 function inscription(pc,app,root,name,kind,x,z,yaw){
  const cnv=document.createElement('canvas');cnv.width=512;cnv.height=160;
  const ctx=cnv.getContext('2d');
  ctx.fillStyle='#241b13';ctx.fillRect(0,0,512,160);
  ctx.strokeStyle='#9f7745';ctx.lineWidth=14;ctx.strokeRect(10,10,492,140);
  ctx.fillStyle='#dec89b';ctx.font='bold 46px Georgia';ctx.textAlign='center';
  ctx.fillText(name,256,79);
  ctx.font='25px Georgia';ctx.fillStyle='#b3a588';ctx.fillText(kind,256,123);
  const tx=new pc.Texture(app.graphicsDevice,{name:name+' cartel de madera',srgb:true,mipmaps:true});
  tx.setSource(cnv);
  const board=material(pc,name+' · letrero',[1,1,1],0,.07);
  board.diffuseMap=tx;board.emissive=new pc.Color(.04,.035,.028);board.update();
  const anchor=new pc.Entity(name+' · letrero temporal');
  anchor.setLocalPosition(x,0,z);anchor.setLocalEulerAngles(0,yaw,0);
  component(pc,anchor,'Soporte de madera','box',[0,2.78,0],[2.65,.87,.13],board,{shadow:false});
  root.addChild(anchor);return anchor;
 }
 function animateArcaneDoor(pc,app,parent,visual,mobile){
  // Keep the V027 PBR textures and geometry; animate its original emissive masks
  // and two upward travelling light accents as in village_arcanist.js.
  const copies=new Map(),textures=[],lights=[];
  const maskEdge=mobile?256:384;
  for(const renderer of visual.findComponents('render')){
   for(const mi of renderer.meshInstances||[]){
    const original=mi.material;
    if(!original?.emissiveMap)continue;
    let m=copies.get(original);
    if(!m){
      m=original.clone();
      m.emissive=new pc.Color(.18,.62,1);
      m.emissiveIntensity=5.2;
      try{
       const src=original.emissiveMap.getSource?.();
       const canvas=document.createElement('canvas');canvas.width=canvas.height=maskEdge;
       const ctx=canvas.getContext('2d',{willReadFrequently:true});
       if(!src||!ctx)throw Error('V027 masks unavailable');
       ctx.drawImage(src,0,0,maskEdge,maskEdge);
       const base=ctx.getImageData(0,0,maskEdge,maskEdge);
       const current=ctx.createImageData(maskEdge,maskEdge);
       const texture=new pc.Texture(app.graphicsDevice,{name:'V027 · emisión animada intacta',srgb:true,mipmaps:false,minFilter:pc.FILTER_LINEAR,magFilter:pc.FILTER_LINEAR});
       texture.setSource(canvas);m.emissiveMap=texture;
       textures.push({ctx,base:base.data,current,texture,phase:textures.length*.37});
      }catch(err){console.warn('V017 portal V027 · pulso alternativo',String(err))}
      m.update();copies.set(original,m);
    }
    mi.material=m;
   }
  }
  const fill=new pc.Entity('Arcanista · luz frontal mineral suave V027');
  fill.addComponent('light',{type:'omni',color:new pc.Color(.76,.83,1),range:3.4,intensity:mobile?1.05:1.3,castShadows:false});
  fill.setLocalPosition(0,1.38,.91);parent.addChild(fill);
  for(const x of [-.20,.23]){
   const beam=new pc.Entity('Arcanista · corriente luminosa ascendiente');
   beam.addComponent('light',{type:'omni',color:new pc.Color(.18,.62,1),range:1.8,intensity:1,castShadows:false});
   beam.setLocalPosition(x,.25,.45);parent.addChild(beam);lights.push(beam);
  }
  let elapsed=0,acc=0,visibleActive=false;
  const camera=app.root.findByName('Camara');
  const update=dt=>{
   if(!parent.enabled||!visual.enabled)return;
   // No CPU pixel recomputation/GPU texture upload for a portal outside the
   // useful viewing distance. The original material remains static and intact.
   const eye=camera?.getPosition(),doorPos=parent.getPosition();
   const near=!eye||Math.hypot(eye.x-doorPos.x,eye.z-doorPos.z)<19;
   if(visibleActive!==near){visibleActive=near;for(const light of lights)light.enabled=near}
   if(!near)return;
   elapsed+=Math.min(.12,Math.max(0,dt||0));acc+=dt||0;
   const rise=((elapsed*.74)%3.08)-.35;
   lights.forEach((light,i)=>{
    const y=Math.max(.12,Math.min(2.3,rise-i*.3));
    light.setLocalPosition(i===0?-.2:.23,y,.43);
    light.light.intensity=(i===0?1.3:.75)*(.72+.28*Math.sin(elapsed*2.1+i));
   });
   for(const [i,m] of [...copies.values()].entries()){
    m.emissiveIntensity=5.2*(.92+.08*Math.sin(elapsed*3.1+i*.8));
    m.update();
   }
   if(acc<(mobile?1/6:1/9))return;acc=0;
   for(const item of textures){
    const {ctx,base,current,texture,phase}=item,data=current.data,size=maskEdge;
    for(let y=0;y<size;y++){
     const meter=(1-y/(size-1))*2.32;
     for(let x=0;x<size;x++){
      const d=.15*Math.sin(x*.049+y*.017)+.10*Math.cos(x*.019-y*.031);
      const crest=Math.exp(-13.5*(meter-rise+d)**2);
      const follower=Math.exp(-17*(meter-rise+.30+phase*.03+d)**2);
      const amount=.28+2.65*(crest+.55*follower);
      const a=(y*size+x)*4;
      data[a]=Math.min(255,base[a]*amount);
      data[a+1]=Math.min(255,base[a+1]*amount);
      data[a+2]=Math.min(255,base[a+2]*amount);
      data[a+3]=base[a+3];
     }
    }
    try{ctx.putImageData(current,0,0);texture.upload()}catch(err){console.warn('V027 texture animation',err)}
   }
  };
  app.on('update',update);
  return {textureMasks:textures.length,lightSources:lights.length+1,stop:()=>app.off('update',update)};
 }
 function install(app,resources,plan,options={}){
  const pc=globalThis.pc;
  if(!pc?.Entity||!app?.root||!resources?.get||plan?.workshops?.length!==5)throw Error('V017 village needs 5 planned workshops and local loaded GLB assets');
  const root=new pc.Entity('Project Genesis V017 · aldeia cinco talleres');
  const buildings=[],approved=[],generic=[];
  const gate=options.getStep||(()=>0);
  const animations=[];
  let doorHinge=null,doorAngle=0;
  try{
   // Keep the entire village beneath one root; it is never visible until
   // the 32-bit HDR atlas, PBR floors, and all GLBs have settled.
   app.root.addChild(root);
   for(const p of plan.workshops){
    const building=new pc.Entity(p.profession+' · fachada V017');
    building.setLocalPosition(p.x,0,p.z);
    building.setLocalEulerAngles(0,p.yaw,0);
    building.setLocalScale(plan.workshopScale,1,plan.workshopScale);
    root.addChild(building);
    const approvedChoice=NAMES[p.profession];
    const wallsId=approvedChoice?.walls||'wall-herrero-v082';
    const shell=new pc.Entity('Mampostería real PBR · '+p.profession);
    shell.setLocalScale(HORIZONTAL,1,HORIZONTAL);
    building.addChild(shell);
    addModel(resources,shell,wallsId,'Cuatro paredes completas · '+p.profession);
    if(approvedChoice)approved.push(p.profession);
    else generic.push(p.profession);
    // Reuse original roofing mesh and its pivot/rise from Herrero V013.
    const rooftop=new pc.Entity('Cubierta V013 · '+p.profession);
    rooftop.setLocalScale(HORIZONTAL,1,HORIZONTAL);
    building.addChild(rooftop);
    const roof=addModel(resources,rooftop,'roof-herrero-v013','Techo real PBR · '+p.profession,
       [0,-3.2*(ROOF_BOOST-1),0],[1,ROOF_BOOST,1]);
    if(p.profession==='Herrero')addModel(resources,rooftop,'chimney-herrero-v013','Chimenea conectada · Herrero',
        [0,-3.2*(ROOF_BOOST-1),0],[1,ROOF_BOOST,1]);
    if(p.profession==='Herrero'){
      const hinge=new pc.Entity('Herrero · bisagra izquierda original');
      hinge.setLocalPosition(-1.10,0,.12);
      building.addChild(hinge);
      const door=addModel(resources,hinge,'door-herrero-v082-b','Herrero V082-B · hierro aprobado');
      doorHinge=hinge;
    }else if(p.profession==='Arcanista'){
      const pivot=new pc.Entity('Arcanista · puerta mágica V027 · cerrada');
      pivot.setLocalPosition(0,0,.12);
      building.addChild(pivot);
      if(resources.has('door-arcanista-v027')){
        const visual=addModel(resources,pivot,'door-arcanista-v027','Arcanista V027 · litología aprobada');
        animations.push(animateArcaneDoor(pc,app,pivot,visual,false));
      }else{
        // Existing V027 mobile rule: prevent 191-renderer GPU bottlenecks.
        // A stable generic door is shown instead of an invisible hole.
        genericWoodDoor(pc,building,p.profession);
      }
    }else{
      genericWoodDoor(pc,building,p.profession);
      inscription(pc,app,root,p.label,'Fachada provisional',p.x,p.z,p.yaw);
    }
    buildings.push({profession:p.profession,entity:building,wallsId,doorKind:approvedChoice?
      (p.profession==='Arcanista'&&!resources.has('door-arcanista-v027')?'generic-mobile-fallback':'approved'):
      'generic-temporary',roofId:'roof-herrero-v013'});
   }
   if(!doorHinge)throw Error('V017 Herrero hinge not built');
   const tick=dt=>{
     const desired=gate()>=2?-92:0; // preserve Ordan door quest semantics
     doorAngle+=(desired-doorAngle)*Math.min(1,Math.max(0,dt)*7);
     doorHinge.setLocalEulerAngles(0,doorAngle,0);
   };
   app.on('update',tick);
   animations.push({stop:()=>app.off('update',tick)});
   const status={
     installed:true,version:'V017',count:buildings.length,
     approval:{Herrero:'walls V082 / door V082-B',Arcanista:'walls V006 / door V027'},
     approved,generic,
     buildings:buildings.map(b=>({
       profession:b.profession,x:b.entity.getPosition().x,z:b.entity.getPosition().z,
       walls:b.wallsId,door:b.doorKind,roof:b.roofId,
       renderers:b.entity.findComponents('render').length
     })),
     hdr32:!!app.scene.envAtlas,
     map:'GenesisVillagePlan / original workshop coordinates',
     get doorAngle(){return doorAngle}
   };
   if(status.count!==5||status.buildings.some(b=>b.renderers<4)||!status.hdr32)throw Error('V017 incomplete workshop scene assembly');
   globalThis.__GENESIS_V017_VILLAGE__=status;
   return Object.freeze({root,status,dispose(){for(const a of animations)a.stop();root.destroy()}});
  }catch(error){for(const a of animations)a.stop();root.destroy();throw error}
 }
 return Object.freeze({install});
});
