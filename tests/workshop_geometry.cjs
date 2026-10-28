const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const plan=require('../village_plan.js'),source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function declaration(name){const start=source.indexOf('function '+name+'(');assert(start>=0,name);let at=source.indexOf('{',start),depth=1,end=at+1;while(depth){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++}return source.slice(start,end)}
const c={GenesisVillagePlan:plan,WORKSHOP_SCALE:plan.workshopScale,WORKSHOP_CENTERS:{Herrero:0,Curtidor:14},DOOR_WIDTH:2.18,doorAngle:0,doorTarget:0,tannerDoorAngle:0,tannerDoorTarget:0,activeRoute:{center:0},tutorialStep:1,anvilEntity:null,village:{blocked:plan.blocked},rad:x=>x*Math.PI/180,clamp:(x,a,b)=>Math.min(b,Math.max(a,x))};
vm.createContext(c);vm.runInContext(['workPoint','pointSegmentDistance','oneDoorCollision','doorIsOpen','routeEntranceUnlocked','doorwayPortalFree','doorCollisionAt','workshopWallCollision','wallBlocked','cameraBlocked','workshopAt'].map(declaration).join('\n'),c);
assert(c.wallBlocked(0,.09),'closed scaled door must block walking/running');
c.tutorialStep=2;c.doorAngle=c.doorTarget=-92;
for(let z=.5;z>-5.5;z-=.2)assert(!c.wallBlocked(0,z),`scaled central aisle obstructed at ${z}`);
assert(c.wallBlocked(4.3,-3));assert(c.wallBlocked(0,-7.6));assert(c.cameraBlocked(4.3,-3));assert(c.wallBlocked(14,.09),'inactive door stays closed');
assert.equal(c.workshopAt(0,-7).profession,'Herrero');assert.equal(c.workshopAt(0,-9),null);
const back=plan.toLocal(2.25,-6,0);assert.equal(back.x,3);assert.equal(back.z,-8);const point=plan.toWorld({x:17,y:1,z:-8},14);assert.equal(point.x,16.25);assert.equal(point.z,-6);assert.equal(point.y,1);
assert(source.includes('id="compactBlacksmithRoot" scale=".75 1 .75"'));assert(/id="tannerWorkshopRoot"[^>]*scale=".75 1 .75"/.test(source));
// Only walls/roof/door are shortened: the 2D footprint and interior prop transforms are untouched.
for(const id of ['modularWalls089','workshopShellModel','doorFrameModel','doorLeafModel','tannerWalls09','tannerDoorFrameModel','tannerDoorLeafModel'])
 assert(new RegExp('id="'+id+'"[^>]*scale="1 \\.75 1"').test(source),`${id} must be 75% architectural height`);
assert(/id="roofFinalModel"[^>]*position="0 2\.5875 -5\.05"[^>]*scale="1\.28 \.4125 \.86"/.test(source),'blacksmith roof must be lowered proportionally');
assert(/id="tannerRoofModel"[^>]*position="0 2\.5875 -5\.05"[^>]*scale="1\.75 \.4125 1\.25"/.test(source),'tanner roof must be lowered proportionally');
assert.equal(3*.75,2.25,'door height');assert.equal(3.25*.75,2.4375,'frame height');assert.equal(6.1395246*.75,4.60464345,'roof height');
for(const w of plan.workshops)assert(w.w*w.d<=71,'footprint should be about 44% smaller');
assert(source.includes('data-preserve-proportions="true"'));
const keys=new Set();assert.equal(plan.movementSpeed(keys),2.75);keys.add('ShiftLeft');assert.equal(plan.movementSpeed(keys),5);keys.delete('ShiftLeft');keys.add('ShiftRight');assert.equal(plan.movementSpeed(keys),5);keys.clear();assert.equal(plan.movementSpeed(keys),2.75);
const input={keys:new Set(['KeyW','ShiftLeft','ShiftRight']),MOVEMENT_KEYS:new Set(['KeyW','ShiftLeft','ShiftRight']),NOTEBOOK_CAMERA_KEYS:new Set(),moveX:1,moveY:1,setWalking(){}};vm.createContext(input);vm.runInContext(declaration('clearMovementInput'),input);input.clearMovementInput();assert.equal(input.keys.size,0);
console.log('PASS proportions/sprint: 25% smaller sides and 25% shorter architecture (preserving props, anchors, collision), aligned doors/walls/camera, open tutorial aisle, both Shift keys and focus reset');
