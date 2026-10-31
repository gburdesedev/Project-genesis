/* Project Genesis, TRUE PlayCanvas V011 blacksmith visual test.
 * Scope: an isolated iframe preview, NOT production index.html, collisions,
 * approved menu design, forge logic, door GLB, or village save data.
 * Uses real Blender GLBs published as recoverable GitHub assets.
 */
const REPO='https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/';
const WALL_URL=REPO+'feature/blacksmith-workshop-walls-v010/public/models/blacksmith-v010/batched/full_workshop_preview.glb';
const ROOF_URL=REPO+'feature/blacksmith-workshop-roof-v011/public/models/blacksmith-roof-v011/blacksmith_roof_preview.glb';
const CHIMNEY_URL=REPO+'feature/blacksmith-workshop-roof-v011/public/models/blacksmith-roof-v011/blacksmith_chimney_candidate_preview.glb';
const PREVIEW={version:'v0.15-herrero-roof',phase:'starting',models:{},installations:[],debug:{},
              roofVisible:true,chimneyVisible:true,errors:[],fps:0,drawCalls:null,
              productionUntouched:true,collisionValidated:false,forgeAligned:false};
globalThis.__genesisBlacksmithRoofPreview=PREVIEW;
function status(){if(parent!==window)parent.postMessage({kind:'genesisBlacksmithRoofV011',data:{
 ...PREVIEW,installations:PREVIEW.installations.map(x=>({...x})),
 errors:PREVIEW.errors.slice(-7)}},location.origin)}
