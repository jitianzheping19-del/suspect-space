import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerRoster,stepSoccerBots} from '../lobby-soccer-bots.js';
import {soccerBotPassTarget,soccerBotPassSafe,soccerBotPassMode} from '../lobby-soccer-tactics.js';
const R=createLobbyGamesRules(),T=100000,F=R.SOCCER;
const person=(x,z,extra={})=>({online:true,x,z,yaw:0,lobbyY:0,...extra});
function fixture(){
 const people={host:person(14.5,4),mate:person(17,17)},s=R.fresh('host',T),g=s.soccer;
 Object.assign(g,{status:'playing',members:{host:0,mate:0},endAt:T+180000,bots:{},botOptions:{enabled:true,blue:4,red:4}});
 for(const [team,points]of [[0,[[23,8],[17,6],[29,5],[18,14]]],[1,[[23,14],[17,20],[29,20],[30,13]]]]){
  points.forEach(([x,z],i)=>{const id=(team?'red':'blue')+i;g.bots[id]=person(x,z,{bot:true,soccerBot:true,team,yaw:team?Math.PI:0,nextAction:0});g.members[id]=team;});
 }
 Object.assign(g.ball,{x:23,z:10,dribbler:''});return {s,g,people};
}
for(const dt of [1/60,1/30,.1]){
 const {s,g,people}=fixture();let time=T;
 for(let n=0;n<3/dt;n++){time+=dt*1000;stepSoccerBots(g,soccerRoster(g,people),F,time,dt);}
 for(const team of [0,1]){
  const bots=Object.entries(g.bots).filter(([id])=>g.members[id]===team);
  assert.equal(bots.filter(([id])=>g.botTactics.roles[id]?.role==='chase').length,1);
  assert.equal(bots.filter(([,p])=>Math.hypot(p.x-23,p.z-10)<2).length,1,'only one bot closes on a loose ball');
  const support=bots.filter(([id])=>g.botTactics.roles[id]?.role==='support');assert(support.length>=2);
  for(const [i,[,p]]of support.entries())for(const [,q]of support.slice(i+1))assert(Math.hypot(p.x-q.x,p.z-q.z)>2,'support players spread out');
 }
 // Once the human controls the ball, exactly one red bot pressures them.
 Object.assign(people.host,{x:23,z:10});Object.assign(g.ball,{x:23,z:10.74,dribbler:'host'});
 for(let n=0;n<1/dt;n++){time+=dt*1000;stepSoccerBots(g,soccerRoster(g,people),F,time,dt);}
 assert.equal(Object.entries(g.presses||{}).filter(([id,p])=>g.members[id]===1&&p.held).length,1);
 assert(Object.values(g.botTactics.roles).some(p=>p.role==='mark'));
 const first=Object.keys(g.presses).find(id=>g.presses[id].held);g.bots[first].online=false;
 time+=dt*1000;stepSoccerBots(g,soccerRoster(g,people),F,time,dt);
 assert(!g.presses[first].held,'departed chaser releases pressure');
 assert.equal(Object.values(g.presses).filter(p=>p.held).length,1,'another bot takes over');
 // A named human receiver gets space while the ball is travelling.
 g.ball.dribbler='';g.flight={from:'blue0',target:'mate',x:17,z:17,at:time,arrivalAt:time+1000};
 stepSoccerBots(g,soccerRoster(g,people),F,time+10,dt);
 assert(Object.entries(g.botTactics.roles).filter(([id])=>g.members[id]===0).every(([,p])=>!['chase','receive'].includes(p.role)));
}
console.log('PASS one chaser, separated passing options, defender marking, reassignment and space for human receivers at 10/30/60 Hz');

