// Verify approved bytes and render the actual preparation menu with model-viewer.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base='assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/';
const lock=JSON.parse(fs.readFileSync(path.join(root,base,'asset-lock.json')));
for(const [name,entry] of Object.entries(lock.files)){const b=fs.readFileSync(path.join(root,base,name));assert.equal(b.length,entry.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),entry.sha256)}
const b=fs.readFileSync(path.join(root,base,'mineral_hierro_v008_55k_pbr1536_v007.glb'));const gltf=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));assert.equal(gltf.meshes.reduce((n,m)=>n+m.primitives.reduce((n,p)=>n+gltf.accessors[p.indices].count/3,0),0),55000);
const source=fs.readFileSync(path.join(root,'index.html'),'utf8');const loader=source.match(/script.src='([^']*model-viewer[^']*)'/)[1];
const html=source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,'').replace('<head>','<head><base href="https://genesis.test/">');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1536,height:1024}});const requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://genesis.test/**',route=>{const pathname=new URL(route.request().url()).pathname;requests.push(pathname);const file=path.join(root,pathname);if(!file.startsWith(root)||!fs.existsSync(file))return route.abort();return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.png')?'image/png':file.endsWith('.glb')?'model/gltf-binary':'text/javascript'})});
 await page.setContent(html);for(const file of ['preparacion.css','responsive.css'])await page.addStyleTag({content:fs.readFileSync(path.join(root,file),'utf8')});
 for(const file of ['device_policy.js','preparacion_control.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
 await page.addScriptTag({type:'module',url:loader});
 await page.evaluate(()=>{document.querySelector('#loading').style.display='none';document.querySelector('#prototypeIntro').style.display='none';GenesisPreparation.open({profession:'Herrero',recipeName:'Espada de hierro',inventory:{'Mineral de hierro':10,'Lingote de hierro':2},requiredStock:{'Lingote de hierro':3},formula:{materials:[{material:'Lingote de hierro',qty:3}]},onCraft(){},closeModal(){document.querySelector('#modalLayer').style.display='none'},modal(html,extra){const box=document.querySelector('#modal');box.className='modal '+extra;box.innerHTML=html;document.querySelector('#modalLayer').style.display='grid'}})});
 await page.waitForFunction(()=>[...document.querySelectorAll('model-viewer')].length===2&&[...document.querySelectorAll('model-viewer')].every(v=>v.loaded),{},{timeout:120000});
 const ore=page.locator('model-viewer[alt="Mineral de hierro"]');assert((await ore.getAttribute('src')).includes('v008_55k_pbr1536_v007'));assert(!requests.some(p=>p.includes('iron_ore/v008/')));
 await ore.locator('..').hover();await page.waitForTimeout(600);assert.notEqual(await ore.getAttribute('camera-orbit'),'0deg 75deg auto');
 await page.mouse.move(1500,1000);await page.waitForTimeout(1200);
 fs.mkdirSync('/tmp/genesis-responsive',{recursive:true});await page.screenshot({path:'/tmp/genesis-responsive/v0.11.006-approved-mineral-menu.png',timeout:60000});assert.equal(errors.length,0,errors.join('\n'));
 await browser.close();console.log('PASS approved mineral: exact SHA256/55k mesh, real desktop GLB load and hover, no legacy ore request');
})().catch(e=>{console.error(e);process.exit(1)});
