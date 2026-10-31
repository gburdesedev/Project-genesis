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
function installAt(scene,kind,models,{replace=true,tutorial=false}={}){
 if(mounted.has(kind)||!scene?.parent)return;
 let shell,oldRoof,originalDoor,modular=null;
 if(tutorial){
   shell=document.getElementById('workshopShellModel')?.entity;
   oldRoof=document.getElementById('roofFinalModel')?.entity;
   originalDoor=document.getElementById('doorLeafModel')?.entity;
   modular=document.getElementById('modularWalls089')?.entity;
 }else{
   [shell,oldRoof,originalDoor]=scene.children;
 }
 PREVIEW.debug[kind+'Children']=(scene.children||[]).map(c=>({name:c.name,render:!!c.render,children:c.children.length})).slice(0,25);
 if(!shell||!oldRoof||!originalDoor){
   PREVIEW.errors.push(kind+': falta shell/techo/puerta original, no se reemplazó');
   status();return;
 }
 const group=new scene.constructor('GENESIS_HERRERO_WORKSHOP_V011');
 scene.addChild(group);
 // Horizontal map conversion: V010/V011 Blender W=7.875, D=6.890625
 // versus original in-game W=12, D=10.5. Y stays in scene meters.
 const scale=12/7.875;group.setLocalScale(scale,1,scale);
 const walls=cloneNode(models.walls),roof=cloneNode(models.roof),chimney=cloneNode(models.chimney);
 for(const [ent,tag] of [[walls,'walls'],[roof,'roof'],[chimney,'chimney']]){
  ent.name='GENESIS_HERRERO_'+tag.toUpperCase()+'_V011';
  ent.setLocalPosition(0,0,0);group.addChild(ent);
 }
 roof.enabled=PREVIEW.roofVisible;
 chimney.enabled=PREVIEW.roofVisible&&PREVIEW.chimneyVisible;
 const old={shellEnabled:shell.enabled,roofEnabled:oldRoof.enabled,
   modularEnabled:modular?.enabled};
 if(replace){shell.enabled=false;oldRoof.enabled=false;if(modular)modular.enabled=false}
 // The door's -1.1 X is its approved HINGE anchor, not an off-center
 // doorway! Keep this pivot and all interactive behaviour untouched.
 const bundle={group,walls,roof,chimney,shell,oldRoof,originalDoor,modular,old};
 mounted.set(kind,bundle);
 PREVIEW.installations.push({scene:kind,active:chainEnabled(scene),
  originalShellHidden:replace,originalRoofHidden:replace,
  originalModularHidden:replace&&!!modular,
  originalDoorPivotPreserved:true,
  collision:'PENDING_TEST',
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
 PREVIEW.debug.tutorialChildren=active?.children?.map(c=>({name:c.name,children:c.children.length})).slice(0,18)||[];
 if(active&&!mounted.has('tutorial'))installAt(active,'tutorial',resources,{tutorial:true});
 for(const [kind,b] of mounted){
  const item=PREVIEW.installations.find(x=>x.scene===kind);
  if(item)item.active=chainEnabled(b.group);
 }
}
function toggle({roof,chimney,oldShell}={}){
 if(typeof roof==='boolean')PREVIEW.roofVisible=roof;
 if(typeof chimney==='boolean')PREVIEW.chimneyVisible=chimney;
 for(const [kind,b] of mounted){
  b.roof.enabled=PREVIEW.roofVisible;
  b.chimney.enabled=PREVIEW.roofVisible&&PREVIEW.chimneyVisible;
  if(typeof oldShell==='boolean'){
    b.shell.enabled=oldShell;b.oldRoof.enabled=oldShell;if(b.modular)b.modular.enabled=oldShell;
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
  if(b.modular)b.modular.enabled=b.old.modularEnabled;
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
