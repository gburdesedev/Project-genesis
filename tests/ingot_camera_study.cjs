// Project Genesis | proof from the real ingot GLB, no 3D regeneration
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out='/tmp/genesis-ingot-camera';
const script='previews/ingot-camera-study-v0.1.009.html';
(async()=>{
 fs.mkdirSync(out+'/frames',{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1420,height:910},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')console.log('BROWSER_ERROR',m.text())});
 page.on('requestfailed',q=>console.log('REQUEST_FAILED',q.url(),q.failure()?.errorText));
 await page.route('https://genesis.test/**',route=>{
  const pathname=decodeURI(new URL(route.request().url()).pathname);
  const target=path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)||!fs.existsSync(target))return route.abort();
  const contentType=target.endsWith('.html')?'text/html':target.endsWith('.glb')?'model/gltf-binary':target.endsWith('.png')?'image/png':'text/plain';
  return route.fulfill({body:fs.readFileSync(target),contentType});
 });
 await page.goto('https://genesis.test/'+script);
 try{await page.waitForFunction(()=>document.querySelector('#ingot')?.loaded===true,{}, {timeout:45000});}
 catch(e){console.log('DEBUG',JSON.stringify(await page.evaluate(()=>({defined:!!customElements.get('model-viewer'),loaded:document.querySelector('#ingot')?.loaded,src:document.querySelector('#ingot')?.src,errors:document.querySelector('#status')?.textContent})),null,2));throw e;}
 console.log('LOADED',JSON.stringify(await page.evaluate(()=>({webgl:!!document.createElement('canvas').getContext('webgl2'),src:document.querySelector('#ingot').src,camera:document.querySelector('#ingot').cameraOrbit}))));
 assert.equal(await page.locator('#ingot').getAttribute('src'),'../assets/playcanvas/candidates/materials/iron_ingot/v175/iron_v175_web_candidate.glb');
 const cameraHashes=[];const frameHashes=[];const fileHash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 const variants=[[0,25],[0,35],[0,45],[20,25],[20,35],[20,45],[35,25],[35,35],[35,45]];
 for(const [theta,phi] of variants){
  await page.evaluate(([t,p])=>window.IngotStudy.setFrame(0,t,p),[theta,phi]);
  await page.waitForTimeout(180);
  const shot=`${out}/camera_theta${theta}_phi${phi}.png`;
  await page.locator('#ingot').screenshot({path:shot,timeout:60000});
  const hash=fileHash(shot);cameraHashes.push(hash);
  console.log('SNAPSHOT',theta,phi,hash.slice(0,12),JSON.stringify(await page.evaluate(()=>{let {theta,phi}=document.querySelector('#ingot').getCameraOrbit();return {theta,phi}})));
 }
 for(let i=0;i<32;i++){
  const a=45*Math.sin(i/32*2*Math.PI);
  await page.evaluate(angle=>window.IngotStudy.setFrame(angle,20,35),a);
  await page.waitForTimeout(110);
  const frame=`${out}/frames/frame_${String(i).padStart(3,'0')}.png`;
  await page.locator('#ingot').screenshot({path:frame,timeout:60000});frameHashes.push(fileHash(frame));
 }
 const state=await page.evaluate(()=>window.IngotStudy.getState());
 console.log('ANIMATION_CHECK',JSON.stringify(state));
 console.log('DISTINCT_CAMERA_FRAMES',new Set(cameraHashes).size,'OF',cameraHashes.length,'DISTINCT_ANIMATION_FRAMES',new Set(frameHashes).size,'OF',frameHashes.length);
 assert(new Set(cameraHashes).size>=6,'camera angles produced identical images');
 assert(new Set(frameHashes).size>=20,'±45° animation has no actual visual motion');
 assert.equal(errors.length,0,errors.join('\n'));
 await browser.close();
 console.log('PASS 9 real-GLB camera variants + 32 frames ±45° without changing GLB');
})().catch(e=>{console.error(e);process.exit(1)});
