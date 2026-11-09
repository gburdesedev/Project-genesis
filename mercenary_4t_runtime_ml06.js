/* PROJECT GENESIS — Mercenario 4-T approved art, ML06 experimental interactive runtime
 * The approved V09 image is never modified. Empty art comes from the existing
 * blank reference; the 3D hero and every fabricated item are real data overlays.
 * Nothing in this module synthesizes stats, owned items or equipment.
 */
(function (global) {
  'use strict';
  // Legacy V09 channel images deliberately excluded: they are not final approved ORAs.
  const ART = 'assets/ui/mercenary/4t/';
  const CHANNELS = ['Base','Luz','Sombra','Fuego','Hielo','Naturaleza','Tierra','Rayo'];
  // V3.2 originals recovered from the real Resultado de Creaciones branch.
  // Paths and PNG checksums are retained in assets/ui/resultado/oras/manifest.sha256.json.
  const ORA = Object.freeze({
    Base:'01_Base.png',Luz:'02_Luz.png',Sombra:'03_Sombra.png',
    Fuego:'04_Fuego.png',Hielo:'05_Hielo.png',Naturaleza:'06_Naturaleza.png',
    Tierra:'07_Tierra.png',Rayo:'08_Rayo.png'
  });
  const ORA_ROOT='assets/ui/resultado/oras/';
  const COLOR = Object.freeze({Base:'#b7c2ca',Luz:'#ffffff',Sombra:'#8b5cf6',Fuego:'#ff3b30',Hielo:'#67d9ff',Naturaleza:'#69c66a',Tierra:'#8b5a2b',Rayo:'#1f3f8f'});
  function dominant(item) {
    const elements=readChannels(item).filter(c=>c.name!=='Base'&&COLOR[c.name]&&c.value>0).sort((a,b)=>b.value-a.value);
    const a=elements[0], b=elements[1];
    return {first:a?.name||'Base',color:COLOR[a?.name]||COLOR.Base,
      second:b?.name||null, color2:COLOR[b?.name]||COLOR[a?.name]||COLOR.Base,
      // Canal Base has a neutral steel halo, not an invented elemental affinity.
      strength:a?Math.max(.24,Math.min(1,a.value/100)):.30};
  }
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
    const pools = { first:opts.poolFirst || [], second:opts.poolSecond || [] };
    function sameItem(a,b){
      return !!(a&&b&&(a===b||(a.id!=null&&b.id!=null&&String(a.id)===String(b.id))));
    }
    const equippedByFamily = family=>family==='first'?opts.equippedFirst:opts.equippedSecond;
    const eligible=(family,item)=>!!item&&!sameItem(item,equippedByFamily(family));
    const alternative=(family,preferred)=>eligible(family,preferred)?preferred:
      pools[family].find(item=>eligible(family,item))||null;
    const state = { family:'first', item:null, page:0, modal:null,
      draftFirst:alternative('first',opts.selectedFirst),
      draftSecond:alternative('second',opts.selectedSecond) };
    const body = opts.body === 'ranger' ? 'rangerMale086/src/male_ranger.glb' : 'peasantMale086/src/male_peasant.glb';
    const defaultBodyUrl = './assets/vendor/genesis/externals/' + body;
    const model = opts.modelUrl || global.GenesisPreflight?.modelUrl(defaultBodyUrl) || defaultBodyUrl;
    function getIcon(item) {
      if (!item) return '';
      const url=item.recipe==='espada_hierro'
        ? ART+'V12B_REAL_SWORD_ICON_RGBA.png'
        : item.recipe==='escudo_hierro' ? ART+'V015_REAL_SHIELD_ICON_RGBA.png'
        : (typeof opts.itemIcon==='function' ? opts.itemIcon(item.recipe) : '');
      if(typeof url!=='string'||!url.trim())return '';
      const fx=dominant(item), glow=fx.strength;
      return `<span class="pg4tItemVisual" data-recipe="${esc(item.recipe||'')}" data-affinity="${esc(fx.first)}" data-secondary="${esc(fx.second||'')}" style="--fx-color:${fx.color};--fx-color-2:${fx.color2};--fx-strength:${glow.toFixed(2)}"><span class="pg4tIconFit"><img src="${esc(url)}" alt="${esc(item.recipe||'Objeto')}" draggable="false"></span></span>`;
    }
    function pool() { return pools[state.family]; }
    function selected() {
      const candidate=state.item||(state.family==='first'?state.draftFirst:state.draftSecond);
      return eligible(state.family,candidate)?candidate:null;
    }
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
      const family = state.family;
      const canEquip=!!candidate&&!sameItem(candidate,old)&&
        (opts.singleSlotEquip ? !!(opts.equippedFirst&&opts.equippedSecond)
          : opts.editing ? !!(state.draftFirst||opts.equippedFirst)&&!!(state.draftSecond||opts.equippedSecond)
          : !!state.draftFirst&&!!state.draftSecond);
      const grid = Array.from({length:20}, (_,i) => {
        const item=itemAt(i),isEquipped=sameItem(item,old);
        return `<button type="button" class="mcInventorySlot ${item?'hasItem':''} ${isEquipped?'pg4tAlreadyEquipped':''} ${item&&sameItem(item,candidate)?'selected':''}" data-item="${i}" data-item-id="${esc(item?.id||'')}" aria-label="${esc(isEquipped?'Equipado: '+item.name:(item?.name||'Casilla vacía'))}" title="${esc(isEquipped?'Ya equipado · '+item.name:(item?.name||''))}" ${(!item||isEquipped)?'disabled':''}>${getIcon(item)}</button>`;
      }).join('');
      const poster=opts.modelUrl ? `<img class="pv9RealCyclesPoster" src="${ART}V050_REAL_CYCLES32_CHARACTER_RGBA.png" alt="Render Cycles EXR32 del mercenario real V050 con espada V175/V12B y escudo V015 proporcionado">` : '';
      // The modal defaults to the real Cycles V050 poster until WebGL is activated.
      // Mirror the NGE equipped halos in that poster; live world 3D lights are handled
      // by applyV050EquippedHalos in index.html. Not a replacement for GLB/VFX assets.
      const heroHalo=(item,kind)=>{
        if(!item)return '';
        const fx=dominant(item);
        // Show the same current equipped NGE affinity in the Cycles-poster fallback.
        // This 2D cue animates the *preview only*. The actual PlayCanvas shader
        // runs on the live V050 GLB through mercenary_channel_vfx_ml11.mjs.
        const animated=readChannels(item).filter(c=>['Fuego','Hielo','Rayo'].includes(c.name)&&c.value>0)
          .sort((a,b)=>b.value-a.value)[0]||null;
        const name=animated?.name||fx.first;
        const power=animated?Math.max(.02,Math.min(1,animated.value/100)):fx.strength;
        const mode=animated?'pg4tHeroAnimatedChannel':'pg4tHeroEquippedHalo';
        return `<span class="${mode} pg4tHeroHalo-${kind}" data-equipment-halo="${kind}" data-affinity="${esc(name)}" data-vfx-preview="${animated?'animated-reference':'fallback'}" style="--fx-color:${COLOR[name]||fx.color};--fx-color-2:${fx.color2};--fx-strength:${power.toFixed(2)}" aria-hidden="true"></span>`;
      };
      const modelHtml = poster + `<model-viewer data-asset-src="${esc(model)}" camera-controls interaction-prompt="none" loading="lazy" camera-orbit="15deg 80deg 5.1m" exposure="1.25" shadow-intensity=".32" alt="GLB real V050: espada V12B y escudo V015" class="pv9Viewer"></model-viewer>`+
        heroHalo(opts.equippedFirst,'sword')+heroHalo(opts.equippedSecond,'shield');
      const channels = rows.map(row => {
        const known=CHANNELS.includes(row.name);
        const delta = row.a && row.b ? row.b.value-row.a.value : null;
        const value=v=>v? (row.name==='Base'?String(v.value):'+'+v.value+'%') : '—';
        const src=ORA[row.name];
        return `<div class="mcChannel" data-channel="${esc(row.name)}" style="--fx-color:${COLOR[row.name]||COLOR.Base}"><span class="pv9ChannelArtwork pg4tChannelApproved">${src?`<img data-approved-ora="${esc(row.name)}" src="${ORA_ROOT+src}" alt="${esc(row.name)}" decoding="async">`:`<span class="pg4tOraMissing" role="status">Canal no reconocido</span>`}</span><span class="mcChannelNum">${value(row.a)}</span><span class="mcChannelNum ${delta===null?'':delta>0?'increase':delta<0?'decrease':'same'}">${value(row.b)}</span></div>`;
      }).join('');
      const overlay = state.modal === 'sheet' ? `<div class="mcOverlay"><section><h2>FICHA DEL MERCENARIO</h2>${typeof opts.getStatsHTML==='function'?opts.getStatsHTML(state.draftFirst,state.draftSecond):opts.statsHTML || '<p>Sin datos registrados.</p>'}<button data-action="dismiss">VOLVER</button></section></div>` :
        state.modal === 'inventory' ? `<div class="mcOverlay"><section><h2>INVENTARIO DEL MERCENARIO</h2>${typeof opts.getMercInventoryHTML==='function'?opts.getMercInventoryHTML(state.draftFirst,state.draftSecond):'<p>Sin objetos asignados.</p>'}<button data-action="dismiss">VOLVER</button></section></div>` :
        state.modal === 'inspect' && candidate ? `<div class="mcOverlay"><section><h2>${esc(candidate.name)}</h2><p>${esc(candidate.rarity)}</p>${readChannels(candidate).map(c=>`<p>${esc(c.name)}: ${c.value}</p>`).join('')}<button data-action="dismiss">VOLVER</button></section></div>` : '';
      const html = `<div class="mercConcept pv9Shell pg4tShell"><div class="mcBoard pv9Board" aria-label="Inventario del Mercenario · 4-T original aprobado">
        <div class="pv9Target pv9FamilyEspadas ${family==='first'?'on':''}" data-family="first" role="button" tabindex="0" aria-label="Espadas"></div>
        <div class="pv9Target pv9FamilyEscudos ${family==='second'?'on':''}" data-family="second" role="button" tabindex="0" aria-label="Escudos"></div>
        <div class="mcInventoryGrid pv9Grid">${grid}</div>
        <div class="mcMercIDs pv9MercIDs"><button type="button" aria-label="Mercenario 1" data-merc="0"></button><button type="button" aria-label="Mercenario 2" data-merc="1"></button><button type="button" aria-label="Mercenario 3" data-merc="2"></button></div>
        <div class="mcHero pv9Hero">${modelHtml}</div>
        ${slot('Casco', 587,283,null,true)}${slot('Pechera',587,378,null,true)}${slot('Guantes',587,474,null,true)}${slot('Pantalón',587,571,null,true)}${slot('Botas',587,669,null,true)}
        ${slot('Collar',803,254,null,true)}
        ${slot('Arma',980,283,opts.equippedFirst||state.draftFirst,false,'mcEquipSlot')}${slot('Escudo',980,377,opts.equippedSecond||state.draftSecond,false,'mcEquipSlot')}${slot('Anillo izquierdo',1022,476,null,true)}${slot('Anillo derecho',1022,573,null,true)}
        <div class="pv9CompareEquipped mcItemImg" aria-label="Objeto equipado">${comparisonSlot(old,'Equipado')}</div>
        <div class="pv9CompareSelected mcItemImg" aria-label="Objeto seleccionado">${comparisonSlot(candidate,'Seleccionado')}</div>
        <div class="pv9ChannelsMask"></div><div class="mcChannels pv9Channels" role="region" aria-label="Canales de comparación">${channels}</div>
        <button class="pv9Target pv9Sheet" data-action="sheet" aria-label="Ficha del mercenario"></button>
        <button class="pv9Target pv9Inventory" data-action="inventory" aria-label="Inventario del mercenario"></button>
        <button class="pv9Target pv9Back" data-action="back" aria-label="Cerrar"></button>
        <button class="pv9Target pv9Inspect" data-action="inspect" aria-label="Inspeccionar" ${candidate?'':'disabled'}></button>
        <button class="pv9Target pv9Equip" data-action="equip" aria-label="Equipar al mercenario" ${canEquip?'':'disabled'}></button>${overlay}
      </div></div>`;
      // Reuse the full genuine 3D viewer across slot/family selection renders.
      // Never re-download the 27MB V050 model just because a NGE item is compared.
      const existingViewer=document.querySelector('.mercConcept .pv9Viewer');
      opts.modal(html,'mercenaryModal mercConceptModal');
      const board=document.querySelector('.pv9Board');if(!board)return;
      // Never reintroduce temporary V09 channel art. A missing approved PNG is a
      // diagnostic failure, rather than a green/yellow substitute invented in CSS.
      board.querySelectorAll('img[data-approved-ora]').forEach(ora=>{
        ora.addEventListener('error',()=>{ora.closest('.mcChannel')?.classList.add('pg4tOraLoadError');},{once:true});
        if(ora.complete&&!ora.naturalWidth)ora.closest('.mcChannel')?.classList.add('pg4tOraLoadError');
      });
      const placeholder=board.querySelector('.pv9Viewer');
      if(existingViewer&&placeholder&&existingViewer.getAttribute('data-asset-src')===placeholder.getAttribute('data-asset-src')){
        placeholder.replaceWith(existingViewer);
      }
      const viewer=board.querySelector('.pv9Viewer'),hero=board.querySelector('.pv9Hero');
      if(opts.modelUrl&&viewer&&hero){
        // The world uses the genuine 27MB GLB on Equipar. In the modal, load the
        // separate WebGL viewer only when the user clicks the character.
        // This prevents two simultaneous expensive WebGL contexts during boot.
        hero.setAttribute('title','Clic para girar el mercenario 3D real V050');
        const activate3d=()=>{const asset=viewer.getAttribute('data-asset-src');if(asset&&!viewer.getAttribute('src'))viewer.setAttribute('src',asset);};
        hero.addEventListener('click',activate3d,{once:true});
        viewer.addEventListener('load',()=>{if(viewer.loaded&&viewer.modelIsVisible)hero.classList.add('pv9ModelReady')},{once:true});
        viewer.addEventListener('error',()=>hero.classList.remove('pv9ModelReady'));
        if(viewer.loaded&&viewer.modelIsVisible)hero.classList.add('pv9ModelReady');
      }
      board.querySelectorAll('[data-family]').forEach(el=>{
        const fn=()=>{state.family=el.dataset.family;state.item=null;state.page=0;render();};
        el.addEventListener('click',fn);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fn();}});
      });
      board.querySelectorAll('[data-item]').forEach(el=>el.addEventListener('click',()=>{
        const item = itemAt(+el.dataset.item);
        if(!eligible(state.family,item))return; // equipped items may be viewed, never compared with themselves
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
          case 'equip':
            if(!canEquip)return;
            if(opts.singleSlotEquip){
              // Only the actively compared item is replaced. Never silently replace both slots.
              return opts.onConfirm?.(family==='first'?candidate:opts.equippedFirst,
                family==='second'?candidate:opts.equippedSecond);
            }
            return opts.onConfirm?.(state.draftFirst||opts.equippedFirst,
              state.draftSecond||opts.equippedSecond);
        }
      }));
    }
    render(); return {refresh:render};
  }
  global.GenesisMercenaryConcept={open, version:'MERCENARY_APPROVED_4T_ML06_LIVE_EXPERIMENT'};
})(window);
