import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerShotVelocity,sampleSoccerShotPath,soccerBallCrossing} from '../lobby-soccer-kick.js';
import {beginSoccerOverhead} from '../lobby-soccer-finishes.js';
import {collideSoccerKeeper} from '../lobby-soccer-air.js';
const T=100000;
for(const count of [0,16])for(const team of [0,1])for(const distance of [4,8,14,22]){
 const R=createLobbyGamesRules();R.setSoccerPitch({pitchCount:count});const F=R.SOCCER,dir=team===0?1:-1,yaw=team===0?0:Math.PI,goal=team===0?F.far:F.near,origin={x:23,y:.3,z:goal-dir*distance};
 const levels=[.12,.5,1].map(power=>soccerBallCrossing({...origin,...soccerShotVelocity(origin,yaw,power,F)},goal,4)?.y);
 assert(levels.every(Number.isFinite));assert(levels[2]>2.4&&levels[2]<2.65,'full charge aims under the bar: '+JSON.stringify(levels));
 assert(levels[2]>levels[0]+1.5&&levels[2]>levels[1]+.6,'charge selects higher goal courses');
 const preview=sampleSoccerShotPath({...origin,dribbler:'self'},yaw,1,0,.3,26,F),actual=sampleSoccerShotPath(origin,yaw,1,0,.3,26,F);
 assert.deepEqual(preview,actual,'possession must not change the predicted shot');
}
console.log('PASS charge raises goal courses at four distances on both pitch sizes and both goals');
for(const dt of [1/60,1/30,.1])for(const team of [0,1]){
 const R=createLobbyGamesRules(),F=R.SOCCER,dir=team===0?1:-1,goal=team===0?F.far:F.near;
 const players={self:{online:true,x:23,z:goal-dir*9,yaw:team===0?0:Math.PI,lobbyY:0}};
 for(const power of [.12,1]){
  let s=R.fresh('self',T);s.soccer.members={self:team};Object.assign(s.soccer.ball,{x:23,z:players.self.z+dir*.7,dribbler:'self',keeperReleaseUntil:T+10000});
  s=R.command(s,{kind:'kick',uid:'self',id:'shot',at:T,yaw:players.self.yaw,mode:'shot',power},players,'self',new Set(),T).state;
  const expected=soccerShotVelocity(s.soccer.ball,players.self.yaw,power,F);
  R.step(s,players,T+120,dt);assert(s.soccer.kicks.self.connected);assert(Math.abs(s.soccer.ball.vy-(expected.vy-9.8*dt))<.06,'host applies the same vertical launch as the guide');
 }
 // Real overhead impulse, crossbar contact, then the whole ball goes inside.
 const s=R.fresh('self',T),g=s.soccer;g.members={self:team};Object.assign(g.ball,{x:23,z:players.self.z+dir*.5,y:1.5,dribbler:'',keeperReleaseUntil:T+10000});
 beginSoccerOverhead(g,'self',players.self,F,T);const begin=g.finishes.self.contactAt;let hit=null;
 for(let n=0;n<300&&!g.score[team];n++){R.step(s,players,begin+n*dt*1000,dt);hit ||=g.lastFrameHit;}
 assert(hit&&hit.y>2.3&&Math.abs(hit.z-goal)<F.radius+F.postRadius,'actual front crossbar contact is observed');assert.equal(g.score[team],1,'overhead can bounce off the bar and in');
 assert(g.lastGoal.y+F.radius<F.goalHeight-F.postRadius,'entire ball enters below the bar');
 for(let n=0;n<3;n++)R.step(s,players,begin+1800+n*dt*1000,dt);assert.equal(g.score[team],1,'one shot gives one goal');
}
console.log('PASS host launch, actual bar-to-goal overhead and no duplicate goal at 10/30/60 Hz, both ends');
for(const team of [0,1]){
 const R=createLobbyGamesRules(),F=R.SOCCER,dir=team===0?1:-1,z=(team===0?F.near:F.far)+dir*.75;
 const g={keepers:{[team]:{team,x:23,z,phase:'ready',saves:0}},ball:{x:23,y:1,z:z-dir,vx:0,vy:0,vz:-dir*25}};
 assert(collideSoccerKeeper(g,F,T,{x:23,y:1,z:z+dir}));assert(g.ball.vz*dir>0);
 assert(Math.hypot(g.ball.vx,g.ball.vy,g.ball.vz)<10,'parry loses enough speed to stay near goal');assert(g.ball.vy<2,'lower parry rebound');
}
console.log('PASS keeper parries return toward the pitch with lower speed and lift');
for(const dt of [1/60,.1])for(const team of [0,1])for(const kind of ['bar','wide','high']){
 const R=createLobbyGamesRules(),F=R.SOCCER,s=R.fresh('self',T),g=s.soccer,dir=team===0?1:-1,line=team===0?F.far:F.near;
 Object.assign(g.ball,{x:kind==='wide'?23+F.goal/2+1:23,y:kind==='high'?4:F.goalHeight,z:line-dir*.6,vx:0,vy:0,vz:dir*20,keeperReleaseUntil:T+10000});
 for(let n=0;n<4;n++)R.step(s,{},T+n*dt*1000,dt);
 assert.deepEqual(g.score,[0,0],kind+' must not be a goal');assert([g.ball.x,g.ball.y,g.ball.z,g.ball.vx,g.ball.vy,g.ball.vz].every(Number.isFinite));
 if(kind==='bar'){assert(g.lastFrameHit);assert(g.ball.vz*dir<0,'square bar impact rebounds out');}
}
console.log('PASS bar rebounds out, high and wide misses are not counted, even at low update rates');
