/* Project Genesis · V014.026 · cinemática de Ordan al mercado.
 * Trayectoria original, interpolación por longitud, cero imágenes sustitutas.
 * El controlador de escena conserva las entidades, animaciones y misiones.
 */
(function(root){
  'use strict';
  const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
  const copy=p=>({x:Number(p.x),z:Number(p.z)});
  const segment=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
  function track(points){
    if(!Array.isArray(points)||points.length<2||points.some(p=>!valid(p)))throw Error('Ruta cinematográfica inválida');
    const nodes=points.map(copy),distances=[0];
    for(let i=1;i<nodes.length;i++){
      const d=segment(nodes[i-1],nodes[i]);
      if(d<.00001)throw Error('Punto cinematográfico duplicado '+i);
      distances.push(distances.at(-1)+d);
    }
    return Object.freeze({points:Object.freeze(nodes.map(p=>Object.freeze(p))),distances:Object.freeze(distances),total:distances.at(-1)});
  }
  function sample(t,distance){
    if(!t||!Number.isFinite(distance))throw Error('Muestra de ruta inválida');
    const d=Math.max(0,Math.min(t.total,distance));
    let i=1;
    while(i<t.distances.length-1 && d>t.distances[i])i++;
    const a=t.points[i-1],b=t.points[i],den=t.distances[i]-t.distances[i-1];
    const t01=Math.max(0,Math.min(1,(d-t.distances[i-1])/den));
    const dx=b.x-a.x,dz=b.z-a.z;
    return {x:a.x+dx*t01,z:a.z+dz*t01,yaw:Math.atan2(dx,dz)*180/Math.PI,segment:i,
      fraction:t01,complete:d>=t.total-.0001};
  }
  function create(playerStart,mentorStart,waypoints){
    if(!valid(playerStart)||!valid(mentorStart)||!Array.isArray(waypoints)||waypoints.length<2)
      throw Error('Faltan las posiciones y los hitos de Ordan');
    const p=copy(playerStart),m=copy(mentorStart);
    const goals=waypoints.map(copy);
    const mentor=track([m,...goals]);
    // El artesano empieza donde realmente terminó la comparación. Se incorpora
    // detrás de Ordan y recorre después EXACTAMENTE los mismos hitos.
    const player=track([p,m,...goals]);
    const entry=segment(p,m);
    if(entry>4.5)throw Error('El artesano está demasiado lejos de Ordan para comenzar la cinemática');
    return Object.freeze({mentor,player,entry,goal:goals.at(-1)});
  }
  function pose(tracks,distance){
    const d=Math.max(0,Math.min(distance,tracks.player.total));
    return {mentor:sample(tracks.mentor,d),player:sample(tracks.player,d),
      fraction:d/tracks.player.total,complete:d>=tracks.player.total-.0001};
  }
  const api=Object.freeze({version:'GENESIS_ORDAN_MARKET_CINEMATIC_V001',create,sample,pose,speedMetersPerSecond:3.55});
  root.GenesisMarketCinematic=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
