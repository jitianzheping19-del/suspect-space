import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerDashStatus,stopSoccerDash} from '../lobby-soccer-stamina.js';
const R=createLobbyGamesRules(),T=100000;
const people={self:{online:true,x:23,z:8,yaw:0},friend:{online:true,x:28,z:12,yaw:0},enemy:{online:true,x:30,z:18,yaw:Math.PI}};
function fresh(){const s=R.fresh('self',T);Object.assign(s.soccer,{status:'playing',members:{self:0,friend:0,enemy:1},endAt:T+180000});Object.assign(s.soccer.ball,{x:27,z:14,dribbler:''});return s;}
function dash(s,time,held=true){return R.command(s,{uid:'self',id:'dash:'+time+':'+held,kind:'soccer-dash',at:time,held},people,'self',new Set(),time);}
for(const dt of [1/60,1/30,.1]){
 let s=fresh();
 for(let age=0;age<4000;age+=250){
  const result=dash(s,T+age);assert(result.ok,result.message);s=JSON.parse(JSON.stringify(result.state));
  assert(Math.abs(soccerDashStatus(s.soccer,'self',T+age).value-(4000-age))<1e-6,'heartbeats cannot refill');
  assert(s.soccer.dashes.self.until<=T+4000);
  R.step(s,people,T+age+100,dt);
 }
 assert(soccerDashStatus(s.soccer,'self',T+3999).running);
 assert.equal(soccerDashStatus(s.soccer,'self',T+4000).value,0);
 assert(!soccerDashStatus(s.soccer,'self',T+4000).running);
 const late=dash(s,T+4000);assert(late.ok,'late heartbeat is acknowledged without an input error');assert(!soccerDashStatus(late.state.soccer,'self',T+4000).running,'late heartbeat cannot extend sprint');
 assert(!R.canDash(s,'self',people,T+4000,true),'host prevents sprinting while exhausted');
 assert(!R.canDash(s,'self',people,T+5000,true),'wait for 25 percent before restarting');
 assert(R.canDash(s,'self',people,T+5500,true));
 assert.equal(soccerDashStatus(s.soccer,'self',T+5500).value,1000);
 assert.equal(soccerDashStatus(s.soccer,'self',T+8500).value,4000);
}
console.log('PASS exact four-second limit, serialized heartbeat renewals, exhaustion, recovery and restart at 10/30/60 Hz');
{
 let s=fresh();for(let age=0;age<1000;age+=250)s=dash(s,T+age).state;
 s=dash(s,T+1000,false).state;assert.equal(soccerDashStatus(s.soccer,'self',T+1000).value,3000);
 assert(!soccerDashStatus(s.soccer,'self',T+1000).running);
 assert.equal(soccerDashStatus(s.soccer,'self',T+2000).value,3500);
 const again=dash(s,T+2000);assert(again.ok);assert.equal(again.state.soccer.dashes.self.energyMs,3500);
 const expired=dash(fresh(),T).state;const before=soccerDashStatus(expired.soccer,'self',T+2000).value;
 stopSoccerDash(expired.soccer,'self',T+2000);assert.equal(soccerDashStatus(expired.soccer,'self',T+2000).value,before,'late release must not consume expired lease');
 const longGap=dash(fresh(),T).state;assert(!soccerDashStatus(longGap.soccer,'self',T+700).running,'lost heartbeat expires');
 assert.equal(soccerDashStatus(longGap.soccer,'self',T+10000).value,4000);
 assert.equal(soccerDashStatus(s.soccer,'friend',T).value,4000,'players have independent stamina');
 R.prepareSoccerKickoff(s.soccer,people,T+2100,0,T+4000,'restart');assert.equal(soccerDashStatus(s.soccer,'self',T+2100).value,4000);
}
console.log('PASS partial recovery, release, packet loss, independent players and kickoff refill');
for(const bots of [undefined,{enabled:false,blue:0,red:0},{enabled:true,blue:0,red:0}]){
 const start=R.command(R.fresh('self',T),{uid:'self',id:'match',kind:'start-soccer',at:T,...(bots?{bots}:{})},people,'self',new Set(),T);assert(start.ok);
 const s=start.state;R.step(s,people,T+100,1/60);assert.equal(Object.keys(s.soccer.keepers).length,2);
 const members=Object.keys(s.soccer.members).length;
 for(const status of ['countdown','playing','finished','idle']){
  s.soccer.status=status;R.step(s,people,T+200,1/60);
  for(const k of Object.values(s.soccer.keepers))assert([k.x,k.y,k.z].every(Number.isFinite));
  assert.equal(Object.keys(s.soccer.keepers).length,2);
 }
 assert.equal(Object.keys(s.soccer.members).length,members,'keepers do not take field-player slots');
}
console.log('PASS both keepers persist through multiplayer auto-disable, zero field bots and match phases');
for(const team of [0,1]){
 const s=fresh(),g=s.soccer;g.botOptions={enabled:false,blue:0,red:0};
 const dir=team===0?-1:1,line=team===0?R.SOCCER.near:R.SOCCER.far;
 Object.assign(g.ball,{x:23,y:1,z:line-dir*4,vx:0,vy:1,vz:dir*12,dribbler:'',lastTouch:'self',freeUntil:T+5000});
 for(let n=1;n<90&&!g.lastSave;n++)R.step(s,people,T+n*1000/60,1/60);
 assert.equal(g.lastSave?.team,team,'keeper remains functional with field bots disabled');
}
console.log('PASS both keepers actually save shots with field bots disabled');
