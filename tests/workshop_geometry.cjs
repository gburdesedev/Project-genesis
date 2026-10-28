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
for(const w of plan.workshops)assert(w.w*w.d<=71,'footprint should be about 44% smaller');
assert(source.includes('data-preserve-proportions="true"'));
const keys=new Set();assert.equal(plan.movementSpeed(keys),2.75);keys.add('ShiftLeft');assert.equal(plan.movementSpeed(keys),5);keys.delete('ShiftLeft');keys.add('ShiftRight');assert.equal(plan.movementSpeed(keys),5);keys.clear();assert.equal(plan.movementSpeed(keys),2.75);
const input={keys:new Set(['KeyW','ShiftLeft','ShiftRight']),MOVEMENT_KEYS:new Set(['KeyW','ShiftLeft','ShiftRight']),NOTEBOOK_CAMERA_KEYS:new Set(),moveX:1,moveY:1,setWalking(){}};vm.createContext(input);vm.runInContext(declaration('clearMovementInput'),input);input.clearMovementInput();assert.equal(input.keys.size,0);
// V018 PBR Herrero uses the original door's collision/rotation anchor, while the
// legacy closed door remains the source for curtidor and the other facade proxies.
const doorAnchor=source.match(/<pc-entity id="doorLeafModel"[^>]*position="-1\.10 0 \.12"[^>]*>/);
const doorVisual=source.match(/<pc-model id="herreroDoorPBRModel"[^>]*position="([^"]+)"[^>]*scale="([^"]+)"/);
assert(doorAnchor,'Herrero rotation pivot must remain at the 2.18m doorway hinge');
assert(doorVisual,'Herrero door visual must be nested under the original animated pivot');
const [offset]=doorVisual[1].split(' ').map(Number);
const [scaleX,scaleY]=doorVisual[2].split(' ').map(Number);
assert(Math.abs(offset-.603*scaleX)<.004,'GLB internal hinge must coincide with doorLeafModel pivot');
assert(Math.abs(1.2*scaleX-2.18)<.01,'new door needs to fill the existing workshop aperture');
assert(Math.abs(2.31*scaleY-3.0)<.01,'door top should fit existing doorway height');
assert(source.includes('id="doorHerreroV018" type="container"'),'optimized Herrero PBR asset is missing');
assert(source.includes('herrero-door-v018-pbr512-mobile.glb'),'touch devices require mobile asset');
assert(source.includes('id="tannerDoorLeafModel"'),'Curtidor keeps functioning hinged door');
assert(source.includes('id="villageDoorSource" asset="doorLeaf083"'),'closed facade doors must remain independent');

console.log('PASS proportions/sprint: 25% smaller sides, unchanged height, aligned doors/walls/camera, open tutorial aisle, both Shift keys and focus reset');
