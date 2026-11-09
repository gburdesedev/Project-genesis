/* Project Genesis — Fabricaciones modular V1.
   Portable: two standalone files, a single optional adapter hook and two includes.
   This module never mutates recipes, craft formulas, inventory or master UI PNGs. */
(function(g){
 'use strict';
 const VERSION='FAB-MOD-001';
 const ROOT='assets/playcanvas/approved/materials/';
 const ICONS=Object.freeze({
   'Lingote de hierro':ROOT+'iron/v175/iron_v175_transparent.png',
   'Mineral de hierro':ROOT+'iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png',
   'Carbón vegetal':ROOT+'charcoal/v011/carbon_vegetal_v011_poster.png',
   'Madera seca de roble':ROOT+'oak/v004/madera_roble_v004_poster.png',
   'Madera seca de fresno':ROOT+'ash/v004/madera_fresno_v004_poster.png',
   'Cuero bovino curtido':ROOT+'leather_bovine/v003/cuero_bovino_v003_poster.png',
   'Cuero caprino curtido':ROOT+'leather_caprine/v003/cuero_caprino_v003_poster.png',
   'Cordel de cáñamo':ROOT+'hemp/v018/cordel_canamo_v018_poster.jpg',
   'Hilo de lino':ROOT+'linen/v021/hilo_lino_v021_poster.jpg'
 });
 const BASE='assets/ui/approved/Fabricaciones_V07_APROBADA_1672x941.png';
 const FORGE='assets/ui/preparacion/01_Capas/Paneles/FondoVisorHerreria.png';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const xy=(x,y,w,h)=>`left:${(x/1672*100).toFixed(4)}%;top:${(y/941*100).toFixed(4)}%;width:${(w/1672*100).toFixed(4)}%;height:${(h/941*100).toFixed(4)}%`;
 const familyOf=r=>r?.familyLabel||r?.groupLabel||(/escud/i.test(r?.id+' '+r?.subfamily)?'Escudos':/espad/i.test(r?.id+' '+r?.subfamily)?'Espadas':r?.familyName||'Otras recetas');
 const materialGroupOf=r=>r?.materialGroup||r?.materialFamily||(/hierro/i.test(r?.id+' '+r?.subfamily)?'Hierro':'Materiales');
 const imageFor=name=>Object.prototype.hasOwnProperty.call(ICONS,name)?ICONS[name]:null;
 const count=(stock,key)=>Math.max(0,Number(stock?.[key])||0);
 const materialsOf=recipe=>(recipe?.formula?.materials||[]).filter(x=>x&&x.material&&Number(x.qty)>0).map(x=>({name:String(x.material),qty:Number(x.qty)}));
 function catalogOf(ctx){
   const recipes=typeof ctx.getRecipeCatalog==='function'?ctx.getRecipeCatalog():[];
   return Array.isArray(recipes)?recipes.filter(r=>r&&typeof r.id==='string'&&r.formula&&Array.isArray(r.formula.materials)):[];
 }
 function collect(ctx){
   const recipes=catalogOf(ctx);if(!recipes.length)return null;
   const ids=new Set(recipes.map(x=>x.id));
   const questId=ids.has(ctx.activeRecipeId)?ctx.activeRecipeId:null;
   if(ctx.genesisFabricModuleQuest!==ctx.activeRecipeId){
     ctx.genesisFabricModuleQuest=ctx.activeRecipeId;
     ctx.selectedRecipeId=questId||recipes[0].id;
   }
   if(!ids.has(ctx.selectedRecipeId))ctx.selectedRecipeId=questId||recipes[0].id;
   const selected=recipes.find(r=>r.id===ctx.selectedRecipeId)||recipes[0];
   const material=materialsOf(selected);
   const enough=material.length>0&&material.every(m=>count(ctx.inventory,m.name)>=m.qty);
   const allowed=typeof ctx.canCraftRecipe==='function'?ctx.canCraftRecipe(selected.id)===true:ctx.canCraftNow?.()===true;
   const groups=new Map();
   for(const recipe of recipes){
     const family=familyOf(recipe),group=materialGroupOf(recipe);
     if(!groups.has(family))groups.set(family,new Map());
     const byMaterial=groups.get(family);
     if(!byMaterial.has(group))byMaterial.set(group,[]);
     byMaterial.get(group).push(recipe);
   }
   return {recipes,selected,groups,material,enough,allowed,canCraft:enough&&allowed};
 }
 const tab=(key,label,x,w)=>`<button type="button" class="gfmTab" data-gfm-tab="${key}" style="${xy(x,38,w,74)}" aria-label="${label}"></button>`;
 const tabs=()=>tab('Inventario','Inventario',182,317)+tab('Preparacion','Preparación',499,317)+tab('Fabricaciones','Fabricaciones',816,337)+tab('Comparacion','Comparación',1153,303);
 const materialIcon=(name)=>{const path=imageFor(name);return path?`<img src="${esc(path)}" alt="${esc(name)}" loading="eager" draggable="false">`:'<span class="gfmUnknownMaterial" aria-label="Icono no disponible">◇</span>';};
 function menu(data){
   let out='';
   for(const [family,groups] of data.groups){
     const familyIcon=/escud/i.test(family)?'◈':/espad/i.test(family)?'⚔':'⚒';
     out+=`<section class="gfmTreeFamily"><button type="button" class="gfmFamily" data-gfm-family="${esc(family)}" aria-expanded="true"><span>⌄</span><i>${familyIcon}</i><strong>${esc(family)}</strong></button><div class="gfmFamilyChildren">`;
     for(const [metal,recipes] of groups){
       out+=`<div class="gfmMaterialFamily"><span>⌄</span><span>▰</span><strong>${esc(metal)}</strong></div><div class="gfmRecipeChildren">`;
       for(const recipe of recipes){
         const chosen=recipe.id===data.selected.id,icon=/escud/i.test(family)?'◉':'⚔';
         out+=`<button class="gfmRecipe${chosen?' is-current':''}" data-gfm-recipe="${esc(recipe.id)}" type="button" aria-pressed="${chosen}" title="${esc(recipe.subfamily||recipe.name||recipe.id)}"><span class="gfmRecipeIcon">${icon}</span><span>${esc(recipe.subfamily||recipe.name||recipe.id)}</span></button>`;
       }
       out+='</div>';
     }
     out+='</div></section>';
   }
   return out;
 }
 function materialRows(data,ctx){
   if(!data.material.length)return '<p class="gfmEmptyIngredients">Esta receta no tiene materiales registrados.</p>';
   return data.material.map(m=>{
     const stock=count(ctx.inventory,m.name),ok=stock>=m.qty;
     return `<div class="gfmMaterialRow${ok?' available':' missing'}" data-gfm-material="${esc(m.name)}">
       <div class="gfmMaterialIcon">${materialIcon(m.name)}</div>
       <div class="gfmMaterialInfo"><strong>${esc(m.name)}</strong>
         <div><span>Requerido:</span><b>${esc(m.qty)}</b></div>
         <div><span>Stock real:</span><b>${esc(stock)}</b></div>
       </div>
     </div>`;
   }).join('');
 }
 function modelEntry(recipe){
   const entry=g.GenesisApprovedCraftPreviewModels?.[recipe.id];
   // No generic props, ingots, illustrative stand-ins or external URLs.
   if(!entry||entry.approvedForGame!==true||!/^assets\\/playcanvas\\/approved\\/equipment\\/[A-Za-z0-9_./-]+\\.glb$/.test(entry.url||''))return null;
   return entry.url;
 }
 function viewer(recipe){
   const src=modelEntry(recipe);
   if(!src)return '<div class="gfmViewerEmpty" data-model="pending" aria-label="Visor 3D sin modelo aprobado"></div>';
   return `<model-viewer class="gfmViewerModel" src="${esc(src)}" alt="${esc(recipe.subfamily||recipe.name||recipe.id)}" camera-controls auto-rotate interaction-prompt="none" shadow-intensity="0.65" exposure="1.0"></model-viewer>`;
 }
 function render(ctx,nav){
   if(!ctx||typeof ctx.modal!=='function'||!nav)return false;
   const data=collect(ctx);if(!data)return false;
   const title=data.selected.subfamily||data.selected.name||data.selected.id;
   const state=data.canCraft?'✓ Disponible':!data.enough?'Materiales insuficientes':'Receta bloqueada';
   const html=`<div id="genesisApprovedBoard" class="gApprovedBoard gApproved-Fabricaciones gfmBoard" data-screen="Fabricaciones" data-recipe="${esc(data.selected.id)}" data-gfm-version="${VERSION}" data-approved-source="${BASE}" style="background-image:url('${BASE}')">
      ${tabs()}
      <section class="gfmTree" style="${xy(43,120,404,689)}"><header><span>⚒</span> RECETAS DEL HERRERO</header><div class="gfmTreeScroll">${menu(data)}</div></section>
      <section class="gfmViewer" style="${xy(466,118,630,688)}" aria-label="Visor de fabricación">
        <div class="gfmForge" style="background-image:url('${FORGE}')"></div>
        <div class="gfmViewport">${viewer(data.selected)}</div>
        <div class="gfmViewerLabel">Vista del objeto</div>
      </section>
      <section class="gfmDetails" style="${xy(1130,118,466,687)}" aria-label="Detalles de la receta">
        <div class="gfmDetailsHead"><h2>${esc(title)}</h2><p>${data.allowed?'Receta conocida':'Receta bloqueada'}</p></div>
        <div class="gfmMaterialsHeader">MATERIALES REQUERIDOS</div>
        <div class="gfmMaterialsList" data-material-count="${data.material.length}">${materialRows(data,ctx)}</div>
        <div class="gfmStatus"><span>ESTADO</span><strong class="${data.canCraft?'ready':'blocked'}">${state}</strong></div>
        <button type="button" class="gfmCraft" id="gApprovedCraftAction" aria-label="Fabricar ${esc(title)}" ${data.canCraft?'':'disabled'}><span>⚒</span> FABRICAR</button>
      </section>
      <button type="button" class="gfmClose" data-gfm-tab="Cerrar" aria-label="Cerrar menú" style="${xy(1603,0,69,36)}"></button>
   </div>`;
   ctx.modal(html,'preparationModal genesisApprovedModal');
   const board=document.getElementById('genesisApprovedBoard');
   if(!board)return false;
   board.dataset.build='FAB-MOD-001';
   board.querySelectorAll('[data-gfm-recipe]').forEach(el=>el.addEventListener('click',()=>{
     ctx.selectedRecipeId=el.dataset.gfmRecipe;render(ctx,nav);
   }));
   board.querySelectorAll('[data-gfm-family]').forEach(el=>el.addEventListener('click',()=>{
     const expanded=el.getAttribute('aria-expanded')!=='false';
     el.setAttribute('aria-expanded',String(!expanded));
     el.nextElementSibling.hidden=expanded;
   }));
   board.querySelectorAll('[data-gfm-tab]').forEach(el=>el.addEventListener('click',()=>{
     const t=el.dataset.gfmTab;
     if(t==='Cerrar'){nav.close?.();return;}
     if(t==='Fabricaciones')return;
     if(t==='Preparacion'){nav.renderMenu?.();return;}
     nav.renderWorkspace?.(t);
   }));
   const btn=board.querySelector('#gApprovedCraftAction');
   btn?.addEventListener('click',()=>{if(!btn.disabled)nav.craft?.();});
   return true;
 }
 g.GenesisCraftingModule=Object.freeze({version:VERSION,render,catalogOf,collect,materialsOf,imageFor,modelEntry});
})(window);
