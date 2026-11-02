/* Mercenary deep boot diagnostics: observe existing game; no gameplay mocks. */
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.glb':'model/gltf-binary','.mjs':'text/javascript'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+decodeURIComponent(url));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('Forbidden')}
  const stream=fs.createReadStream(file);
  stream.on('error',()=>{if(!res.headersSent){res.writeHead(404);res.end('Missing')}else res.destroy()});
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  stream.pipe(res);
 }catch(e){res.writeHead(500);res.end(String(e))}
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 const failures=[],errors=[],consoleErrors=[];
 page.on('requestfailed',req=>failures.push({url:req.url(),error:req.failure()?.errorText}));
 page.on('response',res=>{if(res.status()>=400)failures.push({url:res.url(),status:res.status()})});
 page.on('pageerror',err=>errors.push(String(err.stack||err)));
 page.on('console',msg=>{if(['error','warning'].includes(msg.type()))consoleErrors.push(msg.text().slice(0,700))});
 try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html?mercenary-qa=1',{waitUntil:'domcontentloaded',timeout:120000});
  const ids=['mercBodyModel','mercBodyRangerModel','mercHeadModel','mercHairPartedModel','mercHairBuzzModel','mercHairLongModel','mercBeardModel','mercSwordModel','mercShieldModel'];
  const animIds=['mercBodyAnim','mercBodyRangerAnim','mercHeadAnim','mercHairPartedAnim','mercHairBuzzAnim','mercHairLongAnim','mercBeardAnim'];
  const snapshots=[];
  for(const sec of [0,10,25,45,65,95,125]){
   if(sec)await sleep((sec-(snapshots.length? [0,10,25,45,65,95,125][snapshots.length-1]:0))*1000);
   const state=await page.evaluate(({ids,animIds})=>{
    const q=window.GenesisMercenaryQA;
    const models=Object.fromEntries(ids.map(id=>{const e=document.getElementById(id);return [id,{exists:!!e,contentReady:!!e?.contentEntity,asset:e?.getAttribute('asset'),sourceId:e?.dataset.asset,componentReady:!!e?.component}]}));
    const anims=Object.fromEntries(animIds.map(id=>{const e=document.getElementById(id);return [id,{exists:!!e,componentReady:!!e?.component,readyState:e?.readyState??null}]}));
    return {qaPhase:q?.phase||'not-created',qaErrors:q?.errors||[],qaSteps:q?.steps?.map(s=>s.phase)||[],items:q?.items?.length||0,boot:window.__genesisBoot,loading:document.getElementById('loading')?.style.display,loadState:document.getElementById('loadState')?.textContent,models,anims};
   },{ids,animIds});
   snapshots.push({atSeconds:sec,...state});
   console.log('DEEP_DIAGNOSTIC '+JSON.stringify(snapshots[snapshots.length-1]));
   if(['ready','error'].includes(state.qaPhase))break;
  }
  console.log('DEEP_NETWORK '+JSON.stringify({failedRequests:failures.slice(-50),browserErrors:errors.slice(-25),consoleErrors:consoleErrors.slice(-35)}));
  fs.mkdirSync('/tmp/genesis-mercenary-diagnostic',{recursive:true});
  fs.writeFileSync('/tmp/genesis-mercenary-diagnostic/results.json',JSON.stringify({snapshots,failures,errors,consoleErrors},null,2));
  const last=snapshots.at(-1);
  if(last.qaPhase!=='ready'){console.error('FAIL: game did not become mercenary-ready; last phase '+last.qaPhase);process.exitCode=1}
 }finally{await browser.close();server.close()}
})().catch(err=>{console.error('DEEP_DIAGNOSTIC_FATAL',err);process.exitCode=1;server.close()});
