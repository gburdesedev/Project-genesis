'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const dir=path.join(root,'assets/ui/resultado/oras');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.sha256.json'),'utf8'));
assert.equal(manifest.channels.length,8,'Debe haber exactamente ocho ORA de canales');
const names=['Base','Luz','Sombra','Fuego','Hielo','Naturaleza','Tierra','Rayo'];
for(let i=0;i<names.length;i++){
 const row=manifest.channels[i];
 const file=path.join(dir,row.png);
 const data=fs.readFileSync(file);
 assert.equal(row.name,names[i], 'Orden de canales original');
 assert.equal(crypto.createHash('sha256').update(data).digest('hex'),row.png_sha256,'PNG original alterado: '+row.png);
 assert.equal(data.length,row.png_bytes,'Tamaño incorrecto: '+row.png);
 assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a','PNG no válido: '+row.png);
 const w=data.readUInt32BE(16),h=data.readUInt32BE(20);
 assert.ok(w>=980&&w<=1000&&h>=155&&h<=175,'Dimensiones ORA inesperadas: '+row.png+' '+w+'x'+h);
}
const code=fs.readFileSync(path.join(root,'genesis_result_dynamic_v001.js'),'utf8');
const game=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.match(code,/rootArt="assets\/ui\/resultado\/oras\/"/);
assert.match(game,/GenesisResultDynamic\?\.decorate\?\.\(modalBox,item,itemAssetMarkup\)/);
console.log('PASS: 8 PNG ORA originales por SHA-256, dimensiones, orden y conexión NGE en PlayCanvas V016.001');
