/* Project Genesis v0.11.017 — approved V027 Arcanist portal.
 * Visual source and its WebGL LOD are pinned to an immutable public commit.
 * This is decorative scenery: the door remains closed and keeps workshop collision.
 */
import {Entity} from 'playcanvas';

export const ARCANE_DOOR_SOURCE = 'https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/588de60f6888c7e3d4db20e31ee60b3e19918968/deliverables/door_v027/webgl/Arcanist_Door_V027_WebGL.glb';

export function mountArcanePortal(app,building,fallbackDoor){
 const pivot=new Entity('Arcanista · puerta mágica V027 · cerrada');
 pivot.setLocalPosition(0,0,.12);
 building.addChild(pivot);
 let phase='loading',detail='';
 const report=()=>({version:'V027',phase,detail,url:ARCANE_DOOR_SOURCE});
 globalThis.__genesisArcaneDoorStatus=report();
 app.assets.loadFromUrl(ARCANE_DOOR_SOURCE,'container',(error,asset)=>{
  if(error||!asset?.resource){
   phase='fallback';detail=String(error||'GLB sin recurso');
   console.warn('Arcanista V027: se conserva la puerta anterior:',detail);
   globalThis.__genesisArcaneDoorStatus=report();return;
  }
  let visual;
  try{
   visual=asset.resource.instantiateRenderEntity();
   pivot.addChild(visual);
   const renders=visual.findComponents('render');
   if(!renders.length)throw new Error('GLB V027 sin superficies renderizables');
   for(const renderer of renders){renderer.castShadows=true;renderer.receiveShadows=true}
   fallbackDoor.enabled=false;
   phase='ready';detail=renders.length+' componentes';
  }catch(err){
   visual?.destroy();
   phase='fallback';detail=String(err?.message||err);
   console.warn('Arcanista V027: falla de importación:',detail);
  }
  globalThis.__genesisArcaneDoorStatus=report();
 });
 return Object.freeze({pivot,status:report});
}
