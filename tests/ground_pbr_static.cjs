// Verify the shipped, not authoring, ground PBR files in Project Genesis.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..','assets/world/v0.11.004');
const master=JSON.parse(fs.readFileSync(path.join(base,'provenance.json'),'utf8'));
const world=fs.readFileSync(path.join(__dirname,'..','village_world.js'),'utf8');
assert(world.includes('m.glossInvert=true'),'Roughness source used as gloss without inversion');
assert(world.includes("const ROOT='./assets/world/v0.11.004/'"),'Unexpected world material version');
assert(world.includes('m.diffuseMap=maps.color'),'Color map not connected');
assert(world.includes('m.normalMap=maps.normal'),'Normal map not connected');
assert(world.includes('m.aoMap=maps.ao'),'AO map not connected');
let totalBytes=0;
for(const group of ['cobble','traffic']){
 const specs=master.find(x=>x.material===group);
 assert(specs,'Missing provenance '+group);
 assert.equal(specs.original_manifest.resolution[0],4096);
 for(const [key,edge] of [['color',1024],['normal',1024],['gloss',512],['ao',512]]){
  const name=group+'_'+key+'.png';
  const data=fs.readFileSync(path.join(base,name));
  assert.equal(data.subarray(1,4).toString('ascii'),'PNG');
  const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
  assert.equal(width,edge,name+' width');
  assert.equal(height,edge,name+' height');
  assert.equal(specs.web_maps[name].size,edge,'Manifest disagrees with shipped texture');
  totalBytes+=data.byteLength;
  console.log('GROUND_PBR',JSON.stringify({name,width,height,bytes:data.byteLength,source:specs.web_maps[name].source}));
 }
}
console.log('PASS ground PBR static audit',JSON.stringify({totalBytes,totalMB:totalBytes/1e6,glossInvert:true}));
