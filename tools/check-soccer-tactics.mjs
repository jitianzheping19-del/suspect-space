import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerPassLane,soccerSupportSpot} from '../lobby-soccer-tactics.js';
import {updateSoccerPressRead,stepSoccerPress,applySoccerPress} from '../lobby-soccer-press.js';
const R=createLobbyGamesRules(),T=100000,person=(x,z,extra={})=>({online:true,x,z,yaw:0,lobbyY:0,...extra});
const players={self:person(23,8),blocked:person(23,16),open:person(26,16),enemy:person(23,12)};
const state=R.fresh('self',T),g=state.soccer;Object.assign(g,{status:'playing',members:{self:0,blocked:0,open:0,enemy:1},endAt:T+60000});
assert.equal(R.passTarget(state,'self',players,0),'open','slightly angled open pass beats directly marked teammate');
assert.equal(R.passTarget(state,'self',players,Math.PI),'','assist cannot reverse the intended direction');
assert(soccerPassLane(players.self,players.blocked,g,players,0)>.9);assert(soccerPassLane(players.self,players.open,g,players,0)<.1);
players.enemy.online=false;assert.equal(R.passTarget(state,'self',players,0),'blocked','offline opponent cannot block');players.enemy.online=true;players.enemy.observer=true;assert.equal(R.passTarget(state,'self',players,0),'blocked');players.enemy.observer=false;
Object.assign(g.ball,{x:23,z:8.74,dribbler:'self'});const spot=soccerSupportSpot(g,'open',players,R.SOCCER);
assert(spot.x>=R.SOCCER.left+1&&spot.x<=R.SOCCER.right-1&&spot.z>=R.SOCCER.near+1&&spot.z<=R.SOCCER.far-1);assert(Math.hypot(spot.x-players.self.x,spot.z-players.self.z)>2.5);assert(soccerPassLane(players.self,spot,g,players,0)<.3,'support opens a passing lane');
const defender=person(23,10),holder=person(23,12,{yaw:Math.PI}),ball={x:23,z:11.26},press={side:1};updateSoccerPressRead(press,defender,holder,ball,T);const initial=press.aimX;
holder.x+=.5;ball.x+=.5;updateSoccerPressRead(press,defender,holder,ball,T+70);assert.equal(press.aimX,initial,'automatic pursuit has reaction time');updateSoccerPressRead(press,defender,holder,ball,T+140);assert(press.aimX>initial+.5&&press.aimX<=initial+1.1,'bounded anticipation after reading movement');
for(const [kind,age,expected]of [['doubleTouch',200,'evaded'],['doubleTouch',600,'won'],['shotFeint',250,'evaded'],['shotFeint',520,'won']]){
 const people={owner:person(23,10),defender:person(23,11.3,{yaw:Math.PI})},q={status:'playing',members:{owner:0,defender:1},ball:{x:23,z:10.74,y:.3,vy:0,dribbler:'owner'},skills:{owner:{kind,at:T-age}},presses:{defender:{at:T-300,until:T+500,held:true,target:'owner',phase:'reach',contactAt:T,side:1}}};
 stepSoccerPress(q,people,T);assert.equal(q.presses.defender.result,expected,'timing matters, not blanket skill immunity');
}
console.log('PASS open passing lanes, directional assist, spectator filtering, uncrowded support, delayed bounded press anticipation, timed vs late feints');

{
 const players={owner:person(23,10),defender:person(23,11.3,{yaw:Math.PI})},q={status:'playing',members:{owner:0,defender:1},ball:{x:23,z:10.74,y:.3,vy:0,dribbler:'owner'}};
 let serial=0;const input=(time,mode)=>applySoccerPress(q,{uid:'defender',held:true,mode,at:time,serial:++serial},players,time);
 assert(!input(T,'invalid'));input(T,'matchup');
 for(let age=0;age<=2000;age+=100){input(T+age,'matchup');stepSoccerPress(q,players,T+age);}
 assert.equal(q.ball.dribbler,'owner');assert.equal(q.presses.defender.phase,'contain');assert(q.presses.defender.aimZ>players.defender.z,'close matchup steps back');
 input(T+2100,'press');stepSoccerPress(q,players,T+2100);assert.equal(q.presses.defender.phase,'reach');
 // A mode change cancels a pending tackle, never steals during containment.
 input(T+2200,'matchup');stepSoccerPress(q,players,T+2300);assert.equal(q.ball.dribbler,'owner');
 q.presses.defender.phase='recover';q.presses.defender.recoverUntil=T+3000;input(T+2400,'press');stepSoccerPress(q,players,T+2500);assert.equal(q.presses.defender.phase,'recover','switching cannot skip recovery');
 input(T+3100,'press');stepSoccerPress(q,players,T+3100);stepSoccerPress(q,players,T+3300);assert.equal(q.ball.dribbler,'defender');
}
console.log('PASS matchup keeps distance without stealing, press transition, cancellation and recovery guards');
