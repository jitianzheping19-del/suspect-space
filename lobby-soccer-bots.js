import {resolveSoccerOverlap} from './lobby-soccer-match.js';
import {soccerKickoffBlocks} from './lobby-soccer-kickoff.js';
import {applySoccerPress} from './lobby-soccer-press.js';
import {soccerPassLane,soccerSupportSpot} from './lobby-soccer-tactics.js';
import {soccerKickFoot} from './lobby-soccer-kick.js';

// Field bots belong to this match snapshot, never to the lobby's player slots.
export function soccerRoster(g,players){return g?.bots?{...players,...g.bots}:players;}
export function soccerLive(p){return p?.online===true&&(!p.bot||p.soccerBot===true)&&!p.observer;}
export function createSoccerBots(g,human,options={enabled:true,blue:1,red:1}){
 if(!options.enabled){delete g.bots;return;}g.bots={};
 let n=0;for(const team of [0,1])for(let i=0;i<(team===0?options.blue:options.red);i++){
  const id='soccer-bot-'+(++n);g.members[id]=team;g.bots[id]={online:true,bot:true,soccerBot:true,name:(team===0?'青':'赤')+' BOT '+(i+1),team,x:19.5+i%4*2,z:team===0?7:14,lobbyY:0,yaw:team===0?0:Math.PI,walking:false,nextAction:0};
 }
}
export function stepSoccerBots(g,players,F,time,dt){
 let changed=false;const b=g.ball;
 for(const [id,p]of Object.entries(g.bots||{})){
  if(g.status!=='playing'||time<Number(b.resetUntil||0)||soccerKickoffBlocks(g,id,time)){if(p.walking){p.walking=false;changed=true;}continue;}
  const team=g.members[id],dir=team===0?1:-1,goal=team===0?F.far:F.near,owner=b.dribbler,holder=players[owner],own=owner===id,ally=holder&&g.members[owner]===team;
  const press=g.presses?.[id],recovering=press?.phase==='recover'&&time<press.recoverUntil;
  const down=g.knockdowns?.[id];if(down&&time<down.until){p.walking=false;const q=resolveSoccerOverlap(id,p,players,F);Object.assign(p,q);continue;}
  const receiving=g.receives?.[id],kick=g.kicks?.[id],finish=g.finishes?.[id],frozen=finish&&time<finish.until||receiving&&time<receiving.until||kick&&time<kick.at+500;
  if(frozen){p.walking=false;continue;}
  let tx=b.x,tz=b.z,speed=own?2.05:2.85,gap=.52;
  if(own){tx=23+(p.x<23?-1:1)*.8;tz=goal-dir*1.6;gap=.15;}
  else if(b.keeperOwner===team||ally){
   if(!p.support||p.supportOwner!==owner||time>=p.supportAt+350){p.support=soccerSupportSpot(g,id,players,F);p.supportAt=time;p.supportOwner=owner||'';}
   tx=p.support.x;tz=p.support.z;gap=.6;speed=2.35;
  }else if(b.keeperOwner!==undefined){
   tx=Math.max(F.left+2,Math.min(F.right-2,b.x));tz=10-dir*3;gap=.8;speed=2.5;
  }else if(holder){
   // Approach the exposed side of the ball; do not push through the holder.
   const fx=Math.sin(holder.yaw||0),fz=Math.cos(holder.yaw||0),front=(p.x-holder.x)*fx+(p.z-holder.z)*fz;
   if(front<.15){const side=p.x>=holder.x?1:-1;tx=holder.x+fx*.65+fz*side*1.12;tz=holder.z+fz*.65-fx*side*1.12;gap=.12;}else gap=.72;
   if(press?.held&&time<press.until&&Number.isFinite(press.aimX)){tx=press.aimX;tz=press.aimZ;gap=press.flanking?.12:.72;}
   if(recovering){speed=press.outcome==='beaten'?.4:.9;gap=.9;}
  }else if(g.flight?.target===id){tx=g.flight.x;tz=g.flight.z;gap=.1;}
  else if(b.y>.8){const fall=(b.vy+Math.sqrt(b.vy*b.vy+19.6*Math.max(0,b.y-.3)))/9.8;tx=b.x+b.vx*Math.min(.65,fall);tz=b.z+b.vz*Math.min(.65,fall);}
  tx=Math.max(F.left+.7,Math.min(F.right-.7,tx));tz=Math.max(F.near+1.25,Math.min(F.far-1.25,tz));
  const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz),step=Math.min(Math.max(0,d-gap),speed*dt);
  let nx=p.x+(d?dx/d*step:0),nz=p.z+(d?dz/d*step:0);
  ({x:nx,z:nz}=resolveSoccerOverlap(id,{x:nx,z:nz},players,F));
  p.walking=Math.hypot(nx-p.x,nz-p.z)>.001;p.x=nx;p.z=nz;
  const yaw=own?Math.atan2(tx-p.x,tz-p.z):Math.atan2(b.x-p.x,b.z-p.z),turn=Math.atan2(Math.sin(yaw-p.yaw),Math.cos(yaw-p.yaw));p.yaw+=turn*Math.min(1,dt*12);changed=true;
  if(holder&&!ally&&!own&&time>=Number(p.nextPress||0)){
   p.nextPress=time+240;p.pressSerial=(p.pressSerial||0)+1;
   const old=g.presses?.[id];applySoccerPress(g,{uid:id,held:!(old?.outcome&&old.held),serial:p.pressSerial,at:time},players,time);
  }
  if(!own){p.ownedAt=0;continue;}p.ownedAt||=time;
  if(time<Number(p.nextAction||0)||time-p.ownedAt<1050||b.y>.6)continue;
  const passScore=q=>Math.hypot(q.x-p.x,q.z-p.z)*.04+soccerPassLane(p,q,g,players,team)*2;
  const teammates=Object.keys(g.members).filter(who=>who!==id&&g.members[who]===team&&soccerLive(players[who])&&Math.hypot(players[who].x-p.x,players[who].z-p.z)>2).sort((a,c)=>passScore(players[a])-passScore(players[c])||a.localeCompare(c));
  const q=players[teammates[0]],defender=Object.keys(g.members).some(who=>g.members[who]!==team&&players[who]&&Math.hypot(players[who].x-p.x,players[who].z-p.z)<3.5),nearGoal=Math.abs(goal-p.z)<10;
  const pass=q&&(!nearGoal||defender),shoot=nearGoal&&!pass;if(!pass&&!shoot)continue;
  const target=pass?teammates[0]:'',keeper=g.keepers?.[1-team],x=pass?q.x:23+(keeper?.x>=23?-1:1)*1.7,z=pass?q.z:goal;
  const mode=pass?((defender||soccerPassLane(p,q,g,players,team)>.4)&&Math.hypot(x-p.x,z-p.z)>5?'lob':'pass'):'shot',kickYaw=Math.atan2(x-b.x,z-b.z);
  g.kicks||={};g.kicks[id]={id:id+':'+time,at:time,yaw:kickYaw,foot:soccerKickFoot(p,b,kickYaw),mode,power:shoot?.82:.62,target,applied:false};p.yaw=kickYaw;p.nextAction=time+1900;p.ownedAt=0;
 }
 return changed;
}
