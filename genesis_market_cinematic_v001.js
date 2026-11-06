/* Project Genesis | cinematic escort mechanics V001.
 * The actual game supplies its existing Ordan waypoint list and collision
 * callback. Pure path interpolation only: no quest writes or teleports.
 */
(function(root){
 'use strict';
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
 const copy=p=>({x:Number(p.x),z:Number(p.z)});
 const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 function create({player,mentor,waypoints,isBlocked}){
  if(!finite(player)||!finite(mentor)||!Array.isArray(waypoints)||waypoints.length<3||waypoints.some(p=>!finite(p)))
   throw Error('Escort cinematic: coordinates or canonical route unavailable');
  if(typeof isBlocked!=='function')throw Error('Escort cinematic: collision validator missing');
  const route=waypoints.map(copy),tail=route[route.length-1],before=route[route.length-2],len=dist(tail,before);
  if(len<.01)throw Error('Escort cinematic: invalid final segment');
  // Stand just behind Ordan, within genuine merchant interaction distance.
  const playerEnd={x:tail.x-(tail.x-before.x)/len*1.10,z:tail.z-(tail.z-before.z)/len*1.10};
  const guide={pos:copy(mentor),index:0,goals:route,travel:0};
  const artisan={pos:copy(player),index:0,goals:[...route.slice(0,-1),playerEnd],travel:0};
  let phase='gather',failure=null,complete=false,frames=0;
  function advancePoint(actor,target,budget,collide){
   let remaining=budget;
   // 12cm collision substeps even on very slow software-rendered frames.
   for(let n=0;n<48&&remaining>.00001;n++){
    const d=dist(actor.pos,target);
    if(d<=.004)break;
    const step=Math.min(d,remaining,.12);
    const next={x:actor.pos.x+(target.x-actor.pos.x)*step/d,z:actor.pos.z+(target.z-actor.pos.z)*step/d};
    if(collide&&isBlocked(next.x,next.z)){
     failure={type:'player-collision',at:copy(actor.pos),next,phase,target:copy(target)};
     break;
    }
    actor.pos=next;actor.travel+=step;remaining-=step;
   }
   return budget-remaining;
  }
  function advanceTrack(actor,budget,collide){
   let left=budget;
   for(let i=0;i<32&&left>.00001&&actor.index<actor.goals.length&&!failure;i++){
    const goal=actor.goals[actor.index];
    const travelled=advancePoint(actor,goal,left,collide);left-=travelled;
    if(dist(actor.pos,goal)<=.004){actor.pos=copy(goal);actor.index++}
    else if(travelled<.00001)break;
   }
  }
  function snapshot(){
   return {phase,complete,blocked:failure,player:copy(artisan.pos),mentor:copy(guide.pos),
    playerWaypoint:artisan.index,mentorWaypoint:guide.index,playerTravel:+artisan.travel.toFixed(3),
    mentorTravel:+guide.travel.toFixed(3),frames,distance:+dist(artisan.pos,guide.pos).toFixed(3),
    waypoints:route.length};
  }
  function tick(delta){
   const dt=clamp(Number(delta)||0,0,.70),player0=copy(artisan.pos),mentor0=copy(guide.pos);
   if(!failure&&!complete&&dt>0){
    if(phase==='gather'){
      if(dist(artisan.pos,guide.pos)>1.55)advancePoint(artisan,guide.pos,2.40*dt,true);
      if(!failure&&dist(artisan.pos,guide.pos)<=1.55)phase='walk';
    }
    if(phase==='walk'&&!failure){
      advanceTrack(guide,2.40*dt,false);
      const gap=dist(artisan.pos,guide.pos);
      advanceTrack(artisan,clamp(2.40+(gap-2.1)*.30,1.80,3.15)*dt,true);
      if(artisan.index===artisan.goals.length&&guide.index===guide.goals.length){phase='arrived';complete=true}
    }
    frames++;
   }
   return {...snapshot(),playerMoved:dist(player0,artisan.pos),mentorMoved:dist(mentor0,guide.pos)};
  }
  return Object.freeze({tick,snapshot});
 }
 const api=Object.freeze({version:'MARKET_CINEMATIC_ROUTE_V001',create});
 root.GenesisMarketCinematic=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
