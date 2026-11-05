/* Project Genesis 0.15-V012 — approved original village FLOORS only.
 * This module intentionally does not mount buildings, characters, props or trees.
 * Geometry and PBR maps are taken from village_world.js / village_plan.js.
 */
(function () {
  'use strict';
  const ROOT = new URL('../assets/world/v0.11.004/', document.baseURI).href;
  const EDGE = 1024;
  const report = {version:'0.15-V012', status:'not-started', downloaded:0, surfaces:[], textures:[], errors:[], ready:null};

  async function fetchPng(file, diag) {
    const id = 'floor-' + file;
    const controller = new AbortController();
    let lastProgress = Date.now();
    const watchdog = setInterval(() => {
      if (Date.now() - lastProgress >= 120000) controller.abort('120 s without download progress');
    }, 1000);
    let reader;
    try {
      diag?.asset(id, 'request', {url:'assets/world/v0.11.004/'+file});
      const response = await fetch(ROOT+file, {signal:controller.signal});
      if (!response.ok) throw new Error('HTTP '+response.status+': '+file);
      const expected = Number(response.headers.get('content-length')) || null;
      const parts = [];
      let loaded = 0;
      if (response.body?.getReader) {
        reader = response.body.getReader();
        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          parts.push(value);
          loaded += value.byteLength;
          lastProgress = Date.now();
          diag?.asset(id,'downloading',{loaded,total:expected});
        }
      } else {
        const bytes = await response.arrayBuffer();
        loaded = bytes.byteLength;
        parts.push(bytes);
        diag?.asset(id,'downloading',{loaded,total:expected});
      }
      if (!loaded) throw new Error('Empty PNG: '+file);
      report.downloaded += loaded;
      diag?.asset(id,'downloaded',{loaded,total:expected});
      return new Blob(parts,{type:'image/png'});
    } finally {
      clearInterval(watchdog);
      reader?.releaseLock?.();
    }
  }

  async function loadMap(app, name, mobile, diag) {
    const blob = await fetchPng(name,diag);
    const objectURL=URL.createObjectURL(blob);
    const image=new Image();
    let source=image;
    try {
      image.decoding='async';
      image.src=objectURL;
      await image.decode();
      if (mobile && Math.max(image.naturalWidth,image.naturalHeight)>EDGE) {
        const ratio=EDGE/Math.max(image.naturalWidth,image.naturalHeight);
        const downsized=document.createElement('canvas');
        downsized.width=Math.max(1,Math.round(image.naturalWidth*ratio));
        downsized.height=Math.max(1,Math.round(image.naturalHeight*ratio));
        const ctx=downsized.getContext('2d',{alpha:false});
        if (!ctx) throw Error('Cannot downsample '+name);
        ctx.drawImage(image,0,0,downsized.width,downsized.height);
        source=downsized;
      }
      const pc=globalThis.pc;
      const texture=new pc.Texture(app.graphicsDevice,{
        name:'Genesis original floor '+name,
        srgb:name.endsWith('_color.png'),
        mipmaps:true,
        minFilter:pc.FILTER_LINEAR_MIPMAP_LINEAR,
        magFilter:pc.FILTER_LINEAR,
        addressU:pc.ADDRESS_REPEAT,
        addressV:pc.ADDRESS_REPEAT
      });
      texture.setSource(source);
      report.textures.push(name);
      diag?.asset('floor-'+name,'ready',{width:source.width||source.naturalWidth,height:source.height||source.naturalHeight});
      return texture;
    } finally {
      URL.revokeObjectURL(objectURL);
      if (source!==image) image.src='';
    }
  }

  async function loadSet(app, name, mobile, diag, allocated) {
    const result={};
    for (const kind of ['color','normal','gloss','ao']) {
      const texture=await loadMap(app,name+'_'+kind+'.png',mobile,diag);
      allocated.push(texture);
      result[kind]=texture;
    }
    return result;
  }

  function material(name, maps, w, d, meters=2) {
    const pc=globalThis.pc;
    const m=new pc.StandardMaterial();
    m.name=name;
    m.diffuse=new pc.Color(1,1,1);
    m.gloss=1;
    m.diffuseMap=maps.color;
    m.normalMap=maps.normal;
    m.bumpiness=.75;
    m.glossMap=maps.gloss;
    m.glossMapChannel='r';
    m.aoMap=maps.ao;
    m.aoMapUv=0;
    for (const kind of ['diffuse','normal','gloss','ao']) {
      m[kind+'MapTiling'].set(w/meters,d/meters);
    }
    m.update();
    return m;
  }

  function addPlane(root,name,x,y,z,w,d,m) {
    const pc=globalThis.pc;
    const entity=new pc.Entity(name);
    entity.addComponent('render',{type:'plane',material:m,receiveShadows:true,castShadows:false});
    entity.setLocalPosition(x,y,z);
    entity.setLocalScale(w,1,d);
    root.addChild(entity);
    report.surfaces.push(name);
  }

  function edgeMask(app) {
    const pc=globalThis.pc;
    const canvas=document.createElement('canvas');
    canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d');
    const pixels=ctx.createImageData(128,128);
    for(let y=0;y<128;y++) for(let x=0;x<128;x++){
      const u=x/127,v=y/127;
      const jitter=.012*Math.sin(v*71)+.008*Math.cos(v*127);
      const edge=Math.min(u+jitter,1-u-jitter)/.075;
      const end=Math.min(v,1-v)/.035;
      const a=Math.max(0,Math.min(1,edge,end));
      pixels.data.set([255,255,255,Math.round(a*255)],(y*128+x)*4);
    }
    ctx.putImageData(pixels,0,0);
    const texture=new pc.Texture(app.graphicsDevice,{
      name:'Genesis original road feathering',mipmaps:false,
      minFilter:pc.FILTER_LINEAR,magFilter:pc.FILTER_LINEAR
    });
    texture.setSource(canvas);
    return texture;
  }

  function makeSurfaces(app,plan,cobble,traffic) {
    const pc=globalThis.pc;
    const root=new pc.Entity('Project Genesis · pisos originales 63x63');
    app.root.addChild(root);
    try {
      addPlane(root,'Pavimento exterior adoquín',7,-.024,17,63,63,
        material('Adoquín · exterior',cobble,63,63));
      const plaza=plan.plaza;
      addPlane(root,'Plaza central',plaza.x,-.010,plaza.z,plaza.w,plaza.d,
        material('Adoquín · plaza',cobble,plaza.w,plaza.d,2.4));
      for (const [x,z,w,d] of [
        [plaza.x-plaza.w/2,plaza.z,.35,plaza.d],
        [plaza.x+plaza.w/2,plaza.z,.35,plaza.d],
        [plaza.x,plaza.z-plaza.d/2,plaza.w,.35],
        [plaza.x,plaza.z+plaza.d/2,plaza.w,.35]
      ]) {
        const border=material('Borde de plaza',cobble,w,d,1.2);
        border.diffuse.set(.68,.68,.64);
        border.update();
        addPlane(root,'Marco de plaza',x,-.004,z,w,d,border);
      }
      const edge=edgeMask(app);
      for (const road of plan.roads) {
        const m=material(road.name,traffic,road.w,road.d);
        m.opacityMap=edge;
        m.opacityMapChannel='a';
        m.blendType=pc.BLEND_NORMAL;
        m.depthWrite=false;
        m.update();
        addPlane(root,road.name,road.x,.006,road.z,road.w,road.d,m);
      }
      const market=plan.market;
      addPlane(root,'Mercado · área de referencia',market.x,-.006,market.z,market.w,market.d,
        material('Adoquín · mercado',cobble,market.w,market.d));
      return root;
    } catch(error) {
      root.destroy();
      throw error;
    }
  }

  report.install = function(app,fallbackFloor,diag) {
    if (report.ready) return report.ready;
    report.status='loading';
    report.ready=(async()=>{
      const allocated=[];
      try {
        const plan=globalThis.GenesisVillagePlan;
        if (!plan || plan.roads?.length!==9) throw Error('Original village floor plan missing');
        const mobile=matchMedia('(pointer:coarse)').matches;
        diag?.block('floors','loading',{version:report.version,mobile,resources:8});
        const cobble=await loadSet(app,'cobble',mobile,diag,allocated);
        const traffic=await loadSet(app,'traffic',mobile,diag,allocated);
        const root=makeSurfaces(app,plan,cobble,traffic);
        fallbackFloor.enabled=false;
        report.status='ready';
        diag?.block('floors','ready',{surfaces:report.surfaces.length,textures:report.textures.length});
        return {ok:true,root,surfaces:report.surfaces.length,textures:report.textures.length};
      }catch(error){
        report.status='fallback';
        report.errors.push(String(error?.stack||error));
        if(fallbackFloor) fallbackFloor.setPosition(7,-.1,17);
        for(const texture of allocated) texture.destroy?.();
        diag?.block('floors','fallback',{message:String(error?.message||error)});
        return {ok:false,error:String(error?.message||error)};
      }
    })();
    return report.ready;
  };
  globalThis.GenesisV012Floors=report;
})();