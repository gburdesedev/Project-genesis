'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const world=fs.readFileSync(path.join(root,'village_world.js'),'utf8');
const quest=require('../genesis_market_quest_v001.js');
const arrival=require('../v015/canvas-arrival-v016.js');
assert.match(html,/<title>Project Genesis v0\.14\.038 · Build 20261108\.08/);
assert(html.includes('id="brand">PROJECT GENESIS · v0.14.038 · BUILD 20261108.08'));
assert(html.includes('content="playcanvas-v0.14.038-build-20261108.08'));
assert(world.includes("const version='v0.14.038', build='20261108.08'"));
for(const x of ['v015/canvas-arrival-v016.js','genesis_arrival_v014037.css','genesisArrivalLetterbox','startAutonomousArrivalV014038','!genesisArrival?.active','genesisArrival.update(dt)'])assert(html.includes(x),'Cinematic not wired into live game: '+x);
for(const x of ['mountVillageTrees','mountGenesisDolphinFountain','mountClosedWorkshopsV014036'])assert(world.includes(x),'Cumulative world omits '+x);
for(const x of ['village_trees.js','village_fountain_v014034.js','village_workshops_v014036.js','genesis_market_v001.js'])assert(fs.existsSync(path.join(root,x)),x+' absent');
const pathPoints=quest.escortPath;
assert(pathPoints.some(p=>p.x===10&&p.z===13)&&pathPoints.some(p=>p.x===10&&p.z===19),'Ordan did not go around fountain');
for(let i=0;i<pathPoints.length-1;i++){
 const a=pathPoints[i],b=pathPoints[i+1];
 const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
 const u=Math.max(0,Math.min(1,((7-a.x)*dx+(16-a.z)*dz)/(den||1)));
 const distance=Math.hypot(a.x+dx*u-7,a.z+dz*u-16);
 assert(distance>2.5,'Ordan passes through fountain collision at '+i+'; d='+distance);
}
let position=[0,0,0],yaw=0,clip=null;
const puppet={setPosition:(x,y,z)=>position=[x,y,z],getPosition:()=>({x:position[0],y:position[1],z:position[2]}),setEulerAngles:(_x,y)=>yaw=y};
const controller=arrival.create({artisan:puppet,game:{step:()=>0},playAnimation:name=>clip=name});
assert(controller.begin());
for(let t=0;t<1600&&controller.active;t++)controller.update(.05);
assert.equal(controller.state,'arrived');
assert(Math.hypot(position[0]-1.29,position[2]-1.425)<2.2,'After automatic V016 walk, Ordan E interaction is too far');
assert.equal(clip,'Idle_Loop');
const blocks=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(x=>x[1].includes('type="module"')&&x[2].trim());
assert(blocks.length>0,'Missing game module script');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'genesis-v038-syntax-'));
try{for(let i=0;i<blocks.length;i++){const f=path.join(folder,'script-'+i+'.mjs');fs.writeFileSync(f,blocks[i][2]);cp.execFileSync(process.execPath,['--check',f],{stdio:'pipe'});}}
finally{fs.rmSync(folder,{recursive:true,force:true});}
console.log('PASS V014038_CUMULATIVE_CONTRACT: version/cache, five workshops, trees, fountain, merchant, V016 walk, Ordan fountain clearance and original module syntax');
