
/* Genesis Inventory v01 — art source: original preparation 39 PNG, data: live game session. */
(function () {
  'use strict';
  const ROOT = 'assets/ui/preparacion/01_Capas/';
  const TABS = [
    ['Inventario','Pestanas/Pestana_Inventario.png'],
    ['Preparacion','Pestanas/Pestana_Preparacion.png'],
    ['Fabricaciones','Pestanas/Pestana_Fabricaciones.png'],
    ['Comparacion','Pestanas/Pestana_Comparacion.png']
  ];
  const posters = {
    'Mineral de hierro':'assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png',
    'Lingote de hierro':'assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png'
  };
  function esc(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
  }
  function classify(item) {
    // The object owns its actual family. Fallback is the existing recipe name,
    // never a fixed per-profession menu list.
    const raw=String(item.family || item.recipeFamily || item.recipe || item.category || 'Creaciones').trim();
    if (/^espada(s)?\b/i.test(raw)) return 'Espadas';
    if (/^escudo(s)?\b/i.test(raw)) return 'Escudos';
    return raw;
  }
  function channelSummary(item) {
    const channels=Array.isArray(item.channels)?item.channels:[];
    if(!channels.length)return '<p class="genInvEmptyChannels">Este objeto todavía no tiene canales registrados.</p>';
    return channels.map(function(c,index){
      const name=Array.isArray(c)?c[0]:(c.name||c.channel||'');
      const intensity=Array.isArray(c)?c[1]:c.intensity;
      const text=Number.isFinite(Number(intensity))?String(intensity):'';
      return '<div class="genInvChannel"><span>'+esc(index===0 && String(name).toLowerCase()==='base'?'Canal base':name)+'</span><b>'+esc(text)+'</b></div>';
    }).join('');
  }
  function storySummary(item) {
    const candidates=[item.nge?.story,item.nge?.description,item.ngeStory,item.narrative,item.description,item.history];
    const found=candidates.find(function(v){return typeof v==='string' && v.trim()});
    return found?'<p class="genInvNgeText">'+esc(found)+'</p>':
      '<p class="genInvNgeText genInvNoStory">Sin relato NGE disponible en este objeto.</p>';
  }
  function familyItems(ctx) {
    const all=typeof ctx.getItems==='function' ? (ctx.getItems() || []) : [];
    return all.filter(Boolean);
  }
  function materialArt(name) {
    const poster=posters[name];
    return poster ? '<img src="'+esc(poster)+'" alt="'+esc(name)+'" draggable="false">' :
      '<span class="genInvEmptyPreview">'+esc(name)+'</span>';
  }
  // Sólo usar recursos reales de la sesión; no inventar GLB ni stats.
  // Render APROBADO de la espada base V175-V12B (sin efectos).
  // Copia de vista 2D; el preset PBR se aplicará al GLB sólo tras exportación.
  // SHA pinneado: la referencia no cambia aunque se actualice la rama de Fuego.
  const SWORD_V12B_RENDER='https://raw.githubusercontent.com/ProjectGenesisAssets2/genesis-equipment-assets/98cb1c5d94effb206d75d6c94c0d526a5c97ddc8/public-previews/espada-v175-j-roughness-v12/V12_V175_Color_J_Rugosidad034_Hero.png';
  function approvedSwordPoster(item){
    return /^espada(?:s)?(?:\b|_)/i.test(String(item?.recipe||item?.family||''))?SWORD_V12B_RENDER:'';
  }
  function creationPreview(item, ctx) {
    if (!item) return { html:'', interactive:false };
    const raw = [item.modelUrl, item.glbUrl, item.glb, item.model?.url]
      .find(v => typeof v === 'string' && v.trim());
    const url = typeof raw === 'string' ? raw.trim() : '';
    const safeModel = /^(?:https?:\/\/|\/|assets\/|\.\/|\.\.\/)/i.test(url) && /\.glb(?:[?#]|$)/i.test(url);
    if (safeModel && window.customElements?.get('model-viewer')) {
      return {
        html:'<model-viewer src="'+esc(url)+'" camera-controls interaction-prompt="none" '+
          'shadow-intensity="0.7" camera-orbit="0deg 75deg auto" alt="'+esc(item.name||'Creación')+'"></model-viewer>',
        interactive:true
      };
    }
    if (typeof ctx.renderAsset === 'function') {
      const supplied = String(ctx.renderAsset(item) || '');
      if (/<(?:model-viewer|canvas)\b/i.test(supplied)) return { html:supplied, interactive:true };
      if (/<img\b/i.test(supplied)) return { html:supplied, interactive:false };
    }
    const poster = item.thumbnail || item.poster || item.previewImage || approvedSwordPoster(item);
    return { html:poster ? '<img src="'+esc(poster)+'" alt="'+esc(item.name||'')+'" draggable="false">' : '',
      interactive:false };
  }

  function render(ctx, nav) {
    const inventory=ctx.inventory || {};
    const allItems=familyItems(ctx);
    const stock=Object.entries(inventory).filter(function(pair){return Number(pair[1])>0});
    const families=[...(stock.length?['Materiales']:[]),...new Set(allItems.map(classify).filter(Boolean))];
    const state=ctx.genInvState || (ctx.genInvState={family:'Materiales',page:0,search:''});
    if(!families.includes(state.family))state.family=families[0]||'Materiales';
    const materialMode=state.family==='Materiales';
    const source=materialMode?stock.map(function(pair){return {key:'material:'+pair[0],name:pair[0],qty:Number(pair[1]),material:true}}):
      allItems.map(function(i,index){return {key:'creation:'+String(i.id||i.uuid||index)+':'+index,name:i.name,rarity:i.rarity,item:i,material:false}}).filter(function(e){return classify(e.item)===state.family});
    const search=state.search.toLocaleLowerCase();
    const filtered=source.filter(function(e){return String(e.name).toLocaleLowerCase().includes(search)});
    const pages=Math.max(1,Math.ceil(filtered.length/20));
    state.page=Math.max(0,Math.min(state.page,pages-1));
    const visible=filtered.slice(state.page*20,(state.page+1)*20);
    if(!visible.some(function(v){return v.key===state.selectedKey}))state.selectedKey=visible[0]?.key||null;
    const chosen=visible.find(function(e){return e.key===state.selectedKey})||visible[0];
    const navMarkup=TABS.map(function(t){
      return '<button class="genInvTab" data-nav="'+esc(t[0])+'" aria-current="'+(t[0]==='Inventario'?'page':'false')+'" aria-label="'+esc(t[0])+'"><img src="'+ROOT+t[1]+'" alt="'+esc(t[0])+'"></button>';
    }).join('');
    const familiesMarkup=families.map(function(f){
      const icon=f==='Materiales'?'◆':f==='Espadas'?'⚔':f==='Escudos'?'◈':'✦';
      return '<button class="genInvFamily" data-family="'+esc(f)+'" aria-pressed="'+(f===state.family)+'"><span class="genInvFamIcon">'+icon+'</span><span>'+esc(f)+'</span></button>';
    }).join('');
    const item=chosen?.item;
    const preview=chosen&&!materialMode?creationPreview(item,ctx):null;
    const viewer=chosen?(materialMode?materialArt(chosen.name):preview.html):'';
    const title=chosen?esc(chosen.name):'Seleccioná un objeto';
    const facts=chosen?('<div class="genInvInfoLine"><span>Nombre</span><b>'+esc(chosen.name)+'</b></div>'+(materialMode?
      '<div class="genInvInfoLine"><span>Familia</span><b>Materiales</b></div><div class="genInvInfoLine"><span>Cantidad</span><b>'+chosen.qty+'</b></div>':
      '<div class="genInvInfoLine"><span>Familia</span><b>'+esc(state.family)+'</b></div><div class="genInvInfoLine"><span>Rareza</span><b>'+esc(item.rarity||'')+'</b></div>'+
      '<h3 class="genInvSubhead">CANALES DEL OBJETO</h3>'+
      '<div class="genInvChannels" role="list">'+channelSummary(item)+'</div>'+
      '<h3 class="genInvSubhead">RELATO NGE</h3>'+storySummary(item))) : '';

    const slots=Array.from({length:20},function(_,i){
      const entry=visible[i];
      if(!entry)return '<button class="genInvSlot" disabled aria-label="Casilla vacía"></button>';
      const selected=entry.key===state.selectedKey;
      const content=entry.material?materialArt(entry.name):
        (entry.item.thumbnail || entry.item.poster || approvedSwordPoster(entry.item)
          ? '<img src="'+esc(entry.item.thumbnail||entry.item.poster||approvedSwordPoster(entry.item))+'" alt="" loading="lazy" draggable="false">'
          : '<span class="genInvCreationGlyph" aria-hidden="true"></span>');
      return '<button class="genInvSlot'+(selected?' selected':'')+'" data-select="'+i+'" aria-label="'+esc(entry.name)+'" aria-pressed="'+selected+'"><span class="genInvSlotArtwork">'+content+'</span><span class="genInvSlotQty">'+esc(entry.material?entry.qty:(entry.rarity||''))+'</span></button>';
    }).join('');
    const html='<div class="genInv" id="genInv">'+
      '<header class="genInvNav">'+navMarkup+'</header>'+
      '<main class="genInvMain">'+
        '<aside class="genInvFamilies"><h2 class="genInvHead">FAMILIAS</h2>'+familiesMarkup+
          '</aside>'+
        '<section class="genInvViewer"><p class="genInvViewerTitle">'+title+'</p><div class="genInvImageWrap" data-preview-mode="'+(materialMode?'material':(preview?.interactive?'3d':'static'))+'">'+viewer+'</div>'+
          (chosen&&!materialMode&&preview?.interactive?'<p class="genInvViewLabel" aria-label="Inspección 360 grados">◀ 360° ▶</p>':'<p class="genInvViewLabel" aria-hidden="true"></p>')+'</section>'+
        '<aside class="genInvInfo"><h2 class="genInvInfoTitle">INFORMACIÓN</h2>'+facts+
          (chosen&&!materialMode?'<button class="genInvInfoMore" id="genInvDetails"><span>CONSULTAR FICHA DEL OBJETO</span></button>':'')+
          '</aside>'+
        '<section class="genInvGrid"><div class="genInvGridControls"><h2 class="genInvGridTitle">'+esc(state.family)+'</h2>'+
          '<input class="genInvFilter" id="genInvFilter" aria-label="Filtrar objetos" placeholder="Filtrar '+(materialMode?'materiales':'creaciones')+'..." value="'+esc(state.search)+'">'+
          '<span class="genInvNotice">'+filtered.length+' tipos registrados</span></div>'+
          '<div class="genInvSlots">'+slots+'</div>'+
          '<div class="genInvPage"><button id="genInvPrev" '+(state.page===0?'disabled':'')+'>◀</button>'+
          '<span>Página '+(state.page+1)+' / '+pages+'</span><button id="genInvNext" '+(state.page===pages-1?'disabled':'')+'>▶</button></div></section>'+
      '</main></div>';
    ctx.modal(html,'preparationModal genInvModal');
    const board=document.querySelector('#genInv');
    if(!board)return;
    board.querySelectorAll('[data-nav]').forEach(function(b){b.onclick=function(){
      if(b.dataset.nav==='Preparacion')nav.renderMenu();
      else if(b.dataset.nav!=='Inventario')nav.renderWorkspace(b.dataset.nav);
    }});
    board.querySelectorAll('[data-family]').forEach(function(b){b.onclick=function(){
      state.family=b.dataset.family;state.page=0;state.selectedKey=null;state.search='';render(ctx,nav);
    }});
    board.querySelectorAll('[data-select]').forEach(function(b){b.onclick=function(){
      state.selectedKey=visible[Number(b.dataset.select)]?.key;render(ctx,nav);
    }});
    // La inclinación afecta sólo la miniatura, jamás el marco ni el contador.
    // El eje horizontal del puntero recorre exactamente -45° a +45°.
    board.querySelectorAll('.genInvSlot[data-select]').forEach(function(button){
      const art=button.querySelector('.genInvSlotArtwork');
      if(!art)return;
      button.onpointermove=function(event){
        const rect=button.getBoundingClientRect();
        if(!rect.width)return;
        const p=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
        art.style.setProperty('--gen-slot-yaw',(-45+90*p).toFixed(2)+'deg');
      };
      const reset=function(){art.style.setProperty('--gen-slot-yaw','0deg')};
      button.onpointerleave=reset;
      button.onblur=reset;
    });
    board.querySelector('#genInvPrev').onclick=function(){state.page--;state.selectedKey=null;render(ctx,nav)};
    board.querySelector('#genInvNext').onclick=function(){state.page++;state.selectedKey=null;render(ctx,nav)};
    const input=board.querySelector('#genInvFilter');
    input.onchange=function(){state.search=input.value;state.page=0;state.selectedKey=null;render(ctx,nav)};

    const details=board.querySelector('#genInvDetails');
    if(details&&item)details.onclick=function(){
      const pane=document.createElement('section');pane.className='genInvOverlay';
      ctx.sheetTab='channels';
      pane.innerHTML='<button id="genInvCloseDetails" aria-label="Cerrar ficha">✕ CERRAR</button>'+
        nav.sheetForItem(ctx,item);
      // Public object info never exposes crafting formulas, internal traces, or MU stats.
      pane.querySelector('.workspaceSheetTabs')?.remove();
      const story = [item.nge?.story,item.nge?.description,item.ngeStory,item.narrative,item.description,item.history]
        .find(function(v){return typeof v==='string' && v.trim()});
      const storyBox=pane.querySelector('.workspaceNgeScroll');
      if(storyBox && story) storyBox.textContent=story;
      board.appendChild(pane);
      pane.querySelector('#genInvCloseDetails').onclick=function(){pane.remove()};
    };
  }
  window.GenesisInventory16={render:render,version:'INVENTARIO_FINAL_APROBADO_16x9_V1',dataSource:'session.inventory + session.getItems'};
})();
