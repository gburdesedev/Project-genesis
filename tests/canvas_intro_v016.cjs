'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const scene=require('../v015/canvas-arrival-v016.js');
const plan=require('../village_plan.js');
const manifest=require('../v015/manifest.json');
const html=fs.readFileSync(path.join(__dirname,'../v015/index.html'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../v015/canvas-legacy-ui.js'),'utf8');
assert.equal(manifest.version,'0.15-v016');
const actors=Object.fromEntries(manifest.characters.map(x=>[x.id,x]));
assert.deepEqual(actors.ordan.position,[1.72,0,1.9]);
assert.deepEqual(actors.merchant.position,[25.5,0,36.3]);
assert.deepEqual(actors.mercenary.position,[3.25,-40,3.1],'Mercenary must remain hidden until contracted');
assert.deepEqual(actors.artisan.position,[7,0,31]);
assert.equal(plan.plaza.x,7);assert.equal(plan.plaza.z,16);
assert.equal(plan.market.x,26);assert.equal(plan.market.z,36);
assert.deepEqual([...scene.start],[7,0,31]);
assert.equal(manifest.cinematicArrival.viewportScale,.88);
assert.equal(manifest.cinematicArrival.cameraZoomMultiplier,1.3);
const actor={
 p:{x:0,y:0,z:6.3},rotation:0,
 setPosition(x,y,z){this.p={x,y,z}},
 getPosition(){return this.p},
 setEulerAngles(x,y,z){this.rotation=y}
},transitions=[],completed=[];
const walk=scene.create({artisan:actor,game:{step:()=>0},speed:3.2,
 playAnimation:name=>transitions.push(name),onFinish:why=>completed.push(why)});
assert.equal(walk.state,'pending','Cinematic must not play while loading screen is visible');
assert.deepEqual(walk.position(),[7,0,31]);
assert.equal(walk.update(.1).state,'pending');
assert(walk.begin(),'Resume screen must begin intro');
const samples=[];
for(let i=0;i<650&&walk.active;i++){
 walk.update(.1);
 samples.push({...actor.p});
}
const end=walk.snapshot();
assert.equal(end.state,'arrived','Walk must end by Ordan without requiring manual inputs');
assert(end.distance>20&&end.distance<60,'Character must traverse actual plaza path');
assert(end.ordanDistance<2.2,'Character must be able to interact with Ordan immediately');
assert(samples.some(p=>Math.abs(p.x-4.3)<.15&&Math.abs(p.z-16)<1),
 'The route must skirt the original plaza center');
assert(samples.every(p=>Math.hypot(p.x-7,p.z-16)>2.4),
 'The route must not cross the reserved central fountain footprint');
assert(transitions.includes('Walk_Loop')&&transitions.includes('Idle_Loop'),
 'V011 original rig must walk and return to idle');
assert.deepEqual(completed,['arrived']);
const old=scene.create({artisan:actor,game:{step:()=>4}});
assert.equal(old.state,'resumed','No intro replay once original Q1 has progressed');
assert.deepEqual(old.position(),[0,0,6.3]);
assert(html.includes('canvas#app')&&html.includes('transform:scale(.88)'),
 'Cinematic inset viewport 88% required');
assert(html.includes('cinemaBlend')&&html.includes('1+.30*cinemaBlend'),
 'Camera must pull back 30% while original rig walks');
assert(html.includes("document.body.classList.add('genesis-v016-cinematic')"),
 'Cinematic visual frame must start only after loading continue');
assert(html.includes("document.body.classList.remove('genesis-v016-cinematic')"),
 'Normal frame and original controls must return when arrival finishes');
assert(html.includes("visibility:hidden!important;pointer-events:none!important"),
 'Controls must not be visible or clickable during cinema');
assert(html.includes("window.__GENESIS_V016_ARRIVAL__=cinematicArrival"),
 'Intro must be discoverable to gameplay and tests');
assert(ui.includes("globalThis.__GENESIS_V016_ARRIVAL__?.active"),
 'Original Q1 interactions must remain locked during the intro');
assert(!html.includes('canvas-original-map-v015.js')&&!html.includes('GenesisCanvasMapV015.mount'),
 'V016 must not merge V015 workshop/foliage/fountain overhaul');
console.log('PASS V016 · '+end.distance.toFixed(1)+' m route; original 3 NPCs, 88% viewport, 30% distant camera; controls hidden until Ordan');
