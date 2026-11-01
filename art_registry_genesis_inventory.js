/* Project Genesis: registered art IDs, not a gameplay mechanic. */
(function(global){
 'use strict';
 const arts = new Map(), channels = new Map(), techniques=new Map();
 function valid(url){return typeof url==='string' && /^assets\/[a-zA-Z0-9_./-]+\.(png|webp|svg)$/i.test(url) && !url.includes('..');}
 function add(map,id,data){
  if(typeof id!=='string'||!id.trim())throw new Error('ID de arte obligatorio');
  if(!data||!valid(data.iconUrl||''))throw new Error('Recurso aprobado no identificado para '+id);
  if(map.has(id)&&map.get(id).iconUrl!==data.iconUrl)throw new Error('Reemplazar arte aprobado requiere autorización: '+id);
  map.set(id,Object.freeze({...data,id}));
 }
 const registry=Object.freeze({
   registerMaterial(id,a){add(arts,id,a)},
   registerChannel(id,a){add(channels,id,a)},
   registerTechnique(id,a){if(!a?.channelId)throw new Error('Una técnica pertenece a un canal');add(techniques,id,a)},
   material(id){return arts.get(id)||null},channel(id){return channels.get(id)||null},technique(id){return techniques.get(id)||null},
   status(){return {materiales:arts.size,canales:channels.size,tecnicas:techniques.size}},
   resolveTechniques(item){const result=[];for(const x of (Array.isArray(item.techniques)?item.techniques:[])){
      const id=typeof x==='string'?x:String(x.id||x.name||'');const e=techniques.get(id);
      if(e&&item.channels?.some(c=>String(Array.isArray(c)?c[0]:(c.name||c.channel))===e.channelId))result.push(e)
   }return result}
 });
 global.GenesisInventoryArt=registry;
})(window);
