/* Project Genesis V015 — Arrival to Ordan. Coordinates follow village_plan.js
 * roads and pass around the original 4.26 m dolphin fountain, not through it.
 * Pure route controller: testable in Node and independent from PlayCanvas.
 */
(function(global){
'use strict';
const SPAWN=Object.freeze([7,29]);
const DESTINATION=Object.freeze([1.72,3.50]); // 1.60 m in front of original Ordan.
const WAYPOINTS=Object.freeze([
 [7,24],[9.7,21.5],[9.7,15.5],[9.7,10.8],
 [7,8.2],[7,4.3],[3,3.5],DESTINATION
]);
const EPS=.0001;
function create({start=SPAWN,waypoints=WAYPOINTS,speed=2.9}={}){
 if(!Array.isArray(start)||start.length!==2||!Number.isFinite(speed)||speed<=0)
  throw Error('V015: invalid arrival coordinates or speed');
 const points=waypoints.map(p=>[+p[0],+p[1]]);
 let x=+start[0],z=+start[1],yaw=0,target=0,complete=false,meters=0;
 const travelled=()=>meters;
 function step(dt){
  if(complete)return snapshot();
  let remaining=Math.max(0,Math.min(1.25,dt||0))*speed,iterations=0;
  while(remaining>EPS&&target<points.length&&iterations++<=points.length+1){
   const [tx,tz]=points[target],dx=tx-x,dz=tz-z,dist=Math.hypot(dx,dz);
   if(dist<=EPS){x=tx;z=tz;target++;continue}
   const travel=Math.min(dist,remaining);
   x+=dx/dist*travel;z+=dz/dist*travel;
   yaw=Math.atan2(dx,dz)*180/Math.PI;remaining-=travel;meters+=travel;
   if(dist-travel<=EPS){x=tx;z=tz;target++}
  }
  if(target>=points.length)complete=true;
  return snapshot();
 }
 function finish(){
  const [fx,fz]=points[points.length-1];x=fx;z=fz;target=points.length;complete=true;
  return snapshot();
 }
 function snapshot(){return {active:!complete,completed:complete,position:[x,0,z],yaw,
  waypoint:target,totalWaypoints:points.length,meters:travelled(),speed,animation:complete?'Idle_Loop':'Walk_Loop'};
 }
 return Object.freeze({step,finish,snapshot});
}
const api=Object.freeze({create,spawn:SPAWN,destination:DESTINATION,waypoints:WAYPOINTS});
global.GenesisVillageArrivalV015=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
