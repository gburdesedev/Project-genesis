/* PROJECT GENESIS — Mercenario · V09 approved-art implementation (experimental)
 * The approved V09 image is never modified. Empty art comes from the existing
 * blank reference; the 3D hero and every fabricated item are real data overlays.
 * Nothing in this module synthesizes stats, owned items or equipment.
 */
(function (global) {
  'use strict';
  const A = 'assets/ui/mercenary/v09/';
  const CHANNELS = ['Base','Luz','Sombra','Fuego','Hielo','Naturaleza','Tierra','Rayo'];
  function esc(x) { return String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function readChannels(item) {
    if (!item) return [];
    let entries = Array.isArray(item.channels) ? item.channels :
      item.channels && typeof item.channels === 'object' ? Object.entries(item.channels) : [];
    return entries.map((r, i) => {
      let name = Array.isArray(r) ? r[0] : r.name ?? r.channel;
      let value = Number(Array.isArray(r) ? r[1] : r.intensity ?? r.value);
      if (i === 0 && ['Fisico','Físico','Daño','Protección','Proteccion','Base',''].includes(String(name||''))) name = 'Base';
      return { name: String(name || ''), value };
    }).filter(x => x.name && Number.isFinite(x.value));
  }
  function compare(first, second) {
    const a = readChannels(first), b = readChannels(second), names = [];
    for (const x of [...a, ...b]) if (!names.includes(x.name)) names.push(x.name);
    names.sort((x, y) => x === 'Base' ? -1 : y === 'Base' ? 1 : 0);
    return names.map(name => ({ name, a:a.find(x=>x.name===name), b:b.find(x=>x.name===name) }));
  }
  function open(opts) {
    const state = { family:'first', item:null, page:0, modal:null,
      draftFirst:opts.selectedFirst ?? null, draftSecond:opts.selectedSecond ?? null };
    const pools = { first:opts.poolFirst || [], second:opts.poolSecond || [] };
    const body = opts.body === 'ranger' ? 'rangerMale086/src/male_ranger.glb' : 'peasantMale086/src/male_peasant.glb';
    const defaultBodyUrl = './assets/vendor/genesis/externals/' + body;
    const model = opts.modelUrl || global.GenesisPreflight?.modelUrl(defaultBodyUrl) || defaultBodyUrl;
    function getIcon(item) {
      if (!item || typeof opts.itemIcon !== 'function') return '';
      const approved3DThumbs={espada_hierro:'assets/ui/mercenary/ml06/espada_hierro_original_3d_render.png',escudo_hierro:'assets/ui/mercenary/ml06/escudo_hierro_original_3d_render.png'};
      const url=(new URLSearchParams(location.search).get('mercenario')==='1'&&approved3DThumbs[item.recipe])||opts.itemIcon(item.recipe);
      return typeof url === 'string' && url.trim() ? `<img src="${esc(url)}" alt="${esc(item.name||item.recipe)}" loading="eager">` : '';
    }
    function pool() { return pools[state.family]; }
    function selected() { return state.item || (state.family === 'first' ? state.draftFirst : state.draftSecond); }
    function equipped() { return state.family === 'first' ? opts.equippedFirst : opts.equippedSecond; }
    function slot(name, cx, cy, item, locked=true, kind='') {
      const x = 100 * cx / 1670, y=100*cy/942;
      return `<button type="button" class="mcSlot pv9Slot ${locked?'isLocked':'isActive'} ${kind}" style="left:${x}%;top:${y}%;" aria-label="${esc(name)}" title="${esc(name)}" ${locked?'disabled':''}>${getIcon(item)}</button>`;
    }
    function itemAt(index) { return pool()[state.page*20+index] || null; }
    function comparisonSlot(item, label) {
      // Keep the two approved V09 frames. Text is data and must never paint outside a frame.
      if (!item) return '<div class="pv9ComparisonEmpty" aria-label="'+esc(label)+': sin objeto"></div>';
      const full=String(item.name||'');
      return '<div class="pv9ComparisonContents" title="'+esc(full)+'">'
        + '<div class="pv9ComparisonIcon">'+getIcon(item)+'</div>'
        + '<div class="pv9ComparisonName">'+esc(full)+'</div>'
        + '<div class="pv9ComparisonRarity">'+esc(item.rarity||'')+'</div></div>';
    }
    function render() {
      const candidate = selected(), old = equipped(), rows = compare(old, candidate);
      const family = state.family, canEquip = opts.editing ? (!!(state.draftFirst || opts.equippedFirst) && !!(state.draftSecond || opts.equippedSecond)) : (!!state.draftFirst && !!state.draftSecond);
      const grid = Array.from({length:20}, (_,i) => {
        const item=itemAt(i); return `<button type="button" class="mcInventorySlot ${item?'hasItem':''} ${item && item===candidate?'selected':''}" data-item="${i}" aria-label="${esc(item?.name || 'Casilla vacía')}" title="${esc(item?.name || '')}" ${item?'':'disabled'}>${getIcon(item)}</button>`;
      }).join('');
      const poster=opts.modelUrl ? '<img class="pv9RealCyclesPoster" src="assets/ui/mercenary/v09/V049_REAL_CYCLES32_PREVIEW_ALPHA.png" alt="Render original en Blender Cycles HDRI EXR 32 bits del mercenario V049 con espada V12B y escudo V015">' : '';
      const modelHtml = poster + `<model-viewer src="${esc(model)}" camera-controls auto-rotate interaction-prompt="none" camera-orbit="15deg 80deg 5.2m" exposure="1.05" shadow-intensity=".55" alt="Mercenario 3D real V049 con espada V12B y escudo V015" class="pv9Viewer"></model-viewer>`;
      const channels = rows.map(row => {
        const known=CHANNELS.includes(row.name) && row.name !== 'Rayo';
        const delta = row.a && row.b ? row.b.value-row.a.value : null;
        const value=v=>v? (row.name==='Base'?String(v.value):'+'+v.value+'%') : '—';
        return `<div class="mcChannel" data-channel="${esc(row.name)}"><span class="pv9ChannelArtwork">${known?`<img src="${A}Canal_${row.name}_Origen_V09.png" alt="${esc(row.name)}">`:esc(row.name)}</span><span class="mcChannelNum">${value(row.a)}</span><span class="mcChannelNum ${delta===null?'':delta>0?'increase':delta<0?'decrease':'same'}">${value(row.b)}</span></div>`;
      }).join('');
      const overlay = state.modal === 'sheet' ? `<div class="mcOverlay"><section><h2>FICHA DEL MERCENARIO</h2>${typeof opts.getStatsHTML==='function'?opts.getStatsHTML(state.draftFirst,state.draftSecond):opts.statsHTML || '<p>Sin datos registrados.</p>'}<button data-action="dismiss">VOLVER</button></section></div>` :
        state.modal === 'inventory' ? `<div class="mcOverlay"><section><h2>INVENTARIO DEL MERCENARIO</h2>${typeof opts.getMercInventoryHTML==='function'?opts.getMercInventoryHTML(state.draftFirst,state.draftSecond):'<p>Sin objetos asignados.</p>'}<button data-action="dismiss">VOLVER</button></section></div>` :
        state.modal === 'inspect' && candidate ? `<div class="mcOverlay"><section><h2>${esc(candidate.name)}</h2><p>${esc(candidate.rarity)}</p>${readChannels(candidate).map(c=>`<p>${esc(c.name)}: ${c.value}</p>`).join('')}<button data-action="dismiss">VOLVER</button></section></div>` : '';
      const html = `<div class="mercConcept pv9Shell pv9IntegratedML06"><div class="mcBoard pv9Board" aria-label="Inventario del Mercenario · equipamiento interactivo del juego">
        <div class="pv9Target pv9FamilyEspadas ${family==='first'?'on':''}" data-family="first" role="button" tabindex="0" aria-label="Espadas"></div>
        <div class="pv9Target pv9FamilyEscudos ${family==='second'?'on':''}" data-family="second" role="button" tabindex="0" aria-label="Escudos"></div>
        <div class="mcInventoryGrid pv9Grid">${grid}</div>
        <div class="mcMercIDs pv9MercIDs"><button type="button" aria-label="Mercenario 1" data-merc="0"></button><button type="button" aria-label="Mercenario 2" data-merc="1"></button><button type="button" aria-label="Mercenario 3" data-merc="2"></button></div>
        <div class="mcHero pv9Hero">${modelHtml}</div>
        ${slot('Casco', 587,283,null,true)}${slot('Pechera',587,378,null,true)}${slot('Guantes',587,474,null,true)}${slot('Pantalón',587,571,null,true)}${slot('Botas',587,669,null,true)}
        ${slot('Collar',803,254,null,true)}
        ${slot('Arma',1022,283,state.draftFirst || opts.equippedFirst,false,'mcEquipSlot')}${slot('Escudo',1022,377,state.draftSecond || opts.equippedSecond,false,'mcEquipSlot')}${slot('Anillo izquierdo',1022,476,null,true)}${slot('Anillo derecho',1022,573,null,true)}
        <div class="pv9CompareEquipped mcItemImg" aria-label="Objeto equipado">${comparisonSlot(old,'Equipado')}</div>
        <div class="pv9CompareSelected mcItemImg" aria-label="Objeto seleccionado">${comparisonSlot(candidate,'Seleccionado')}</div>
        <div class="pv9ChannelsMask"></div><div class="mcChannels pv9Channels" role="region" aria-label="Canales de comparación">${channels}</div>
        <button class="pv9Target pv9Sheet" data-action="sheet" aria-label="Ficha del mercenario"></button>
        <button class="pv9Target pv9Inventory" data-action="inventory" aria-label="Inventario del mercenario"></button>
        <button class="pv9Target pv9Back" data-action="back" aria-label="Cerrar"></button>
        <button class="pv9Target pv9Inspect" data-action="inspect" aria-label="Inspeccionar" ${candidate?'':'disabled'}></button>
        <button class="pv9Target pv9Equip" data-action="equip" aria-label="Equipar al mercenario" ${canEquip?'':'disabled'}></button>${overlay}
      </div></div>`;
      opts.modal(html,'mercenaryModal mercConceptModal');
      const board = document.querySelector('.pv9Board'); if (!board) return;
      const viewer=board.querySelector('.pv9Viewer'),hero=board.querySelector('.pv9Hero');
      if(opts.modelUrl&&viewer&&hero){
        viewer.addEventListener('load',()=>{if(viewer.loaded)hero.classList.add('pv9ModelReady')},{once:true});
        viewer.addEventListener('error',()=>hero.classList.remove('pv9ModelReady'));
        if(viewer.loaded)hero.classList.add('pv9ModelReady');
      }
      board.querySelectorAll('[data-family]').forEach(el=>{
        const fn=()=>{state.family=el.dataset.family;state.item=null;state.page=0;render();};
        el.addEventListener('click',fn);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});
      });
      board.querySelectorAll('[data-item]').forEach(el=>el.addEventListener('click',()=>{
        const item = itemAt(+el.dataset.item); if (!item) return;
        state.item=item;
        if (state.family==='first') state.draftFirst=item; else state.draftSecond=item;
        opts.onDraft?.(state.family,item); render();
      }));
      board.querySelectorAll('.mcEquipSlot').forEach((el,i)=>el.addEventListener('click',()=>{
        state.family = i===0?'first':'second';state.item=null;render();
      }));
      board.querySelectorAll('[data-merc]').forEach(el=>el.addEventListener('click',()=>{
        const i=+el.dataset.merc; if (i!==opts.candidate) opts.onSelectMercenary?.(i);
      }));
      board.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{
        switch(el.dataset.action){
          case 'sheet': state.modal='sheet';return render();
          case 'inventory': if (typeof opts.onInventory==='function') return opts.onInventory(); state.modal='inventory';return render();
          case 'inspect':if (candidate)state.modal='inspect';return render();
          case 'dismiss':state.modal=null;return render();
          case 'back':return opts.onBack?.();
          case 'equip':if(canEquip)return opts.onConfirm?.(state.draftFirst||opts.equippedFirst,state.draftSecond||opts.equippedSecond);
        }
      }));
    }
    render(); return {refresh:render};
  }
  global.GenesisMercenaryConcept={open, version:'MERCENARY_V09_LIVE_ML06_EQUIPPED'};
})(window);
