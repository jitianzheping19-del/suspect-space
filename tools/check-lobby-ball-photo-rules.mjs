import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
const R=createLobbyGamesRules(),T=100000;
const player=(x,z,extra={})=>({online:true,x,z,lobbyY:0,yaw:0,...extra});
const roster={host:player(23,9),friend:player(23,17),enemy:player(23,14),behind:player(23,5),side:player(29,9)};
function match(){const s=R.fresh('host',T);Object.assign(s.soccer,{status:'playing',members:{host:0,friend:0,enemy:1,behind:0,side:0},endAt:T+180000});return s;}
let s=match();
assert.equal(R.passTarget(s,'host',roster,0),'friend','target only a teammate ahead, ignoring closer opponent');
assert.equal(R.passTarget(s,'host',roster,Math.PI),'behind');
assert.equal(R.passTarget(s,'host',roster,Math.PI/2),'side');
assert.equal(R.passTarget(s,'host',roster,-Math.PI/2),'');
roster.friend.online=false;assert.equal(R.passTarget(s,'host',roster,0),'');roster.friend.online=true;
let result=R.command(s,{uid:'host',id:'pass',kind:'kick',yaw:0,target:'enemy',at:T},roster,'host',new Set(),T);
assert(result.ok);s=result.state;assert.equal(s.soccer.kicks.host.mode,'pass');assert.equal(s.soccer.kicks.host.target,'friend','host chooses target');
R.step(s,roster,T+120,1/60);assert(s.soccer.ball.vz>0);assert(s.soccer.ball.vy<1,'ground pass');
// Pass travel without an opponent in the lane: receiver takes control.
roster.enemy.x=30;
for(let i=1;i<180;i++)R.step(s,roster,T+120+i*1000/60,1/60);
assert.equal(s.soccer.ball.dribbler,'friend','pass reaches a teammate and is trapped');
// Facing away from teammates produces a stronger lofted shot.
s=match();result=R.command(s,{uid:'host',id:'shot',kind:'kick',yaw:-Math.PI/2,at:T},roster,'host',new Set(),T);s=result.state;
assert.equal(s.soccer.kicks.host.mode,'shot');R.step(s,roster,T+120,1/60);assert(s.soccer.ball.vx< -12);assert(s.soccer.ball.vy>2);
// A walking player carries the ball ahead; leaving the room releases ownership.
s=match();s.soccer.ball.z=9.8;roster.host.walking=true;
for(let i=0;i<60;i++){roster.host.z=9+i*.05;R.step(s,roster,T+i*1000/60,1/60);}
assert.equal(s.soccer.ball.dribbler,'host');assert(s.soccer.ball.z>roster.host.z);assert(R.distance(s.soccer.ball,roster.host)<1.3);
roster.host.x=0;R.step(s,roster,T+1017,1/60);assert.equal(s.soccer.ball.dribbler,'');
console.log('PASS teammate cone targeting, host-selected passes, receiver control, shots, moving dribble and exit cleanup');
const empty={};
function flight(ball,dt=.1){const state=R.fresh('host',T);state.soccer.ball={...R.ball(T),...ball};R.step(state,empty,T+dt*1000,dt);return state.soccer;}
assert.deepEqual(flight({x:23,z:20.9,vz:2},.05).score,[0,0],'partial crossing does not score');
assert.deepEqual(flight({x:23,z:21.25,vz:10}).score,[1,0]);
assert.deepEqual(flight({x:23,z:-1.25,vz:-10}).score,[0,1]);
assert.deepEqual(flight({x:23,y:3,z:20.95,vz:16}).score,[0,0],'over crossbar');
for(const x of [20.5,25.5]){const g=flight({x,z:20,vz:16});assert.deepEqual(g.score,[0,0]);assert(g.ball.vz<0,'fast shot bounces on a post');}
const bar=flight({x:23,y:2.2,z:20,vz:16,vy:.4});assert.deepEqual(bar.score,[0,0]);assert(bar.ball.vz<0,'crossbar rebound');
assert.deepEqual(flight({x:26,z:20.95,vz:16}).score,[0,0],'outside goal width');
console.log('PASS full-ball line crossing, both ends, overhead and wide shots, fast post and crossbar collisions');

const people={host:player(0,10),guest:player(1,11),outside:player(0,0)};
let state=R.fresh('host',T);
const photo=(uid,id,at=T)=>R.command(state,{uid,id,kind:'photo-start',at},people,'host',new Set(),at);
assert.equal(photo('outside','outside').ok,false);
const shot=photo('guest','guest-shot');assert(shot.ok,'any person on the photo deck can start');state=shot.state;
assert.deepEqual(Object.keys(state.photo.members).sort(),['guest','host']);assert.equal(state.photo.at,T+5000);assert.equal(state.photo.expiresAt,T+65000);
assert.equal(photo('host','concurrent',T+50).ok,false,'only one shared countdown');
R.step(state,people,T+64999,1/60);assert(state.photo);R.step(state,people,T+65000,1/60);assert.equal(state.photo,null);
console.log('PASS photo participant selection, shared shutter, concurrent starts and one-minute expiry');

const bg=(uid,id,background,at=T)=>R.command(R.fresh('host',T),{uid,id,kind:'photo-background',background,at},people,'host',new Set(['guest']),at);
assert.equal(bg('guest','denied','rose').ok,false,'admin guest cannot change backgrounds');assert.equal(bg('host','invalid','unknown').ok,false);
const themed=bg('host','theme','sunset');assert(themed.ok);assert.equal(themed.state.photoBackground,'sunset');
const atCamera={...people,host:player(-4.1,8.0)};
const cameraShot=R.command(themed.state,{uid:'host',id:'camera',kind:'photo-start',at:T},atCamera,'host',new Set(),T);assert(cameraShot.ok);assert.equal(cameraShot.state.photo.background,'sunset');assert(cameraShot.state.photo.members.host);
assert.equal(R.command(cameraShot.state,{uid:'host',id:'busy-background',kind:'photo-background',background:'moon',at:T+100},atCamera,'host',new Set(),T+100).ok,false,'background locked through shutter');
console.log('PASS host-only background validation, invalid theme rejection, camera start and fixed shot backdrop');
