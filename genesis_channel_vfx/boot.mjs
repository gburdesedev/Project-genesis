/**
 * Project Genesis • V014.038 experimental bridge from crafted item.channels to
 * actual PlayCanvas 3D VFX. Never edits the approved sword material or mesh.
 *
 * Source snapshots are byte-identical to original GitHub VFX modules.
 * Rayo V07: approved; Fuego V20C1: source is EXPERIMENTAL; Hielo V21:
 * EXPERIMENTAL WebGL stand-in, NOT user-approved Blender Hielo V42.
 *
 * Explicitly opt-in via ?genesisChannelVfx=1, until fit/visual approval.
 * Main and the source Canvas remain untouched.
 */
import * as pc from 'playcanvas';
import {createRayoV07,RAYO_V07_APPROVAL} from './vendor/Genesis_Rayo_Helicoidal_V07.mjs';
import {createFuegoV20C,FUEGO_V20C_SPEC} from './vendor/Genesis_Fuego_V20C_CalorYFlamas.mjs';
import {createHieloV21,HIELO_V21_SPEC} from './vendor/Genesis_Hielo_V21_Cristalizacion.mjs';

const CLAMP=(n)=>Math.max(0,Math.min(100,Number(n)||0));
const ACTIVE= new URLSearchParams(location.search).get('genesisChannelVfx')==='1';
const names={rayo:'Rayo',fuego:'Fuego',hielo:'Hielo'};
const audit={
  schema:'GenesisV014038_MercenaryChannelVfxExperimental',
  originalItemChannelsUsed:true,
  originalSwordMeshChanged:false,
  originalSwordPbrMaterialChanged:false,
  sourceSwordModel:'mercSword10 (existing 46KB vendor placeholder; NOT original V03)',
  featureFlagRequired:'genesisChannelVfx=1',
  effects:{rayo:{source:RAYO_V07_APPROVAL.id,approved:RAYO_V07_APPROVAL.approvedVisual},
    fuego:{source:FUEGO_V20C_SPEC.id,approved:FUEGO_V20C_SPEC.approved},
    hielo:{source:HIELO_V21_SPEC.id,approved:false,notCyclesV42:true}},
  status:'not-ready',updates:0,lastChannels:{},errors:[],
};
let fx=null,sourceEntity=null,clock=0,listener=null;

function normalize(item){
  const values={fuego:0,rayo:0,hielo:0};
  const channels=Array.isArray(item?.affinities)?item.affinities:
     (Array.isArray(item?.channels)?item.channels.slice(1):[]);
  for(const pair of channels){
    const key=String(pair?.[0]||'').trim().toLowerCase();
    if(Object.hasOwn(values,key))values[key]=CLAMP(pair?.[1]);
  }
  return values;
}
function hasKnown(values){return Object.values(values).some(x=>x>0);}
function rootOfSword(){return document.getElementById('mercSwordModel')?.entity||null;}
function swordContent(){return document.getElementById('mercSwordModel')?.contentEntity||null;}
function appInstance(){return document.getElementById('genesisApp')?.app||null;}

/** Measure LOCAL GLB bounds, rather than attaching effect geometry to world.
 * The entire effect pivot follows sword->rig hand during idle/walk.
 * The current 46 KB vendor placeholder is measured; a V03 replacement needs
 * separate fit QA and must never be claimed implicitly.
 */
