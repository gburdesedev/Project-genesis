/* V014.034 — approved V011 HQ dolphin fountain, isolated from the critical Herrero boot.
 * Local 16.7 MB animated GLB; never substitute a mock or remote 8-bit asset.
 */
import {Entity} from 'playcanvas';
export const FOUNTAIN_V011_LOCAL='./assets/vendor/genesis/externals/genesisFountainV011HQAsset/src/PG_Dolphin_Fountain_V011_PlayCanvas_HQ_Optimized.glb';
export function mountGenesisFountainV014034(app,village,{onResourceLoaded=()=>{}}={}){
 const anchor=new Entity('Plaza · fuente delfín V011 HQ · original');
 anchor.setPosition(7,0,16);village.addChild(anchor);
 let phase='deferred',detail='',model=null,meshes=0,animated=false;
 function report(){
  return Object.freeze({version:'V014.034',phase,detail,asset:FOUNTAIN_V011_LOCAL,
   meshes,animated,position:[7,0,16],visible:!!model&&model.enabled});
 }
 const publish=()=>{globalThis.__genesisFountainV014034=report();return globalThis.__genesisFountainV014034};
 publish();
 function start(){
  if(phase!=='deferred')return;
  phase='loading';publish();
  app.assets.loadFromUrl(FOUNTAIN_V011_LOCAL,'container',(error,asset)=>{
   if(error||!asset?.resource){
    phase='error';detail=String(error||'Contenedor GLB sin recurso');publish();
    console.error('Genesis fountain V011 HQ: '+detail);return;
   }
   try{
    model=asset.resource.instantiateRenderEntity();
    if(!model)throw new Error('Fuente V011: entidad de render ausente');
    model.name='Fuente delfín V011 · geometría original PBR';
    anchor.addChild(model);
    const renderers=model.findComponents('render');
    meshes=renderers.reduce((sum,r)=>sum+(r.meshInstances?.length||0),0);
    if(meshes<10)throw new Error('Fuente V011: GLB sin las superficies esperadas ('+meshes+')');
    // If the GLB exposes the approved 8-second water animation, start its real track.
    const trackAsset=asset.resource.animations?.[0];
    const track=trackAsset?.resource||trackAsset;
    if(track){
     try{
      model.addComponent('anim',{activate:true});
      model.anim.assignAnimation('Fuente V011 agua',track,1,true);
      model.anim.baseLayer.play('Fuente V011 agua');
      animated=true;
     }catch(animError){console.warn('Genesis fountain V011: track unavailable',animError);}
    }
    phase='ready';detail=meshes+' superficies PBR · agua '+(animated?'animada':'sin pista reproducible');
    try{onResourceLoaded('fountain:V011HQ')}catch(progressError){console.warn('Fountain progress UI not available',progressError)}
   }catch(renderError){
    model?.destroy();model=null;meshes=0;
    phase='error';detail=String(renderError);
    console.error('Genesis fountain V011 HQ failed',renderError);
   }
   publish();
  });
 }
 function release(){model?.destroy();anchor.destroy();phase='released';publish();}
 return Object.freeze({anchor,start,release,status:report});
}
