import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {GIFT_SKINS,createGiftSkin} from '../premium-skins.js';
import {GACHA_CATALOG} from '../gacha-catalog.js';
import {chooseGachaItem,GOLDEN_LEGEND_CHANCE} from '../gacha-rarity.js';
const ids=['auroraphoenix','celestialkirin','imperialpeacock','oathpaladin','starwhalesovereign','ninetailtenko','auricalchemist','saturnregent','leonidasregalia','prismmorpho'];
const pool=GACHA_CATALOG.filter(s=>s.category===5),gold=pool.filter(s=>s.rarity===5),rules=JSON.parse(fs.readFileSync('database.rules.json'));
assert.equal(new Set(GIFT_SKINS.map(s=>s.id)).size,GIFT_SKINS.length);assert.equal(new Set(GACHA_CATALOG.map(s=>s.number)).size,GACHA_CATALOG.length);
const oldOwned=Object.fromEntries(pool.filter(s=>!ids.includes(s.id)).map(s=>[s.number,true]));
const remaining=new Set();for(let i=0;i<1000;i++)remaining.add(chooseGachaItem(pool,oldOwned,true,(i+.5)/1000*GOLDEN_LEGEND_CHANCE).id);
assert.deepEqual([...remaining].sort(),[...ids].sort(),'new golden outfits remain obtainable when older outfits are owned');
for(const owned of [{},oldOwned,Object.fromEntries(pool.map(s=>[s.number,true]))]){
 let count=0;for(let i=0;i<10000;i++)if(chooseGachaItem(pool,owned,true,(i+.5)/10000).rarity===5)count++;
 assert.equal(count,2000,'golden tier probability remains 20%');
}
for(const [index,id]of ids.entries()){
 const spec=GIFT_SKINS.find(s=>s.id===id),item=pool.find(s=>s.id===id);assert(spec&&item);assert.equal(spec.rarity,5);assert.equal(item.rarity,5);assert.equal(item.number,6088+index);
 const position=gold.findIndex(s=>s.id===id);assert.equal(chooseGachaItem(pool,{},true,(position+.5)/gold.length*GOLDEN_LEGEND_CHANCE).id,id);
 for(const key of ['.write','.validate'])assert(rules.rules.premiumOwnership.$uid.$skin[key].includes(id));
 assert(rules.rules.premiumOwnership.$uid.$skin['.write'].includes(`child('${item.number}')`));
 assert(rules.rules.reviewGifts.$uid.$gift['.validate'].includes(id));
 for(const entry of [rules.rules.profiles.$uid,rules.rules.rooms.$room.players.$uid])assert(entry['.validate'].includes('premium-'+id));
 for(const mobile of [false,true]){
  const skin=createGiftSkin(THREE,id,{mobile}),root=new THREE.Group();root.add(skin.group);
  const resources=new Set();let meshes=0,triangles=0;
  skin.group.traverse(n=>{assert(!n.isLight);if(n.geometry)resources.add(n.geometry);for(const m of n.material?(Array.isArray(n.material)?n.material:[n.material]):[])resources.add(m);if(n.isMesh){meshes++;triangles+=(n.geometry.index?.count||n.geometry.attributes.position.count)/3;}});
  assert(meshes<=22,`${id}: ${meshes} draws`);assert(triangles<14000,`${id}: ${triangles} triangles`);
  const transform=()=>{skin.group.updateMatrixWorld(true);let values=[];skin.group.traverse(n=>{values.push(...n.matrixWorld.elements);if(n.geometry)assert([...n.geometry.attributes.position.array].every(Number.isFinite));});assert(values.every(Number.isFinite));return values;};
  skin.update(0);const before=transform();for(const t of [.2,1.7,5,100,NaN,Infinity]){skin.update(t,{moving:true,jumping:true});transform();}
  skin.update(2.3);assert.notDeepEqual(transform(),before,id+' has animated accessories');assert(skin.group.getObjectByName('signature-aura'));
  const disposed=new Map();for(const r of resources)r.addEventListener('dispose',()=>disposed.set(r,(disposed.get(r)||0)+1));
  skin.dispose();skin.dispose();skin.update(8);assert.equal(skin.group.parent,null);assert.equal(disposed.size,resources.size);assert([...disposed.values()].every(v=>v===1),'equipment resources dispose once');
 }
}
console.log('PASS 10 obtainable golden outfits, entitlement/catalog alignment, unchanged 20% tier, finite animated desktop/mobile models, draw budgets and disposal');
