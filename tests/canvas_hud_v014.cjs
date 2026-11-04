'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const originalCss=original.match(/<style[^>]*>([\s\S]*?)<\/style>/)?.[1];
const copied=fs.readFileSync(path.join(root,'v015','canvas-original-hud-v014.css'),'utf8');
const preview=fs.readFileSync(path.join(root,'v015','index.html'),'utf8');
assert(originalCss&&originalCss.length>50000,'Original Canvas style sheet not found');
const selectors=[
 '#hud','#brand','#tech','#quest','#quest .ey','#quest h2','#quest p',
 '#prompt','#buttonsTop','.uiBtn','#cameraSettingsBtn','#toast','#npcTag',
 '#desktopHelp','#cameraGuide','#cameraGuide strong','#mobile','#joy','#joyKnob',
 '#interact','#inventoryTouch','#inventoryTouch.locked','#inventoryTouch.ready',
 '#lookZone','#lookHint','#zoomControls','#zoomControls button','#zoomControls .zoomLabel',
 '#interactMarker','#interactMarker::before','#interactMarker.active',
 '#professionChip','#materialsPanel','#materialsPanel .mt','#materialsPanel .mb'
];
function rule(text,selector){
 const esc=selector.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
 return text.match(new RegExp(esc+'\\s*\\{[^{}]*\\}'))?.[0]||null;
}
for(const sel of selectors) {
 const source=rule(originalCss,sel),copy=rule(copied,sel);
 assert(source,'Original CSS lost selector '+sel);
 assert.equal(copy,source,'V014 changed approved Canvas geometry/styles for '+sel);
}
for(const id of [
 'hud','brand','tech','buttonsTop','cameraSettingsBtn','quest','questEy','questTitle','questText',
 'prompt','professionChip','materialsPanel','npcTag','interactMarker','desktopHelp','cameraGuide',
 'mobile','lookZone','joy','joyKnob','lookHint','zoomControls','zoomIn','zoomOut','inventoryTouch','interact'
]) {
 assert(preview.includes('id="'+id+'"'),'HUD missing original ID '+id);
}
assert(!preview.includes('id="actions"'),'V013 replacement touch grid still present');
assert(!preview.includes('id="settings-btn"'),'Legacy settings button duplicates original');
assert(preview.includes('canvas-original-hud-v014.css'),'Original HUD stylesheet not linked');
assert(preview.includes("document.getElementById('cameraSettingsBtn').addEventListener('click'"),'Original camera button not wired');
assert(preview.includes("document.getElementById('lookZone').addEventListener('pointerdown'"),'Original camera look zone not wired');
assert(preview.includes("[['zoomIn',-1],['zoomOut',1]]"),'Original zoom controls not wired');
const game=fs.readFileSync(path.join(root,'v015','canvas-legacy-ui.js'),'utf8');
assert(game.includes("const quest=get('quest'),prompt=get('prompt'),marker=get('interactMarker')"),'V013 original Q1–Q3 gameplay not bound to original HUD');
assert(game.includes("const invBtn=get('inventoryTouch')"),'Original touch inventory not wired');
assert(!game.includes("document.createElement('aside')"),'Duplicate Q1 quest UI still created');
console.log('PASS V014: '+selectors.length+' exact original Canvas CSS declarations, original DOM control IDs, existing gameplay button handlers.');
