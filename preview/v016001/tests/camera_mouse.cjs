const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync(require('node:path').join(__dirname,'../camera_mouse.js'),'utf8');
class Target extends EventTarget {
  emit(type,values={}) { const event=new Event(type);Object.assign(event,values);this.dispatchEvent(event); }
}
function fixture({promise=false}={}) {
 const document=new Target(),window=new Target(),hint=new Target();
 let requests=0,exits=0,stops=0,errors=0,active=true,style='free',resolve;
 const moves=[];
 const surface={requestPointerLock(){requests++;if(promise)return new Promise(r=>resolve=r);document.pointerLockElement=surface;document.emit('pointerlockchange')}};
 document.createElement=()=>hint;document.exitPointerLock=()=>{exits++;document.pointerLockElement=null;document.emit('pointerlockchange')};
 vm.runInNewContext(source,{window,document,addEventListener:window.addEventListener.bind(window)});
 const controller=window.GenesisMouseCapture.create({surface,hud:{append(){}},allowed:()=>active,blocked:event=>event.ui===true,mode:()=>style,rotate:(x,y)=>moves.push([x,y]),stopped:()=>stops++,failed:()=>errors++});
 return {document,window,hint,surface,controller,moves,get requests(){return requests},get exits(){return exits},get stops(){return stops},get errors(){return errors},active(v){active=v},mode(v){style=v},grant(){document.pointerLockElement=surface;document.emit('pointerlockchange');resolve?.()}};
}
let f=fixture();
f.document.emit('pointerdown',{pointerType:'touch',button:0});assert.equal(f.requests,0);
f.document.emit('pointerdown',{pointerType:'mouse',button:0,ui:true});assert.equal(f.requests,0);
f.document.emit('pointerdown',{pointerType:'mouse',button:0});assert.equal(f.requests,1);assert.equal(f.hint.hidden,true);
// Locked coordinates stay fixed even as physical mouse movement continues.
f.document.emit('mousemove',{clientX:160,clientY:100,movementX:1400,movementY:-12});
f.document.emit('mousemove',{clientX:160,clientY:100,movementX:1400,movementY:6});
assert.deepEqual(f.moves,[[1400,-12],[1400,6]]);
f.document.exitPointerLock();assert.equal(f.hint.hidden,false);assert.equal(f.stops,1);
f.document.emit('mousemove',{movementX:100});assert.equal(f.moves.length,2);assert.equal(f.requests,1); // Esc never recaptures.
f.hint.emit('click');assert.equal(f.requests,2);
f.active(false);f.controller.refresh();assert.equal(f.document.pointerLockElement,null);assert.equal(f.hint.hidden,true);
f.active(true);f.controller.refresh();f.hint.emit('click');f.window.emit('blur');assert.equal(f.document.pointerLockElement,null);
f=fixture();f.mode('drag');f.document.emit('pointerdown',{pointerType:'mouse',button:0});assert.equal(f.requests,0);
f.document.emit('pointerdown',{pointerType:'mouse',button:2});f.document.emit('mousemove',{movementX:50,movementY:2});assert.deepEqual(f.moves,[[50,2]]);
f.document.emit('pointerup',{pointerType:'mouse',button:2});assert.equal(f.document.pointerLockElement,null);
f=fixture({promise:true});f.document.emit('pointerdown',{pointerType:'mouse',button:0});f.active(false);f.controller.refresh();f.grant();assert.equal(f.document.pointerLockElement,null); // Late grants cannot lock an open menu.
f=fixture({promise:true});f.document.emit('pointerdown',{pointerType:'mouse',button:0});f.document.emit('pointerlockerror');assert.equal(f.errors,1);f.hint.emit('click');assert.equal(f.requests,2);
console.log('PASS: relative rotation past viewport edges, click capture, UI/touch isolation, release, drag, late grants and retry');
