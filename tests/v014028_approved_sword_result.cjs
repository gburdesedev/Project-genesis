'use strict';
/* V014.028: assure the real source render from the approved V12B Blender preset
   is shown by the *game's* certified-result renderer. This intentionally does
   not claim the static Cycles PNG is a working real-time GLB / live HDRI. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const file=path.join(root,'assets/playcanvas/approved/equipment/espada_v03_hierro_v175_v12b_cycles_hdri32.png');
assert(fs.existsSync(file),'Original V175 V12B Cycles screenshot missing');
const b=fs.readFileSync(file);
assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
assert.equal(b.readUInt32BE(16),1200);
assert.equal(b.readUInt32BE(20),1500);
assert(b.length>1500000);
assert(html.includes('espada_v03_hierro_v175_v12b_cycles_hdri32.png'),'Game result viewer does not reference real V12B');
assert(html.includes('item.recipe===\'espada_hierro\''),'Sword routing missing');
const viewerSection=html.slice(html.indexOf('const EQUIP_MODEL_URLS='),html.indexOf('function formulaWeightBreakdown('));
assert(!viewerSection.includes('Genesara/genesara-web@main/public/models/props/sword.glb'),'Result viewer must not use generic sword');
assert(html.includes('--halo1:${visual.c1}'),'Result screen must keep real procedural channel halo');
assert(html.includes('itemAssetMarkup(item)'),'Result card is no longer using real sword renderer');
assert(!fs.existsSync(path.join(root,'assets/playcanvas/approved/equipment/sword_v175_v12b.glb')),'Unverified source GLB should not be published');
console.log('GENESIS_V12B_GAME_RESULT_REAL_SOURCE_RENDER_PASS',JSON.stringify({
source:'Genesis_Espada_V03_Hierro_V175_V12B',swordType:'original V03, metal V175, preset V12B',
renderEngine:'Cycles',lightingSource:'HDRI EXR 32-bit per channel',
isLive3D:false,sha256:crypto.createHash('sha256').update(b).digest('hex'),
bytes:b.length,dimensions:[1200,1500]
}));
