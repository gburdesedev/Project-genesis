"""Add the generated independent QA sword to the game branch, not main.
One local GLB serves fabrication previews, inventory and mercenary equipment.
No engine recipes, rarities, names, channel values or approved UI art are changed.
"""
from pathlib import Path
import hashlib,urllib.request,json

ROOT=Path(__file__).resolve().parents[1]
GLB_REL='assets/playcanvas/approved/equipment/swords/genesis_sword_provisional_v001.glb'
GLB=ROOT/GLB_REL
SOURCE='https://raw.githubusercontent.com/ProjectGenesisAssets2/genesis-equipment-assets/feature/genesis-sword-provisional-webgl-20261103/assets/playcanvas/swords/provisional_v001/genesis_sword_provisional_v001.glb'
EXPECTED='210d41cc2bc96d03862029d983af9ffcf71d093fd2e662ecb85a479db928d4ad'
OLD='https://cdn.jsdelivr.net/gh/Genesara/genesara-web@main/public/models/props/sword.glb'
HTML=ROOT/'index.html'

def sha(b):return hashlib.sha256(b).hexdigest()
if GLB.exists():
    content=GLB.read_bytes()
    if sha(content)!=EXPECTED:raise RuntimeError('Local sword exists but SHA differs')
else:
    with urllib.request.urlopen(SOURCE,timeout=90) as response:
        content=response.read()
    if sha(content)!=EXPECTED or content[:4]!=b'glTF':
        raise RuntimeError('SWORD_SOURCE_HASH_MISMATCH: refuse to integrate')
    GLB.parent.mkdir(parents=True,exist_ok=True)
    GLB.write_bytes(content)
source=HTML.read_text(encoding='utf-8')
count=source.count(OLD)
if count!=2 and not (count==0 and source.count(GLB_REL)==2):
    raise RuntimeError(f'Unexpected existing sword URL count: {count}')
if count==2:
    updated=source.replace(OLD,GLB_REL)
    HTML.write_text(updated,encoding='utf-8')
else:
    updated=source
# Expose the current real equipment ONLY in opt-in QA mode. Do not alter gameplay.
hook='mercenaryReadyPromise=null;' + chr(10) + 'function mercNode(id)'
qa_hook='''mercenaryReadyPromise=null;
if(new URLSearchParams(location.search).get('mercenary-qa')==='1'){
 window.GenesisMercenaryQAGear=()=>({
  swordId:mercSwordItem?.id??null,shieldId:mercShieldItem?.id??null,
  swordRarity:mercSwordItem?.rarity??null,shieldRarity:mercShieldItem?.rarity??null
 });
}
function mercNode(id)'''
if 'GenesisMercenaryQAGear' not in updated:
    if updated.count(hook)!=1:raise RuntimeError('Mercenary QA hook anchor missing or duplicated')
    updated=updated.replace(hook,qa_hook)
    HTML.write_text(updated,encoding='utf-8')
assert updated.count(GLB_REL)==2, 'Both visual sword URLs must match local GLB'
assert 'data-asset="mercSword10"' in updated
assert 'id="mercSword10"' in updated
assert 'id="mercShield10"' in updated
assert 'escudo_hierro:' in updated
assert 'function itemAssetMarkup(item)' in updated
assert 'function mercGearModel(item,type)' in updated
assert 'function equipMercenaryCreations(' in updated
assert 'GenesisPrototypeEngines' in updated
audit={'model':'GENESIS_SWORD_PROVISIONAL_V001','sha256':EXPECTED,
       'file':GLB_REL,'size':len(content),'source':SOURCE,'web_references':2,
       'replacement':'visual-only','fabrication_logic_edited':False,
       'mercenary_logic_edited':False,'fab_source_used':False}
(GLB.parent/'integration_audit.json').write_text(json.dumps(audit,indent=2),encoding='utf8')
print('GENESIS_SWORD_PROVISIONAL_GAME_INTEGRATED',json.dumps(audit),flush=True)
