import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {GACHA_CATALOG} from '../gacha-catalog.js';
import {GIFT_SKINS} from '../premium-skins.js';
import {LEGEND_AURA_SKINS} from '../premium-legend-skins.js';
import {GOLDEN_GIFT_SKINS} from '../premium-golden-skins.js';
import {chooseGachaItem,GOLDEN_LEGEND_CHANCE,GACHA_RARITY_NAMES} from '../gacha-rarity.js';
const pool=GACHA_CATALOG.filter(x=>x.category===5),gold=pool.filter(x=>x.rarity===5),legend=pool.filter(x=>x.rarity===4);
assert.equal(GIFT_SKINS.length,48);assert.equal(GOLDEN_GIFT_SKINS.length,10);assert.equal(gold.length,18);assert.equal(legend.length,30);assert.equal(GOLDEN_LEGEND_CHANCE,.2);assert.equal(GACHA_RARITY_NAMES[5],'ゴールデンレジェンドレア');
assert(GIFT_SKINS.slice(0,8).every(s=>gold.some(i=>i.id===s.id)));
const old=JSON.parse(execFileSync('git',['show','HEAD:gacha-catalog.js'],{encoding:'utf8'}).split('=')[1].trim().replace(/;$/,''));
for(const item of old)assert.equal(GACHA_CATALOG.find(i=>i.id===item.id&&i.category===item.category).number,item.number,'existing ownership IDs must not move');
assert.equal(chooseGachaItem(pool,{},true,0).rarity,5);assert.equal(chooseGachaItem(pool,{},true,.2-1e-9).rarity,5);assert.equal(chooseGachaItem(pool,{},true,.2).rarity,4);assert.equal(chooseGachaItem(pool,{},true,1-1e-9).rarity,4);
for(const owned of [{},Object.fromEntries(gold.map(x=>[x.number,true])),Object.fromEntries(legend.map(x=>[x.number,true])),Object.fromEntries(pool.filter((_,i)=>i%3).map(x=>[x.number,true]))]){
 let count=0;for(let i=0;i<10000;i++)if(chooseGachaItem(pool,owned,true,(i+.5)/10000).rarity===5)count++;
 assert.equal(count,2000,'tier chance stays 20% regardless of ownership');
}
const normal=GACHA_CATALOG.filter(x=>x.category===0);assert(Array.from({length:1000},(_,i)=>chooseGachaItem(normal,{},false,i/1000)).every(x=>x.rarity<5));
const rules=JSON.parse(fs.readFileSync('database.rules.json'));
for(const s of [...GOLDEN_GIFT_SKINS,...LEGEND_AURA_SKINS]){const item=pool.find(i=>i.id===s.id);assert(rules.rules.premiumOwnership.$uid.$skin['.validate'].includes(s.id));assert(rules.rules.premiumOwnership.$uid.$skin['.write'].includes(`child('${item.number}')`));assert(rules.rules.profiles.$uid['.validate'].includes('premium-'+s.id));assert(rules.rules.rooms.$room.players.$uid['.validate'].includes('premium-'+s.id));}
console.log('PASS 48 skins, 18 golden, stable ownership IDs, exact 20/80 tier boundaries, completed-tier duplicates, unchanged normal pool, entitlement rules');
