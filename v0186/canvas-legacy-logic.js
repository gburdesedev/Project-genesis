/* Project Genesis 0.15-V013 — Original Canvas tutorial and NGE session semantics.
 * Source: main/index.html (prototype Q1–Q3 + original 2026-11-03 NGE engine).
 * Deliberately stops after two swords and comparison: the NEW market/quest
 * ordering is not applied in this migration.
 * This is a logic module. It creates no meshes, camera, art or replacement UI.
 */
(function (root, factory) {
  const api = factory();
  root.GenesisCanvasLegacy = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const KEY='project-genesis/canvas-original/v0186-preview';
  const VERSION='0.15-v013';
  const DEFINITIONS=Object.freeze([
    {id:'mentor',title:'Habla con Maese Ordan',hint:'El taller está abandonado. Escuchá las indicaciones de Ordan.',position:[1.72,1.90],radius:2.2},
    {id:'door',title:'Entrá al taller',hint:'Abrí la puerta del Herrero siguiendo la indicación de Ordan.',position:[0,.12],radius:2.25},
    {id:'debris',title:'Retirá los escombros',hint:'Despejá la estación antes de tocar herramientas.',position:[-1.16,-1.43],radius:2.1},
    {id:'anvil',title:'Asegurá el yunque',hint:'La base de trabajo tiene que quedar firme.',position:[1.08,-4.91],radius:1.95},
    {id:'bellows',title:'Revisá el fuelle',hint:'El fuelle debe responder antes de encender la fragua.',position:[3.14,-5.42],radius:2.0},
    {id:'flue',title:'Limpiá el tiro',hint:'Desobstruí el conducto de la fragua.',position:[2.27,-6.90],radius:2.2},
    {id:'forge',title:'Encendé la fragua',hint:'Comprobá que la estación funciona.',position:[2.27,-6.34],radius:2.25},
    {id:'mentor-key',title:'Volvé con Ordan',hint:'La estación funciona. Pedile la llave del baúl.',position:[1.72,1.90],radius:2.2},
    {id:'chest',title:'Abrí el baúl de materiales',hint:'El lote inicial contiene lo necesario para las dos primeras espadas.',position:[-3.06,-2.27],radius:1.95},
    {id:'inventory',title:'Aprendé a usar el inventario',hint:'Abrí Inventario con TAB o INV, revisá el lote y cerralo.',position:null,radius:null},
    {id:'craft',title:'Q2 · Primera fabricación',hint:'Prepará los lingotes reales y fabricá la primera Espada de hierro.',position:[1.08,-4.91],radius:2.0},
    {id:'craft',title:'Q3 · Segunda fabricación',hint:'Repetí exactamente la misma fórmula. La resolución NGE será nueva.',position:[1.08,-4.91],radius:2.0},
    {id:'compare',title:'Compará las dos espadas',hint:'Elegí qué espada conservar. La fórmula fue idéntica.',position:null,radius:null},
    {id:'complete',title:'Q1–Q3 · Recorrido original completado',hint:'La revisión original finaliza aquí. El mercado y la nueva secuencia todavía no se aplicaron.',position:null,radius:null}
  ]);

  const copy=Object.freeze({
    mentor:'Este taller no vuelve a la vida porque abras una puerta. Vamos a recuperar primero la estación: escombros, yunque, fuelle, tiro y fragua. En ese orden.',
    door:'Entrá vos primero. Yo voy detrás. Antes de trabajar, retirá los escombros que bloquean la estación.',
    debris:'Ahora comprobá el yunque. Necesito una base firme.',
    anvil:'Bien. Revisá el fuelle; todavía no enciendas la fragua.',
    bellows:'Antes del fuego, limpiá el tiro y la entrada de aire.',
    flue:'Ahora sí: encendé la fragua y comprobá el fuego.',
    forge:'Eso era lo que necesitaba ver. Volvé conmigo antes de abrir el baúl.',
    'mentor-key':'La estación ya responde. El baúl estuvo cerrado mientras el taller estaba abandonado. Tomá la llave: adentro está el lote inicial reservado para tu oficio.',
    chest:'El lote inicial ya pasó a tu inventario. Antes de fabricar, revisá qué materiales recibiste y cerrá el panel para continuar.',
    inventory:'Perfecto. Ahora acercate al yunque y prepará los lingotes para fabricar la primera espada.',
    craft:'La misma receta produce objetos diferentes porque cada cierre vuelve a resolver sus canales.'
  });

  function create(options={}) {
    const engine=options.engine || globalThis.GenesisPrototypeEngines;
    const preparation=options.preparation || globalThis.GenesisPreparation;
    const storage=options.storage || (typeof localStorage!=='undefined'?localStorage:null);
    if(!engine?.generateSession || !engine?.fabricate || !engine?.present) throw Error('Original NGE engine missing');
    if(!preparation?.rawStock || !preparation?.ready) throw Error('Original preparation module missing');
    let state=null,session=null;
    const serial=()=>state?JSON.parse(JSON.stringify(state)):null;
    function save(){
      if(!state)return;
      try{storage?.setItem(KEY,JSON.stringify(state))}catch(e){/* private mode is supported without persistence */}
    }
    function clear(){
      try{storage?.removeItem(KEY)}catch(e){/* storage may be unavailable */}
      state=null;session=null;
    }
    function start(seed){
      clear();
      session=seed==null?engine.generateSession('Herrero'):engine.generateSession('Herrero',{seed});
      if(!session?.formulas?.espada_hierro)throw Error('Original sword formula unavailable');
      state={version:VERSION,profession:'Herrero',seed:session.seed,step:0,
        doorOpened:false,repairs:[],forgeHot:false,key:false,chestOpen:false,
        inventory:{},inventoryOpened:false,items:[],selection:null,
        sessionId:session.id,formulaSignature:session.formulas.espada_hierro.signature};
      save();return snapshot();
    }
    function resume(){
      let stored;
      try{stored=JSON.parse(storage?.getItem(KEY)||'null')}catch(e){return null}
      if(!stored||stored.version!==VERSION||stored.profession!=='Herrero'||
        !Number.isSafeInteger(stored.seed)||!Number.isSafeInteger(stored.step)||
        stored.step<0||stored.step>13||!Array.isArray(stored.items)||
        !stored.inventory||typeof stored.inventory!=='object')return null;
      const candidate=engine.generateSession('Herrero',{seed:stored.seed});
      if(candidate.id!==stored.sessionId||
        candidate.formulas?.espada_hierro?.signature!==stored.formulaSignature)return null;
      if(stored.items.length>2||stored.items.some(x=>x.recipe!=='espada_hierro'))return null;
      state=stored;session=candidate;
      return snapshot();
    }
    function startOrResume(seed){
      if(seed==null){const saved=resume();if(saved)return saved}
      return start(seed);
    }
    function hasSave(){
      try{const x=JSON.parse(storage?.getItem(KEY)||'null');return x?.version===VERSION&&x.profession==='Herrero'}catch(e){return false}
    }
    function snapshot(){
      return state?{
        ...serial(),
        goal:{...DEFINITIONS[state.step]},
        session:{id:session.id,seed:session.seed,formulas:JSON.parse(JSON.stringify(session.formulas))}
      }:null;
    }
    function goal(){return state?DEFINITIONS[state.step]:null}
    function inventory(){if(!state)throw Error('Session not started');return state.inventory}
    function step(){return state?.step??null}
    function onInventoryChanged(){if(!state)return;save();return snapshot()}
    function doAction(id){
      if(!state)return {ok:false,reason:'No hay partida iniciada'};
      const goal=DEFINITIONS[state.step];
      if(!goal||goal.id!==id)return {ok:false,reason:'Acción fuera del objetivo actual',goal:goal?.id};
      if(id==='inventory')return {ok:false,reason:'El inventario debe abrirse y cerrarse realmente'};
      if(id==='craft')return {ok:false,reason:'La fabricación requiere verificar fórmula e inventario'};
      if(id==='compare')return {ok:false,reason:'Elegí una de las dos fabricaciones'};
      if(id==='complete')return {ok:false,reason:'El recorrido ya terminó'};
      if(id==='door')state.doorOpened=true;
      if(['debris','anvil','bellows','flue','forge'].includes(id))state.repairs.push(id);
      if(id==='forge')state.forgeHot=true;
      if(id==='mentor-key')state.key=true;
      if(id==='chest') {
        if(!state.key||state.chestOpen)return {ok:false,reason:'El baúl requiere la llave'};
        const expected=preparation.rawStock(session.requiredStock||session.stock);
        state.inventory={...expected};
        state.chestOpen=true;
      }
      state.step++;
      save();
      return {ok:true,id,next:goalAfter(),dialogue:copy[id]||null,snapshot:snapshot()};
    }
    function goalAfter(){return state?DEFINITIONS[state.step]:null}
    function openInventory(){
      if(!state||!state.chestOpen)return {ok:false,reason:'El baúl todavía está cerrado'};
      if(state.step===9){state.inventoryOpened=true;save()}
      return {ok:true,snapshot:snapshot()};
    }
    function closeInventory(){
      if(!state||!state.chestOpen)return {ok:false,reason:'El inventario no está habilitado'};
      if(state.step===9&&state.inventoryOpened){state.step=10;save();return{ok:true,advanced:true,dialogue:copy.inventory,snapshot:snapshot()}}
      save();return {ok:true,advanced:false,snapshot:snapshot()};
    }
    function recipe(){return session?.formulas?.espada_hierro||null}
    function craft(){
      if(!state||![10,11].includes(state.step))return{ok:false,reason:'La fabricación no está habilitada'};
      if(!state.chestOpen)return {ok:false,reason:'Falta abrir el baúl'};
      const formula=recipe();
      if(!preparation.ready(formula,state.inventory)){
        return {ok:false,reason:'Materiales insuficientes o sin refinar',
          missing:preparation.shortages?.(formula,state.inventory)?.filter(x=>x.missing>0)||[]};
      }
      const craftNo=state.step===10?1:2;
      const previous=state.items.at(-1),usedNames=new Set(state.items.map(x=>x.name.toLocaleLowerCase()));
      let item=null;
      for(let attempt=0;attempt<24;attempt++){
        const seed=(state.seed+Math.imul(craftNo*191,104729)+Math.imul(attempt+1,2654435761))>>>0;
        const candidate=engine.fabricate('espada_hierro',{craft:craftNo,seed,artisan:'Artesano del prototipo',formula});
        if(!previous||JSON.stringify(candidate.channels)!==JSON.stringify(previous.channels)){
          item=engine.present(candidate,usedNames);
          break;
        }
      }
      if(!item)throw Error('No se pudo resolver una fabricación distinta');
      // Actual inventory transfer is atomic and is performed once the result exists.
      const stock={...state.inventory};
      for(const m of formula.materials){
        if(!Number.isSafeInteger(m.qty)||m.qty<1||!Number.isSafeInteger(stock[m.material])||stock[m.material]<m.qty)
          return{ok:false,reason:'El inventario cambió durante la fabricación'};
        stock[m.material]-=m.qty;
      }
      state.inventory=stock;
      state.items.push(item);
      state.step=craftNo===1?11:12;
      save();
      return{ok:true,item,dialogue:copy.craft,snapshot:snapshot()};
    }
    function compare(){
      if(!state||state.step<12||state.items.length!==2)return null;
      return state.items.map(x=>JSON.parse(JSON.stringify(x)));
    }
    function choose(index){
      if(!state||state.step!==12||state.items.length!==2||![0,1].includes(index))return{ok:false,reason:'Comparación no disponible'};
      state.selection=index;state.step=13;save();
      return{ok:true,chosen:state.items[index],snapshot:snapshot()};
    }
    return Object.freeze({VERSION,KEY,definitions:DEFINITIONS,start,resume,startOrResume,hasSave,clear,snapshot,goal,step,inventory,onInventoryChanged,doAction,openInventory,closeInventory,recipe,craft,compare,choose,session:()=>session});
  }
  return Object.freeze({VERSION,KEY,DEFINITIONS,create});
});