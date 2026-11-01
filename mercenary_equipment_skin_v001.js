/* Project Genesis: mercenary equipment approved-layout skin; delegates gameplay to existing controls. */
(function(){
'use strict';
if(window.GenesisMercenarySkin)return;
var state={family:0,merc:-1};
var ASSET={peasant:'https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/characters/male_peasant.glb',ranger:'https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/characters/male_ranger.glb'};
var glyph={Base:'⚔',Luz:'☼',Sombra:'☾',Fuego:'♨',Hielo:'❄',Naturaleza:'❧',Tierra:'◆',Rayo:'ϟ'};
function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(v){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]});}
function entries(item){return(Array.isArray(item&&item.channels)?item.channels:[]).map(function(x,i){var k=Array.isArray(x)?x[0]:x&&(x.name||x.channel);var v=Array.isArray(x)?x[1]:x&&x.intensity;if(!k||v==null||!Number.isFinite(Number(v)))return null;return {key:i===0?'Base':String(k),value:Number(v)};}).filter(Boolean)}
function compare(a,b){var aa=entries(a),bb=entries(b),keys=[];aa.concat(bb).forEach(function(v){if(!keys.includes(v.key))keys.push(v.key)});if(keys.includes('Base'))keys=['Base'].concat(keys.filter(function(x){return x!=='Base'}));return keys.map(function(k){var l=aa.find(function(x){return x.key===k}),r=bb.find(function(x){return x.key===k});return {key:k,old:l?l.value:null,now:r?r.value:null};})}
function slot(name,icon,enabled,item){return '<div class="gmeSlot '+(enabled?'on':'off')+'"><span class="gmeSlotIcon">'+icon+'</span><span class="gmeSlotTitle">'+esc(name)+'</span>'+(item?'<small>'+esc(item)+'</small>':'')+'</div>'}
function btn(id,title,primary){return '<button id="'+id+'" class="gmeBtn'+(primary?' primary':'')+'">'+title+'</button>'}
function details(board,title,inner){var el=board.querySelector('.gmeDetails');el.innerHTML='<article><h3>'+esc(title)+'</h3>'+inner+btn('gmeDetailClose','VOLVER')+'</article>';el.hidden=false;el.querySelector('#gmeDetailClose').onclick=function(){el.hidden=true}}
function draw(){
 var modal=document.getElementById('modal'),bridge=window.GenesisMercenaryLiveBridge;
 if(!modal||!modal.classList.contains('mercenaryModal')||!modal.querySelector('#mercEquipConfirm')||modal.querySelector('.gmeBoard')||!bridge||!bridge.snapshot)return;
 var data=bridge.snapshot();if(!data||!data.merc||!data.families||!data.families.length)return;
 if(state.merc!==data.merc.id){state.family=0;state.merc=data.merc.id;}
 state.family=Math.max(0,Math.min(state.family,data.families.length-1));
 var f=data.families[state.family],selected=f.selected,equipped=f.equipped,available=f.items;
 var selectedPosition=selected?available.findIndex(function(i){return i.sourceIndex===selected.sourceIndex}):-1;
 var familyHtml=data.families.map(function(x,i){return '<button class="gmeFamily'+(i===state.family?' active':'')+'" data-gme-family="'+i+'"><span>'+esc(x.glyph)+'</span>'+esc(x.name)+'</button>'}).join('');
 var grid=Array.from({length:20},function(_,i){var it=available[i];if(!it)return '<div class="gmeCell empty">✥</div>';return '<button class="gmeCell'+(i===selectedPosition?' selected':'')+'" data-gme-item="'+i+'" title="'+esc(it.name)+'"><img alt="" loading="lazy" src="'+esc(it.icon)+'"><small>'+esc(it.rarity)+'</small></button>'}).join('');
 var eq=equipped?equipped.name:'Sin equipar',cand=selected?selected.name:'Seleccionar objeto';
 var rows=compare(equipped,selected).map(function(c){
  var suffix=c.key==='Base'?'':'%',p=c.old==null?'—':c.old+suffix,q=c.now==null?'—':c.now+suffix;
  var trend=c.old==null?'Nuevo':c.now==null?'Ausente':c.old===c.now?'=':c.now>c.old?'▲':'▼';
  var tone=c.old!=null&&c.now!=null?(c.now>c.old?'up':c.now<c.old?'down':'same'):'neutral';
  return '<div class="gmeRow gme-'+esc(c.key.toLowerCase())+'"><div class="gmeOrn"><i>'+esc(glyph[c.key]||'✦')+'</i><span>'+esc(c.key==='Base'?f.baseLabel:c.key)+'</span></div><b>'+esc(p)+'</b><em>»</em><b>'+esc(q)+'</b><strong class="'+tone+'">'+trend+'</strong></div>';
 }).join('')||'<p class="gmeEmpty">Elegí un objeto del inventario para comparar sus canales.</p>';
 var candidateButtons=(data.candidates||[]).map(function(c,i){return '<button data-gme-candidate="'+i+'" '+(data.merc.id===i?'class="active"':'')+'>'+String(i+1)+'</button>'}).join('');
 var html='<div class="gmeBoard">'+
 '<header class="gmeHeader"><span>❖</span><div><small>PROJECT GENESIS</small><h1>INVENTARIO DEL MERCENARIO</h1></div><span>❖</span></header>'+
 '<div class="gmeLayout"><section class="gmePanel gmeLeft"><h2>EQUIPAMIENTO COMPATIBLE</h2><h3>FAMILIAS</h3>'+familyHtml+
 '<h3 class="gmeItemsTitle">OBJETOS DISPONIBLES</h3><div class="gmeGrid">'+grid+'</div><small class="gmeCount">'+available.length+' objetos compatibles</small></section>'+
 '<section class="gmePanel gmeCenter"><div class="gmeCandidate"><span>'+esc(data.merc.label)+'</span><div>'+candidateButtons+'</div></div>'+
 '<div class="gmeCharacter"><div class="gmeSlots">'+
 slot('Casco','♜',false)+slot('Brazos','♟',false)+slot('Anillo I','◈',false)+slot(f.slotA,'⚔',true,data.equipment.a?.name)+slot('Piernas','▤',false)+
 '</div><div class="gmeFigure"><div class="gmeNeck">'+slot('Collar','♢',false)+'</div>'+
 '<model-viewer src="'+esc(ASSET[data.merc.body]||ASSET.peasant)+'" camera-controls auto-rotate rotation-per-second="14deg" camera-orbit="0deg 75deg 4.2m" exposure="1" shadow-intensity="0.65" interaction-prompt="none" disable-zoom alt="Cuerpo GLB original del mercenario"></model-viewer>'+
 '<span>Modelo 3D del juego</span></div><div class="gmeSlots">'+
 slot('Torso','♜',false)+slot('Guantes','♧',false)+slot('Anillo II','◈',false)+slot(f.slotB,'⬡',true,data.equipment.b?.name)+slot('Botas','▥',false)+
 '</div></div><div class="gmeCenterActions">'+btn('gmeStats','FICHA DEL MERCENARIO')+btn('gmeBag','INVENTARIO DEL MERCENARIO')+btn('gmeBack','CERRAR')+'</div></section>'+
 '<section class="gmePanel gmeRight"><h2>COMPARACIÓN DE EQUIPO</h2><div class="gmePair"><div><span>EQUIPADO</span><b>'+esc(eq)+'</b><small>'+esc(equipped?.rarity||'')+'</small></div><em>»</em><div><span>SELECCIONADO</span><b>'+esc(cand)+'</b><small>'+esc(selected?.rarity||'')+'</small></div></div>'+
 '<h3>CANALES DE LA CREACIÓN</h3><div class="gmeColumnTitles"><span>CANAL</span><span>ACTUAL</span><span>NUEVO</span></div><div class="gmeScroll" tabindex="0">'+rows+'</div>'+
 '<div class="gmeRightActions">'+btn('gmeInspect','INSPECCIONAR')+btn('gmeEquip',data.editing?'APLICAR CAMBIOS':'EQUIPAR AL MERCENARIO',true)+'</div></section></div>'+
 '<div class="gmeDetails" hidden></div></div>';
 modal.classList.add('genMercSkinned');modal.insertAdjacentHTML('beforeend',html);
 var board=modal.querySelector('.gmeBoard');
 board.querySelectorAll('[data-gme-family]').forEach(function(b){b.onclick=function(){state.family=Number(b.dataset.gmeFamily);board.remove();modal.classList.remove('genMercSkinned');draw();}});
 board.querySelectorAll('[data-gme-item]').forEach(function(b){b.onclick=function(){var it=available[Number(b.dataset.gmeItem)];var old=modal.querySelector('[data-gear-type="'+f.type+'"][data-gear-idx="'+it.sourceIndex+'"]');if(old)old.click();}});
 var originalConfirm=modal.querySelector('#mercEquipConfirm'),originalBack=modal.querySelector('#mercEquipBack');
 board.querySelector('#gmeEquip').disabled=originalConfirm.disabled;
 board.querySelector('#gmeEquip').onclick=function(){originalConfirm.click()};
 board.querySelector('#gmeBack').onclick=function(){originalBack.click()};
 board.querySelector('#gmeInspect').onclick=function(){var it=selected||equipped;if(!it)return;details(board,it.name,'<p>'+esc(it.rarity)+'</p>'+entries(it).map(function(c,i){return '<div class="gmeDetailRow"><span>'+esc(i?'Canal '+c.key:'Canal Base')+'</span><b>'+c.value+(i?'%':'')+'</b></div>'}).join('')+(it.story?'<p>'+esc(it.story)+'</p>':''));};
 board.querySelector('#gmeStats').onclick=function(){var s=data.merc.stats||{};details(board,'FICHA · '+data.merc.label,'<p>Valores actuales de demostración</p>'+[['damage','Daño base'],['protection','Protección base'],['vitality','Vitalidad'],['mobility','Movilidad']].filter(function(x){return s[x[0]]!=null}).map(function(x){return '<div class="gmeDetailRow"><span>'+x[1]+'</span><b>'+s[x[0]]+'</b></div>'}).join(''));};
 board.querySelector('#gmeBag').onclick=function(){details(board,'INVENTARIO DEL MERCENARIO','<p>Equipo asignado</p><div class="gmeDetailRow"><span>'+esc(data.equipment.aLabel)+'</span><b>'+esc(data.equipment.a?.name||'Vacío')+'</b></div><div class="gmeDetailRow"><span>'+esc(data.equipment.bLabel)+'</span><b>'+esc(data.equipment.b?.name||'Vacío')+'</b></div><p>Los espacios de carga adicionales todavía no tienen persistencia implementada.</p>');};
 board.querySelectorAll('[data-gme-candidate]').forEach(function(b){b.onclick=function(){if(data.gearAttached)details(board,'MERCENARIO CONTRATADO','<p>Este personaje ya está contratado.</p>');else originalBack.click();};});
}
var obs=new MutationObserver(draw);
function init(){var box=document.getElementById('modal');if(!box)return;obs.observe(box,{childList:true});draw();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.GenesisMercenarySkin={render:draw,compare:compare,version:'v001'};
})();