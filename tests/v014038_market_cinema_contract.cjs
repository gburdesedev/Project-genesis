'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const market=require('../genesis_market_cinematic_v001.js');
const quest=require('../genesis_market_quest_v001.js');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
for(const token of ['genesis_market_cinematic_v001.css','genesis_market_cinematic_v001.js',
 'function startOrdanMarketEscort(){','function finishOrdanMarketCinematic(now){',
 'function updateOrdanMarketEscort(dt,now){','window.__GenesisMarketCinematicQA=',
 '!marketCinematic?.active','window.__GenesisArrivalQA=']){
 assert(html.includes(token),'V014.038 missing runtime connection: '+token);
}
const t=market.create({x:1.72,z:2.75},{x:1.72,z:1.9},quest.escortPath);
assert(t.player.total>t.mentor.total&&t.player.total>40,'Invalid mentor/hero route lengths');
for(let i=0;i<=100;i++){
 const s=market.pose(t,t.player.total*i/100);
 assert(Number.isFinite(s.player.x)&&Number.isFinite(s.mentor.z)&&Number.isFinite(s.player.yaw));
}
const last=market.pose(t,t.player.total);
assert(last.complete,'Market cinema never reaches market');
assert(Math.hypot(last.player.x-24.25,last.player.z-35.15)<.15,'Market path ends at wrong stall');
assert(market.routeAroundPlazaFountain(quest.escortPath).length>quest.escortPath.length,'Fountain bypass absent');
console.log('V014038_MARKET_CINEMA_CONTRACT_PASS',JSON.stringify({distance:t.player.total,goal:last.player,waypoints:quest.escortPath.length}));
