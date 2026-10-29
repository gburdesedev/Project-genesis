// Real PlayCanvas/WebGL gate: the approved Arcanist V027 WebGL GLB must decode and render.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),engine=require.resolve('playcanvas/build/playcanvas.mjs');
const html=`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#101920;overflow:hidden}canvas{width:100%;height:100%;display:block}</style><script type="importmap">{"imports":{"playcanvas":"/engine.mjs"}}</script></head><body><canvas></canvas><script type="module">
import {Application,Entity,Color,Vec3,StandardMaterial} from 'playcanvas';
import {mountArcanePortal} from '/village_arcanist.js';
try{
 globalThis.GenesisDevice={safePreviews:true}; // iOS runtime path
 const app=new Application(document.querySelector('canvas'),{graphicsDeviceOptions:{antialias:true}});
 app.setCanvasFillMode('FILL_WINDOW');app.setCanvasResolution('AUTO');app.scene.ambientLight=new Color(.53,.48,.42);app.start();
 const camera=new Entity('camera');camera.addComponent('camera',{clearColor:new Color(.12,.16,.20),farClip:90,fov:52});app.root.addChild(camera);
 camera.setPosition(0,2,5);camera.lookAt(new Vec3(0,1.18,0));
 const sun=new Entity('sun');sun.addComponent('light',{type:'directional',color:new Color(.95,.88,.81),intensity:1.48,castShadows:true});app.root.addChild(sun);sun.setEulerAngles(48,-35,0);
 const floor=new Entity('floor');const m=new StandardMaterial();m.diffuse=new Color(.31,.30,.28);m.update();floor.addComponent('render',{type:'plane',material:m});floor.setLocalScale(16,1,16);floor.setPosition(0,-.05,0);app.root.addChild(floor);
 const building=new Entity('arcanista');app.root.addChild(building);
 const fallback=new Entity('placeholder');fallback.addComponent('render',{type:'box',material:m});fallback.setLocalScale(1.24,2.32,.2);fallback.setLocalPosition(0,1.16,.1);building.addChild(fallback);
 const portal=mountArcanePortal(app,building,fallback);window.__arcana={portal,fallback,app};window.ready=true;
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
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',line=>{if(line.type()==='error')errors.push(line.text())});
 await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.waitForFunction(()=>window.ready||window.failure,null,{timeout:30000});
 assert.equal(await page.evaluate(()=>window.failure),undefined,'PlayCanvas setup failed');
 await page.waitForFunction(()=>window.__genesisArcaneDoorStatus?.phase!=='loading',null,{timeout:90000});
 const status=await page.evaluate(()=>({status:window.__genesisArcaneDoorStatus,placeholderEnabled:window.__arcana.fallback.enabled,renderers:window.__arcana.portal.pivot.findComponents('render').length}));
 assert.equal(status.status.phase,'ready',JSON.stringify(status)+' | '+errors.join(' | '));
 assert.equal(status.placeholderEnabled,false,'old door not hidden');
 assert(status.renderers>0,'V027 no render components');
 await page.waitForFunction(()=>window.__genesisArcaneVeinsStatus?.updatedFrames>=3,null,{timeout:15000});
 const glow=await page.evaluate(()=>window.__genesisArcaneVeinsStatus);
 assert(glow.textureMasks>0,'La animación emissive V027 no generó texturas activas');
 assert(glow.phaseA>=-.35&&glow.phaseB>=-.65,'corrientes sin avance');
 assert(glow.emissionStrength>=5,'La intensidad emisiva de Blender V027 no fue preservada: '+JSON.stringify(glow));
 fs.mkdirSync('/tmp/genesis-trees',{recursive:true});await page.waitForTimeout(500);
 await page.screenshot({path:'/tmp/genesis-trees/arcanista-v027-webgl-v0.14a.png'});
 console.log('PASS real PlayCanvas Arcanist V027',JSON.stringify(status),JSON.stringify(glow));
 await browser.close();
})().catch(async err=>{console.error(err);process.exitCode=1;try{await browser?.close()}catch(_){}}).finally(()=>server.close());
