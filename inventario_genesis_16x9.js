(function(global){
'use strict';
const esc=x=>String(x==null?'':x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function familyOf(item){
 const raw=String(item.family||item.recipeFamily||item.recipe||item.category||'').trim();
 if(/espada/i.test(raw))return 'Espadas';if(/escudo/i.test(raw))return 'Escudos';return raw||'Creaciones';
}
function channelList(item){return Array.isArray(item?.channels)?item.channels.map((c,i)=>({name:String(Array.isArray(c)?c[0]:c.name||c.channel||''),val:Array.isArray(c)?c[1]:c.intensity,index:i})):[]}
function nge(item){return [item.nge?.story,item.nge?.description,item.ngeStory,item.narrative,item.description,item.history].find(v=>typeof v==='string'&&v.trim())||''}
const positions=Array.from({length:20},(_,i)=>({left:405+121*(i%10),top:i<10?581:710,width:108,height:115}));
function cssBox(p){return `left:${p.left/1672*100}%;top:${p.top/941*100}%;width:${p.width/1672*100}%;height:${p.height/941*100}%`}
const POSTERS={'Lingote de hierro':'assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png','Mineral de hierro':'assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png'};
function render(ctx,nav){
 const state=ctx.genesisInvFinal || (ctx.genesisInvFinal={family:null,page:0,selected:null});
 const stock=Object.entries(ctx.inventory||{}).filter(([,q])=>Number(q)>0).map(([name,q])=>({key:'m:'+name,name:String(name),qty:Number(q),material:true}));
 const items=(typeof ctx.getItems==='function' ?ctx.getItems():[]).filter(Boolean).map((item,i)=>({key:'c:'+String(item.id||item.uuid||i)+':'+i,name:item.name||'Objeto',item,material:false,rarity:item.rarity||'',family:familyOf(item)}));
 const families=[...(stock.length?['Materiales']:[]),...new Set(items.map(it=>it.family))];
 if(!families.includes(state.family))state.family=families[0]||null;
 const material=state.family==='Materiales';
 const all=material?stock:items.filter(it=>it.family===state.family);
 const pages=Math.max(1,Math.ceil(all.length/20));state.page=Math.max(0,Math.min(state.page,pages-1));
 const shown=all.slice(state.page*20,(state.page+1)*20);
 if(!shown.some(x=>x.key===state.selected))state.selected=shown[0]?.key||null;
 const selected=shown.find(x=>x.key===state.selected)||null;
 const item=selected?.item;
 const poster=(selected&&selected.material)?ctx.materialPoster?.(selected.name)||POSTERS[selected.name]||null:item?.poster||item?.thumbnail||null;
 const registry=global.GenesisInventoryArt;
 const safePoster=typeof poster==='string'&&/^(assets\/|\.\/assets\/)/.test(poster)?poster:null;
 const viewer=item&&typeof ctx.renderAsset==='function'?ctx.renderAsset(item):safePoster?`<img src="${esc(safePoster)}" draggable="false" alt="${esc(selected.name)}">`:
   '<span class="noArt">'+(selected?'Modelo visual no disponible':'')+'</span>';
 const familiars=families.map(f=>{const icon=['Materiales','Espadas','Escudos'].includes(f)?`<img src="assets/icono_${f}.png" alt="">`:'';
  return `<button class="fam ${f===state.family?'selected':''}" type="button" data-family="${esc(f)}" aria-pressed="${f===state.family}">${icon}<span>${esc(f)}</span></button>`;}).join('');
 const chan=item?channelList(item):[];
 const channels=chan.map(c=>{const art=registry?.channel(c.name);return `<div class="channel">${art?`<img class="channelIcon" src="${esc(art.iconUrl)}" alt="">`:''}<span class="channelName">${esc(c.name==='Base'?'Canal base':c.name)}</span><span class="channelVal">${esc(c.val)}</span></div>`;}).join('');
 const facts=selected?(item?[["Nombre",selected.name],["Familia",state.family],["Rareza",item.rarity||'—']]:[["Material",selected.name],["Cantidad",selected.qty]]):[];
 const rows=facts.map(([k,v])=>`<div class="infoRow"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
 const slots=positions.map((p,i)=>{
  const e=shown[i];const thumb=e?(e.material?(ctx.materialPoster?.(e.name)||POSTERS[e.name]):e.item?.thumbnail||e.item?.poster):null;
  const url=typeof thumb==='string'&&/^(assets\/|\.\/assets\/)/.test(thumb)?thumb:null;
  return `<button type="button" class="invSlot ${e?.key===state.selected?'selected':''}" data-slot="${i}" style="${cssBox(p)}" ${e?'':'disabled'} aria-label="${esc(e?.name||'Casilla vacía')}">${url?`<img src="${esc(url)}" alt="">`:''}${e?.material?`<span class="quantity">${e.qty}</span>`:''}</button>`;
 }).join('');
 const html=`<div class="pgInv" id="genesisInvApproved" role="region" aria-label="Inventario Project Genesis">
  <button class="nav nav-inventario" data-tab="Inventario" aria-label="Inventario" type="button"></button>
  <button class="nav nav-preparacion" data-tab="Preparacion" aria-label="Preparación" type="button"></button>
  <button class="nav nav-fabricaciones" data-tab="Fabricaciones" aria-label="Fabricaciones" type="button"></button>
  <button class="nav nav-comparacion" data-tab="Comparacion" aria-label="Comparación" type="button"></button>
  <div class="familyScroll">${familiars}</div>
  <div class="objTitle">${esc(selected?.name||'')}</div><div class="hero">${viewer}</div>
  ${item?'<div class="rotation" aria-hidden="true">↶　360°　↷</div>':''}
  <div class="infoRows">${rows}</div>
  ${item?`<div class="infoChannelsLabel">CANALES DEL OBJETO</div><div class="channels">${channels}</div><div class="infoNgeLabel">RELATO NGE</div><div class="nge">${esc(nge(item))}</div><button id="genesisFullSheet" class="sheet" type="button" aria-label="Consultar ficha del objeto">Consultar ficha del objeto</button>`:''}
  ${slots}<div class="pageControls">${pages>1?`<button data-page="prev" type="button">◀</button><span>${state.page+1}/${pages}</span><button data-page="next" type="button">▶</button>`:''}</div>
  </div>`;
 ctx.modal(html,'preparationModal genInvModal');const root=document.getElementById('genesisInvApproved');if(!root)return;
 root.querySelectorAll('[data-family]').forEach(b=>b.onclick=()=>{state.family=b.dataset.family;state.page=0;state.selected=null;render(ctx,nav)});
 root.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{state.selected=shown[Number(b.dataset.slot)]?.key||null;render(ctx,nav)});
 root.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page+=b.dataset.page==='next'?1:-1;state.selected=null;render(ctx,nav)});
 root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{if(b.dataset.tab==='Preparacion')nav.renderMenu();else if(b.dataset.tab!=='Inventario')nav.renderWorkspace(b.dataset.tab)});
 const sheet=root.querySelector('#genesisFullSheet');if(sheet&&item)sheet.onclick=()=>{
  const p=document.createElement('div');p.className='panelOverlay';
  const fullRows=channelList(item).map(c=>`<div class="fullRow"><span>${esc(c.name)}</span><strong>${esc(c.val)}</strong></div>`).join('');
  const techs=registry?.resolveTechniques(item)||[];
  const techniques=techs.map(t=>`<p>${esc(t.id)}　${t.iconUrl?`<img style="height:1.7cqw" src="${esc(t.iconUrl)}" alt="">`:''}</p>`).join('');
  p.innerHTML=`<button type="button" class="close" aria-label="Cerrar ficha">CERRAR ✕</button><div class="fullInfo"><h2>${esc(item.name)}</h2><p>Rareza: ${esc(item.rarity||'—')}</p><h3>Canales</h3>${fullRows}<h3>Técnicas</h3>${techniques||'<p>Sin técnicas adicionales registradas</p>'}<h3>Historia NGE</h3><p>${esc(nge(item)||'Sin relato registrado')}</p></div>`;
  root.appendChild(p);p.querySelector('button').onclick=()=>p.remove();
 };
}
global.GenesisInventoryApproved=Object.freeze({render,version:'2.0-approval',getDataContract(){return ['ctx.inventory','ctx.getItems','ctx.renderAsset','ctx.materialPoster']}});
global.GenesisInventory16=global.GenesisInventoryApproved;
})(window);
