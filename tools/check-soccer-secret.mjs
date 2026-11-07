import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {soccerSecretActive,soccerSecretSpeed} from '../lobby-soccer-secret.js';
import {sampleSoccerSkill} from '../lobby-soccer-skills.js';
import {predictSoccerBall} from '../lobby-soccer-kick.js';
import {sampleSoccerVolley} from '../lobby-soccer-finishes.js';
const R=createLobbyGamesRules(),T=100000;
let serial=0;
const people={host:{online:true,x:34,z:10,yaw:0},guest:{online:true,x:34,z:11,yaw:0},ally:{online:true,x:23,z:18,yaw:0}};
const cmd=(s,kind,extra={},time=T,uid='host')=>R.command(s,{kind,uid,id:'cmd'+(++serial),at:time,...extra},people,'host',new Set(),time,()=>.5);
const zero=()=>{const s=R.fresh('host',T);s.soccer.botOptions={enabled:true,blue:0,red:0};return s;};
function armed(){let s=zero();for(let i=0;i<3;i++){const r=cmd(s,'soccer-bots',{team:'blue',delta:-1});assert(r.ok);s=JSON.parse(JSON.stringify(r.state));assert.equal(!!s.soccer.secretPending,i===2);}return s;}
{
 let s=zero();assert(!cmd(s,'soccer-bots',{team:'blue',delta:-1},T,'guest').ok);
 s.soccer.botOptions.blue=1;s=cmd(s,'soccer-bots',{team:'blue',delta:-1}).state;assert(!s.soccer.secretInput);
 s=cmd(s,'soccer-bots',{team:'red',delta:-1}).state;
 s=cmd(s,'soccer-bots',{team:'blue',delta:1}).state;assert.equal(s.soccer.secretInput,null);
 s=cmd(s,'soccer-bots',{team:'blue',delta:-1}).state;assert(!s.soccer.secretPending);
 s=zero();const request={team:'blue',delta:-1,id:'same'};
 s=cmd(s,'soccer-bots',request).state;assert(!cmd(s,'soccer-bots',request).ok);assert.equal(s.soccer.secretInput.ids.length,1);
 s=armed();assert(!soccerSecretActive(s.soccer));assert.equal(soccerSecretSpeed(s.soccer,'host'),1);
 assert(!zero().soccer.secretPending,'another room stays normal');
 const invalid=cmd(s,'start-soccer',{bots:{enabled:true,blue:100,red:0}});assert(!invalid.ok);assert(invalid.state.soccer.secretPending);
 s=cmd(s,'start-soccer').state;assert(s.soccer.secretMode);assert(!s.soccer.secretPending);assert(!soccerSecretActive(s.soccer));
 R.step(s,people,T+3100,1/60);assert(soccerSecretActive(s.soccer));assert.equal(soccerSecretSpeed(s.soccer,'host'),3.2);assert.equal(soccerSecretSpeed(s.soccer,'outsider'),1);
 const afterGoal=s.soccer.secretMode;R.prepareSoccerKickoff(s.soccer,people,T+4000,0,T+5000,'goal');assert.equal(s.soccer.secretMode,afterGoal);
 for(const how of ['stop','timeout','depart']){
  let next=JSON.parse(JSON.stringify(s));if(how==='stop')next=cmd(next,'stop',{game:'soccer'},T+6000).state;
  else R.step(next,how==='depart'?{}:people,how==='timeout'?T+190000:T+6000,1/60);
  assert.equal(next.soccer.status,'finished');assert(!soccerSecretActive(next.soccer));assert(!next.soccer.secretMode);
  next=cmd(next,'start-soccer',{},T+200000).state;assert(!next.soccer.secretMode,how+' consumed once');
 }
 // Host migration transports the room snapshot, not local counters.
 s=armed();const r=R.command(s,{uid:'guest',id:'newhost',kind:'start-soccer',at:T},people,'guest',new Set(),T);assert(r.ok);assert(r.state.soccer.secretMode);
 // Activation also works in the short post-match results window.
 s=zero();s.soccer.status='finished';s.soccer.endedAt=T;
 for(let i=0;i<3;i++){s=cmd(s,'soccer-bots',{team:'blue',delta:-1},T+i*100).state;R.step(s,people,T+i*100+50,.05);}assert(s.soccer.secretPending);
 console.log('PASS zero-only triple input, host authority, duplicates, room isolation, migration, single-match lifecycle');
}
function playing(secret=true){const s=zero();Object.assign(s.soccer,{secretMode:secret,status:'playing',members:{host:0,guest:1,ally:0},endAt:T+180000});people.host={online:true,x:23,z:8,yaw:0};people.ally={online:true,x:23,z:18,yaw:0};people.guest={online:true,x:30,z:15,yaw:Math.PI};Object.assign(s.soccer.ball,{x:23,z:8.75,dribbler:'host'});return s;}
{
 const origin={x:23,y:2,z:10,vx:0,vy:5,vz:17,spin:1};
 const normal=predictSoccerBall(origin,.4).at(-1),wild=predictSoccerBall({...origin,secretCurve:true},.4).at(-1);assert(wild.x-origin.x>(normal.x-origin.x)*3);
 const n=sampleSoccerSkill('doubleTouch',340,1),w=sampleSoccerSkill('doubleTouch',340,1,true);assert.equal(w.travelX,n.travelX*6);
 assert(!cmd(playing(false),'soccer-hand').ok);
 let s=cmd(playing(),'soccer-hand').state;assert.equal(s.soccer.ball.handOwner,'host');
 for(let i=1;i<=30;i++){people.host.x+=.12;R.step(s,people,T+i*16,1/60);assert.equal(s.soccer.ball.handOwner,'host');assert.equal(s.soccer.ball.y,1.05);assert(Math.abs(s.soccer.ball.x-people.host.x)<.001);}
 s=cmd(s,'soccer-hand',{},T+600).state;assert(!s.soccer.ball.handOwner);assert.equal(s.soccer.ball.y,.3);
 s=cmd(s,'soccer-hand',{},T+700).state;s=cmd(s,'kick',{mode:'shot',yaw:0,power:1,spin:1},T+800).state;R.step(s,people,T+950,1/60);assert(!s.soccer.ball.handOwner);assert(s.soccer.ball.secretCurve);assert(s.soccer.kicks.host.connected);
 console.log('PASS exaggerated curve and feint, hand carrying during movement, drop and kick release');
}
for(const dt of [1/60,1/30,.1]){
 let s=cmd(playing(),'kick',{mode:'lob',yaw:0,power:1,target:'ally'}).state;R.step(s,people,T+260,dt);assert(s.soccer.kicks.host.connected);
 let peak=0;
 for(let n=1;n<=Math.ceil(1.7/dt);n++){R.step(s,people,T+260+n*dt*1000,dt);peak=Math.max(peak,s.soccer.ball.y);}assert(peak>14);
 const time=T+260+Math.ceil(1.7/dt)*dt*1000,b=s.soccer.ball;
 people.ally.x=b.x;people.ally.z=b.z;
 assert.equal(R.airAction(s,'ally',people,time),'volley');
 const r=cmd(s,'soccer-volley',{},time,'ally');assert(r.ok,r.message);s=r.state;
 const f=s.soccer.finishes.ally;assert(f.sky);assert(sampleSoccerVolley(f,f.contactAt).height>12);
 let clock=time;while(clock<f.contactAt){const step=Math.min(dt,(f.contactAt-clock)/1000);clock+=step*1000;R.step(s,people,clock,step);}
 assert(s.soccer.finishes.ally.connected,`sky contact at dt=${dt}`);assert(s.soccer.ball.vy<0,'sky shot descends toward goal');
 assert(Object.values(s.soccer.ball).filter(v=>typeof v==='number').every(Number.isFinite));
 console.log('PASS high lob >14m, high jump, physical airborne shot at dt',dt);
}
