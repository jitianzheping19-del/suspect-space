import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
const R=createLobbyGamesRules(),T=100000;
const person=(x,z,yaw=0)=>({online:true,x,z,yaw,lobbyY:0});
function fixture(){
 const people={owner:person(23,10),defender:person(23,11.3,Math.PI),friend:person(29,18),second:person(29,16)};
 const state=R.fresh('owner',T);Object.assign(state.soccer,{status:'playing',members:{owner:0,defender:1,friend:0,second:1},endAt:T+60000});
 Object.assign(state.soccer.ball,{x:23,z:10.74,dribbler:'owner'});
 return {people,state,time:T,serial:0};
}
function input(f,held=true,id='defender',extra={}){return R.pressInput(f.state.soccer,{uid:id,held,serial:++f.serial,at:f.time,...extra},f.people,f.time);}
function run(f,ms,{renew=true,dt=1/60}={}){
 const end=f.time+ms;let lastRenew=f.time,previous={...f.state.soccer.ball},maxStep=0;
 while(f.time<end){f.time+=dt*1000;if(renew&&f.time-lastRenew>=240){input(f);lastRenew=f.time;}R.step(f.state,f.people,f.time,dt);maxStep=Math.max(maxStep,R.distance(previous,f.state.soccer.ball));previous={...f.state.soccer.ball};}
 return maxStep;
}
for(const dt of [1/60,1/30,.1]){
 const f=fixture();input(f);run(f,270,{dt});assert.equal(f.state.soccer.ball.dribbler,'owner','approach never steals');
 const travel=run(f,450,{dt});assert.equal(f.state.soccer.ball.dribbler,'defender');assert.equal(f.state.soccer.presses.defender.result,'won');assert(travel<.3,'contact moves the ball without teleportation');
 run(f,300,{renew:false,dt});assert.equal(f.state.soccer.ball.dribbler,'defender','possession remains stable');
}
console.log('PASS timed, facing-aware steal at 60/30/10 Hz; continuous ball and stable ownership');
{
 const f=fixture();Object.assign(f.people.defender,{x:23.85,z:9.8,yaw:Math.atan2(-.85,.94)});input(f);run(f,750);
 assert.equal(f.state.soccer.ball.dribbler,'owner');assert.equal(f.state.soccer.presses.defender.result,'shielded');
 const q=fixture();q.people.defender.yaw=0;input(q);run(q,750);assert.equal(q.state.soccer.presses.defender.result,'miss');assert.equal(q.state.soccer.ball.dribbler,'owner');
}
console.log('PASS shoulder/body shielding and facing away cannot win');
{
 const f=fixture();input(f);run(f,300);const result=R.command(f.state,{uid:'owner',id:'counter',at:f.time,kind:'soccer-skill',skill:'doubleTouch',side:1,yaw:0},f.people,'owner',new Set(),f.time);assert(result.ok);f.state=result.state;
 run(f,300);assert.equal(f.state.soccer.ball.dribbler,'owner');assert.equal(f.state.soccer.presses.defender.result,'evaded');assert.equal(f.state.soccer.presses.defender.outcome,'beaten');
 const f2=fixture();input(f2);run(f2,300);input(f2,false);run(f2,700,{renew:false});assert.equal(f2.state.soccer.ball.dribbler,'owner','release during windup cancels contact');
}
console.log('PASS correctly timed feint escapes; releasing cancels even during windup');
{
 const f=fixture();input(f);run(f,300);Object.assign(f.state.soccer.ball,{dribbler:'',freeUntil:f.time+2000,vz:5});run(f,200,{renew:false});assert(!f.state.soccer.presses.defender.held,'a pass interrupts pursuit');
 for(const change of [f=>f.people.owner.online=false,f=>f.people.defender.online=false,f=>f.people.owner.x=0,f=>f.people.defender.lobbyY=1,f=>f.state.soccer.status='finished']){
  const f=fixture();input(f);change(f);run(f,200,{renew:false});assert(!R.pressActive(f.state.soccer,'defender',f.time));
 }
 const f2=fixture();f2.people.defender.z=16;input(f2);run(f2,1000,{renew:false});assert(!R.pressActive(f2.state.soccer,'defender',f2.time),'missing heartbeat expires');
}
console.log('PASS pass, disconnect, exit, jump, match end and lost input stop pursuit');
{
 const f=fixture();assert.equal(R.pressTarget(f.state.soccer,'friend',f.people,f.time),'');assert.equal(R.pressTarget(f.state.soccer,'owner',f.people,f.time),'');
 f.people.defender.observer=true;assert.equal(R.pressTarget(f.state.soccer,'defender',f.people,f.time),'');f.people.defender.observer=false;
 input(f);input(f,false);const serial=f.serial;assert(!input(f,true,'defender',{serial:serial-1}));assert(!R.pressActive(f.state.soccer,'defender',f.time));
 assert(!input(f,true,'defender',{serial:NaN}));assert(!input(f,true,'defender',{at:f.time-4000}));
 const q=fixture();q.people.defender.z=20;input(q);run(q,4400);assert.equal(q.state.soccer.presses.defender.outcome,'tired');assert(!R.pressActive(q.state.soccer,'defender',q.time));
}
console.log('PASS team/spectator guards, ordered release, malformed input, fatigue cap');
{
 const f=fixture();Object.assign(f.people.second,{x:23.4,z:11.3,yaw:Math.atan2(-.4,-.56)});input(f);input(f,true,'second');run(f,700);
 assert.equal(f.state.soccer.ball.dribbler,'defender');assert.notEqual(f.state.soccer.presses.second.result,'won','one winner per contest');
 const noPress=fixture();run(noPress,900,{renew:false});assert.equal(noPress.state.soccer.ball.dribbler,'owner','proximity alone cannot bypass a challenge');
}
console.log('PASS simultaneous challenges choose one winner; no passive ownership flicker');
{
 const f=fixture(),dash=()=>R.command(f.state,{uid:'defender',id:'dash-'+f.time,at:f.time,kind:'soccer-dash'},f.people,'owner',new Set(),f.time);
 let result=dash();assert(result.ok);f.state=result.state;assert.equal(f.state.soccer.dashes.defender.until-f.time,650);assert.equal(dash().ok,false,'no duplicate sprint');f.time+=1000;assert(dash().ok);
 f.people.defender.observer=true;assert(!dash().ok);f.people.defender.observer=false;input(f);assert(!R.canDash(f.state,'defender',f.people,f.time),'no dash during press');
 const p=fixture();p.people.owner.walking=true;R.step(p.state,p.people,p.time,1/60);const start=p.state.soccer.dribble.rollAt;assert.equal(start,p.time);p.people.owner.walking=false;p.time+=100;R.step(p.state,p.people,p.time,1/60);assert.equal(p.state.soccer.dribble.rollAt,start,'short nudge retains roll clock');
}
console.log('PASS dash duration, cooldown, spectator/press guards and brief-input sole roll');
