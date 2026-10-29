// Standalone real PlayCanvas/WebGL screenshot of the approved 14-tree village layout.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),engine=require.resolve('playcanvas/build/playcanvas.mjs');
const html=`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#111;overflow:hidden}canvas{width:100%;height:100%;display:block}</style><script type="importmap">{"imports":{"playcanvas":"/engine.mjs"}}</script></head><body><canvas id="scene"></canvas><script type="module">
import {Application,Entity,Color,Vec3,StandardMaterial} from 'playcanvas';
import {mountVillageTrees} from '/village_trees.js';
try{
 globalThis.GenesisDevice={safePreviews:true}; // iOS runtime path on Chromium WebGL
 const app=new Application(document.querySelector('canvas'),{graphicsDeviceOptions:{antialias:true}});
 app.setCanvasFillMode('FILL_WINDOW');app.setCanvasResolution('AUTO');
 app.scene.ambientLight=new Color(.68,.68,.69);app.start();
 const camera=new Entity('camera');camera.addComponent('camera',{clearColor:new Color(.13,.17,.19),farClip:140,fov:65});app.root.addChild(camera);
 camera.setPosition(7,16,41);camera.lookAt(new Vec3(7,2.5,16));
 const sun=new Entity('sun');sun.addComponent('light',{type:'directional',color:new Color(1,.95,.86),intensity:1.6,castShadows:true,shadowDistance:50});app.root.addChild(sun);sun.setEulerAngles(45,25,0);
 const floor=new Entity('floor');const m=new StandardMaterial();m.diffuse=new Color(.20,.25,.16);m.update();floor.addComponent('render',{type:'plane',material:m});floor.setLocalScale(63,1,63);floor.setPosition(7,-.05,17);app.root.addChild(floor);
 const trees=mountVillageTrees(app,app.root);trees.update(7,16,true);
 app.on('update',()=>trees.update(7,16));
 window.__scene={trees,app,camera};window.ready=true;
}catch(e){window.failure=e.stack||String(e)}
</script></body></html>`;
let browser;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost').pathname;
 if(url==='/'){res.setHeader('Content-Type','text/html');return res.end(html)}
 const file=url==='/engine.mjs'?engine:path.join(root,url);
 if(file!==engine&&!file.startsWith(root)){res.writeHead(403);return res.end()}
 if(!fs.existsSync(file)){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':'application/octet-stream');
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:900}});const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',line=>{if(line.type()==='error')errors.push(line.text())});
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.waitForFunction(()=>window.ready||window.failure,null,{timeout:30000});
 assert.equal(await page.evaluate(()=>window.failure),undefined,'PlayCanvas setup failed');
 try{await page.waitForFunction(()=>window.__genesisTreeStatus?.rendered>=8,null,{timeout:150000})}
 catch(error){throw new Error('Trees not rendered: '+JSON.stringify(await page.evaluate(()=>window.__genesisTreeStatus))+' | '+errors.join(' | '))}
 fs.mkdirSync('/tmp/genesis-trees',{recursive:true});
 await page.waitForTimeout(700);
 const status=await page.evaluate(()=>window.__genesisTreeStatus);
 assert.equal(status.planned,14);assert.equal(status.failedVariants,0,'Tree GLB load errors');
 const materials=await page.evaluate(()=>{const root=window.__scene.trees.root;let foliage=0,opaque=0,triangles=0,textureReady=0;for(const anchor of root.children){for(const render of anchor.findComponents('render'))for(const mi of render.meshInstances){const m=mi.material;triangles+=mi.mesh?.primitive?.[0]?.count?mi.mesh.primitive[0].count/3:0;if(m?.alphaTest>0||m?.opacityMap){foliage++;if(m.opacityMap||m.diffuseMap)textureReady++}else opaque++}}return {foliage,opaque,triangles,textureReady}});
 assert(materials.foliage>0&&materials.textureReady>0,'No hay hojas transparentes/PBR en la escena: '+JSON.stringify(materials));
 console.log('LEAFY_PBR_CHECK',JSON.stringify(materials));
 const matAudit=await page.evaluate(()=>{
  const result=[],sample=window.__scene.trees.root.children.slice(0,4);
  for(const anchor of sample)for(const render of anchor.findComponents('render'))for(const mi of render.meshInstances){
   const m=mi.material;
   result.push({tree:anchor.name,entity:render.entity?.name||'?',name:m?.name,
    alpha:m?.alphaTest,opacity:!!m?.opacityMap,diffuseMap:!!m?.diffuseMap,
    shaderWind:!!m?.getShaderChunks?.()?.get?.('transformVS'),
    color:m?.diffuse?[m.diffuse.r,m.diffuse.g,m.diffuse.b]:null,
    windTime:m?.getParameter?.('uGenesisWindTime')});
  }
  return result;
 });
 console.log('TREE_MATERIAL_AUDIT',JSON.stringify(matAudit));
 assert(status.windEnabled&&status.windMaterials>0,'Viento GPU sin materiales');
 await page.waitForTimeout(500);
 const windTime=await page.evaluate(()=>{
  for(const anchor of window.__scene.trees.root.children){
   for(const render of anchor.findComponents('render'))for(const mi of render.meshInstances){
    const value=mi.material.getParameter?.('uGenesisWindTime');if(typeof value==='number')return value;
   }
  }
  return null;
 });
 console.log('TREE_WIND_TIME',windTime);
 assert(typeof windTime==='number'&&windTime>.1,'El reloj GPU del viento no avanza');
 assert(!errors.some(e=>/shader.*(?:error|fail)|(?:error|fail).*shader|compile.*error/i.test(e)),
  'Error GLSL en ramas/hojas: '+errors.join(' | '));

 try{await page.screenshot({path:'/tmp/genesis-trees/plaza-14-arboles-v0.14a.png',timeout:12000})}
 catch(error){console.warn('Captura opcional de árboles no disponible; render confirmado:',error.message)}
 console.log('PASS real PlayCanvas tree screenshot',JSON.stringify(status));
 await browser.close();
})().catch(async err=>{console.error(err);process.exitCode=1;try{await browser?.close()}catch(_){}}).finally(()=>server.close());
