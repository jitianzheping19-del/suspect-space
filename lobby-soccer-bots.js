import {applySoccerPress} from './lobby-soccer-press.js';

// Field bots belong to this match snapshot, never to the lobby's player slots.
export function soccerRoster(g,players){return g?.bots?{...players,...g.bots}:players;}
export function soccerLive(p){return p?.online===true&&(!p.bot||p.soccerBot===true)&&!p.observer;}
export function createSoccerBots(g,human){
 g.bots={};
 for(const n of [1,2]){
  const id='soccer-bot-'+n,team=n===1?g.members[human]:1-g.members[human];
  g.members[id]=team;g.bots[id]={online:true,bot:true,soccerBot:true,name:'BOT '+n,team,x:n===1?19.5:26.5,z:team===0?7:14,lobbyY:0,yaw:team===0?0:Math.PI,walking:false,nextAction:0};
 }
}
export function stepSoccerBots(g,players,F,time,dt){
 let changed=false;const b=g.ball;
 for(const [id,p]of Object.entries(g.bots||{})){
  if(g.status!=='playing'||time<Number(b.resetUntil||0)){if(p.walking){p.walking=false;changed=true;}continue;}
  const team=g.members[id],dir=team===0?1:-1,goal=team===0?F.far:F.near,owner=b.dribbler,holder=players[owner],own=owner===id,ally=holder&&g.members[owner]===team;
  const receiving=g.receives?.[id],kick=g.kicks?.[id],finish=g.finishes?.[id],frozen=finish&&time<finish.until||receiving&&time<receiving.until||kick&&time<kick.at+500;
  if(frozen){p.walking=false;continue;}
  let tx=b.x,tz=b.z,speed=own?2.6:3.65,gap=.52;
  if(own){tx=23+(p.x<23?-1:1)*.8;tz=goal-dir*1.6;gap=.15;}
  else if(b.keeperOwner!==undefined||ally){
   tx=p.team===0?19.5:26.5;tz=Math.max(F.near+3,Math.min(F.far-3,b.z+dir*4));gap=.7;speed=2.9;
  }else if(holder){
   // Approach the exposed side of the ball; do not push through the holder.
   const fx=Math.sin(holder.yaw||0),fz=Math.cos(holder.yaw||0),front=(p.x-holder.x)*fx+(p.z-holder.z)*fz;
   if(front<.15){const side=p.x>=holder.x?1:-1;tx=holder.x+fx*.65+fz*side*1.12;tz=holder.z+fz*.65-fx*side*1.12;gap=.12;}else gap=.72;
  }else if(g.flight?.target===id){tx=g.flight.x;tz=g.flight.z;gap=.1;}
  else if(b.y>.8){const fall=(b.vy+Math.sqrt(b.vy*b.vy+19.6*Math.max(0,b.y-.3)))/9.8;tx=b.x+b.vx*Math.min(.65,fall);tz=b.z+b.vz*Math.min(.65,fall);}
  tx=Math.max(F.left+.7,Math.min(F.right-.7,tx));tz=Math.max(F.near+1.25,Math.min(F.far-1.25,tz));
  const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz),step=Math.min(Math.max(0,d-gap),speed*dt);
  let nx=p.x+(d?dx/d*step:0),nz=p.z+(d?dz/d*step:0);
  for(const [other,q]of Object.entries(players)){if(other===id||!soccerLive(q)||Math.abs(q.lobbyY||0)>.4)continue;const distance=Math.hypot(nx-q.x,nz-q.z);if(distance<.87){const angle=distance>.001?Math.atan2(nx-q.x,nz-q.z):Math.PI/2;nx=q.x+Math.sin(angle)*.87;nz=q.z+Math.cos(angle)*.87;}}
  nx=Math.max(F.left+.6,Math.min(F.right-.6,nx));nz=Math.max(F.near+1.15,Math.min(F.far-1.15,nz));
  p.walking=Math.hypot(nx-p.x,nz-p.z)>.001;p.x=nx;p.z=nz;
  const yaw=own?Math.atan2(tx-p.x,tz-p.z):Math.atan2(b.x-p.x,b.z-p.z),turn=Math.atan2(Math.sin(yaw-p.yaw),Math.cos(yaw-p.yaw));p.yaw+=turn*Math.min(1,dt*12);changed=true;
  if(holder&&!ally&&!own&&time>=Number(p.nextPress||0)){
   p.nextPress=time+240;p.pressSerial=(p.pressSerial||0)+1;
   const old=g.presses?.[id];applySoccerPress(g,{uid:id,held:!(old?.outcome&&old.held),serial:p.pressSerial,at:time},players,time);
  }
  if(!own){p.ownedAt=0;continue;}p.ownedAt||=time;
  if(time<Number(p.nextAction||0)||time-p.ownedAt<650||b.y>.6)continue;
  const teammates=Object.keys(g.members).filter(who=>who!==id&&g.members[who]===team&&soccerLive(players[who])&&Math.hypot(players[who].x-p.x,players[who].z-p.z)>2).sort((a,c)=>Math.hypot(players[a].x-p.x,players[a].z-p.z)-Math.hypot(players[c].x-p.x,players[c].z-p.z));
  const q=players[teammates[0]],defender=Object.keys(g.members).some(who=>g.members[who]!==team&&players[who]&&Math.hypot(players[who].x-p.x,players[who].z-p.z)<3.5),nearGoal=Math.abs(goal-p.z)<10;
  const pass=q&&(!nearGoal||defender),shoot=nearGoal&&!pass;if(!pass&&!shoot)continue;
  const target=pass?teammates[0]:'',keeper=g.keepers?.[1-team],x=pass?q.x:23+(keeper?.x>=23?-1:1)*1.7,z=pass?q.z:goal;
  const mode=pass?(defender&&Math.hypot(x-p.x,z-p.z)>5?'lob':'pass'):'shot';
  g.kicks||={};g.kicks[id]={id:id+':'+time,at:time,yaw:Math.atan2(x-b.x,z-b.z),mode,power:shoot?.82:.62,target,applied:false};p.yaw=g.kicks[id].yaw;p.nextAction=time+1400;p.ownedAt=0;
 }
 return changed;
}
