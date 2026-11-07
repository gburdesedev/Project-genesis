#!/usr/bin/env python3
"""Bounded experimental patch: REAL project game issues basic NGE-generated mercenary gear.

Never alters the approved V09 image, game crafting logic or player-owned craftedItems.
The issued starter sword is Common; the issued starter shield is Useless.
Both use the native NGE engine and are equipped on the actual PlayCanvas rig.
The player's sword/shield remain distinct until the confirmation button is pressed.
"""
from pathlib import Path
import sys
p=Path('index.html')
s=p.read_text(encoding='utf-8')
anchor='function showMercenaryEquipment(editing=false,reuseDraft=false){'
if s.count(anchor)!=1:
    raise RuntimeError(f'Expected unique mercenary equipment function: {s.count(anchor)}')
if 'GENESIS_V014030_STARTER_GEAR' in s:
    print('GENESIS_V014030_STARTER_GEAR_ALREADY_APPLIED')
    sys.exit(0)
intro=r"""
  // GENESIS_V014030_STARTER_GEAR: real NGE-issued gear belongs to this warrior,
  // never to the player's craftedItems. Preserve V09 original layout.
  if(!editing && mercCandidate!=null && mercGearRoute()==='Herrero'
     && (!mercSwordItem || !mercShieldItem)){
    const e=window.GenesisPrototypeEngines;
    const swordFormula=formulaFor('espada_hierro');
    const shieldFormula=formulaFor('escudo_hierro');
    if(!e?.fabricate || !e?.present || !swordFormula || !shieldFormula){
      throw new Error('El equipamiento inicial del mercenario requiere las fórmulas NGE reales.');
    }
    // Deterministic real Common result with apprentice-level stats, not hardcoded values.
    let commonSwordRaw=null,commonPower=Infinity;
    for(let seed=1;seed<=384;seed++){
      const raw=e.fabricate('espada_hierro',{
        craft:2,seed:(16421+seed*1777)>>>0,
        artisan:'Armero de la guardia',formula:swordFormula
      });
      const power=Number(raw.channels?.[0]?.[1]);
      if(raw.rarity==='Común' && Number.isFinite(power) && power<commonPower){
        commonPower=power;commonSwordRaw=raw;
        if(commonPower<=45)break;
      }
    }
    if(!commonSwordRaw)throw new Error('NGE no produjo espada Común para el mercenario.');
    const uselessShieldRaw=e.fabricate('escudo_hierro',{
      craft:1,seed:16421,artisan:'Armero de la guardia',formula:shieldFormula
    });
    if(uselessShieldRaw.rarity!=='Inútil')
      throw new Error('NGE no produjo escudo Inútil para el mercenario.');
    const issuedSword=e.present(commonSwordRaw,usedItemNames);
    const issuedShield=e.present(uselessShieldRaw,usedItemNames);
    usedItemNames.add(issuedSword.name.toLocaleLowerCase('es'));
    usedItemNames.add(issuedShield.name.toLocaleLowerCase('es'));
    issuedSword.genesisOrigin='mercenary-issued-gear';
    issuedShield.genesisOrigin='mercenary-issued-gear';
    // Existing game fields are the one true mercenary equipment source.
    mercSwordItem=issuedSword;
    mercShieldItem=issuedShield;
    // The player's generated pieces are still in craftedItems, unchanged.
    if(mercenaryInitialized && mercenaryRoot){
      if(!equipMercenaryCreations())
        throw new Error('No se pudo montar el equipo inicial en el rig real.');
    }
  }
"""
s=s.replace(anchor,anchor+'\n'+intro)
assert 'GENESIS_V014030_STARTER_GEAR' in s
assert s.count('function showMercenaryEquipment(editing=false,reuseDraft=false){')==1
p.write_text(s,encoding='utf-8')
print('GENESIS_V014030_STARTER_GEAR_PATCHED',len(s))
