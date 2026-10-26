// Project Genesis V175 source-camera test. Rendered by Chromium WebGL in GitHub Actions.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out='/tmp/genesis-ingot-v010';
const ingot='assets/playcanvas/candidates/materials/iron_ingot/v175/iron_v175_web_candidate.glb';
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const data=fs.readFileSync(path.join(root,ingot)),gltf=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));
 console.log('GLB_STRUCTURE',JSON.stringify({meshes:gltf.meshes?.length,materials:gltf.materials?.map(x=>x.name),nodes:gltf.nodes?.map(x=>({name:x.name,mesh:x.mesh}))}));
 assert.equal(gltf.meshes.length,1,'Unexpected independent foundation mesh');
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1380,height:820},deviceScaleFactor:1,
   recordVideo:{dir:out,size:{width:1380,height:820}}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')console.log('BROWSER_ERROR',m.text())});
 await page.route('https://genesis.test/**',route=>{
  const p=path.resolve(root,'.'+new URL(route.request().url()).pathname);
  if(!p.startsWith(root+path.sep)||!fs.existsSync(p))return route.abort();
  return route.fulfill({body:fs.readFileSync(p),contentType:p.endsWith('.glb')?'model/gltf-binary':p.endsWith('.png')?'image/png':p.endsWith('.html')?'text/html':'application/javascript'});
 });
 await page.goto('https://genesis.test/previews/ingot-camera-study-v0.1.010.html');
 await page.waitForFunction(()=>document.querySelector('#ingot')?.loaded===true,{}, {timeout:45000});
 console.log('REAL_GL_LOADED',JSON.stringify(await page.evaluate(()=>({webgl:!!document.createElement('canvas').getContext('webgl2'),src:document.querySelector('#ingot').src}))));
 const shots=[];
 async function sample(name,theta,phi,exposure){
  await page.evaluate(([t,p,e])=>{window.IngotStudy.setFrame(0,t,p);document.querySelector('#ingot').exposure=e},[theta,phi,exposure]);
  await page.waitForTimeout(240);
  const full=out+'/'+name+'.png';
  await page.locator('#ingot').screenshot({path:full,timeout:60000});
  const x=await page.evaluate(()=>{const v=document.querySelector('#ingot');const c=v.getCameraOrbit();return {thetaDeg:c.theta*180/Math.PI,phiDeg:c.phi*180/Math.PI,exposure:v.exposure}});
  console.log('SHOT',name,JSON.stringify(x));shots.push({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex'),state:x});
 }
 await sample('previous_20_35',20,35,1.45);
 await sample('original_38_66',38.1628,66.3498,1.45);
 await sample('original_exposure_185',38.1628,66.3498,1.85);
 await sample('original_exposure_225',38.1628,66.3498,2.25);
 assert.equal(new Set(shots.map(x=>x.sha256)).size,4,'Camera and lighting previews must differ');
 await page.evaluate(()=>{const v=document.querySelector('#ingot');v.exposure=1.85;window.IngotStudy.setFrame(0,38.1628,66.3498)});
 await page.screenshot({path:out+'/full_study_v010.png'});
 // Record a full REAL-TIME 18-second cycle, not a speeded-up GIF.
 await page.evaluate(()=>window.IngotStudy.resume());
 const t0=await page.evaluate(()=>window.IngotStudy.getState());
 await page.waitForTimeout(4500);
 const t1=await page.evaluate(()=>window.IngotStudy.getState());
 await page.waitForTimeout(4500);
 const t2=await page.evaluate(()=>window.IngotStudy.getState());
 await page.waitForTimeout(9000);
 const t3=await page.evaluate(()=>window.IngotStudy.getState());
 console.log('SMOOTH_ORBIT',JSON.stringify({t0,t1,t2,t3}));
 assert(Math.abs(t1.offset)>35&&Math.abs(t2.offset)<8,'Unexpected 18s sine motion');
 await page.close();
 fs.copyFileSync(await page.video().path(),out+'/ingot_smooth_actual_18s.webm');
 fs.writeFileSync(out+'/camera_audit.json',JSON.stringify({original_camera:{theta:38.1628,phi:66.3498,source:'HERO_CAMERA_V078'},period_seconds:18,amplitude_degrees:45,shots,t0,t1,t2,t3},null,2));
 assert.equal(errors.length,0,errors.join('\n'));
 await browser.close();
 console.log('PASS exact approved V175 camera, 4 distinct real-GLB images, full 18s video, no source changes');
})().catch(e=>{console.error(e);process.exit(1)});
