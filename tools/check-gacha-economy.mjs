import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomInt,createHash} from 'node:crypto';
const catalog=JSON.parse(readFileSync(new URL('../functions/catalog.json',import.meta.url)));
let source=readFileSync(new URL('../functions/index.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('initializeApp();','').replace(/const catalog=JSON.parse\(readFileSync\(new URL\('\.\/catalog.json',import.meta.url\),'utf8'\)\),admins=/,'const admins=').replace("const catalog=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url))),admins=",'const admins=').replaceAll('export const ','const ');
const data={onlineUsers:{target:{online:true}}};
const pathParts=p=>p.split('/').filter(Boolean),read=p=>pathParts(p).reduce((v,k)=>v?.[k],data)??null;
function write(p,v){const parts=pathParts(p),last=parts.pop();let node=data;for(const key of parts)node=node[key]??={};node[last]=structuredClone(v);}
const getDatabase=()=>({ref:p=>({async get(){return {val:()=>structuredClone(read(p))};},async set(v){write(p,v);},async transaction(fn){const value=fn(structuredClone(read(p)));if(value!==undefined)write(p,value);return {committed:value!==undefined,snapshot:{val:()=>structuredClone(read(p))}};}})});
const api=new Function('catalog','getDatabase','getAuth','onRequest','onValueWritten','randomInt','createHash',source+';return {gachaApi,awardMatchTickets};')(catalog,getDatabase,()=>({verifyIdToken:async uid=>({uid})}),(_,fn)=>fn,(_,fn)=>fn,randomInt,createHash);
async function request(uid,body){let code=200,result;await api.gachaApi({method:'POST',headers:{authorization:'Bearer '+uid},body},{status(n){code=n;return this;},json(x){result=x;return this;}});return {code,...result};}
let w=await request('target',{action:'wallet'});assert.equal(w.wallet.tickets,50);
w=await request('target',{action:'wallet'});assert.equal(w.wallet.tickets,50,'initial bonus once');
const args={action:'draw',kind:'normal',category:0,requestId:'aaaaaaaa-aaaaaaaa'};let draw=await request('target',args);assert.equal(draw.wallet.tickets,49);assert.equal(draw.item.category,0);
let replay=await request('target',args);assert.equal(replay.wallet.tickets,49);assert.equal(replay.item.number,draw.item.number,'retry returns same prize');
let bad=await request('target',{action:'gift',target:'target',count:999,requestId:'bbbbbbbb-bbbbbbbb'});assert.equal(bad.code,403);
const admin='Lv0aTXfHM7M3CItek3dNwjjd0si1';let gift=await request(admin,{action:'gift',target:'target',kind:'premium',count:2,requestId:'cccccccc-cccccccc'});assert.equal(gift.sent,true);
let claimed=await request('target',{action:'claim',giftId:'cccccccc-cccccccc',requestId:'dddddddd-dddddddd'});assert.equal(claimed.wallet.premium,2);
claimed=await request('target',{action:'claim',giftId:'cccccccc-cccccccc',requestId:'eeeeeeee-eeeeeeee'});assert.equal(claimed.wallet.premium,2,'gift once even with different request ID');
const premium=await request('target',{action:'draw',kind:'premium',requestId:'ffffffff-ffffffff'});assert.equal(premium.item.category,5);assert.equal(premium.wallet.premium,1);assert(read('premiumOwnership/target/'+premium.item.id));
write('economy/empty',{tickets:0,premium:0});bad=await request('empty',{...args,requestId:'gggggggg-gggggggg'});assert.equal(bad.code,400);assert.equal(read('economy/empty/tickets'),0);
const trigger=players=>{write('rooms/1234/game',{phase:'ended',players,winner:'crew',round:1,playStartsAt:100});return{params:{room:'1234'},id:'event-one',data:{before:{val:()=> 'play'},after:{val:()=> 'ended'}}};};
await api.awardMatchTickets(trigger({solo:{role:'crew'},'bot-1':{bot:true}}));assert.equal(read('economy/solo'),null,'no solo farming');
const players=Object.fromEntries(Array.from({length:5},(_,i)=>['player'+i,{role:i===0?'impostor':'crew'}]));await api.awardMatchTickets(trigger(players));assert.equal(read('economy/player0/tickets'),55);assert.equal(read('economy/player1/tickets'),60);await api.awardMatchTickets(trigger(players));assert.equal(read('economy/player1/tickets'),60,'reward once');
assert.equal(new Set(catalog.map(x=>x.number)).size,catalog.length,'catalog IDs unique');
console.log('PASS: first bonus, draw retry, category, admin permissions, ticket claim, premium ownership, insufficient balance, minimum humans, match reward idempotency, catalog IDs');
