import * as pc from 'playcanvas';
const canvas=document.getElementById('viewport');
const opts=new pc.AppOptions();
opts.graphicsDevice=await pc.createGraphicsDevice(canvas,{deviceTypes:[pc.DEVICETYPE_WEBGL2],antialias:true,alpha:false});
opts.componentSystems=[pc.RenderComponentSystem,pc.CameraComponentSystem,pc.LightComponentSystem];
opts.resourceHandlers=[pc.TextureHandler,pc.ContainerHandler];
const app=new pc.AppBase(canvas);
app.init(opts);app.setCanvasResolution(pc.RESOLUTION_FIXED,1100,750);app.start();
document.getElementById('genesisApp').app=app;
app.scene.ambientLight=new pc.Color(.45,.47,.55);app.scene.exposure=1.25;app.scene.toneMapping=pc.TONEMAP_ACES;
function lamp(name,rot,color,power){
 const e=new pc.Entity(name);e.addComponent('light',{type:'directional',color:new pc.Color(...color),intensity:power});e.setEulerAngles(...rot);app.root.addChild(e);
}
lamp('NeutralIronReflection',[25,35,0],[.9,.95,1],3.0);
lamp('WarmForgeFill',[12,-35,0],[1,.86,.71],2.5);
const camera=new pc.Entity('OriginalSwordPreviewCamera');
camera.addComponent('camera',{fov:35,nearClip:.01,farClip:100,clearColor:new pc.Color(.013,.019,.032)});
camera.setPosition(0,.02,3.2);camera.lookAt(0,0,0);app.root.addChild(camera);
let sword=null,triangles=0;
const modelSource=new URLSearchParams(location.search).get('model')==='placeholder'?
 '/assets/vendor/genesis/externals/mercSword10/src/sword.glb':
 '/tests/channel-vfx-v014040/source_original_v03.glb';
app.assets.loadFromUrlAndFilename(modelSource,
 'measured_current_sword.glb','container',async(err,asset)=>{
 if(err){window.__vfxError=String(err);return;}
 sword=new pc.Entity('MercSwordTransform');
 app.root.addChild(sword);
 const content=asset.resource.instantiateRenderEntity();
 sword.addChild(content);
 document.getElementById('mercSwordModel').entity=sword;
 document.getElementById('mercSwordModel').contentEntity=content;
 content.forEach(e=>{if(e.render)for(const mi of e.render.meshInstances)triangles+=(mi.mesh?.primitive?.[0]?.count||0)/3});
 try{
  await import('../../genesis_channel_vfx/boot.mjs');
  const manager=window.GenesisChannelVFX;
  if(!manager?.enabled)throw Error('EXPERIMENTAL_MANAGER_NOT_ENABLED');
  const tests=[
   ['base',[]],['fuego',[['Fuego',65]]],['rayo',[['Rayo',70]]],
   ['hielo',[['Hielo',70]]],
   ['tres',[['Fuego',65],['Rayo',70],['Hielo',70]]]
  ];
  const states={};
  for(const [name,affinities] of tests){
    const ok=manager.setItem({affinities});
    const status=manager.status();
    if(name==='base' ? ok!==false : !ok)throw Error('FAILED_SETUP_'+name+' '+JSON.stringify(status));
    states[name]=status;
  }
  manager.setItem({affinities:tests[4][1]});
  const fitted=manager.status().localBounds;
  if(fitted){
    const distance=Math.max(3.2,Math.max(...fitted.span)*1.7);
    camera.setPosition(fitted.center[0],fitted.center[1],fitted.center[2]+distance);
    camera.lookAt(...fitted.center);
  }
  sword.setEulerAngles(0,0,0);
  window.__vfxReady={triangles,states,modelSource,liveManager:manager.status()};
  console.log('GENESIS_V014040_VFX_REAL_V03_HARNESS_READY',JSON.stringify(window.__vfxReady));
 }catch(e){window.__vfxError=e.stack||String(e);console.error(window.__vfxError);}
});
window.__vfxStep=async (name,rotate=0)=>{
 if(!window.__vfxReady)throw Error(window.__vfxError||'NOT_READY');
 const values={fuego:[['Fuego',65]],rayo:[['Rayo',70]],hielo:[['Hielo',70]],
  tres:[['Fuego',65],['Rayo',70],['Hielo',70]],base:[]}[name];
 if(!values)throw Error('UNKNOWN_TEST');
 const accepted=window.GenesisChannelVFX.setItem({affinities:values});
 if(name==='base'?accepted!==false:!accepted)throw Error('CHANNEL_STATE_FAILURE '+name);
 sword.setEulerAngles(0,rotate,0);
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 return window.GenesisChannelVFX.status();
};
