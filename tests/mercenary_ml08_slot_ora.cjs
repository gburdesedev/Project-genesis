/* Project Genesis ML08 — original ORA and unique item-fit regression.
 * The eight approved PNGs are copied verbatim from V016.001 and verified by checksum.
 */
'use strict';
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'assets/ui/resultado/oras/manifest.sha256.json'),'utf8'));
const names=['Base','Luz','Sombra','Fuego','Hielo','Naturaleza','Tierra','Rayo'];
assert.deepEqual(manifest.channels.map(c=>c.name),names,'ORA canonical order');
for (const channel of manifest.channels){
 const file=path.join(ROOT,'assets/ui/resultado/oras',channel.png);
 const buf=fs.readFileSync(file);
 assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG header invalid: '+channel.name);
 assert.equal(buf.length,channel.png_bytes,'PNG file altered: '+channel.name);
 assert.equal(crypto.createHash('sha256').update(buf).digest('hex'),channel.png_sha256,'ORA checksum altered: '+channel.name);
 assert.ok(buf.readUInt32BE(16)>=980&&buf.readUInt32BE(20)>=155,'ORA dimensions unexpectedly small');
}
const js=fs.readFileSync(path.join(ROOT,'mercenary_4t_runtime_ml06.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'mercenary_4t_runtime_ml06.css'),'utf8');
assert.match(js,/ORA_ROOT='assets\/ui\/resultado\/oras\/'/,'Only real result ORAs');
assert.match(js,/data-approved-ora=/,'Real channel images must be referenced');
assert.doesNotMatch(js,/Canal_\$\{row.name\}_Origen_V09/,'Legacy V09 channel art forbidden');
assert.doesNotMatch(js,/pg4tChannelPending/,'Text placeholder forbidden for approved channels');
assert.match(css,/--pg4t-fill:74%/);
assert.match(css,/--pg4t-fill:76%/);
assert.match(css,/--pg4t-fill:66%/);
assert.match(css,/object-fit:contain!important/);
assert.match(css,/object-position:50% 50%/);
console.log('PASS: original 8 V3.2 ORAs SHA256 + full fit 74/76/66 + no obsolete channels');
