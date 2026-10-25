const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let now=0;
const document=new EventTarget();document.hidden=false;
const badge={classList:{add(){}},textContent:'',title:''};
const app={events:{},on(name,fn){this.events[name]=fn},once(name,fn){this.events[name]=fn},off(name){delete this.events[name]}};
const window={};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../fps_counter.js'),'utf8'),{window,document,performance:{now:()=>now}});
window.GenesisFPS.attach(app,badge);
assert.equal(badge.textContent,'— FPS');
const sample=app.events.postrender;
window.GenesisFPS.attach(app,badge);assert.equal(app.events.postrender,sample);
sample();for(let i=0;i<61;i++){now+=1000/60;sample()}
assert.match(badge.textContent,/^60 FPS · 16,7 ms$/);
// Returning from a hidden tab must discard the background gap.
document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));assert.equal(badge.textContent,'FPS · pausa');
now+=200000;sample();document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));assert.equal(badge.textContent,'— FPS');
sample();for(let i=0;i<31;i++){now+=1000/30;sample()}
assert.match(badge.textContent,/^30 FPS · 33,3 ms$/);
app.events.destroy();assert.equal(app.events.postrender,undefined);
console.log('PASS FPS: rendered frame cadence, averaging, hidden-tab reset, duplicate attachment and cleanup');
