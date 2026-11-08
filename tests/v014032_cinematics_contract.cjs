'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const arrival=require('../v015/canvas-arrival-v016.js');
const market=require('../genesis_market_cinematic_v001.js');
const quest=require('../genesis_market_quest_v001.js');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('window.__GENESIS_WORLD_FULL=true;'),'Full village flag must be staged');
assert(html.includes('genesisFountainV011HQAsset" data-route="Herrero" data-priority="stream"'),'Original V011 must be a staged route resource');
assert(html.includes('genesis_market_cinematic_v001.js?v='),'Ordan cinema engine not loaded');
assert(html.includes('v015/canvas-arrival-v016.js?v='),'Original V016 arrival engine not loaded');
assert(html.includes('genesis_arrival_v014032.css?v='),'Arrival letterbox stylesheet absent');
assert(html.includes('function updateInitialArrival(dt,now)'),'New game arrival not integrated into renderer');
assert(html.includes('!marketCinematic?.active&&!arrivalCinematic?.active'),'Controls not cinema-locked');
const artisan={position:[0,0,6.3],getPosition(){const [x,y,z]=this.position;return{x,y,z}},
setPosition(x,y,z){this.position=[x,y,z]},setEulerAngles(){}};
const events=[];
const intro=arrival.create({artisan,game:{step:()=>0},playAnimation:clip=>events.push(clip)});
assert.equal(intro.state,'pending');intro.begin();
for(let n=0;n<800&&intro.active;n++)intro.update(.08);
assert.equal(intro.state,'arrived','Arrival must walk to Ordan');
assert(intro.snapshot().ordanDistance<2.2,'Arrival ended too far from Ordan');
assert(events.includes('Walk_Loop')&&events.includes('Idle_Loop'),'Original rig animation clips missing');
const track=market.create({x:1.72,z:2.75},{x:1.72,z:1.9},quest.escortPath);
assert(track.mentor.total>40,'Market escort distance implausible');
assert(track.player.total>track.mentor.total,'Artisan must approach mentor first');
for(let k=0;k<=100;k++){
 const p=market.pose(track,track.player.total*k/100);
 assert(Number.isFinite(p.player.x)&&Number.isFinite(p.mentor.z));
}
const end=market.pose(track,track.player.total);
assert(end.complete,'Market tour never finished');
assert(Math.hypot(end.player.x-24.25,end.player.z-35.15)<.15,'Market tour does not reach actual stall');
console.log('PASS_ORIGINAL_ARRIVAL_AND_ORDAN_MARKET_CINEMA',JSON.stringify({arrival:intro.snapshot(),marketDistance:track.player.total,marketGoal:end.player}));
