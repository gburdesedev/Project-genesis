// Diagnostic only: inspect the exact movement and collision wiring of the demo.
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
for(const needle of ['village.blocked(', 'village?.blocked(', 'trees.blocked(', 'trees?.blocked(', 'village.trees?.update(', 'getPosition().x', 'blocked(next', 'blocked(px', 'collision', 'movePlayer']){
 let idx=-1,count=0;
 while((idx=html.indexOf(needle,idx+1))>=0){
  console.log('\nSEARCH',JSON.stringify(needle),idx,'HIT',++count);
  console.log(html.slice(Math.max(0,idx-750),Math.min(html.length,idx+1100)));
  if(count>=8)break;
 }
 if(!count)console.log('SEARCH',JSON.stringify(needle),'NOT_FOUND');
}
console.log('DONE COLLISION DIAGNOSTIC');

const idx=html.indexOf('function frame(now)');if(idx>=0){console.log('ACTUAL_FRAME_MOVEMENT_SECTION_BEGIN');console.log(html.slice(idx+1700,idx+5600));console.log('ACTUAL_FRAME_MOVEMENT_SECTION_END')}
