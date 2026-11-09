'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const url='https://raw.githack.com/gburdesedev/Project-genesis/ce085dab23133a65aebe1b85495c04fa2452b5d3/index.html';
const out='previews/v016001-main-clean-browser';fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1280,height:720},serviceWorkers:'block'});
const errors=[];page.on('pageerror',e=>errors.push('JS:'+e.message));
page.on('response',r=>{if(r.status()>=400&&errors.length<30)errors.push(r.status()+' '+r.url())});
let result={url,started:null,success:false};
try{
await page.goto(url,{waitUntil:'domcontentloaded',timeout:50000});
result.title=await page.title();
await page.locator('[data-profession="Herrero"]').waitFor({state:'visible',timeout:90000});
result.success=true;console.log('GENESIS_V016001_LIVE_INTRO_VISIBLE');
}catch(e){result.error=String(e.message).slice(0,300);console.error(result.error)}
result.loader=await page.evaluate(()=>({status:document.querySelector('#loadState')?.textContent,detail:document.querySelector('#loadDetail')?.textContent,count:document.querySelector('#loadCount')?.textContent,intro:document.querySelector('#prototypeIntro')?.style.display,failed:document.querySelector('.loadingCard')?.className,boot:window.__genesisBoot}));
result.errors=errors;
await page.screenshot({path:path.join(out,'live-browser.png'),timeout:5000,animations:'allow'}).catch(e=>{result.screenshot_error=e.message});
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));
console.log('GENESIS_LIVE_REPORT',JSON.stringify(result).slice(0,3500));
await browser.close();if(!result.success)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
