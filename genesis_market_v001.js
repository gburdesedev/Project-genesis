/* Project Genesis · V0.14.022 · comerciante en el mercado.
   Reutiliza un personaje del propio juego; ninguna descarga externa ni arte de menús aprobado.
   Catálogo y compras provienen de genesis_market_domain_v001.js.
*/
import { Entity, StandardMaterial, Color } from 'playcanvas';
import './genesis_market_domain_v001.js?v=0.14.022';

const POS = Object.freeze({x:25.5,y:0,z:36.3});
const STALL = Object.freeze({x:28.35,y:0,z:37.6});

function mat(name,r,g,b,gloss=.14){
  const m=new StandardMaterial();m.name=name;
  m.diffuse=new Color(r,g,b);m.gloss=gloss;m.useMetalness=false;m.update();return m;
}
function box(parent,name,x,y,z,w,h,d,material,cast=true){
  const e=new Entity(name);
  e.addComponent('render',{type:'box',material,castShadows:cast,receiveShadows:true});
  e.setLocalPosition(x,y,z);e.setLocalScale(w,h,d);parent.addChild(e);return e;
}
function escapeText(value){
  return String(value==null?'':value).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function attachStyle(){
  if(document.getElementById('genesis-market-approved-style'))return;
  const link=document.createElement('link');
  link.id='genesis-market-approved-style';
  link.rel='stylesheet';
  link.href='./genesis_ui_approved.css?v=0.14.028';
  document.head.appendChild(link);
}
function buildStall(world){
  const wood=mat('Puesto de mercado - roble usado',.26,.16,.09);
  const edge=mat('Puesto - herrajes envejecidos',.26,.25,.22,.28);
  const flax=mat('Puesto - toldo lino crudo',.60,.52,.38);
  const ochre=mat('Puesto - franjas ocres',.47,.28,.14);
  const crate=mat('Puesto - cajas de transporte',.39,.26,.14);
  const stock=mat('Puesto - sacos con mineral',.24,.22,.18);
  const root=new Entity('Mercado · puesto de suministros provisional');
  world.addChild(root);root.setPosition(STALL.x,STALL.y,STALL.z);
  box(root,'Mesa madera maciza',0,1.02,0,2.35,.17,1.26,wood);
  for(const x of [-.98,.98])for(const z of [-.43,.43]){
    box(root,'Pata estructural',x,.52,z,.13,1.04,.13,wood);
    box(root,'Poste vertical toldo',x,1.82,z,.10,1.75,.10,wood);
  }
  box(root,'Toldo de lona cruda',0,2.72,0,2.84,.13,1.77,flax,false);
  for(const x of [-1.15,-.46,.23,.92]){
    const strip=box(root,'Cinta textil ocre',x,2.795,0,.26,.015,1.68,ochre,false);
  }
  box(root,'Frente madera',0,.86,-.61,2.35,.34,.06,wood);
  box(root,'Herraje frontal',0,.95,-.648,2.15,.035,.014,edge);
  for(const [x,z] of [[-.82,-.18],[.18,.18],[.77,-.08]]){
    box(root,'Caja de materiales del mercado',x,1.24,z,.56,.30,.45,crate);
    box(root,'Saco con material sin etiqueta',x,1.42,z,.40,.13,.30,stock,false);
  }
  box(root,'Cajon inferior',-1.10,.31,.63,.72,.62,.58,crate);
  return root;
}
function buildMerchant(world,source){
  const merchantRoot=new Entity('Mercader de suministros · NPC interactivo V001');
  world.addChild(merchantRoot);merchantRoot.setPosition(POS.x,POS.y,POS.z);
  // Orientado hacia el acceso oeste del mercado, sin bloquear el corredor.
  merchantRoot.setLocalEulerAngles(0,90,0);
  let hasModel=false;
  if(source && typeof source.clone==='function'){
    const character=source.clone();
    character.name='Comerciante - rig humanoide existente';
    merchantRoot.addChild(character);
    character.setLocalPosition(0,0,0);
    character.setLocalEulerAngles(0,180,0);
    character.setLocalScale(1,1,1);
    hasModel=character.findComponents('render').some(c=>c.meshInstances&&c.meshInstances.length);
    // Copias de materiales independientes: no cambia al protagonista.
    if(hasModel)for(const r of character.findComponents('render'))for(const mi of r.meshInstances||[]){
      const old=mi.material;
      if(old&&typeof old.clone==='function'){
        const own=old.clone();
        if(own.diffuse){own.diffuse.r*=.87;own.diffuse.g*=.79;own.diffuse.b*=.67;}
        if(typeof own.gloss==='number')own.gloss=Math.min(own.gloss,.31);
        own.update();mi.material=own;
      }
    }
    if(!hasModel)character.destroy();
  }
  // Delantal, cinturón y bolsa: silueta claramente comercial.
  const apron=mat('Mercader · delantal cuero mate',.25,.12,.07);
  const leather=mat('Mercader · bolsa de venta',.33,.20,.10);
  const bronze=mat('Mercader · hebilla',.43,.29,.13,.33);
  box(merchantRoot,'Delantal frontal',0,.89,-.29,.67,.79,.072,apron);
  box(merchantRoot,'Pretina delantal',0,1.34,-.30,.69,.095,.13,leather);
  box(merchantRoot,'Bolsa lateral',-.44,.84,-.05,.23,.35,.33,leather);
  box(merchantRoot,'Hebilla',-.32,1.34,-.37,.08,.08,.025,bronze);
  if(!hasModel){
    // Último recurso visible, no se disfraza como GLB real.
    box(merchantRoot,'Cuerpo provisional',0,1.18,0,.61,1.03,.37,leather);
    const skin=mat('Mercader rostro provisional',.57,.37,.27);
    const head=new Entity('Cabeza provisional');
    head.addComponent('render',{type:'sphere',material:skin,castShadows:true});
    head.setLocalPosition(0,1.91,0);head.setLocalScale(.37,.43,.36);merchantRoot.addChild(head);
    box(merchantRoot,'Pantalon',0,.42,0,.54,.76,.34,apron);
  }
  return {entity:merchantRoot,fullCharacter:hasModel};
}

/* Merchant V02 approved art, 75962 triangles / 2,049,508 bytes.
 * Loaded asynchronously so stall, story quest, game controls and market modal
 * are never held hostage by a model download. Original fallback is removed
 * only after the real GLB has valid renderable mesh instances.
 */
const MERCHANT_V02_GLB='./assets/playcanvas/approved/characters/merchant_v02_75962.glb?v=0.14.022';
function loadMerchantV02(app,merchantRoot,visual){
  visual.phase='loading';
  visual.assetUrl=MERCHANT_V02_GLB;
  try{
    app.assets.loadFromUrl(MERCHANT_V02_GLB,'container',(error,asset)=>{
      if(error||!asset?.resource){
        visual.phase='fallback';
        visual.error=String(error||'GLB container missing');
        console.warn('Genesis merchant V02: keeping fallback',visual.error);
        return;
      }
      let model;
      try{
        model=asset.resource.instantiateRenderEntity();
        if(!model)throw new Error('GLB container provided no render entity');
        model.name='Mercader V02 · Meshoptimizer 75962 tri';
        // The asset faces local -Z; parent +90 degrees turns toward the west
        // market access. No borrowed humanoid, apron cubes or rig animations.
        model.setLocalPosition(0,0,0);
        model.setLocalEulerAngles(0,0,0);
        merchantRoot.addChild(model);
        const components=model.findComponents('render');
        const instances=components.flatMap(r=>r.meshInstances||[]);
        if(!instances.length)throw new Error('GLB has no renderable mesh instances');
        function extents(){
          let minY=Infinity,maxY=-Infinity;
          for(const mi of instances){
            const box=mi.aabb;if(!box)continue;
            minY=Math.min(minY,box.getMin().y);
            maxY=Math.max(maxY,box.getMax().y);
          }
          return {minY,maxY};
        }
        const initial=extents();
        const originalHeight=initial.maxY-initial.minY;
        if(!Number.isFinite(originalHeight)||originalHeight<=.1)
          throw new Error('Invalid model height / bounds');
        const scale=1.84/originalHeight;
        if(!Number.isFinite(scale)||scale<.05||scale>30)
          throw new Error('Unreasonable merchant model scale '+scale);
        model.setLocalScale(scale,scale,scale);
        const scaled=extents();
        if(!Number.isFinite(scaled.minY))throw new Error('Model floor bounds unavailable');
        model.setLocalPosition(0,merchantRoot.getPosition().y-scaled.minY,0);
        // Remove placeholder only AFTER a complete successful import.
        for(const old of [...merchantRoot.children]){
          if(old!==model)old.destroy();
        }
        visual.phase='ready';
        visual.modelName=model.name;
        visual.meshInstances=instances.length;
        visual.renderComponents=components.length;
        visual.heightMeters=1.84;
        visual.triangles=75962;
        visual.error=null;
      }catch(cause){
        if(model?.parent)model.destroy();
        visual.phase='fallback';
        visual.error=String(cause);
        console.warn('Genesis merchant V02: model setup failed',cause);
      }
    });
  }catch(error){
    visual.phase='fallback';visual.error=String(error);
    console.warn('Genesis merchant V02: loading unavailable',error);
  }
}

export function mountGenesisMarket(options){
  const {app,village,character,getSession,getInventory,modal,closeModal,onInventoryChanged,toast,canTrade,getMarketNeeds,onPurchase}=options||{};
  if(!app||!village?.root||typeof getSession!=='function'||typeof getInventory!=='function')
    throw Error('Mercado: falta el entorno de PlayCanvas o adaptadores de juego');
  const domain=window.GenesisMarketDomain;
  if(!domain)throw Error('Mercado: lógica de la semilla no cargada');
  attachStyle();
  const stall=buildStall(village.root);
  const npc=buildMerchant(village.root,character);
  const visual={phase:'initializing',assetUrl:null,triangles:75962,meshInstances:0,error:null};
  loadMerchantV02(app,npc.entity,visual);
  const chosen=Object.create(null);
  let lastMessage='';
  let selectedIndex=0;
  let catalogPage=0;
  const toRawStock=window.GenesisPreparation?.rawStock;
  function catalog(){return domain.catalog(getSession(),toRawStock);}
  function draw(){
    const current=getSession();
    const names=catalog();
    const inv=getInventory();
    const needs=typeof getMarketNeeds==='function'?getMarketNeeds():[];
    const needByName=new Map(needs.map(n=>[n.material,n]));
    const ROOT='assets/ui/preparacion/01_Capas/';
    // Las imágenes provienen del registro visual que ya utiliza Inventario/Preparación.
    // El nombre del artículo viene exclusivamente de la semilla, no de este módulo.
    const asset=name=>window.GenesisApprovedUI?.materialVisual?.(name,false)||
      '<span class="gApprovedNoModel">'+escapeText(name)+'</span>';
    const pos=(x,y,w,h)=>'left:'+(x/1672*100).toFixed(3)+'%;top:'+(y/941*100).toFixed(3)+'%;width:'+(w/1672*100).toFixed(3)+'%;height:'+(h/941*100).toFixed(3)+'%';
    const panel=(path,x,y,w,h)=>'<img alt="" aria-hidden="true" src="./'+ROOT+path+'" style="position:absolute;pointer-events:none;'+pos(x,y,w,h)+'">';
    const pageSize=10;
    const pageCount=Math.max(1,Math.ceil(names.length/pageSize));
    catalogPage=Math.min(catalogPage,pageCount-1);
    const pageItems=names.slice(catalogPage*pageSize,(catalogPage+1)*pageSize);
    const cards=pageItems.map((name,slot)=>{
      const index=catalogPage*pageSize+slot;
      const x=38+(slot%5)*106,y=274+Math.floor(slot/5)*113;
      const qty=chosen[name]||Math.min(99,Math.max(1,needByName.get(name)?.missing||0));
      return '<button type="button" class="gApprovedPrepSlot" data-select="'+index+'" title="'+escapeText(name)+'" aria-label="'+escapeText(name)+'" style="'+pos(x,y,99,108)+'">'+asset(name)+
        '<img alt="" aria-hidden="true" src="./'+ROOT+'Casillas/Casilla_Basicos_01.png" style="position:absolute;inset:0;width:100%;height:100%;max-width:none;max-height:none;pointer-events:none">'+
        '<b>'+Number(inv?.[name]||0)+'</b></button>';
    }).join('');
    let selected=names[selectedIndex]||names[0];
    if(!names.includes(selected))selected=names[0];
    selectedIndex=Math.max(0,names.indexOf(selected));
    const qty=selected?(chosen[selected]||Math.min(99,Math.max(1,needByName.get(selected)?.missing||0))):0;
    modal('<div class="gApprovedBoard gApproved-Preparacion" id="genesisMarketBoard" style="background-image:url(\'./'+ROOT+'Fondo/FondoEstructural.png\')">'+
      panel('Paneles/PanelBasicos.png',17,153,562,380)+
      panel('Paneles/PanelPreparados.png',17,533,562,380)+
      panel('Paneles/FondoVisorHerreria.png',579,153,548,760)+
      panel('Paneles/PanelDatos.png',1127,153,399,624)+
      panel('Paneles/PanelAccionSinBoton.png',1127,777,399,136)+
      '<div class="gApprovedRecipeTitle" style="'+pos(180,30,1310,100)+';background:#100b09"><h2>MERCADO · SUMINISTROS</h2><p>Comerciante de materiales · '+escapeText(current?.profession||'Artesano')+'</p></div>'+
      '<button type="button" disabled aria-disabled="true" title="Vender no disponible" style="position:absolute;'+pos(765,113,286,42)+';background:#151310;color:#887760;border:1px solid #63503c;z-index:3">🔒 Vender</button>'+
      '<button class="gApprovedHit" id="genesisMarketClose" style="'+pos(1603,0,69,36)+';z-index:10;color:#f4d49c;background:#1a110a">✕</button>'+
      '<div class="gApprovedPrepData" style="'+pos(38,177,505,80)+';font-size:1.6cqw">Materiales disponibles · seleccioná una casilla</div>'+
      cards+
      '<div class="gApprovedPrepData" style="'+pos(40,560,490,75)+';font-size:1.5cqw">Materiales de recetas conocidas · '+names.length+' tipos</div>'+
      '<button type="button" data-page="prev" '+(catalogPage===0?'disabled':'')+' style="'+pos(45,670,190,63)+'">◀ Anterior</button>'+
      '<button type="button" data-page="next" '+(catalogPage>=pageCount-1?'disabled':'')+' style="'+pos(315,670,190,63)+'">Siguiente ▶</button>'+
      '<div style="position:absolute;'+pos(203,741,178,42)+';text-align:center;color:#f5d7a9">Página '+(catalogPage+1)+' / '+pageCount+'</div>'+
      '<div class="gApprovedPrepProduct" style="'+pos(605,230,494,540)+'">'+(selected?asset(selected):'')+'</div>'+
      '<div class="gApprovedPrepData" style="'+pos(1144,185,350,570)+'">'+
      '<h3 style="font-size:2cqw">'+escapeText(selected||'Sin materiales')+'</h3>'+
      '<p>En inventario: '+Number(inv?.[selected]||0)+'</p>'+
      '<p>Precio: 0 oro · Demostración</p>'+
      '<p>Para 2 escudos faltan: '+Number(needByName.get(selected)?.missing||0)+'</p>'+
      '<div class="gApprovedPrepQty"><button data-dec="'+selectedIndex+'">−</button><strong>'+qty+'</strong><button data-inc="'+selectedIndex+'">+</button></div>'+
      '<p>Total: 0 oro</p></div>'+
      '<button type="button" class="gApprovedPrepAction" data-buy="'+selectedIndex+'" style="'+pos(1150,796,344,92)+';background:#3b2513;color:#f9d59c;border:1px solid #c69b60;font-size:2cqw">OBTENER '+qty+' · GRATIS</button>'+
      '<div class="gApprovedCraftState" style="'+pos(605,805,490,55)+'">'+escapeText(lastMessage)+'</div>'+
      '</div>','preparationModal genesisApprovedModal genesisMarketModal');
    const root=document.getElementById('genesisMarketBoard');
    root?.querySelector('#genesisMarketClose')?.addEventListener('click',()=>closeModal());
    root?.querySelectorAll('[data-select]').forEach(btn=>btn.addEventListener('click',()=>{selectedIndex=Number(btn.dataset.select);draw();}));
    root?.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{catalogPage+=btn.dataset.page==='next'?1:-1;draw();}));
    root?.querySelectorAll('[data-inc]').forEach(btn=>btn.addEventListener('click',()=>{
      const name=names[Number(btn.dataset.inc)];
      if(!name)return;const required=needByName.get(name)?.missing||0;chosen[name]=Math.min(99,(chosen[name]||Math.min(99,Math.max(1,required)))+1);draw();
    }));
    root?.querySelectorAll('[data-dec]').forEach(btn=>btn.addEventListener('click',()=>{
      const name=names[Number(btn.dataset.dec)];
      if(!name)return;const required=needByName.get(name)?.missing||0;chosen[name]=Math.max(1,(chosen[name]||Math.min(99,Math.max(1,required)))-1);draw();
    }));
    root?.querySelectorAll('[data-buy]').forEach(btn=>btn.addEventListener('click',()=>{
      const name=names[Number(btn.dataset.buy)];
      const result=domain.buy({session:getSession(),inventory:getInventory(),material:name,
        quantity:chosen[name]||Math.min(99,Math.max(1,needByName.get(name)?.missing||0)),toRawStock:toRawStock});
      if(!result.ok){lastMessage='Compra rechazada: material o cantidad no disponible.';}
      else{
        lastMessage='Añadiste '+result.quantity+' × '+result.material+' al inventario.';
        delete chosen[name];
        if(typeof onPurchase==='function')onPurchase(result);
        if(typeof onInventoryChanged==='function')onInventoryChanged();
        if(typeof toast==='function')toast(lastMessage,1250);
      }
      draw();
    }));
  }
  function open(){
    if(typeof modal!=='function'||typeof closeModal!=='function')return false;
    if(!getSession()){toast?.('Elegí primero una profesión para crear la semilla.',1500);return false;}
    if(typeof canTrade==='function'&&!canTrade()){toast?.('Primero hablá con Ordan. Él te enseñará a reabastecerte en el mercado.',2100);return false;}
    lastMessage='';selectedIndex=0;catalogPage=0;draw();return true;
  }
  const interactable=Object.freeze({
    id:'marketMerchant',radius:2.85,
    position:()=>({x:POS.x,y:1.30,z:POS.z}),
    prompt:()=> 'Hablar con el comerciante',
    interact:open
  });
  const status={version:'v0.14.022',npc:npc.fullCharacter?'rig_reused':'visible_fallback',
    center:POS,stall:STALL,seedBound:true,freePurchase:true};
  // Diagnóstico público de solo lectura: el test usa el mismo catálogo y ventana del juego.
  window.__genesisMarket=Object.freeze({...status,catalog,open,visual});
  return Object.freeze({interactable,open,catalog,stall,npc:npc.entity,status});
}
