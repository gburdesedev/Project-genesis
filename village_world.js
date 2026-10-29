import {Entity,StandardMaterial,Texture,Color,ADDRESS_REPEAT,BLEND_NORMAL,FILTER_LINEAR,FILTER_LINEAR_MIPMAP_LINEAR} from 'playcanvas';
import {mountVillageTrees} from './village_trees.js?v=0.11.017';
import {mountArcanePortal} from './village_arcanist.js?v=0.11.017';
const ROOT='./assets/world/v0.11.004/';
const MOBILE_TEXTURE_EDGE=1024;
// Decode one full-resolution source at a time on touch devices, then keep only
// a small PBR texture in GPU memory. Desktop retains the approved 4K originals.
async function loadTexture(app,name,mobile=false,onResourceLoaded=()=>{}){
 const image=new Image();image.decoding='async';image.src=ROOT+name;await image.decode();
 let source=image;
 if(mobile&&Math.max(image.naturalWidth,image.naturalHeight)>MOBILE_TEXTURE_EDGE){
  const factor=MOBILE_TEXTURE_EDGE/Math.max(image.naturalWidth,image.naturalHeight);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*factor));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*factor));
  const context=canvas.getContext('2d',{alpha:false});
  if(context){context.drawImage(image,0,0,canvas.width,canvas.height);source=canvas}
 }
 const texture=new Texture(app.graphicsDevice,{name,srgb:name.endsWith('_color.png'),mipmaps:true,minFilter:FILTER_LINEAR_MIPMAP_LINEAR,magFilter:FILTER_LINEAR,addressU:ADDRESS_REPEAT,addressV:ADDRESS_REPEAT});
 texture.setSource(source);
 onResourceLoaded(name);
 if(source!==image)image.src='';
 return texture;
}
async function maps(app,name,mobile=false,onResourceLoaded=()=>{}){
 const keys=['color','normal','gloss','ao'],values=[];
 if(mobile){for(const key of keys)values.push(await loadTexture(app,`${name}_${key}.png`,true,onResourceLoaded))}
 else values.push(...await Promise.all(keys.map(key=>loadTexture(app,`${name}_${key}.png`,false,onResourceLoaded))));
 return Object.fromEntries(keys.map((key,i)=>[key,values[i]]));
}
function material(name,color){const m=new StandardMaterial();m.name=name;m.diffuse=new Color(...color);m.gloss=.15;m.update();return m}
function pavedMaterial(name,maps,w,d,meters=2){
 const m=material(name,[1,1,1]);m.diffuseMap=maps.color;m.normalMap=maps.normal;m.bumpiness=.75;m.glossMap=maps.gloss;m.glossMapChannel='r';m.gloss=1;m.aoMap=maps.ao;m.aoMapUv=0;
 for(const type of ['diffuse','normal','gloss','ao'])m[`${type}MapTiling`].set(w/meters,d/meters);
 m.update();return m;
}
function mesh(parent,name,type,x,y,z,w,h,d,m,shadows=false){const e=new Entity(name);e.addComponent('render',{type,material:m,castShadows:shadows,receiveShadows:true});e.setLocalPosition(x,y,z);e.setLocalScale(w,h,d);parent.addChild(e);return e}
function edgeMask(app){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const context=canvas.getContext('2d'),image=context.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){const u=x/127,v=y/127,jitter=.012*Math.sin(v*71)+.008*Math.cos(v*127);const edge=Math.min(u+jitter,1-u-jitter)/.075,end=Math.min(v,1-v)/.035,a=Math.max(0,Math.min(1,edge,end));const i=(y*128+x)*4;image.data.set([255,255,255,Math.round(a*255)],i)}
 context.putImageData(image,0,0);const t=new Texture(app.graphicsDevice,{name:'Road softened edge',mipmaps:false,minFilter:FILTER_LINEAR,magFilter:FILTER_LINEAR});t.setSource(canvas);return t;
}
function textMaterial(app,title,subtitle){
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const c=canvas.getContext('2d');c.fillStyle='#211b14';c.fillRect(0,0,768,192);c.strokeStyle='#b9985c';c.lineWidth=10;c.strokeRect(10,10,748,172);c.textAlign='center';c.fillStyle='#f6deb1';c.font='bold 55px Georgia';c.fillText(title,384,85);c.fillStyle='#c6b99f';c.font='27px Georgia';c.fillText(subtitle,384,143);
 const texture=new Texture(app.graphicsDevice,{name:title,mipmaps:true});texture.setSource(canvas);const m=material(title,[1,1,1]);m.diffuseMap=texture;m.emissiveMap=texture;m.emissive=new Color(.2,.2,.2);m.update();return m;
}
function sign(app,parent,title,subtitle,x,z,yaw,height=2.9,width=3.8){const root=new Entity(title+' cartel');parent.addChild(root);root.setPosition(x,0,z);root.setEulerAngles(0,yaw,0);const e=mesh(root,title,'plane',0,height,.30,width,1,.95,textMaterial(app,title,subtitle));e.setLocalEulerAngles(90,0,0);return root}
function tintArcaneFacade(shell){
 // Reuse the approved workshop PBR maps. Only the Arcanist façade receives a
 // subdued mineral tint; every other workshop keeps its original materials.
 const copies=new Map(),stack=[shell];
 while(stack.length){
  const node=stack.pop();
  for(const child of node.children)stack.push(child);
  for(const mi of node.render?.meshInstances||[]){
   const source=mi.material;
   if(!source?.clone)continue;
   let m=copies.get(source);
   if(!m){
    m=source.clone();
    if(m.diffuse)m.diffuse.set(m.diffuse.r*.76,m.diffuse.g*.81,m.diffuse.b*.94);
    m.gloss=Math.min(m.gloss??.35,.34);
    m.update();copies.set(source,m);
   }
   mi.material=m;
  }
 }
}
function arcaneSurround(app,building,cobble){
 // The V027 door is 1.253 m wide and 2.32 m high in Blender's GLB export.
 // Mineral masonry physically frames its sides and lintel without sealing it.
 const frame=new Entity('Arcanista · jambas PBR y dintel ajustados a V027');
 frame.setLocalPosition(-1.1,0,.22);building.addChild(frame);
 const stone=pavedMaterial('Piedra mineral mate · portal arcanista',cobble,1.75,2.50,1.4);
 stone.diffuse.set(.48,.49,.55);stone.bumpiness=.88;stone.gloss=.17;stone.update();
 mesh(frame,'Jamba mineral izquierda','box',-.77,1.20,0,.16,2.40,.25,stone,true);
 mesh(frame,'Jamba mineral derecha','box',.74,1.20,0,.16,2.40,.25,stone,true);
 mesh(frame,'Dintel mineral superior','box',-.015,2.43,0,1.67,.18,.25,stone,true);
 return frame;
}
export async function mountVillage(app,{shell,roof,door,onResourceLoaded=()=>{}}){
 const plan=globalThis.GenesisVillagePlan;const root=new Entity('Aldea 63x63 · v0.11.017');app.root.addChild(root);
 const mobile=globalThis.GenesisDevice?.safePreviews===true;
 const [cobble,traffic]=mobile
  ? [await maps(app,'cobble',true,onResourceLoaded),await maps(app,'traffic',true,onResourceLoaded)]
  : await Promise.all([maps(app,'cobble',false,onResourceLoaded),maps(app,'traffic',false,onResourceLoaded)]);
 // Gentle opposing sky bounce prevents near-black backsides without flattening PBR.
 const bounce=new Entity('Rebote celeste cálido · sin sombras');
 bounce.addComponent('light',{type:'directional',color:new Color(.84,.79,.73),intensity:.24,castShadows:false});
 bounce.setLocalEulerAngles(28,145,0);root.addChild(bounce);
 const b=plan.bounds;
 mesh(root,'Pavimento exterior adoquín','plane',7,-.024,17,63,1,63,pavedMaterial('Adoquín · exterior',cobble,63,63));
 mesh(root,'Plaza central','plane',plan.plaza.x,-.010,plan.plaza.z,plan.plaza.w,1,plan.plaza.d,pavedMaterial('Adoquín · plaza',cobble,plan.plaza.w,plan.plaza.d,2.4));
 // A flush paving border defines the square while leaving crossings open.
 const square=plan.plaza;
 for(const [x,z,w,d] of [[square.x-square.w/2,square.z,.35,square.d],[square.x+square.w/2,square.z,.35,square.d],[square.x,square.z-square.d/2,square.w,.35],[square.x,square.z+square.d/2,square.w,.35]]){
  const m=pavedMaterial('Borde de plaza',cobble,w,d,1.2);m.diffuse.set(.68,.68,.64);m.update();mesh(root,'Marco de plaza','plane',x,-.004,z,w,1,d,m);
 }
 const edge=edgeMask(app);
 for(const p of plan.roads){const m=pavedMaterial(p.name,traffic,p.w,p.d);m.opacityMap=edge;m.opacityMapChannel='a';m.blendType=BLEND_NORMAL;m.depthWrite=false;m.update();mesh(root,p.name,'plane',p.x,.006,p.z,p.w,1,p.d,m)}
 const trim=material('Piedra de borde',[.35,.34,.29]);
 for(const x of [b.minX,b.maxX])mesh(root,'Límite de aldea','box',x,.12,17,.25,.24,63,trim);
 for(const z of [b.minZ,b.maxZ])mesh(root,'Límite de aldea','box',7,.12,z,63,.24,.25,trim);
 const proxies=new Map(),arcanePortals=[];
 for(const p of plan.workshops){
  const building=new Entity(p.profession+' · fachada cerrada');root.addChild(building);building.setLocalPosition(p.x,0,p.z);building.setLocalScale(plan.workshopScale,1,plan.workshopScale);building.setLocalEulerAngles(0,p.yaw,0);
  const shellClone=shell.clone(),roofClone=roof.clone(),doorClone=door.clone();
  for(const [clone,pos] of [[shellClone,[0,0,0]],[roofClone,[0,3.45,-5.05]],[doorClone,[-1.1,0,.12]]]){
   clone.setLocalPosition(...pos);clone.setLocalEulerAngles(0,0,0);building.addChild(clone);
  }
  if(p.profession==='Arcanista'){
   tintArcaneFacade(shellClone);
   arcaneSurround(app,building,cobble);
   arcanePortals.push(mountArcanePortal(app,building,doorClone));
  }
  proxies.set(p.profession,building);
  sign(app,root,p.label,p.existing?'Taller de oficio':'Taller cerrado',p.x,p.z,p.yaw,2.9,3.2);
 }
 const market=plan.market;
 mesh(root,'Mercado · área de referencia','plane',market.x,-.006,market.z,market.w,1,market.d,pavedMaterial('Adoquín · mercado',cobble,market.w,market.d));
 // Only a marked footprint and a sign: no fabricated market stalls.
 const marker=material('Referencia mercado',[.55,.42,.22]);
 for(const x of [market.x-market.w/2,market.x+market.w/2])mesh(root,'Borde de referencia mercado','box',x,.025,market.z,.12,.05,market.d,marker);
 for(const z of [market.z-market.d/2,market.z+market.d/2])mesh(root,'Borde de referencia mercado','box',market.x,.025,z,market.w,.05,.12,marker);
 const marketSign={x:market.x-market.w/2+1,z:market.z-market.d/2+1};
 sign(app,root,'MERCADO','Área reservada · puestos pendientes',marketSign.x,marketSign.z,-90,2.1,5);
 mesh(root,'Poste cartel mercado','box',marketSign.x,.8,marketSign.z,.18,1.6,.18,marker);
 const plazaSign={x:square.x-square.w/2-1,z:square.z-square.d/2};
 sign(app,root,'PLAZA CENTRAL','Aldea de los artesanos',plazaSign.x,plazaSign.z,0,1.9,4.4);
 mesh(root,'Poste cartel plaza','box',plazaSign.x,.65,plazaSign.z,.14,1.3,.14,marker);
 const fixedObstacles=[{x:marketSign.x,z:marketSign.z,r:.2},{x:plazaSign.x,z:plazaSign.z,r:.18}];
 const trees=mountVillageTrees(app,root);
 return Object.freeze({root,plan,trees,arcanePortals,setProfession(profession){for(const p of plan.workshops)proxies.get(p.profession).enabled=!p.existing||p.profession!==profession},blocked(x,z,r=.33){return plan.blocked(x,z,r)||trees.blocked(x,z,r)||fixedObstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.r+r)}});
}
