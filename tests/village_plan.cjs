const assert=require('node:assert/strict'),p=require('../village_plan.js');
assert.equal(p.bounds.maxX-p.bounds.minX,63);assert.equal(p.bounds.maxZ-p.bounds.minZ,63);assert.equal(p.workshops.length,5);
assert.equal(p.market.reference,true);
for(const w of p.workshops){assert(w.cx-w.w/2>p.bounds.minX&&w.cx+w.w/2<p.bounds.maxX);assert(w.cz-w.d/2>p.bounds.minZ&&w.cz+w.d/2<p.bounds.maxZ);if(!w.existing)assert(p.blocked(w.cx,w.cz))}
// One-metre occupancy grid: plaza, market, the southern exit and each new
// workshop entrance must remain connected to the existing tutorial spawn.
const start=[0,6],queue=[start],seen=new Set(['0,6']);
while(queue.length){const[x,z]=queue.shift();for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=nx+','+nz;if(seen.has(k)||nx<=p.bounds.minX+1||nx>=p.bounds.maxX-1||nz<1||nz>=p.bounds.maxZ-1||p.blocked(nx,nz,.4))continue;seen.add(k);queue.push([nx,nz])}}
for(const[x,z]of[[7,16],[26,36],[7,46],[-9,16],[23,16],[-11,29]])assert(seen.has(x+','+z),`blocked route to ${x},${z}`);
console.log('PASS village: exact 63x63 bounds, five workshops, closed decorative interiors and connected approaches/plaza/market');
