/* Project Genesis ML11: connects existing Rayo V07, Fuego V18 and Hielo V21
 * PlayCanvas shader animations to the REAL V050 GLB equipment nodes.
 *
 * All four imported source modules are copied byte-for-byte from
 * ProjectGenesisAssets2/genesis-equipment-assets (V22 branch).
 * Rayo V07 is visually approved, Fuego/Hielo are experimental.
 * This module never edits geometry, approved PBR, or character source GLB.
 */
import * as pc from 'playcanvas';
import {createRayoV07} from './vfx/approved/Genesis_Rayo_Helicoidal_V07.mjs';
import {createFuegoHaloFinoV18} from './vfx/experimental/Genesis_Fuego_HaloFino_V18_WebGL.mjs';
import {createHieloV21} from './vfx/experimental/Genesis_Hielo_V21_Cristalizacion.mjs';

const EFFECTS=Object.freeze({Rayo:createRayoV07,Fuego:createFuegoHaloFinoV18,Hielo:createHieloV21});
const APPROVALS=Object.freeze({Rayo:'visual-approved-v07',Fuego:'experimental-v18',Hielo:'experimental-v21'});
const GEAR_NODE_NAMES=Object.freeze({
 sword:'GENESIS_V048_APPROVED_SWORD_V12B_IN_RIGHT_HAND_STATIC',
 shield:'GENESIS_V048_APPROVED_SHIELD_V015_IN_LEFT_HAND_STATIC'
});
let rig=null;
const clamp=value=>Math.max(0,Math.min(100,Number(value)||0));
const originalSwordBounds=()=>new pc.BoundingBox(new pc.Vec3(0,0,0),new pc.Vec3(.344487,1,.061387));

