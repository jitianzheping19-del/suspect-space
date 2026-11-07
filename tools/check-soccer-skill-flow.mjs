import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {SOCCER_SKILLS} from '../lobby-soccer-skills.js';
const T=100000;
function fixture(kind){
 const R=createLobbyGamesRules(),players={self:{online:true,x:23,z:9,yaw:0,lobbyY:0,walking:true},enemy:{online:true,x:23,z:11,yaw:Math.PI,lobbyY:0}};
 let state=R.fresh('self',T);Object.assign(state.soccer.ball,{x:23,z:9.74,dribbler:'self'});
 const r=R.command(state,{uid:'self',id:kind,kind:'soccer-skill',skill:kind,side:1,yaw:0,at:T},players,'self',new Set(),T);assert(r.ok,r.message);return {R,players,state:r.state};
}
for(const kind of Object.keys(SOCCER_SKILLS))for(const networkMs of [16.67,50,100]){
 let {R,players,state}=fixture(kind);let nextPose=0,maxGap=0;
 for(let age=0;age<SOCCER_SKILLS[kind].duration;age+=1000/60){
  if(age>=nextPose){const yaw=Math.min(1.6,age/1000*3);Object.assign(players.self,{x:23+Math.sin(yaw)*age/1000*.7,z:9+Math.cos(yaw)*age/1000*.7,yaw});nextPose+=networkMs;}
  R.step(state,players,T+age,1/60);const g=state.soccer,skill=g.skills.self;
  assert(!skill.cancelled,kind+' remains active while moving and turning');
  if(!skill.released){assert(Math.abs(skill.yaw-players.self.yaw)<1e-9,'host uses the current player heading');maxGap=Math.max(maxGap,R.distance(players.self,g.ball));assert.equal(g.ball.dribbler,'self');}
  // Round-trip the snapshot as if it had arrived over the network.
  state=JSON.parse(JSON.stringify(state));
 }
 assert(maxGap<1.3,kind+' ball stays within controlled reach at '+networkMs+' ms');
}
console.log('PASS all six moving/turning skills keep possession until their release at 60/20/10 Hz pose delivery');
for(const kind of ['doubleTouch','shotFeint','roulette','scissors'])for(const mode of ['shot','pass']){
 const f=fixture(kind),{R,players}=f;let state=f.state;
 assert(!R.canKick(state,'self',players,T+50),'cannot skip the initial ball contact');
 assert(R.canDash(state,'self',players,T+50),'dash remains available during the touch');
 for(let age=0;age<=SOCCER_SKILLS[kind].kickAt;age+=10){players.self.yaw=Math.min(.7,age/1000);players.self.x+=.007;R.step(state,players,T+age,.01);}
 const time=T+SOCCER_SKILLS[kind].kickAt;
 assert(R.canKick(state,'self',players,time));
 const shot=R.command(state,{uid:'self',id:'next',kind:'kick',mode,power:.6,yaw:players.self.yaw,at:time},players,'self',new Set(),time);assert(shot.ok,shot.message);state=shot.state;
 assert(state.soccer.skills.self.cancelled,'kick replaces the skill recovery');
 R.step(state,players,time+120,1/60);assert(state.soccer.kicks.self.connected,'follow-up kick really touches the ball');
}
{
 const {R,players,state}=fixture('doubleTouch');state.soccer.ball.dribbler='enemy';R.step(state,players,T+100,1/60);assert(state.soccer.skills.self.cancelled);assert(!R.canKick(state,'self',players,T+400));
}
console.log('PASS contact first, early pass/shot follow-ups, dash during skills and cancellation on possession loss');
