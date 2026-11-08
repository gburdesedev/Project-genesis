'use strict';
/* V014.037: real original V016 waypoint controller + game integration contracts. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const arrival=require('../v015/canvas-arrival-v016.js');
const plan=require('../village_plan.js');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('genesis_arrival_v014037.css','utf8');
assert(html.includes('genesis_arrival_v014037.css?v=0.14.037'),'Actual game must load cinema CSS');
assert(html.includes('v015/canvas-arrival-v016.js?v=0.14.037'),'Actual game must load original arrival controller');
assert(html.includes('if(!fastSetup&&prof===\'Herrero\')startInitialArrival()'),'Only fresh game begins arrival');
assert(html.includes('updateInitialArrival(dt,now);'),'Game frame must advance 3D protagonist');
assert(html.includes('if(arrivalCinematic?.active){e.preventDefault();return}'),'Keyboard blocked in cinema');
assert(html.includes('function getInteractables(){if(!gameStarted||!activeRoute||tutorialStep<0||arrivalCinematic?.active'),'Interactions blocked in cinema');
assert(html.includes('function interact(){if(arrivalCinematic?.active)return;'),'E blocked during cinema');
assert(html.includes("document.body.classList.remove('genesis-arrival-cinematic')"),'Cinematic must restore original HUD');
assert(css.includes('height:12%')&&css.includes('#hud')&&css.includes('#mobile'),'Letterbox and original controls suppression required');
assert.deepEqual([...arrival.start],[7,0,31]);
assert.equal(plan.plaza.x,7);assert.equal(plan.plaza.z,16);
const actor={
 p:{x:0,y:0,z:6.3},
 setPosition(x,y,z){this.p={x,y,z}},
 getPosition(){return this.p},
 setEulerAngles(){}
};
let flags=[],done=[];
const t=arrival.create({artisan:actor,game:{step:()=>0},playAnimation:s=>flags.push(s),onFinish:s=>done.push(s)});
assert.equal(t.state,'pending');assert.equal(t.begin(),true);
const frames=[];
for(let i=0;i<850&&t.active;i++){t.update(.1);frames.push({...actor.p})}
const finish=t.snapshot();
assert.equal(finish.state,'arrived');
assert(finish.ordanDistance<2.2,'Artisan must finish in range of original Ordan');
assert(frames.every(p=>Math.hypot(p.x-7,p.z-16)>2.4),'Fountain center must stay unobstructed');
assert(flags.includes('Walk_Loop')&&flags.includes('Idle_Loop'),'Keep original rig walk/idle');
assert.deepEqual(done,['arrived']);
console.log('PASS V014.037 original V016 cinematic',JSON.stringify({distance:finish.distance,ordan:finish.ordanDistance,frames:frames.length}));