function localBounds(root){
 const pts=[],inv=root.getWorldTransform().clone().invert();
 for(const component of root.findComponents('render')||[]){
  for(const instance of component.meshInstances||[]){
   const box=instance.mesh?.aabb||instance.aabb;
   if(!box)continue;
   const c=box.center,h=box.halfExtents,m=instance.node.getWorldTransform();
   for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
    const local=inv.transformPoint(m.transformPoint(new pc.Vec3(c.x+x*h.x,c.y+y*h.y,c.z+z*h.z)));
    pts.push(local);
   }
  }
 }
 if(!pts.length)throw Error('No shield triangles/bounds to attach animated VFX');
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 for(const p of pts)for(let k=0;k<3;k++){
  min[k]=Math.min(min[k],p[['x','y','z'][k]]);
  max[k]=Math.max(max[k],p[['x','y','z'][k]]);
 }
 return {min,max,center:min.map((v,i)=>(v+max[i])/2),span:min.map((v,i)=>max[i]-v)};
}
function shieldContour(material,app,node,label){
 // Use ORIGINAL shader material over a thin loop conforming to the real V015
 // local bounding extents, not a photo or substituted emissive disk.
 const b=localBounds(node);
 const normal=[0,1,2].sort((a,c)=>b.span[a]-b.span[c])[0];
 const axes=[0,1,2].filter(a=>a!==normal);
 const [u,v]=axes;
 const segments=128,vertices=[],uvs=[],indices=[];
 const radU=b.span[u]*.47,radV=b.span[v]*.47,front=b.center[normal]+b.span[normal]*.55;
 const margin=Math.min(Math.max(.004,Math.min(radU,radV)*.055),.025);
 for(let n=0;n<=segments;n++){
  const t=n/segments*2*Math.PI;
  for(const offset of [-margin,margin]){
   const p=[...b.center];p[normal]=front;p[u]+=Math.cos(t)*(radU+offset);p[v]+=Math.sin(t)*(radV+offset);
   vertices.push(...p);uvs.push(n/segments,offset<0?0:1);
  }
  if(n<segments){const i=2*n;indices.push(i,i+1,i+2,i+1,i+3,i+2);}
 }
 const mesh=new pc.Mesh(app.graphicsDevice);
 mesh.setPositions(vertices);mesh.setUvs(0,uvs);mesh.setIndices(indices);mesh.update();
 const out=new pc.Entity('GENESIS_ML11_'+label+'_V015_SHIELD_SHADER_CONTOUR');
 out.addComponent('render',{meshInstances:[new pc.MeshInstance(mesh,material)],castShadows:false,receiveShadows:false});
 node.addChild(out);
 return {entity:out,triangles:indices.length/3,normalAxis:normal,geomDerivedFromV015:true};
}
function itemIntensity(item){
 const map={};
 for(const [name,value] of item?.affinities||[])if(EFFECTS[name])map[name]=clamp(value);
 return map;
}
function attach(app,modelRoot){
 const parentByType={sword:modelRoot.findByName(GEAR_NODE_NAMES.sword),
                     shield:modelRoot.findByName(GEAR_NODE_NAMES.shield)};
 if(!parentByType.sword||!parentByType.shield)throw Error('V050 equipped sub-nodes not found');
 const instances={},extras=[],errors=[];
 for(const [kind,node] of Object.entries(parentByType)){
  instances[kind]={};
  for(const [name,create] of Object.entries(EFFECTS)){
   let effect=null;
   try{
    effect=create(pc,app,originalSwordBounds());
    if(kind==='sword'){
     // Shader positions were authored in the original V03 local coordinate system.
     node.addChild(effect.entity);
     effect.entity.setLocalPosition(0,0,0);
     if(effect.light){node.addChild(effect.light);effect.light.setLocalPosition(0,.22,.08);}
    }else{
     // For a shield, the SOURCE shader animates a separate, V015-sized contour.
     effect.entity.enabled=false;
     const outline=shieldContour(effect.material,app,node,name);
     extras.push(outline.entity);
     if(effect.light){node.addChild(effect.light);effect.light.setLocalPosition(0,0,.05);}
    }
    instances[kind][name]=effect;
   }catch(error){
    errors.push({kind,name,error:String(error?.message||error)});
    try{effect?.entity?.destroy();effect?.light?.destroy();effect?.material?.destroy();}catch(_){}
   }
  }
 }
 let t=0,rafId=0,lastRafTime=null,lastAppTick=-Infinity,timerId=0,lastTimerTick=null;
 const report={status:'bound',model:'V050',ready:Object.keys(instances.sword).length+Object.keys(instances.shield).length,
   originalModelUnchanged:true,effects:APPROVALS,errors,shieldSurface:'actual-V015-local-bounds-contour',
   updateFrames:0,playCanvasFrames:0,previewClockFrames:0};
 const update=(dt,source)=>{
  t+=Math.max(0,Math.min(.07,Number(dt)||0));
  report.time=t;report.updateFrames++;
  report.lastClock=source;
  if(source==='playcanvas')report.playCanvasFrames++;
  else report.previewClockFrames++;
  for(const kind of ['sword','shield'])for(const [name,fx] of Object.entries(instances[kind])){
    const value=rig?.levels?.[kind]?.[name]||0;
    try{fx.set(t,value)}catch(error){if(!report.runtimeError)report.runtimeError=String(error.message||error);}
  }
 };
 // PlayCanvas can suspend its world update while the modal is open.
 // Keep shader uniforms advancing for the preview lifecycle on RAF, but
 // distinguish clock-only updates from actual scene frames in the diagnostics.
 const appTick=dt=>{
   lastAppTick=performance.now();
   update(dt,'playcanvas');
 };
 const rafTick=now=>{
   // Some headless WebGL environments do not schedule RAF while the modal is open.
   // The interval below keeps NGE uniforms fresh, but this is NOT GPU-frame proof.
   if(lastRafTime!==null&&now-lastAppTick>220&&now-(lastTimerTick??-Infinity)>240){
     update((now-lastRafTime)/1000,'preview-clock');
   }
   lastRafTime=now;
   rafId=requestAnimationFrame(rafTick);
 };
 // ML13: a running RAF does not mean the PlayCanvas scene is rendering.
 // When app updates pause, keep GLSL uniforms advancing with the fallback clock.
 const intervalTick=()=>{
   const now=performance.now();
   if(now-lastAppTick>220){
     update(lastTimerTick==null?0.08:(now-lastTimerTick)/1000,'preview-clock');
   }
   lastTimerTick=now;
 };
 const handle={app,modelRoot,instances,extras,report,levels:{sword:{},shield:{}},update,
  apply(sword,shield){
   const requested={sword:itemIntensity(sword),shield:itemIntensity(shield)};
   handle.levels={sword:{},shield:{}};
   for(const kind of ['sword','shield'])for(const [name,level] of Object.entries(requested[kind]))
     if(instances[kind][name]&&level>0)handle.levels[kind][name]=level;
   report.active={sword:{...handle.levels.sword},shield:{...handle.levels.shield}};
   report.time=t;
   report.visible=!!(parentByType.sword.enabled&&parentByType.shield.enabled&&modelRoot.enabled);
   report.hasSparks=Object.values(report.active).some(m=>Object.values(m).some(v=>v>0));
   return {...report,active:report.active};
  },
  destroy(){
   app.off('update',appTick);
   if(rafId)cancelAnimationFrame(rafId);
   if(timerId)clearInterval(timerId);
   for(const effect of Object.values(instances).flatMap(Object.values)){
    effect.entity?.destroy();effect.light?.destroy();effect.material?.destroy();
   }
   extras.forEach(e=>e.destroy());
  }
 };
 rig=handle;app.on('update',appTick);
 if(typeof requestAnimationFrame==='function')rafId=requestAnimationFrame(rafTick);
 timerId=setInterval(intervalTick,100);
 return handle;
}
export const MERCENARY_ML11_VFX=Object.freeze({channels:Object.keys(EFFECTS),approvals:APPROVALS});
export function applyMercenaryVFX(sword,shield){
 try{
  const app=document.querySelector('#genesisApp')?.app;
  const modelRoot=document.querySelector('#mercApprovedGearDisplay')?.contentEntity;
  if(!app||!modelRoot)return {status:'not-loaded',reason:'No PlayCanvas app/V050 content'};
  if(!rig||rig.app!==app||rig.modelRoot!==modelRoot){
   rig?.destroy();rig=attach(app,modelRoot);
  }
  return rig.apply(sword,shield);
 }catch(error){
  console.warn('ML11 shader VFX failed; keeping native light fallback:',error);
  return {status:'error',reason:String(error?.message||error),realShaders:false};
 }
}
export function getMercenaryVFXState(){return rig?.report||{status:'not-loaded'};}
