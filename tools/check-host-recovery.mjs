import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=source.indexOf('    let hostRecoveryWarned=false;'),end=source.indexOf('    setInterval(recoverHost,2000);',start);
assert(start>0&&end>start);
function fixture(){
 let stamp=1000;const writes=[],notices=[];
 const c=vm.createContext({code:'room-a',connected:true,takeoverBusy:false,hostBusy:false,hostMissingAt:0,uid:'a',hostId:'old',session:1,db:{},SPACE_SUSPECT_ADMIN_UIDS:new Set(),
  players:{old:{online:false},a:{online:true},b:{online:true},'0bot':{online:true,bot:true}},preferredAdminHost:()=>'',hostOnline:()=>c.players[c.hostId]?.online===true,isHost:()=>c.uid===c.hostId,now:()=>stamp,
  toast:(...args)=>notices.push(args),ref:(_,path)=>path,runTransaction:async(path,update)=>{writes.push({path,update});return {committed:false};}});
 vm.runInContext(source.slice(start,end),c);return{c,writes,notices,time:value=>stamp=value};
}
{
 const {c,writes,notices,time}=fixture();await c.recoverHost();assert.match(notices[0][0],/再接続/);assert.equal(writes.length,0);
 time(20999);await c.recoverHost();assert.equal(writes.length,0,'20 second recovery grace');
 time(21000);await c.recoverHost();assert.equal(writes.length,1);const {path,update}=writes[0];assert.equal(path,'rooms/room-a/hostId');assert.equal(update('old'),'a');assert.equal(update('other'),undefined);
 c.players.old.online=true;assert.equal(update('old'),undefined,'host returned during transaction');c.players.old.online=false;
 c.connected=false;assert.equal(update('old'),undefined);c.connected=true;
 c.players.a.online=false;assert.equal(update('old'),undefined);c.players.a.online=true;
 c.players['0human']={online:true};assert.equal(update('old'),undefined);delete c.players['0human'];
 c.code='room-b';assert.equal(update('old'),undefined);c.code='room-a';c.session++;assert.equal(update('old'),undefined);
}
{
 const {c,writes,time}=fixture();c.uid='b';await c.recoverHost();time(22000);await c.recoverHost();assert.equal(writes.length,0,'only the earliest eligible human may claim');
 c.uid='a';c.players.old.online=true;await c.recoverHost();assert.equal(c.hostMissingAt,0);assert.equal(writes.length,0);
}
{
 const {c,writes}=fixture();c.preferredAdminHost=()=> 'a';await c.recoverHost();assert.equal(writes.length,0); // admin rate limiter
}
{
 const {c,writes,time}=fixture();c.preferredAdminHost=()=> 'a';time(3000);await c.recoverHost();assert.equal(writes[0].update('old'),'a');c.session++;assert.equal(writes[0].update('old'),undefined);
}
console.log('PASS host grace, returning host, deterministic eligible human, competing host, disconnect, room/session change and admin handover guards');
