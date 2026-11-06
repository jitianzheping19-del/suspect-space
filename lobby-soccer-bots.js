import {resolveSoccerOverlap} from './lobby-soccer-match.js';
import {soccerKickoffBlocks} from './lobby-soccer-kickoff.js';
import {applySoccerPress} from './lobby-soccer-press.js';
import {soccerPassLane,soccerBotAssignments,soccerBotPassTarget} from './lobby-soccer-tactics.js';
import {SOCCER_SKILLS,sampleSoccerSkill} from './lobby-soccer-skills.js';
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
function releaseSoccerBotPress(g,id,p,players,time){
 if(!g.presses?.[id]?.held)return false;
 p.pressSerial=(p.pressSerial||0)+1;applySoccerPress(g,{uid:id,held:false,serial:p.pressSerial,at:time},players,time);return true;
}
function moveSoccerBot(id,p,x,z,players,F){
 x=Math.max(F.left+.7,Math.min(F.right-.7,x));z=Math.max(F.near+1.25,Math.min(F.far-1.25,z));
 const q=resolveSoccerOverlap(id,{x,z},players,F);p.walking=Math.hypot(q.x-p.x,q.z-p.z)>.001;p.x=q.x;p.z=q.z;
}
export function stepSoccerBots(g,players,F,time,dt){
 let changed=false;const b=g.ball;
 const roles=g.status==='playing'?soccerBotAssignments(g,players,F,time):{};
 if(g.status!=='playing'&&g.botTactics){g.botTactics=null;changed=true;}
 for(const [id,p]of Object.entries(g.bots||{})){
  const team=g.members[id],dir=team===0?1:-1,goal=team===0?F.far:F.near,owner=b.dribbler,holder=players[owner],own=owner===id,ally=holder&&g.members[owner]===team,role=roles[id];
  if(role?.role!=='press')changed=releaseSoccerBotPress(g,id,p,players,time)||changed;
  if(!own&&p.feintPass){p.feintPass=null;p.skillMotion=null;changed=true;}
  if(g.status!=='playing'||!soccerLive(p)||team===undefined||time<Number(b.resetUntil||0)||soccerKickoffBlocks(g,id,time)){
   if(p.walking){p.walking=false;changed=true;}continue;
  }
  const press=g.presses?.[id],recovering=press?.phase==='recover'&&time<press.recoverUntil;
  if(time<Number(g.knockdowns?.[id]?.until||0)||time<Number(g.nutmegs?.[id]?.until||0)){p.walking=false;moveSoccerBot(id,p,p.x,p.z,players,F);continue;}
  const receiving=g.receives?.[id],kick=g.kicks?.[id],finish=g.finishes?.[id],frozen=finish&&time<finish.until||receiving&&time<receiving.until||kick&&time<kick.at+500;
  if(frozen){p.walking=false;continue;}
  const skill=g.skills?.[id],spec=SOCCER_SKILLS[skill?.kind];
  if(own&&skill&&!skill.cancelled&&spec&&time<=skill.at+spec.duration){
   const motion=sampleSoccerSkill(skill.kind,time-skill.at,skill.side);
   if(motion){
    const previous=p.skillMotion?.id===skill.id?p.skillMotion:{x:0,z:0},dx=motion.travelX-previous.x,dz=motion.travelZ-previous.z,c=Math.cos(skill.yaw),s=Math.sin(skill.yaw);
    moveSoccerBot(id,p,p.x+c*dx+s*dz,p.z-s*dx+c*dz,players,F);p.yaw=skill.yaw;p.skillMotion={id:skill.id,x:motion.travelX,z:motion.travelZ};changed=true;
   }
   continue;
  }
  if(p.skillMotion){p.skillMotion=null;changed=true;}
  let tx=role?.x??p.x,tz=role?.z??p.z,speed=own?2.05:role?.role==='support'?2.35:2.85,gap=.6;
  if(own){tx=23+(p.x<23?-1:1)*.8;tz=goal-dir*1.6;gap=.15;}
  else if(role?.role==='press'&&holder&&!ally){
   const fx=Math.sin(holder.yaw||0),fz=Math.cos(holder.yaw||0),front=(p.x-holder.x)*fx+(p.z-holder.z)*fz;
   if(front<.15){const side=p.x>=holder.x?1:-1;tx=holder.x+fx*.65+fz*side*1.12;tz=holder.z+fz*.65-fx*side*1.12;gap=.12;}else gap=.72;
   if(press?.held&&time<press.until&&Number.isFinite(press.aimX)){tx=press.aimX;tz=press.aimZ;gap=press.flanking?.12:.72;}
   if(recovering){speed=press.outcome==='beaten'?.4:.9;gap=.9;}
  }else if(role?.role==='chase'||role?.role==='receive'){gap=.1;}
  const dx=tx-p.x,dz=tz-p.z,d=Math.hypot(dx,dz),step=Math.min(Math.max(0,d-gap),speed*dt);
  moveSoccerBot(id,p,p.x+(d?dx/d*step:0),p.z+(d?dz/d*step:0),players,F);
  const yaw=own?Math.atan2(tx-p.x,tz-p.z):Math.atan2(b.x-p.x,b.z-p.z),turn=Math.atan2(Math.sin(yaw-p.yaw),Math.cos(yaw-p.yaw));p.yaw+=turn*Math.min(1,dt*12);changed=true;
  if(role?.role==='press'&&holder&&!ally&&!own&&time>=Number(p.nextPress||0)){
   p.nextPress=time+240;p.pressSerial=(p.pressSerial||0)+1;
   const old=g.presses?.[id];applySoccerPress(g,{uid:id,held:!(old?.outcome&&old.held),serial:p.pressSerial,at:time},players,time);
  }
  if(!own){p.ownedAt=0;continue;}p.ownedAt||=time;
  if(p.feintPass&&(time>p.feintPass.expires||skill?.cancelled))p.feintPass=null;
  if(time<Number(p.nextAction||0)||b.y>.6)continue;
  const target=soccerBotPassTarget(g,id,players,F,p.feintPass?.target),q=players[target];
  const opponents=Object.keys(g.members).filter(other=>g.members[other]!==team&&soccerLive(players[other])&&!players[other].lobbyKart&&!players[other].lobbyCircuit);
  const front=opponents.filter(other=>{const r=players[other],dx=r.x-p.x,dz=r.z-p.z,d=Math.hypot(dx,dz);return d<2.8&&d>.1&&(dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw))/d>.5;}).sort((a,c)=>Math.hypot(players[a].x-p.x,players[a].z-p.z)-Math.hypot(players[c].x-p.x,players[c].z-p.z))[0];
  if(!p.feintPass&&q&&front&&time-p.ownedAt>=250&&time>=Number(skill?.cooldownUntil||0)&&b.y<.5&&Math.abs(b.vy)<1&&Math.hypot(p.x-b.x,p.z-b.z)<1.4){
   const defender=players[front],sideOf=(defender.x-p.x)*Math.cos(p.yaw)-(defender.z-p.z)*Math.sin(p.yaw),passSide=(q.x-p.x)*Math.cos(p.yaw)-(q.z-p.z)*Math.sin(p.yaw);
   const away=Math.abs(sideOf)>.2?(sideOf>0?-1:1):(passSide<0?-1:1),kind=(p.feintCount||0)%2?'shotFeint':'doubleTouch',side=kind==='shotFeint'?-away:away,spec=SOCCER_SKILLS[kind];
   g.skills||={};g.skills[id]={id:id+':feint:'+time,kind,side,yaw:p.yaw,at:time,cooldownUntil:time+spec.cooldown,released:false,cancelled:false};
   p.feintCount=(p.feintCount||0)+1;p.feintPass={target,expires:time+spec.duration+1000};p.nextAction=time+spec.duration;p.skillMotion=null;g.dribble={uid:id,at:time};p.walking=false;continue;
  }
  if(!p.feintPass&&time-p.ownedAt<1050)continue;
  const defender=opponents.some(other=>Math.hypot(players[other].x-p.x,players[other].z-p.z)<3.5),nearGoal=Math.abs(goal-p.z)<10;
  const pass=q&&(!!p.feintPass||!nearGoal||defender),shoot=nearGoal&&!pass;if(!pass&&!shoot){p.feintPass=null;continue;}
  const keeper=g.keepers?.[1-team],x=pass?q.x:23+(keeper?.x>=23?-1:1)*1.7,z=pass?q.z:goal;
  const mode=pass?(soccerPassLane(p,q,g,players,team)>.35&&Math.hypot(x-p.x,z-p.z)>5?'lob':'pass'):'shot',kickYaw=Math.atan2(x-b.x,z-b.z);
  g.kicks||={};g.kicks[id]={id:id+':'+time,at:time,yaw:kickYaw,foot:soccerKickFoot(p,b,kickYaw),mode,power:shoot?.82:.62,target:pass?target:'',applied:false};p.yaw=kickYaw;p.nextAction=time+1900;p.ownedAt=0;p.feintPass=null;
 }
 return changed;
}
