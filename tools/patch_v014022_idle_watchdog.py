#!/usr/bin/env python3
"""Convert legacy V014022 asset download watchdog to *no-progress* timeout only."""
from pathlib import Path
s=Path('index.html').read_text(encoding='utf-8')
assert 'V014022 REPEATABLE LOADER' in s
assert 'V014022 IDLE WATCHDOG' not in s

old=""" const bootWait=(promise,label,timeout=120000)=>new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Tiempo agotado preparando '+label)),timeout);
  Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value)},error=>{clearTimeout(timer);reject(error)});
 });
"""
new=""" /* V014022 IDLE WATCHDOG: 2 minutes without transfer progress, not 2 minutes total. */
 const bootWait=(promise,label,timeout=120000)=>new Promise((resolve,reject)=>{
  let done=false,seen=0,lastChange=performance.now();
  const stop=(ok,value)=>{if(done)return;done=true;clearInterval(timer);ok?resolve(value):reject(value)};
  const timer=setInterval(()=>{
   const files=window.GenesisAssetDiag?.snapshot?.().records||[];
   const bytes=files.reduce((total,file)=>total+(Number(file.received)||0),0);
   if(bytes>seen){seen=bytes;lastChange=performance.now()}
   if(performance.now()-lastChange>=timeout)stop(false,new Error('Sin avance durante 120 s preparando '+label));
  },1200);
  Promise.resolve(promise).then(value=>stop(true,value),error=>stop(false,error));
 });
"""
if s.count(old)!=1: raise RuntimeError(f'Boot watchdog anchor mismatch: {s.count(old)}')
s=s.replace(old,new,1)

start=s.index('function loadDeferredModelAsset(el,asset,timeout=120000)')
end=s.index('\nasync function activateDeferredModel(',start)
orig=s[start:end]
assert orig.count("clearTimeout(timer)") == 1 and "Tiempo agotado cargando" in orig
newfunc="""function loadDeferredModelAsset(el,asset,timeout=120000){
 return new Promise((resolve,reject)=>{
  let done=false,seen=0,lastChange=performance.now(),timer;
  const label=el.getAttribute('name')||el.id||asset;
  const finish=(ok,msg)=>{
   if(done)return;done=true;clearInterval(timer);
   el.removeEventListener('load',onLoad);el.removeEventListener('error',onError);
   if(!ok&&!el.contentEntity){try{el.removeAttribute('asset')}catch(_){}}
   ok?resolve(el):reject(new Error(msg||('No pudo cargarse '+label+' ['+asset+']')));
  };
  const onLoad=()=>finish(!!el.contentEntity,el.contentEntity?'':'El modelo terminó sin contenido: '+label+' ['+asset+']');
  const onError=e=>finish(false,(e?.message||'Falló la carga')+' · '+label+' ['+asset+']');
  const sourceEl=document.getElementById(String(asset).replace(/^#/,''));
  const source=sourceEl?.getAttribute('src')||sourceEl?.asset?.file?.url||'';
  const base=source?new URL(source,location.href).href:'';
  const folder=base.slice(0,base.lastIndexOf('/')+1);
  timer=setInterval(()=>{
   if(el.contentEntity){finish(true);return}
   const records=window.GenesisAssetDiag?.snapshot?.().records||[];
   const bytes=records.reduce((total,record)=>{
    if(!folder||!String(record.url||'').startsWith(folder))return total;
    return total+(Number(record.received)||0);
   },0);
   if(bytes>seen){seen=bytes;lastChange=performance.now()}
   if(performance.now()-lastChange>=timeout)
    finish(false,'Sin avance durante 120 s: '+label+' ['+asset+']');
  },1000);
  el.addEventListener('load',onLoad,{once:true});
  el.addEventListener('error',onError,{once:true});
  if(el.getAttribute('asset')!==asset)el.setAttribute('asset',asset);
  else if(!el.contentEntity){el.removeAttribute('asset');requestAnimationFrame(()=>el.setAttribute('asset',asset))}
  if(el.contentEntity)finish(true);
 });
}"""
s=s[:start]+newfunc+s[end:]
assert s.count('V014022 IDLE WATCHDOG')==1
assert s.count('Sin avance durante 120 s:')==1
assert s.count('Sin avance durante 120 s preparando')==1
Path('index.html').write_text(s,encoding='utf-8')
print('V014022: keep downloading while bytes grow; retry only after 120 s idle')
