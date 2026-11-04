import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
const R=createLobbyGamesRules(),T=100000,F=R.SOCCER;
for(const count of [2,3,6,20])for(const team of [0,1]){
 const players=Object.fromEntries(Array.from({length:count},(_,i)=>['p'+i,{online:true,x:18+i%4*2,z:6+Math.floor(i/4)*2,yaw:0,lobbyY:0}]));
 const s=R.fresh('p0',T),g=s.soccer;Object.assign(g,{id:'match',status:'playing',endAt:T+180000,members:Object.fromEntries(Object.keys(players).map((id,i)=>[id,i%2])),score:[9,3]});
 let time=T;
 function score(scoring){const dir=scoring===0?1:-1;Object.assign(g.ball,{x:23.5,y:.9,z:(scoring===0?F.far:F.near)-dir*.4,vx:0,vy:0,vz:dir*12,dribbler:'',resetUntil:0});g.kickoff=null;for(let i=0;i<12&&!g.kickoff;i++){time+=1000/60;R.step(s,players,time,1/60);}assert(g.kickoff);}
 score(team);const goal=g.lastGoal,k=g.kickoff;
 assert.deepEqual(goal.beforeScore,[9,3]);assert.deepEqual(goal.score,team===0?[10,3]:[9,4]);assert.equal(k.team,1-team);assert.equal(g.members[k.kicker],1-team);assert.equal(g.ball.x,23);assert.equal(g.ball.z,10);assert.equal(g.ball.vx+g.ball.vy+g.ball.vz,0);
 const slots=Object.values(k.slots);assert.equal(slots.length,count);
 for(const [id,p]of Object.entries(k.slots)){assert(p.x>=F.left&&p.x<=F.right&&p.z>F.near&&p.z<F.far);assert((p.z-10)*(g.members[id]===0?-1:1)>0);Object.assign(players[id],p);}
 for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++)assert(Math.hypot(slots[i].x-slots[j].x,slots[i].z-slots[j].z)>2,'formation spacing');
 assert(Math.max(...slots.map(p=>Math.abs(p.x-23)))<=2.4+.001,'centered formation');
 assert(!R.canKick(s,k.kicker,players,time));assert(!R.canDash(s,k.kicker,players,time));
 time=k.readyAt+1;R.step(s,players,time,.001);assert.equal(g.ball.dribbler,k.kicker);assert(R.canKick(s,k.kicker,players,time));
 const opponent=Object.keys(players).find(id=>g.members[id]===team);Object.assign(players[opponent],{x:23,z:10});
 assert(!R.canKick(s,opponent,players,time),'scoring side cannot steal restart');assert.equal(R.pressTarget(g,opponent,players,time),'');Object.assign(players[opponent],k.slots[opponent]);
 const yaw=players[k.kicker].yaw,result=R.command(s,{uid:k.kicker,id:'restart-kick',kind:'kick',mode:'shot',yaw,at:time},players,'p0',new Set(),time);assert(result.ok,result.message);
 time+=130;R.step(result.state,players,time,.13);assert(result.state.soccer.kickoff.released);assert(Math.hypot(result.state.soccer.ball.vx,result.state.soccer.ball.vz)>5);
 const old=[...g.score];score(1-team);assert.deepEqual(g.lastGoal.beforeScore,old);assert.equal(g.kickoff.team,team);
 console.log('PASS goal digits, centered spaced formation, conceding kickoff, protected first kick and repeated goal:',count,team);
}
