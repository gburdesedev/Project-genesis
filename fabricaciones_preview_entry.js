/* Preview entrypoint — only ?fab_preview=1, never part of production integration.
   Reads real procedural session formulas from GenesisPrototypeEngines;
   disables crafting because tutorial state has not been played. */
(function(){
  'use strict';
  if(new URLSearchParams(location.search).get('fab_preview')!=='1')return;
  function show(){
    const engine=window.GenesisPrototypeEngines;
    const ui=window.GenesisCraftingModule;
    if(!engine?.generateSession||!ui?.render) {
      console.error('[FAB PREVIEW] Game engine or Fabricaciones module unavailable');
      window.__GenesisFabPreview={error:'engine/module-unavailable'};return;
    }
    const session=engine.generateSession('Herrero');
    const recipes=Object.entries(session.formulas).flatMap(([id,formula])=>{
      const source=engine.recipes?.[id];
      if(!source||source.profession!=='Herrero'||!/espad|escud/i.test(id))return [];
      return [{id,family:/escud/i.test(id)?'Escudos':'Espadas',
        subfamily:source.name,formula}];
    });
    if(!recipes.length) {window.__GenesisFabPreview={error:'empty-real-recipe-catalog'};return;}
    const modal=document.getElementById('modal'),layer=document.getElementById('modalLayer');
    if(!modal||!layer)return;
    const clean=()=>{location.href=location.pathname;};
    const ctx={
      profession:'Herrero',activeRecipeId:recipes[0].id,selectedRecipeId:recipes[0].id,
      inventory:{...session.stock},getRecipeCatalog:()=>recipes,
      canCraftRecipe:()=>false,canCraftNow:()=>false,
      modal(html,classes){
        modal.className='modal '+classes;
        modal.innerHTML=html;
        layer.style.display='grid';
      }
    };
    const nav={close:clean,renderMenu:clean,renderWorkspace:clean,
      craft:()=>console.warn('[FAB PREVIEW] Craft disabled: tutorial required.')};
    document.body.classList.add('genesisFabricPreviewOnly');
    if(!document.getElementById('genesisFabricPreviewStyle')){
      const rule=document.createElement('style');rule.id='genesisFabricPreviewStyle';
      rule.textContent='body.genesisFabricPreviewOnly #loading,body.genesisFabricPreviewOnly #prototypeIntro,body.genesisFabricPreviewOnly #hud{display:none!important}body.genesisFabricPreviewOnly #modalLayer{display:grid!important;z-index:99999!important}';
      document.head.append(rule);
    }
    const render=()=>{const ok=ui.render(ctx,nav);
      window.__GenesisFabPreview={ready:ok,mode:'read-only-engine-session',recipeCount:recipes.length,
        recipeIds:recipes.map(x=>x.id),active:ctx.selectedRecipeId,seed:session.seed};
      return ok;};
    render();
    window.__GenesisFabPreviewSwitch=id=>{
      if(!recipes.some(x=>x.id===id))return false;
      ctx.selectedRecipeId=id;render();return true;
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{
    const link=document.createElement('link');link.rel='stylesheet';
    link.href='./genesis_ui_approved.css?v=014028';link.onload=show;
    link.onerror=()=>{window.__GenesisFabPreview={error:'approved-base-css-unavailable'};};
    document.head.append(link);
  },{once:true});
  else {const link=document.createElement('link');link.rel='stylesheet';link.href='./genesis_ui_approved.css?v=014028';link.onload=show;document.head.append(link);}
})();
