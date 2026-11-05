/* Identical NGE Alpha engine extracted from the original root/index.html. No gameplay rebalancing. */

/* Project Genesis · Items + NGE Alpha reducido para el PROTOTIPO v0.11.
   v0.11: naming por tablas internas con semilla derivada de timestamp; sin historial NGE persistente entre ejecuciones.
   Conserva criterios canónicos de Daño/Protección, rareza por canales y pool Nivel 1 auditados.
   Pipeline: fórmula procedural de sesión -> fabricación mecánica -> cierre -> NGE.
   Materiales: subconjunto del catálogo canónico de Materiales Básicos de Nivel 1.
   Cantidades: perfil controlado del prototipo; NO balance canónico definitivo.
   VT: fallback neutro 1:1 sólo para demostrar la arquitectura; NO tabla canónica. */
(()=>{"use strict";
const AFF=["Luz","Sombra","Fuego","Hielo","Naturaleza","Tierra","Rayo"];
const RAR={1:"Inútil",2:"Común",3:"Bueno",4:"Excelente",5:"Raro",6:"Épico",7:"Legendario",8:"Mítico"};
const REC={
 espada_hierro:{name:"Espada de hierro",profession:"Herrero",type:"Espada",base:"Daño",mechanic:"damage",elementalMode:"percent_of_base",family:1},
 escudo_hierro:{name:"Escudo de hierro",profession:"Herrero",type:"Escudo",base:"Protección",mechanic:"protection",elementalMode:"elemental_percent",family:2},
 armadura_cuero:{name:"Armadura de cuero",profession:"Curtidor",type:"Armadura",base:"Protección",mechanic:"protection",elementalMode:"elemental_percent",family:1},
 botas_cuero:{name:"Botas de cuero",profession:"Curtidor",type:"Botas",base:"Protección",mechanic:"protection",elementalMode:"elemental_percent",family:2}
};
const FAMILY_BY_PROF={Herrero:["espada_hierro","escudo_hierro"],Curtidor:["armadura_cuero","botas_cuero"]};
/* Fórmulas de demostración: sólo usan el pool canónico de Materiales Básicos de Nivel 1.
   Las cantidades/selección concreta siguen siendo perfil de prototipo y NO receta/balance canónico. */
const FORMULA_PROFILE={
 espada_hierro:{slots:[{role:"principal",pool:["Lingote de hierro"],min:2,max:3},{role:"proceso",pool:["Carbón vegetal"],min:1,max:2},{role:"secundario",pool:["Cuero bovino curtido","Cuero caprino curtido","Cordel de cáñamo","Hilo de lino"],min:1,max:2},{role:"secundario",pool:["Madera seca de fresno","Madera seca de roble"],min:1,max:1}]},
 escudo_hierro:{slots:[{role:"principal",pool:["Lingote de hierro"],min:2,max:4},{role:"secundario",pool:["Madera seca de roble","Madera seca de fresno"],min:2,max:3},{role:"secundario",pool:["Cuero bovino curtido","Cuero caprino curtido","Cordel de cáñamo","Hilo de lino"],min:1,max:2}]},
 armadura_cuero:{slots:[{role:"principal",pool:["Cuero bovino curtido","Cuero caprino curtido"],min:3,max:5},{role:"secundario",pool:["Hilo de lino","Cordel de cáñamo"],min:1,max:2},{role:"secundario",pool:["Tela de lino"],min:1,max:2}]},
 botas_cuero:{slots:[{role:"principal",pool:["Cuero bovino curtido","Cuero caprino curtido"],min:2,max:3},{role:"secundario",pool:["Hilo de lino","Cordel de cáñamo"],min:1,max:2},{role:"secundario",pool:["Tela de lino"],min:1,max:1}]}
};
// VT canónico de Nivel 1 sigue pendiente. El 1:1 preserva arquitectura sin afirmar balance.
const VT_PROTOTYPE=Object.freeze({
 "Lingote de hierro":1,"Carbón vegetal":1,"Cuero bovino curtido":1,"Cuero caprino curtido":1,
 "Hilo de lino":1,"Cordel de cáñamo":1,"Tela de lino":1,"Madera seca de fresno":1,"Madera seca de roble":1
});
const VT_PROFILE_MODE="PROTOTYPE_NEUTRAL_FALLBACK";
const FORMS={
 Espada:["Espada","Hoja","Filo"],
 Escudo:["Escudo","Baluarte","Égida"],
 Armadura:["Armadura","Coraza","Vestidura"],
 Botas:["Botas","Calzado"]
};
/* NGE reducido de la demo: recupera las 9 bandas lingüísticas del NGE de ítems.
   Estas bandas interpretan intensidades YA RESUELTAS; nunca deciden mecánicas. */
const NARRATIVE_BANDS=Object.freeze([
 {min:1,max:5,label:"Traza"},{min:6,max:10,label:"Débil"},{min:11,max:20,label:"Presente"},
 {min:21,max:35,label:"Marcada"},{min:36,max:50,label:"Intensa"},{min:51,max:65,label:"Potente"},
 {min:66,max:80,label:"Extrema"},{min:81,max:99.99,label:"Extraordinaria"},{min:100,max:100,label:"Absoluta"}
]);
function narrativeLevel(v){v=Number(v)||1;for(let i=0;i<NARRATIVE_BANDS.length;i++)if(v>=NARRATIVE_BANDS[i].min&&v<=NARRATIVE_BANDS[i].max)return i;return v>=100?8:0}
function narrativeBand(v){return NARRATIVE_BANDS[narrativeLevel(v)]}
const BASE_LEX={
 "Daño":[
  ["del Temple Frágil","del Temple Vacilante","de la Marca Leve"],
  ["del Corte Modesto","del Temple Irregular","del Filo Inseguro"],
  ["del Hierro Firme","del Golpe Mesurado","del Corte Honesto"],
  ["del Corte Seguro","del Temple Robusto","de la Mano Firme"],
  ["del Golpe Profundo","del Temple Tenaz","de la Fuerza Forjada"],
  ["del Impacto Poderoso","del Golpe Dominante","del Hierro Implacable"],
  ["del Golpe Colosal","de la Ruptura","del Corte Devastador"],
  ["de la Fuerza Titánica","del Golpe Inquebrantable","del Temple Soberano"],
  ["del Golpe Perfecto","de la Fuerza Absoluta","del Temple Primordial"]
 ],
 "Protección":[
  ["del Resguardo Frágil","de la Cobertura Leve","del Amparo Escaso"],
  ["del Resguardo Modesto","de la Guarda Irregular","del Amparo Débil"],
  ["de la Guarda Firme","del Resguardo Honesto","de la Cobertura Segura"],
  ["del Amparo Robusto","de la Guarda Estable","del Resguardo Marcado"],
  ["de la Protección Profunda","del Amparo Tenaz","de la Guarda Intensa"],
  ["del Baluarte Poderoso","de la Guarda Dominante","del Amparo Implacable"],
  ["de la Protección Colosal","del Baluarte Extremo","de la Guarda Inamovible"],
  ["del Resguardo Titánico","del Baluarte Soberano","de la Guarda Inquebrantable"],
  ["de la Protección Absoluta","del Amparo Perfecto","del Baluarte Primordial"]
 ]
};
const LEX={
 Luz:[
  ["de Luz Tenue","del Primer Destello","del Brillo Pálido"],["de la Claridad Suave","del Alba Leve","del Resplandor Naciente"],["del Alba Radiante","del Resplandor","de la Luz Serena"],
  ["de la Luz Centelleante","del Día Áureo","del Halo Radiante"],["del Fulgor","de la Luz Refulgente","del Esplendor"],["del Fulgor Intenso","del Sol Ascendente","de la Claridad Ardiente"],
  ["del Sol Implacable","del Mediodía","de la Luz Fulgurante"],["del Sol Eterno","de la Luz Celestial","del Alba Soberana"],["de la Luz Absoluta","del Primer Sol","del Fulgor Primordial"]
 ],
 Sombra:[
  ["de Sombra Tenue","de la Penumbra Leve","del Ocaso Pálido"],["de la Penumbra","del Velo Sombrío","de la Noche Joven"],["de la Sombra","del Ocaso","del Velo Umbrío"],
  ["de la Noche Cerrada","de la Sombra Profunda","del Eclipse Parcial"],["del Eclipse","de la Oscuridad","del Manto Tenebroso"],["de la Noche Profunda","del Vacío Umbrío","del Eclipse Negro"],
  ["del Abismo","de la Noche Sin Luna","de la Sombra Devastadora"],["de la Noche Eterna","del Abismo Soberano","del Eclipse Final"],["de la Sombra Absoluta","de la Noche Primordial","del Vacío Primero"]
 ],
 Fuego:[
  ["del Ascua Tenue","de la Brasa Pálida","del Primer Calor"],["de la Brasa","de la Llama Joven","del Rescoldo"],["de la Llama","del Fuego Vivo","del Calor Ardiente"],
  ["de la Llama Voraz","del Fuego Ígneo","de la Brasa Roja"],["del Fuego Incandescente","de la Forja Ardiente","de la Llama Intensa"],["del Incendio","de la Llama Abrasadora","del Crisol Rojo"],
  ["del Fuego Devastador","de la Pira","de la Llama Implacable"],["del Fuego Eterno","del Sol Incendiado","de la Llama Soberana"],["del Fuego Absoluto","de la Primera Llama","del Incendio Primordial"]
 ],
 Hielo:[
  ["de la Escarcha","del Frío Tenue","del Primer Hielo"],["de la Helada","del Invierno Leve","del Cristal Frío"],["de la Ventisca","del Hielo","del Invierno"],
  ["del Témpano","del Frío Gélido","de la Escarcha Profunda"],["del Hielo Glacial","de la Ventisca Blanca","del Frío Intenso"],["del Corazón Glaciar","de la Tormenta Blanca","del Invierno Profundo"],
  ["de la Gran Ventisca","del Glaciar","del Frío Implacable"],["del Invierno Eterno","del Glaciar Soberano","de la Nieve Sin Fin"],["del Hielo Absoluto","del Primer Invierno","del Frío Primordial"]
 ],
 Naturaleza:[
  ["del Brote","de la Savia Tenue","de la Espina Joven"],["de la Raíz","de la Hoja Verde","de la Savia"],["de la Espina","del Bosque Joven","de la Rama Viva"],
  ["de la Raíz Profunda","de la Savia Viva","del Ramaje Verde"],["del Bosque","de la Espina Firme","de la Vida Salvaje"],["del Roble Ancestral","de la Raíz Dominante","de la Savia Intensa"],
  ["de la Selva Implacable","de las Mil Espinas","del Ramaje Indómito"],["del Bosque Eterno","de la Vida Ancestral","de la Raíz Soberana"],["de la Naturaleza Absoluta","de la Primera Raíz","de la Vida Primordial"]
 ],
 Tierra:[
  ["del Polvo","de la Piedra Leve","del Primer Guijarro"],["de la Piedra","del Suelo Firme","del Mineral Pálido"],["de la Roca","del Mineral","de la Tierra Firme"],
  ["del Granito","de la Piedra Profunda","del Suelo Inmóvil"],["de la Montaña","de la Roca Intensa","del Mineral Pesado"],["del Corazón de Piedra","de la Roca Dominante","de la Montaña Profunda"],
  ["del Monolito","de la Montaña Implacable","de la Tierra Devastadora"],["de la Cordillera Eterna","del Monolito Soberano","de la Roca Ancestral"],["de la Tierra Absoluta","de la Primera Montaña","del Mundo Primordial"]
 ],
 Rayo:[
  ["de la Chispa","de la Carga Tenue","del Primer Destello"],["de la Centella Leve","de la Estática","del Chisporroteo"],["de la Centella","del Relámpago","de la Carga Viva"],
  ["del Trueno","del Rayo Azul","de la Descarga"],["de la Tormenta","del Relámpago Intenso","del Trueno Profundo"],["de la Tempestad","del Rayo Dominante","de la Tormenta Eléctrica"],
  ["del Cielo Partido","de la Tempestad Implacable","del Gran Trueno"],["de la Tormenta Eterna","del Rayo Soberano","del Cielo Furioso"],["del Rayo Absoluto","de la Primera Tormenta","del Trueno Primordial"]
 ]
};
/* Cada material posee 4 lecturas de peso relativo x 4 variantes lingüísticas.
   El texto describe presencia/peso en la fórmula, no añade propiedades mecánicas. */
const MAT={
 "Lingote de hierro":[["del Hierro","del Metal Gris","de la Forja de Hierro","del Hierro Simple"],["del Hierro Forjado","del Hierro Templado","del Hierro Batido","de la Forja Firme"],["del Hierro Denso","del Metal Forjado","del Hierro Reforzado","de la Forja Cerrada"],["del Hierro Dominante","del Hierro Pesado","del Metal Macizo","de la Forja Profunda"]],
 "Carbón vegetal":[["de la Brasa Negra","del Carbón Vegetal","de la Forja Negra","del Rescoldo de Forja"],["del Carbón de Forja","de la Brasa Viva","del Rescoldo Firme","de la Forja al Carbón"],["de la Forja Oscura","del Carbón Intenso","de la Brasa Profunda","del Temple al Carbón"],["de la Forja Profunda","de la Brasa Dominante","del Carbón Pesado","del Crisol Oscuro"]],
 "Cuero bovino curtido":[["del Cuero Bovino","de la Piel Bovina","del Curtido Bovino","de la Piel Tratada"],["del Cuero Bovino Firme","de la Piel Bovina Curtida","del Curtido Firme","de la Piel Bovina Tensada"],["del Cuero Bovino Denso","de la Piel Bovina Reforzada","del Curtido Denso","de la Piel Bovina Cerrada"],["del Cuero Bovino Robusto","de la Piel Bovina Dominante","del Curtido Profundo","de la Piel Bovina Pesada"]],
 "Cuero caprino curtido":[["del Cuero Caprino","de la Piel Caprina","del Curtido Caprino","de la Piel Tratada"],["del Cuero Caprino Firme","de la Piel Caprina Curtida","del Curtido Firme","de la Piel Caprina Tensada"],["del Cuero Caprino Denso","de la Piel Caprina Reforzada","del Curtido Denso","de la Piel Caprina Cerrada"],["del Cuero Caprino Robusto","de la Piel Caprina Dominante","del Curtido Profundo","de la Piel Caprina Pesada"]],
 "Hilo de lino":[["del Hilo de Lino","del Lino Trenzado","de la Hebra de Lino","del Lino Simple"],["del Lino Firme","del Hilo de Lino Tensado","de la Hebra Firme","del Trenzado de Lino"],["del Lino Reforzado","del Hilo de Lino Denso","de la Hebra Reforzada","del Trenzado Cerrado"],["del Lino Dominante","del Hilo de Lino Cerrado","de la Hebra Profunda","del Trenzado Pesado"]],
 "Cordel de cáñamo":[["del Cordel de Cáñamo","del Cáñamo Trenzado","de la Fibra de Cáñamo","del Cáñamo Simple"],["del Cáñamo Firme","del Cordel Tensado","de la Fibra Firme","del Trenzado de Cáñamo"],["del Cáñamo Reforzado","del Cordel Denso","de la Fibra Reforzada","del Trenzado Cerrado"],["del Cáñamo Dominante","del Cordel Cerrado","de la Fibra Profunda","del Trenzado Pesado"]],
 "Tela de lino":[["de la Tela de Lino","del Tejido de Lino","de la Trama de Lino","del Lino Tejido"],["de la Tela Firme","del Tejido Tensado","de la Trama Firme","del Lino Cerrado"],["de la Tela Reforzada","del Tejido Denso","de la Trama Reforzada","del Lino Compacto"],["de la Tela Dominante","del Tejido Cerrado","de la Trama Profunda","del Lino Pesado"]],
 "Madera seca de fresno":[["del Fresno Seco","de la Madera de Fresno","de la Veta de Fresno","del Fresno Preparado"],["del Fresno Firme","del Fresno Secado","de la Veta Firme","de la Madera de Fresno Tensada"],["del Fresno Reforzado","de la Veta de Fresno","de la Madera de Fresno Densa","del Fresno Cerrado"],["del Fresno Dominante","de la Madera de Fresno Densa","de la Veta Profunda","del Fresno Pesado"]],
 "Madera seca de roble":[["del Roble Seco","de la Madera de Roble","de la Veta de Roble","del Roble Preparado"],["del Roble Firme","del Roble Secado","de la Veta Firme","de la Madera de Roble Tensada"],["del Roble Reforzado","de la Veta de Roble","de la Madera de Roble Densa","del Roble Cerrado"],["del Roble Dominante","de la Madera de Roble Densa","de la Veta Profunda","del Roble Pesado"]]
};
const MAT_SECOND={
 "Lingote de hierro":["con Hierro","con refuerzo de Hierro","con nervio de Hierro","con estructura de Hierro"],"Carbón vegetal":["con Brasa de Forja","con temple al Carbón","con Carbón de Forja","con Rescoldo"],
 "Cuero bovino curtido":["con Cuero Bovino","con refuerzo Bovino","con Piel Bovina","con curtido Bovino"],"Cuero caprino curtido":["con Cuero Caprino","con refuerzo Caprino","con Piel Caprina","con curtido Caprino"],
 "Hilo de lino":["con Hilo de Lino","con trama de Lino","con hebra de Lino","con costura de Lino"],"Cordel de cáñamo":["con Cordel de Cáñamo","con trama de Cáñamo","con fibra de Cáñamo","con amarre de Cáñamo"],"Tela de lino":["con Tela de Lino","con tejido de Lino","con trama de Lino","con paño de Lino"],
 "Madera seca de fresno":["con Fresno","con núcleo de Fresno","con veta de Fresno","con refuerzo de Fresno"],"Madera seca de roble":["con Roble","con núcleo de Roble","con veta de Roble","con refuerzo de Roble"]
};

/* NGE DEMO: no usa firmas inventadas. La diversidad nominal debe surgir de hechos reales del objeto:
   forma, intensidad base, materiales elegidos por la fórmula y cantidades de esos materiales. */
const NGE_TEMPLATE_COUNT=Object.freeze({Inútil:8,Común:8,Bueno:8});
function normalizeNgeName(name){return String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLocaleLowerCase()}
/* DEMO STANDALONE: el timestamp es la raíz de entropía. No existe registro global entre ejecuciones.
   Un contador monotónico evita que dos operaciones del mismo milisegundo compartan la misma raíz. */
const NGE_DEMO_BOOT_TIMESTAMP=Date.now();
let NGE_DEMO_SEED_COUNTER=0;
function ngeLexicalStats(){
 const forms=Object.values(FORMS).reduce((s,a)=>s+a.length,0),base=Object.values(BASE_LEX).reduce((s,levels)=>s+levels.reduce((x,a)=>x+a.length,0),0),aff=Object.values(LEX).reduce((s,levels)=>s+levels.reduce((x,a)=>x+a.length,0),0),mat=Object.values(MAT).reduce((s,levels)=>s+levels.reduce((x,a)=>x+a.length,0),0),mat2=Object.values(MAT_SECOND).reduce((s,a)=>s+a.length,0);
 return{forms,base,aff,mat,mat2,total:forms+base+aff+mat+mat2}
}
function ngeTheoreticalNames(){
 const affPer=LEX[AFF[0]].reduce((s,a)=>s+a.length,0),basePer=BASE_LEX.Daño.reduce((s,a)=>s+a.length,0);let total=0;
 for(const [id,rec] of Object.entries(REC)){
  const formCount=FORMS[rec.type].length,materials=new Set(FORMULA_PROFILE[id].slots.flatMap(s=>s.pool)),materialVariants=[...materials].reduce((s,m)=>s+(MAT[m]?.reduce((x,a)=>x+a.length,0)||0),0);
  const inutil=formCount*basePer*materialVariants*NGE_TEMPLATE_COUNT.Inútil;
  const comun=formCount*AFF.length*affPer*materialVariants*NGE_TEMPLATE_COUNT.Común;
  const bueno=formCount*((AFF.length*(AFF.length-1))/2)*affPer*affPer*materialVariants*NGE_TEMPLATE_COUNT.Bueno;
  total+=inutil+comun+bueno
 }
 return Math.round(total)
}
function hash(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296}}
function randomSeed(){
 const now=Date.now(),perf=(typeof performance!=="undefined"&&performance.now)?Math.floor(performance.now()*1000):0;
 NGE_DEMO_SEED_COUNTER=(NGE_DEMO_SEED_COUNTER+1)>>>0;
 return hash(`${NGE_DEMO_BOOT_TIMESTAMP}|${now}|${perf}|${NGE_DEMO_SEED_COUNTER}`)>>>0
}
function ri(r,a,b){return a+Math.floor(r()*(b-a+1))}
function round2(v){return Math.round((Number(v)+Number.EPSILON)*100)/100}
function intensity(r){return round2(1+r()*99)}
function pick(r,a){return a[Math.floor(r()*a.length)]}
function cloneFormula(f){return{id:f.id,sessionSeed:f.sessionSeed,materials:f.materials.map(x=>({...x})),signature:f.signature}}
function buildFormula(id,sessionSeed){const profile=FORMULA_PROFILE[id];if(!profile)throw Error("formula profile");const r=rng(hash(`${sessionSeed}|formula|${id}`)),materials=profile.slots.map(slot=>({role:slot.role,material:pick(r,slot.pool),qty:ri(r,slot.min,slot.max)})),signature=materials.map(m=>`${m.role}:${m.material}:${m.qty}`).join("|");return{id,sessionSeed,materials,signature}}
function generateSession(profession,{seed=randomSeed()}={}){const ids=FAMILY_BY_PROF[profession];if(!ids)throw Error("profession");const formulas={};for(const id of ids)formulas[id]=buildFormula(id,seed);// El lote de regalo del Herrero cubre SOLO las dos primeras espadas.
 // La semilla sigue generando y conservando ambas recetas; los escudos se abastecen en el mercado.
 const starterIds=profession==="Herrero"?["espada_hierro"]:ids;
 const requiredStock={};for(const id of starterIds)for(const m of formulas[id].materials)requiredStock[m.material]=(requiredStock[m.material]||0)+m.qty*2;
 const stock={...requiredStock};return{id:`${profession.slice(0,3).toUpperCase()}-${seed.toString(16).padStart(8,"0").toUpperCase()}`,profession,seed,formulas,requiredStock,stock}}
const PROTOTYPE_LEVEL_GLOBAL=1;
const PROTOTYPE_LEVEL1_MAX_CHANNELS=3;
/* DS-007 deja pendiente la curva exacta de umbrales. Estos enteros son SOLO perfil de demostración
   para poder recorrer la cadena Base -> afinidad -> afinidad sin canonizar probabilidades. */
const DEMO_CHANNEL_THRESHOLDS=Object.freeze([56,72]);
/* BLOQUEO PEDAGÓGICO DE ESTA DEMO (NO REGLA CANÓNICA DEL JUEGO FINAL):
   - fabricación 1: Inútil obligatoria, para presentar Canal Base aislado;
   - fabricación 2: Común o Bueno obligatoria, para hacer visible la proceduralidad/afinidades.
   El bloqueo NO salta la cadena DS-007: condiciona las intensidades de esta muestra para que
   los umbrales conduzcan legítimamente al número de canales que la demo necesita enseñar. */
const DEMO_PEDAGOGICAL_LOCK=Object.freeze({first:'Inútil',second:Object.freeze(['Común','Bueno'])});
function intensityBetween(r,min,max){return round2(min+r()*(max-min))}
function resolvePrototypeChannels(rec,r,craft){
 const pool=[...AFF],channels=[];
 if(craft===1){
  // Debe fallar el primer umbral: sólo Canal Base => Inútil.
  channels.push([rec.base,intensityBetween(r,1,DEMO_CHANNEL_THRESHOLDS[0]-.01)]);
  return channels
 }
 // Segunda fabricación: el Canal Base debe habilitar al menos una afinidad.
 channels.push([rec.base,intensityBetween(r,DEMO_CHANNEL_THRESHOLDS[0],100)]);
 const firstName=pool.splice(Math.floor(r()*pool.length),1)[0];
 const makeGood=r()>=.5;
 const firstAffinity=makeGood
  ? intensityBetween(r,DEMO_CHANNEL_THRESHOLDS[1],100)
  : intensityBetween(r,1,DEMO_CHANNEL_THRESHOLDS[1]-.01);
 channels.push([firstName,firstAffinity]);
 if(makeGood&&channels.length<PROTOTYPE_LEVEL1_MAX_CHANNELS){
  const secondName=pool.splice(Math.floor(r()*pool.length),1)[0];
  channels.push([secondName,intensity(r)])
 }
 return channels
}
function fabricate(id,{craft=1,seed=randomSeed(),artisan="artesano",formula=null}={}){const rec=REC[id];if(!rec)throw Error("recipe");if(craft!==1&&craft!==2)throw Error("craft");if(!formula||formula.id!==id)throw Error("session formula required");const r=rng(hash(`${seed}|${id}`)),channels=resolvePrototypeChannels(rec,r,craft),base=channels[0],aff=channels.slice(1);return{id:`proto-${id}-${seed.toString(16)}`,recipe:id,artisan,seed,craft,family:rec.family,profession:rec.profession,levelGlobal:PROTOTYPE_LEVEL_GLOBAL,formula:cloneFormula(formula),base:[...base],affinities:aff.map(x=>[...x]),channels:channels.map(x=>[...x]),rarity:RAR[channels.length]}}
function materialLevel(effectiveWeight,share){if(effectiveWeight>=5||share>=.72)return 3;if(effectiveWeight>=3||share>=.54)return 2;if(effectiveWeight>=2||share>=.34)return 1;return 0}
function materialQuantityLevel(qty,share){
 qty=Number(qty)||1;share=Number(share)||0;
 if(qty>=4||share>=.55)return 3;
 if(qty>=3||share>=.40)return 2;
 if(qty>=2||share>=.25)return 1;
 return 0
}
/* Ruleta ponderada por CANTIDAD REAL de la fórmula. Sin reemplazo:
   - más unidades => más posibilidades de salir antes;
   - cantidades iguales => exactamente el mismo peso; la semilla desempata;
   - una vez elegido un material, sale del pool y no puede repetirse en esa lectura. */
function weightedMaterialOrder(item,r){
 const pool=(item.formula?.materials||[]).filter(m=>MAT[m.material]).map(m=>({...m,weight:Math.max(1,Number(m.qty)||1)})),order=[];
 while(pool.length){
  const total=pool.reduce((sum,m)=>sum+m.weight,0);let roll=r()*total,index=pool.length-1;
  for(let i=0;i<pool.length;i++){roll-=pool[i].weight;if(roll<0){index=i;break}}
  order.push(pool.splice(index,1)[0])
 }
 return order
}
function secondaryMaterialFragment(material,r){
 const list=MAT_SECOND[material.material]||[];
 return list.length?pick(r,list):''
}
function materialFragments(item,r){
 const order=weightedMaterialOrder(item,r),totalQty=order.reduce((sum,m)=>sum+(Number(m.qty)||0),0);
 if(!order.length)return{primary:'',secondary:'',tertiary:'',quaternary:'',order:[],totalQty:0};
 const first=order[0],firstShare=(Number(first.qty)||1)/Math.max(1,totalQty),level=materialQuantityLevel(first.qty,firstShare);
 const primary=pick(r,MAT[first.material][level]);
 const secondary=order[1]?secondaryMaterialFragment(order[1],r):'';
 const tertiary=order[2]?secondaryMaterialFragment(order[2],r):'';
 return{primary,secondary,tertiary,order,totalQty}
}
function joinSecondaryMaterials(...parts){
 const clean=parts.filter(Boolean).map(x=>String(x).replace(/^con\s+/i,''));
 if(!clean.length)return'';
 if(clean.length===1)return`con ${clean[0]}`;
 return`con ${clean.slice(0,-1).join(', ')} y ${clean[clean.length-1]}`
}
function channelFragments(item,r){const entries=[{name:item.base[0],value:item.base[1],kind:"base",fragment:pick(r,BASE_LEX[item.base[0]][narrativeLevel(item.base[1])])},...item.affinities.map(([name,value])=>({name,value,kind:"affinity",fragment:pick(r,LEX[name][narrativeLevel(value)])}))];entries.sort((a,b)=>b.value-a.value||(a.kind==="affinity"?-1:1)||a.name.localeCompare(b.name));return entries}
function _nameCandidates(item,r){
 const rec=REC[item.recipe],form=pick(r,FORMS[rec.type]),mf=materialFragments(item,r),baseFrag=pick(r,BASE_LEX[item.base[0]][narrativeLevel(item.base[1])]),sortedAff=[...item.affinities].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 if(sortedAff.length===0){
  /* Inútil: tres lecturas materiales REALES. El orden sale de una ruleta por cantidad sin reemplazo.
     Si dos materiales tienen la misma cantidad, ambos poseen exactamente la misma probabilidad de ocupar cada posición. */
  const materialTail=joinSecondaryMaterials(mf.secondary,mf.tertiary);
  const materialTailAlt=joinSecondaryMaterials(mf.tertiary,mf.secondary);
  const options=[
   `${form} ${baseFrag} ${mf.primary} ${materialTail}`,
   `${form} ${mf.primary} ${baseFrag} ${materialTail}`,
   `${form} ${mf.primary} ${materialTail} ${baseFrag}`,
   `${form} ${baseFrag} ${materialTail} ${mf.primary}`,
   `${form} ${materialTailAlt} ${baseFrag} ${mf.primary}`,
   `${form} ${materialTail} ${mf.primary} ${baseFrag}`,
   `${form} ${baseFrag} ${mf.primary} ${materialTailAlt}`,
   `${form} ${materialTailAlt} ${mf.primary} ${baseFrag}`
  ];
  return [...new Set(options.map(x=>x.replace(/\s+/g,' ').trim()))]
 }
 const a1=_fragmentForPrototypeAffinity(sortedAff[0][0],sortedAff[0][1],r),materialTail=joinSecondaryMaterials(mf.secondary,mf.tertiary);
 if(sortedAff.length===1){
  const options=[`${form} ${a1} ${mf.primary}`,`${form} ${a1} ${mf.primary} ${materialTail}`,`${form} ${mf.primary} ${a1} ${materialTail}`,`${form} ${a1} ${baseFrag} ${mf.primary}`,`${form} ${mf.primary} ${a1} ${baseFrag}`,`${form} ${baseFrag} ${a1} ${mf.primary}`,`${form} ${a1} ${materialTail} ${mf.primary}`,`${form} ${materialTail} ${a1} ${mf.primary}`];
  return [...new Set(options.map(x=>x.replace(/\s+/g,' ').trim()))]
 }
 const a2=_fragmentForPrototypeAffinity(sortedAff[1][0],sortedAff[1][1],r);
 const options=[`${form} ${a1} ${a2} ${mf.primary}`,`${form} ${a1} ${mf.primary} ${a2} ${materialTail}`,`${form} ${mf.primary} ${a1} ${a2}`,`${form} ${a1} ${a2} ${baseFrag}`,`${form} ${baseFrag} ${a1} ${a2} ${mf.primary}`,`${form} ${a1} ${materialTail} ${a2}`,`${form} ${mf.primary} ${a1} ${a2} ${materialTail}`,`${form} ${a1} ${a2} ${mf.primary} ${materialTail}`];
 return [...new Set(options.map(x=>x.replace(/\s+/g,' ').trim()))]
}
function present(item,used=new Set()){
 const formulaSig=item.formula?.signature||"",occupied=new Set();
 for(const n of used||[])occupied.add(normalizeNgeName(n));
 /* La semilla mecánica del objeto deriva del timestamp/counter de esta ejecución.
    NGE sólo la usa para recorrer tablas lingüísticas; no decide ninguna mecánica. */
 for(let attempt=0;attempt<8192;attempt++){
  const r=rng(hash(`${item.seed}|${item.recipe}|${formulaSig}|${JSON.stringify(item.channels)}|nge-v4-qty|${attempt}`)),candidates=_nameCandidates(item,r),start=Math.floor(r()*candidates.length);
  for(let offset=0;offset<candidates.length;offset++){
   const name=candidates[(start+offset)%candidates.length],norm=normalizeNgeName(name);
   if(!norm||occupied.has(norm))continue;
   const shortChannels=item.channels.map(([n,v],i)=>i===0?`${n} ${v}`:`${n} +${v}%`).join(" · "),bands=item.channels.map(([n,v])=>`${n}: ${narrativeBand(v).label}`).join(" · ");
   return{...item,name,description:`Resultado certificado · ${item.rarity} · ${shortChannels}`,naming:{engine:"NGE_DEMO_REDUCED_V4",bands,seedMode:"timestamp+counter+object",antiRepeat:"sesión"}}
  }
 }
 throw Error("NGE name space exhausted for this item signature")
}
function _fragmentForPrototypeAffinity(name,value,r){return pick(r,LEX[name][narrativeLevel(value)])}
function selfTest(N=10000){
 let invalid=0,dupeAffinity=0,badRarity=0,badRange=0,overLevel1=0,badDemoFirst=0,badDemoSecond=0;
 const sessions={Herrero:generateSession("Herrero",{seed:123456}),Curtidor:generateSession("Curtidor",{seed:654321})},ids=[...FAMILY_BY_PROF.Herrero,...FAMILY_BY_PROF.Curtidor];
 for(let i=1;i<=N;i++)for(const id of ids){const prof=REC[id].profession,f=generateSession(prof,{seed:(i*2654435761)>>>0}).formulas[id],it=fabricate(id,{craft:(i&1)+1,seed:(i*104729+hash(id))>>>0,formula:f}),names=it.affinities.map(a=>a[0]);if(it.channels.length<1||it.channels.length>3)invalid++;if(new Set(names).size!==names.length)dupeAffinity++;if(it.rarity!==RAR[it.channels.length])badRarity++;if(it.channels.some(c=>c[1]<1||c[1]>100||Math.abs(c[1]-round2(c[1]))>1e-9))badRange++;if(it.levelGlobal<=9&&it.channels.length>3)overLevel1++;if(it.craft===1&&it.rarity!=='Inútil')badDemoFirst++;if(it.craft===2&&!['Común','Bueno'].includes(it.rarity))badDemoSecond++}
 const stable=JSON.stringify(sessions.Herrero.formulas)===JSON.stringify(generateSession("Herrero",{seed:123456}).formulas)&&JSON.stringify(sessions.Curtidor.formulas)===JSON.stringify(generateSession("Curtidor",{seed:654321}).formulas);
 return{invalidChannelCounts:invalid,duplicateAffinityWithinItem:dupeAffinity,rarityMismatch:badRarity,intensityRangeOrPrecisionErrors:badRange,level1CeilingViolations:overLevel1,demoFirstMustBeUselessErrors:badDemoFirst,demoSecondMustBeCommonOrGoodErrors:badDemoSecond,formulaStableForSeed:stable,ok:invalid===0&&dupeAffinity===0&&badRarity===0&&badRange===0&&overLevel1===0&&badDemoFirst===0&&badDemoSecond===0&&stable}
}
const _ngeLex=ngeLexicalStats();const _ngeStats=Object.freeze({theoreticalNames:ngeTheoreticalNames(),lexicalFragments:_ngeLex.total,families:Object.keys(REC).length,materials:Object.keys(MAT).length,affinities:AFF.length,seedMode:"TIMESTAMP_DERIVED",mode:"REDUCED_TABLE_WEIGHTED_QTY_V4"});
window.GenesisPrototypeEngines=Object.freeze({recipes:REC,formulaProfiles:FORMULA_PROFILE,vtPrototype:VT_PROTOTYPE,vtProfileMode:VT_PROFILE_MODE,materialCount:Object.keys(VT_PROTOTYPE).length,levelGlobal:PROTOTYPE_LEVEL_GLOBAL,maxChannels:PROTOTYPE_LEVEL1_MAX_CHANNELS,demoThresholds:DEMO_CHANNEL_THRESHOLDS,demoPedagogicalLock:DEMO_PEDAGOGICAL_LOCK,ngeStats:_ngeStats,generateSession,fabricate,present,selfTest});
})();

