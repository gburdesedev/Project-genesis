/* Project Genesis - isolated V011 dolphin fountain in live PlayCanvas village.
 * PBR marble V007 and V011 water are unchanged. Preview only; never edit index.
 * Plaza center comes from the active village_plan.js rather than guessed X/Z.
 */
const FOUNTAIN_HQ='https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/feature/plaza-fuente-delfin-marmol-aaa/public/models/PG_Dolphin_Fountain_V011_PlayCanvas_HQ_Optimized.glb';
const DRACO_GLUE='https://developer.playcanvas.com/assets/modules/draco/draco.wasm.js';
const DRACO_WASM='https://developer.playcanvas.com/assets/modules/draco/draco.wasm.wasm';
// This isolated comparison intentionally uses HQ only (16.72 MB, PBR 2K).
async function readyDraco(appElement){
  // The HQ GLB requires KHR_draco_mesh_compression. Existing game assets do not.
  if(!customElements.get('pc-wasm'))throw Error('Versión PlayCanvas sin componente pc-wasm Draco');
  let decoder=document.getElementById('genesisFountainDracoDecoder');
  if(decoder?.__genesisLoaded)return;
  if(!decoder){
    decoder=document.createElement('pc-wasm');
    decoder.id='genesisFountainDracoDecoder';
    decoder.setAttribute('name','DracoDecoderModule');
    decoder.setAttribute('glue',DRACO_GLUE);
    decoder.setAttribute('wasm',DRACO_WASM);
  }
  await new Promise((resolve,reject)=>{
    let settled=false;
    const finish=err=>{
      if(settled)return;
      settled=true;
      clearTimeout(timeout);
      decoder.removeEventListener('ready',onReady);
      decoder.removeEventListener('error',onError);
      if(err)reject(err);else{decoder.__genesisLoaded=true;resolve()}
    };
    const onReady=()=>finish(null);
    const onError=e=>finish(new Error('Draco: '+(e?.message||'no se pudo cargar')));
    const timeout=setTimeout(()=>finish(new Error('Draco no respondió tras 20 segundos')),20000);
    decoder.addEventListener('ready',onReady);
    decoder.addEventListener('error',onError);
    if(!decoder.isConnected)appElement.insertBefore(decoder,appElement.firstChild);
    else if(decoder.__genesisLoaded)finish(null);
  });
}
const send = (state, detail={}) => {
  const result={kind:'genesisFountainV011Preview',state,...detail};
  window.__genesisFountainV011Preview=result;
  if(parent!==window)parent.postMessage(result,location.origin);
};
const pause = ms=>new Promise(ok=>setTimeout(ok,ms));
function attachMovingWater(model,app){
  const root=model.contentEntity;
  if(!root)return 0;
  const water=[];
  const cloned=new Map();
  for(const render of root.findComponents('render')){
    for(const meshInstance of render.meshInstances||[]){
      const source=meshInstance.material;
      if(!source?.name?.startsWith('AGUA_')||!source.clone)continue;
      const pool=source.name.includes('Estanque');
      const jet=source.name.includes('Fisica');
      if(!pool&&!jet||!source.normalMap)continue;
      let mat=cloned.get(source);
      if(!mat){
        mat=source.clone();
        // V011 uses an embedded 2K tileable OpenGL water normal map.
        // No alteration to its blue-petroleum tint, refraction or marble.
        if(mat.normalMap){
          mat.normalDetailMap=mat.normalMap;
          mat.normalMapTiling.set(pool?3.1:2.5,pool?3.1:2.5);
          mat.normalDetailMapTiling.set(pool?5.3:3.3,pool?5.3:3.3);
        }
        mat.update();
        cloned.set(source,mat);
        water.push({material:mat,pool});
      }
      meshInstance.material=mat;
    }
  }
  let elapsed=0;
  const tick=dt=>{
    elapsed=(elapsed+Math.max(0,dt))%8;
    const t=elapsed;
    for(const item of water){
      const mat=item.material;
      if(!mat.normalMap)continue;
      mat.normalMapOffset.set(item.pool?t*.125:0,item.pool?-t*.125:t*.25);
      if(mat.normalDetailMap){
        mat.normalDetailMapOffset.set(item.pool?-t*.1875:t*.125,item.pool?t*.125:-t*.125);
      }
      mat.update();
    }
  };
  if(water.length){
    app.on('update',tick);
    window.addEventListener('pagehide',()=>{app.off('update',tick);for(const mat of cloned.values())mat.destroy()}, {once:true});
  }
  return water.length;
}
(async()=>{
  try{
    const plan=window.GenesisVillagePlan;
    if(!plan?.plaza||typeof plan.toWorld!=='function')throw Error('village_plan.js no expone el centro real de la plaza');
    const p=plan.toWorld({x:plan.plaza.x,y:0,z:plan.plaza.z});
    const appElement=document.querySelector('#genesisApp');
    const scene=document.querySelector('#genesisApp > pc-scene');
    if(!appElement||!scene)throw Error('No se encontró pc-scene original de PlayCanvas');
    await readyDraco(appElement);
    const fountainURL=FOUNTAIN_HQ;
    send('LOADING',{center:[p.x,p.y,p.z],fountainDiameter:4.26,source:fountainURL,quality:'HQ 2K / 16.72 MB',compression:'Draco'});
    // Built-in web components load the GLB and its animations as one container.
    const asset=document.createElement('pc-asset');
    asset.id='genesisFountainV011Asset';
    asset.setAttribute('type','container');
    asset.setAttribute('src',fountainURL);
    appElement.insertBefore(asset,scene);
    const model=document.createElement('pc-model');
    model.id='genesisFountainV011Model';
    model.setAttribute('name','Dolphin marble fountain V011 - plaza preview');
    model.setAttribute('asset','genesisFountainV011Asset');
    model.setAttribute('position',p.x+' 0 '+p.z);
    model.setAttribute('scale','1 1 1');
    const anim=document.createElement('pc-anim');
    anim.id='genesisFountainV011Anim';
    anim.setAttribute('activate','true');
    model.appendChild(anim);
    model.addEventListener('error',event=>send('ERROR',{message:String(event?.message||'Error GLB fountain')}),{once:true});
    scene.appendChild(model);
    let root=null;
    for(let i=0;i<180;i++){
      root=model.contentEntity;
      if(root?.findComponents('render')?.length)break;
      await pause(250);
    }
    if(!root?.findComponents('render')?.length){
      send('ERROR',{message:'No se cargó el GLB animado de la fuente. Comprobar publicación del asset V011.'});
      return;
    }
    let app=appElement.app||appElement.application;
    if(!app){
      for(let i=0;i<40&&!app;i++){await pause(100);app=appElement.app||appElement.application}
    }
    if(!app)throw Error('No se pudo enlazar la aplicación de PlayCanvas');
    const waterMaterials=attachMovingWater(model,app);
    for(let i=0;i<100 && !anim.clips?.length;i++)await pause(200);
    const clips=[...(anim.clips||[])];
    if(!clips.length){
      send('ERROR',{message:'Fuente visible, pero ningún clip GLB se activó; revisar animación de 8 segundos.',center:[p.x,p.y,p.z],waterMaterials});
      return;
    }
    if(clips.length>1){
      send('PARTIAL',{message:'GLB original con '+clips.length+' clips independientes; esperando unificación para reproducir todo el agua',clips,center:[p.x,p.y,p.z]});
      return;
    }
    send('ANIMATED',{center:[p.x,p.y,p.z],clips,waterMaterials,diameterMeters:4.26,quality:'HQ 2K / 16.72 MB',
      note:waterMaterials?'GLB HQ Draco 8s + normales del agua en movimiento; PBR mármol V007 intacto':'GLB HQ Draco 8s animado; falta normal map importada para animar la superficie'});
  }catch(err){send('ERROR',{message:String(err?.message||err)})}
})();
