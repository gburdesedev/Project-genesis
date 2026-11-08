'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const start=require('../v015/canvas-arrival-v016.js');
const source=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
for(const required of ['genesis_arrival_v014037.css','v015/canvas-arrival-v016.js','function startInitialArrival(){','function updateInitialArrival(dt,now){',
 '!arrivalCinematic?.active','window.__GenesisArrivalQA=']){
 assert(source.includes(required),'V014.037 missing real integration: '+required);
}
const actor={pos:[0,0,6.3],getPosition(){return{x:this.pos[0],y:this.pos[1],z:this.pos[2]}},
 setPosition(...v){this.pos=v},setEulerAngles(){}};
let walk=0,idle=0;
const seq=start.create({artisan:actor,game:{step:()=>0},playAnimation:c=>{if(c==='Walk_Loop')walk++;if(c==='Idle_Loop')idle++;}});
assert.equal(seq.state,'pending');assert(seq.begin());
for(let i=0;i<800&&seq.active;i++)seq.update(.06);
assert.equal(seq.state,'arrived','Original V016 arrival did not arrive at Ordan');
assert(seq.snapshot().ordanDistance<2.2,'Player does not finish near Ordan');
assert(walk>0&&idle>0,'Approved walk and idle loops missing');
assert(!source.includes('window.__GENESIS_WORLD_FULL)return;'),'Arrival must also work in staged lite village');
console.log('V014037_ARRIVAL_CONTRACT_PASS',JSON.stringify({snapshot:seq.snapshot(),walk,idle}));
