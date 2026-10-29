/* Project Genesis v0.11.017 — approved plaza trees, progressively streamed.
 * Artwork: oak V017, ash V020, linden V022, burgundy maple V021.
 * The art masters are immutable. The v003 LOD1/2 are separate, validated assets.
 * 14 trunks over the 63x63-metre village: 4 in the plaza, 10 along the town and perimeter.
 */
import { Entity } from 'playcanvas';

const REPO = 'https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/94d2fe3262af163d9cd7277cc4e31e20acf3bcaa/';
const TYPES = Object.freeze({
 oak: { label: 'Roble', height: 9.1, master: 'assets/plaza_trees_v017/oak/oak_easytree_v017.glb' },
 ash: { label: 'Fresno', height: 9.7, master: 'assets/plaza_trees_v020/ash/ash_easytree_v020.glb' },
 linden: { label: 'Tilo', height: 8.7, master: 'assets/plaza_trees_v022/linden/linden_easytree_v022.glb' },
 maple: { label: 'Arce rojizo', height: 8.5, master: 'assets/plaza_trees_v021/maple/maple_easytree_v021.glb' }
});
const RAW_SITES = [
 ['oak',2.2,11.7,'plaza'],['maple',11.8,11.7,'plaza'],
 ['linden',2.2,20.3,'plaza'],['ash',11.8,20.3,'plaza'],
 // Ten perimeter and workshop-edge trees keep the town walkable and sightlines open.
 ['oak',-19,-8,'sur'],['ash',25,-8,'sur'],
 ['ash',-21,1,'oeste'],['oak',-21,26,'oeste'],
 ['ash',-12,45,'norte'],['maple',-3,45,'norte'],
 ['linden',35,44,'norte'],['maple',22,6,'sur'],
 ['linden',-8,23,'oeste'],['maple',19,24,'este']
];
export const TREE_SITES = Object.freeze(RAW_SITES.map((item,index)=>Object.freeze({
 id: index+1, species: item[0], x:item[1], z:item[2], region:item[3],
 rotation: (index*137.508)%360, size: 0.90+((index*7)%9)*0.025,
 trunkRadius: 0.43
})));
const assetPath = (species,lod) => REPO + (lod===0
 ? TYPES[species].master
 : 'assets/tree_webgl_v003/'+species+'/lod'+lod+'.glb');
