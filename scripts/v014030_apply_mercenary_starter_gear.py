#!/usr/bin/env python3
"""V014030 experimental-only: add separate, genuine NGE mercenary starter gear.
Preserve the existing accepted artwork, main, and original crafted-item inventory.
Idempotent, strict source anchors: if base diverges, abort rather than patch blindly.
"""
from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf8')
marker='// GENESIS V014030: mercenary-owned starter gear, separate from player fabrications.'
if marker in s:
    print('V014030_ALREADY_PATCHED')
    raise SystemExit(0)
at='function mercNode(id){'
assert s.count(at)==1,'Mercenary state insertion anchor changed'
addition=r"""
// GENESIS V014030: mercenary-owned starter gear, separate from player fabrications.
let mercStarterGear=null;
function createMercenaryStarterGear(){
  const engine=window.GenesisPrototypeEngines;
  if(selectedProfession!=='Herrero'||!engine?.fabricate||!engine?.present)return null;
  const formulas={sword:formulaFor('espada_hierro'),shield:formulaFor('escudo_hierro')};
  if(!formulas.sword||!formulas.shield)return null;
  const baseSeed=0x30A000+Math.max(0,mercCandidate||0)*1009;
  function weakest(recipe,formula,craft,rarity,count){
    let best=null;
    for(let i=0;i<count;i++){
      const seed=(baseSeed+i*1297+(recipe==='escudo_hierro'?500003:0))>>>0;
      const raw=engine.fabricate(recipe,{craft,seed,artisan:'Mercenario de la milicia',formula});
      if(raw.rarity!==rarity)continue;
      const base=Number(raw.channels?.[0]?.[1]);
      if(!Number.isFinite(base))continue;
      const extras=(raw.channels||[]).slice(1).reduce((sum,ch)=>sum+Number(ch[1]||0),0);
      const score=base+0.18*extras;
      if(!best||score<best.score)best={raw,score,seed,base};
      if(base<=43&&extras<=24)break;
    }
    if(!best)throw Error('Falta equipo NGE inicial '+recipe+' '+rarity);
    return engine.present(best.raw,new Set());
  }
  const sword=weakest('espada_hierro',formulas.sword,2,'Común',500);
  const shield=weakest('escudo_hierro',formulas.shield,1,'Inútil',100);
  sword.id='mercenary-starter-sword-'+mercCandidate;
  shield.id='mercenary-starter-shield-'+mercCandidate;
  sword.name='Espada común de milicia';
  shield.name='Escudo gastado de milicia';
  sword.owner='mercenary';shield.owner='mercenary';
  sword.source='GenesisPrototypeEngines.fabricate/present';
  shield.source='GenesisPrototypeEngines.fabricate/present';
  sword.starterGear=true;shield.starterGear=true;
  return {candidate:mercCandidate,sword,shield};
}
function ensureMercenaryStarterEquipment(){
  if(selectedProfession!=='Herrero'||mercCandidate==null)return false;
  if(mercStarterGear?.candidate===mercCandidate&&mercGearAttached)return true;
  const starter=createMercenaryStarterGear();
  if(!starter)return false;
  const old={mercSwordItem,mercShieldItem,mercGearAttached};
  mercSwordItem=starter.sword;mercShieldItem=starter.shield;
  if(!equipMercenaryCreations()){
    mercSwordItem=old.mercSwordItem;mercShieldItem=old.mercShieldItem;
    mercGearAttached=old.mercGearAttached;return false;
  }
  mercStarterGear=starter;
  return true;
}
"""
s=s.replace(at,addition+'\n'+at,1)
start="function showMercenaryEquipment(editing=false,reuseDraft=false){"
assert s.count(start)==1,'showMercenaryEquipment anchor changed'
newStart=start+"\n  if(!editing && mercCandidate!=null && (!mercStarterGear || mercStarterGear.candidate!==mercCandidate || !mercGearAttached)){\n    if(!ensureMercenaryStarterEquipment())toast('Equipo inicial del mercenario no cargado.',1600);\n  }"
s=s.replace(start,newStart,1)
sel="selectedFirst:chosenFirst,selectedSecond:chosenSecond,"
assert s.count(sel)==1,'Old selected-item binding changed'
s=s.replace(sel,"selectedFirst:(editing||chosenFirst!==mercStarterGear?.sword)?chosenFirst:null,\n      selectedSecond:(editing||chosenSecond!==mercStarterGear?.shield)?chosenSecond:null,",1)
onDraft="onDraft:(which,item)=>{\n        if(tanner)"
assert s.count(onDraft)==1,'Original draft handler changed'
s=s.replace(onDraft,"onDraft:(which,item)=>{\n        if(!editing)return; // Keep default equipment mounted until actual Equip confirmation.\n        if(tanner)",1)
back="mercSwordItem=mercShieldItem=mercArmorItem=mercBootsItem=null;\n        return showMercenaryCandidates();"
assert s.count(back)==1,'Back handler changed'
s=s.replace(back,"mercSwordItem=mercStarterGear?.sword||null;mercShieldItem=mercStarterGear?.shield||null;\n        mercArmorItem=mercBootsItem=null;\n        return showMercenaryCandidates();",1)
p.write_text(s,encoding='utf8')
assert marker in p.read_text('utf8')
print('V014030_PATCHED_INDEX',len(s),'starter baseline separate; NGE two actual rarities; candidate binding; no player inventory edits')
