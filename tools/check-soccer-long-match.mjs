import assert from 'node:assert/strict';
import {createLobbyGamesRules} from '../lobby-games-rules.js';
const R=createLobbyGamesRules(),T=100000;
for(const count of [2,6,20]){
 const people={};for(let i=0;i<count;i++)people['p'+i]={online:true,x:16+i%6*2.6,z:3+Math.floor(i/6)*5,yaw:i%2?Math.PI:0,lobbyY:0};
 let state=R.fresh('p0',T);Object.assign(state.soccer,{id:'stress',status:'playing',members:Object.fromEntries(Object.keys(people).map((id,i)=>[id,i%2])),endAt:T+120000});
 Object.assign(state.soccer.ball,{x:23,z:10,dribbler:''});let time=T,commands=0,accepted=0,presses=0,maxSpeed=0,snapshots=0;
 const started=performance.now();
 for(let tick=0;time<T+121000;tick++){
  const dt=[1/60,1/30,.1,1/30,1/60][tick%5];time+=dt*1000;const g=state.soccer,b=g.ball;
  if(g.kickoff&&!g.kickoff.released&&time<g.kickoff.readyAt)for(const [id,p]of Object.entries(g.kickoff.slots))Object.assign(people[id],p);
  for(const [id,p]of Object.entries(people)){
   const n=Number(id.slice(1)),team=g.members[id];if(R.soccerKickoffBlocks(g,id,time)||g.status!=='playing')continue;
   const owner=b.dribbler===id,ally=g.members[b.dribbler]===team,goal=team===0?R.SOCCER.far:R.SOCCER.near,press=g.presses?.[id];
   const q=owner?{x:23+Math.sin(time/2000+n)*1.5,z:goal}:ally?{x:16+n%6*2.8,z:Math.max(0,Math.min(20,b.z+(team? -1:1)*3))}:press?.aimX!==undefined?{x:press.aimX,z:press.aimZ}:b;
   const dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz),step=Math.min(d,2.4*dt),x=p.x+(d?dx/d*step:0),z=p.z+(d?dz/d*step:0);
   const collides=Object.entries(people).some(([other,v])=>other!==id&&Math.hypot(v.x-x,v.z-z)<.85);
   if(!collides){p.x=Math.max(14.6,Math.min(31.4,x));p.z=Math.max(-1.8,Math.min(21.8,z));}p.walking=!collides&&d>.05;if(d>.01)p.yaw=Math.atan2(dx,dz);
   if(tick%8===n%8){
    const target=R.pressTarget(g,id,people,time);if(target){R.pressInput(g,{uid:id,held:true,mode:tick%40<8?'matchup':'press',serial:tick,at:time},people,time);presses++;}
    if(owner&&R.canKick(state,id,people,time)){
     const skill=tick%4===0&&R.canSkill(state,id,people,time),command={kind:skill?'soccer-skill':'kick',skill:'shotFeint',side:n%2?1:-1,uid:id,id:id+':'+tick,at:time,yaw:Math.atan2(23-p.x,goal-p.z),mode:'shot',power:.65,spin:n%3===0?.6:0};
     commands++;const result=R.command(state,command,people,'p0',new Set(),time);if(result.ok){state=result.state;accepted++;}
    }
   }
  }
  R.step(state,people,time,dt);const ball=state.soccer.ball;
  for(const key of ['x','y','z','vx','vy','vz'])assert(Number.isFinite(ball[key]),'finite '+key);
  assert(ball.y>=.299&&ball.y<20);assert(ball.x>=13&&ball.x<=33);assert(ball.z>=-5&&ball.z<=25);assert(state.soccer.score.every(n=>Number.isInteger(n)&&n>=0));
  maxSpeed=Math.max(maxSpeed,Math.hypot(ball.vx,ball.vz));assert(maxSpeed<=34);
  if(tick%30===0){state=JSON.parse(JSON.stringify(state));snapshots++;}
 }
 assert.equal(state.soccer.status,'finished');assert(accepted>0&&presses>0&&snapshots>50);
 console.log('PASS mixed 10/30/60 Hz, serialized state and 2-minute match',JSON.stringify({players:count,accepted,commands,presses,score:state.soccer.score,maxSpeed:+maxSpeed.toFixed(2),simulationMs:Math.round(performance.now()-started)}));
}
