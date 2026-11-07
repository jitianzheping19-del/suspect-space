import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerGoalX,stepSoccerSecretGoals} from '../lobby-soccer-secret.js';
import {soccerKeeperColliders,collideSoccerKeeper,sampleSoccerKeeperPose} from '../lobby-soccer-air.js';
import {canSoccerSecretPower} from '../lobby-soccer-powers.js';
const R=createLobbyGamesRules(),T=100000,players={host:{online:true,x:23,z:8,yaw:0},ally:{online:true,x:24,z:18,yaw:0},enemy:{online:true,x:30,z:12,yaw:Math.PI}};
let serial=0;
const fresh=(secret=true)=>{const s=R.fresh('host',T);Object.assign(s.soccer,{secretMode:secret,status:'playing',startAt:T,members:{host:0,ally:0,enemy:1},endAt:T+180000});Object.assign(s.soccer.ball,{x:23,z:8.7,dribbler:'host'});return s;};
const command=(s,power,t=T)=>R.command(s,{uid:'host',kind:'soccer-secret-power',power,id:'power'+(++serial),at:t},players,'host',new Set(),t);
for(const power of ['taichi','belly','iron','relay'])assert(!command(fresh(false),power).ok);
{
 let r=command(fresh(),'belly');assert(r.ok);let s=r.state;assert.equal(s.soccer.ball.bellyOwner,'host');R.step(s,players,T+400,.05);assert.equal(s.soccer.ball.y,.72);R.step(s,players,T+860,.05);assert(!s.soccer.ball.handOwner);assert(s.soccer.ball.fire);assert(Math.hypot(s.soccer.ball.vx,s.soccer.ball.vz)>25);assert(!command(s,'belly',T+900).ok);
 s=fresh();Object.assign(s.soccer.ball,{dribbler:'',x:23,z:9.6,y:1,vz:-12,vy:0,spin:-.6});r=command(s,'taichi');assert(r.ok);s=r.state;R.step(s,players,T+20,.02);assert.equal(s.soccer.ball.lastTouch,'host');assert(s.soccer.ball.vz>0);assert(s.soccer.ball.spin<0);assert(s.soccer.secretPowers.host.used);
 s=fresh();r=command(s,'relay');assert(r.ok);s=r.state;R.step(s,players,T+280,.02);assert.equal(s.soccer.flight.target,'ally');assert.equal(s.soccer.secretChain.count,1);assert(s.soccer.ball.vy>17);
 s=fresh();Object.assign(s.soccer.ball,{dribbler:'',y:12,z:8.8,vx:0,vy:0,vz:0});r=command(s,'iron');assert(r.ok);s=r.state;assert(s.soccer.finishes.host.iron);
 for(let i=1;i<=55;i++)R.step(s,players,T+i*10,.01);
 assert(s.soccer.finishes.host.connected);assert(s.soccer.secretImpact);assert(s.soccer.ball.fire);assert(s.soccer.ball.vy<0);
 console.log('PASS all player powers, cooldown, normal-mode rejection, fire belly shot, spin reflection, relay target and iron-head impact');
}
{
 const s=fresh(),g=s.soccer,F=R.SOCCER;kickoffClear(g);
 function kickoffClear(g){g.kickoff=null;g.ball.dribbler='';}
 g.secretNextGoalAt=T;stepSoccerSecretGoals(g,T);stepSoccerSecretGoals(g,T+1500);R.setSoccerPitch(g);assert.equal(soccerGoalX(F,F.near),25.4);
 assert.equal(R.goalSegments()[0][0],25.4-F.goal/2);
 stepSoccerSecretGoals(g,T+6100);R.setSoccerPitch(g);assert.equal(soccerGoalX(F,F.near),23);
 R.step(s,players,T+11001,.01);R.step(s,players,T+11002,.01);const giant=Object.values(g.keepers).find(k=>k.giantUntil>T+11002);assert(giant);
 const large=soccerKeeperColliders(giant,T+11002).filter(x=>x.part==='glove').map(x=>x.radius);assert(large.some(r=>r>.7));assert(large.some(r=>r===.21),'opposite hand remains ordinary');
 const k=g.keepers[1];Object.assign(k,{x:23,z:F.far-.75,phase:'ready'});const shape=soccerKeeperColliders(k,T+12000).find(s=>s.part==='body')||soccerKeeperColliders(k,T+12000)[0];
 const mid={x:(shape.a.x+shape.b.x)/2,y:(shape.a.y+shape.b.y)/2,z:(shape.a.z+shape.b.z)/2};Object.assign(g.ball,{...mid,fire:true,vx:0,vy:0,vz:17,keeperOwner:undefined,keeperReleaseUntil:0});assert(collideSoccerKeeper(g,F,T+12000,{...mid,z:mid.z-1}));assert(k.secretKnockback);assert(g.ball.vz>0);assert(sampleSoccerKeeperPose(k,T+12300).z>k.z);
 console.log('PASS goal movement/restoration, shifted collision frame, one giant glove, fire shot carries keeper backward');
}
for(const status of ['idle','playing'])for(const team of [0,1])for(const dt of [1/60,.1]){
 const s=fresh(false),g=s.soccer;g.status=status;R.setSoccerPitch(g);const F=R.SOCCER,line=team===0?F.far:F.near,dir=team===0?1:-1;
 Object.assign(g.ball,{x:25,y:.3,z:line+dir*.65,vx:0,vy:0,vz:0,dribbler:''});R.step(s,players,T+1,dt);assert.equal(g.score[team],1);assert(g.ball.resetUntil>T);assert(Math.abs(g.ball.z-line)>5);
 for(let i=1;i<=8;i++)R.step(s,players,T+i*100,dt);assert.equal(g.score[team],1,'no repeat points');
 console.log('PASS stationary ball already in goal scores and resets once',status,team,dt);
}
{
 const s=fresh(false),g=s.soccer;g.status='idle';R.setSoccerPitch(g);const F=R.SOCCER;
 Object.assign(g.ball,{x:23,y:5,z:F.far+.65,vx:0,vy:-3,vz:0,dribbler:''});
 for(let i=1;i<=130;i++)R.step(s,players,T+i*1000/60,1/60);
 assert.deepEqual(g.score,[0,0]);assert(g.ball.z<F.far,'roof entry cannot score and stranded ball resets');
 console.log('PASS outside/roof entry is not a goal; stranded ball returns to play');
}
