import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerKickFoot,soccerKickContact,sampleSoccerKick,stepSoccerSpin,sampleSoccerShotPath,soccerBallCrossing,advanceSoccerBall} from '../lobby-soccer-kick.js';
const R=createLobbyGamesRules(),T=100000;
const people={self:{online:true,x:23,z:8,yaw:0,lobbyY:0},enemy:{online:true,x:30,z:16,yaw:Math.PI,lobbyY:0}};
function fixture(){const s=R.fresh('self',T);Object.assign(s.soccer.ball,{x:23,z:8.74,dribbler:'self'});return s;}
function kick(extra={}){return R.command(fixture(),{kind:'kick',uid:'self',id:'kick',at:T,yaw:0,mode:'shot',power:.8,...extra},people,'self',new Set(),T);}
for(const spin of [NaN,Infinity,'1',2,-2])assert(!kick({spin}).ok,'reject invalid spin');
for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const side of [-1,1]){
 const b={x:23+Math.cos(yaw)*side*.3,z:8-Math.sin(yaw)*side*.3};assert.equal(soccerKickFoot(people.self,b,yaw),side<0?0:1);
}
for(const mode of ['pass','shot','lob','through'])for(const foot of [0,1]){
 const k={at:T,mode,foot,power:.8};let previous=null;
 for(let age=0;age<=750;age++){
  const p=sampleSoccerKick(k,T+age);if(!p)continue;
  assert(Object.values(p).every(Number.isFinite));assert.equal(p.foot,foot);
  if(previous)assert(Math.abs(p.swing-previous.swing)<.12,'smooth foot motion');previous=p;
 }
 assert.equal(sampleSoccerKick(k,soccerKickContact(k)).impact,1);
 assert.equal(sampleSoccerKick({...k,cancelled:true},T+50),null);
}
const a=kick({spin:1}).state;R.step(a,people,T+119,1/60);assert(!a.soccer.kicks.self.applied);R.step(a,people,T+120,1/60);assert(a.soccer.kicks.self.connected);assert.equal(a.soccer.kicks.self.contact.at,T+120);
const stolen=kick().state;stolen.soccer.ball.dribbler='enemy';R.step(stolen,people,T+120,1/60);assert(stolen.soccer.kicks.self.cancelled);assert(!stolen.soccer.kicks.self.connected);
for(const dt of [1/60,1/30,.1]){
 const results=[];for(const spin of [-1,0,1]){const s=kick({spin}).state;for(let age=120;age<620;age+=dt*1000)R.step(s,people,T+age,dt);results.push(s.soccer.ball.x);}
 assert(results[0]<22.5&&results[2]>23.5);assert(Math.abs(results[1]-23)<.001);
 assert(Math.abs(23-results[0]-(results[2]-23))<.001,'left and right mirror');
}
const ball={vx:10,vz:5,y:1,spin:1};const speed=Math.hypot(ball.vx,ball.vz);for(let i=0;i<600;i++)stepSoccerSpin(ball,1/60);assert(Math.abs(Math.hypot(ball.vx,ball.vz)-speed)<1e-10);assert.equal(ball.spin,0);
const paths=[-1,0,1].map(spin=>sampleSoccerShotPath({x:23,y:.3,z:8},0,.8,spin));assert(paths[0].at(-1).x<22&&paths[2].at(-1).x>24);assert(paths.flat().every(p=>p.y>=.3));
console.log('PASS kick foot in all orientations, smooth contact clock, stolen-ball cancellation, spin validation, mirrored 10/30/60 Hz physics, dissipating spin and preview');

// Numerical crossing prediction must agree with the authoritative integrator.
for(const spin of [-1,0,1]){
 const b={x:23,y:.7,z:16,vx:0,vy:2,vz:14,spin},predicted=soccerBallCrossing(b,21.5);
 assert(predicted);let crossing=null,elapsed=0;
 for(let i=0;i<180&&!crossing;i++){const old={...b};advanceSoccerBall(b,1/240);elapsed+=1/240;if(old.z<21.5&&b.z>=21.5){const u=(21.5-old.z)/(b.z-old.z);crossing={x:old.x+(b.x-old.x)*u,y:old.y+(b.y-old.y)*u};}}
 assert(crossing);assert(Math.hypot(crossing.x-predicted.x,crossing.y-predicted.y)<.025,'keeper reads the same trajectory');
}
assert.equal(soccerBallCrossing({x:23,y:.3,z:16,vx:0,vz:-10,vy:0},21.5),null);
console.log('PASS keeper crossing prediction agrees with simulated left/straight/right trajectories');

// A fast ground pass gets a brief cushioning contact; a one-touch return remains possible.
for(const dt of [1/60,1/30,.1]){
 const s=fixture();Object.assign(s.soccer.ball,{x:23.3,z:8.8,dribbler:'',lastTouch:'enemy',vx:-2,vz:-8,vy:0});
 const before={...s.soccer.ball};R.step(s,people,T,dt);
 assert.equal(s.soccer.ball.dribbler,'self');assert.equal(s.soccer.dribble.receiveAt,T);assert(R.distance(before,s.soccer.ball)<.3,'receive does not teleport');
 const back=R.command(s,{kind:'kick',uid:'self',id:'return',at:T+50,yaw:0,mode:'pass',power:.5},people,'self',new Set(),T+50);
 assert(back.ok,'first touch does not lock out an immediate return pass');R.step(back.state,people,T+170,dt);assert(back.state.soccer.kicks.self.connected);
}
console.log('PASS grounded pass cushion at 10/30/60 Hz, continuous control and one-touch return');
