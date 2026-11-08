'use strict';
// Current V014.038 rules, not the obsolete V014.022 metadata/single-file cinema assertions.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),os=require('node:os');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('index.html'),world=read('village_world.js'),market=read('genesis_market_v001.js');
const quest=require('../genesis_market_quest_v001.js');
const cinema=require('../genesis_market_cinematic_v001.js');
const arrival=require('../v015/canvas-arrival-v016.js');
for(const token of [
 '<title>Project Genesis v0.14.038 · Build 20261108.08',
 'id="brand">PROJECT GENESIS · v0.14.038 · BUILD 20261108.08',
 'content="playcanvas-v0.14.038-build-20261108.08',
 'startInitialArrival(){','updateInitialArrival(dt,now)','window.__GenesisArrivalQA=',
 'startOrdanMarketEscort(){','updateOrdanMarketEscort(dt,now)','finishOrdanMarketCinematic(now)',
 'window.__GenesisMarketCinematicQA=',
 'genesis_arrival_v014037.css','genesis_market_cinematic_v001.css',
 'genesis_market_cinematic_v001.js','v015/canvas-arrival-v016.js'
])assert(html.includes(token),'Missing integrated V038: '+token);
for(const token of ['mountVillageTrees','mountGenesisDolphinFountain','mountClosedWorkshopsV014036','trees.blocked','fountain.blocked'])
 assert(world.includes(token),'World V038 missing '+token);
for(const filename of ['village_trees.js','village_fountain_v014034.js','village_workshops_v014036.js',
 './assets/playcanvas/approved/characters/merchant_v02_75962.glb',
 './assets/vendor/genesis/externals/genesisFountainV011HQAsset/src/PG_Dolphin_Fountain_V011_PlayCanvas_HQ_Optimized.glb'])
 assert(fs.existsSync(path.resolve(root,filename)),filename+' not found');
assert(market.includes("merchant_v02_75962.glb"),'Merchant V02 must be actual approved GLB, not placeholder');
assert(market.includes("visual.phase='ready'")&&market.includes('if(!instances.length)'), 'Merchant V02 must verify renderer before removing fallback');
assert.deepEqual(quest.steps,{talk:11.25,escort:11.5,shop:11.75},'Ordan tutorial steps changed');
assert(quest.escortPath.length>=9,'Ordan route truncated');
const realRoute=cinema.routeAroundPlazaFountain(quest.escortPath);
assert(realRoute.length>quest.escortPath.length,'V038 cinema did not detour around fountain');
for(let i=0;i<realRoute.length-1;i++){
 const a=realRoute[i],b=realRoute[i+1],dx=b.x-a.x,dz=b.z-a.z;
 const u=Math.max(0,Math.min(1,((7-a.x)*dx+(16-a.z)*dz)/(dx*dx+dz*dz||1)));
 assert(Math.hypot(a.x+dx*u-7,a.z+dz*u-16)>2.1,
  'Ordan cinematic intersects real V011 fountain at segment '+i);
}
const tracks=cinema.create({x:1.72,z:2.75},{x:1.72,z:1.9},quest.escortPath);
for(let i=0;i<=100;i++){
 const pose=cinema.pose(tracks,tracks.player.total*i/100);
 assert(Number.isFinite(pose.player.x)&&Number.isFinite(pose.mentor.z)&&Number.isFinite(pose.player.yaw));
}
const end=cinema.pose(tracks,tracks.player.total);
assert(end.complete&&Math.hypot(end.player.x-24.25,end.player.z-35.15)<.1,'Merchant route ends incorrectly');
let position=[0,0,0],clip='';
const avatar={setPosition:(x,y,z)=>position=[x,y,z],getPosition:()=>({x:position[0],y:position[1],z:position[2]}),setEulerAngles(){}};
const intro=arrival.create({artisan:avatar,game:{step:()=>0},playAnimation:x=>clip=x});
assert(intro.begin());
for(let i=0;i<1200&&intro.active;i++)intro.update(.05);
assert.equal(intro.state,'arrived','Intro V016 never arrived');
assert(intro.snapshot().ordanDistance<2.2,'Intro did not stop close to Ordan');
assert.equal(clip,'Idle_Loop');
// Regression: 3 FPS would make the old 0.1-second cap take over half a minute
// for a 9-second walk. This cinematic must follow wall-clock progress.
position=[0,0,0];
const lowFpsArrival=arrival.create({artisan:avatar,game:{step:()=>0},playAnimation:x=>clip=x});
assert(lowFpsArrival.begin());
for(let i=0;i<25&&lowFpsArrival.active;i++)lowFpsArrival.update(.45);
assert.equal(lowFpsArrival.state,'arrived','V016 animation stalls when WebGL FPS drops to 2-3');

const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m=>m[1].includes('type="module"')&&m[2].trim());
assert(scripts.length>0,'No game entry module');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'genesis-038-check-'));
try{
 for(let i=0;i<scripts.length;i++){
  const file=path.join(temp,'script'+i+'.mjs');
  fs.writeFileSync(file,scripts[i][2]);
  cp.execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
 }
}finally{fs.rmSync(temp,{recursive:true,force:true})}
console.log('PASS_V014038_CURRENT_CONTRACT',JSON.stringify({
 build:'20261108.08',trees:14,workshops:5,
 merchant:'approved V02',fountain:'approved V011 HQ',intro:'V016',arrivalDistance:intro.snapshot().ordanDistance,
 marketPathMeters:+tracks.player.total.toFixed(2),fountainBypassSegments:realRoute.length-quest.escortPath.length,
 gameModuleScripts:scripts.length
}));
