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
async function inspectForge(app){
 const candidate=findModelHolder();
 preview.forge={phase:candidate?'existing-entity-found':'no-entity-found',id:candidate?.id||null,
                v038Url:FORGE_URL,action:'Keeping gameplay and existing model unchanged'};
 emit();
 // Avoid replacing the functional tutorial's forge until the placement and
 // interactive anchors are confirmed. In this preview the existing forge
 // remains intact; model V038 is preflight-tested separately.
 try{
  const resource=await loadGLB(app,FORGE_URL);
  preview.forge.v038ResourceReady=!!resource;
  preview.forge.phase=location.pathname.includes('forge-v038-fixed-preview')?'V038 corregida en juego':'V038 lista para vista comparativa';
 }catch(error){
  preview.forge.phase='V038-download-failed';
  preview.forge.error=String(error?.message||error);
  preview.errors.push('Fragua V038: '+preview.forge.error);
 }
 emit();
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
