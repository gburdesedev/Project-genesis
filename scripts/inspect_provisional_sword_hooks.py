"""Read-only targeted inventory and mercenary model integration audit."""
from pathlib import Path
import re
s=Path('index.html').read_text(encoding='utf8')
for needle in ('EQUIP_MODEL_URLS','mercSwordModel','mercSwordItem','equipMercenaryCreations','ensureMercenaryReady','espada_hierro','function showMercenaryEquipment','itemIcon:'):
    print('\n=== '+needle+' ===')
    starts=[m.start() for m in list(re.finditer(re.escape(needle),s))[:6]]
    for i,start in enumerate(starts):
        print('OCCURRENCE',i,'OFFSET',start)
        print(s[max(0,start-380):min(len(s),start+1150)].replace('\n','\\n')[:1700])
print('SOURCE_LENGTH',len(s))
