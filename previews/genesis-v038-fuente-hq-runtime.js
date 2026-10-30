/* Project Genesis: experimental PlayCanvas runtime QA for V038 forge + V011 HQ dolphin.
 * This script never changes the accepted game/index.html.
 * Models + Draco are DECLARED in the separate preview HTML before PlayCanvas boot.
 */
const status={version:'v0.14.004',fountain:'WAITING',forge:'WAITING',
  fountainClip:null,waterMaterials:0,forgeEmissiveZones:0,errors:[],frames:0};
globalThis.__genesisHQFountainForgeQA=status;
const emit=()=>{
  const d=JSON.parse(JSON.stringify(status));
  if(parent!==window)parent.postMessage({kind:'genesisHQFountainForgeQA',data:d},location.origin);
};
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
function materialsFor(root,fn){
  const found=[];
  for(const render of root.findComponents('render')){
    for(const mi of render.meshInstances||[]){
      const src=mi.material;
      if(src&&fn(src.name||''))found.push({mi,src});
    }
  }
  return found;
}
function animateWater(app,root){
  const found=materialsFor(root,n=>n.startsWith('AGUA_')&&(n.includes('Estanque')||n.includes('Fisica')));
  const copy=new Map();
  let entries=[];
  for(const {mi,src} of found){
    if(!src.normalMap)continue;
    let info=copy.get(src);
    if(!info){
      const mat=src.clone();mat.name=src.name+'_v011_hq_motion';
      const pool=src.name.includes('Estanque');
      mat.normalMapTiling.set(pool?3.1:2.5,pool?3.1:2.5);
      mat.normalDetailMap=mat.normalMap;
      mat.normalDetailMapTiling.set(pool?5.3:3.3,pool?5.3:3.3);
      mat.update();
      info={mat,pool};copy.set(src,info);entries.push(info);
    }
    mi.material=info.mat;
  }
  if(!entries.length)return 0;
  let t=0;
  const update=dt=>{
    t=(t+Math.max(0,dt))%8;
    for(const {mat,pool} of entries){
      mat.normalMapOffset.set(pool?t*.125:0,pool?-t*.125:t*.25);
      mat.normalDetailMapOffset.set(pool?-t*.1875:t*.125,pool?t*.125:-t*.125);
      mat.update();
    }
  };
  app.on('update',update);
  window.addEventListener('pagehide',()=>{app.off('update',update);for(const x of entries)x.mat.destroy()},{once:true});
  return entries.length;
}
function animateForge(app,root){
  const found=materialsFor(root,n=>n.includes('forge_cracked_hot_charcoal_ember_map'));
  const copy=new Map();
  for(const {mi,src} of found){
    let mat=copy.get(src);
    if(!mat){mat=src.clone();mat.name=src.name+'_v038_4s';copy.set(src,mat)}
    mi.material=mat;
  }
  const materials=[...copy.values()];
  if(!materials.length)return 0;
  let time=0;
  const update=dt=>{
    // The tutorial remains the authority for ignition; unlit coals don't pulse.
    const light=document.getElementById('forgeCoreLight')?.component;
    const lit=Boolean(light&&light.intensity>.30);
    if(lit)time+=Math.max(0,dt);
    const pulse=.68+.64*(.5-.5*Math.cos(time*Math.PI*.5));
    for(const mat of materials){
      mat.emissiveIntensity=lit?28*pulse:.075;
      mat.update();
    }
  };
  app.on('update',update);
  window.addEventListener('pagehide',()=>{app.off('update',update);for(const mat of materials)mat.destroy()},{once:true});
  return materials.length;
}
(async()=>{
  try{
    const appElement=document.querySelector('#genesisApp');
    const app=appElement?.app||appElement?.application;
    if(!app)throw Error('PlayCanvas app not ready');
    if(!document.getElementById('genesisHQDracoDecoder'))throw Error('Draco missing before PlayCanvas boot');
    const fountain=document.getElementById('genesisFountainV011Model');
    const forge=document.getElementById('forgeModel');
    if(!fountain||!forge)throw Error('Model anchor missing in separate game build');
    // There are multiple stages: GLB ready, animation discovered and playback.
    for(let i=0;i<240;i++){
      if(fountain.contentEntity?.findComponents('render')?.length)break;
      await sleep(250);
    }
    const root=fountain.contentEntity;
    if(!root?.findComponents('render')?.length){
      status.fountain='ERROR_NO_MESH';status.errors.push('HQ fountain did not instantiate. Check Draco, GLB URL, WebGL console.');
    }else{
      status.fountain='GLB_VISIBLE';
      status.fountainRenders=root.findComponents('render').length;
      status.fountainClip=fountain.querySelector('pc-anim')?.clips||[];
      status.waterMaterials=animateWater(app,root);
      if(!status.fountainClip.length){
        for(let i=0;i<80;i++){
          await sleep(100);
          status.fountainClip=fountain.querySelector('pc-anim')?.clips||[];
          if(status.fountainClip.length)break;
        }
      }
      status.fountain=status.fountainClip.length===1?'ANIMATED_8S':'ERROR_ANIMATION_NOT_PLAYING';
      if(status.fountain!=='ANIMATED_8S')status.errors.push('Fountain: 8s clip unavailable. Do not claim animation success.');
      status.fountainPosition=(()=>{const p=fountain.entity?.getPosition();return p?[p.x,p.y,p.z]:null})();
    }
    emit();
    // Forge model is deferred until choosing Herrero; poll without guessing.
    for(let i=0;i<240;i++){
      if(forge.contentEntity?.findComponents('render')?.length)break;
      await sleep(250);
    }
    const forgeRoot=forge.contentEntity;
    if(!forgeRoot?.findComponents('render')?.length){
      status.forge='WAITING_FOR_HERRERO_OR_ASSET';
    }else{
      status.forge='GLB_VISIBLE';
      status.forgeRenders=forgeRoot.findComponents('render').length;
      status.forgeEmissiveZones=animateForge(app,forgeRoot);
      if(!status.forgeEmissiveZones){
        status.forge='VISIBLE_NO_EMISSIVE_ZONES';
        status.errors.push('V038 forge has no cracked ember material');
      }
      status.forgePosition=(()=>{const p=forge.entity?.getPosition();return p?[p.x,p.y,p.z]:null})();
    }
    emit();
    const onUpdate=()=>{status.frames++};
    app.on('update',onUpdate);
    window.addEventListener('pagehide',()=>app.off('update',onUpdate),{once:true});
  }catch(err){status.errors.push(String(err?.stack||err));emit()}
})();
