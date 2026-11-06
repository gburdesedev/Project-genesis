'use strict';
/* Deterministic audit for the original route, exact collision samples, and
   both real characters. This unit audit is not a substitute for browser QA. */
const assert=require('node:assert/strict');
const {create,version}=require('../genesis_market_cinematic_v001.js');
const {escortPath}=require('../genesis_market_quest_v001.js');
assert.equal(version,'MARKET_CINEMATIC_ROUTE_V001');
assert.equal(escortPath.length,10,'Must preserve the ten approved market route points');
const initial={x:.7013660893671663,z:-3.1238787275910678};
const mentor={x:1.2899999618530273,z:-1.065000057220459};
function play(scene,dt=.05){
 let previous=scene.snapshot(),steps=0; const phases=new Set();
 while(steps++<5000){
  let p=scene.tick(dt);phases.add(p.phase);
  assert(p.playerMoved<=3.15*.7+.003,'Artisan teleported between frames');
  assert(p.mentorMoved<=2.40*.7+.003,'Ordan teleported between frames');
  assert(!p.blocked,JSON.stringify(p.blocked));
  if(p.complete){
   assert(p.playerWaypoint===escortPath.length,'Artisan did not walk the full route');
   assert(p.mentorWaypoint===escortPath.length,'Ordan did not walk the full route');
   const merchant={x:25.5,z:36.3};
   assert(Math.hypot(p.player.x-merchant.x,p.player.z-merchant.z)<2.85,'Artisan not within physical merchant interaction radius');
   assert(Math.hypot(p.mentor.x-merchant.x,p.mentor.z-merchant.z)<2.85,'Ordan not at market');
   assert(p.distance>.6&&p.distance<2,'Characters overlap or separate at destination');
   assert(phases.has('walk')&&phases.has('arrived'),'Cinematic did not walk then arrive');
   return {dt,steps,travels:[p.playerTravel,p.mentorTravel],merchantDistance:Math.hypot(p.player.x-merchant.x,p.player.z-merchant.z),finalSpacing:p.distance};
  }
  previous=p;
 }
 throw Error('Cinematic exceeded simulated frame budget');
}
let calls=0;
const open=()=>{calls++;return false};
const speeds=[.016,.05,.23,.70];
const receipts=[];
for(const delta of speeds){
 const director=create({player:initial,mentor,waypoints:escortPath,isBlocked:open});
 receipts.push(play(director,delta));
}
assert(calls>500,'Collision routine was not consulted at intermediate samples');
// Simulate an actual wall across the village route: cannot teleport past it.
const obstacle=create({
 player:initial,mentor,waypoints:escortPath,
 isBlocked:(x,z)=>z>4.9&&z<5.8&&x>6.5&&x<7.5
});
let failure=null;
for(let i=0;i<2000;i++){
 const state=obstacle.tick(.12);
 if(state.blocked){failure=state.blocked;break}
 if(state.complete)throw Error('Player bypassed physical obstacle');
}
assert(failure&&failure.type==='player-collision','Actual blocking segment was ignored');
console.log('CANONICAL_ROUTE_CINEMATIC_STATIC_PASS',JSON.stringify({routeWaypoints:escortPath.length,speeds:receipts,collisionChecks:calls,blockedAsExpected:failure}));
