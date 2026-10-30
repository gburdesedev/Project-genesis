// Render the actual cobble and traffic materials in WebGL using the shipped PNGs.
// Does not load roofs/trees or depend on external CDN content.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const engine=require.resolve('playcanvas/build/playcanvas.mjs');
const source=fs.readFileSync(path.join(root,'village_world.js'),'utf8');
const begin=source.indexOf('const ROOT='),end=source.indexOf('function textMaterial(');
assert(begin>0&&end>begin);
const groundModule="import {Entity,StandardMaterial,Texture,Color,ADDRESS_REPEAT,BLEND_NORMAL,FILTER_LINEAR,FILTER_LINEAR_MIPMAP_LINEAR} from 'playcanvas';\n"+
  source.slice(begin,end)+"\nexport {maps,pavedMaterial,mesh};\n";
const html=String.raw`<!doctype html><html><head>
<style>html,body{height:100%;margin:0;background:#151715}canvas{width:100%;height:100%;display:block}</style>
<script type="importmap">{"imports":{"playcanvas":"/engine.mjs"}}</script>
</head><body><canvas></canvas><script type="module">
import {Application,Entity,Color,Vec3} from 'playcanvas';
import {maps,pavedMaterial,mesh} from '/ground-helper.mjs';
try{
 const mobile=new URL(location.href).searchParams.has('mobile');
 const app=new Application(document.querySelector('canvas'),{graphicsDeviceOptions:{antialias:false}});
 app.setCanvasFillMode('FILL_WINDOW');app.setCanvasResolution('AUTO');
 app.scene.ambientLight=new Color(.55,.55,.54);app.start();
 const camera=new Entity('Camera');camera.addComponent('camera',{clearColor:new Color(.12,.13,.14),farClip:80,fov:60});app.root.addChild(camera);
 camera.setPosition(0,4.6,7.7);camera.lookAt(new Vec3(0,0,0));
 const sun=new Entity('Sun');sun.addComponent('light',{type:'directional',color:new Color(1,.92,.80),intensity:1.4,castShadows:false});app.root.addChild(sun);
 sun.setEulerAngles(43,35,0);
 const [cobble,traffic]=await Promise.all([maps(app,'cobble',mobile),maps(app,'traffic',mobile)]);
 const c=pavedMaterial('Adoquín de Génesis',cobble,4,4,2);
 const t=pavedMaterial('Camino de Génesis',traffic,4,4,2);
 mesh(app.root,'adoquin','plane',-2,0,0,4,1,4,c);
 mesh(app.root,'camino','plane',2,0,0,4,1,4,t);
 const describe=maps=>Object.fromEntries(Object.entries(maps).map(([name,texture])=>[name,{width:texture.width,height:texture.height}]));
 window.__ground={mobile,glossInvert:c.glossInvert&&t.glossInvert,
   cobble:describe(cobble),traffic:describe(traffic),
   connected:[c.diffuseMap===cobble.color,c.normalMap===cobble.normal,c.glossMap===cobble.gloss,c.aoMap===cobble.ao,
              t.diffuseMap===traffic.color,t.normalMap===traffic.normal,t.glossMap===traffic.gloss,t.aoMap===traffic.ao],
   tiling:c.diffuseMapTiling.x,
   app};
}catch(e){window.__failure=e.stack||String(e)}
</script></body></html>`;
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost').pathname;
 if(u==='/'){res.setHeader('Content-Type','text/html');return res.end(html)}
 if(u==='/ground-helper.mjs'){res.setHeader('Content-Type','text/javascript');return res.end(groundModule)}
 const file=u==='/engine.mjs'?engine:path.join(root,u);
 if(file!==engine&&!file.startsWith(root)){res.writeHead(403);return res.end()}
 if(!fs.existsSync(file)){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type',file.endsWith('.png')?'image/png':'text/javascript');
 fs.createReadStream(file).pipe(res);
});
let browser;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const mode of ['desktop','mobile']){
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const issues=[];
  page.on('pageerror',e=>issues.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')issues.push(m.text())});
  await page.goto('http://127.0.0.1:'+server.address().port+'/'+(mode==='mobile'?'?mobile':''));
  await page.waitForFunction(()=>window.__ground||window.__failure,null,{timeout:40000});
  const failure=await page.evaluate(()=>window.__failure);
  assert(!failure,'Render failed: '+failure);
  const info=await page.evaluate(()=>{const {app,...v}=window.__ground;return v});
  assert.equal(info.glossInvert,true,'Roughness texture not interpreted as roughness');
  assert(info.connected.every(Boolean),'Missing texture channel binding');
  assert.equal(info.cobble.color.width,1024);
  assert.equal(info.cobble.gloss.width,512);
  assert.equal(info.traffic.color.width,1024);
  assert.equal(info.traffic.ao.width,512);
  assert.equal(info.tiling,2);
  assert(!issues.some(i=>/shader.*(?:error|fail)|(?:error|fail).*shader/i.test(i)),'WebGL shader failures '+issues.join(' / '));
  fs.mkdirSync('/tmp/genesis-ground',{recursive:true});
  await page.screenshot({path:'/tmp/genesis-ground/'+mode+'-pbr.png',timeout:12000}).catch(e=>console.warn('Ground screenshot optional',e.message));
  console.log('PASS GROUND_WEBGL',JSON.stringify(info));
  await page.close();
 }
 await browser.close();
})().catch(async e=>{console.error(e);process.exitCode=1;try{await browser?.close()}catch(_){}}).finally(()=>server.close());
