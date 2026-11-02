const {chromium}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.resolve(__dirname,'../previews/fresno-hdri-playcanvas');
const port=8568;
(async()=>{
 let server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:base,stdio:'ignore'});
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1280,height:850}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 try{
  await page.goto('http://127.0.0.1:'+port+'/index.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>['ready','failed'].includes(window.__fresnoQA?.stage),null,{timeout:130000});
  const state=await page.evaluate(()=>window.__fresnoQA);
  console.log('REAL_PLAYCANVAS_FRESNO_RESULT',JSON.stringify(state));
  fs.writeFileSync(path.join(base,'qa-result.json'),JSON.stringify({state,errors},null,2));
  assert.equal(state.stage,'ready','HDRI/model import failed');
  assert(state.hdri?.applied,'HDRI atlas absent');
  assert(state.models['Tablas fresno V03']?.meshInstances>0,'plank geometry not rendered');
  assert(state.models['Tronco fresno V02']?.meshInstances>0,'log geometry not rendered');
  // Extract pixels from the REAL WebGL canvas instead of Chromium screenshot
  const base64=await page.evaluate(()=>{
   const canvas=document.querySelector('#screen');
   return canvas.toDataURL('image/png').split(',')[1];
  });
  const data=Buffer.from(base64,'base64');
  assert(data.length>30000,'blank WebGL canvas');
  fs.writeFileSync(path.join(base,'fresno_v03_playcanvas_hdri_real.png'),data);
  console.log('REAL_WEBGL_CAPTURE',data.length,'bytes');
 }finally{await browser.close();server.kill();}
})().catch(e=>{console.error('TEST_FAILURE',e);process.exitCode=1});
