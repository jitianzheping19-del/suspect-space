import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {sampleSoccerComboPose,stepSoccerCombinations} from '../lobby-soccer-combinations.js';
import {advanceSoccerBall,predictSoccerBall} from '../lobby-soccer-kick.js';
const R=createLobbyGamesRules(),T=100000;
const players=()=>({host:{online:true,x:22.4,z:8.4,yaw:0},ally:{online:true,x:23.6,z:8.4,yaw:0},enemy:{online:true,x:31,z:15,yaw:Math.PI}});
function fresh(y=3,vy=0){const s=R.fresh('host',T);Object.assign(s.soccer,{secretMode:true,status:'playing',members:{host:0,ally:0,enemy:1},endAt:T+180000});Object.assign(s.soccer.ball,{x:23,y,z:9.2,vx:0,vy,vz:0,dribbler:'',lastTouch:'enemy'});return s;}
for(const [kind,y,vy]of [['twin',1.4,2.4],['twinOverhead',3,0]]){
 for(const dt of [1/60,1/30,.1]){
  const s=fresh(y,vy),p=players();R.step(s,p,T,0);const c=s.soccer.secretCombo;
  assert.equal(c.kind,kind);assert.deepEqual([...c.ids].sort(),['ally','host']);
  for(const id of c.ids){const m=sampleSoccerComboPose(s.soccer.finishes[id],c,c.contactAt);assert(m.height>0);if(kind==='twinOverhead')assert(m.pitch< -1.5);}
  for(let i=1;i<=Math.ceil(.4/dt);i++)R.step(s,p,T+i*dt*1000,dt);
  assert(c.used&&!c.cancelled);assert(c.hitAt);assert.equal(s.soccer.ball.secretShot.kind,kind);assert(s.soccer.ball.vz>20);
  const hit=c.hitAt;R.step(s,p,T+410,.01);assert.equal(c.hitAt,hit,'one physical shot, not one per player');
  const copy=JSON.parse(JSON.stringify(s));assert.equal(copy.soccer.secretCombo.kind,kind);assert(copy.soccer.finishes.ally.connected&&copy.soccer.finishes.host.connected);
  console.log('PASS automatic',kind,'paired poses, shared contact, one shot and serialized state at dt',dt);
 }
}
for(const reason of ['far','opponent','solo','normal','observer','keeper','cooldown']){
 const s=fresh(),p=players();
 if(reason==='far')p.ally.x=28;if(reason==='opponent')s.soccer.members.ally=1;if(reason==='solo')delete s.soccer.members.ally;if(reason==='normal')s.soccer.secretMode=false;if(reason==='observer')p.ally.observer=true;
 if(reason==='keeper')s.soccer.ball.keeperOwner=1;if(reason==='cooldown')s.soccer.combinationCooldowns={ally:T+5000};
 if(reason==='keeper')stepSoccerCombinations(s.soccer,p,R.SOCCER,T,()=>true);else R.step(s,p,T,0);assert(!s.soccer.secretCombo,reason);
}
for(const reason of ['leave','move','steal']){
 const s=fresh(),p=players();R.step(s,p,T,0);
 if(reason==='leave')p.ally.online=false;if(reason==='move')p.ally.x+=2;if(reason==='steal')s.soccer.ball.dribbler='enemy';
 R.step(s,p,T+30,.03);assert(s.soccer.secretCombo.cancelled);assert(!s.soccer.ball.secretShot);
}
console.log('PASS automatic combinations reject unavailable partners and cancel changed situations');
{
 const s=fresh();s.soccer.ball.y=.3;s.soccer.ball.dribbler='host';s.soccer.ball.x=22.4;s.soccer.ball.z=9.1;
 const p=players(),r=R.command(s,{uid:'host',kind:'soccer-secret-power',power:'drive',id:'drive',at:T},p,'host',new Set(),T);assert(r.ok);
 R.step(r.state,p,T+551,.001);const b=r.state.soccer.ball;assert.equal(b.secretShot.kind,'drive');
 const before=b.driveAge;predictSoccerBall(b,.8,10);assert.equal(b.driveAge,before,'trajectory preview must not age the live ball');
 const drive={...b},ordinary={...b};delete ordinary.secretShot;
 for(let i=0;i<100;i++){advanceSoccerBall(drive,1/180);advanceSoccerBall(ordinary,1/180);}
 assert(drive.vy<ordinary.vy-3,'topspin pulls the drive downward');assert(drive.y<ordinary.y);assert(Number.isFinite(drive.y));
 console.log('PASS drive shot, physical topspin and pure trajectory prediction');
}
