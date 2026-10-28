// Preserve existing item numbers so ownership records keep their meaning.
import {readFile,writeFile} from 'node:fs/promises';
import {GIFT_SKINS} from '../premium-skins.js';
import {GACHA_CATALOG} from '../gacha-catalog.js';
const entries=GACHA_CATALOG.filter(i=>i.category!==5);
const previous=new Map(GACHA_CATALOG.filter(i=>i.category===5).map(i=>[i.id,i.number]));
let next=Math.max(5999,...previous.values())+1;
for(const s of GIFT_SKINS)entries.push({number:previous.get(s.id)??next++,id:s.id,name:s.name,glyph:s.glyph||'✦',category:5,rarity:4});
await writeFile('gacha-catalog.js','export const GACHA_CATALOG='+JSON.stringify(entries)+';\n');
const rules=JSON.parse(await readFile('database.rules.json','utf8'));
rules.rules.reviewGifts.$uid.$gift['.validate']=rules.rules.reviewGifts.$uid.$gift['.validate'].replace(/matches\(\/\^\([^)]*\)\$\/\)/,`matches(/^(${GIFT_SKINS.map(s=>s.id).join('|')})$/)`);
rules.rules.premiumOwnership.$uid.$skin['.validate']=GIFT_SKINS.map(s=>`$skin === '${s.id}'`).join(' || ');
const ownership=rules.rules.premiumOwnership.$uid.$skin;
const prefix=ownership['.write'].split(' || (auth != null && auth.uid === $uid && newData.isString() && ((')[0];
ownership['.write']=prefix+' || (auth != null && auth.uid === $uid && newData.isString() && ('+entries.filter(i=>i.category===5).map(i=>`($skin === '${i.id}' && root.child('economy').child($uid).child('owned').child('${i.number}').val() === true)`).join(' || ')+'))';
// Profile and in-room costume validation must recognize every added premium ID.
for(const container of[rules.rules.profiles.$uid,rules.rules.rooms.$room.players.$uid]){
 const value=container['.validate'];
 const start=value.indexOf(" || (newData.child('costume').val().matches(/^premium-");
 const end=value.indexOf(" && (!newData.child('costume')",start);
 if(start<0||end<0)throw Error('Missing premium costume validation boundary');
 const clauses=GIFT_SKINS.map(s=>`(newData.child('costume').val().matches(/^premium-${s.id}(-[a-z0-9]+)?$/) && root.child('premiumOwnership').child($uid).child('${s.id}').isString())`);
 container['.validate']=value.slice(0,start)+' || '+clauses.join(' || ')+')'+value.slice(end);
}
await writeFile('database.rules.json',JSON.stringify(rules,null,2)+'\n');
