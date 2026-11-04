/* Project Genesis 0.15-V013 — original Canvas gameplay adapter.
 * Uses the original NGE, original 16:9 Inventory/Preparation art and live
 * procedural session. No new building, prop mesh, camera or floor is created.
 */
(function(){
'use strict';
function mount({game,app,artisan,ordan,playOrdanAnimation}){
 if(!game||!app||!artisan||!ordan)throw Error('Canvas gameplay: missing original scene actors');
 if(!game.snapshot())game.startOrResume();
 const pc=globalThis.pc;
 const get=id=>document.getElementById(id);
 // V014: exact original Canvas HUD nodes, not duplicate floating controls.
 const quest=get('quest'),prompt=get('prompt'),marker=get('interactMarker');
 if(!quest||!prompt||!marker)throw Error('Approved original Canvas HUD is incomplete');
 const modalLayer=document.createElement('section');modalLayer.id='modalLayer';modalLayer.style.display='none';
 modalLayer.innerHTML='<div id="modal" class="modal" role="dialog" aria-modal="true"></div>';document.body.appendChild(modalLayer);
 const modalBox=get('modal');
 const invBtn=get('inventoryTouch');
 if(!invBtn)throw Error('Original Canvas INV control missing');
 const state={kind:null,selectedGoal:null,dialogueCount:0,followIndex:0,following:false,finishedFollow:false,returnToStep:null,lastStep:null};
 const ORIGINAL_FOLLOW=[{x:.465,z:.585},{x:.465,z:-.84},{x:1.29,z:-1.065}];
 const escape=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const isModalOpen=()=>modalLayer.style.display==='grid';
 const goalPosition=()=>{const goal=game.goal();if(!goal?.position)return null;
  if(goal.id==='mentor'||goal.id==='mentor-key'){const p=ordan.getPosition();return[p.x,p.z]}
  return goal.position;
 };
 const distance=()=>{const p=goalPosition();if(!p)return null;const here=artisan.getPosition();return Math.hypot(here.x-p[0],here.z-p[1])};
 function showModal(html,extra=''){
  modalBox.className='modal '+extra;
  modalBox.innerHTML=html;
  modalLayer.style.display='grid';
  get('settings').classList.remove('open');
 }
 function dismiss(){
  const previous=state.kind;
  globalThis.GenesisPreparation?.dismiss?.();
  state.kind=null;
  modalLayer.style.display='none';
  modalBox.innerHTML='';
  if(previous==='workspace'){const result=game.closeInventory();if(result.advanced)showDialogue(result.dialogue)}
  refresh();
 }
 function showDialogue(text){
  if(!text)return;
  state.kind='dialogue';
  state.dialogueCount++;
  showModal('<div class="legacyDialogue"><div class="legacySpeaker">MAESE ORDAN</div><p>'+escape(text)+'</p><button id="legacyDialogueContinue">Continuar</button></div>','legacyDialogueModal');
  get('legacyDialogueContinue').onclick=dismiss;
 }
 function showResult(item){
  state.kind='result';
  const channels=item.channels.map(([name,value],i)=>'<div class="legacyChannel"><span>'+escape(name)+'</span><b>'+escape(value)+(i?' %':'')+'</b></div>').join('');
  showModal('<div class="legacyResult"><p class="legacySpeaker">NGE · ALPHA BUILD · RESULTADO REAL</p><h2>'+escape(item.name)+'</h2><p>Espada de hierro · '+escape(item.rarity)+' · '+item.channels.length+' canales</p>'+channels+'<button id="legacyResultContinue">Continuar</button></div>','legacyResultModal');
  get('legacyResultContinue').onclick=()=>{
    dismiss();
    if(game.step()===12)openComparison();
    else showDialogue('Repetí exactamente la misma receta. El siguiente cierre resolverá una nueva combinación de canales.');
  };
 }
 function openSelection(){
  const pair=game.compare();
  if(!pair)return;
  state.kind='selection';
  showModal('<div class="legacySelection"><div class="legacySpeaker">Q3 · ELECCIÓN DE CREACIÓN</div><h2>Elegí qué espada conservar</h2><p>Ambas salieron de la misma fórmula de sesión, pero tienen distintas propiedades.</p>'+pair.map((item,i)=>{
    const channels=item.channels.map(([name,v])=>escape(name)+' '+escape(v)).join(' · ');
    return '<button class="legacyChoose" data-choose="'+i+'"><strong>'+escape(item.name)+'</strong><span>'+escape(item.rarity)+' · '+escape(channels)+'</span><small>Conservar esta espada</small></button>'
  }).join('')+'<button class="legacySecondary" id="legacyBackToCompare">Volver a comparar</button></div>','legacySelectionModal');
  modalBox.querySelectorAll('[data-choose]').forEach(button=>button.onclick=()=>{
    const result=game.choose(Number(button.dataset.choose));
    if(!result.ok)return;
    dismiss();showCompletion(result.chosen);
  });
  get('legacyBackToCompare').onclick=()=>{dismiss();openComparison()};
 }
 function showCompletion(chosen){
  state.kind='completed';
  showModal('<div class="legacySelection"><div class="legacySpeaker">PROJECT GENESIS · RECORRIDO ORIGINAL COMPLETADO</div><h2>El taller vuelve a funcionar</h2><p>Recuperaste el taller de Ordan, aprendiste a usar el inventario y fabricaste dos espadas con la misma fórmula. Comparaste sus canales y elegiste conservar <strong>'+escape(chosen.name)+'</strong>.</p><p>La secuencia nueva de quests todavía no está aplicada.</p><button id="legacyFinishClose">Seguir explorando</button><button class="legacySecondary" id="legacyRestart">Empezar una partida nueva</button></div>','legacySelectionModal');
  get('legacyFinishClose').onclick=dismiss;
  get('legacyRestart').onclick=()=>{game.clear();location.reload()};
 }
 function openComparison(){
  if(!game.compare())return;
  openWorkspace('Comparacion',true);
 }
 function doCraft(){
  const result=game.craft();
  if(!result.ok){state.kind='message';showModal('<div class="legacyDialogue"><h2>Fabricación no habilitada</h2><p>'+escape(result.reason)+'</p><button id="legacyErrorClose">Continuar</button></div>','legacyDialogueModal');get('legacyErrorClose').onclick=dismiss;return}
  showResult(result.item);
 }
 function workspaceOptions(startTab,withComparison=false){
  const formula=game.recipe(),session=game.session(),rec=globalThis.GenesisPrototypeEngines?.recipes?.espada_hierro;
  return {
    profession:'Herrero',
    inventory:game.inventory(),
    requiredStock:session.requiredStock||session.stock,
    formula,recipeName:rec?.name||'Espada de hierro',
    startTab,selectedRecipeId:'espada_hierro',
    getItems:()=>game.snapshot().items,
    getRecipeCatalog:()=>[{id:'espada_hierro',family:'Espada',subfamily:'Espada de hierro',formula}],
    activeRecipeId:'espada_hierro',
    canCraftRecipe:id=>id==='espada_hierro'&&[10,11].includes(game.step())&&globalThis.GenesisPreparation.ready(formula,game.inventory()),
    onCraftRecipe:id=>{if(id==='espada_hierro'){dismiss();doCraft()}},
    canCraftNow:()=>[10,11].includes(game.step()),
    onCraft:()=>{dismiss();doCraft()},
    onInventoryChanged:()=>{game.onInventoryChanged();refresh()},
    onComparisonContinue:withComparison?openSelection:null,
    renderAsset:item=>'<div class="legacyItemIdentity"><b>'+escape(item.name)+'</b><small>'+escape(item.rarity)+' · '+item.channels.length+' canales</small></div>',
    modal:(html,extra)=>{state.kind='workspace';showModal(html,extra)},
    closeModal:dismiss
  };
 }
 function openWorkspace(tab='Inventario',withComparison=false){
  const result=game.openInventory();
  if(!result.ok){showDialogue(result.reason);return}
  const prep=globalThis.GenesisPreparation;
  if(!prep?.open)throw Error('Canvas original Preparation not loaded');
  state.kind='workspace';
  prep.open(workspaceOptions(tab,withComparison));
  refresh();
 }
 function tryInteract(){
  if(globalThis.__GENESIS_V016_ARRIVAL__?.active)return;
  if(isModalOpen()||get('v011-pause')?.style.display==='block')return;
  const step=game.step(),goal=game.goal();
  if(step===9){openWorkspace('Inventario');return}
  if(step===12){openComparison();return}
  if(step===13){const snap=game.snapshot();showCompletion(snap.items[snap.selection]);return}
  const d=distance();
  if(d===null||d>goal.radius){if(get('status'))get('status').textContent='Acercate al objetivo: '+(d===null?'—':d.toFixed(1))+' m';return}
  if(goal.id==='craft'){openWorkspace('Preparacion');return}
  const response=game.doAction(goal.id);
  if(response.ok){
    if(goal.id==='door'){state.following=true;state.finishedFollow=false;state.followIndex=0}
    if(response.dialogue)showDialogue(response.dialogue);
    refresh();
  }
 }
 function refresh(){
  const snap=game.snapshot();
  if(!snap)return;
  const step=snap.step,goal=snap.goal;
  if(state.lastStep!==step){state.lastStep=step;quest.querySelector('.ey').textContent=(step<=9?'Q1 · TALLER E INVENTARIO':step<=11?'Q'+(step-8)+' · FABRICACIÓN':'Q3 · COMPARACIÓN')+' · CANVAS ORIGINAL'}
  get('questTitle').textContent=goal.title;
  get('questText').textContent=goal.hint;
  const d=distance();
  get('legacyDistance').textContent=d===null?(step===9?'TAB / INV · Abrir inventario':step===12?'Comparar y elegir':''):'Distancia al objetivo: '+d.toFixed(1)+' m';
  const ready=d!==null&&d<=goal.radius;
  prompt.textContent=step===9?'TAB / INV · Inventario':step===12?'Comparar dos espadas':step===13?'Recorrido completado':ready?'E / ACCIÓN · '+goal.title:'';
  prompt.style.display=(ready||step===9||step===12)?'block':'none';
  const locked=step<9;
  invBtn.classList.toggle('locked',locked);
  invBtn.classList.toggle('ready',!locked);
  invBtn.setAttribute('aria-disabled',String(locked));
  const materials=get('materialsPanel');
  if(materials)materials.style.display=step>=9?'block':'none';
  const stock=Object.entries(snap.inventory||{}).filter(([,qty])=>qty>0);
  const count=stock.reduce((n,[,qty])=>n+qty,0);
  const items=snap.items?.length||0;
  const matText=get('materialsText');
  if(matText&&step>=9)matText.textContent='TAB / INV · '+stock.length+' materiales · '+count+' unidades · '+items+' objetos fabricados';
  const chip=get('professionChip');
  if(chip){chip.style.display='block';chip.textContent='PROFESIÓN · HERRERO';}
  marker.style.display='none';
  if(goal.position&&d!==null&&d>goal.radius){
    const p=goalPosition();
    // Keep world-space objective marker independent from any replacement mesh.
    try{
      const view=gameView.camera;
      const screen=new pc.Vec3();
      view.camera.worldToScreen(new pc.Vec3(p[0],1.8,p[1]),screen);
      const canvas=app.graphicsDevice.canvas;
      const scaleX=canvas.clientWidth/canvas.width,scaleY=canvas.clientHeight/canvas.height;
      const left=screen.x*scaleX,top=screen.y*scaleY;
      if(screen.z>0&&left>=14&&left<=innerWidth-14&&top>=14&&top<=innerHeight-14){
        marker.style.left=left+'px';marker.style.top=top+'px';marker.style.display='block';
      }
    }catch(e){marker.style.display='none'}
  }
 }
 const gameView={camera:arguments[0]?.camera};
 // Always bind to the original camera from the caller.
 gameView.camera=arguments[0]?.camera||null;
 invBtn.onclick=()=>{if(!isModalOpen()&&game.step()>=9)openWorkspace('Inventario')};
 invBtn.addEventListener('keydown',event=>{
   if(event.key!=='Enter'&&event.key!==' ')return;
   event.preventDefault();invBtn.click();
 });
 get('interact')?.addEventListener('keydown',event=>{
   if(event.key!=='Enter'&&event.key!==' ')return;
   event.preventDefault();get('interact').click();
 });
 const onKey=event=>{
  if(globalThis.__GENESIS_V016_ARRIVAL__?.active){if(event.key==='Tab'||event.code==='KeyE')event.preventDefault();return}
  if(event.key==='Tab'){event.preventDefault();if(!isModalOpen())openWorkspace('Inventario');return}
  if(event.key==='Escape'&&isModalOpen()){event.preventDefault();dismiss();return}
  if((event.code==='KeyE'||event.key==='e'||event.key==='E')&&!event.repeat){event.preventDefault();tryInteract()}
 };
 document.addEventListener('keydown',onKey,true);
 app.on('update',dt=>{
  if(!game.snapshot())return;
  // Preserve original mentor walk after opening the workshop door.
  const step=game.step();
  if(step>2&&step<=7&&!state.following&&!state.finishedFollow){
    const last=ORIGINAL_FOLLOW.at(-1);
    ordan.setPosition(last.x,0,last.z);state.finishedFollow=true;playOrdanAnimation?.('Idle_Loop');
  }
  if(state.following){
    const point=ORIGINAL_FOLLOW[state.followIndex];
    if(point){
      const p=ordan.getPosition(),dx=point.x-p.x,dz=point.z-p.z,dist=Math.hypot(dx,dz);
      const player=artisan.getPosition();
      if(Math.hypot(player.x-p.x,player.z-p.z)<7){
        playOrdanAnimation?.('Walk_Loop');
        const move=Math.min(dist,Math.max(0,dt)*2.0);
        if(dist>1e-4)ordan.setPosition(p.x+dx/dist*move,0,p.z+dz/dist*move);
        if(dist<=move+.03)state.followIndex++;
      }else playOrdanAnimation?.('Idle_Loop');
    }else{state.following=false;state.finishedFollow=true;playOrdanAnimation?.('Idle_Loop')}
  }
  if(!isModalOpen())refresh();
 });
 refresh();
 return Object.freeze({isModalOpen,tryInteract,openWorkspace,refresh,snapshot:game.snapshot,game,close:dismiss});
}
globalThis.GenesisCanvasLegacyUI=Object.freeze({mount});
})();