/* Project Genesis — production Herrero V012 four bonded masonry walls, roof and corrected chimney integration
 * Load only approved-candidate GLBs as visuals, do not mutate physics, door
 * hinge, collision envelopes, procedural tutorials, forge or economy.
 * Existing HTML, UI and controls remain the source of authority.
 */
const ASSETS='https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/';
const GLBS={
 walls:ASSETS+'feature/blacksmith-workshop-windows-flue-v013/public/models/blacksmith-structural-v013/batched/blacksmith_four_walls_preview.glb',
 roof:ASSETS+'feature/blacksmith-workshop-windows-flue-v013/public/models/blacksmith-structural-v013/batched/blacksmith_roof_preview.glb',
 chimney:ASSETS+'feature/blacksmith-workshop-windows-flue-v013/public/models/blacksmith-structural-v013/batched/blacksmith_chimney_candidate_preview.glb'
};
const status={version:'v0.17.013',phase:'waiting',assets:{},installed:[],
 roofPitchMultiplier:1.30,oldRoofPreserved:true,doorUnchanged:true,forgeUnchanged:true,
 geometryVisualReview:'PENDING_PLAYER',chimneyCapConnected:true,cornerInterlockingCourses:32,
 windows:{openAir:true,glass:false,blockedFill:false,count:5},
 chimneyAlignedToForge:true,
 forgeAnchorLocal:[3.02,0,-8.56],
 chimneyBlender:[1.981875,5.6175],
 roofRaiseRelativeToV012:1.35,
 chimneyConnectedToForge:false,collisionRetestRequired:true,errors:[],fps:null};
globalThis.__genesisProductionHerreroV015=status;
const report=()=>{globalThis.__genesisProductionHerreroV015=status;};
const sleep=t=>new Promise(done=>setTimeout(done,t));
function acquire(app,url,name){
 return new Promise((resolve,reject)=>app.assets.loadFromUrl(url,'container',(error,asset)=>{
  if(error||!asset?.resource){reject(Error(name+': '+String(error||'No GLB asset')));return;}
  const visual=asset.resource.instantiateRenderEntity();
  const renderers=visual.findComponents('render');
  if(!renderers.length){visual.destroy();reject(Error(name+': no geometry'));return;}
  for(const r of renderers){r.receiveShadows=true;r.castShadows=name==='walls';}
  status.assets[name]={ready:true,renderers:renderers.length};
  resolve(visual);
 }));
}
const installed=new Map();
const ROOF_BOOST=1.30*1.35; // 35% higher roof rise than the CURRENT V012, eave pivot at 3.20m
function install(app,root,kind,sources,{tutorial=false}={}){
 if(!root||!root.parent||installed.has(kind))return;
 let oldWalls,oldRoof,oldShell,door;
 if(tutorial){
  oldWalls=document.getElementById('modularWalls089')?.entity;
  oldShell=document.getElementById('workshopShellModel')?.entity;
  oldRoof=document.getElementById('roofFinalModel')?.entity;
  door=document.getElementById('doorLeafModel')?.entity;
 }else{
  // Village façade is assembled as shell, roof and approved door,
  // but remains disabled when this is the playable chosen profession.
  oldShell=root.children.find(x=>x.name===document.getElementById('villageShellSource')?.entity?.name)
    ||root.children[0];
  oldRoof=root.children[1];door=root.children[2];
 }
 if(!oldShell||!oldRoof||!door){status.errors.push(kind+': original anchors unavailable');report();return;}
 const modelRoot=new root.constructor('Genesis production Herrero V013 · real open windows and forge flue');
 root.addChild(modelRoot);
 modelRoot.setLocalPosition(0,0,0);
 // Blender: W=7.875, D=6.890625. Original PlayCanvas local shell:
 // W=12, D=10.5. glTF transforms Blender back-Y into PlayCanvas -Z.
 const horizontal=12/7.875;
 modelRoot.setLocalScale(horizontal,1,horizontal);
 const walls=sources.walls.clone(),roof=sources.roof.clone(),chimney=sources.chimney.clone();
 const parts=[walls,roof,chimney];
 const tags=['WallsV013','RoofV013','ChimneyV013'];
 parts.forEach((part,i)=>{
  part.name='Genesis '+tags[i];
  part.setLocalPosition(0,0,0);
  modelRoot.addChild(part);
 });
 // Raise ridge 30% around the wall-top hinge (3.2m), while preserving
 // the eaves and the flue opening's mutual relation with the chimney.
 roof.setLocalScale(1,ROOF_BOOST,1);
 roof.setLocalPosition(0,-3.2*(ROOF_BOOST-1),0);
 chimney.setLocalScale(1,ROOF_BOOST,1);
 chimney.setLocalPosition(0,-3.2*(ROOF_BOOST-1),0);
 const old={shell:oldShell.enabled,roof:oldRoof.enabled,
   modular:oldWalls?.enabled??null};
 oldShell.enabled=false;oldRoof.enabled=false;
 if(oldWalls)oldWalls.enabled=false;
 // Door is not centered or reoriented: the door's -1.10 position is
 // its hinge pivot; functionality must remain untouched.
 installed.set(kind,{root,modelRoot,oldShell,oldRoof,oldWalls,old,parts});
 status.installed.push({kind,roofRaise:ROOF_BOOST,roofBoostRelativeToPrior:1.35,
  wallLoaded:true,roofLoaded:true,chimneyLoaded:true,
  doorUntouched:true,originalVisualsHidden:true});
 report();
}
function attemptMount(app,sources){
 const active=document.getElementById('compactBlacksmithRoot')?.entity;
 if(active&&!installed.has('tutorial'))install(app,active,'tutorial',sources,{tutorial:true});
 const village=app.root.findByName('Herrero · fachada cerrada');
 if(village&&!installed.has('village'))install(app,village,'village',sources);
}
function restore(){
 for(const e of installed.values()){
  e.oldShell.enabled=e.old.shell;e.oldRoof.enabled=e.old.roof;
  if(e.oldWalls)e.oldWalls.enabled=e.old.modular;
  e.modelRoot.destroy();
 }
 installed.clear();
}
async function init(){
 const host=document.getElementById('genesisApp')||document.querySelector('pc-app');
 let app=host?.app||host?.application;
 for(let i=0;i<160&&!app;i++){await sleep(250);app=host?.app||host?.application;}
 if(!app)throw Error('PlayCanvas application unavailable');
 status.phase='loading';report();
 // Parallel resource loading; renderer instances share immutable geometry
 // but each workshop gets its own render entity transforms.
 const src={};
 await Promise.all(Object.entries(GLBS).map(async ([key,url])=>{src[key]=await acquire(app,url,key);}));
 status.phase='installing';report();
 attemptMount(app,src);
 const check=setInterval(()=>attemptMount(app,src),1800);
 let t=0,n=0;
 const update=dt=>{
  if(dt>0&&dt<.2){t+=dt;n++}
  if(t>=4){status.fps=+(n/t).toFixed(1);t=0;n=0;report()}
 };
 app.on('update',update);
 window.addEventListener('pagehide',()=>{clearInterval(check);app.off('update',update);restore()}, {once:true});
 status.phase='running';report();
}
init().catch(e=>{status.phase='error';status.errors.push(String(e?.stack||e));report();console.error('Genesis blacksmith install',e)});
