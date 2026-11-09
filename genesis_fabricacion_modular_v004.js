/* Project Genesis V014.030 / Fabricaciones ORA V004 experimental controller.
 * All materials, recipe IDs, stock and crafting decisions come from NGE ctx.
 * No invented art: original approved PNG material posters are used.
 */
(function(g){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pos=(x,y,w,h)=>'left:'+(100*x/1672).toFixed(4)+'%;top:'+(100*y/941).toFixed(4)+'%;width:'+(100*w/1672).toFixed(4)+'%;height:'+(100*h/941).toFixed(4)+'%';
const asset={
 sword:'assets/ui/fabricaciones_ora_v004/V12B_CYCLES_SOURCE_ALPHA_EXPERIMENTAL.png',
 shield:'assets/ui/fabricaciones_ora_v004/V015_REAL_SHIELD_CROPPED.png',
 shieldGlb:'assets/ui/fabricaciones_ora_v004/escudo_hierro_v015_PBR2K_WEBP_v022.glb'
};
const material={
 'Lingote de hierro':'assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png',
 'Madera seca de roble':'assets/playcanvas/approved/materials/oak/v004/madera_roble_v004_poster.png',
 'Carbón vegetal':'assets/playcanvas/approved/materials/charcoal/v011/carbon_vegetal_v011_poster.png',
 'Mineral de hierro':'assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png',
 'Madera seca de fresno':'assets/playcanvas/approved/materials/ash/v004/madera_fresno_v004_poster.png',
 'Cuero bovino curtido':'assets/playcanvas/approved/materials/leather_bovine/v003/cuero_bovino_v003_poster.png',
 'Cuero caprino curtido':'assets/playcanvas/approved/materials/leather_caprine/v003/cuero_caprino_v003_poster.png'
};
function render(ctx,nav,mount){
 const recipes=(typeof ctx.getRecipeCatalog==='function'?(ctx.getRecipeCatalog()||[]):[]).filter(r=>r&&r.id&&r.formula);
 if(!recipes.length)return false;
 const ids=new Set(recipes.map(r=>String(r.id)));
 const quest=String(ctx.activeRecipeId||'');
 if(ctx.genesisApprovedQuestRecipe!==quest){
   ctx.genesisApprovedQuestRecipe=quest;
   ctx.selectedRecipeId=ids.has(quest)?quest:recipes[0].id;
 }
 if(!ids.has(String(ctx.selectedRecipeId)))ctx.selectedRecipeId=ids.has(quest)?quest:recipes[0].id;
 const recipe=recipes.find(r=>String(r.id)===String(ctx.selectedRecipeId));
 if(!recipe)return false;
 const isShield=/escud/i.test(String(recipe.id));
 const name=recipe.subfamily||recipe.name||(isShield?'Escudo de hierro':'Espada de hierro');
 const req=Array.isArray(recipe.formula?.materials)?recipe.formula.materials:[];
 const available=req.length>0&&req.every(r=>Number(ctx.inventory?.[r.material]||0)>=Number(r.qty||0));
 const questActive=String(recipe.id)===quest;
 const allowed=available&&questActive&&ctx.canCraftRecipe?.(recipe.id)===true;
 const status=!questActive?'Bloqueada por la misión':!available?'Faltan materiales':!allowed?'No disponible':'Disponible';
 let html='<div class="gFabModular" data-ora="V004" data-canonical="NGE">';
 const locations={sword:{y:288},shield:{y:463}};
 const authenticSelectedFrame='assets/ui/fabricaciones_ora_v004/05_marco_receta_seleccionada_ORIGINAL.png';
 for(const rec of recipes){
   const shield=/escud/i.test(String(rec.id)),p=shield?locations.shield:locations.sword;
   const selected=String(rec.id)===String(recipe.id);
   html+='<button type="button" class="gFabRecipe'+(selected?' is-selected':'')+'" data-fab-recipe="'+esc(rec.id)+'" style="'+pos(101,p.y,335,57)+'" aria-label="'+esc(rec.subfamily||rec.id)+'">';
   if(selected)html+='<img class="gFabSelectedFrame" src="'+authenticSelectedFrame+'" alt="" aria-hidden="true" draggable="false">';
   html+='<span class="gFabRecipeText">'+esc(rec.subfamily||rec.id)+'</span></button>';
 }
 html+='<div class="gFabHero" style="'+pos(478,122,611,657)+'" data-object="'+(isShield?'shield':'sword')+'">';
 if(isShield){
   html+='<model-viewer class="gFabShieldModel" src="'+asset.shieldGlb+'" poster="'+asset.shield+'" alt="Escudo V015 PBR" camera-controls auto-rotate rotation-per-second="12deg" interaction-prompt="none" shadow-intensity=".8"></model-viewer>';
   html+='<img class="gFabShieldPoster" src="'+asset.shield+'" alt="Escudo V015, miniatura real" draggable="false">';
 }else{
   html+='<img class="gFabSwordPoster" src="'+asset.sword+'" alt="Espada V175 V12B, render Cycles aprobado" draggable="false">';
 }
 html+='</div><div class="gFabHeroCaption" style="'+pos(560,737,446,51)+'">'+esc(name)+'</div>';
 html+='<div class="gFabTitle" style="'+pos(1150,127,449,101)+'"><h2>'+esc(name)+'</h2><span>Receta conocida</span></div>';
 html+='<div class="gFabMaterialsLabel" style="'+pos(1146,237,452,38)+'">MATERIALES REQUERIDOS</div>';
 html+='<div class="gFabMaterials" style="'+pos(1147,276,451,305)+'" data-count="'+req.length+'">';
 req.forEach((r,i)=>{
   const needed=Number(r.qty||0),stock=Number(ctx.inventory?.[r.material]||0),ok=stock>=needed,p=material[r.material];
   html+='<div class="gFabMat'+(ok?' is-available':' is-missing')+'"><div class="gFabMatAsset">';
   if(p)html+='<img src="'+esc(p)+'" alt="'+esc(r.material)+'" draggable="false">';
   html+='</div><div class="gFabMatLabels"><strong>'+esc(r.material)+'</strong><span>Requerido: <b>'+needed+'</b></span><span>Stock real: <b>'+stock+'</b></span></div></div>';
 });
 html+='</div><div class="gFabStatus" style="'+pos(1165,585,424,69)+'"><span>ESTADO</span><strong class="'+(allowed?'gFabStatusReady':'gFabStatusBlocked')+'">'+(allowed?'✓ ':'')+status+'</strong></div>';
 html+='<button type="button" class="gFabCraft" id="gApprovedCraftAction" style="'+pos(1163,674,423,91)+'"'+(allowed?'':' disabled')+' aria-label="Fabricar '+esc(name)+'">FABRICAR</button></div>';
 const board=mount('Fabricaciones',ctx,nav,html,'data-recipe="'+esc(recipe.id)+'" data-ora-modular="V004"');
 if(!board)return false;
 board.querySelectorAll('[data-fab-recipe]').forEach(el=>el.onclick=()=>{
   ctx.selectedRecipeId=el.dataset.fabRecipe;
   render(ctx,nav,mount);
 });
 const craft=board.querySelector('#gApprovedCraftAction');
 if(craft)craft.onclick=()=>{if(allowed)nav.craft();};
 const model=board.querySelector('.gFabShieldModel');
 if(model){
  model.addEventListener('load',()=>{if(model.loaded&&model.modelIsVisible)board.classList.add('gFabLoadedShield3D')},{once:true});
  model.addEventListener('error',()=>board.classList.add('gFabShield3DFailed'),{once:true});
 }
 return true;
}
g.GenesisFabricacionModular=Object.freeze({render,version:'V004-EXPERIMENTAL',asset});
})(window);
