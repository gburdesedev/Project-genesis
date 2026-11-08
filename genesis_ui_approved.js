/* Project Genesis UI 2026-11-08: runtime-only overlays over the immutable approved 1672x941 artwork. */
(function(){
 'use strict';
 const ROOT='assets/ui/approved/';
 const ARTS=Object.freeze({Inventario:ROOT+'Inventario_V11_APROBADO_1672x941.png',Preparacion:ROOT+'Preparacion_APROBADA_1672x941.png',Fabricaciones:ROOT+'Fabricaciones_V07_APROBADA_1672x941.png'});
 const MATERIALS=Object.freeze({
  'Mineral de hierro':['assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png','assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_55k_pbr1536_v007.glb'],
  'Lingote de hierro':['assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png',null],
  'Carbón vegetal':['assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_poster.png','assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_final_3_piezas_web.glb'],
  'Madera seca de roble':['assets/playcanvas/approved/materials/oak/v004/madera_roble_v004_poster.png',null],
  'Madera seca de fresno':['assets/playcanvas/approved/materials/ash/v004/madera_fresno_v004_poster.png',null],
  'Cuero bovino curtido':['assets/playcanvas/approved/materials/leather_bovine/v003/cuero_bovino_v003_poster.png',null],
  'Cuero caprino curtido':['assets/playcanvas/approved/materials/leather_caprine/v003/cuero_caprino_v003_poster.png',null],
  'Cordel de cáñamo':['assets/playcanvas/approved/materials/hemp/v018/cordel_canamo_v018_poster.jpg','assets/playcanvas/approved/materials/cordel_canamo/v018/cordel_canamo_v018.glb'],
  'Hilo de lino':['assets/playcanvas/approved/materials/linen/v021/hilo_lino_v021_poster.jpg','assets/playcanvas/approved/materials/hilo_lino/v021/hilo_lino_v021.glb']
 });
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pos=(x,y,w,h)=>`left:${(100*x/1672).toFixed(4)}%;top:${(100*y/941).toFixed(4)}%;width:${(100*w/1672).toFixed(4)}%;height:${(100*h/941).toFixed(4)}%`;
 const hit=(name,x,y,w,h,attrs='')=>`<button type="button" class="gApprovedHit" data-go="${esc(name)}" aria-label="${esc(name)}" ${attrs} style="${pos(x,y,w,h)}"></button>`;
 const tabs=()=>[
   hit('Inventario',182,38,317,76),hit('Preparacion',499,38,317,76),
   hit('Fabricaciones',816,38,337,76),hit('Comparacion',1153,38,303,76)
 ].join('');
 function materialVisual(name,hero){
   const [poster,glb]=MATERIALS[name]||[];
   if(hero&&glb&&!window.GenesisDevice?.safePreviews&&window.customElements?.get('model-viewer')){
     return `<model-viewer class="gApprovedModel" src="${esc(glb)}" ${poster?'poster="'+esc(poster)+'"':''} camera-controls interaction-prompt="none" auto-rotate rotation-per-second="15deg" shadow-intensity="0" environment-image="neutral" exposure="1.2" alt="${esc(name)}"></model-viewer>`;
   }
   return poster?`<img src="${esc(poster)}" alt="${esc(name)}" draggable="false">`:`<span class="gApprovedNoModel">${esc(name)}</span>`;
 }
 function itemFamily(item){const raw=String(item?.family||item?.recipeFamily||item?.recipe||'').toLowerCase();return /escud/.test(raw)?'Escudos':/espad/.test(raw)?'Espadas':'Creaciones'}
 function entryView(e,ctx,hero){
   if(e.material)return materialVisual(e.name,hero);
   return hero?(typeof ctx.renderAsset==='function'?ctx.renderAsset(e.item):''):
     (e.item?.thumbnail||e.item?.poster?`<img src="${esc(e.item.thumbnail||e.item.poster)}" alt="${esc(e.name)}">`:
       '<span class="gApprovedItemGlyph">✦</span>');
 }
 function mount(tab,ctx,nav,body,attrs=''){
   const html=`<div id="genesisApprovedBoard" class="gApprovedBoard gApproved-${tab}" data-screen="${tab}" data-approved-source="${esc(ARTS[tab])}" ${attrs} style="background-image:url('${ARTS[tab]}')">${tabs()}${body}${hit('Cerrar',1603,0,69,36)}</div>`;
   ctx.modal(html,'preparationModal genesisApprovedModal');
   const board=document.getElementById('genesisApprovedBoard');if(!board)return null;
   board.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{
     const tab=b.dataset.go;
     if(tab==='Cerrar'){nav.close();return}
     if(tab==='Preparacion')nav.renderMenu();else if(tab==='Comparacion')nav.renderWorkspace('Comparacion');else nav.renderWorkspace(tab);
   });
   return board;
 }
 function inventory(ctx,nav){
   const stock=Object.entries(ctx.inventory||{}).filter(([,qty])=>Number(qty)>0);
   const creations=typeof ctx.getItems==='function'?(ctx.getItems()||[]).filter(Boolean):[];
   const state=ctx.genesisApprovedInventory||(ctx.genesisApprovedInventory={family:'Materiales',page:0,selected:null,sheet:false});
   const families=['Materiales','Espadas','Escudos'];
   if(!families.includes(state.family))state.family='Materiales';
   const entries=state.family==='Materiales'?stock.map(([name,qty])=>({key:'m:'+name,name,qty:Number(qty),material:true})):
     creations.filter(item=>itemFamily(item)===state.family).map((item,i)=>({key:'c:'+String(item.id||i),name:item.name,material:false,item}));
   const maxPage=Math.max(0,Math.ceil(entries.length/20)-1);state.page=Math.min(state.page,maxPage);
   const page=entries.slice(state.page*20,state.page*20+20);
   if(!page.some(e=>e.key===state.selected))state.selected=page[0]?.key||null;
   const chosen=page.find(e=>e.key===state.selected)||null;
   const familyButtons=families.map((f,i)=>`<button type="button" class="gApprovedFamily ${f===state.family?'is-selected':''}" data-family="${f}" aria-pressed="${f===state.family}" style="${pos(54,229+45*i,288,45)}" aria-label="Filtrar ${f}"></button>`).join('');
   const slots=Array.from({length:20},(_,i)=>{
     const e=page[i],x=404+(i%10)*122.0,y=589+Math.floor(i/10)*126;
     return `<button type="button" class="gApprovedSlot ${e?.key===state.selected?'is-selected':''}" style="${pos(x,y,107,109)}" ${e?'data-slot="'+i+'" aria-label="'+esc(e.name)+'"':'disabled aria-label="Casilla vacía"'}>${e?`<span class="gApprovedSlotAsset">${entryView(e,ctx,false)}</span><span class="gApprovedQty">${esc(e.material?e.qty:e.item?.rarity||'')}</span>`:''}</button>`;
   }).join('');
   const info=chosen?`<div class="gApprovedInfoValues" style="${pos(1305,208,260,88)}"><span>${esc(chosen.name)}</span><span>${esc(chosen.material?'Materiales':state.family)}</span><span>${esc(chosen.material?'—':chosen.item?.rarity||'—')}</span></div>`:'';
   const hero=chosen?`<div class="gApprovedHero" style="${pos(425,206,610,245)}">${entryView(chosen,ctx,true)}</div>`:'';
   const sheet=state.sheet&&chosen&&!chosen.material?`<section class="gApprovedSheet" aria-label="Ficha del objeto"><button class="gApprovedSheetClose" id="gApprovedSheetClose">×</button><h2>${esc(chosen.name)}</h2><p>${esc(chosen.item?.rarity||'')}</p><h3>Canales del objeto</h3>${(chosen.item?.channels||[]).map((c,i)=>{const metric=ctx.metricForChannel?.(chosen.item,c,i);return `<div><span>${esc(metric?.label||c[0])}</span><b>${esc(metric?.display??c[1])}</b></div>`}).join('')}<h3>Materiales utilizados</h3>${(chosen.item?.formula?.materials||[]).map(m=>`<div><span>${esc(m.material)}</span><b>${Number(m.qty)||0}×</b></div>`).join('')}</section>`:'';
   const body=familyButtons+slots+hero+info+
     `<button type="button" class="gApprovedInfoButton" id="gApprovedInfoButton" aria-label="Consultar ficha del objeto" style="${pos(1170,437,410,57)}" ${chosen&&!chosen.material?'':'disabled'}></button>`+
     `<button type="button" class="gApprovedPagePrev" id="gApprovedPagePrev" style="${pos(1482,845,45,25)}" ${state.page===0?'disabled':''} aria-label="Página anterior">‹</button>`+
     `<button type="button" class="gApprovedPageNext" id="gApprovedPageNext" style="${pos(1535,845,45,25)}" ${state.page===maxPage?'disabled':''} aria-label="Página siguiente">›</button>`+sheet;
   const board=mount('Inventario',ctx,nav,body,`data-family="${esc(state.family)}"`);if(!board)return;
   board.querySelectorAll('[data-family]').forEach(b=>b.onclick=()=>{state.family=b.dataset.family;state.page=0;state.selected=null;state.sheet=false;inventory(ctx,nav)});
   board.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{state.selected=page[Number(b.dataset.slot)]?.key||null;state.sheet=false;inventory(ctx,nav)});
   const details=board.querySelector('#gApprovedInfoButton');if(details)details.onclick=()=>{state.sheet=true;inventory(ctx,nav)};
   const sheetClose=board.querySelector('#gApprovedSheetClose');if(sheetClose)sheetClose.onclick=()=>{state.sheet=false;inventory(ctx,nav)};
   board.querySelector('#gApprovedPagePrev').onclick=()=>{state.page--;state.selected=null;inventory(ctx,nav)};
   board.querySelector('#gApprovedPageNext').onclick=()=>{state.page++;state.selected=null;inventory(ctx,nav)};
 }
 function preparation(ctx,nav){
   const stock=Object.entries(ctx.inventory||{}).filter(([,q])=>Number(q)>0);
   const basic=stock.filter(([name])=>!/^(Lingote|Material preparado|Material tratado)/i.test(name)).slice(0,10);
   const treated=stock.filter(([name])=>/^(Lingote|Material preparado|Material tratado)/i.test(name)).slice(0,10);
   const slots=[...basic,...Array(Math.max(0,10-basic.length)).fill(null),...treated,...Array(Math.max(0,10-treated.length)).fill(null)];
   const body=slots.map((entry,i)=>{
     const x=38+(i%5)*105,y=(i<10?249:588)+(Math.floor(i%10/5))*103;
     return entry?`<button type="button" class="gApprovedPrepSlot" data-stock="${esc(entry[0])}" style="${pos(x,y,90,88)}" aria-label="${esc(entry[0])}">${materialVisual(entry[0],false)}<b>${Number(entry[1])}</b></button>`:'';
   }).join('')+`<div class="gApprovedPrepData" style="${pos(1245,203,340,487)}"><h3>Preparación de hierro</h3><p>Mineral disponible: <b>${Number(ctx.inventory?.['Mineral de hierro']||0)}</b></p><p>Lingotes: <b>${Number(ctx.inventory?.['Lingote de hierro']||0)}</b></p><div class="gApprovedPrepQty"><button id="gPrepMinus" aria-label="Reducir cantidad">−</button><strong>${ctx.count||0}</strong><button id="gPrepPlus" aria-label="Aumentar cantidad">+</button></div><p>Elegí la cantidad para la tanda. La preparación no modifica la rareza.</p></div>`+
     `<button type="button" class="gApprovedPrepAction" id="gPrepAction" style="${pos(1244,714,357,96)}" aria-label="Preparar" ${Number(ctx.inventory?.['Mineral de hierro']||0)>0?'':'disabled'}></button>`;
   const board=mount('Preparacion',ctx,nav,body);if(!board)return;
   const raw=Number(ctx.inventory?.['Mineral de hierro']||0);
   board.querySelector('#gPrepMinus').onclick=()=>{ctx.count=Math.max(1,(ctx.count||1)-1);preparation(ctx,nav)};
   board.querySelector('#gPrepPlus').onclick=()=>{ctx.count=Math.min(raw,(ctx.count||0)+1);preparation(ctx,nav)};
   board.querySelector('#gPrepAction').onclick=nav.start;
   board.querySelectorAll('[data-stock]').forEach(b=>b.onclick=()=>{ctx.selectedMaterial=b.dataset.stock;ctx.genesisApprovedInventory={family:'Materiales',page:0,selected:'m:'+b.dataset.stock,sheet:false};nav.renderWorkspace('Inventario')});
 }
 function fabrications(ctx,nav){
   const catalog=typeof ctx.getRecipeCatalog==='function'?(ctx.getRecipeCatalog()||[]):[];
   const recipes=catalog.filter(r=>r&&r.id&&r.formula);
   const ids=new Set(recipes.map(r=>String(r.id)));
   if(!ids.has(String(ctx.selectedRecipeId)))ctx.selectedRecipeId=recipes.find(r=>String(r.id)===String(ctx.activeRecipeId))?.id||recipes[0]?.id||null;
   const chosen=recipes.find(r=>String(r.id)===String(ctx.selectedRecipeId))||null;
   const formula=chosen?.formula||ctx.formula;
   const req=formula?.materials||[];
   const ready=req.length>0&&req.every(r=>Number(ctx.inventory?.[r.material]||0)>=Number(r.qty||0));
   // Port the tested demo recipe/quest guard without changing the approved artboard.
   const questLocked=r=>!!r&&(r.questLocked===true||r.lockedByQuest===true||ctx.isRecipeQuestLocked?.(r.id)===true);
   const recipeReady=r=>!!r?.formula?.materials?.length&&r.formula.materials.every(m=>Number(ctx.inventory?.[m.material]||0)>=Number(m.qty||0));
   const canCraft=chosen?(ctx.canCraftRecipe?.(chosen.id)===true&&!questLocked(chosen)):ctx.canCraftNow?.()===true;
   const isShield=/escud/i.test(String(chosen?.id||chosen?.subfamily||''));
   const isSword=/espad/i.test(String(chosen?.id||chosen?.subfamily||''));
   const chosenName=chosen?.subfamily||ctx.recipeName||'Sin receta';
   const recipeButtons=recipes.map((r,i)=>{
     const isS=/escud/i.test(String(r.id)+' '+String(r.subfamily));
     const locked=questLocked(r)||ctx.canCraftRecipe?.(r.id)!==true||!recipeReady(r);
     return `<button type="button" class="gApprovedRecipe ${String(ctx.selectedRecipeId)===String(r.id)?'is-selected':''}" data-recipe="${esc(r.id)}" data-locked="${locked}" ${locked?'disabled aria-disabled="true" title="Receta bloqueada o sin materiales"':''} style="${pos(93,isS?465:289,336,53)}" aria-label="Seleccionar ${esc(r.subfamily)}"></button>`;
   }).join('');
   // Dos espacios de receta: cubrir también el segundo renglón horneado cuando la fórmula usa un solo material.
   const rows=Array.from({length:2},(_,i)=>{
     const r=req[i];
     if(!r)return `<div class="gApprovedRequired" style="${pos(1261,300+i*143,350,115)}"></div>`;
     const qty=Number(ctx.inventory?.[r.material]||0),needed=Number(r.qty||0);
     return `<div class="gApprovedRequired" style="${pos(1261,300+i*143,350,115)}"><h3>${esc(r.material)}</h3><p>Requerido: <b>${needed}</b></p><p>Stock real: <b>${qty}</b></p></div>`;
   }).join('');
   const state=`<div class="gApprovedCraftState ${ready&&canCraft?'is-ready':'is-blocked'}" style="${pos(1290,610,292,51)}">${questLocked(chosen)?'Bloqueada por misión':ready&&canCraft?'✓ Disponible':ready?'Receta todavía bloqueada':'Faltan materiales'}</div>`;
   const hero=isShield?`<div class="gApprovedRecipeHeroSwap" style="${pos(456,114,643,706)}">${ctx.recipeAsset?.(chosen?.id)||''}<span>${esc(chosenName)}</span></div>`:'';
   const title=isShield?`<div class="gApprovedRecipeTitle" style="${pos(1153,120,432,85)}"><h2>${esc(chosenName)}</h2><p>Receta conocida</p></div>`:'';
   const body=recipeButtons+rows+state+hero+title+
     `<button type="button" class="gApprovedCraftAction" id="gApprovedCraftAction" style="${pos(1148,672,435,100)}" aria-label="Fabricar ${esc(chosenName)}" ${ready&&canCraft?'':'disabled'}></button>`;
   const board=mount('Fabricaciones',ctx,nav,body,`data-recipe="${esc(chosen?.id||'')}"`);if(!board)return;
   board.querySelectorAll('[data-recipe]').forEach(b=>b.onclick=()=>{ctx.selectedRecipeId=b.dataset.recipe;fabrications(ctx,nav)});
   board.querySelector('#gApprovedCraftAction').onclick=nav.craft;
 }
 function render(ctx,nav,tab){
   if(!ctx||!nav)return false;
   if(tab==='Inventario')inventory(ctx,nav);
   else if(tab==='Preparacion')preparation(ctx,nav);
   else if(tab==='Fabricaciones')fabrications(ctx,nav);
   else return false;
   return true;
 }
 window.GenesisApprovedUI=Object.freeze({render,ARTS});
})();
