#!/usr/bin/env python3
"""Repair six proven broken original V014022 model URLs in the isolated test branch.
Only index.html is changed. No geometry, quest logic, approved main, or materials are rewritten.
Recovery URLs were exercised successfully by the browser-only V014022 recovery test.
"""
from pathlib import Path

INDEX = Path('index.html')
ORIGIN = 'https://cdn.jsdelivr.net/gh/dustinc555/mygame@main/assets/vendor/quaternius/fantasy_props_megakit/gltf/'
RECOVERIES = {
 'Anvil_Log.gltf': 'https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/8696981a95113a34feec26100e761e9e164327de/production/game_v014022/herrero_recovery/v001/anvil_quaternius_cc0_original/Anvil_Log.gltf',
 'Bellows.gltf': 'https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/8696981a95113a34feec26100e761e9e164327de/production/game_v014022/herrero_recovery/v001/bellows_cc0_candidate/Bellows.glb',
 'Hammer_Rack.gltf': 'https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/f33ff16f25c7f05d294665b9be1049773721cbd9/production/game_v014022/herrero_recovery/v001/blacksmith_decor_fallback/Hammer_Rack.gltf',
 'Sign_Blacksmith.gltf': 'https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/f33ff16f25c7f05d294665b9be1049773721cbd9/production/game_v014022/herrero_recovery/v001/blacksmith_decor_fallback/Sign_Blacksmith.glb',
 'Barrel_Dark.gltf': 'https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/f33ff16f25c7f05d294665b9be1049773721cbd9/production/game_v014022/herrero_recovery/v001/blacksmith_decor_fallback/Barrel_Dark.gltf',
 'Bucket_Wooden_2.gltf': 'https://raw.githubusercontent.com/ProjectgenesisAssets/genesis-workshop-assets/f33ff16f25c7f05d294665b9be1049773721cbd9/production/game_v014022/herrero_recovery/v001/blacksmith_decor_fallback/Bucket_Wooden_2.gltf'
}
source = INDEX.read_text(encoding='utf-8')
changed = []
for name, url in RECOVERIES.items():
    old = ORIGIN + name
    if old in source:
        source = source.replace(old, url)
        changed.append(name)
    elif url not in source:
        raise SystemExit(f'ERROR: Neither original nor recovered URL found: {name}')
    print(f'{name}: {"replaced" if name in changed else "already recovered"}')
if changed:
    INDEX.write_text(source, encoding='utf-8')
print('VALIDATED: source available for all six replacements; edited', len(changed), 'URLs')
