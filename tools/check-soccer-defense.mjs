import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {SOCCER_SLIDE,sampleSoccerSlide} from '../lobby-soccer-slide.js';
import {stepSoccerBots} from '../lobby-soccer-bots.js';
const R=createLobbyGamesRules(),T=100000;
const person=(x,z,yaw=0)=>({online:true,x,z,yaw,lobbyY:0});
function fixture(){const players={self:person(23,12,Math.PI),enemy:person(23,10),ally:person(29,14)};const s=R.fresh('self',T);Object.assign(s.soccer,{status:'playing',members:{self:0,enemy:1,ally:0},endAt:T+100000});Object.assign(s.soccer.ball,{x:23,z:10.74,dribbler:'enemy'});return {s,players};}
function slide(s,players,time=T,yaw=Math.PI){return R.command(s,{id:'slide-'+time,kind:'soccer-slide',uid:'self',at:time,yaw},players,'self',new Set(),time);}
for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){const f=fixture(),r=slide(f.s,f.players,T,yaw);assert(r.ok);assert(Math.abs(Math.atan2(Math.sin(r.state.soccer.slides.self.yaw-yaw),Math.cos(r.state.soccer.slides.self.yaw-yaw)))<.001);assert(!slide(r.state,f.players,T+100).ok);assert(!R.canKick(r.state,'self',f.players,T+100));assert(!R.canDash(r.state,'self',f.players,T+100));}
for(const dt of [1/60,1/30,.1]){
 const f=fixture(),r=slide(f.s,f.players);let time=T;
 for(let i=1;i<=Math.ceil(.5/dt);i++){time=T+i*dt*1000;f.players.self.z=12-sampleSoccerSlide(r.state.soccer.slides.self,time).travel;R.step(r.state,f.players,time,dt);}
 assert(r.state.soccer.slides.self.connected,'actual ground contact breaks opponent possession');assert.notEqual(r.state.soccer.ball.dribbler,'enemy');assert.equal(r.state.soccer.ball.lastTouch,'self');
}
for(const change of [f=>f.players.self.observer=true,f=>f.players.self.lobbyY=1,f=>f.s.soccer.status='countdown',f=>f.s.soccer.members.self=1,f=>f.s.soccer.ball.dribbler='self',f=>f.s.soccer.kickoff={released:false,until:T+1000},f=>f.players.self.x=10]){const f=fixture();change(f);assert(!slide(f.s,f.players).ok);}
{
 const f=fixture(),r=slide(f.s,f.players,T,Math.PI/2);R.step(r.state,f.players,T+300,.016);assert.equal(r.state.soccer.ball.dribbler,'enemy','distant slide never steals');assert(!slide(f.s,f.players,T,NaN).ok);assert(!slide(f.s,f.players,T,Infinity).ok);
 f.players.self.online=false;R.step(r.state,f.players,T+400,.016);assert(!r.state.soccer.slides.self);
}
const motion=sampleSoccerSlide({at:T,until:T+SOCCER_SLIDE.duration},T+350);assert(motion.weight>.99&&motion.travel>.6&&motion.pitch<-.9);assert.equal(sampleSoccerSlide({at:T,until:T+SOCCER_SLIDE.duration},T+SOCCER_SLIDE.duration),null);
{
 const f=fixture();f.s.soccer.bots={bot:{...person(20,10),bot:true,soccerBot:true,team:1}};f.s.soccer.members.bot=1;const p=f.s.soccer.bots.bot,rows=R.soccerRoster(f.s.soccer,f.players),x=p.x,z=p.z;stepSoccerBots(f.s.soccer,rows,R.SOCCER,T,.1);assert(Math.hypot(p.x-x,p.z-z)<=.286,'bot speed capped at 2.85');
 Object.assign(f.s.soccer.ball,{dribbler:'bot',x:p.x,z:p.z+.7});p.nextAction=T+10000;const before={...p};stepSoccerBots(f.s.soccer,rows,R.SOCCER,T+100,.1);assert(Math.hypot(p.x-before.x,p.z-before.z)<=.206,'ball carrier slower at 2.05');
}
console.log('PASS directional slide, swept contact at 60/30/10 Hz, no remote steals, cooldown, ground/team/lifecycle guards, staged motion and reduced bot speeds');
