const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'previews', 'menus-v0.1.012.html'), 'utf8');
assert.match(html, /RECETA","MATERIALES","ELABORACIÓN/);
assert.doesNotMatch(html, /CIERRE DE FABRICACIÓN|TÉCNICAS Y MATERIAL EXTRA|VER EJEMPLO HIELO/);
const match = html.match(/\/\* Prueba aislada de flujo;[\s\S]*?(?=function otherHtml\(\))/);
assert(match, 'No se encontró el módulo del flujo de fabricación');

const sessionData = {};
const sessionStorage = {
  setItem(key, val) { sessionData[key] = val; },
  getItem(key) { return sessionData[key] ?? null; }
};
let currentTime = 100000;
const fakeDate = { now() { return currentTime; } };
const context = {
  inventory: [{ id: 'ingot', qty: 2 }],
  sessionStorage,
  Date: fakeDate,
  ingot: 'test.png',
  swordSvg: () => '<svg></svg>',
  esc: x => String(x)
};
vm.createContext(context);
vm.runInContext(match[0], context);

assert.equal(context.fabStock(), 2);
context.fabQty = 1;
assert.equal(context.fabBegin(), false, 'La receta incompleta no puede comenzar');
context.fabQty = 2;
assert.equal(context.fabBegin(), true);
assert.equal(context.fabStock(), 0, 'Los materiales de prueba se descuentan una vez');
assert.equal(context.fabFinishIfReady(), false, 'No aparece un resultado prematuro');
assert.equal(context.fabResult, null);
assert.doesNotMatch(context.fabRight(), /TÉCNICAS DE CIERRE|REFINAMIENTO|CONOCIMIENTO/);
currentTime += 12000;
assert.equal(context.fabFinishIfReady(), true);
assert.equal(context.fabResult.rarity, 'Inútil');
assert.deepEqual(Array.from(context.fabResult.channels), ['Base']);
assert.equal(context.inventory.length, 2);
assert.equal(context.fabFinishIfReady(), false, 'No se duplica el objeto');
const fresh = {
  inventory: [{ id: 'ingot', qty: 2 }], sessionStorage, Date: fakeDate,
  ingot: 'test.png', swordSvg: () => '<svg></svg>', esc: x => String(x)
};
vm.createContext(fresh);
vm.runInContext(match[0], fresh);
fresh.fabRestore();
assert.equal(fresh.fabStock(), 0);
assert.equal(fresh.fabResult.rarity, 'Inútil');
assert.equal(fresh.inventory.length, 2);
console.log('PASS fabricación progresiva: materiales, tiempo, creación única, persistencia y secretos ocultos');