function feintFixture(kind=0){
 const s=R.fresh('host',T),g=s.soccer,people={host:person(28,14),enemy:person(23,12,{yaw:Math.PI}),marked:person(23,18),marker:person(23,18.8)};
 Object.assign(g,{status:'playing',members:{host:0,enemy:1,marked:0,marker:1,bot:0},endAt:T+180000,bots:{bot:person(23,10,{bot:true,soccerBot:true,team:0,feintCount:kind,ownedAt:T-500})}});
 Object.assign(g.ball,{x:23,z:10.74,dribbler:'bot'});return {s,g,people};
}
for(const dt of [1/60,1/30,.1])for(const count of [0,1]){
 let {s,g,people}=feintFixture(count);const start={...g.bots.bot};
 R.step(s,people,T,dt);assert.equal(g.skills.bot.kind,count?'shotFeint':'doubleTouch');assert(!g.kicks.bot,'feint visibly precedes the pass');
 assert.equal(g.bots.bot.feintPass.target,'host','open teammate beats a tightly marked option');
 let connected=null;
 for(let n=1;n<3/dt;n++){
  const time=T+n*dt*1000;R.step(s,people,time,dt);
  if(g.kicks.bot?.connected){connected=g.kicks.bot;break;}
  if(n%5===0){s=JSON.parse(JSON.stringify(s));g=s.soccer;}
 }
 assert(connected,'feint must finish in an actual connected kick');assert.equal(connected.target,'host');assert(['pass','lob'].includes(connected.mode));
 assert(connected.at>=T+(count?700:680));assert(Math.hypot(g.bots.bot.x-start.x,g.bots.bot.z-start.z)>.5,'feint moves the bot on the field');
 assert(!g.skills.bot.cancelled);assert.equal(g.bots.bot.feintCount,count+1,'no repeated feints instead of passing');
 const flightEnd=T+4500;for(let time=connected.contact.at+dt*1000;time<flightEnd;time+=dt*1000){R.step(s,people,time,dt);if(g.ball.dribbler==='host')break;}
 assert.equal(g.ball.dribbler,'host','pass reaches the open teammate');
}
console.log('PASS double-touch and shot-feint animations move the bot, complete once, then pass to an open teammate at 10/30/60 Hz');
{
 const {s,g,people}=feintFixture();R.step(s,people,T,1/60);people.host.online=false;
 for(let n=1;n<100;n++)R.step(s,people,T+n*1000/60,1/60);
 assert.notEqual(g.kicks.bot?.target,'host','re-evaluate a departing pass recipient');
 const lost=feintFixture();R.step(lost.s,lost.people,T,1/60);lost.g.ball.dribbler='enemy';R.step(lost.s,lost.people,T+50,1/60);
 assert(!lost.g.bots.bot.feintPass);assert(!lost.g.kicks.bot,'lost possession cannot trigger the prepared pass');
 const behind=feintFixture();behind.people.enemy.z=8;behind.people.marker.z=20;R.step(behind.s,behind.people,T,1/60);assert(!behind.g.skills?.bot,'no automatic feint without an opponent in front');
 const rows=soccerRoster(g,people);rows.marked.observer=true;assert.equal(soccerBotPassTarget(g,'bot',rows,F),'','unavailable teammates are ignored');
}
console.log('PASS reselect departed receivers, cancel after possession loss and avoid unnecessary feints');

{
 const g={members:{bot:0,mate:0,enemy:1}},p={bot:person(23,5),mate:person(23,15),enemy:person(23,6.2)};
 assert.equal(soccerBotPassTarget(g,'bot',p,F),'','cannot lob through a defender immediately ahead');
 p.enemy.z=10;assert.equal(soccerBotPassMode(p.bot,p.mate,g,p,0,F),'lob');assert.equal(soccerBotPassTarget(g,'bot',p,F),'mate','lob can clear a distant defender');
 p.enemy.z=14.3;assert.equal(soccerBotPassTarget(g,'bot',p,F,'mate'),'','reject a now-marked preferred receiver');
 p.mate=person(27,6);p.enemy=person(25,5.5);assert(!soccerBotPassSafe(p.bot,p.mate,g,p,0,F),'blocked short pass');
 p.enemy=person(25,9);assert.equal(soccerBotPassTarget(g,'bot',p,F),'mate','open short pass remains available');
 const {s,g:match,people}=feintFixture();match.bots.bot.ownedAt=T-2000;match.skills={bot:{kind:'doubleTouch',at:T-1000,cooldownUntil:T+5000}};
 people.host=person(23,20);people.enemy=person(23,11.8);people.marked.online=false;
 R.step(s,people,T,1/60);assert(!match.kicks.bot||match.kicks.bot.mode==='shot','bot never schedules blocked pass during skill cooldown');
}
console.log('PASS close blockers and marked receivers rejected; safe long lob and open short pass preserved');
