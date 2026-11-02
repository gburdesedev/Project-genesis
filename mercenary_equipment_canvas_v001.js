/* Project Genesis — Mercenary Approved Art V04 / experimental only.
   This replaces the visual renderer, NOT the procedural crafting engine.
   Values and item identities are always supplied by the game's existing adapter. */
(function(root){
'use strict';
const BASE='https://raw.githubusercontent.com/gburdesedev/Project-genesis/feature/mercenary-equipment-runtime-v001/assets/ui/mercenary/v04/';
const CHANNELS=['Base','Luz','Sombra','Fuego','Hielo','Naturaleza','Tierra','Rayo'];
const CH_INDEX={Base:0,Luz:1,Sombra:2,Fuego:3,Hielo:4,Naturaleza:5,Tierra:6,Rayo:7};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=(x,y,w,h)=>`left:${x/16.7}%;top:${y/9.42}%;width:${w/16.7}%;height:${h/9.42}%;`;
function insertStyle(){
 if(document.getElementById('mercV04Style'))return;
 const node=document.createElement('style');node.id='mercV04Style';node.textContent=`
 #modalLayer:has(.mercV04){padding:0!important;display:flex;align-items:center;justify-content:center}
 #modalLayer .mercConceptModal:has(.mercV04){padding:0!important;background:none!important;border:0!important;box-shadow:none!important;width:min(100vw,177.28vh)!important;max-width:none!important;max-height:100vh!important;overflow:hidden!important}
 .mercV04{aspect-ratio:1670/942;position:relative;width:100%;height:auto;max-height:100vh;container-type:inline-size;overflow:hidden;background:#080604;color:#fff4d4;font-family:Georgia,'Times New Roman',serif;line-height:normal}
 .mercV04 *{box-sizing:border-box}
 .mercV04>.mcArt{display:block;position:absolute;width:100%;height:100%;inset:0;object-fit:fill;pointer-events:none}
 .mercV04 button{position:absolute;appearance:none;border:0;background:transparent;padding:0;margin:0;color:inherit;cursor:pointer;outline-offset:-2px;font:inherit}
 .mercV04 button:focus-visible,.mercV04 button:hover{outline:2px solid #f6ce69;outline-offset:-3px;background:rgba(234,170,70,.11)}
 .mercV04 button:disabled{cursor:default;opacity:1;outline:none;background:none}
 .mercV04 .mcItemSlot{display:flex;flex-direction:column;justify-content:center;align-items:center;overflow:hidden}
 .mercV04 .mcItemSlot img{max-width:78%;max-height:78%;object-fit:contain;filter:drop-shadow(0 1px 4px #000);pointer-events:none}
 .mercV04 .mcItemSlot.selected{box-shadow:inset 0 0 0 2px rgba(255,215,100,.85);background:rgba(255,190,54,.11)}
 .mercV04 .mcV4Compare{position:absolute;display:flex;justify-content:center;align-items:center;flex-direction:column;overflow:hidden;padding:0 1cqw;pointer-events:none}
 .mercV04 .mcV4Compare img{height:62%;width:60%;object-fit:contain;filter:drop-shadow(0 2px 3px #000)}
 .mercV04 .mcV4Compare small{font-size:1.05cqw;white-space:nowrap;max-width:100%;text-overflow:ellipsis;overflow:hidden;color:#f1d7a0}
 .mercV04 .mcV4Compare small.rarity{font-size:.91cqw;color:#dbb86b}
 .mercV04 .mcV4Channels{position:absolute;overflow-y:auto;overflow-x:hidden;scrollbar-color:#b87a22 #100b06;scrollbar-width:thin;padding:1cqw .1cqw 1cqw .15cqw}
 .mercV04 .mcV4Row{height:3.42cqw;min-height:1px;position:relative;display:flex;align-items:center;flex:none;margin-bottom:.20cqw}
 .mercV04 .mcV4RowArt{position:absolute;left:0;top:0;width:100%;height:100%;background-repeat:no-repeat;background-size:100% 800%;pointer-events:none}
 .mercV04 .mcV4Numbers{position:absolute;left:62%;right:.5%;top:24%;display:flex;justify-content:space-between;align-items:center;font-size:1.18cqw;text-shadow:0 1px 3px black;font-variant-numeric:tabular-nums;font-weight:bold}
 .mercV04 .mcV4Numbers .positive{color:#80e967}.mercV04 .mcV4Numbers .negative{color:#ed8b83}.mercV04 .mcV4Numbers .neutral{color:#f0e0bd}
 .mercV04 .mcV4Name{position:absolute;font-size:1.55cqw;text-align:center;color:#e9c579;text-shadow:0 1px 4px #080302;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
 .mercV04 .mcV4Body{position:absolute;overflow:hidden;pointer-events:auto}
 .mercV04 .mcV4Body model-viewer{width:100%;height:100%;background:transparent;--progress-bar-height:0px;--poster-color:transparent}
 .mercV04 .mcV4Body .mcV4BodyFallback{display:flex;align-items:center;justify-content:center;text-align:center;width:100%;height:100%;font-size:1.2cqw;color:#b59a70}
 .mercV04 .mcV4Overlay{position:absolute;inset:14% 24% 16% 25%;background:rgba(13,9,5,.96);border:2px solid #b88840;box-shadow:0 0 35px black;padding:1.5cqw;overflow:auto;z-index:8;font-size:1.35cqw}
 .mercV04 .mcV4Overlay button{position:relative;background:#2a1808;border:1px solid #ae7b39;padding:0.6cqw 1.8cqw;font-size:1.2cqw}
 .mercV04 .mcV4Overlay h2{font-size:2cqw}.mercV04 .mcV4Overlay .entry{padding:.5cqw 0;border-bottom:1px solid #9a682d55}
 `;
 document.head.appendChild(node);
}
function channelEntries(item){
 const arr=Array.isArray(item?.channels)?item.channels:[];
 return arr.map((c,index)=>{
  const raw=Array.isArray(c)?c[0]:c?.name||c?.channel;
  const val=Array.isArray(c)?c[1]:c?.intensity;
  let key=String(raw||'').trim();
  if(index===0 && !Object.hasOwn(CH_INDEX,key))key='Base';
  if(!Object.hasOwn(CH_INDEX,key)||!Number.isFinite(Number(val)))return null;
  return {key,value:Number(val),order:index,techniques:Array.isArray(c?.techniques)?c.techniques:[]};
 }).filter(Boolean);
}
function compare(equipped,selected){
 const old=channelEntries(equipped),fresh=channelEntries(selected),keys=[];
 for(const c of fresh.concat(old))if(!keys.includes(c.key))keys.push(c.key);
 keys.sort((a,b)=>a==='Base'?-1:b==='Base'?1:0);
 return keys.map(key=>({key,a:old.find(x=>x.key===key),b:fresh.find(x=>x.key===key)}));
}
function render(opts){
 insertStyle();
 let family='first',page=0,candidate=opts.selectedFirst||null;
 let weapon=opts.selectedFirst||opts.equippedFirst||null;
 let shield=opts.selectedSecond||opts.equippedSecond||null;
 let overlay='',lastSelected=null,lastTime=0;
 const pools={first:opts.poolFirst||[],second:opts.poolSecond||[]};
 const currentPool=()=>pools[family];
 const selected=()=>candidate;
 const equipped=()=>family==='first'?opts.equippedFirst:opts.equippedSecond;
 const pic=item=>{if(!item||typeof opts.itemIcon!=='function')return '';const u=opts.itemIcon(item.recipe);return u?`<img src="${esc(u)}" alt="">`:''};
 const btn=(name,x,y,w,h,extra='')=>`<button type="button" data-action="${esc(name)}" aria-label="${esc(name)}" style="${pct(x,y,w,h)}" ${extra}></button>`;
 function openOverlay(name){overlay=name;update()}
 function content(){
  const pool=currentPool(); const active=selected(); const other=equipped(); const diff=compare(other,active);
  const controls=[btn('family-first',38,252,416,51),btn('family-second',38,307,416,52),btn('merc-prev',503,151,48,47),btn('merc-next',749,151,48,47),btn('merc-0',834,149,66,47),btn('merc-1',912,149,72,47),btn('merc-2',991,149,73,47),btn('slot-first',958,239,97,91),btn('slot-second',958,331,97,92),btn('sheet',510,740,285,58),btn('inventory',812,739,259,59),btn('back',651,812,275,44),btn('inspect',1112,763,220,69),btn('equip',1344,760,261,78),btn('page-prev',438,386,26,35),btn('page-next',438,770,26,45)];
  let result=`<div class="mercV04" role="region" aria-label="Inventario del mercenario, arte aprobado V04"><img class="mcArt" alt="" src="${BASE}template.png">`;
  result+=`<div class="mcV4Body" style="${pct(644,277,302,391)}">`;
  const bodyUrl=opts.mercModelUrl||(opts.body==='ranger'?'https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/characters/male_ranger.glb':'https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/characters/male_peasant.glb');
  result+=`<model-viewer src="${esc(bodyUrl)}" camera-controls auto-rotate rotation-per-second="6deg" camera-orbit="15deg 80deg 3.8m" exposure="1.1" shadow-intensity=".65" interaction-prompt="none" alt="Mercenario tridimensional rotatorio"></model-viewer></div>`;
  const invPage=pool.slice(page*20,(page+1)*20);
  invPage.forEach((item,i)=>{const x=46+(i%4)*100,y=396+Math.floor(i/4)*101;const cls=item===active?' selected':'';result+=`<button class="mcItemSlot${cls}" data-item="${page*20+i}" title="${esc(item.name||'Objeto')}" aria-label="${esc(item.name||'Objeto')}" style="${pct(x,y,89,89)}">${pic(item)}</button>`});
  const currentWeapon=weapon||opts.equippedFirst,currentShield=shield||opts.equippedSecond;
  if(currentWeapon)result+=`<div class="mcV4Compare" style="${pct(966,242,82,77)}">${pic(currentWeapon)}</div>`;
  if(currentShield)result+=`<div class="mcV4Compare" style="${pct(966,333,82,81)}">${pic(currentShield)}</div>`;
  result+=`<div class="mcV4Compare" style="${pct(1176,229,115,119)}">${pic(other)}${other?`<small>${esc(other.name||'')}</small><small class="rarity">${esc(other.rarity||'')}</small>`:''}</div>`;
  result+=`<div class="mcV4Compare" style="${pct(1438,229,125,119)}">${pic(active)}${active?`<small>${esc(active.name||'')}</small><small class="rarity">${esc(active.rarity||'')}</small>`:''}</div>`;
  const format=v=>v==null?'—':(Number.isInteger(v)?v:v.toFixed(2)).toString();
  result+=`<div class="mcV4Channels" style="${pct(1111,376,486,373)}" aria-label="Canales dinámicos del objeto" role="region">`;
  for(const c of diff){const idx=CH_INDEX[c.key],a=c.a?.value??null,b=c.b?.value??null,diffVal=a!==null&&b!==null?b-a:null;
   const direction=diffVal===null?'neutral':diffVal>0?'positive':diffVal<0?'negative':'neutral';
   result+=`<div class="mcV4Row" title="${esc(c.key)}"><div class="mcV4RowArt" style="background-image:url('${BASE}channels.png');background-position:0 ${(idx/7)*100}%"></div><span class="mcV4Numbers"><span>${format(a)}</span><span>»</span><span class="${direction}">${format(b)}</span></span></div>`;
  }
  result+='</div>';
  // Approved template already owns the navigator label; avoid drawing a second name on top.
  result+=controls.join('');
  if(overlay){
   let html='';if(overlay==='sheet')html=typeof opts.getStatsHTML==='function'?opts.getStatsHTML(weapon,shield):opts.statsHTML||'Sin datos de ficha registrados.';
   else if(overlay==='inventory')html=typeof opts.getMercInventoryHTML==='function'?opts.getMercInventoryHTML(weapon,shield):`<p>Arma: ${esc(currentWeapon?.name||'Sin equipar')}</p><p>Escudo: ${esc(currentShield?.name||'Sin equipar')}</p>`;
   else if(overlay==='inspect'&&active)html=`<h2>${esc(active.name)}</h2><p>${esc(active.rarity||'')}</p>`+channelEntries(active).map(x=>`<div class="entry">${esc(x.key)}: ${format(x.value)}</div>`).join('');
   result+=`<div class="mcV4Overlay">${html}<button type="button" data-action="dismiss">CERRAR</button></div>`;
  }
  return result+'</div>';
 }
 function update(){
  opts.modal(content(),'mercenaryModal mercConceptModal');const board=document.querySelector('.mercV04');if(!board)return;
  board.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
   const action=button.dataset.action;
   if(action==='family-first'||action==='family-second'){family=action==='family-first'?'first':'second';candidate=family==='first'?weapon:shield;page=0;return update()}
   if(action==='page-prev'||action==='page-next'){page=Math.max(0,Math.min(Math.max(0,Math.ceil(currentPool().length/20)-1),page+(action==='page-next'?1:-1)));return update()}
   if(action==='sheet'||action==='inventory'||action==='inspect')return openOverlay(action);
   if(action==='dismiss'){overlay='';return update()}
   if(action==='back')return opts.onBack?.();
   if(action==='slot-first'||action==='slot-second'){family=action==='slot-first'?'first':'second';candidate=family==='first'?weapon:shield;return update()}
   if(action==='equip'){if(!weapon||!shield)return;return opts.onConfirm?.(weapon,shield)}
   if(action==='merc-prev'||action==='merc-next'||action.startsWith('merc-')){if(typeof opts.onMercenaryChange==='function')return opts.onMercenaryChange(action);return}
  }));
  board.querySelectorAll('[data-item]').forEach(btn=>btn.addEventListener('click',()=>{
   const item=currentPool()[Number(btn.dataset.item)];if(!item)return;
   const now=Date.now(),repeat=item===lastSelected&&now-lastTime<380;
   candidate=item;lastSelected=item;lastTime=now;
   if(family==='first')weapon=item;else shield=item;
   opts.onDraft?.(family,item);
   if(repeat)overlay='inspect';update();
  }));
 }
 update();return {refresh:update};
}
root.GenesisMercenaryConcept={open:render,version:'MERCENARY_APPROVED_ART_V04'};
})(window);