function boundsOf(entity){
 const stack=[entity];let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
 entity.syncHierarchy();
 while(stack.length){
  const node=stack.pop();
  for(const child of node.children)stack.push(child);
  const instances=node.render?.meshInstances || [];
  for(const mi of instances){
   const box=mi.aabb,center=box?.center,half=box?.halfExtents;
   if(!center||!half)continue;
   minX=Math.min(minX,center.x-half.x);minY=Math.min(minY,center.y-half.y);minZ=Math.min(minZ,center.z-half.z);
   maxX=Math.max(maxX,center.x+half.x);maxY=Math.max(maxY,center.y+half.y);maxZ=Math.max(maxZ,center.z+half.z);
  }
 }
 if(!Number.isFinite(minY)||maxY-minY<0.001)return {minX:0,minY:0,minZ:0,maxX:0,maxY:1,maxZ:0};
 return {minX,minY,minZ,maxX,maxY,maxZ};
}
export function mountVillageTrees(app, villageRoot, options={}){
 const safeMobile = globalThis.GenesisDevice?.safePreviews===true;
 const treeRoot=new Entity('Vegetación aprobada — 14 árboles · LOD 0/1/2');
 villageRoot.addChild(treeRoot);
 const nodes=TREE_SITES.map(site=>{
  const anchor=new Entity('Árbol '+site.id+' · '+TYPES[site.species].label+' · '+site.region);
  anchor.setLocalPosition(site.x,0,site.z);anchor.setLocalEulerAngles(0,site.rotation,0);
  treeRoot.addChild(anchor);
  return {site,anchor,visual:null,lod:null,visible:false};
 });
 const ready=new Map(),requested=new Set(),failed=new Set(),queue=[];
 let active=0,focusX=0,focusZ=0,lastUpdate=0;
 const maxConcurrent=safeMobile?1:2;
 const status=()=>({
  planned:nodes.length,plaza:TREE_SITES.filter(p=>p.region==='plaza').length,
  residentVariants:ready.size,failedVariants:failed.size,pendingVariants:queue.length+active,
  visible:nodes.filter(n=>n.visible).length,rendered:nodes.filter(n=>n.visible&&n.visual).length,
  mobile:safeMobile
 });
 function pump(){
  while(active<maxConcurrent&&queue.length){
   const task=queue.shift();active++;
   const url=assetPath(task.species,task.lod);
   app.assets.loadFromUrl(url,'container',(error,asset)=>{
    active--;
    if(error||!asset?.resource){
     failed.add(task.key);
     console.warn('Genesis trees: no se pudo cargar',TYPES[task.species].label,'LOD'+task.lod,error||'sin recurso');
    }else{
     try{
      const prototype=asset.resource.instantiateRenderEntity();
      const dimensions=boundsOf(prototype);
      ready.set(task.key,{prototype,dimensions});
     }catch(err){
      failed.add(task.key);console.warn('Genesis trees: GLB inválido',task.key,err);
     }
    }
    globalThis.__genesisTreeStatus=status();
    pump();
   });
  }
 }
 function request(species,lod){
  if(safeMobile&&lod!==2)return;
  const key=species+':'+lod;
  if(ready.has(key)||requested.has(key)||failed.has(key))return;
  requested.add(key);queue.push({key,species,lod});pump();
 }
 function install(node,lod){
  if(node.lod===lod)return;
  const model=ready.get(node.site.species+':'+lod);
  if(!model)return;
  const {dimensions,prototype}=model,visual=prototype.clone();
  const sourceHeight=dimensions.maxY-dimensions.minY;
  const intended=TYPES[node.site.species].height*node.site.size*(node.site.region==='plaza'?.86:1);
  const scale=intended/Math.max(.01,sourceHeight);
  visual.setLocalScale(scale,scale,scale);
  visual.setLocalPosition(-(dimensions.minX+dimensions.maxX)*.5*scale,-dimensions.minY*scale,-(dimensions.minZ+dimensions.maxZ)*.5*scale);
  node.anchor.addChild(visual);
  if(node.visual)node.visual.destroy();
  node.visual=visual;node.lod=lod;
  const stack=[visual];while(stack.length){
   const entity=stack.pop();for(const child of entity.children)stack.push(child);
   if(entity.render)entity.render.castShadows=!safeMobile&&lod<2;
  }
 }
 function update(x=focusX,z=focusZ,force=false){
  const now=performance.now();
  if(!force&&now-lastUpdate<450)return;
  lastUpdate=now;focusX=x;focusZ=z;
  const sorted=[...nodes].sort((a,b)=>Math.hypot(a.site.x-x,a.site.z-z)-Math.hypot(b.site.x-x,b.site.z-z));
  const maximum=safeMobile?37:56;
  for(const node of sorted){
   const d=Math.hypot(node.site.x-x,node.site.z-z);
   node.visible=d<maximum;
   node.anchor.enabled=node.visible;
   if(!node.visible)continue;
   const goal=safeMobile?2:d<10?0:d<23?1:2;
   request(node.site.species,2);
   if(ready.has(node.site.species+':2')&&goal<=1)request(node.site.species,1);
   if(ready.has(node.site.species+':1')&&goal===0)request(node.site.species,0);
   const available=goal===0?[0,1,2]:goal===1?[1,2]:[2];
   for(const candidate of available)if(ready.has(node.site.species+':'+candidate)){
    install(node,candidate);break;
   }
  }
  globalThis.__genesisTreeStatus=status();
 }
 update(0,0,true);
 return Object.freeze({
  root:treeRoot,sites:TREE_SITES,update,status,
  blocked(x,z,r=.33){return TREE_SITES.some(site=>Math.hypot(site.x-x,site.z-z)<site.trunkRadius+r)},
  release(){treeRoot.destroy();queue.length=0}
 });
}
