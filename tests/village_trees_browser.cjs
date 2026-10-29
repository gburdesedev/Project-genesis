// Standalone real PlayCanvas/WebGL screenshot of the approved 29-tree village layout.
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),engine=require.resolve('playcanvas/build/playcanvas.mjs');
const html=`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;background:#111;overflow:hidden}canvas{width:100%;height:100%;display:block}</style><script type="importmap">{"imports":{"playcanvas":"/engine.mjs"}}</script></head><body><canvas id="scene"></canvas><script type="module">
import {Application,Entity,Color,Vec3,StandardMaterial} from 'playcanvas';
import {mountVillageTrees} from '/village_trees.js';
try{
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
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
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
 await page.screenshot({path:'/tmp/genesis-trees/plaza-29-arboles-v0.11.016.png'});
 const status=await page.evaluate(()=>window.__genesisTreeStatus);
 assert.equal(status.planned,29);assert.equal(status.failedVariants,0,'Tree GLB load errors');
 console.log('PASS real PlayCanvas tree screenshot',JSON.stringify(status));
 await browser.close();
})().finally(()=>server.close()).catch(err=>{console.error(err);process.exitCode=1});