function localGeometryBounds(root,content){
  const inv=root.getWorldTransform().clone().invert();
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  let count=0;
  for(const comp of content.findComponents('render')){
    for(const mi of comp.meshInstances||[]){
      if(!mi.aabb)continue;
      const c=mi.aabb.center,h=mi.aabb.halfExtents;
      for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){
        const w=new pc.Vec3(c.x+h.x*x,c.y+h.y*y,c.z+h.z*z);
        const v=inv.transformPoint(w);
        [v.x,v.y,v.z].forEach((n,i)=>{lo[i]=Math.min(lo[i],n);hi[i]=Math.max(hi[i],n)});
      }
      count++;
    }
  }
  if(!count)return null;
  return {lo,hi,center:lo.map((n,i)=>(n+hi[i])*.5),
    span:lo.map((n,i)=>hi[i]-n),meshInstances:count};
}
function create(){
  const app=appInstance(),sword=rootOfSword(),content=swordContent();
  if(!app||!sword||!content||!sword.enabled)return false;
  const bounds=localGeometryBounds(sword,content);
  if(!bounds)return false;
  const [sx,sy,sz]=bounds.span;
  const longitudinal=[sx,sy,sz].indexOf(Math.max(sx,sy,sz));
  // Unknown axes are not treated as V03. For X/Z-oriented placeholders,
  // rotate the effect mounting pivot to align the procedural Y-axis.
  if(Math.max(sx,sy,sz)<=0.0001)throw Error('VFX_SWORD_EMPTY_BOUNDS');
  const anchor=new pc.Entity('GenesisV014038_ElementalChannelAnchor');
  sword.addChild(anchor);
  anchor.setLocalPosition(...bounds.center);
  anchor.setLocalEulerAngles(longitudinal===0?0:longitudinal===2?90:0,
                             0,longitudinal===0?-90:0);
  const scale=Math.max(.05,Math.min(5,Math.max(sx,sy,sz)/1.95));
  anchor.setLocalScale(scale,scale,scale);
  // Existing V07/V20C.1/V21 exact shader geometry is authored in the
  // original V03 sword-local reference frame. This proxy is uniform;
  // its precise fit on mercSword10 must be confirmed visually.
  const syntheticAabb=new pc.BoundingBox(new pc.Vec3(0,0,0),
                                        new pc.Vec3(.085,1.04,.09));
  const constructed=[];
  try{
    const lightning=createRayoV07(pc,app,syntheticAabb);
    const flame=createFuegoV20C(pc,app,syntheticAabb);
    const ice=createHieloV21(pc,app,syntheticAabb);
    for(const e of [lightning.entity,lightning.light,flame.heatEntity,
                    flame.flameEntity,flame.light,ice.entity,ice.light]){
      if(e){anchor.addChild(e);constructed.push(e);}
    }
    fx={anchor,lightning,flame,ice,levels:{fuego:0,rayo:0,hielo:0}};
    sourceEntity=sword;
    audit.fittedAxis=['x','y','z'][longitudinal];
    audit.localBounds=bounds;
    audit.anchorScale=scale;
    audit.createdEntities=constructed.length;
    audit.status='ready-experimental';
    const advance=(dt)=>{
      if(!fx)return;
      clock+=Math.max(0,Number(dt)||0);
      const show=sourceEntity?.enabled!==false;
      fx.anchor.enabled=show;
      if(!show)return;
      fx.lightning.set(clock,fx.levels.rayo);
      fx.flame.set(clock,fx.levels.fuego);
      fx.ice.set(clock,fx.levels.hielo);
      audit.updates++;
    };
    app.on('update',advance);
    listener=()=>app.off('update',advance);
    return true;
  }catch(err){
    anchor.destroy();
    fx=null;sourceEntity=null;
    audit.errors.push(String(err));
    audit.status='failed-legacy-fallback';
    throw err;
  }
}
function setItem(item){
  if(!ACTIVE||!item)return false;
  const values=normalize(item);
  if(!hasKnown(values)){
    if(fx)fx.levels={fuego:0,rayo:0,hielo:0};
    return false;
  }
  try{
    const entity=rootOfSword();
    if(!fx||sourceEntity!==entity){
      destroy();
      if(!create())return false;
    }
    fx.levels=values;
    audit.lastChannels={...values};
    return true;
  }catch(err){
    console.warn('Genesis ChannelVFX: conservando halo anterior',err);
    return false;
  }
}
function destroy(){
  if(listener){listener();listener=null;}
  if(fx?.anchor)fx.anchor.destroy();
  fx=null;sourceEntity=null;
  audit.status='inactive';
}
window.GenesisChannelVFX=Object.freeze({
  enabled:ACTIVE,setItem,normalize,destroy,
  status:()=>({...audit,ready:!!fx,levels:fx?{...fx.levels}:null}),
  provenance:()=>audit.effects,
});
console.info('GenesisChannelVFX bridge ready; enabled='+ACTIVE);
