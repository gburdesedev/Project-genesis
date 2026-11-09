from pathlib import Path
import re,json
s=Path('index.html').read_text()
for k in ['function applyMercGearChannels','function attachMercenary','function equipMercenaryCreations','function setupMercenary','function buildMercenary','function itemAssetMarkup','function setMercLight','mercSwordModel','mercSword10','mercSwordGlowA','mercSwordModel.contentEntity','mercSwordModel?.contentEntity','findMercBone','function attachMercSword','function mercGearRoute','function showMercenaryEquipment','function updateMercenary','window.GenesisPrototypeEngines']:
 pos=s.find(k); print('\n=== KEY',k,'pos',pos,'line',s.count('\n',0,pos)+1)
 if pos>=0: print(s[max(0,pos-300):pos+min(6800,800+len(k))][:6500].replace('\n','\\n'))
for p in ['assets/vendor/genesis/externals/mercSword10/src/sword.glb','assets/vendor/genesis/externals/mercShield10/src/shield_round.glb']:
 file=Path(p);print('ASSET_LOCAL',p,'exists',file.is_file(),'size',file.stat().st_size if file.exists() else None)
print('\n=== END')
