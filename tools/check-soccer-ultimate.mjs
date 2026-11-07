import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {collideSoccerIceWalls} from '../lobby-soccer-ultimate.js';
const R=createLobbyGamesRules(),T=100000;
const people={host:{online:true,x:23,z:8,yaw:0},ally:{online:true,x:24,z:17,yaw:0},enemy:{online:true,x:31,z:15,yaw:Math.PI}};
let serial=0;
const fresh=()=>{const s=R.fresh('host',T);Object.assign(s.soccer,{secretMode:true,status:'playing',startAt:T,members:{host:0,ally:0,enemy:1},endAt:T+180000});Object.assign(s.soccer.ball,{x:23,y:.3,z:8.7,dribbler:'host',lastTouch:'host'});return s;};
const cast=(s,power)=>R.command(s,{uid:'host',kind:'soccer-secret-power',power,id:'ultimate'+(++serial),at:T},people,'host',new Set(),T);
for(const kind of ['thunder','meteor','cyclone','ice','dragon']){
 const s=fresh();s.soccer.secretMode=false;assert(!cast(s,kind).ok);
}
assert(!cast(fresh(),'unknown').ok);
for(const kind of ['thunder','meteor','dragon']){
 const r=cast(fresh(),kind);assert(r.ok,r.message);const s=r.state,g=s.soccer,p=g.secretPowers.host;
 R.step(s,people,p.releaseAt-1,.001);assert.equal(g.ball.dribbler,'host','windup keeps ball');
 R.step(s,people,p.releaseAt+1,.001);assert.equal(g.ball.secretShot.kind,kind);assert.equal(g.ball.dribbler,'');assert(p.used);assert(!cast(s,'thunder').ok);
 if(kind==='thunder')assert(Math.hypot(g.ball.vx,g.ball.vz)>31);
 if(kind==='dragon'){assert.equal(g.flight.target,'ally');assert.equal(g.secretChain.count,1);}
 if(kind==='meteor'){
  let peak=g.ball.y;for(let i=1;i<=65;i++){R.step(s,people,p.releaseAt+i*16,1/60);peak=Math.max(peak,g.ball.y);}assert(peak>5,'meteor has a real high arc');
 }
 const cancelled=cast(fresh(),kind).state;cancelled.soccer.ball.dribbler='enemy';R.step(cancelled,people,cancelled.soccer.secretPowers.host.releaseAt+1,.001);
 assert(cancelled.soccer.secretPowers.host.cancelled);assert(!cancelled.soccer.ball.secretShot,'stolen windup does not fire');
 console.log('PASS',kind,'windup, launch, cooldown, projectile and lost possession');
}
{
 const s=fresh();Object.assign(s.soccer.ball,{dribbler:'enemy',lastTouch:'enemy',x:23,z:9.4});
 let r=cast(s,'cyclone');assert(r.ok);R.step(r.state,people,T+351,.001);assert.equal(r.state.soccer.ball.dribbler,'host');assert(r.state.soccer.secretPowers.host.hitAt);
 r=cast(s,'cyclone');r.state.soccer.ball.z=16;R.step(r.state,people,T+351,.001);assert(r.state.soccer.secretPowers.host.cancelled);assert.notEqual(r.state.soccer.ball.dribbler,'host','escaping ball is not teleported back');
 s.soccer.ball.dribbler='ally';assert(!cast(s,'cyclone').ok,'never steal a teammate ball');
 const dragon=cast(fresh(),'dragon').state;dragon.soccer.members.ally=1;R.step(dragon,people,T+501,.001);assert(dragon.soccer.secretPowers.host.cancelled);assert(!dragon.soccer.flight);
 console.log('PASS cyclone range/team checks and dragon target revalidation');
}
function wall(){
 const s=fresh();Object.assign(s.soccer.ball,{dribbler:'',lastTouch:'enemy',x:23,y:1.4,z:14,vx:0,vy:0,vz:-32});
 const r=cast(s,'ice');assert(r.ok);return r.state;
}
{
 const s=wall();for(let i=0;i<30&&!s.soccer.secretPowers.host.hitAt;i++)R.step(s,people,T+300+i*16,1/60);
 assert(s.soccer.secretPowers.host.hitAt);assert(s.soccer.ball.vz>0,'real simulation reflects the ball');
 assert(!s.soccer.ball.fire);
 for(const [label,x,y,touch,at,secret,want]of [
  ['center',23,1.4,'enemy',T+400,true,true],
  ['outside',26,1.4,'enemy',T+400,true,false],
  ['above',23,4,'enemy',T+400,true,false],
  ['ally',23,1.4,'ally',T+400,true,false],
  ['windup',23,1.4,'enemy',T+200,true,false],
  ['expired',23,1.4,'enemy',T+2500,true,false],
  ['normal',23,1.4,'enemy',T+400,false,false]
 ]){
  const s=wall(),g=s.soccer,p=g.secretPowers.host;g.secretMode=secret;Object.assign(g.ball,{x,y,z:p.z-3,lastTouch:touch,fire:true,secretShot:{kind:'thunder'}});
  assert.equal(collideSoccerIceWalls(g,R.SOCCER,at,{x,y,z:p.z+3}),want,label);
  if(want){assert(g.ball.vz>0);assert(!g.ball.secretShot);assert(!collideSoccerIceWalls(g,R.SOCCER,at,{x,y,z:p.z+3}),'shattered wall blocks only once');}
 }
 console.log('PASS real ice crystal collision: fast sweep, misses, allies, warmup, expiry and shatter');
}
{
 const s=cast(fresh(),'meteor').state;R.step(s,people,T+851,.001);Object.assign(s.soccer.ball,{x:23,z:12,y:.31,vy:-9,vx:0,vz:0});
 R.step(s,people,T+870,.016);assert.equal(s.soccer.secretImpact.kind,'meteor');assert(s.soccer.ball.secretShot.impacted);assert(!s.soccer.ball.fire);
 const r=R.command(s,{uid:'host',kind:'stop',game:'soccer',id:'finish',at:T+900},people,'host',new Set(),T+900);assert(r.ok);assert.deepEqual(r.state.soccer.secretPowers,{});assert(!r.state.soccer.ball.secretShot);
 console.log('PASS meteor ground impact and all ultimate state cleared on match end');
}