const nap=t=>new Promise(r=>setTimeout(r,t));
async function appReady(){
 for(let i=0;i<150;i++){
  const root=document.querySelector('pc-app');
  const app=root?.app||root?.application;
  if(app?.root&&app?.assets)return app;
  await nap(400);
 }
 throw Error('No apareció la aplicación PlayCanvas del juego');
}
function load(app,url,name){
 return new Promise((resolve,reject)=>app.assets.loadFromUrl(url,'container',(err,asset)=>{
  if(err||!asset?.resource)return reject(Error(name+' GLB: '+String(err||'sin recurso')));
  const entity=asset.resource.instantiateRenderEntity();
  const components=entity.findComponents('render');
  if(!components?.length){entity.destroy();return reject(Error(name+' sin mallas'))}
  for(const comp of components){comp.castShadows=name==='walls';comp.receiveShadows=true}
  const meshes=components.reduce((a,comp)=>a+(comp.meshInstances?.length||0),0);
  entity.name='GENESIS_HERRERO_'+name.toUpperCase()+'_V011';
  PREVIEW.models[name]={loaded:true,renderers:components.length,meshInstances:meshes};
  status();resolve(entity);
 }));
}
function cloneNode(src){const cloned=src.clone();cloned.enabled=true;return cloned}
function chainEnabled(entity){for(let p=entity;p;p=p.parent)if(!p.enabled)return false;return true}
const mounted=new Map();
function installAt(scene,kind,models,{replace=true}={}){
 if(mounted.has(kind)||!scene?.parent)return;
 const [shell,oldRoof,originalDoor]=scene.children;
 PREVIEW.debug[kind+'Children']=(scene.children||[]).map(c=>({name:c.name,hasRender:!!c.render,descendants:c.children.length})).slice(0,22);
 if(!shell||!oldRoof||!originalDoor||shell.render===undefined&&shell.children.length===0){
   PREVIEW.errors.push(kind+': no se reconoció el cascarón original; no se reemplazó');
   return;
 }
 const group=new scene.constructor('GENESIS_HERRERO_WORKSHOP_V011');
 scene.addChild(group);
 const dimensions=12/7.875;
 // Source GLBs are native Blender dimensions, glTF rotates original
 // Blender (X,Y,Z) to PlayCanvas (X,Z,-Y); Y-up is unchanged.
 // Old PlayCanvas shell footprint: 12 by 10.5, while V010/V011
 // measures 7.875 by 6.890625. Scale only the horizontal plane.
 group.setLocalScale(dimensions,1,dimensions);
 const walls=cloneNode(models.walls),roof=cloneNode(models.roof),chimney=cloneNode(models.chimney);
 for(const [entity,tag] of [[walls,'walls'],[roof,'roof'],[chimney,'chimney']]){
   entity.name='GENESIS_HERRERO_'+tag.toUpperCase()+'_V011';
   entity.setLocalPosition(0,0,0);
   group.addChild(entity);
 }
 roof.enabled=PREVIEW.roofVisible;
 chimney.enabled=PREVIEW.roofVisible&&PREVIEW.chimneyVisible;
 // Hide ONLY old visible shell and roof; the approved physical gameplay
 // host, existing forge interaction, doors and input entities stay live.
 const old={shellEnabled:shell.enabled,roofEnabled:oldRoof.enabled,
            door:[originalDoor.getLocalPosition().x,originalDoor.getLocalPosition().y,originalDoor.getLocalPosition().z]};
 if(replace){shell.enabled=false;oldRoof.enabled=false}
 // Existing door uses an off-center -1.1 m anchor; new V010 masonry
 // cutout is centered. Shift door OBJECT only in this experimental scene;
 // never edit the door model or permanent collision definitions.
 originalDoor.setLocalPosition(0,old.door[1],old.door[2]);
 const bundle={group,walls,roof,chimney,shell,oldRoof,originalDoor,old};
 mounted.set(kind,bundle);
 PREVIEW.installations.push({scene:kind,active:chainEnabled(scene),
  originalShellHidden:replace,originalRoofHidden:replace,
  newDoorCenteredInPreview:true,doorGameplayCollision:'NOT_VALIDATED',
  roofEnabled:roof.enabled,chimneyEnabled:chimney.enabled});
 status();
}
function refresh(){
 const app=document.querySelector('pc-app')?.app||document.querySelector('pc-app')?.application;
 if(!app||!globalThis.__genesisWallRoofSources)return;
 const resources=globalThis.__genesisWallRoofSources;
 const village=app.root.findByName('Herrero · fachada cerrada');
 if(village&&!mounted.has('aldea'))installAt(village,'aldea',resources);
 const active=document.getElementById('compactBlacksmithRoot')?.entity;
 PREVIEW.debug.tutorialRoot=active?.name||null;
 PREVIEW.debug.tutorialChildren=active?.children?.map(c=>({name:c.name,hasRender:!!c.render,children:c.children.length})).slice(0,22)||[];
 PREVIEW.debug.villageChildren=village?.children?.map(c=>({name:c.name,hasRender:!!c.render,children:c.children.length})).slice(0,22)||[];
 if(active&&!mounted.has('tutorial')){
  // Active tutorial may contain child interactables after the original
  // workshop shell. Do not disable the whole gameplay root.
  if(active.children.length>=3)installAt(active,'tutorial',resources);
 }
 for(const [kind,b] of mounted){
  const entry=PREVIEW.installations.find(x=>x.scene===kind);
  if(entry)entry.active=chainEnabled(b.group);
 }
}
function toggle({roof,chimney,oldShell}={}){
 if(typeof roof==='boolean')PREVIEW.roofVisible=roof;
 if(typeof chimney==='boolean')PREVIEW.chimneyVisible=chimney;
 for(const [kind,b] of mounted){
  b.roof.enabled=PREVIEW.roofVisible;
  b.chimney.enabled=PREVIEW.roofVisible&&PREVIEW.chimneyVisible;
  if(typeof oldShell==='boolean'){
    b.shell.enabled=oldShell;b.oldRoof.enabled=oldShell;
    b.group.enabled=!oldShell;
  }
  const row=PREVIEW.installations.find(x=>x.scene===kind);
  if(row){
    row.roofEnabled=b.roof.enabled;row.chimneyEnabled=b.chimney.enabled;
    row.originalShellHidden=!b.shell.enabled;row.originalRoofHidden=!b.oldRoof.enabled;
  }
 }
 status();
}
window.addEventListener('message',ev=>{
 if(ev.origin!==location.origin||ev.source!==parent||ev.data?.kind!=='genesisBlacksmithRoofControl')return;
 toggle(ev.data);
});
window.addEventListener('pagehide',()=>{
 for(const b of mounted.values()){
  b.shell.enabled=b.old.shellEnabled;b.oldRoof.enabled=b.old.roofEnabled;
  b.originalDoor.setLocalPosition(...b.old.door);
  b.group.destroy();
 }
 mounted.clear();
},{once:true});
(async()=>{
 try{
  const app=await appReady();
  PREVIEW.phase='loading real 3D assets';status();
  const [walls,roof,chimney]=await Promise.all([
    load(app,WALL_URL,'walls'),load(app,ROOF_URL,'roof'),load(app,CHIMNEY_URL,'chimney')
  ]);
  globalThis.__genesisWallRoofSources={walls,roof,chimney};
  PREVIEW.phase='mounting in actual workshop';
  refresh();
  const interval=setInterval(refresh,1200);
  window.addEventListener('pagehide',()=>clearInterval(interval),{once:true});
  let sum=0,count=0;
  app.on('update',dt=>{
    if(Number.isFinite(dt)&&dt>.001&&dt<.15){sum+=dt;count++}
    if(count>=90){
      PREVIEW.fps=Math.round(90/sum*10)/10;sum=0;count=0;
      const stats=app.stats;
      PREVIEW.drawCalls=stats?.drawCalls?.total??stats?.drawCalls?.forward??null;
      status();
    }
  });
  PREVIEW.phase='scene mounted where available';status();
 }catch(err){PREVIEW.phase='failed';PREVIEW.errors.push(String(err?.stack||err));status()}
})();
