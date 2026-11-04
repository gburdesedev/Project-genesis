'use strict';
/* Read-only Project Genesis browser reconnaissance: screenshot actual in-game facade
 * while Q1 is at step zero, collect world/local transforms and mesh AABBs.
 * Never changes scene assets, shaders, approved geometry, or main.
 */
const {chromium}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const mode=process.env.GENESIS_AUDIT_MODE||'desktop';
const options={
 desktop:{viewport:{width:1280,height:720},isMobile:false,hasTouch:false},
 portrait:{viewport:{width:390,height:844},isMobile:true,hasTouch:true},
 landscape:{viewport:{width:844,height:390},isMobile:true,hasTouch:true}
}[mode];
if(!options)throw Error('Invalid audit mode '+mode);
const OUT='/tmp/genesis-v0182-inspection/'+mode;
fs.mkdirSync(OUT,{recursive:true});
const viewpoints=[
 {id:'herrero-front',building:'Herrero',eye:[0,1.65,5.8],target:[0,1.50,-.5]},
 {id:'herrero-oblique',building:'Herrero',eye:[3.5,1.8,4.6],target:[0,1.5,-.5]},
 {id:'curtidor-front',building:'Curtidor',eye:[14,1.65,5.8],target:[14,1.50,-.5]},
 {id:'curtidor-oblique',building:'Curtidor',eye:[17.2,1.8,4.4],target:[14,1.5,-.5]},
 {id:'arcanista-front',building:'Arcanista',eye:[18.2,1.65,16],target:[25.5625,1.5,16]},
 {id:'arcanista-oblique',building:'Arcanista',eye:[18,1.8,19.6],target:[25.5625,1.5,16]}
];
const save=(name,value)=>fs.writeFileSync(OUT+'/'+name,JSON.stringify(value,null,2));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let page;const log={mode,shots:[],consoleErrors:[],pageErrors:[],modelTransforms:[],plan:null};
 try{
  page=await browser.newPage({...options,deviceScaleFactor:1});
  page.on('pageerror',e=>log.pageErrors.push(String(e.stack||e)));
  page.on('console',msg=>{if(msg.type()==='error')log.consoleErrors.push(msg.text())});
  await page.goto('http://127.0.0.1:8765/v0181/?audit='+mode,{waitUntil:'domcontentloaded',timeout:75000});
  await page.locator('#start-blacksmith').click({timeout:25000});
  await page.waitForFunction(()=>document.getElementById('v011-pause')?.textContent.includes('Carga finalizada'),null,{timeout:180000,polling:300});
  const initial=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
  assert(initial?.workshops?.ok,'GLBs failed');
  assert.equal(initial.village?.count,5);
  await page.locator('#v011-pause button').first().click({timeout:25000});
  await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.state==='arriving',null,{timeout:25000});
  await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.skip());
  await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.loadingHidden===false,null,{timeout:25000});
  await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.village?.doorAngle<1,null,{timeout:20000});
  log.initialAudit=await page.evaluate(()=>{
    const a=window.__GENESIS_V011_AUDIT__?.();
    return {version:a?.version,quest:a?.legacy,doorAngle:a?.village?.doorAngle,buildings:a?.village?.buildings,ui:{portrait:matchMedia('(orientation:portrait)').matches,coarse:matchMedia('(pointer:coarse)').matches}};
  });
  console.log('AUDIT INITIAL',JSON.stringify(log.initialAudit));
  log.plan=await page.evaluate(()=>window.GenesisVillagePlan?.workshops);
  // Geometry and actual transforms are inspected without changing the game.
  log.modelTransforms=await page.evaluate(()=>{
    const pc=window.pc,app=pc?.Application?.getApplication?.()||pc?.app;
    const root=app?.root?.findByName('Project Genesis V017 · aldeia cinco talleres');
    if(!root)throw Error('Original five-workshop root not found');
    const vals=v=>v&&[v.x,v.y,v.z].map(n=>Number(n.toFixed(4)));
    function transform(e){
      if(!e)return null;
      const o={name:e.name,localPosition:vals(e.getLocalPosition()),position:vals(e.getPosition()),localEuler:vals(e.getLocalEulerAngles()),localScale:vals(e.getLocalScale()),worldEuler:vals(e.getEulerAngles())};
      const meshes=e.findComponents('render').flatMap(r=>(r.meshInstances||[]).map(mi=>{
        const b=mi.aabb;if(!b)return null;
        return {mesh:mi.mesh?.id??null,node:mi.node?.name??null,material:mi.material?.name??null,center:vals(b.center),halfExtents:vals(b.halfExtents)}
      }).filter(Boolean));
      o.meshes=meshes.slice(0,14);
      o.rendererCount=meshes.length;
      return o;
    }
    return window.GenesisVillagePlan.workshops.map(p=>{
      const building=root.findByName(p.profession+' · fachada V017');
      const shell=building?.findByName('Mampostería real PBR · '+p.profession);
      const roof=building?.findByName('Cubierta V013 · '+p.profession);
      const herrero=building?.findByName('Herrero · bisagra izquierda original');
      const arcane=building?.findByName('Arcanista · puerta mágica V027 · cerrada');
      const temp=building?.findByName(p.profession+' · puerta temporal de tablones');
      return {profession:p.profession,plan:p,building:transform(building),shell:transform(shell),roof:transform(roof),
        hinge:transform(herrero),arcanePivot:transform(arcane),temporaryDoor:transform(temp),
        doorVisual:transform(herrero?.children?.[0]||arcane?.children?.[0]||null)};
    });
  });
  save('actual-transforms.json',log.modelTransforms);
  // Camera override is used ONLY for screenshots after the actual game has loaded.
  await page.addStyleTag({content:'#hud,#mobile,#orientation,#settings,#controls,#ui,#legacyQuest,#legacyPrompt,#prompt,#cameraGuide,#modalLayer{display:none!important}'});
  for(const shot of viewpoints){
    try {
      const projections=await page.evaluate(({eye,target})=>{
        const pc=window.pc,app=pc?.Application?.getApplication?.()||pc?.app;
        const cam=app?.root?.findByName('Camara');
        if(!cam?.camera)throw Error('Camara missing');
        window.__GENESIS_AUDIT_UNHOOK__?.();
        const draw=()=>{cam.setPosition(...eye);cam.lookAt(...target)};
        app.on('prerender',draw);window.__GENESIS_AUDIT_UNHOOK__=()=>app.off('prerender',draw);
        draw();
        const o={eye,target};
        return o;
      },shot);
      await page.waitForTimeout(500);
      const png=OUT+'/'+shot.id+'.png';
      await page.screenshot({path:png,timeout:60000,animations:'disabled'});
      log.shots.push({...shot,png,ok:true,projections});
      console.log('CAPTURE',mode,shot.id);
    }catch(e){
      log.shots.push({...shot,ok:false,error:String(e)});
      console.error('SHOT ERROR',mode,shot.id,String(e).slice(0,400));
    }
    save('browser-summary.json',log);
  }
  await page.evaluate(()=>window.__GENESIS_AUDIT_UNHOOK__?.());
  save('browser-summary.json',log);
  console.log('AUDIT FINISHED',JSON.stringify({mode,shots:log.shots.filter(x=>x.ok).length,errors:log.pageErrors.length}));
  if(log.shots.filter(x=>x.ok).length<3)throw Error('Insufficient screenshots');
 }finally{if(page)await page.close();await browser.close();}
})().catch(e=>{console.error('GENESIS V0182 EXPLORATION FAILED',e.stack||String(e));process.exitCode=1;});
