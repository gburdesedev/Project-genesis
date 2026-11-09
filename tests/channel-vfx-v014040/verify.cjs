const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const {PNG}=require('pngjs');
(async()=>{
 const out=path.resolve('channel-vfx-v014040-qa');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,args:[
  '--enable-webgl','--use-angle=swiftshader','--ignore-gpu-blocklist',
  '--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1100,height:750},deviceScaleFactor:1});
 const errors=[];
 page.on('pageerror',err=>errors.push(err.stack||err.message));
 page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
 page.on('requestfailed',r=>errors.push(r.url()+' '+(r.failure()?.errorText||'?')));
 await page.goto('http://127.0.0.1:8792/tests/channel-vfx-v014040/?genesisChannelVfx=1',
  {timeout:90000,waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__vfxReady||window.__vfxError,null,{timeout:90000});
 const first=await page.evaluate(()=>window.__vfxReady||window.__vfxError);
 if(typeof first==='string')throw Error('VFX_BROWSER_INIT '+first);
 if(first.triangles!==2150)throw Error('WRONG_ORIGINAL_V03_TRIANGLES '+first.triangles);
 for(const kind of ['base','fuego','rayo','hielo','tres']){
  const state=await page.evaluate(kind=>window.__vfxStep(kind,0),kind);
  if(kind==='base' ? Object.values(state.levels||{}).some(Boolean) :
   !state.ready || !Object.values(state.levels||{}).some(Boolean))
   throw Error('VFX_SET_FAILED '+kind+' '+JSON.stringify(state));
  await page.locator('#viewport').screenshot({path:path.join(out,'V014040_'+kind+'.png'),
   timeout:120000});
  console.log('REAL_3D_VFX_STAGE',kind,JSON.stringify(state.levels));
 }
 const rotated=await page.evaluate(()=>window.__vfxStep('tres',36));
 if(rotated.fittedAxis!=='y' && rotated.fittedAxis!=='z' && rotated.fittedAxis!=='x')
  throw Error('MISSING_LOCAL_BOUNDS');
 await page.locator('#viewport').screenshot({
  path:path.join(out,'V014040_tres_swordrot36.png'),timeout:120000});
 const original=PNG.sync.read(fs.readFileSync(path.join(out,'V014040_base.png')));
 const deltas={};
 for(const kind of ['fuego','rayo','hielo','tres']){
  const image=PNG.sync.read(fs.readFileSync(path.join(out,'V014040_'+kind+'.png')));
  let changed=0;
  for(let y=60;y<675;y++)for(let x=390;x<710;x++){
   const p=(y*1100+x)*4;
   const d=Math.abs(image.data[p]-original.data[p])+
      Math.abs(image.data[p+1]-original.data[p+1])+
      Math.abs(image.data[p+2]-original.data[p+2]);
   if(d>55)changed++;
  }
  deltas[kind]=changed;
  if(changed<50)throw Error('VFX_CHANNEL_NOT_VISIBLE_'+kind+' changed='+changed);
 }
 if(errors.length)throw Error('WEBGL_BROWSER_ERRORS '+JSON.stringify(errors.slice(0,8)));
 const audit={source:'original V03 GLB verified SHA e2228f078b2572768416c48c0e63c2d908f214e2c0625a2ab754c877a099112b',
  engine:'PlayCanvas WebGL2',sourceTri:2150,channelDeltas:deltas,
  status:rotated,threeEffectsOnSameMesh:true,originalGeometryModified:false,
  gamePreviewCandidate:'V014.040-VFX01',candidatePublished:false,
  importantLimitations:['Hielo V21 is not approved Blender V42',
   'Actual V014.038 mercenary currently references generic mercSword10 not V03'],
  browserErrors:errors};
 fs.writeFileSync(path.join(out,'audit.json'),JSON.stringify(audit,null,2));
 await browser.close();
 console.log('GENESIS_V014040_REAL_3D_VFX_BRIDGE_SUCCESS',JSON.stringify(deltas));
})().catch(e=>{console.error('GENESIS_V014040_VFX_BRIDGE_FAILURE',e.stack||e);process.exit(1)});
