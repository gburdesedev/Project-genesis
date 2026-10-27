/* Composes the three menus from the actual Preparation artboard and its 39 layers. */
(async()=>{
 const inventory={'Mineral de hierro':10,'Lingote de hierro':2};
 const names=['Inventario','Preparacion','Fabricaciones','Comparacion'];let tab='Inventario',material='Lingote de hierro',category='materials',recipe='Espada de hierro',pick='A';
 const ore='assets/playcanvas/approved/materials/iron_ore/v008_55k_pbr1536_v007/mineral_hierro_v008_transparent_0.png',ingot='assets/playcanvas/approved/materials/iron/v175/iron_v175_transparent.png';
 const layout=await(await fetch('assets/ui/preparacion/layout_capas_preparacion.json')).json();let template;
 const pos=(x,y,w,h)=>`left:${x/1536*100}%;top:${y/1024*100}%;width:${w/1536*100}%;height:${h/1024*100}%`;
 function sync(){const s=Math.min((innerWidth-12)/1536,(innerHeight-48)/1024,1),w=document.querySelector('.prepSkinScroll');if(w){w.style.setProperty('--prep-layout-width',1536*s+'px');w.style.setProperty('--prep-layout-height',1024*s+'px');w.style.setProperty('--prep-scale',s)}}addEventListener('resize',sync);
 const options={profession:'Herrero',recipeName:'Espada de hierro',inventory,requiredStock:{'Lingote de hierro':3},formula:{materials:[{material:'Lingote de hierro',qty:3}]},onCraft(){show('Fabricaciones')},closeModal(){show('Inventario')},modal(html){document.getElementById('modal').innerHTML=html;sync();bindTabs()}};
 GenesisPreparation.open(options);template=document.querySelector('.prepArtboard').cloneNode(true);
 function bindTabs(){document.querySelectorAll('.prepSkinTab').forEach(b=>{b.disabled=false;b.removeAttribute('aria-current');b.setAttribute('aria-label',b.dataset.label||b.dataset.tab);if(b.dataset.tab===tab)b.setAttribute('aria-current','page');b.onclick=()=>show(b.dataset.tab)})}
 const stat=(a,b)=>`<div class="prepSkinStat"><span>${a}</span><b>${b}</b></div>`;
 function show(next){tab=next;if(tab==='Preparacion'){GenesisPreparation.open(options);bindTabs();return}
 const board=template.cloneNode(true);board.dataset.stage='study';document.querySelector('.prepSkinScroll').replaceChildren(board);
 board.querySelector('.prepSkinCenter').remove();board.querySelector('.prepSkinIngredients')?.remove();board.querySelector('.prepSkinFeatured')?.remove();board.querySelector('.prepSkinStart')?.remove();
 board.querySelectorAll('[data-role^="boton_"]').forEach(e=>e.remove());
 board.querySelector('.prepSkinFooter').textContent='Composición v0.1.002 · '+({Inventario:'Seleccionar · consultar · preparar o fabricar',Fabricaciones:'Elegir fórmula · revisar materiales · fabricar',Comparacion:'Elegir dos creaciones · consultar sus diferencias'}[tab]);
 const detail=board.querySelector('.prepSkinDetails');let content='',bottom='',action='';
 if(tab==='Inventario'){
 content=`<p class="prepSkinKicker">INVENTARIO DEL ARTESANO</p><h3>${category==='materials'?material:'Objetos fabricados'}</h3>`;
 if(category==='materials'){content+=`<p class="prepSkinIntro">${material.startsWith('Mineral')?'Materia prima para preparar en la fragua.':'Material preparado para utilizar en las fórmulas.'}</p>${stat('Cantidad disponible',inventory[material])}${stat('Estado',material.startsWith('Mineral')?'En bruto':'Preparado')}<div class="prepSkinDivider"></div><p class="prepSkinKicker">USOS</p><p>${material.startsWith('Mineral')?'Preparación de lingotes.':'Fabricación de objetos del oficio.'}</p>`;action=material.startsWith('Mineral')?'Ir a preparación':'Ir a fabricaciones'}else content+='<p class="prepSkinIntro">Seleccioná una creación para inspeccionar su modelo, propiedades y afinidades.</p><p>No hay creaciones en este inventario de muestra.</p>';
 bottom=`<button data-category="materials" aria-pressed="${category==='materials'}">Materiales</button><button data-category="creations" aria-pressed="${category==='creations'}">Objetos fabricados</button>`;
 }else if(tab==='Fabricaciones'){
 content=`<p class="prepSkinKicker">FÓRMULAS CONOCIDAS</p><h3>Elegir fabricación</h3>${['Espada de hierro','Escudo de hierro'].map(n=>`<button class="studyChoice" data-recipe="${n}" aria-pressed="${recipe===n}">${n}</button>`).join('')}<div class="prepSkinDivider"></div><h4>${recipe}</h4><p class="prepSkinIntro">Los materiales de la izquierda permanecen visibles mientras elegís la fórmula.</p>${stat('Lingotes disponibles',2)}${stat('Requeridos','Según fórmula')}<p class="prepSkinMinor">El resultado se determina al fabricar.</p>`;bottom='<span>Fórmula y materiales</span><small>Selección de receta en el panel derecho</small>';action='Fabricar';
 }else{
 content=`<p class="prepSkinKicker">COMPARACIÓN DE CREACIONES</p><h3>Dos objetos, una familia</h3><p class="prepSkinIntro">Seleccioná A y B entre tus fabricaciones para consultar sus diferencias.</p>${stat('Selección A','Sin objeto')}${stat('Selección B','Sin objeto')}<div class="prepSkinDivider"></div><h4>Propiedades y afinidades</h4><p>La ficha mostrará los valores de cada creación y qué cambió entre ambas.</p><p class="prepSkinMinor">Primero necesitás dos objetos fabricados.</p>`;bottom=`<button data-pick="A" aria-pressed="${pick==='A'}">Elegir objeto A</button><button data-pick="B" aria-pressed="${pick==='B'}">Elegir objeto B</button>`;action='Comparar';}
 detail.innerHTML=content;
 const showMaterial=tab==='Inventario'&&category==='materials';
 const visual=document.createElement('div');visual.className=showMaterial?'prepSkinFeatured '+(material.startsWith('Mineral')?'ore':''):'studyEmpty';visual.innerHTML=showMaterial?`<img class="prepMaterialPoster" src="${material.startsWith('Mineral')?ore:ingot}" alt="${material}">`:`<div>${tab==='Fabricaciones'?recipe:tab==='Comparacion'?'Seleccioná una creación':'Tus creaciones'}<small>${tab==='Fabricaciones'?'Visor del objeto · asset final pendiente':tab==='Comparacion'?'Elegí el objeto '+pick+' para inspeccionarlo':'El visor se activa al seleccionar un objeto fabricado'}</small></div>`;board.append(visual);
 const controls=document.createElement('div');controls.className='studyOptions';controls.innerHTML=bottom;board.append(controls);
 const button=document.createElement('button');button.className='studyAction';button.textContent=action||'Seleccionar objeto';button.disabled=!showMaterial;button.onclick=()=>show(material.startsWith('Mineral')?'Preparacion':'Fabricaciones');board.append(button);
 board.querySelectorAll('.prepSkinSlot').forEach(b=>{if(b.classList.contains('occupied')){b.disabled=false;b.removeAttribute('aria-disabled');b.onclick=()=>{material=b.querySelector('[data-material]')?.dataset.material||material;category='materials';show('Inventario')}}});
 // Static material images for this composition, just as in the original mobile policy.
 board.querySelectorAll('model-viewer').forEach(v=>{const i=document.createElement('img');i.className='prepMaterialPoster';i.src=v.getAttribute('poster');i.alt=v.alt;v.replaceWith(i)});
 bindTabs();board.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{category=b.dataset.category;show('Inventario')});board.querySelectorAll('[data-recipe]').forEach(b=>b.onclick=()=>{recipe=b.dataset.recipe;show(tab)});board.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{pick=b.dataset.pick;show(tab)});sync();
 }
 show('Inventario');window.menuStudy={show,layout};
})().catch(e=>{document.getElementById('studyBar').textContent='No se pudo cargar la composición: '+e.message;throw e});
