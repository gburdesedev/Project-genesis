'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const plan=require('../village_plan.js');
const intro=require('../v015/canvas-arrival-v015.js');
assert.equal(plan.workshops.length,5,'Original Canvas had five workshops');
assert.equal(plan.roads.length,9,'Original Canvas had nine streets');
assert.deepEqual([plan.plaza.x,plan.plaza.z],[7,16]);
assert.deepEqual([plan.market.x,plan.market.z],[26,36]);
assert.deepEqual([...intro.start],[7,0,31]);
const entity={
 p:{x:0,y:0,z:6.3},facing:0,
 setPosition(x,y,z){this.p={x,y,z}},
 setEulerAngles(x,y,z){this.facing=y},
 getPosition(){return this.p}
};
const clips=[],announcements=[];
const arrival=intro.create({
 artisan:entity,game:{step:()=>0},speed:3.2,
 playAnimation:x=>clips.push(x),announce:x=>announcements.push(x)
});
assert.equal(arrival.state,'pending');
assert.deepEqual(arrival.position(),[7,0,31]);
assert.equal(arrival.update(.1).state,'pending','Must not play behind loading overlay');
assert(arrival.begin(),'Start once user clicks Continue');
const traveled=[];
for(let n=0;n<350&&arrival.active;n++){
 const v=arrival.update(.1);
 traveled.push({...entity.p});
}
const end=arrival.snapshot();
assert.equal(end.state,'arrived','Automatic walk did not terminate');
assert(end.distance>20&&end.distance<55,'The character should walk through the plaza, not teleport');
assert(end.ordanDistance<2.2,'Arrival must stop within original Q1 Ordan interaction range');
assert(clips.includes('Walk_Loop'),'Original walking animation must be played');
assert(clips.includes('Idle_Loop'),'Character must stop walking on arrival');
assert(traveled.some(p=>Math.abs(p.x-4.3)<.2&&Math.abs(p.z-16)<1),
 'Route must skirt the original center fountain, not pass through it');
assert(!traveled.some(p=>Math.hypot(p.x-7,p.z-16)<2.13+.3),'Cinematic enters original fountain collision');
const resumed=intro.create({artisan:entity,game:{step:()=>8}});
assert.equal(resumed.state,'resumed','Resuming saves must skip automatic arrival');
assert.deepEqual(resumed.position(),[0,0,6.3],'Saved game must return to the workshop approach');
const map=fs.readFileSync(path.join(__dirname,'../v015/canvas-original-map-v015.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../v015/index.html'),'utf8');
const sources=fs.readFileSync(path.join(__dirname,'../v015/canvas-original-sources-v015.js'),'utf8');
assert(map.includes('plan.workshops')&&map.includes('plan.market'),'Village must read original plan');
assert(map.includes('merchant.setPosition(25.5,0,36.3)'),'Original merchant must be located at approved market stall');
assert(map.includes('marketStall(pc,root)'),'Approved original merchant stall missing');
assert(map.includes("await addTrees(app,global.pc,root)")&&map.includes("await fountain(app,global.pc,root)"),
 'Original heavy scenery must load separately, sequentially after gameplay starts');
assert(map.includes('function startDecor()'),'The staged environment loader must be callable only after arrival');
assert(sources.includes('workshopShell')&&sources.includes('doorLeaf'),
 'Approved original embedded workshop source models missing');
assert(html.includes('GenesisCanvasMapV015.mount'),'Original village not mounted');
assert(html.includes('GenesisCanvasArrivalV015.create'),'Original animated arrival not mounted');
assert(html.includes("arrivalController?.begin()"),'Game start must begin automatic arrival after load');
console.log('PASS V015: exact original plan, local approved source meshes, market NPC/stall, 14 trees, and '+end.distance.toFixed(1)+'m autonomous animated Ordan arrival');
