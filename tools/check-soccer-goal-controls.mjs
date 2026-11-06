import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerPitch} from '../lobby-soccer-match.js';
const R=createLobbyGamesRules(),T=100000;
const person=(x,z,yaw=0)=>({online:true,x,z,yaw,lobbyY:0});
const people={self:person(23,8),friend:person(28,12),enemy:person(30,18,Math.PI)};
function fresh(){const s=R.fresh('self',T);Object.assign(s.soccer,{status:'playing',members:{self:0,friend:0,enemy:1},endAt:T+180000});Object.assign(s.soccer.ball,{x:23,z:8.74,dribbler:'self'});return s;}
function command(s,extra,time=T){return R.command(s,{uid:'self',id:'input:'+time,at:time,yaw:0,...extra},people,'self',new Set(),time);}
for(const count of [2,12,20])for(const team of [0,1])for(const force of [false,true]){
 const s=fresh();s.soccer.pitchCount=count;R.setSoccerPitch(s.soccer);s.soccer.members.self=team;
 const F=soccerPitch(count),z=team?F.near:F.far;
 assert(F.goal>6.4&&F.goalHeight>2.5);
 for(const side of [-1,1]){
  const yaw=Math.atan2(side*(F.goal/2+1.2),z-people.self.z),aim=R.kickAim(s,'self',people,yaw,force);
  assert(aim.goal);assert(Math.abs(aim.x-23)<F.goal/2-F.radius-F.postRadius);
  assert.equal(aim.z,z);
  const result=command(s,{kind:'kick',mode:'shot',yaw,power:.6});assert(result.ok);
  assert(Math.abs(result.state.soccer.kicks.self.yaw-aim.yaw)<1e-8,'host and guide agree');
 }
 assert(!R.kickAim(s,'self',people,Math.PI/2,true).goal,'sideways shots remain free');
}
R.setSoccerPitch(fresh().soccer);
console.log('PASS larger goals and assisted normal/double-tap shots for both teams on every pitch size');
for(const dt of [1/60,1/30,.1]){
 const s=fresh();Object.assign(s.soccer.ball,{x:28,z:12.74,dribbler:'friend',lastTouch:'friend'});
 const result=command(s,{kind:'kick',mode:'shot',buffered:true,power:.8});assert(result.ok);const queued=result.state;
 R.step(queued,people,T+100,dt);assert(!queued.soccer.kicks.self,'cannot kick while teammate has possession');
 Object.assign(queued.soccer.ball,{x:23,z:9.1,vx:0,vz:-6,vy:0,dribbler:'',lastTouch:'friend'});
 R.step(queued,people,T+200,dt);assert(queued.soccer.kicks.self);assert(!queued.soccer.queuedKicks.self);
 R.step(queued,people,T+320,dt);assert(queued.soccer.kicks.self.connected,'buffer fires on arrival');
 const id=queued.soccer.kicks.self.id;R.step(queued,people,T+500,dt);assert.equal(queued.soccer.kicks.self.id,id);
 for(const cancel of ['expiry','opponent','exit','finished']){
  const state=command(s,{kind:'kick',mode:'shot',buffered:true}).state;
  const roster=structuredClone(people);
  if(cancel==='opponent')state.soccer.ball.dribbler='enemy';
  if(cancel==='exit')roster.self.online=false;
  if(cancel==='finished')state.soccer.status='finished';
  R.step(state,roster,T+(cancel==='expiry'?3100:100),dt);
  assert(!state.soccer.queuedKicks?.self,cancel);assert(!state.soccer.kicks.self);
 }
 s.soccer.ball.dribbler='enemy';assert(!command(s,{kind:'kick',mode:'shot',buffered:true}).ok);
}
console.log('PASS first-touch shot at 10/30/60 Hz, no teammate theft, single use, expiry and cancellation');
for(const dt of [1/60,1/30,.1])for(const distance of [.9,1.5,2.6]){
 const roster=structuredClone(people);roster.enemy={...person(23,8+distance,Math.PI)};
 const s=fresh();const result=R.command(s,{kind:'soccer-skill',skill:'nutmeg',side:1,yaw:.25,uid:'self',id:'nut',at:T},roster,'self',new Set(),T);assert(result.ok);
 let crossed=false;
 for(let age=0;age<600;age+=dt*1000){R.step(result.state,roster,T+age,dt);if(result.state.soccer.ball.z>roster.enemy.z+.72)crossed=true;}
 assert(crossed,`nutmeg must clear defender at ${distance}, ${dt}`);
 assert.equal(result.state.soccer.ball.dribbler,'');assert(result.state.soccer.nutmegs.enemy);
}
console.log('PASS nutmeg clears close and distant defenders, with facing assistance, at 10/30/60 Hz');
let s=fresh();Object.assign(s.soccer.ball,{x:30,z:20,dribbler:''});
for(let age=0;age<2000;age+=250){assert(R.canDash(s,'self',people,T+age,true));const result=command(s,{kind:'soccer-dash',held:true},T+age);assert(result.ok);s=result.state;assert(s.soccer.dashes.self.until>T+age);}
s=command(s,{kind:'soccer-dash',held:false},T+2100).state;assert.equal(s.soccer.dashes.self.until,T+2100);
console.log('PASS sustained loose-ball sprint and immediate release');
