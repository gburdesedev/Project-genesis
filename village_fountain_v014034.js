/* V014.034 · approved local V011 HQ dolphin fountain.
 * Optional, nonblocking load AFTER entry. Never substitute a fake cylinder
 * or report success until a real GLB render mesh is installed in the village.
 */
import { Entity } from 'playcanvas';
const URL='./assets/vendor/genesis/externals/genesisFountainV011HQAsset/src/PG_Dolphin_Fountain_V011_PlayCanvas_HQ_Optimized.glb';
export function mountGenesisDolphinFountain(app,root,options={}){
 const parent=new Entity('Plaza · fuente de delfines V011 HQ');
 parent.setPosition(7,0,16);root.addChild(parent);
 const state={version:'V014.034',asset:URL,phase:'waiting',meshInstances:0,error:null,center:[7,16],collisionRadius:2.1};
 globalThis.__genesisDolphinFountain=state;
 let disposed=false;
 const ready=new Promise(resolve=>{
  const start=()=>{
   if(disposed){resolve(false);return;}
   state.phase='loading';
   try{
    app.assets.loadFromUrl(URL,'container',(err,asset)=>{
     if(disposed){resolve(false);return;}
     if(err||!asset?.resource){
      state.phase='error';state.error=String(err||'missing container resource');
      console.error('V014.034: fuente V011 HQ no disponible',state.error);resolve(false);return;
     }
     try{
      const visual=asset.resource.instantiateRenderEntity();
      visual.name='Fuente aprobada V011 HQ · modelo original';
      const meshes=visual.findComponents('render').reduce((n,r)=>n+(r.meshInstances?.length||0),0);
      if(meshes<1)throw Error('GLB loaded without visible render geometry');
      visual.setLocalPosition(0,0,0);
      parent.addChild(visual);
      state.meshInstances=meshes;state.phase='ready';
      options.onReady?.(state);
      resolve(true);
     }catch(error){state.phase='error';state.error=String(error);console.error('V014.034: montaje fuente falló',error);resolve(false);}
    });
   }catch(error){state.phase='error';state.error=String(error);resolve(false)}
  };
  // Trees must settle first, to avoid the known 40+ MB concurrent upload burst.
  Promise.resolve(options.afterTrees).catch(()=>{}).then(()=>{
   if(disposed){resolve(false);return}
   setTimeout(start,1200);
  });
 });
 return Object.freeze({root:parent,state,ready,blocked(x,z,r=.33){
  return state.phase==='ready'&&Math.hypot(x-7,z-16)<state.collisionRadius+r;
 },release(){disposed=true;parent.destroy()}});
}
