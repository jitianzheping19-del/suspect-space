import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createSelectedRoleRules} from '../selected-roles.js';
import {authoredKillRoles,resolveAuthoredKillRole} from '../authored-kill-player.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const section=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
let stamp=100000,serial=0;
function fixture(){
 const g={phase:'play',settings:{},players:{a:{name:'運搬者',subrole:'carrier',role:'impostor',alive:true,x:0,z:0}},bodies:{first:{x:0,z:1},second:{x:1,z:0}}};
 const events=[],rules=createSelectedRoleRules({clock:()=>stamp,token:()=>String(++serial),pose:(g,id)=>g.players[id],wallBetween:()=>false,emit:(...args)=>events.push(args)});
 const use=()=>{let result;rules.ability({g,p:g.players.a,actor:'a',cmd:{ability:'carrier',bodyId:'first'},setResult:ok=>result=ok});return result;};
 return{g,rules,use,events};
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function hostReport(g){
 let result,meetings=0;
 const ctx={g,p:g.players.a,actor:'a',cmd:{type:'report'},loc:g.players.a,dirty:false,distance,wallBetween:()=>false,beginMeeting:()=>{meetings++;return true;},setCommandResult:(_g,_a,_c,ok,text)=>result={ok,text}};
 vm.runInNewContext(section('if (cmd.type === "report" && p.carrierBodyId)','if (cmd.type === "emergency"'),ctx);
 return{...result,meetings};
}
{
 const{g,use,events}=fixture();assert(use());
 assert.equal(g.players.a.carrierBodyId,'first');assert.equal(g.bodies.first.carriedBy,'a');
 assert.equal(hostReport(g).ok,false,'The carrier cannot report another nearby corpse');
 assert.equal(hostReport(g).meetings,0);
 const begin=new Function('now',section('function beginMeeting(','function isMiniPlayer(')+';return beginMeeting;')(()=>stamp);
 assert.equal(begin(g,'a','遺体を発見','second'),false,'Forced reports share the carrying guard');
 const sent=[],notices=[],ctx={game:g,self:()=>g.players.a,position:g.players.a,distance,wallBetween:()=>false,canPlay:()=>true,sendCommand:type=>sent.push(type),toast:text=>notices.push(text)};
 vm.createContext(ctx);vm.runInContext(section('function nearestBody()','function killTarget()')+section('function tryReport()','function tryMeeting()'),ctx);
 assert.equal(ctx.nearestBody(),null);ctx.tryReport();assert.deepEqual(sent,[]);assert.match(notices[0],/運んでいる間/);
 g.players.a.x=2;assert(use());assert.equal(g.bodies.first.x,2);assert(!g.bodies.first.carriedBy);assert(!g.players.a.carrierBodyId);
 assert.equal(hostReport(g).ok,true,'Dropping restores report eligibility');ctx.tryReport();assert.deepEqual(sent,['report']);
 assert.deepEqual(events,[],'Carrying has no separately played effects');
}
{
 const{g}=fixture();g.bodies={carried:{x:0,z:0,carriedBy:'someone'}};
 assert.equal(hostReport(g).ok,false,'A forged report cannot target a carried corpse');
}
for(const reason of ['timeout','death','meeting','removed']){
 const{g,rules,use}=fixture();assert(use());g.players.a.x=3;g.players.a.z=4;
 if(reason==='timeout')stamp=g.players.a.carrierUntil+1;
 if(reason==='death')g.players.a.alive=false;
 if(reason==='meeting')g.phase='meeting';
 if(reason==='removed')delete g.bodies.first;
 rules.tick({g});assert(!g.players.a.carrierBodyId,reason+' clears the carry pose');
 if(g.bodies.first){assert(!g.bodies.first.carriedBy);assert.equal(g.bodies.first.x,3);assert.equal(g.bodies.first.z,4);}
}
assert(!authoredKillRoles.some(([id])=>id==='carrier'));
assert.equal(resolveAuthoredKillRole('killed',{subrole:'carrier'}),'impostor');
console.log('PASS carrier pickup/drop/cleanup, client and host report guards, carried-corpse rejection, no transport cinematic');
