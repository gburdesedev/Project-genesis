/* Project Genesis V015 — autonomous cinematic arrival along the original village plan.
 * Starts at north end of the main paved approach, enters the plaza alongside
 * the original V011 fountain, then follows the Herrero access toward Ordan.
 * No warp-to-Ordan, no new quest, no head/body animation replacement.
 */
(function(root,factory){
 const api=factory();
 root.GenesisCanvasArrivalV015=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 // Source of all landmarks: village_plan.js (plaza 7,16; Smith 0,0; Ordan 1.72,1.90).
 const START=Object.freeze([7,0,31]);
 const WAYPOINTS=Object.freeze([
   [7,27],   // enter north plaza approach
   [5.2,24], // veer west to avoid central dolphin fountain
   [4.3,20],
   [4.3,13],
   [4.3,7],
   [1.72,3.75] // stop close to Ordan, in front of Herrero door
 ].map(x=>Object.freeze(x)));
 const DISTANCE_TO_ORDAN=Math.hypot(1.72-1.72,3.75-1.90);
 function create({artisan,game,playAnimation,announce=()=>{},speed=3.2,onFinish=()=>{}}){
   if(!artisan||!game?.step)throw Error('V015 arrival requires original artisan and Q1–Q3 state machine');
   let state=game.step()===0?'pending':'resumed',point=0,distance=0,elapsed=0,yaw=0;
   const startPos=START.slice(),position=()=>{const p=artisan.getPosition();return [p.x,p.y,p.z]};
   if(state==='pending'){
     artisan.setPosition(...START);artisan.setEulerAngles(0,180,0);
     announce('Llegada a la plaza · caminando hacia Ordan');
   }else artisan.setPosition(0,0,6.3);
   function done(reason='arrived'){
     if(state!=='arriving')return false;
     state=reason;playAnimation?.('Idle_Loop');
     announce('Ordan te espera · acercate y pulsá E');
     onFinish(reason);return true;
   }
   function begin(){if(state!=='pending')return false;state='arriving';return true}
   function update(dt){
     if(state==='pending')return{active:true,state,yaw,animation:'Idle_Loop'};
     if(state!=='arriving')return{active:false,state};
     const step=Math.max(0,Math.min(.1,Number(dt)||0));
     if(!step)return{active:true,state,yaw,animation:'Walk_Loop'};
     elapsed+=step;
     let distanceBudget=speed*step;
     while(distanceBudget>0&&point<WAYPOINTS.length){
       const destination=WAYPOINTS[point],at=artisan.getPosition();
       const dx=destination[0]-at.x,dz=destination[1]-at.z;
       const len=Math.hypot(dx,dz);
       if(len<.015){artisan.setPosition(destination[0],0,destination[1]);point++;continue}
       const stepDist=Math.min(len,distanceBudget),nx=dx/len,nz=dz/len;
       artisan.setPosition(at.x+nx*stepDist,0,at.z+nz*stepDist);
       yaw=Math.atan2(-nx,-nz);
       artisan.setEulerAngles(0,Math.atan2(nx,nz)*180/Math.PI,0);
       distanceBudget-=stepDist;distance+=stepDist;
       if(stepDist>=len-.002){artisan.setPosition(destination[0],0,destination[1]);point++}
     }
     if(point>=WAYPOINTS.length){done();return{active:false,finished:true,state,position:position()}}
     playAnimation?.('Walk_Loop');
     return{active:true,state,waypoint:point,distance,yaw,animation:'Walk_Loop'};
   }
   function skip(){
     if(state==='pending')begin();
     if(state!=='arriving')return false;
     const last=WAYPOINTS[WAYPOINTS.length-1];
     artisan.setPosition(last[0],0,last[1]);point=WAYPOINTS.length;
     return done('skipped');
   }
   return Object.freeze({
     update,begin,skip,position,
     get active(){return state==='pending'||state==='arriving'},
     get state(){return state},
     snapshot:()=>({state,point,totalWaypoints:WAYPOINTS.length,elapsed,distance,position:position(),ordanDistance:Math.hypot(position()[0]-1.72,position()[2]-1.90)})
   });
 }
 return Object.freeze({create,start:START,waypoints:WAYPOINTS,distanceToOrdan:DISTANCE_TO_ORDAN});
});
