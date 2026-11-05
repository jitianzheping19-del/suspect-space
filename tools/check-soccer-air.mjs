import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerKeeperOutlet} from '../lobby-soccer-air.js';
const R=createLobbyGamesRules(),T=100000,F=R.SOCCER;
const person=(x,z,yaw=0)=>({online:true,x,z,lobbyY:0,yaw});
function fixture(nearGoal=false){const people={self:person(nearGoal?20:23,9),friend:person(nearGoal?23:28,nearGoal?19:13,nearGoal?Math.PI:0),enemy:person(30,16)};const s=R.fresh('self',T);Object.assign(s.soccer,{status:'playing',endAt:T+180000,members:{self:0,friend:0,enemy:1}});Object.assign(s.soccer.ball,{x:people.self.x,z:9.8,dribbler:'self'});return{people,s,t:T};}
function lob(f){const p=f.people.self,q=f.people.friend,result=R.command(f.s,{uid:'self',id:'lob',at:f.t,kind:'kick',mode:'lob',yaw:Math.atan2(q.x-p.x,q.z-p.z),power:.65},f.people,'self',new Set(),f.t);assert(result.ok,result.message);f.s=result.state;}
function tick(f){f.t+=1000/60;R.step(f.s,f.people,f.t,1/60);}
{
 const f=fixture();lob(f);for(let i=0;i<14;i++)tick(f);assert(!f.s.soccer.flight,'windup precedes contact');
 let peak=0,trapped=false;for(let i=0;i<180;i++){tick(f);peak=Math.max(peak,f.s.soccer.ball.y);if(f.s.soccer.receives?.friend?.kind==='trap')trapped=true;}
 assert(peak>1.7,'real aerial trajectory');assert(trapped,'automatic chest/foot trap');assert.equal(f.s.soccer.ball.dribbler,'friend');assert.equal(f.s.soccer.flight,null);assert.equal(Object.keys(f.s.soccer.keepers).length,2);assert.equal(Object.keys(f.s.soccer.members).length,3,'keepers never occupy player slots');
}
console.log('PASS lob windup, airborne path, assisted arrival, automatic trap and two dedicated keepers');
{
 const f=fixture(true);lob(f);let ready=false;
 for(let i=0;i<150;i++){tick(f);if(R.reception(f.s,'friend',f.people,f.t).header){ready=true;break;}}
 assert(ready,'header window near opponent goal');
 let result=R.command(f.s,{uid:'friend',id:'header',at:f.t,kind:'soccer-header'},f.people,'self',new Set(),f.t);assert(result.ok,result.message);f.s=result.state;
 // Isolate finishing from the separately tested goalkeeper collision.
 f.s.soccer.keepers[1].phase='recover';f.s.soccer.keepers[1].until=f.t+10000;
 for(let i=0;i<120;i++){tick(f);if(f.s.soccer.score[0])break;}
 assert(f.s.soccer.receives.friend.connected,'header contacts the incoming pass');assert.equal(f.s.soccer.score[0],1,'header can score');assert.equal(f.s.soccer.lastGoal.scorer,'friend');
 const outsider=R.command(f.s,{uid:'enemy',id:'bad-header',at:f.t,kind:'soccer-header'},f.people,'self',new Set(),f.t);assert(!outsider.ok);
}
console.log('PASS timed diving header connects and scores; opponents cannot claim a teammate reception');
{
 const f=fixture();lob(f);for(let i=0;i<180;i++){tick(f);if(R.reception(f.s,'friend',f.people,f.t).trap)break;}
 const result=R.command(f.s,{uid:'friend',id:'trap',at:f.t,kind:'soccer-trap'},f.people,'self',new Set(),f.t);assert(result.ok,result.message);f.s=result.state;
 let previous={...f.s.soccer.ball},max=0;for(let i=0;i<45;i++){tick(f);const b=f.s.soccer.ball;max=Math.max(max,Math.hypot(b.x-previous.x,b.y-previous.y,b.z-previous.z));previous={...b};}assert(max<.25,'trap cushions the ball without teleportation');assert.equal(f.s.soccer.ball.dribbler,'friend');
}
console.log('PASS manual trap cushions continuously into possession');
for(const team of [0,1])for(const speed of [12,20]){
 const f=fixture(),dir=team===0?-1:1,line=team===0?F.near:F.far;
 Object.assign(f.s.soccer.ball,{x:23,y:1,z:line-dir*4,vx:0,vy:1,vz:dir*speed,dribbler:'',lastTouch:'self',freeUntil:T+5000});
 let dive=false;for(let i=0;i<70;i++){tick(f);dive ||=f.s.soccer.keepers[team].phase==='dive';if(f.s.soccer.lastSave)break;}
 const g=f.s.soccer;
 assert(g.lastSave,'keeper saves a shot on target');assert.equal(g.lastSave.team,team);assert.equal(g.score[0]+g.score[1],0);if(speed===12)assert(dive,'slower shots allow the delayed dive');
 if(speed===12){
  assert.equal(g.ball.keeperOwner,team,'catchable shots are held');assert.equal(g.ball.vz,0);assert.equal(g.keepers[team].phase,'catch');
  for(let i=0;i<120&&!g.flight;i++)tick(f);
  assert.equal(g.ball.keeperOwner,undefined);assert.equal(g.flight?.team,team);assert.equal(g.flight?.from,'keeper-'+team);assert.equal(g.members[g.flight.target],team);
 }else assert(g.ball.vz*dir<0,'hard shots rebound into play');
}
console.log('PASS both goalkeeper bots anticipate, dive, catch and distribute; strong shots are parried');
{
 const f=fixture();Object.assign(f.people.self,{x:26,z:3});Object.assign(f.people.friend,{x:20,z:8});
 Object.assign(f.s.soccer.ball,{x:23.2,z:F.near+1.6,y:.3,dribbler:'',vx:0,vy:0,vz:0});
 for(let i=0;i<30&&f.s.soccer.ball.keeperOwner===undefined;i++)tick(f);
 const g=f.s.soccer,k=g.keepers[0];assert.equal(g.ball.keeperOwner,0);assert.equal(k.phase,'pickup');assert(k.z>F.near+.75,'keeper steps out to collect');
 // A closer opponent cannot steal a held ball or become the outlet.
 Object.assign(f.people.enemy,{x:k.x,z:k.z+.8});assert(!R.canKick(f.s,'enemy',f.people,f.t));
 const steal=R.command(f.s,{uid:'enemy',id:'steal',kind:'kick',at:f.t,yaw:0},f.people,'self',new Set(),f.t);assert(!steal.ok);
 let previous={...g.ball},max=0;
 while(f.t<k.at+1100){tick(f);const b=g.ball;max=Math.max(max,Math.hypot(b.x-previous.x,b.y-previous.y,b.z-previous.z));previous={...b};assert.equal(b.keeperOwner,0);}
 assert(max<.12,'smooth pickup, embrace and raised throw preparation');assert(g.ball.y>1.7,'keeper raises the ball to throw');
 for(let i=0;i<20&&!g.flight;i++)tick(f);
 assert.equal(g.flight?.target,'self','closest teammate gets the pass');assert.equal(g.flight?.team,0);assert(g.ball.vy>2);assert.equal(k.phase,'distribute');
 for(let i=0;i<180;i++)tick(f);assert.equal(g.ball.dribbler,'self','teammate traps the goalkeeper distribution');
}
console.log('PASS step-out pickup, protected possession, smooth windup, nearest teammate outlet and receiving trap');
{
 const f=fixture();tick(f);const g=f.s.soccer,k=g.keepers[0];
 const invalid={opponent:{...person(23,0)},offline:{...person(23,.5),online:false},bot:{...person(23,.5),bot:true},observer:{...person(23,.5),observer:true},outside:person(36,0),airborne:{...person(23,.5),lobbyY:2}};
 Object.assign(f.people,invalid);for(const id of Object.keys(invalid))g.members[id]=id==='opponent'?1:0;
 Object.assign(f.people.self,{x:26,z:3});Object.assign(f.people.friend,{x:20,z:8});
 assert.equal(soccerKeeperOutlet(g,k,f.people,F).target,'self');f.people.self.online=false;
 assert.equal(soccerKeeperOutlet(g,k,f.people,F).target,'friend','leaving player is skipped');
 const idle=R.fresh('self',T),solo={s:idle,people:{},t:T};Object.assign(idle.soccer.ball,{x:23,z:F.near+1,y:.3});
 let held=false;for(let i=0;i<120;i++){tick(solo);held ||=idle.soccer.ball.keeperOwner===0;if(idle.soccer.flight)break;}
 assert(held);assert.equal(idle.soccer.ball.keeperOwner,undefined);assert.equal(idle.soccer.flight.target,'');assert(idle.soccer.ball.vz>0,'with no teammate keeper clears into the pitch');
 const ended=fixture();Object.assign(ended.s.soccer.ball,{x:23,z:F.near+1,y:.3,dribbler:''});tick(ended);assert.equal(ended.s.soccer.ball.keeperOwner,0);
 ended.s.soccer.endAt=ended.t;tick(ended);assert.equal(ended.s.soccer.ball.keeperOwner,undefined);assert.equal(ended.s.soccer.keepers[0].phase,'ready');assert.equal(ended.s.soccer.flight,null);
}
console.log('PASS eligible outlets only, recipient exit, no-teammate clearance and match-end hold cleanup');
{
 const f=fixture();Object.assign(f.s.soccer.ball,{x:24.75,y:.9,z:F.far-1.2,vx:0,vy:0,vz:16,dribbler:'',freeUntil:T+5000});for(let i=0;i<25&&!f.s.soccer.score[0];i++)tick(f);assert.equal(f.s.soccer.score[0],1,'late corner finish can beat a keeper');
 f.s.soccer.status='finished';tick(f);assert.equal(f.s.soccer.flight,null);assert.deepEqual(f.s.soccer.receives,{});
}
assert.equal(F.right-F.left,20);assert.equal(F.far-F.near,30);
console.log('PASS keeper can be beaten, end-of-match cleanup and expanded pitch bounds');
