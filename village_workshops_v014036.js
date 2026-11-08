/* V014.036 · restore the four existing closed-workshop landmarks.
 * Reuses canonical village plan and existing approved shell/door geometry.
 * Arcanista swaps to the original approved V006 four-wall Blender GLB only
 * after a valid real mesh is instanced; V027 remains the approved portal.
 */
import {Entity} from 'playcanvas';
import {mountArcanePortal} from './village_arcanist.js?v=0.14b-mobile-boot-20261103';
const WALLS='./assets/vendor/genesis/externals/arcanistWallsV006/src/arcanista_four_walls_preview.glb';
export function mountClosedWorkshopsV014036(app,root,plan,{shell,roof,door,afterDecor}={}){
 const records=[],state={version:'V014.036',planned:4,installed:0,arcane:{walls:'waiting',door:'waiting',meshInstances:0,error:null}};
 globalThis.__genesisClosedWorkshopStatus=state;
 let arcane=null;
 for(const p of plan.workshops.filter(p=>p.profession!=='Herrero')){
  const building=new Entity(p.profession+' · fachada cerrada');
  root.addChild(building);
  building.setLocalPosition(p.x,0,p.z);
  building.setLocalScale(plan.workshopScale,1,plan.workshopScale);
  building.setLocalEulerAngles(0,p.yaw,0);
  const base=shell?.clone?.();
  if(!base){console.warn('V014.036: no shell for '+p.profession);continue;}
  base.setLocalPosition(0,0,0);building.addChild(base);
  let roofClone=null,doorClone=null;
  if(roof){roofClone=roof.clone();roofClone.setLocalPosition(0,3.40,-5.05);roofClone.setLocalScale(1.28,.70,.86);building.addChild(roofClone)}
  if(door){doorClone=door.clone();doorClone.setLocalPosition(-1.1,0,.12);building.addChild(doorClone)}
  records.push({profession:p.profession,building,shell:base,roof:roofClone,door:doorClone});
  state.installed++;
  if(p.profession==='Arcanista')arcane={building,shell:base,roof:roofClone,door:doorClone};
 }
 const ready=Promise.resolve(afterDecor).catch(()=>{}).then(()=>{
  if(!arcane){state.arcane.walls='missing-arcane-proxy';return false;}
  const portal=mountArcanePortal(app,arcane.building,arcane.door||arcane.shell);
  state.arcane.door='loading';
  portal.initialReady.then(s=>{state.arcane.door=s.phase;state.arcane.doorDetail=s.detail});
  state.arcane.walls='loading';
  return new Promise(resolve=>{
   app.assets.loadFromUrl(WALLS,'container',(error,asset)=>{
    if(error||!asset?.resource){state.arcane.walls='error';state.arcane.error=String(error||'missing wall resource');resolve(false);return;}
    let visual;
    try{
     visual=asset.resource.instantiateRenderEntity();
     const n=visual.findComponents('render').reduce((sum,c)=>sum+(c.meshInstances?.length||0),0);
     if(n<1)throw Error('Arcanista V006 wall GLB has no meshes');
     const group=new Entity('GENESIS_ARCANISTA_FOUR_WALLS_V006');
     group.setLocalScale(12/7.875,1,12/7.875);
     visual.setLocalPosition(0,0,0);group.addChild(visual);arcane.building.addChild(group);
     arcane.shell.enabled=false;
     state.arcane.walls='ready';state.arcane.meshInstances=n;
     resolve(true);
    }catch(e){visual?.destroy?.();state.arcane.walls='error';state.arcane.error=String(e);resolve(false);}
   });
  });
 });
 return Object.freeze({records,status:state,ready});
}
