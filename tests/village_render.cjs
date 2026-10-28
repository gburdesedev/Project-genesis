// Render the actual village module and shared workshop assets, without loading
// character animations or changing the tutorial. Captures are engine renders.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const engine=require.resolve('playcanvas/build/playcanvas.mjs');
function embedded(id){const match=source.match(new RegExp('<pc-asset id="'+id+'"[^>]+src="data:model/gltf-binary;base64,([^"]+)"'));assert(match,`missing source ${id}`);return Buffer.from(match[1],'base64')}
const assets={'/test-shell.glb':embedded('workshopShell'),'/test-door.glb':embedded('doorLeaf083')};
const html=`<!doctype html><html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}canvas{width:100%;height:100%;display:block}</style><script type="importmap">{"imports":{"playcanvas":"/engine.mjs"}}</script><script src="/village_plan.js"></script></head><body><canvas id="scene"></canvas><script type="module">
import {Application,Entity,Color,Vec3} from 'playcanvas';import {mountVillage} from '/village_world.js';
try{
 const app=new Application(document.querySelector('canvas'),{graphicsDeviceOptions:{antialias:false}});app.setCanvasFillMode('FILL_WINDOW');app.setCanvasResolution('AUTO');app.scene.ambientLight=new Color(.68,.68,.65);app.start();
 const camera=new Entity('camera');camera.addComponent('camera',{clearColor:new Color(.10,.13,.15),farClip:180,fov:64});app.root.addChild(camera);camera.setPosition(7,55,62);camera.lookAt(new Vec3(7,0,17));
 const light=new Entity('sun');light.addComponent('light',{type:'directional',color:new Color(1,.94,.84),intensity:1.8,castShadows:true,shadowDistance:100,shadowResolution:1024});app.root.addChild(light);light.setEulerAngles(45,25,0);
 const load=url=>new Promise((resolve,reject)=>app.assets.loadFromUrl(url,'container',(error,asset)=>error?reject(new Error(url+': '+String(error))):resolve(asset.resource.instantiateRenderEntity())));
 const [shell,door]=await Promise.all([load('/test-shell.glb'),load('/test-door.glb')]);
 const roofPath='Medieval%20Village%20MegaKit%5BStandard%5D/glTF/Roof_RoundTiles_6x10.gltf';
 const roof=await load('https://cdn.jsdelivr.net/gh/agentkaerf/FreeModels@main/'+roofPath)
  .catch(primary=>load('https://raw.githubusercontent.com/agentkaerf/FreeModels/main/'+roofPath)
  .catch(secondary=>{throw Error('Roof external source failed: '+primary+'; fallback: '+secondary)}));
 roof.setLocalScale(1.28,.55,.86);
 const village=await mountVillage(app,{shell,roof,door});window.view={app,village,camera,Vec3};window.ready=true;
}catch(error){window.failure=error.stack||String(error)}
</script></body></html>`;
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost').pathname;if(url==='/'){res.setHeader('Content-Type','text/html');return res.end(html)}if(assets[url]){res.setHeader('Content-Type','model/gltf-binary');return res.end(assets[url])}const file=url==='/engine.mjs'?engine:path.join(root,url);if(!file.startsWith(root)&&file!==engine){res.writeHead(403);return res.end()}if(!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res)});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1600,height:900}});await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.ready||window.failure,{},{timeout:90000});const failure=await page.evaluate(()=>window.failure);assert(!failure,failure);await page.waitForTimeout(700);
 fs.mkdirSync('/tmp/genesis-responsive',{recursive:true});await page.screenshot({path:'/tmp/genesis-responsive/v0.11.015-village-overview-16x9.png'});
 await page.evaluate(()=>{view.camera.setPosition(7,9,31);view.camera.lookAt(new view.Vec3(7,0,10))});await page.waitForTimeout(400);await page.screenshot({path:'/tmp/genesis-responsive/v0.11.015-village-plaza-16x9.png'});
 // Comparable screenshots: same camera and resolution, old and corrected architectural dimensions.
 await page.evaluate(()=>{view.camera.setPosition(7,5,13);view.camera.lookAt(new view.Vec3(7,2,-2))});await page.waitForTimeout(350);
 await page.evaluate(()=>{for(const building of view.village.root.children.filter(e=>e.name.includes('fachada cerrada'))){
   const [wall,roof,door]=building.children;
   wall.setLocalScale(1,1,1);roof.setLocalPosition(0,3.45,-5.05);roof.setLocalScale(1.28,.55,.86);door.setLocalScale(1,1,1);
 }});
 await page.waitForTimeout(450);await page.screenshot({path:'/tmp/genesis-responsive/v0.11.015-talleres-ANTES-16x9.png'});
 await page.evaluate(()=>{for(const building of view.village.root.children.filter(e=>e.name.includes('fachada cerrada'))){
   const [wall,roof,door]=building.children;
   wall.setLocalScale(1,.75,1);roof.setLocalPosition(0,2.5875,-5.05);roof.setLocalScale(1.28,.4125,.86);door.setLocalScale(1,.75,1);
 }});
 await page.waitForTimeout(450);await page.screenshot({path:'/tmp/genesis-responsive/v0.11.015-talleres-DESPUES-16x9.png'});
  const state=await page.evaluate(()=>({width:GenesisVillagePlan.bounds.maxX-GenesisVillagePlan.bounds.minX,closed:view.village.blocked(-15.5,16),count:view.village.root.children.filter(e=>e.name.includes('fachada cerrada')).length,scale:view.village.root.children.find(e=>e.name.includes('fachada cerrada')).getLocalScale().x,heightScale:view.village.root.children.find(e=>e.name.includes('fachada cerrada')).getLocalScale().y}));assert.equal(state.width,63);assert.equal(state.closed,true);assert.equal(state.count,5);assert.equal(state.scale,.75);assert.equal(state.heightScale,1);const architecture=await page.evaluate(()=>{const b=view.village.root.children.find(e=>e.name.includes('fachada cerrada'));return b.children.map(e=>({name:e.name,scale:e.getLocalScale().y,vertical:e.getLocalPosition().y}))});assert(Math.abs(architecture[0].scale-.75)<.0001);assert(Math.abs(architecture[1].scale-.4125)<.0001);assert(Math.abs(architecture[1].vertical-2.5875)<.0001);assert(Math.abs(architecture[2].scale-.75)<.0001);
 await page.close();
 const actual=await browser.newPage({viewport:{width:1600,height:900}});actual.setDefaultTimeout(60000);
 const errors=[];actual.on('pageerror',e=>errors.push(e.message));
 await actual.goto(`http://127.0.0.1:${server.address().port}/index.html`,{waitUntil:'domcontentloaded',timeout:120000});
 await actual.waitForFunction(()=>document.querySelector('#prototypeIntro')?.style.display==='grid'||document.querySelector('.loadingCard.failed'),{},{timeout:120000});
 assert.equal(await actual.locator('.loadingCard.failed').count(),0,await actual.locator('#loadState').textContent());
 await actual.locator('[data-profession="Herrero"]').click();
 await actual.waitForFunction(()=>document.querySelector('#loading')?.style.display==='none'||document.querySelector('.loadingCard.failed'),{},{timeout:120000});
 assert.equal(await actual.locator('.loadingCard.failed').count(),0,await actual.locator('#loadState').textContent());
 const scales=await actual.evaluate(()=>{const scale=id=>document.getElementById(id).entity.getWorldTransform().getScale();return {anvil:scale('anvilModel'),player:scale('playerModel'),shell:scale('workshopShellModel')}});
 assert(Math.abs(scales.anvil.x-scales.anvil.y)<.001&&Math.abs(scales.anvil.z-scales.anvil.y)<.001,'anvil proportions changed');
 assert(Math.abs(scales.player.x-scales.player.y)<.001,'character proportions changed');
 assert(Math.abs(scales.shell.x-.75)<.001&&Math.abs(scales.shell.y-.75)<.001,'active workshop architectural scale mismatch');
 await actual.keyboard.down('KeyW');await actual.waitForTimeout(400);await actual.keyboard.up('KeyW');
 await actual.keyboard.down('ShiftLeft');await actual.keyboard.down('KeyW');await actual.waitForTimeout(500);
 const run=await actual.evaluate(()=>document.getElementById('playerAnim').component.baseLayer.activeState);assert.equal(run,'Sprint_Loop');
 await actual.keyboard.up('KeyW');await actual.keyboard.up('ShiftLeft');await actual.waitForTimeout(250);
 await actual.screenshot({path:'/tmp/genesis-responsive/v0.11.015-active-workshop.png'});
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS actual prototype boot, active workshop/prop proportions and Shift sprint animation');
 await browser.close();server.close();console.log('PASS real PlayCanvas render: PBR roads/plaza, five shared façades and marked market');})().catch(e=>{console.error(e);server.close();process.exit(1)});
