'use strict';
/* V018.4 candidate QA. Render actual PlayCanvas Chromium views of all three
 * CLOSED V027 doors, and audit per-instance PBR/emissive materials. No main writes. */
const {chromium}=require('playwright');
const fs=require('node:fs'), assert=require('node:assert/strict');
const mode=process.env.GENESIS_AUDIT_MODE||'desktop';
const modes={
 desktop:{viewport:{width:1280,height:720},isMobile:false,hasTouch:false},
 landscape:{viewport:{width:844,height:390},isMobile:true,hasTouch:true},
 portrait:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}
};
const device=modes[mode];if(!device)throw Error('Unsupported mode: '+mode);
const mount=process.env.GENESIS_DOOR_MOUNT||'historical';
if(!['historical','recessed'].includes(mount))throw Error('Invalid door mount '+mount);
const OUT='/tmp/genesis-v0184-all-doors/'+mode+'/'+mount;
fs.mkdirSync(OUT,{recursive:true});
const positions=[
 {id:'herrero-frente',eye:[0,1.75,5.5],target:[0,1.45,-.55]},
 {id:'herrero-oblicua',eye:[3.15,1.85,4.35],target:[0,1.45,-.55]},
 {id:'curtidor-frente',eye:[14,1.75,5.7],target:[14,1.45,-.55]},
 {id:'curtidor-oblicua',eye:[17.1,2,4.7],target:[14,1.45,-.5]},
 {id:'carpintero-frente',eye:[-5.9,1.75,16],target:[-11.5625,1.45,16]},
 {id:'carpintero-oblicua',eye:[-6.5,2.0,19.3],target:[-11.5625,1.45,16]},
 {id:'joyero-frente',eye:[-11,1.75,26.4],target:[-11,1.45,32.0625]},
 {id:'joyero-oblicua',eye:[-7.4,2.0,27.4],target:[-11,1.45,32.0625]},
 {id:'arcanista-control',eye:[18,1.75,16],target:[25.5625,1.45,16]},
 {id:'arcanista-oblicua',eye:[18,2.0,19.5],target:[25.5625,1.45,16]}
];
const output={mode,mount,variant:'V018.4',shots:[],materialAudit:null,jsErrors:[],consoleErrors:[]};
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 let page=null;
 try{
  page=await browser.newPage({...device,deviceScaleFactor:1});
  page.on('pageerror',e=>output.jsErrors.push(String(e.stack||e)));
  page.on('console',m=>{if(m.type()==='error')output.consoleErrors.push(m.text())});
  await page.goto('http://127.0.0.1:8765/v0184/?qa='+mode+'&v0184DoorMount='+mount,{waitUntil:'domcontentloaded',timeout:75000});
  await page.locator('#start-blacksmith').click({timeout:25000});
  await page.waitForFunction(()=>document.getElementById('v011-pause')?.textContent.includes('Carga finalizada'),null,{timeout:190000,polling:300});
  const audit=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
  assert(audit?.workshops?.ok,'Workshop GLB preload failed');
  assert.equal(audit.version,'V018.4');
  assert.equal(audit.village?.count,5);
  assert.equal(audit.workshops.hdr,true,'Native 32-bit HDR environment lost');
  await page.locator('#v011-pause button').first().click({timeout:25000});
  await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.state==='arriving',null,{timeout:35000});
  await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.skip());
  await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.loadingHidden===false,null,{timeout:35000});
  await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.village?.doorAngle<1,null,{timeout:20000});
  output.materialAudit=await page.evaluate(()=>{
    const pc=window.pc,app=pc.Application.getApplication?.()||pc.app;
    const plan=window.GenesisVillagePlan;
    const root=app.root.findByName('Project Genesis V017 · aldeia cinco talleres');
    const status=window.__GENESIS_V017_VILLAGE__;
    if(!root)throw Error('Original village root not found');
    const mats=(visual)=>{
      const materialSet=new Set(),instances=[],leafs=[];
      for(const renderer of visual.findComponents('render')){
       for(const mi of renderer.meshInstances||[]){
        if(!mi.material)continue;
        materialSet.add(mi.material);
        instances.push({name:mi.material.name,emissiveMap:!!mi.material.emissiveMap,
         emissiveIntensity:Number(mi.material.emissiveIntensity)||0,
         emissiveRGB:mi.material.emissive&&[mi.material.emissive.r,mi.material.emissive.g,mi.material.emissive.b],
         PBR:!!(mi.material.diffuseMap||mi.material.normalMap||mi.material.metalnessMap||mi.material.glossMap||mi.material.aoMap)});
        if(mi.node?.name==='Door_arched_iron_body'){
          const b=mi.aabb;leafs.push({center:[b.center.x,b.center.y,b.center.z],half:[b.halfExtents.x,b.halfExtents.y,b.halfExtents.z]});
        }
       }
      }
      return {materialRefs:[...materialSet],materials:instances,meshInstances:instances.length,
       leafs,lightCount:visual.findComponents('light').length};
    };
    const originalPivot=root.findByName('Arcanista · puerta mágica V027 · cerrada');
    if(!originalPivot)throw Error('Original glowing Arcanista door missing');
    const original=mats(originalPivot);
    const sourceMaterials=new Set(original.materialRefs);
    const result={statusVersion:status?.version,doorAngle:status?.doorAngle,
      sceneUnlitVariants:status?.unlitDoorVariants,
      original:{meshInstances:original.meshInstances,glowing:original.materials.filter(m=>m.emissiveMap&&m.emissiveIntensity>.1).length,
       emittedMaps:original.materials.filter(m=>m.emissiveMap).length,lights:original.lightCount},copies:[]};
    for(const profession of ['Curtidor','Carpintero','Joyero']){
      const pivot=root.findByName(profession+' · puerta V027 sin emisión');
      if(!pivot)throw Error(profession+' static V027 pivot missing');
      const view=mats(pivot);
      const planItem=plan.workshops.find(w=>w.profession===profession);
      const leaf=view.leafs.find(l=>l.half[1]>1.0);
      if(!leaf)throw Error(profession+' arched visible mesh not found');
      const axis=Math.abs(planItem.yaw)===90?2:0;
      const expected=axis===2?planItem.z:planItem.x;
      const error=Math.abs(leaf.center[axis]-expected);
      result.copies.push({profession,meshInstances:view.meshInstances,materials:view.materials.length,
       emissiveMaps:view.materials.filter(m=>m.emissiveMap).length,
       emittingMeshes:view.materials.filter(m=>m.emissiveIntensity>0.000001||
       (m.emissiveRGB||[]).some(v=>v>0.000001)).length,
       pbrMeshInstances:view.materials.filter(m=>m.PBR).length,
       sourceMaterialReferencesShared:[...view.materialRefs].filter(m=>sourceMaterials.has(m)).length,
       lightCount:view.lightCount,leafCentre:leaf.center,facadeExpected:expected,
       centerErrorMetres:error,yaw:planItem.yaw});
    }
    return result;
  });
  const result=output.materialAudit;
  assert.equal(result.statusVersion,'V018.4');
  assert.equal(result.copies.length,3);
  assert.equal(result.sceneUnlitVariants.length,3);
  assert(result.original.glowing>0||result.original.lights>0,'Arcanista original glow or lights unexpectedly missing');
  for(const v of result.copies){
    assert(v.meshInstances>=150, v.profession+' missing V027 geometry');
    assert.equal(v.emissiveMaps,0,v.profession+' retained emissive maps');
    assert.equal(v.emittingMeshes,0,v.profession+' emitted glow');
    assert.equal(v.lightCount,0,v.profession+' has arcane light');
    assert.equal(v.sourceMaterialReferencesShared,0,v.profession+' altered original material');
    assert(v.pbrMeshInstances>0,v.profession+' lost PBR material maps');
    assert(v.centerErrorMetres<0.08,v.profession+' door offset from stone arch '+v.centerErrorMetres+'m');
  }
  // CHECK THE RENDERED PANEL WIDTH IN WORLD METRES, NOT JUST CENTER OR PIVOT!
  output.allFiveWidths=await page.evaluate(()=>{
   const pc=window.pc,app=pc.Application.getApplication?.()||pc.app,root=app.root.findByName('Project Genesis V017 · aldeia cinco talleres');
   return window.GenesisVillagePlan.workshops.map(p=>{
    const pivot=root.findByName(p.profession==='Herrero'?'Herrero · bisagra izquierda original':
       p.profession==='Arcanista'?'Arcanista · puerta mágica V027 · cerrada':p.profession+' · puerta V027 sin emisión');
    if(!pivot)throw Error('Door pivot missing '+p.profession);
    const meshes=pivot.findComponents('render').flatMap(r=>r.meshInstances||[]);
    const body=meshes.find(mi=>mi.node?.name==='Door_arched_iron_body'&&mi.aabb?.halfExtents?.y>1);
    if(!body)throw Error('Visible door body missing '+p.profession);
    const half=body.aabb.halfExtents,center=body.aabb.center;
    const axis=(Math.abs(p.yaw)===90)?'z':'x';
    const width=2*half[axis],target=axis==='z'?p.z:p.x,offset=center[axis]-target;
    return {profession:p.profession,axis,width,centerOffset:offset,worldCenter:[center.x,center.y,center.z],hingeWorld:[pivot.getPosition().x,pivot.getPosition().y,pivot.getPosition().z],yaw:p.yaw};
   });
  });
  for(const d of output.allFiveWidths){
    assert(Math.abs(d.width-2.18)<0.16,'Door still narrow or oversized: '+d.profession+' measured '+d.width+'m vs reference 2.18m');
    assert(Math.abs(d.centerOffset)<0.11,'Door leaf off-center '+d.profession+' '+d.centerOffset+'m');
  }
  const hinge=output.allFiveWidths.find(x=>x.profession==='Herrero');
  assert(Math.abs(hinge.hingeWorld[0]+1.10)<.02,'Historical Herrero hinge world X was moved');
  console.log('ALL FIVE LIVE DOOR WIDTHS PASS',JSON.stringify(output.allFiveWidths));
  fs.writeFileSync(OUT+'/all-five-door-bounds.json',JSON.stringify({mount,widths:output.allFiveWidths},null,2));
    console.log('V018.4 PBR ZERO-GLOW + LEAF ALIGNMENT PASS',JSON.stringify(result));
  fs.writeFileSync(OUT+'/material-audit.json',JSON.stringify(result,null,2));
  await page.addStyleTag({content:'#hud,#mobile,#orientation,#settings,#controls,#ui,#legacyQuest,#legacyPrompt,#prompt,#cameraGuide,#modalLayer{display:none!important}'});
  for(const s of positions){
    try{
      await page.evaluate(({eye,target})=>{
        const app=window.pc.Application.getApplication?.()||window.pc.app, cam=app.root.findByName('Camara');
        if(!cam?.camera)throw Error('Camara missing');
        window.__V0183_UNHOOK__?.();
        const fix=()=>{cam.setPosition(...eye);cam.lookAt(...target)};
        app.on('prerender',fix);window.__V0183_UNHOOK__=()=>app.off('prerender',fix);fix();
      },s);
      await page.waitForTimeout(350);
      const file=OUT+'/'+s.id+'.png';
      await page.screenshot({path:file,timeout:55000,animations:'disabled'});
      output.shots.push({shot:s.id,file,ok:true});console.log('CAPTURE',mode,s.id);
    }catch(e){
      output.shots.push({shot:s.id,ok:false,error:String(e)});
      console.warn('SHOT FAILURE',mode,s.id,String(e).slice(0,300));
    }
    fs.writeFileSync(OUT+'/browser-results.json',JSON.stringify(output,null,2));
  }
  await page.evaluate(()=>window.__V0183_UNHOOK__?.());
  assert(output.shots.filter(s=>s.ok).length>=7,mode+' insufficient screenshots');
  if(output.jsErrors.length)throw Error('JavaScript runtime errors '+output.jsErrors.join('; ').slice(0,1200));
  console.log('PASS V018.4 '+mode,JSON.stringify({images:output.shots.filter(s=>s.ok).length,materialAudit:true}));
 }finally{
  fs.writeFileSync(OUT+'/browser-results.json',JSON.stringify(output,null,2));
  if(page)await page.close();
  await browser.close();
 }
})().catch(e=>{console.error('V018.4 QA FAILED',e.stack||String(e));process.exitCode=1});
