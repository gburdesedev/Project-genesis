/* Project Genesis — Resultado de Fabricación V014.029
 * ESTADO: MODIFICACION VISUAL APROBADA, NO VERSION DEL JUEGO APROBADA.
 * Source: release/v014029-historic-crafting-result-20261108.
 * Pure, opt-in HTML renderer; no event binding, loading, storage or main mutation.
 * Keep the approved visual markup and actual game-provided channel values.
 */
(function initGenesisCraftResultV014029(root){
 'use strict';
function render(item, adapters) {
 if (!item || !adapters) throw new TypeError('V014.029 requires an actual fabricated item and explicit game adapters');
 const required=['recipes','itemVisual','formulaWeightBreakdown','recipeKind','metricForChannel','itemAssetMarkup','AFFINITY_VISUAL','esc'];
 for (const key of required) if (!(key in adapters)) throw new Error('V014.029 missing adapter: '+key);
 const {recipes,itemVisual,formulaWeightBreakdown,recipeKind,metricForChannel,itemAssetMarkup,AFFINITY_VISUAL,esc}=adapters;
 const rec=recipes[item.recipe];
 if (!rec) throw new Error('V014.029 unknown recipe: '+item.recipe);
 const visual=itemVisual(item);
 const parts=formulaWeightBreakdown(item.formula);
 const channels=(item.channels||[]).map((c,i)=>{
  const m=metricForChannel(item,c,i);
  const color=i===0?AFFINITY_VISUAL.Base:(AFFINITY_VISUAL[c[0]]||AFFINITY_VISUAL.Base);
  const pct=Math.max(0,Math.min(100,Number(c[1])||0));
  return `<div class="genesisHistoricChannel" style="--channel:${color}"><span class="genesisHistoricChannelName">${esc(m.label)}</span><span class="genesisHistoricChannelMeter"><i style="width:${pct}%"></i></span><strong>${esc(m.display)}</strong></div>`;
 }).join('');
 const ingredientRows=parts.map(p=>`<div class="genesisHistoricMaterial"><span>${esc(p.material)}</span><strong>${p.qty} ×</strong></div>`).join('');
 const itemArt=itemAssetMarkup(item);
 return `<section class="genesisHistoricResult" data-result-art="historic-creation-v014029" data-approved-sword="V03-V175-V12B" style="--creation-halo:${visual.c1}">
  <header class="genesisHistoricTitle"><span>PROJECT GENESIS</span><div><strong>RESULTADO DE FABRICACIÓN</strong><small>Ficha completa del objeto</small></div></header>
  <div class="genesisHistoricColumns">
   <aside class="genesisHistoricLeft">
    <div class="genesisHistoricPanel"><h3>IDENTIDAD DEL OBJETO</h3><h4>${esc(rec.name)}</h4>
     <dl><dt>Familia</dt><dd>${esc(recipeKind(item.recipe))}</dd>
       <dt>Rareza</dt><dd>${esc(item.rarity)}</dd>
       <dt>Fabricado por</dt><dd>${esc(rec.profession)}</dd></dl></div>
    <div class="genesisHistoricPanel genesisHistoricIngredients"><h3>MATERIALES UTILIZADOS</h3>${ingredientRows}</div>
    <div class="genesisHistoricPanel genesisHistoricLog"><h3>HISTORIAL</h3><p>Creación registrada</p><small>El objeto ha sido fabricado correctamente.</small></div>
   </aside>
   <div class="genesisHistoricView"><div class="genesisHistoricAura" aria-hidden="true"></div>
    <div class="genesisHistoricObject" aria-label="Vista de la espada aprobada">${itemArt}</div>
    <div class="genesisHistoricViewerNote">${esc(visual.label)} · ${item.recipe==='espada_hierro'?'Render auténtico V175/V12B · HDRI EXR 32 bits':'Vista del objeto'}</div>
   </div>
   <aside class="genesisHistoricRight">
    <div class="genesisHistoricPanel genesisHistoricChannelPanel"><h3>CANALES DEL OBJETO</h3>
      <p class="genesisHistoricMuted">Valores obtenidos en esta fabricación</p>${channels||'<p>Sin canales calculados.</p>'}</div>
    <div class="genesisHistoricPanel genesisHistoricSummary"><h3>RESULTADO</h3>
      <dl><dt>Rareza obtenida</dt><dd>${esc(item.rarity)}</dd>
      <dt>Canales obtenidos</dt><dd>${(item.channels||[]).length}</dd></dl>
    </div>
   </aside>
  </div>
 </section>`;
}
 const api=Object.freeze({id:'resultado-fabricacion-v014029',status:'visual-approved-module-only',render});
 root.GenesisCraftResultV014029=api;
 if(typeof module!=='undefined'&&module.exports) module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
