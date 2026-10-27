// Decode the real approved road PBR files with the mobile branch in both
// browser engines. This catches full-resolution GPU uploads absent from UI-only tests.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'village_world.js'),'utf8');
const start=source.indexOf("const ROOT="),end=source.indexOf("function material(");
assert(start>=0&&end>start,'PBR loader functions missing');
const helpers=source.slice(start,end);
const allowed=/^\/assets\/world\/v0\.11\.004\/(cobble|traffic)_(color|normal|gloss|ao)\.png$/;
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><html><body>mobile PBR budget test</body></html>')}
 if(!allowed.test(pathname)){res.writeHead(404);return res.end()}
 const filename=path.join(root,pathname.slice(1));
 if(!fs.existsSync(filename)){res.writeHead(404);return res.end()}
 res.setHeader('Content-Type','image/png');fs.createReadStream(filename).pipe(res);
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  for(const [name,browserType] of Object.entries({chromium,webkit})){
   const browser=await browserType.launch({headless:true});
   try{
    const page=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'});
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.addScriptTag({content:`
const FILTER_LINEAR=1,FILTER_LINEAR_MIPMAP_LINEAR=2,ADDRESS_REPEAT=3;
class Texture{
 constructor(device,options){this.name=options.name;this.srgb=options.srgb;this.mipmaps=options.mipmaps}
 setSource(source){this.width=source.width||source.naturalWidth;this.height=source.height||source.naturalHeight}
}
${helpers}
window.__loadMobile=async()=>{
 const a=await maps({graphicsDevice:{}},'cobble',true);
 const b=await maps({graphicsDevice:{}},'traffic',true);
 return {cobble:Object.values(a).map(t=>[t.width,t.height,t.srgb]),
         traffic:Object.values(b).map(t=>[t.width,t.height,t.srgb])};
};
window.__loadDesktop=async()=>{
 const t=await loadTexture({graphicsDevice:{}},'cobble_color.png',false);
 return [t.width,t.height];
};`});
    const results=await page.evaluate(()=>window.__loadMobile());
    for(const [group,items] of Object.entries(results)){
     assert.equal(items.length,4,group+' must keep all four PBR channels');
     for(const [w,h] of items){assert(w>0&&h>0&&w<=1024&&h<=1024,group+' mobile texture exceeds budget: '+w+'x'+h)}
     assert.equal(items[0][2],true,'color must stay sRGB');
    }
    const desktop=await page.evaluate(()=>window.__loadDesktop());
    assert(desktop[0]>=results.cobble[0][0]&&desktop[1]>=results.cobble[0][1],'desktop must not be downscaled: '+desktop.join('x'));
    console.log('PASS '+name+': real cobble/traffic PBR loaded at <=1024 on mobile, 4 channels intact; desktop preserves original '+desktop.join('x'));
   }finally{await browser.close()}
  }
 }finally{server.close()}
})().catch(error=>{console.error(error);server.close();process.exit(1)});
