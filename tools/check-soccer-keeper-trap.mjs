import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {beginSoccerReceive,holdSoccerKeeperBall,stepSoccerKeepers,sampleSoccerKeeperThrow,sampleSoccerPunt} from '../lobby-soccer-air.js';
const R=createLobbyGamesRules(),F=R.SOCCER,T=100000;
const person=(x,z,yaw=0)=>({online:true,x,z,yaw,lobbyY:0});
for(const hz of [10,30,60])for(const team of [0,1])for(const distance of [5,9.99,10,16]){
 const s=R.fresh('self',T),g=s.soccer,dir=team===0?1:-1,z=(team===0?F.near:F.far)+dir*.75;
 const people={self:person(23,z+dir*distance)};
 Object.assign(g,{status:'playing',members:{self:team},keepers:{},endAt:T+180000});
 const k=g.keepers[team]={team,x:23,z,phase:'ready',saves:0};
 Object.assign(g.ball,{x:23,z:z+dir*.4,y:.3});holdSoccerKeeperBall(g,k,T,true);
 const mode=distance<10?'throw':'punt',release=mode==='throw'?1200:1550;
 let time=T;while(time<T+release){stepSoccerKeepers(g,F,time,1/hz,people);assert.equal(g.ball.keeperOwner,team);assert.equal(k.distribution,mode);time=Math.min(T+release,time+1000/hz);}
 stepSoccerKeepers(g,F,T+release,1/hz,people);
 assert.equal(g.ball.keeperOwner,undefined);assert.equal(k.phase,mode==='throw'?'distribute':'punt');assert.equal(g.flight.target,'self');assert(g.ball.vz*dir>0);assert(g.ball.vy>0);
 assert.equal(k.contact.at,T+release);assert.equal(k.contact.y,mode==='throw'?1.75:.62);
 assert(Math.hypot(g.ball.x-k.contact.x,g.ball.y-k.contact.y,g.ball.z-k.contact.z)<1e-9);
 // Completed contact cannot launch the ball again during follow-through.
 const flightAt=g.flight.at;stepSoccerKeepers(g,F,T+release+100,1/hz,people);assert.equal(g.flight.at,flightAt);
}
assert(sampleSoccerKeeperThrow(1100).ballY>sampleSoccerKeeperThrow(650).ballY+.5);
assert(sampleSoccerKeeperThrow(1100).arm< -2.5);
assert(sampleSoccerKeeperThrow(1380).arm>sampleSoccerKeeperThrow(1100).arm+1);
assert(sampleSoccerPunt(1058).ballY>sampleSoccerPunt(1550).ballY+.6);
assert(sampleSoccerPunt(1300).kick>0&&sampleSoccerPunt(1550).kick< -1);
console.log('PASS both keepers: near throws / 10m and farther punts; shared release/contact and distinct windup/follow-through at 10/30/60Hz');
for(const hz of [10,30,60])for(const height of [.3,1.4,2.1])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2,Math.PI/4]){
 const s=R.fresh('self',T),g=s.soccer,people={self:person(23,10),enemy:person(31,18)};
 Object.assign(g,{status:'playing',members:{self:0,enemy:1},endAt:T+180000});
 Object.assign(g.ball,{x:23,z:10.4,y:height,vx:0,vy:0,vz:0});beginSoccerReceive(g,'self','trap',people.self,T,F);
 let previous={...g.ball},maxSpeed=0;
 for(let i=1;i<=Math.ceil(.62*hz);i++){
  // Select a new direction partway through the cushion.
  if(i/hz>=.1)people.self.yaw=yaw;
  R.step(s,people,T+i*1000/hz,1/hz);const b=g.ball;
  assert([b.x,b.y,b.z,b.vx,b.vy,b.vz].every(Number.isFinite));
  maxSpeed=Math.max(maxSpeed,Math.hypot(b.x-previous.x,b.y-previous.y,b.z-previous.z)*hz);previous={...b};
 }
 assert.equal(g.ball.dribbler,'self');assert(maxSpeed<(height<.55?10:8),`direction changes cushion smoothly: ${hz}Hz height ${height} yaw ${yaw} speed ${maxSpeed}`);
 const dx=g.ball.x-people.self.x,dz=g.ball.z-people.self.z;
 assert((dx*Math.sin(yaw)+dz*Math.cos(yaw))/Math.hypot(dx,dz)>.9,`trap follows selected direction: ${hz}Hz, height ${height}, yaw ${yaw}`);
 const oldYaw=g.receives.self.trapYaw;people.self.yaw=yaw+.6;R.step(s,people,T+1500,1/hz);assert.equal(g.receives.self.trapYaw,oldYaw,'expired trap stops consuming steering');
}
console.log('PASS ground, chest and head-height traps steer in five directions, preserve possession and expire cleanly at 10/30/60Hz');
