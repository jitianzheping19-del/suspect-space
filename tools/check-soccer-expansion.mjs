import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerPitch,resolveSoccerOverlap} from '../lobby-soccer-match.js';
import {createSoccerStickGesture,sampleSoccerSkill} from '../lobby-soccer-skills.js';
import {soccerTrapPart} from '../lobby-soccer-air.js';
const T=100000,person=(x,z,yaw=0)=>({online:true,x,z,yaw,lobbyY:0}),R=createLobbyGamesRules();
const people={self:person(23,8),friend:person(28,14),enemy:person(23,10,Math.PI)};
const fresh=()=>{const s=R.fresh('self',T);Object.assign(s.soccer,{status:'playing',members:{self:0,friend:0,enemy:1},endAt:T+180000});Object.assign(s.soccer.ball,{x:23,z:8.74,dribbler:'self'});return s;};
const command=(s,extra,at=T)=>R.command(s,{kind:'kick',id:'q'+at,uid:'self',at,yaw:0,...extra},people,'self',new Set(),at);
for(const enabled of [false,true])for(const blue of [0,3,10])for(const red of [0,4,10]){
 const result=command(R.fresh('self',T),{kind:'start-soccer',bots:{enabled,blue,red}});assert(result.ok);const g=result.state.soccer;
 assert.equal(Object.keys(g.bots||{}).length,enabled?blue+red:0);assert.equal(Object.values(g.bots||{}).filter(p=>p.team===0).length,enabled?blue:0);
 const F=soccerPitch(g.pitchCount),slots=Object.values(g.kickoff.slots);assert.equal(g.pitchCount,3+(enabled?blue+red:0));
 for(const [i,p]of slots.entries()){assert(p.x>F.left&&p.x<F.right&&p.z>F.near&&p.z<F.far);for(const q of slots.slice(i+1))assert(Math.hypot(p.x-q.x,p.z-q.z)>.9);}
}
assert(!command(R.fresh('self',T),{kind:'start-soccer',bots:{enabled:true,blue:100,red:-1}}).ok);
assert(soccerPitch(10).length>soccerPitch(9).length&&soccerPitch(16).length>soccerPitch(10).length);
console.log('PASS per-team bots, off mode, invalid counts, enlarged pitches and spaced formations');
for(const where of [{x:23,z:10},{x:12.55,z:-4.95},{x:36.45,z:25.45}]){
 const F=soccerPitch(20),crowd=Object.fromEntries(Array.from({length:20},(_,i)=>['p'+i,person(where.x,where.z)]));
 for(let repeat=0;repeat<3;repeat++)for(const [id,p]of Object.entries(crowd))Object.assign(p,resolveSoccerOverlap(id,p,crowd,F));
 const values=Object.values(crowd);for(const [i,p]of values.entries())for(const q of values.slice(i+1))assert(Math.hypot(p.x-q.x,p.z-q.z)>=.8799);
}
console.log('PASS 20 exactly overlapping players separate at center, boundary and corner');
for(const [y,speed,part]of [[2,1,'head'],[1.3,1,'chest'],[.8,1,'knee'],[.45,3,'foot'],[.3,2,'sole']]){
 const s=fresh();Object.assign(s.soccer.ball,{x:23,z:8.7,y,vy:-.1,vx:0,vz:speed,dribbler:'',lastTouch:'enemy'});assert.equal(soccerTrapPart(s.soccer.ball),part);R.step(s,people,T,1/60);assert.equal(s.soccer.receives?.self?.part,part);
 for(let i=1;i<=50;i++)R.step(s,people,T+i*16,1/60);assert.equal(s.soccer.ball.dribbler,'self');assert([s.soccer.ball.x,s.soccer.ball.y,s.soccer.ball.z].every(Number.isFinite));
}
console.log('PASS automatic head/chest/knee/foot/sole reception finishes in controlled possession');
for(const [z,y,kind]of [[9.2,1.8,'header'],[6.8,1.8,'overhead'],[9,.9,'volley']]){const s=fresh();Object.assign(s.soccer.ball,{z,y,dribbler:'',lastTouch:'enemy'});assert.equal(R.airAction(s,'self',people,T),kind);assert(command(s,{kind:'soccer-'+kind}).ok);}
const s=fresh(),yaw=Math.atan2(5,6);assert(!command(s,{mode:'through',yaw,power:.7,holdMs:349}).ok);const through=command(s,{mode:'through',yaw,power:.7,holdMs:350});assert(through.ok);R.step(through.state,people,T+120,1/60);assert(through.state.soccer.kicks.self.connected);assert(through.state.soccer.ball.vz>0);
console.log('PASS positional aerial selection and host-validated through pass timing');
const nut=command(fresh(),{kind:'soccer-skill',skill:'nutmeg',side:1});assert(nut.ok);for(let i=1;i<=24;i++)R.step(nut.state,people,T+i*16,1/60);assert(nut.state.soccer.nutmegs.enemy);assert.equal(nut.state.soccer.ball.dribbler,'');assert(nut.state.soccer.ball.vz>5);assert(!R.canKick(nut.state,'enemy',people,T+400));
for(const dir of [-1,1]){const read=createSoccerStickGesture();let fired=0;for(let i=0;i<=24;i++)fired+=Math.abs(read(Math.cos(i/24*Math.PI*2*dir),Math.sin(i/24*Math.PI*2*dir),T+i*30,true));assert.equal(fired,1);}
const straight=createSoccerStickGesture();for(let i=0;i<100;i++)assert.equal(straight(0,1,T+i*16,true),0);
assert(Math.abs(sampleSoccerSkill('scissors',250).left)>.5);
console.log('PASS nutmeg ball/defender timing and full-circle scissors without straight-input activation');
const tackle=fresh();Object.assign(tackle.soccer.ball,{z:9.26,dribbler:'enemy'});const hit=command(tackle,{kind:'soccer-slide'}).state;people.self.z=9.05;R.step(hit,people,T+300,1/60);assert(hit.soccer.knockdowns.enemy);assert(!R.canKick(hit,'enemy',people,T+500));assert(T+1800>hit.soccer.knockdowns.enemy.until);
console.log('PASS sliding contact knocks down an opponent with bounded recovery');
{
 const crowd=Object.fromEntries(Array.from({length:20},(_,i)=>['p'+i,person(15+i%6*2.5,1+Math.floor(i/6)*4)]));
 let time=T,state=R.command(R.fresh('p0',T),{kind:'start-soccer',id:'capacity',uid:'p0',at:T,bots:{enabled:true,blue:10,red:10}},crowd,'p0',new Set(),T).state;
 const g=state.soccer,F=soccerPitch(g.pitchCount);assert.equal(g.pitchCount,40);assert.equal(Object.keys(g.kickoff.slots).length,40);
 for(const [id,p]of Object.entries(g.kickoff.slots)){if(crowd[id])Object.assign(crowd[id],p);assert(p.x>=F.left&&p.x<=F.right&&p.z>=F.near&&p.z<=F.far);}
 for(let i=0;i<1800;i++){
  const dt=[1/60,1/30,.1][i%3];time+=dt*1000;R.step(state,crowd,time,dt);
  assert(['x','y','z','vx','vy','vz'].every(k=>Number.isFinite(state.soccer.ball[k])));
  for(const p of Object.values(state.soccer.bots))assert(Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>=F.minX&&p.x<=F.maxX&&p.z>=F.minZ&&p.z<=F.maxZ);
  if(i%60===0)state=JSON.parse(JSON.stringify(state));
 }
 console.log('PASS 20 people plus 20 bots: expanded formation and 90 seconds at mixed 10/30/60 Hz');
}
