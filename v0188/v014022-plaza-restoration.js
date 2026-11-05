/* V0188 · Restoration of the exact original V0.14.022 plaza and perimeter.
 * Original geometry/positions and materials belong to the V014.022 implementation.
 * Reuses the working V0187 byte-progress loader; no new network fetch during play.
 */
(function(root){
'use strict';
const pc=root.pc;
if(!pc?.Entity)throw Error('V0188 requires the existing PlayCanvas engine');
const {Entity,Vec3,SHADERLANGUAGE_GLSL}=pc;

const TYPES = Object.freeze({
 oak: { label: 'Roble', height: 9.1, master: 'assets/plaza_trees_v017/oak/oak_easytree_v017.glb' },
 ash: { label: 'Fresno', height: 9.7, master: 'assets/plaza_trees_v020/ash/ash_easytree_v020.glb' },
 linden: { label: 'Tilo', height: 8.7, master: 'assets/plaza_trees_v022/linden/linden_easytree_v022.glb' },
 maple: { label: 'Arce rojizo', height: 8.5, master: 'assets/plaza_trees_v021/maple/maple_easytree_v021.glb' }
});
// The square is deliberately one of each approved species. The other ten use a
// seeded shuffle: varied but stable across sessions so positions and collisions
// don't jump around on every page load.
const EXTERIOR_SPOTS = [
 [-19,-8,'sur'],[25,-8,'sur'],[-21,1,'oeste'],[-21,26,'oeste'],
 [-12,45,'norte'],[-3,45,'norte'],[35,44,'norte'],
 [22,6,'sur'],[-8,23,'oeste'],[19,24,'este']
];
function exteriorSpecies() {
 const pool=['oak','oak','ash','ash','ash','linden','linden','maple','maple','maple'];
 let seed=0x6a53c21d;
 for(let i=pool.length-1;i>0;i--){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const j=seed%(i+1);
  [pool[i],pool[j]]=[pool[j],pool[i]];
 }
 return pool;
}
const EXTERIOR_SPECIES=exteriorSpecies();
const RAW_SITES = [
 // Shift southwest oak away from the fountain's light path, preserving trunk collision and shadows.
 ['oak',0.4,10.7,'plaza'],['maple',11.8,11.7,'plaza'],
 ['linden',2.2,20.3,'plaza'],['ash',11.8,20.3,'plaza'],
 ...EXTERIOR_SPOTS.map(([x,z,region],i)=>[EXTERIOR_SPECIES[i],x,z,region])
];
const TREE_SITES = Object.freeze(RAW_SITES.map((item,index)=>Object.freeze({
 id: index+1, species: item[0], x:item[1], z:item[2], region:item[3],
 rotation: (index*137.508)%360, size: 0.90+((index*7)%9)*0.025,
 trunkRadius: 0.43 // safe fallback only; actual collision is derived from bark geometry
})));
// Applied only to the transparent botanical leaf cards. Bark, trunk and lower
// branches keep their original transforms. Shader motion costs no JS per leaf.
const WIND_TRANSFORM_VS=`
uniform float uGenesisWindTime;
uniform float uGenesisWindAmp;
uniform float uGenesisWindPhase;
vec4 evalWorldPosition(vec3 vertexPosition, mat4 modelMatrix) {
 vec3 localPos=getLocalPosition(vertexPosition);
 float t=uGenesisWindTime+uGenesisWindPhase;
 float height=smoothstep(1.1,4.8,localPos.y);
 float flutter=sin(t*1.45+localPos.x*1.31+localPos.z*.86);
 localPos.x+=height*uGenesisWindAmp*(flutter+.25*sin(t*.72+localPos.y*1.6));
 localPos.z+=height*uGenesisWindAmp*.62*sin(t*1.13+localPos.z*1.1-localPos.x*.77);
 return modelMatrix*vec4(localPos,1.0);
}
vec4 getPosition() {
 dModelMatrix=getModelMatrix();
 vec4 posW=evalWorldPosition(vertex_position.xyz,dModelMatrix);
 dPositionW=posW.xyz;
 return matrix_viewProjection*posW;
}
vec3 getWorldPosition(){return dPositionW;}
`;
function classifyAndTune(prototype,mobile,windMaterials) {
 const copies=new Map();
 const stack=[prototype];
 let bark=0,leaves=0;
 while(stack.length){
  const e=stack.pop();
  for(const child of e.children)stack.push(child);
  for(const mi of e.render?.meshInstances||[]){
   const src=mi.material;
   if(!src?.clone)continue;
   let m=copies.get(src);
   if(!m){
    const label=(src.name||'')+' '+(e.name||'');
    // GLB import assigns opacity maps even to opaque Bark materials.
    // Match the actual botanical material names / alpha cutoff, not opacityMap.
    const barkName=/bark|wood|trunk|corteza|twig|branch/i.test(label);
    const leaf=!barkName&&(/leaf|leaves|foliage|hoja|crown|canopy/i.test(label)
      || (src.alphaTest||0)>0.01);
    m=src.clone();
    if(leaf){
     m.getShaderChunks?.(SHADERLANGUAGE_GLSL)?.set?.('transformVS',WIND_TRANSFORM_VS);
     m.setParameter('uGenesisWindAmp',mobile?.040:.061);
     m.setParameter('uGenesisWindTime',0);
     m.setParameter('uGenesisWindPhase',0);
     windMaterials.add(m);leaves++;
    }else{
     // White sky bounce was washing brown trunks into gray. Keep the real
     // photographic albedo and normals; remove cool specular overexposure.
     const c=m.diffuse;
     if(c)c.set(c.r*.84,c.g*.70,c.b*.59);
     m.gloss=Math.min(m.gloss??.15,.12);
     if(m.specular)m.specular.set(.12,.095,.078);
     if(m.useMetalness)m.metalness=0;
     bark++;
    }
    m.update();copies.set(src,m);
   }
   mi.material=m;
  }
 }
 return {bark,leaves};
}


function boundsOf(entity){
 const stack=[entity];let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
 entity.syncHierarchy();
 while(stack.length){
  const node=stack.pop();
  for(const child of node.children)stack.push(child);
  const instances=node.render?.meshInstances || [];
  for(const mi of instances){
   const box=mi.aabb,center=box?.center,half=box?.halfExtents;
   if(!center||!half)continue;
   minX=Math.min(minX,center.x-half.x);minY=Math.min(minY,center.y-half.y);minZ=Math.min(minZ,center.z-half.z);
   maxX=Math.max(maxX,center.x+half.x);maxY=Math.max(maxY,center.y+half.y);maxZ=Math.max(maxZ,center.z+half.z);
  }
 }
 if(!Number.isFinite(minY)||maxY-minY<0.001)return {minX:0,minY:0,minZ:0,maxX:0,maxY:1,maxZ:0};
 return {minX,minY,minZ,maxX,maxY,maxZ};
}
// The GLB's bounding box is dominated by its off-center crown. Collision
// must come from the real bark at pedestrian height, not from the leaf canopy
// center or from a species-independent nominal radius.
function measureTrunk(prototype) {
 const points=[],local=new Vec3(),world=new Vec3();
 let minY=Infinity;
 const stack=[prototype];
 while(stack.length){
  const e=stack.pop();
  for(const child of e.children)stack.push(child);
  for(const mi of e.render?.meshInstances||[]){
   if(!/bark|trunk|wood|corteza/i.test(mi.material?.name||'') )continue;
   const positions=[];
   let count=0;
   try{count=mi.mesh?.getPositions(positions)||0;}catch(error){console.warn('Genesis trunk: cannot sample bark',error);continue;}
   const matrix=mi.node.getWorldTransform();
   for(let i=0;i<count;i++){
    local.set(positions[3*i],positions[3*i+1],positions[3*i+2]);
    matrix.transformPoint(local,world);
    if(!Number.isFinite(world.x+world.y+world.z))continue;
    points.push([world.x,world.y,world.z]);
    if(world.y<minY)minY=world.y;
   }
  }
 }
 if(!points.length||!Number.isFinite(minY))return null;
 const band=points.filter(p=>p[1]>=minY-.001 && p[1]<=minY+1.1);
 if(band.length<10)return null;
 const sortedX=band.map(p=>p[0]).sort((a,b)=>a-b);
 const sortedZ=band.map(p=>p[2]).sort((a,b)=>a-b);
 const cx=sortedX[Math.floor(sortedX.length*.5)];
 const cz=sortedZ[Math.floor(sortedZ.length*.5)];
 const radii=band.map(p=>Math.hypot(p[0]-cx,p[2]-cz)).sort((a,b)=>a-b);
 return {x:cx,z:cz,radius:Math.max(.1,radii[Math.floor(radii.length*.98)])};
}


const CENTER={x:7,z:16},STALL={x:28.35,y:0,z:37.6};
const TREE_VARIANTS=['oak','ash','linden','maple'];
function mountTrees(app,root,resources,focus){
 const mobile=matchMedia('(pointer:coarse)').matches;
 const treeRoot=new Entity('Vegetación aprobada original V014022 — 14 árboles PBR');
 root.addChild(treeRoot);
 const nodes=TREE_SITES.map(site=>{
   const anchor=new Entity('Árbol '+site.id+' · '+TYPES[site.species].label+' · '+site.region);
   anchor.setLocalPosition(site.x,0,site.z);
   anchor.setLocalEulerAngles(0,site.rotation,0);
   treeRoot.addChild(anchor);
   return {site,anchor,visual:null,lod:null,visible:false,collider:null};
 });
 const variants=new Map(),windMaterials=new Set(),originalMaterials=[];
 for(const species of TREE_VARIANTS){
   for(const lod of (mobile?[2]:[1,2])){
     const id='plaza-tree-'+species+'-lod'+lod;
     const asset=resources.get(id);
     if(!asset?.resource)throw Error('Missing approved V014022 tree: '+id);
     const proto=asset.resource.instantiateRenderEntity();
     const dims=boundsOf(proto);
     const trunk=measureTrunk(proto);
     const classified=classifyAndTune(proto,mobile,windMaterials);
     variants.set(species+':'+lod,{prototype:proto,dims,trunk,classified});
   }
 }
 function install(node,lod){
   if(node.lod===lod)return;
   const variant=variants.get(node.site.species+':'+lod);
   if(!variant)throw Error('Missing LOD '+node.site.species+' '+lod);
   const {prototype,dims,trunk}=variant,visual=prototype.clone();
   const intended=TYPES[node.site.species].height*node.site.size*(node.site.region==='plaza'?.86:1);
   const scale=intended/Math.max(.01,dims.maxY-dims.minY);
   visual.setLocalScale(scale,scale,scale);
   visual.setLocalPosition(-(dims.minX+dims.maxX)*.5*scale,-dims.minY*scale,-(dims.minZ+dims.maxZ)*.5*scale);
   node.anchor.addChild(visual);
   node.visual?.destroy();
   node.visual=visual;node.lod=lod;
   if(trunk){
      const point=visual.getWorldTransform().transformPoint(new Vec3(trunk.x,0,trunk.z));
      node.collider={x:point.x,z:point.z,r:Math.max(.3,trunk.radius*scale+.04),measured:true};
   }else node.collider={x:node.site.x,z:node.site.z,r:Math.max(.5,node.site.trunkRadius),measured:false};
   for(const r of visual.findComponents('render')){
     r.castShadows=!mobile&&lod<2;
     for(const mi of r.meshInstances||[])if(windMaterials.has(mi.material))
       mi.setParameter('uGenesisWindPhase',(node.site.id*1.71)%(Math.PI*2));
   }
 }
 let lastUpdate=-Infinity,windTime=0,windAccumulator=0,visible=0;
 function update(x=focus.x,z=focus.z,force=false){
   const now=performance.now();
   if(!force&&now-lastUpdate<450)return;
   lastUpdate=now;visible=0;
   for(const node of nodes){
     const distance=Math.hypot(node.site.x-x,node.site.z-z);
     node.visible=distance<(mobile?37:56);
     node.anchor.enabled=node.visible;
     if(!node.visible)continue;
     install(node,mobile?2:distance<23?1:2);
     visible++;
   }
 }
 function tick(dt){
   if(focus?.getPosition){const p=focus.getPosition();update(p.x,p.z)}
   windTime+=Math.min(.07,Math.max(0,dt||0));windAccumulator+=dt||0;
   if(windAccumulator>=(mobile?1/15:1/30)){
     windAccumulator=0;
     for(const m of windMaterials)m.setParameter('uGenesisWindTime',windTime);
   }
 }
 // Original world initialized LOD relative to (0,0); same behavior.
 update(0,0,true);
 app.on('update',tick);
 return {nodes,update,dispose:()=>{app.off('update',tick);treeRoot.destroy();for(const v of variants.values())v.prototype.destroy()},
  status:()=>({planned:nodes.length,plaza:nodes.filter(n=>n.site.region==='plaza').length,loaded:variants.size,visible,windEnabled:windMaterials.size>0,sites:nodes.map(n=>({id:n.site.id,species:n.site.species,x:n.site.x,z:n.site.z,region:n.site.region,lod:n.lod,visible:n.visible}))}),
  blocked:(x,z,r=.33)=>nodes.some(n=>n.visible&&n.collider&&Math.hypot(n.collider.x-x,n.collider.z-z)<n.collider.r+r)};
}
function mat(name,r,g,b,gloss=.14){
 const m=new pc.StandardMaterial();m.name=name;m.diffuse=new pc.Color(r,g,b);m.gloss=gloss;m.useMetalness=false;m.update();return m;
}
function box(parent,name,x,y,z,w,h,d,material,cast=true){
 const e=new Entity(name);e.addComponent('render',{type:'box',material,castShadows:cast,receiveShadows:true});
 e.setLocalPosition(x,y,z);e.setLocalScale(w,h,d);parent.addChild(e);return e;
}
function stall(root){
 // Identical proportions/materials and exact position of V014.022 genesis_market_v001.js.
 const wood=mat('Puesto de mercado - roble usado',.26,.16,.09);
 const edge=mat('Puesto - herrajes envejecidos',.26,.25,.22,.28);
 const flax=mat('Puesto - toldo lino crudo',.60,.52,.38);
 const ochre=mat('Puesto - franjas ocres',.47,.28,.14);
 const crate=mat('Puesto - cajas de transporte',.39,.26,.14);
 const stock=mat('Puesto - sacos con mineral',.24,.22,.18);
 const e=new Entity('Mercado · puesto de suministros provisional');
 root.addChild(e);e.setPosition(STALL.x,STALL.y,STALL.z);
 box(e,'Mesa madera maciza',0,1.02,0,2.35,.17,1.26,wood);
 for(const x of [-.98,.98])for(const z of [-.43,.43]){
  box(e,'Pata estructural',x,.52,z,.13,1.04,.13,wood);
  box(e,'Poste vertical toldo',x,1.82,z,.10,1.75,.10,wood);
 }
 box(e,'Toldo de lona cruda',0,2.72,0,2.84,.13,1.77,flax,false);
 for(const x of [-1.15,-.46,.23,.92])box(e,'Cinta textil ocre',x,2.795,0,.26,.015,1.68,ochre,false);
 box(e,'Frente madera',0,.86,-.61,2.35,.34,.06,wood);
 box(e,'Herraje frontal',0,.95,-.648,2.15,.035,.014,edge);
 for(const [x,z] of [[-.82,-.18],[.18,.18],[.77,-.08]]){
  box(e,'Caja de materiales del mercado',x,1.24,z,.56,.30,.45,crate);
  box(e,'Saco con material sin etiqueta',x,1.42,z,.40,.13,.30,stock,false);
 }
 box(e,'Cajon inferior',-1.10,.31,.63,.72,.62,.58,crate);
 return e;
}
function textMaterial(app,title,subtitle){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;
 const c=canvas.getContext('2d');c.fillStyle='#211b14';c.fillRect(0,0,768,192);
 c.strokeStyle='#b9985c';c.lineWidth=10;c.strokeRect(10,10,748,172);
 c.textAlign='center';c.fillStyle='#f6deb1';c.font='bold 55px Georgia,serif';c.fillText(title,384,85);
 c.fillStyle='#c6b99f';c.font='27px Georgia,serif';c.fillText(subtitle,384,143);
 const texture=new pc.Texture(app.graphicsDevice,{name:title,mipmaps:true});texture.setSource(canvas);
 const m=mat(title,1,1,1);m.diffuseMap=texture;m.emissiveMap=texture;m.emissive=new pc.Color(.2,.2,.2);m.update();return m;
}
function sign(app,parent,title,subtitle,x,z,yaw,height=2.9,width=3.8){
 const signRoot=new Entity(title+' cartel');parent.addChild(signRoot);
 signRoot.setPosition(x,0,z);signRoot.setEulerAngles(0,yaw,0);
 // Original V014022 used a plane (not an improvised thick box).
 const e=new Entity(title);
 e.addComponent('render',{type:'plane',material:textMaterial(app,title,subtitle),castShadows:false,receiveShadows:true});
 e.setLocalPosition(0,height,.30);e.setLocalScale(width,1,.95);
 e.setLocalEulerAngles(90,0,0);signRoot.addChild(e);
 return signRoot;
}
function water(app,visual){
 const copied=new Map(),entries=[];
 for(const renderer of visual.findComponents('render')){
   for(const mi of renderer.meshInstances||[]){
     const src=mi.material,n=src?.name||'';
     if(!n.startsWith('AGUA_')||(!n.includes('Estanque')&&!n.includes('Fisica')))continue;
     let entry=copied.get(src);
     if(!entry){
       const m=src.clone(),pool=n.includes('Estanque');
       m.name=n+'_v011_hq_deepwater';
       m.diffuseMap=null;m.diffuse.set(pool?.048:.105,pool?.16:.32,pool?.20:.39);
       m.useMetalness=false;m.metalness=0;
       if('useRefraction' in m)m.useRefraction=false;
       if('refraction' in m)m.refraction=0;
       if('transmission' in m)m.transmission=0;
       m.gloss=pool?.77:.69;m.specular.set(.32,.37,.39);
       m.opacity=pool?.94:.87;
       m.emissiveMap=null;m.emissive.set(.006,.019,.022);
       const hasNormals=!!m.normalMap;
       if(hasNormals){
         m.normalMapTiling.set(pool?3.1:2.5,pool?3.1:2.5);
         m.normalDetailMap=m.normalMap;
         m.normalDetailMapTiling.set(pool?5.3:3.3,pool?5.3:3.3);
       }
       m.update();entry={mat:m,pool,hasNormals};
       entries.push(entry);copied.set(src,entry);
     }
     mi.material=entry.mat;
   }
 }
 let t=0,acc=0;
 const tick=dt=>{
   t=(t+Math.max(0,dt))%8;acc+=Math.max(0,dt);
   if(acc<1/30)return;acc=0;
   for(const {mat:m,pool,hasNormals} of entries){
     if(!hasNormals)continue;
     m.normalMapOffset.set(pool?t*.125:0,pool?-t*.125:t*.25);
     m.normalDetailMapOffset.set(pool?-t*.1875:t*.125,pool?t*.125:-t*.125);
     m.update();
   }
 };
 if(entries.length)app.on('update',tick);
 return {count:entries.length,dispose:()=>app.off('update',tick)};
}
function fountain(app,root,resources){
 const asset=resources.get('plaza-fountain-v011');
 if(!asset?.resource)throw Error('Missing approved original fountain V011 HQ');
 const visual=asset.resource.instantiateRenderEntity();
 if(!visual.findComponents('render').length)throw Error('Original fountain has no meshes');
 visual.name='Genesis plaza dolphin fountain V011 HQ';
 visual.setPosition(CENTER.x,0,CENTER.z);
 root.addChild(visual);
 const ripples=water(app,visual);
 const tracks=asset.resource.animations||[];
 let animated=false;
 try{
   const track=tracks[0]?.resource||tracks[0];
   if(track&&pc.AnimComponent){
     visual.addComponent('anim',{activate:true});
     visual.anim.assignAnimation('Fountain 8s',track);
     visual.anim.baseLayer.play('Fountain 8s');
     animated=true;
   }
 }catch(error){console.warn('V0188 original fountain animation unavailable',String(error));}
 return {visual,water:ripples,renderers:visual.findComponents('render').length,animated,tracks:tracks.length};
}
function install(app,resources,plan,{player}={}){
 const p=plan||root.GenesisVillagePlan;
 if(!p||p.roads?.length!==9||p.plaza?.x!==7||p.plaza?.z!==16||p.plaza?.w!==13||p.plaza?.d!==13)throw Error('V014022 exact plaza plan mismatch');
 const r=new Entity('Plaza V014.022 original · restablecida en V0188');
 app.root.addChild(r);
 try{
   const trees=mountTrees(app,r,resources,player||{x:7,z:16});
   const waterworks=fountain(app,r,resources);
   const marketStall=stall(r);
   const market=p.market;
   const marketSign={x:market.x-market.w/2+1,z:market.z-market.d/2+1};
   sign(app,r,'MERCADO','Área reservada · puestos pendientes',marketSign.x,marketSign.z,-90,2.1,5);
   const marker=mat('Referencia mercado',.55,.42,.22);
   box(r,'Poste cartel mercado',marketSign.x,.8,marketSign.z,.18,1.6,.18,marker);
   const plazaSign={x:p.plaza.x-p.plaza.w/2-1,z:p.plaza.z-p.plaza.d/2};
   sign(app,r,'PLAZA CENTRAL','Aldea de los artesanos',plazaSign.x,plazaSign.z,0,1.9,4.4);
   box(r,'Poste cartel plaza',plazaSign.x,.65,plazaSign.z,.14,1.3,.14,marker);
   // V014022 slight sky bounce, no HDRI replacement.
   const bounce=new Entity('Rebote celeste cálido · sin sombras');
   bounce.addComponent('light',{type:'directional',color:new pc.Color(.84,.79,.73),intensity:.43,castShadows:false});
   bounce.setLocalEulerAngles(28,145,0);r.addChild(bounce);
   const report=Object.freeze({
     version:'V018.8',source:'V014.022 originals',center:[7,16],floorSource:'V012 identical PBR cobble and traffic',
     fountainPosition:[CENTER.x,0,CENTER.z],fountainRenderers:waterworks.renderers,
     fountainAnimation:waterworks.animated,fountainTracks:waterworks.tracks,waterMaterials:waterworks.water.count,
     stallPosition:[STALL.x,STALL.y,STALL.z],marketSign:[marketSign.x,0,marketSign.z],plazaSign:[plazaSign.x,0,plazaSign.z],
     get trees(){return trees.status()},get positions(){return trees.status().sites},
     get installed(){return r.enabled},get renderers(){return r.findComponents('render').length},
     get layoutMatchesOriginal(){return trees.nodes.length===14&&trees.nodes.filter(n=>n.site.region==='plaza').length===4&&p.roads.length===9}
   });
   root.__GENESIS_V0188_PLAZA__=report;
   return {root:r,report,trees,waterworks,stall:marketStall,
     dispose(){trees.dispose();waterworks.water.dispose();r.destroy()}};
 }catch(error){r.destroy();throw error}
}
root.GenesisOriginalPlazaV0188=Object.freeze({install,TREE_SITES});
})(typeof globalThis!=='undefined'?globalThis:this);
