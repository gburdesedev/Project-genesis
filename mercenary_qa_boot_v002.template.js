/* Mercenary equipment QA v002 — non-shipping playtest. Requires explicit ?mercenary-qa=1.
 * This script is loaded inside the game module through an explicit hook.
 * Does not create fake items/rarities: validates real session stock & crafting engine.
 */
async function runMercenaryQABoot(){
 const QA=window.GenesisMercenaryQA={active:true,phase:'booting',steps:[],items:[],errors:[],emissive:false};
 const log=(phase,data={})=>{QA.phase=phase;QA.steps.push({phase,...data});console.info('[MERCENARY QA]',phase,data)};
 const demand=(ok,msg)=>{if(!ok)throw Error('QA assertion failed: '+msg)};
 const engine=window.GenesisPrototypeEngines,prep=window.GenesisPreparation;
 demand(engine&&prep,'Genesis original engines must load');
 try{
  log('loading-real-route');
  await chooseProfessionRoute('Herrero');
  demand(selectedProfession==='Herrero'&&!!craftSession,'gameplay session');
  const session=craftSession;
  log('procedural-session',{seed:session.seed,formulaSignatures:Object.fromEntries(Object.entries(session.formulas).map(([k,v])=>[k,v.signature]))});
  // This initializes route setup and removes physical tutorial obstacles
  // without pretending to perform user interactions.
  demand(debrisCleared&&auxCleared&&forgeHot,'workshop activation');
  workshopKey=true;chestOpen=true;chestLidTarget=-102;
  const expected=session.requiredStock;
  playerInventory=prep.rawStock(expected);
  log('chest-and-stock',{materials:structuredClone(playerInventory)});
  const ingots=Number(expected['Lingote de hierro']||0);
  if(ingots>0){
    const profile=prep.batchProfile(ingots);
    let progress=0,ticks=0;
    // Real thermal progression function at the ideal temperature: unattended
    // simulation, explicitly not an actual manual minigame playthrough.
    while(progress<100&&ticks<100000){
      progress=Math.min(100,progress+prep.progressGain(profile.target,profile.target,profile,.25));
      ticks++;
    }
    demand(progress===100,'thermal model must reach 100%');
    demand(prep.convert(playerInventory,ingots),'preparation must convert ore to ingots');
    log('thermal-preparation-simulated',{ingots,progress,ticks,effortMultiplier:profile.effortMultiplier});
  }
  demand(Object.entries(expected).every(([k,v])=>playerInventory[k]===v),'prepared material quantities match generated session');
  const desired={espada_hierro:{first:'Inútil',second:'Bueno'},escudo_hierro:{first:'Inútil',second:'Común'}};
  const order=[['espada_hierro',1,10],['espada_hierro',2,11],['escudo_hierro',1,12],['escudo_hierro',2,13]];
  for(const [recipe,craft,step] of order){
    setTutorialStep(step);
    const formula=formulaFor(recipe);
    demand(formula&&formula.id===recipe,'session formula '+recipe);
    demand(prep.ready(formula,playerInventory),'materials available '+recipe);
    demand(consumeFormula(formula),'real material consumption '+recipe);
    let raw=null,attempts=0,seed=0;
    const required=desired[recipe][craft===1?'first':'second'];
    for(attempts=0;attempts<1500;attempts++){
      seed=(Number(session.seed)+craft*1000003+(recipe==='espada_hierro'?0x10000000:0x20000000)+attempts*7919)>>>0;
      const candidate=engine.fabricate(recipe,{craft,seed,artisan:'Artesano del prototipo',formula});
      if(candidate.rarity===required){raw=candidate;break}
    }
    demand(raw,'expected rarity from procedural engine '+recipe+' '+required);
    const item=engine.present(raw,usedItemNames);
    usedItemNames.add(item.name.toLocaleLowerCase());
    craftedItems.push(item);
    log('fabrication',{recipe,craft,rarity:item.rarity,seed,channels:item.channels,name:item.name,formulaSignature:item.formula.signature,attempts:attempts+1});
    QA.items.push({id:item.id,recipe:item.recipe,rarity:item.rarity,name:item.name,seed,channels:item.channels});
  }
  demand(craftedItems.length===4,'two swords and two shields');
  demand(craftedItems.filter(i=>i.recipe==='espada_hierro').length===2,'2 swords');
  demand(craftedItems.filter(i=>i.recipe==='escudo_hierro').length===2,'2 shields');
  demand(craftedItems[1].rarity==='Bueno'&&craftedItems[3].rarity==='Común','required real rarities');
  demand(Object.entries(expected).every(([material,qty])=>Number(playerInventory[material]||0)===0),'all tutorial formulas consume generated quantities');
  refreshInventorySummary();
  // Start with the first real creations equipped, making the comparison useful.
  setTutorialStep(15);
  mercCandidate=0;
  await ensureMercenaryReady();
  applyMercCandidateVisual();
  mercSwordItem=craftedItems[0];mercShieldItem=craftedItems[2];
  demand(equipMercenaryCreations(),'real rig mounts equipped assets');
  log('equipped-world-model',{sword:mercSwordItem.name,shield:mercShieldItem.name});
  setTutorialStep(17);
  QA.emissive=true;
  const E_IDS=['mercSwordModel','mercShieldModel'];
  let lastPulse=0;
  // Subtle emissive on PBR material instances for both types; no new meshes
  // and no extra lights. Original mesh/rig mounting stays authoritative.
  const updateEmission=()=>{
    if(!mercGearAttached)return;
    const now=performance.now();
    if(now-lastPulse<160)return;lastPulse=now;
    const intensity=2.15+.28*Math.sin(now*.0025);
    E_IDS.forEach(id=>{
      const entity=mercNode(id)?.contentEntity;
      if(!entity)return;
      entity.findComponents('render').forEach(render=>render.meshInstances.forEach(mi=>{
        const m=mi.material;
        if(!m||!m.emissive)return;
        if(Math.abs((m.emissiveIntensity||0)-intensity)>.015){
          m.emissiveIntensity=intensity;
          m.update?.();
        }
      }));
    });
  };
  appEl.app.on('update',updateEmission);
  QA.stopEmission=()=>appEl.app.off('update',updateEmission);
  // Directly enter interaction with the mercenary already available.
  showMercenaryEquipment(true);
  QA.phase='ready';QA.mercenaryName=MERC_CANDIDATES[mercCandidate].label;
  QA.remainingMaterialUnits=Object.values(playerInventory).reduce((a,b)=>a+Math.max(0,Number(b)||0),0);
  console.info('[MERCENARY QA] READY',QA.items);
 }catch(err){
  QA.phase='error';QA.errors.push(String(err?.stack||err));
  console.error('[MERCENARY QA]',err);
  loading.style.display='none';intro.style.display='grid';
  toast('Error al preparar prueba de mercenario: '+(err?.message||err),6000);
 }
}
