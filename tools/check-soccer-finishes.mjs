import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {sampleSoccerSkill,sampleSoccerDribble} from '../lobby-soccer-skills.js';
import {sampleSoccerOverhead} from '../lobby-soccer-finishes.js';
const R=createLobbyGamesRules(),T=100000;
const person=(x,z)=>({online:true,x,z,yaw:0,lobbyY:0,walking:false});
function start(players){return R.command(R.fresh('self',T),{id:'start',uid:'self',kind:'start-soccer',at:T},players,'self',new Set(),T,()=>.5).state;}
{
 const people={self:person(17,3)},s=start(people),g=s.soccer;
 assert.deepEqual(Object.keys(g.bots),['soccer-bot-1','soccer-bot-2']);assert.equal(g.members['soccer-bot-1'],g.members.self);assert.notEqual(g.members['soccer-bot-2'],g.members.self);
 const moves=new Set(),owners=new Set(),modes=new Set();let last={};
 for(let i=1;i<=5400;i++){
  R.step(s,people,T+i*1000/60,1/60);
  for(const [id,p]of Object.entries(g.bots)){if(last[id]&&Math.hypot(p.x-last[id].x,p.z-last[id].z)>.001)moves.add(id);last[id]={...p};assert(p.x>=R.SOCCER.left&&p.x<=R.SOCCER.right);}
  if(g.ball.dribbler)owners.add(g.ball.dribbler);
  for(const k of Object.values(g.kicks))modes.add(k.mode);
 }
 assert.equal(moves.size,2);assert(owners.has('soccer-bot-1')&&owners.has('soccer-bot-2'),'both bots gain possession');assert(modes.has('shot'),'bots shoot');assert(modes.has('pass')||modes.has('lob'),'ally bot passes');
 assert.deepEqual(Object.keys(people),['self'],'bots never become room occupants');
 people.self.online=false;R.step(s,people,T+91000,1/60);assert.equal(g.status,'finished');assert(g.cancelled);
 R.step(s,people,T+97000,1/60);assert.deepEqual(g.bots,{});assert.equal(g.status,'idle');
 console.log('PASS solo ally/opponent bots move, control, pass and shoot; departure ends practice and clears bots');
}
assert.equal(start({self:person(17,3),friend:person(24,15)}).soccer.bots,undefined,'multiplayer uses real players');
for(const trigger of [100,400,800,1000]){
 const people={self:person(23,10)},s=R.fresh('self',T);Object.assign(s.soccer.ball,{x:23,z:10.74,dribbler:'self'});
 let state=R.command(s,{id:'lift',uid:'self',kind:'soccer-skill',skill:'heelLift',side:1,yaw:0,at:T},people,'self',new Set(),T).state;
 let finish,hit=false;
 for(let i=1;i<200;i++){
  const age=i*10,time=T+age;
  if(!finish){people.self.z=10+sampleSoccerSkill('heelLift',Math.min(1120,age)).travelZ;}
  R.step(state,people,time,.01);
  if(age===trigger){assert(R.canOverhead(state,'self',people,time));const r=R.command(state,{id:'finish',uid:'self',kind:'soccer-overhead',at:time},people,'self',new Set(),time);assert(r.ok,r.message);state=r.state;finish=state.soccer.finishes.self;assert(!R.canOverhead(state,'self',people,time));assert(!R.canDash(state,'self',people,time));}
  hit ||=!!state.soccer.finishes?.self?.connected;
  if(finish){const pose=sampleSoccerOverhead(finish,time);if(pose)assert(Object.values(pose).every(v=>typeof v==='boolean'||Number.isFinite(v)));}
 }
 assert(hit,'overhead connects after trigger '+trigger);
 console.log('PASS heel lift to overhead at',trigger,'ms');
}
{
 const short=[],long=[];for(let age=0;age<3000;age+=5){short.push(sampleSoccerDribble(age,true));long.push(sampleSoccerDribble(age,true,-1,1,true));}
 assert(Math.max(...long.map(p=>p.z))-Math.min(...long.map(p=>p.z))>2*(Math.max(...short.map(p=>p.z))-Math.min(...short.map(p=>p.z))));
 for(const foot of [0,1])assert(short.some(p=>p.contacts[foot]>.95));
 assert(short.filter(p=>Math.max(...p.contacts)>.95).every(p=>p.z<.75),'contact precedes the forward push');
 console.log('PASS alternating foot contacts precede ball pushes; sprint touches travel further');
}
