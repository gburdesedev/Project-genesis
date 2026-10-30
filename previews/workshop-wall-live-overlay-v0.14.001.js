/* Project Genesis / Preview v0.14.001 - REAL PlayCanvas wall candidates.
 * Only injected into previews/talleres-herrero-arcanista-v0.14.001.html.
 * Never modifies approved production menu art, quests, the V027 arcane door,
 * collisions or source workshop GLBs.
 */
const SOURCE_ROOT='https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/feature/playcanvas-herrero-arcanista-walls-preview/public/models/';
const WALLS={
  Herrero:{name:'Herrero V006',url:SOURCE_ROOT+'Wall_Herrero_V006_PlayCanvas_Preview.glb',x:-1.10,z:.43},
  Arcanista:{name:'Arcanista V005',url:SOURCE_ROOT+'Wall_Arcanista_V005_PlayCanvas_Preview.glb',x:0,z:.43}
};
const FORGE_URL=SOURCE_ROOT+'Forge_V038_HeaderFixed_Preview.glb';
const preview={version:'v0.14.001',status:'initializing',models:{},placed:[],forge:{phase:'checking'},errors:[]};
globalThis.__genesisWallWorkshopPreview=preview;
const emit=()=>{if(parent!==window)parent.postMessage({kind:'genesisWorkshopWallPreview',data:JSON.parse(JSON.stringify(preview))},location.origin)};
function walk(entity,fn){if(!entity)return;fn(entity);for(const child of entity.children||[])walk(child,fn)}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function readyApp(){
 for(let i=0;i<150;i++){
  const el=document.querySelector('pc-app');
  const app=el?.app||el?.application;
  if(app?.root&&app?.assets)return app;
  await delay(300);
 }
 throw Error('El juego no expuso una instancia de PlayCanvas.');
}
function loadGLB(app,url){
 return new Promise((resolve,reject)=>app.assets.loadFromUrl(url,'container',(error,asset)=>{
  if(error||!asset?.resource)return reject(Error(String(error||'GLB sin recurso: '+url)));
  resolve(asset.resource);
 }));
}
function prepareVisual(resource,name){
 const visual=resource.instantiateRenderEntity();visual.name=name;
 for(const renderer of visual.findComponents('render')){
  renderer.castShadows=true;renderer.receiveShadows=true;
 }
 return visual;
}
function isActive(entity){
 for(let x=entity;x;x=x.parent)if(x.enabled===false)return false;
 return true;
}
// This inserts a new 3D model next to the existing original shell. Only
// the front facade plaster and original giant arch are visually disabled.
// The original physical collision and accepted door are untouched.
function mountWall(resource,parent,kind,role){
 const data=WALLS[kind],tag='WALL_PREVIEW_'+kind;
 if(parent.findByName(tag))return false;
 const wall=prepareVisual(resource,tag);
 wall.setLocalPosition(data.x,0,data.z);
 wall.setLocalScale(12/7.875,1,1); // old shell is 12 Blender units wide
 parent.addChild(wall);
 // Cover selected old front stone with the new masonry; do not hide
 // the side walls, roof, door or colliders.
 let oldFacade=0;
 walk(parent,child=>{
  if(child===wall||child.name===tag||child.name.startsWith('ASSET_'))return;
  const n=child.name||'';
  if(/^fac_plaster_/.test(n)||/^archstone_\\d+$/.test(n)||n==='fac_header'){
   child.enabled=false;oldFacade++;
  }
 });
 preview.placed.push({profession:kind,role,facadePiecesHidden:oldFacade,active:isActive(parent)});
 return true;
}
function findModelHolder(){
 const byId=['forgeModel','forgeModelEntity','forgeRoot','forgeEntity','forgeContainer','forgeV038','furnaceModel','fraguaModel'];
 for(const id of byId){const node=document.getElementById(id)?.entity;if(node)return {node,id}}
 const all=document.querySelectorAll('[id]');
 for(const element of all){
  if(!/forge|fragua|furnace/i.test(element.id)||!/model|entity|root/i.test(element.id))continue;
  if(element.entity)return {node:element.entity,id:element.id};
 }
 return null;
}
// Only experimental comparison: the V038 GLB has static emissive textures.
// Its artist-authored 4-second breathing cycle must run in PlayCanvas.
function startForgeV038Breathing(app,visual){
  const materialMap=new Map(),materials=[];
  for(const render of visual.findComponents('render')){
    for(const meshInstance of render.meshInstances||[]){
      const source=meshInstance.material;
      if(!source?.name?.includes('forge_cracked_hot_charcoal_ember_map')||!source.clone)continue;
      let mat=materialMap.get(source);
      if(!mat){
        mat=source.clone();mat.name=source.name+'_v038_breathing';
        materialMap.set(source,mat);materials.push(mat);
      }
      meshInstance.material=mat;
    }
  }
  if(!materials.length){
    preview.errors.push('V038 no expone zonas de carbón emisivo para animar');
    emit();return;
  }
  let t=0;
  const light=document.getElementById('forgeCoreLight')?.component;
  const bounce=document.getElementById('forgeBounceLight')?.component;
  const update=dt=>{
    // Tutorial controls when the forge is lit. Do not ignite it by preview.
    const lit=!!(light&&light.intensity>.3);
    if(lit)t+=Math.max(0,dt);
    // 0.68 > 1.32 > 0.68, symmetric 4s cycle, smooth at both ends.
    const pulse=.68+.64*(.5-.5*Math.cos(t*Math.PI*.5));
    for(const mat of materials){
      mat.emissiveIntensity=lit?28*pulse:.06;
      mat.update();
    }
    // Coherent light and emissive in this test, no fast independent strobe.
    if(lit&&light)light.intensity=3.45*pulse;
    if(lit&&bounce)bounce.intensity=.96*pulse;
  };
  app.on('update',update);
  preview.forge.breathing={periodSeconds:4,materialZones:materials.length,activation:'tutorial forge light'};
  emit();
  window.addEventListener('pagehide',()=>{
    app.off('update',update);
    for(const material of materials)material.destroy();
  },{once:true});
}
\nasync function inspectForge(app){
 const comparing=location.pathname.includes('/forge-v038-fixed-preview.html');
 const candidate=findModelHolder();
 preview.forge={phase:comparing?'cargando V038 para montaje':'comprobando V038',
   id:candidate?.id||null,v038Url:FORGE_URL,
   mode:comparing?'prueba visual aislada':'juego principal conservado'};
 emit();
 try{
  // The previous preview downloaded the V038 GLB but never instantiated it
  // as visible geometry. Mount the repaired resource only in comparison mode.
  const resource=await loadGLB(app,FORGE_URL);
  preview.forge.v038ResourceReady=!!resource;
  if(!comparing){
   preview.forge.phase='GLB verificado; sin modificar juego principal';
   emit();return;
  }
  const visual=prepareVisual(resource,'FORGE_V038_VISUAL_PREVIEW');
  const components=visual.findComponents('render');
  const meshes=components.reduce((n,comp)=>n+(comp.meshInstances?.length||0),0);
  preview.forge.meshes=meshes;
  preview.forge.renderComponents=components.length;
  if(!meshes){
   visual.destroy();
   throw Error('GLB cargado, pero no tiene mallas renderizables');
  }
  let attempts=0,mounted=false;
  const mount=()=>{
   const modelEl=document.getElementById('forgeModel');
   const anchor=modelEl?.entity;
   if(!anchor||!anchor.parent){
    if(++attempts>=120){
     clearInterval(watcher);
     preview.forge.phase='sin anclaje del taller';
     preview.errors.push('No apareció la entidad #forgeModel durante 30 segundos');
     visual.destroy();emit();
    }
    return;
   }
   if(!mounted){
    // Use the approved forgeModel anchor: its scene coordinates, local
    // scale and workshop transforms are inherited without guessing.
    anchor.addChild(visual);
    visual.setLocalPosition(0,0,0);
    visual.setLocalEulerAngles(0,0,0);
    visual.setLocalScale(1,1,1);
    mounted=true;\n    startForgeV038Breathing(app,visual);\n   }
   // Disable only duplicate original visual content, never its gameplay
   // host, collision, forge UI, interactive trigger or scripted light.
   const old=modelEl.contentEntity;
   if(old&&old!==anchor&&old!==visual&&old.enabled)old.enabled=false;
   const enabled=(()=>{for(let p=visual;p;p=p.parent)if(!p.enabled)return false;return true})();
   preview.forge.phase=enabled?'V038 montada en fragua ('+meshes+' mallas)':'V038 montada, pero su jerarquia está desactivada';
   preview.forge.anchor={name:anchor.name,worldPosition:(()=>{
      const p=anchor.getPosition();return [p.x,p.y,p.z].map(n=>+n.toFixed(3))})(),
      scale:(()=>{const s=anchor.getLocalScale();return [s.x,s.y,s.z].map(n=>+n.toFixed(3))})()};
   preview.forge.instance=visual.name;
   emit();
   if(attempts++>=45)clearInterval(watcher);
  };
  const watcher=setInterval(mount,250);
  mount();
  window.addEventListener('pagehide',()=>clearInterval(watcher),{once:true});
 }catch(error){
  preview.forge.phase='error V038';
  preview.forge.error=String(error?.message||error);
  preview.errors.push('Fragua V038: '+preview.forge.error);
  emit();
 }
}
(async()=>{
 try{
  const app=await readyApp();
  preview.status='loading geometry';emit();
  const resources={};
  await Promise.all(Object.entries(WALLS).map(async ([name,entry])=>{
   try{resources[name]=await loadGLB(app,entry.url);preview.models[name]='ready'}
   catch(error){preview.models[name]='failed';preview.errors.push(name+': '+String(error))}
   emit();
  }));
  // Main village is mounted asynchronously. Active workshop entity is
  // instantiated by the accepted gameplay scene when a profession starts.
  const mounted=new WeakMap();
  const refresh=()=>{
   const active=document.getElementById('compactBlacksmithRoot')?.entity;
   if(active&&resources.Herrero&&!mounted.has(active)){
    mountWall(resources.Herrero,active,'Herrero','tutorial activo');
    mounted.set(active,true);
   }
   for(const name of ['Herrero','Arcanista']){
    const proxy=app.root.findByName(name+' · fachada cerrada');
    if(proxy&&resources[name]&&!mounted.has(proxy)){
     mountWall(resources[name],proxy,name,'aldea');
     mounted.set(proxy,true);
    }
   }
   preview.status='running';emit();
  };
  refresh();
  const watcher=setInterval(refresh,2000);
  window.addEventListener('pagehide',()=>clearInterval(watcher),{once:true});
  inspectForge(app).catch(error=>{preview.errors.push(String(error));emit()});
 }catch(error){
  preview.status='error';preview.errors.push(String(error?.stack||error));emit();
 }
})();
