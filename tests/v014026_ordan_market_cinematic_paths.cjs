'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const scene=require('../genesis_market_cinematic_v001.js');
const quest=require('../genesis_market_quest_v001.js');
const plan=require('../village_plan.js');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const preparation=fs.readFileSync(path.join(__dirname,'..','preparacion_control.js'),'utf8');
const sampleStart={x:.81,z:-2.85},mentorStart={x:1.29,z:-1.06};
test('preserves canonical ten Ordan waypoints and locally reroutes cinematic around plaza fountain',()=>{
 assert.equal(quest.escortPath.length,10);
 const route=scene.create(sampleStart,mentorStart,quest.escortPath);
 assert(route.mentor.total>55&&route.mentor.total<75,'Expected existing original market waypoint route');
 assert.equal(scene.routeAroundPlazaFountain(quest.escortPath).length,13);
 assert(quest.escortPath.some(p=>p.x===7&&p.z===16),'The original quest file remains unaltered');
 assert(!route.mentor.points.some(p=>p.x===7&&p.z===16),'Cinematic must not pass through fountain model');

 assert(route.player.total>route.mentor.total);
 assert(Math.abs(route.player.total-route.mentor.total-route.entry)<.000001);
 assert(route.entry<2.3,'The cinematic starts after actually talking to Ordan');
 assert(Math.hypot(route.goal.x-25.5,route.goal.z-36.3)<2.85,'End must be inside merchant interaction radius');
 assert.equal(scene.pose(route,0).complete,false);
 assert.equal(scene.pose(route,route.player.total).complete,true);
 assert.equal(scene.pose(route,route.player.total).player.x,quest.escortPath.at(-1).x);
 assert.equal(scene.pose(route,route.player.total).mentor.z,quest.escortPath.at(-1).z);
});
test('cinematic interpolates both characters continuously and avoids the fountain and four plaza trees',()=>{
 const route=scene.create(sampleStart,mentorStart,quest.escortPath), speed=scene.speedMetersPerSecond;
 let prev=scene.pose(route,0);
 let maxStep=0,frames=0;
 for(let p=.15;p<route.player.total;p+=.15){
   const current=scene.pose(route,p);
   for(const name of ['player','mentor']){
     const distance=Math.hypot(current[name].x-prev[name].x,current[name].z-prev[name].z);
     assert(distance<=.151,'Abrupt movement of '+name+' at '+p+' meters: '+distance);
     if(distance>maxStep)maxStep=distance;
     // Travel stays inside 63m village and outside unopened workshop blocks.
     assert(current[name].x>plan.bounds.minX&&current[name].x<plan.bounds.maxX);
     assert(current[name].z>plan.bounds.minZ&&current[name].z<plan.bounds.maxZ);
     assert.equal(plan.blocked(current[name].x,current[name].z,.23),false,name+' walked through a closed workshop');
     const fountainDistance=Math.hypot(current[name].x-7,current[name].z-16);
     assert(fountainDistance>=2.90,name+' clipped the approved fountain at '+JSON.stringify(current[name]));
     // Real approved plaza tree coordinates in village_trees.js.
     for(const [tx,tz] of [[.4,10.7],[11.8,11.7],[2.2,20.3],[11.8,20.3]]){
       assert(Math.hypot(current[name].x-tx,current[name].z-tz)>1.25,name+' clipped a plaza tree at '+tx+','+tz);
     }
   }
   prev=current;frames++;
 }
 assert(frames>300&&maxStep<.16&&speed>3&&speed<4,'Continuous believable fast walk');
 const last=scene.pose(route,route.player.total);
 assert(Math.hypot(last.player.x-last.mentor.x,last.player.z-last.mentor.z)<.01);
});
test('16:9 approved UI and all core game contracts retained; only quest 11.5 cinematic is changed',()=>{
 assert(html.includes("content=\"V014.026\""));
 assert(html.includes('genesis_market_cinematic_v001.css?v=0.14.026'));
 assert(html.includes('genesis_market_cinematic_v001.js?v=0.14.026'));
 assert(html.includes('function startOrdanMarketEscort()'));
 assert(html.includes('engine.create({x:px,z:pz}'));
 assert(html.includes('setTutorialStep(quest.steps.shop)'));
 assert(html.includes('setWalking(!pose.complete,false)'));
 assert(html.includes("!marketCinematic?.active;if(canMove)"));
 assert(html.includes('camYaw=deg(Math.atan2(-dx,-dz))'));
 assert(html.includes("document.body.classList.remove('genesis-market-cinematic')"));
 assert(html.includes('window.__GenesisMarketCinematicQA='));
 assert(!html.includes('distanceToPlayer>6.75'),'Old pause-by-distance should be replaced');
 assert(html.includes('function wallBlocked(')&&html.includes('function updateMercenaryDeparture('));
 assert(html.includes('genesis_market_quest_v001.js?v=0.14.022'));
 assert(preparation.includes('inventario_genesis_16x9.js?v=0.14.024'));
});
