/* Read-only contract audit for the actual game bundle; no synthetic gameplay. */
'use strict';
const fs=require('node:fs');
const s=fs.readFileSync('index.html','utf8');
const patterns=[
  'function showMercenaryEquipment(', 'const showMercenaryEquipment=', 'showMercenaryEquipment(',
  'function equipMercenaryCreations(', 'equipMercenaryCreations(',
  'function applyMercCandidateVisual(', 'function ensureMercenaryReady(',
  'function showMercenarySheet(', 'mercenary-qa', 'GenesisMercenaryConcept.open(',
  'function mercNode(', 'const MERC_CANDIDATES=', 'MERC_CANDIDATES=',
  'function mountMerc', 'function refreshInventorySummary(', 'function startRoute(',
  'mercSwordModel', 'mercBodyModel', 'mercNode(id)', '#modal button', 'content-visibility:', 'contain:', 'contain-intrinsic-size:', '#modalLayer{', '#modal{', '.mercConceptModal'
];
console.log('SOURCE_BYTES',s.length,'LINES',s.split('\\n').length);
for(const pattern of patterns){
 let at=s.indexOf(pattern);
 const all=[]; let k=0;
 while(at>=0&&k<3){all.push({at,context:s.slice(Math.max(0,at-250),Math.min(s.length,at+3000))});at=s.indexOf(pattern,at+pattern.length);k++}
 console.log('AUDIT_MATCH',JSON.stringify({pattern,occurrences:all}));
}
console.log('CHECK_SRC',JSON.stringify({
  inlineProceduralEngine:s.includes('id="genesis-prototype-engines"'),
  mercenaryUITemplate:s.includes('mercenary_equipment_canvas_v001.js'),
  QAHook:s.includes('mercenary-qa=1'),
  version:s.match(/<title[^>]*>[^<]+<[/]title>/)?.[0]||null
}));
