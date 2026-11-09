/* Project Genesis — isolated Fabricaciones renderer, V001. No changes to NGE fabrication logic.
 * The art source is the existing V07, with runtime image regions surgically separated in the
 * *experimental branch* by scripts/ui/build_clean_fabricaciones.py. The original remains immutable.
 */
(function(g){
 'use strict';
 const VERSION='fabricaciones-module-v001';
 const ROOT='assets/ui/fabricaciones/module_v001/';
 const BACKGROUND=ROOT+'fabricaciones_estructura_limpia_v001.png';
 const FRAME={
   family:ROOT+'frame_familia_v001.png',
   material:ROOT+'frame_material_v001.png',
   choice:ROOT+'frame_receta_v001.png',
   selected:ROOT+'frame_receta_activa_v001.png',
   craft:ROOT+'boton_fabricar_v001.png'
 };
 const ICONS=Object.freeze({
   'Lingote de hierro':'assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png',
   'Carbón vegetal':'assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_poster.png',
   'Madera seca de roble':'assets/playcanvas/approved/materials/oak/v004/madera_roble_v004_poster.png',
   'Madera seca de fresno':'assets/playcanvas/approved/materials/ash/v004/madera_fresno_v004_poster.png',
   'Cuero bovino curtido':'assets/playcanvas/approved/materials/leather_bovine/v003/cuero_bovino_v003_poster.png',
   'Cuero caprino curtido':'assets/playcanvas/approved/materials/leather_caprine/v003/cuero_caprino_v003_poster.png',
   'Mineral de hierro':'assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png',
   'Cordel de cáñamo':'assets/playcanvas/approved/materials/hemp/v018/cordel_canamo_v018_poster.jpg',
   'Hilo de lino':'assets/playcanvas/approved/materials/linen/v021/hilo_lino_v021_poster.jpg'
 });
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const pct=(x,y,w,h)=>'left:'+(x/1672*100).toFixed(4)+'%;top:'+(y/941*100).toFixed(4)+'%;width:'+(w/1672*100).toFixed(4)+'%;height:'+(h/941*100).toFixed(4)+'%';
 const cleanId=s=>String(s).toLowerCase();
 function familyLabel(recipe){
   const text=[recipe?.id,recipe?.subfamily,recipe?.family].join(' ').toLowerCase();
   if(/escud/.test(text))return 'Escudos';
   if(/espad/.test(text))return 'Espadas';
   return String(recipe?.familyName||recipe?.familyLabel||recipe?.family||'Otras recetas').replace(/^\d+$/,'Otras recetas');
 }
 function typeLabel(recipe){
   return String(recipe?.materialGroup||recipe?.materialType||(/hierro/i.test(String(recipe?.id||'')+' '+String(recipe?.subfamily||''))?'Hierro':'Otros'));
 }
 function iconForRecipe(recipe){const a=String(recipe?.iconUrl||'');return a.startsWith('./assets/')||a.startsWith('assets/')?a:null;}
 function safeIcon(url){return url && /^((\.\/)?assets\/)[\w./-]+\.(png|jpg|webp)$/i.test(url)?url:null;}
 function getRecipes(ctx){
   const catalog=typeof ctx?.getRecipeCatalog==='function'?ctx.getRecipeCatalog():[];
   return (Array.isArray(catalog)?catalog:[]).filter(r=>r&&r.id&&r.formula&&Array.isArray(r.formula.materials));
 }
 function selected(ctx,recipes){
   const ids=new Set(recipes.map(r=>String(r.id)));
   const active=String(ctx.activeRecipeId||'');
   if(ctx.genesisCraftingQuestRecipe!==active){
     ctx.genesisCraftingQuestRecipe=active;
     ctx.selectedRecipeId=ids.has(active)?active:recipes[0]?.id||null;
   }
   if(!ids.has(String(ctx.selectedRecipeId)))ctx.selectedRecipeId=ids.has(active)?active:recipes[0]?.id||null;
   return recipes.find(r=>String(r.id)===String(ctx.selectedRecipeId))||null;
 }
 function derive(ctx){
   const recipes=getRecipes(ctx),recipe=selected(ctx,recipes);
   const ingredients=(recipe?.formula?.materials||[]).map(x=>{
     const material=String(x.material||''),required=Math.max(0,Number(x.qty)||0),stock=Math.max(0,Number(ctx.inventory?.[material])||0);
     return {material,required,stock,icon:safeIcon(ICONS[material]||null),enough:stock>=required};
   });
   const resources=ingredients.length>0&&ingredients.every(x=>x.enough);
   const permitted=!!recipe&&ctx.canCraftRecipe?.(recipe.id)===true;
   return {recipes,recipe,ingredients,resources,permitted,canCraft:resources&&permitted};
 }
 function groupRecipes(recipes){
   const groups=new Map();
   recipes.forEach(recipe=>{
     const family=familyLabel(recipe),type=typeLabel(recipe);
     if(!groups.has(family))groups.set(family,new Map());
     const types=groups.get(family);
     if(!types.has(type))types.set(type,[]);
     types.get(type).push(recipe);
   });
   return groups;
 }
 const tabDefs=[['Inventario',182,38,317,76],['Preparacion',499,38,317,76],['Fabricaciones',816,38,337,76],['Comparacion',1153,38,303,76]];
 function label(r){return String(r?.subfamily||r?.name||r?.id||'Receta');}
 function markup(ctx,state){
   const name=state.recipe?label(state.recipe):'Sin receta disponible';
   const parts=[];
   const groups=groupRecipes(state.recipes);
   for(const [family,types] of groups){
     parts.push('<div class="gCraftFamily" data-family="'+escape(family)+'"><div class="gCraftFamilyTitle">'+escape(family)+'</div>');
     for(const [type,recipes] of types){
       parts.push('<div class="gCraftTypeTitle">'+escape(type)+'</div>');
       for(const recipe of recipes){
         const chosen=state.recipe?.id===recipe.id,disabled=ctx.canCraftRecipe?.(recipe.id)!==true;
         const icon=safeIcon(iconForRecipe(recipe));
         parts.push('<button type="button" class="gCraftRecipe'+(chosen?' active':'')+'" data-craft-recipe="'+escape(recipe.id)+'" aria-pressed="'+chosen+'" aria-label="'+escape(label(recipe))+'">'+
           (icon?'<img alt="" src="'+escape(icon)+'">':'<span class="gCraftRecipeGlyph" aria-hidden="true">'+(family==='Escudos'?'◈':'⚔')+'</span>')+
           '<span>'+escape(label(recipe))+'</span>'+(disabled?'<small aria-label="Bloqueada">🔒</small>':'')+'</button>');
       }
     }
     parts.push('</div>');
   }
   const tabs=tabDefs.map(([id,x,y,w,h])=>'<button type="button" class="gCraftNav" data-craft-go="'+id+'" style="'+pct(x,y,w,h)+'" aria-label="'+(id==='Preparacion'?'Preparación':id==='Fabricaciones'?'Fabricaciones':id==='Comparacion'?'Comparación':id)+'"></button>').join('');
   const rows=state.ingredients.map(ing=>{
     const icon=ing.icon?'<img src="'+escape(ing.icon)+'" alt="'+escape(ing.material)+'">':'<span aria-hidden="true">◇</span>';
     return '<div class="gCraftIngredient" data-material="'+escape(ing.material)+'"><div class="gCraftIngredientIcon">'+icon+'</div><div class="gCraftIngredientData"><strong>'+escape(ing.material)+'</strong><span>Requerido: <b>'+ing.required+'</b></span><span>Stock real: <b class="'+(ing.enough?'enough':'missing')+'">'+ing.stock+'</b></span></div></div>';
   }).join('');
   const status=state.canCraft?'✓ Disponible':!state.resources?'Faltan materiales':'Receta bloqueada';
   // Only the game may supply a genuine, explicitly approved GLB viewer. Never use
   // ctx.recipeAsset: in the old build it sometimes returned a material ingot.
   let viewer='';
   const model=ctx?.getApprovedCraftViewer?.(state.recipe?.id);
   if(typeof model==='string' && /^<(model-viewer|canvas)\b/.test(model.trim()))viewer=model;
   const prog=ctx.getFabricationProgress?.()||null;
   const board='<div id="genesisApprovedBoard" class="gApprovedBoard gApproved-Fabricaciones gCraftModule" data-screen="Fabricaciones" data-build="'+VERSION+'" data-recipe="'+escape(state.recipe?.id||'')+'" style="background-image:url(\''+BACKGROUND+'\')">'+
     tabs+'<button class="gCraftClose" type="button" data-craft-go="Cerrar" aria-label="Cerrar">×</button>'+
     '<section class="gCraftTree" aria-label="Recetas del '+escape(ctx.profession||'artesano')+'">'+parts.join('')+'</section>'+
     '<section class="gCraftViewer" aria-label="Vista del objeto seleccionado" data-live-model="'+(viewer?'true':'false')+'">'+viewer+'</section>'+
     '<section class="gCraftRecipeDetails"><h2>'+escape(name)+'</h2><p>'+(state.recipe?'Receta conocida':'Sin recetas')+'</p></section>'+
     '<section class="gCraftMaterials" aria-label="Materiales requeridos"><div class="gCraftMaterialScroll">'+rows+'</div></section>'+
     '<div class="gCraftState '+(state.canCraft?'ready':'blocked')+'">'+escape(status)+'</div>'+
     '<button class="gCraftMake" type="button" aria-label="Fabricar '+escape(name)+'" '+(state.canCraft?'':'disabled')+'></button>'+
     (prog?'<div class="gCraftLiveProgress" aria-label="Progreso actual">Global '+escape(prog.global??'')+' · Fabricación '+escape(prog.fabricacion??'')+'</div>':'')+
     '</div>';
   return board;
 }
 function render(ctx,nav){
   if(!ctx||!nav||!ctx.modal)return false;
   const state=derive(ctx);
   ctx.modal(markup(ctx,state),'preparationModal genesisApprovedModal');
   const root=document.getElementById('genesisApprovedBoard');
   if(!root)return false;
   root.querySelectorAll('[data-craft-go]').forEach(b=>b.onclick=()=>{
     const value=b.dataset.craftGo;
     if(value==='Cerrar')nav.close();
     else if(value==='Preparacion')nav.renderMenu();
     else if(value==='Fabricaciones')nav.renderWorkspace('Fabricaciones');
     else if(value==='Comparacion')nav.renderWorkspace('Comparacion');
     else nav.renderWorkspace('Inventario');
   });
   root.querySelectorAll('[data-craft-recipe]').forEach(b=>b.onclick=()=>{
     const id=b.dataset.craftRecipe;
     if(!state.recipes.some(r=>String(r.id)===id))return;
     ctx.selectedRecipeId=id;
     render(ctx,nav);
   });
   const craft=root.querySelector('.gCraftMake');
   if(craft)craft.onclick=()=>{if(!derive(ctx).canCraft)return;nav.craft();};
   return true;
 }
 g.GenesisCraftingModule=Object.freeze({VERSION,BACKGROUND,FRAME,derive,markup,render,familyLabel,groupRecipes});
})(window);
