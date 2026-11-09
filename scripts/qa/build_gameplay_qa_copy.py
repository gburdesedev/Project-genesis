#!/usr/bin/env python3
"""Make a throwaway browser-QA HTML copy, never change the published index.html."""
from pathlib import Path
import hashlib
source=Path("index.html")
original=source.read_bytes()
html=original.decode("utf-8")
needle="requestAnimationFrame(frame);\n\nsetLoadUI(100,"
assert html.count(needle)==1, "Cannot locate existing main module frame/bootstrap seam"
hook=r'''
// TEST-ONLY whitebox observation/bridge. This exists solely in
// index-gameplay-qa.html; it is NEVER included in the production index.html.
window.__genesisFullRouteQA=Object.freeze({
  state:()=>({
    started:gameStarted,profession:selectedProfession,step:tutorialStep,
    route:activeRoute?.profession||null,
    quest:questTitle.textContent,
    hudDisplay:getComputedStyle(document.getElementById('hud')).display,
    hudVisible:!!document.getElementById('hud')?.getClientRects().length,
    introDisplay:getComputedStyle(intro).display,
    loadingDisplay:getComputedStyle(loading).display,
    overlay:modalLayer.style.display,
    crafted:craftedItems.map(i=>({id:i.id,recipe:i.recipe,rarity:i.rarity,
      channels:i.channels,formulaSig:i.formula?.signature})),
    inv:{...playerInventory},chest:chestOpen,
    marketState:mentorFollowState,
    candidate:mercCandidate,equipped:mercGearAttached,
    mercState:mercenaryState,gameErrors:window.__GENESIS_RUNTIME_ERRORS?.slice(-8)||[]
  }),
  chest:()=>{workshopKey=true;setTutorialStep(8);openActiveChest();return{...playerInventory}},
  close:()=>closeModal(),
  prepAllIron:()=>{
    const p=window.GenesisPreparation;
    const ore=Number(playerInventory['Mineral de hierro']||0);
    if(ore>0&&!p.convert(playerInventory,ore))throw Error('RAW_ORE_CONVERSION_DENIED');
    refreshInventorySummary();
    return{...playerInventory};
  },
  stepCraft:(n)=>{if(n!==10&&n!==11&&n!==12&&n!==13)throw Error('QA_FORBIDDEN_STEP');setTutorialStep(n);return tutorialStep},
  craft:()=>{showCraftConfirm();return currentRecipe()},
  mentorMarket:()=>{startOrdanMarketEscort();return tutorialStep},
  restockShields:()=>{
    if(tutorialStep!==window.GenesisMarketQuest.steps.escort &&
       tutorialStep!==window.GenesisMarketQuest.steps.shop)
       throw Error('MARKET_NOT_UNLOCKED');
    setTutorialStep(window.GenesisMarketQuest.steps.shop);
    const needs=window.GenesisMarketQuest.shieldNeeds(craftSession,playerInventory);
    for(const n of needs){
      if(n.missing>0)playerInventory[n.material]=(playerInventory[n.material]||0)+n.missing;
    }
    if(!window.GenesisMarketQuest.ready(craftSession,playerInventory))
      throw Error('MARKET_SHIELD_RESTOCK_INCOMPLETE');
    setTutorialStep(12);
    refreshInventorySummary();
    return{needs,inventory:{...playerInventory}};
  },
  candidate:async()=>{
    await ensureMercenaryReady();
    mercCandidate=0;
    applyMercCandidateVisual();
    mercSwordItem=craftedItems.find(i=>i.recipe==='espada_hierro'&&i.craft===2)||
      craftedItems.find(i=>i.recipe==='espada_hierro');
    mercShieldItem=craftedItems.find(i=>i.recipe==='escudo_hierro'&&i.craft===2)||
      craftedItems.find(i=>i.recipe==='escudo_hierro');
    return{candidate:mercCandidate,sword:mercSwordItem?.name,shield:mercShieldItem?.name,
      equipped:equipMercenaryCreations()};
  },
  mission:()=>{showMissionSelection();return tutorialStep},
  finishExpedition:()=>{finishMercenaryDeparture();return tutorialStep},
});
'''
html=html.replace(needle,hook+"\n"+needle)
out=Path("index-gameplay-qa.html")
out.write_text(html,encoding="utf-8")
assert hashlib.sha256(source.read_bytes()).digest()==hashlib.sha256(original).digest()
assert out.stat().st_size>source.stat().st_size
print("QA_ONLY_HTML_CREATED",out.stat().st_size,flush=True)
