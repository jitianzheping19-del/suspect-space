import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
import {SOCCER_SKILLS,classifySoccerGesture,sampleSoccerSkill} from '../lobby-soccer-skills.js';
const R=createLobbyGamesRules(),T=100000,p=(x,z,extra={})=>({online:true,x,z,lobbyY:0,yaw:0,...extra});
const roster={host:p(23,9),friend:p(23,17),opponent:p(30,18)};
function state(){const s=R.fresh('host',T);Object.assign(s.soccer,{status:'playing',members:{host:0,friend:0,opponent:1},endAt:T+180000});Object.assign(s.soccer.ball,{z:9.85,dribbler:'host'});return s;}
function command(s,extra){return R.command(s,{uid:'host',id:'test',kind:'soccer-skill',skill:'doubleTouch',side:1,yaw:0,at:T,...extra},roster,'host',new Set(),T);}
for(const kind of Object.keys(SOCCER_SKILLS)){
 const start=command(state(),{skill:kind});assert(start.ok);const s=start.state,spec=SOCCER_SKILLS[kind];let maxY=0,minSide=0,maxSide=0;
 for(let i=1;i<=100;i++){R.step(s,roster,T+i*1000/60,1/60);const b=s.soccer.ball;maxY=Math.max(maxY,b.y);minSide=Math.min(minSide,b.x-23);maxSide=Math.max(maxSide,b.x-23);assert([b.x,b.y,b.z,b.vx,b.vy,b.vz].every(Number.isFinite));}
 assert(s.soccer.skills.host.released,kind+' releases the ball');assert(!s.soccer.skills.host.cancelled,kind+' completes');
 if(kind==='heelLift')assert(maxY>2.2,'heel lift travels above the avatar');
 else assert(maxSide-minSide>.25,kind+' changes ball trajectory');
 for(let age=0;age<=spec.duration;age+=10){const motion=sampleSoccerSkill(kind,age);assert(Object.values(motion).every(Number.isFinite));}
 assert.equal(command(start.state,{id:'repeat'}).ok,false,'cooldown blocks repeat');
 console.log('PASS',kind,{maxY,minSide,maxSide});
}
for(const invalid of ['constructor','unknown'])assert.equal(command(state(),{skill:invalid}).ok,false);
assert.equal(command(state(),{yaw:NaN}).ok,false);assert.equal(command(state(),{side:0}).ok,false);
let s=state();s.soccer.ball.dribbler='opponent';assert.equal(command(s,{}).ok,false);
s=command(state(),{}).state;roster.host.online=false;R.step(s,roster,T+20,1/60);assert(s.soccer.skills.host.cancelled);roster.host.online=true;
s=command(state(),{}).state;s.soccer.ball.dribbler='opponent';R.step(s,roster,T+20,1/60);assert(s.soccer.skills.host.cancelled,'losing possession interrupts');
const weak=command(state(),{kind:'kick',mode:'shot',power:.15}).state,strong=command(state(),{kind:'kick',mode:'shot',power:1}).state;
assert.equal(strong.soccer.kicks.host.mode,'shot','explicit shot never becomes a pass');R.step(weak,roster,T+120,1/60);R.step(strong,roster,T+120,1/60);assert(strong.soccer.ball.vz>weak.soccer.ball.vz+3);
const points=rows=>rows.map(([x,y])=>({x,y}));
assert.deepEqual(classifySoccerGesture(points([[0,0],[35,0],[40,-40]])),{skill:'doubleTouch',side:1});
assert.deepEqual(classifySoccerGesture(points([[0,0],[0,35],[0,-45]])),{skill:'heelLift',side:1});
const arc=Array.from({length:15},(_,i)=>({x:Math.cos(i/14*Math.PI)*40,y:Math.sin(i/14*Math.PI)*40}));assert.equal(classifySoccerGesture(arc).skill,'roulette');
assert.equal(classifySoccerGesture(points([[0,0],[40,0],[70,0]])),null);assert.equal(classifySoccerGesture(points([[0,0],[2,0]])),null);
console.log('PASS skill validation, possession interruption, explicit shot power and advanced gesture recognition');

for(const side of [-1,1]){const loose=[[0,0],[12*side,5],[25*side,14],[36*side,-7],[42*side,-36]];assert.deepEqual(classifySoccerGesture(points(loose)),{skill:'doubleTouch',side});}
console.log('PASS rounded and diagonal double-touch gestures on both sides');
