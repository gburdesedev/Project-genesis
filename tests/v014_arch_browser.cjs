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
 const load=url=>new Promise((resolve,reject)=>app.assets.loadFromUrl(url,'container',(error,asset)=>error?reject(error):resolve(asset.resource.instantiateRenderEntity())));
 const [shell,door,roof]=await Promise.all([load('/test-shell.glb'),load('/test-door.glb'),load('https://cdn.jsdelivr.net/gh/agentkaerf/FreeModels@main/Medieval%20Village%20MegaKit%5BStandard%5D/glTF/Roof_RoundTiles_6x10.gltf')]);roof.setLocalScale(1.28,.55,.86);
 const village=await mountVillage(app,{shell,roof,door});window.view={app,village,camera,Vec3};window.ready=true;
}catch(error){window.failure=error.stack||String(error)}
</script></body></html>`;
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost').pathname;if(url==='/'){res.setHeader('Content-Type','text/html');return res.end(html)}if(assets[url]){res.setHeader('Content-Type','model/gltf-binary');return res.end(assets[url])}const file=url==='/engine.mjs'?engine:path.join(root,url);if(!file.startsWith(root)&&file!==engine){res.writeHead(403);return res.end()}if(!fs.existsSync(file)){res.writeHead(404);return res.end()}res.setHeader('Content-Type',file.endsWith('.js')||file.endsWith('.mjs')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.html')?'text/html':'application/octet-stream');fs.createReadStream(file).pipe(res)});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1440,height:1080}});await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.ready||window.failure,{},{timeout:90000});const failure=await page.evaluate(()=>window.failure);assert(!failure,failure);await page.waitForTimeout(700);
 fs.mkdirSync('/tmp/genesis-responsive',{recursive:true});await page.screenshot({path:'/tmp/genesis-responsive/v0.14-village-overview.png',timeout:12000}).catch(err=>console.warn('Captura opcional:',err.message));
 await page.evaluate(()=>{view.camera.setPosition(7,9,31);view.camera.lookAt(new view.Vec3(7,0,10))});await page.waitForTimeout(400);await page.screenshot({path:'/tmp/genesis-responsive/v0.14-village-plaza.png',timeout:12000}).catch(err=>console.warn('Captura opcional:',err.message));
 const state=await page.evaluate(()=>({width:GenesisVillagePlan.bounds.maxX-GenesisVillagePlan.bounds.minX,closed:view.village.blocked(-15.5,16),count:view.village.root.children.filter(e=>e.name.includes('fachada cerrada')).length,scale:view.village.root.children.find(e=>e.name.includes('fachada cerrada')).getLocalScale().x,heightScale:view.village.root.children.find(e=>e.name.includes('fachada cerrada')).getLocalScale().y}));assert.equal(state.width,63);assert.equal(state.closed,true);assert.equal(state.count,5);assert.equal(state.scale,.75);assert.equal(state.heightScale,1);

 await page.evaluate(()=>{
  view.camera.setPosition(19.6,3.8,16);
  view.camera.lookAt(new view.Vec3(25.5625,1.4,16));
 });
 await page.waitForTimeout(1000);
 const arch=await page.evaluate(()=>{
  const root=view.village.root;
  const entity=root.findByName('Arco continuo · anillo PBR de 32 dovelas');
  const fill=root.findByName('Muro superior recortado a la silueta');
  const workshop=root.children.find(e=>e.name.startsWith('Arcanista ·'));
  const oldArch=workshop?.findByName('archstone_0');
  return {ring:entity?.render?.meshInstances?.length||0,fill:fill?.render?.meshInstances?.length||0,oldArchHidden:oldArch?.enabled===false,door:window.__genesisArcaneDoorStatus,glow:window.__genesisArcaneVeinsStatus};
 });
 assert(arch.ring>0&&arch.fill>0,'La fachada no tiene arco curvo ni relleno recortado: '+JSON.stringify(arch));
 assert(arch.oldArchHidden,'El arco viejo rectangular sigue expuesto');
 assert.equal(arch.door?.phase,'ready','La puerta V027 no cargó dentro de la aldea');
 assert(arch.glow?.textureMasks>0,'El emissive V027 no está animado');
 await page.screenshot({path:'/tmp/genesis-responsive/v0.14-arcanista-marco-curvo.png',timeout:12000}).catch(err=>console.warn('Captura opcional:',err.message));
 await page.close();await browser.close();server.close();
 console.log('PASS v0.14 Arcanist curved masonry and animated door in actual village',JSON.stringify(arch));
})().catch(e=>{console.error(e);server.close();process.exit(1)});
