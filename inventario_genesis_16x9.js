
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
    const type=String(item.family || item.category || item.recipe || '').toLowerCase();
    if (/espada/.test(type)) return 'Espadas';
    if (/escudo/.test(type)) return 'Escudos';
    return 'Otras creaciones';
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
  function render(ctx, nav) {
    const inventory=ctx.inventory || {};
    const allItems=familyItems(ctx);
    const stock=Object.entries(inventory).filter(function(pair){return Number(pair[1])>0});
    const families=['Materiales',...(ctx.profession==='Herrero'?['Espadas','Escudos']:[]),...['Espadas','Escudos','Otras creaciones'].filter(function(f){return allItems.some(function(i){return classify(i)===f}) && (ctx.profession!=='Herrero'||f==='Otras creaciones')})];
    const state=ctx.genInvState || (ctx.genInvState={family:'Materiales',page:0,search:''});
    if(!families.includes(state.family))state.family='Materiales';
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
    const viewer=chosen?(materialMode?materialArt(chosen.name):
      (typeof ctx.renderAsset==='function'?ctx.renderAsset(item):'<span class="genInvEmptyPreview">'+esc(chosen.name)+'</span>')) :
      '<p class="genInvEmptyPreview">La familia seleccionada no contiene objetos</p>';
    const title=chosen?esc(chosen.name):'Sin selección';
    const facts=chosen?(materialMode?
      '<div class="genInvInfoLine"><span>Familia</span><b>Materiales</b></div><div class="genInvInfoLine"><span>Cantidad</span><b>'+chosen.qty+'</b></div>':
      '<div class="genInvInfoLine"><span>Familia</span><b>'+esc(state.family)+'</b></div><div class="genInvInfoLine"><span>Rareza</span><b>'+esc(item.rarity||'')+'</b></div><div class="genInvInfoLine"><span>Canales</span><b>'+(Array.isArray(item.channels)?item.channels.length:0)+'</b></div>'):'';
    const slots=Array.from({length:20},function(_,i){
      const entry=visible[i];
      if(!entry)return '<button class="genInvSlot" disabled aria-label="Casilla vacía"></button>';
      const selected=entry.key===state.selectedKey;
      const content=entry.material?materialArt(entry.name):'<span class="genInvCreationGlyph">'+(state.family==='Escudos'?'◈':'⚔')+'</span>';
      return '<button class="genInvSlot'+(selected?' selected':'')+'" data-select="'+i+'" aria-label="'+esc(entry.name)+'" aria-pressed="'+selected+'">'+content+'<span>'+esc(entry.material?entry.qty:(entry.rarity||''))+'</span></button>';
    }).join('');
    const html='<div class="genInv" id="genInv">'+
      '<header class="genInvNav">'+navMarkup+'</header>'+
      '<main class="genInvMain">'+
        '<aside class="genInvFamilies"><h2 class="genInvHead">FAMILIAS</h2>'+familiesMarkup+
          '</aside>'+
        '<section class="genInvViewer"><p class="genInvViewerTitle">'+title+'</p><div class="genInvImageWrap">'+viewer+'</div><p class="genInvViewLabel">'+(materialMode?'Vista fija · material':'Objeto fabricado · visor 360°')+'</p></section>'+
        '<aside class="genInvInfo"><h2 class="genInvInfoTitle">INFORMACIÓN</h2>'+facts+
          (chosen&&!materialMode?'<button class="genInvInfoMore" id="genInvDetails">INFORMACIÓN COMPLETA</button>':'')+
          '</aside>'+
        '<section class="genInvGrid"><div class="genInvGridControls"><h2 class="genInvGridTitle">'+esc(state.family)+'</h2>'+
          '<input class="genInvFilter" id="genInvFilter" aria-label="Filtrar objetos" placeholder="Filtrar '+(materialMode?'materiales':'creaciones')+'..." value="'+esc(state.search)+'">'+
          '<span class="genInvNotice">'+filtered.length+' tipos registrados</span></div>'+
          '<div class="genInvSlots">'+slots+'</div>'+
          '<div class="genInvPage"><button id="genInvPrev" '+(state.page===0?'disabled':'')+'>◀</button>'+
          '<span>Página '+(state.page+1)+' / '+pages+'</span><button id="genInvNext" '+(state.page===pages-1?'disabled':'')+'>▶</button></div></section>'+
      '</main><footer class="genInvFooter"><button class="genInvAction" id="genInvGoCraft"><span>IR A FABRICACIONES</span></button></footer></div>';
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
    board.querySelector('#genInvPrev').onclick=function(){state.page--;state.selectedKey=null;render(ctx,nav)};
    board.querySelector('#genInvNext').onclick=function(){state.page++;state.selectedKey=null;render(ctx,nav)};
    const input=board.querySelector('#genInvFilter');
    input.onchange=function(){state.search=input.value;state.page=0;state.selectedKey=null;render(ctx,nav)};
    board.querySelector('#genInvGoCraft').onclick=function(){nav.renderWorkspace('Fabricaciones')};
    const details=board.querySelector('#genInvDetails');
    if(details&&item)details.onclick=function(){
      const pane=document.createElement('section');pane.className='genInvOverlay';
      pane.innerHTML='<button id="genInvCloseDetails" aria-label="Cerrar ficha">✕ CERRAR</button>'+
        nav.sheetForItem(ctx,item);board.appendChild(pane);
      pane.querySelector('#genInvCloseDetails').onclick=function(){pane.remove()};
    };
  }
  window.GenesisInventory16={render:render,version:'V01',dataSource:'session.inventory + session.getItems'};
})();
