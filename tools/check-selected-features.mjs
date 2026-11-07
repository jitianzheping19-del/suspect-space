import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {roomHasPower} from '../room-facilities.js';
import {gachaItemRates,chooseGachaItem} from '../gacha-rarity.js';
import {GACHA_CATALOG} from '../gacha-catalog.js';
import {createPracticeDatabase,practiceRef,practiceOperation as op,isPracticeReference} from '../practice-database.js';
const R=createLobbyGamesRules(),T=100000,people={u:{online:true,x:0,z:11},v:{online:true,x:1,z:11}},cmd=(s,kind,extra={})=>R.command(s,{uid:'u',id:kind,kind,at:T,...extra},people,'u',new Set(),T);
let s=R.fresh('u',T),r=cmd(s,'lobby-status',{value:'away'});assert(r.ok);s=r.state;assert.equal(s.statuses.u.until,T+60000);R.step(s,people,T+59999,.016);assert(s.statuses.u);R.step(s,people,T+60000,.001);assert(!s.statuses.u);
r=cmd(s,'photo-pose',{pose:'cheer'});assert(r.ok);s=r.state;r=cmd(s,'photo-start',{framed:true,roomName:'集まった部屋'});assert(r.ok);assert.equal(r.state.photo.poses.u,'cheer');assert.equal(r.state.photo.framed,true);assert.equal(r.state.photo.roomName,'集まった部屋');assert.deepEqual(Object.keys(r.state.photo.members),['u','v']);assert.equal(cmd(s,'photo-pose',{id:'bad',pose:'unknown'}).ok,false);
const rooms=[{id:'a',x:0,z:0},{id:'b',x:4,z:0}],panels=[{id:'lights-a',room:'lights',x:0,z:0},{id:'lights-b',kind:'lights',x:4,z:0}],contains=(x,z,r)=>Math.abs(x-r.x)<1&&Math.abs(z-r.z)<1,sabotage={type:'lights',endsAt:T+1000,switches:{'lights-a':true,'lights-b':false}};
assert(roomHasPower({x:0,z:0},rooms,panels,sabotage,T,contains));assert(!roomHasPower({x:4,z:0},rooms,panels,sabotage,T,contains));assert(!roomHasPower({x:2,z:0},rooms,panels,sabotage,T,contains));assert(roomHasPower({x:4,z:0},rooms,panels,sabotage,T+1001,contains));
for(const category of [0,1,2,3,4,5])for(const ratio of [0,.5,1]){
 const pool=GACHA_CATALOG.filter(x=>x.category===category),owned=Object.fromEntries(pool.slice(0,Math.floor(pool.length*ratio)).map(x=>[x.number,true])),rates=gachaItemRates(pool,owned,category===5),samples=10000,counts=new Map();
 for(let i=0;i<samples;i++){const item=chooseGachaItem(pool,owned,category===5,(i+.5)/samples);counts.set(item.number,(counts.get(item.number)||0)+1);}
 assert(Math.abs(rates.reduce((n,r)=>n+r.chance,0)-1)<1e-10);for(const {item,chance}of rates)assert(Math.abs((counts.get(item.number)||0)/samples-chance)<2/samples,'displayed rate follows actual selection '+item.name);
}
const a=createPracticeDatabase(),b=createPracticeDatabase(),ar=practiceRef(a,'rooms/practice/game'),br=practiceRef(b,'rooms/practice/game'),values=[];
const off=op('onValue',ar,snap=>values.push(snap.val()));await op('set',ar,{round:1,at:{'.sv':'timestamp'},players:{u:{alive:true}}});await op('runTransaction',ar,g=>({...g,round:g.round+1}));await op('update',ar,{'players/u/alive':false});await new Promise(resolve=>setImmediate(resolve));assert.equal((await op('get',ar)).val().players.u.alive,false);assert.equal((await op('get',ar)).val().round,2);assert.equal((await op('get',br)).exists(),false);assert.equal(isPracticeReference({practiceDB:a,path:ar.path}),false);assert(values.length>=3);off();
console.log('PASS one-minute status expiry; synchronized photo poses/frame; room-only power recovery; displayed gacha rates match 180000 actual selections; isolated practice stores and transactions');
