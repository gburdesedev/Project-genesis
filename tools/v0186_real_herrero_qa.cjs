'use strict';
/* V0186 real PlayCanvas/WebGL smoke + Q1 forge lighting with independent 1280x720,
 * 844x390 touch and actual screenshots. Source GLBs remain original and unmodified.
 */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='/tmp/genesis-v0186-real-forge';
fs.mkdirSync(out,{recursive:true});
const results=[];
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{
    for(const mode of [
      {name:'pc',width:1280,height:720,mobile:false},
      {name:'mobile',width:844,height:390,mobile:true}
    ]){
      const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},isMobile:mode.mobile,hasTouch:mode.mobile,deviceScaleFactor:1});
      const errors=[];
      page.on('pageerror',e=>errors.push(String(e.stack||e)));
      try{
        await page.goto('http://127.0.0.1:8765/v0186/?qa=forge-'+mode.name,{waitUntil:'domcontentloaded',timeout:65000});
        await page.locator('#start-blacksmith').click({timeout:30000});
        await page.waitForFunction(()=>{
          const n=document.querySelector('#v011-pause');
          return n?.style.display==='block'&&n.textContent.includes('Carga finalizada');
        },null,{timeout:180000,polling:300});
        const audit=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
        assert.equal(audit?.version,'V018.6');
        assert.equal(audit.workshops?.ok,true,'GLB loading failure');
        assert.equal(audit.workshops?.hdr,true,'32-bit HDRI missing');
        assert.equal(audit.village.count,5,'Workshop facades missing');
        const before=await page.evaluate(()=>{
          const interior=window.__GENESIS_V0186_INTERIOR__;
          const api=window.GenesisHerreroInteriorV0186;
          const model=pc.Application.getApplication()?.root.findByName('Herrero · fragua V038 real, estado Q1');
          if(!interior||!model)throw Error('V038 real station not mounted');
          return {
            meshCount:interior.renderMeshCount,
            lightsOff:interior.forgeHot===false,
            worldPosition:interior.worldPosition,
            modelWorldPosition:[model.getPosition().x,model.getPosition().z],
            closed:api.canWalk({x:0,z:.16},{x:0,z:-.16},0)===false,
            open:api.canWalk({x:0,z:.16},{x:0,z:-.16},1)===true,
            side:api.canWalk({x:4.62,z:-2},{x:4.3,z:-2},1)===false,
            blocked:api.canWalk({x:2.27,z:-4.8},{x:2.27,z:-5.68},1)===false
          };
        });
        assert(before.meshCount>=100,'Original forge 109 meshInstances missing');
        assert(before.lightsOff,'Forge must start extinguished');
        assert(before.closed&&before.open&&before.side&&before.blocked,'Doorway or forge volume collision incorrect: '+JSON.stringify(before));
        assert(Math.abs(before.modelWorldPosition[0]-2.27)<.01,'Incorrect authentic forge anchor');
        await page.locator('#v011-pause button').first().click();
        await page.waitForFunction(()=>window.__GENESIS_V016_ARRIVAL__?.state==='arriving',null,{timeout:20000});
        assert.equal(await page.evaluate(()=>window.__GENESIS_V016_ARRIVAL__.skip()),true);
        await page.waitForFunction(()=>window.__GENESIS_V011_AUDIT__?.()?.loadingHidden===false,null,{timeout:20000});
        const post=await page.evaluate(()=>window.__GENESIS_V011_AUDIT__?.());
        assert.equal(post.legacy,0);
        if(mode.mobile){
          assert(await page.locator('#joy').isVisible(),'Mobile joystick missing');
          assert(await page.locator('#interact').isVisible(),'Mobile E button missing');
        }
        // Move only the review camera, not player, models or approved quest logic.
        await page.addStyleTag({content:'#hud,#mobile,#orientation,#settings,#controls,#ui,#legacyQuest,#legacyPrompt,#prompt,#cameraGuide,#modalLayer{display:none!important}'});
        await page.evaluate(()=>{
          const app=pc.Application.getApplication(),cam=app.root.findByName('Camara');
          const handler=()=>{cam.setPosition(.05,2.15,-3.2);cam.lookAt(2.27,1.15,-6.36)};
          app.on('prerender',handler);handler();
          window.__V0186_QA_CAM_DISPOSE__=()=>app.off('prerender',handler);
        });
        await page.waitForTimeout(1200);
        await page.screenshot({path:out+'/'+mode.name+'-forge-off.png',timeout:50000});
        const q=await page.evaluate(()=>{
          const ui=window.__GENESIS_V013_LEGACY__;
          const response=ui.tryInteract();  // Real Q1 Ordan interaction -> open door.
          const game=ui.game;
          if(game.step()!==1)throw Error('Ordan did not open door');
          const actions=['door','debris','anvil','bellows','flue','forge'];
          const record=[];
          for(const id of actions){
            const res=game.doAction(id);record.push({id,ok:res.ok,step:game.step()});
            if(!res.ok)throw Error('Q1 stage '+id+' failed '+JSON.stringify(res));
          }
          return record;
        });
        await page.waitForFunction(()=>window.__GENESIS_V0186_INTERIOR__?.forgeHot===true,null,{timeout:25000});
        const now=await page.evaluate(()=>({step:window.__GENESIS_V013_LEGACY__.game.step(),hot:window.__GENESIS_V0186_INTERIOR__.forgeHot,door:window.__GENESIS_V017_VILLAGE__.doorAngle}));
        assert.equal(now.step,7);assert(now.hot);assert(now.door< -60,'Original -92° swing missing');
        await page.waitForTimeout(850);
        await page.screenshot({path:out+'/'+mode.name+'-forge-lit.png',timeout:50000});
        await page.evaluate(()=>window.__V0186_QA_CAM_DISPOSE__?.());
        assert.equal(errors.length,0,'WebGL JS errors: '+errors.join('; ').slice(0,1000));
        results.push({device:mode.name,source:'actual V038 GLB 19.22 MB',meshes:before.meshCount,forgeOff:true,forgeOn:true,doorCollision:before.open&&before.closed,sideBlocked:before.side,questSteps:q,hdr32:true,doorAngle:now.door});
        console.log('PASS V0186 REAL FORGE '+mode.name,JSON.stringify(results.at(-1)));
      }finally{await page.close()}
    }
    fs.writeFileSync(out+'/results.json',JSON.stringify({results,status:'all browsers passed',visualApproval:false},null,2));
  }finally{await browser.close()}
})().catch(err=>{console.error('V0186 REAL FORGE FAIL',err.stack||String(err));fs.writeFileSync(out+'/failure.txt',String(err.stack||err));process.exitCode=1});
