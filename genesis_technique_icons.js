/* Project Genesis: registry of approved, independently replaceable technique icons.
 * Never infer a technique from the icon catalog. Object data is the only source.
 * Add icons by explicit stable ID; absent art renders a neutral fallback, not a fabricated icon.
 */
(function(global){
'use strict';
const iconMap=Object.create(null);
const safeId=/^[a-z0-9][a-z0-9_-]{0,79}$/;
const safePath=/^assets\/ui\/techniques\/[a-z0-9_/-]+\.(?:png|webp|svg)$/i;
function register(id,source){
 if(!safeId.test(String(id))||!safePath.test(String(source)))throw Error('Technique icon: invalid ID or local path');
 iconMap[id]=source;
}
function get(id){return iconMap[String(id)]||null;}
function actual(item){
 const channels=Array.isArray(item?.channels)?item.channels:[];
 const out=[];
 channels.forEach(function(channel){
  const channelName=Array.isArray(channel)?String(channel[0]||''):String(channel?.name||channel?.channel||'');
  const own=Array.isArray(channel)?channel[2]:channel?.techniques;
  if(Array.isArray(own))own.forEach(function(t){if(t&&typeof t==='object'&&t.known!==false&&t.applied!==false)out.push({channel:channelName,id:String(t.id||''),name:String(t.name||t.id||'')});});
 });
 // Legacy per-item records are supported only if clearly applied to this item.
 if(Array.isArray(item?.techniques))item.techniques.forEach(function(t){
  if(t&&typeof t==='object'&&t.applied===true)out.push({channel:String(t.channel||''),id:String(t.id||''),name:String(t.name||t.id||'')});
 });
 return out.filter(function(t){return Boolean(t.id||t.name)});
}
global.GenesisTechniqueIcons=Object.freeze({register:register,get:get,actual:actual});
})(window);
