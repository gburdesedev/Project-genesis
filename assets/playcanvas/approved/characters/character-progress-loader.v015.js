// Project Genesis v0.15 — local-only, streaming byte-accurate character downloads.
// Usage: const loader = new GenesisCharacterLoader({onProgress: console.log});
// const files = await loader.load(); // Map<assetId, ArrayBuffer>; parse each GLB with PlayCanvas after download.
export class GenesisCharacterLoader {
  constructor({manifestUrl='./assets/playcanvas/approved/characters/load-order.v015.json',onProgress=()=>{},timeoutMs=120000}={}) {
    this.manifestUrl=manifestUrl;this.onProgress=onProgress;this.timeoutMs=timeoutMs;
  }
  async load(){
    const manifestResponse=await fetch(this.manifestUrl,{cache:'no-cache'});
    if(!manifestResponse.ok)throw new Error('Manifest HTTP '+manifestResponse.status);
    const manifest=await manifestResponse.json();
    if(manifest.policy!=='local-only')throw new Error('External models forbidden');
    const files=manifest.groups.flatMap(g=>g.files.map(f=>({...f,group:g.id})));
    const states=new Map(files.map(f=>[f.id,{...f,received:0,total:f.bytes??null,status:'pending'}]));
    const emit=()=>{const entries=[...states.values()].map(x=>({...x}));this.onProgress({files:entries,received:entries.reduce((s,x)=>s+x.received,0),total:entries.every(x=>Number.isFinite(x.total))?entries.reduce((s,x)=>s+x.total,0):null});};
    const output=new Map();emit();
    for(const f of files){
      const s=states.get(f.id);s.status='downloading';emit();
      const url=new URL(f.url,location.href);
      if(url.origin!==location.origin)throw new Error('External asset blocked: '+f.id);
      const controller=new AbortController();
      let lastActivity=Date.now();let watchdog;
      try{
        watchdog=setInterval(()=>{if(Date.now()-lastActivity>this.timeoutMs)controller.abort('Asset idle timeout')},1000);
        const response=await fetch(url,{signal:controller.signal});
        if(!response.ok)throw new Error('HTTP '+response.status);
        const length=Number(response.headers.get('content-length'));
        if(Number.isFinite(length)&&length>0)s.total=length;
        const chunks=[];
        if(response.body?.getReader){
          const reader=response.body.getReader();
          while(true){
            const {done,value}=await reader.read();if(done)break;
            chunks.push(value);s.received+=value.byteLength;lastActivity=Date.now();emit();
          }
        }else{
          const buf=new Uint8Array(await response.arrayBuffer());chunks.push(buf);s.received=buf.length;emit();
        }
        s.status='downloaded';emit();
        const bytes=new Uint8Array(s.received);let offset=0;
        for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
        if(s.total!==null&&s.received!==s.total)throw new Error('Incomplete download '+s.received+'/'+s.total);
        if(bytes.length<12||String.fromCharCode(...bytes.subarray(0,4))!=='glTF'||new DataView(bytes.buffer).getUint32(8,true)!==bytes.length)throw new Error('Invalid GLB header or length');
        s.status='ready-to-parse';output.set(f.id,bytes.buffer);emit();
      }catch(error){s.status='error';s.error=String(error);emit();if(f.required)throw error;}
      finally{clearInterval(watchdog);}
    }
    return output;
  }
}
