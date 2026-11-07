import {soccerUltimateKind,canSoccerUltimate,beginSoccerUltimate,stepSoccerUltimate} from './lobby-soccer-ultimate.js';
import {soccerSecretMember,soccerSecretActive,soccerGoalX} from './lobby-soccer-secret.js';
import {predictSoccerBall,soccerTargetLift} from './lobby-soccer-kick.js';
export function soccerSecretRelayTarget(g,id,players,F){
 const p=players[id];if(!p)return '';
 return Object.keys(g.members||{}).filter(uid=>uid!==id&&g.members[uid]===g.members[id]&&players[uid]?.online&&!players[uid].observer&&!players[uid].lobbyKart&&!players[uid].lobbyCircuit&&players[uid].x>=F.left&&players[uid].x<=F.right&&players[uid].z>=F.near&&players[uid].z<=F.far&&Math.hypot(players[uid].x-p.x,players[uid].z-p.z)>2).sort((a,b)=>Math.hypot(players[a].x-p.x,players[a].z-p.z)-Math.hypot(players[b].x-p.x,players[b].z-p.z))[0]||'';
}
export function canSoccerSecretPower(g,id,kind,players,F,time){
 const p=players[id],b=g?.ball;
 if(!soccerSecretMember(g,id)||!p?.online||p.observer||p.lobbyKart||p.lobbyCircuit||p.x<F.left||p.x>F.right||p.z<F.near||p.z>F.far||Math.abs(p.lobbyY||0)>.3||!b||b.keeperOwner!==undefined||time<Number(b.resetUntil||0)||g.kickoff&&!g.kickoff.released&&time<g.kickoff.until&&g.kickoff.kicker!==id||time<Number(g.secretPowers?.[id]?.cooldownUntil||0)||time<Number(g.finishes?.[id]?.until||0)||time<Number(g.slides?.[id]?.until||0)||time<Number(g.knockdowns?.[id]?.until||0))return false;
 if(soccerUltimateKind(kind))return canSoccerUltimate(g,id,kind,players,kind==='dragon'?soccerSecretRelayTarget(g,id,players,F):'');
 if(kind==='taichi')return !b.dribbler;
 if(kind==='belly')return b.dribbler===id;
 const air=!b.dribbler&&b.y>.55&&b.y<22&&Math.hypot(b.x-p.x,b.z-p.z)<6;
 if(kind==='iron')return air&&predictSoccerBall(b,.55,2).at(-1).y>.8;
 return kind==='relay'&&!!soccerSecretRelayTarget(g,id,players,F)&&(b.dribbler===id||air);
}
export function launchSoccerSecretShot(g,id,p,F,time,kind){
 const b=g.ball,goal=g.members[id]===1?F.near:F.far,center=soccerGoalX(F,goal),keeper=g.keepers?.[g.members[id]===1?0:1],x=center+(keeper?.x>=center?-1:1)*(F.goal/2-.8),dx=x-b.x,dz=goal-b.z,d=Math.max(.1,Math.hypot(dx,dz)),speed=kind==='taichi'?25:28;
 Object.assign(b,{vx:dx/d*speed,vz:dz/d*speed,vy:soccerTargetLift(b.y,2.25,d,speed),spin:kind==='taichi'?(b.spin||.6):0,secretCurve:true,fire:true,dribbler:'',lastTouch:id,releaseUntil:time+700,freeUntil:time+250});delete b.handOwner;delete b.bellyOwner;delete b.secretShot;g.flight=null;
}
export function launchSoccerSecretRelay(g,id,target,players,time){
 const b=g.ball,q=players[target];if(!q)return false;
 const travel=b.y>3?2.2:3.6,targetY=b.y>3?Math.min(10,b.y):1.45,factor=.18/(1-Math.exp(-.18*travel));
 Object.assign(b,{vx:(q.x-b.x)*factor,vz:(q.z-b.z)*factor,vy:(targetY-b.y)/travel+4.9*travel,spin:0,fire:false,dribbler:'',lastTouch:id,releaseUntil:time+500,freeUntil:time+200});delete b.handOwner;delete b.bellyOwner;delete b.secretShot;
 g.secretChain={count:Math.min(5,g.secretChain&&time-g.secretChain.at<8000&&g.secretChain.lastTouch!==id?g.secretChain.count+1:1),lastTouch:id,at:time};
 g.flight={from:id,target,at:time,arrivalAt:time+travel*1000,x:q.x,z:q.z};return true;
}
export function beginSoccerSecretPower(g,id,kind,players,F,time){
 const p=players[id],b=g.ball;g.secretPowers||={};g.secretPowers[id]={kind,at:time,until:time+900,cooldownUntil:time+(kind==='relay'?1000:5000),used:false};
 if(soccerUltimateKind(kind))return beginSoccerUltimate(g,id,kind,players,F,time,kind==='dragon'?soccerSecretRelayTarget(g,id,players,F):'');
 if(kind==='belly'){b.handOwner=b.bellyOwner=id;b.vx=b.vy=b.vz=0;if(g.skills?.[id])g.skills[id].cancelled=true;return;}
 if(kind==='taichi')return;
 const target=kind==='relay'?soccerSecretRelayTarget(g,id,players,F):'';
 if(kind==='relay'&&b.dribbler===id){g.kicks||={};g.kicks[id]={id:id+':relay:'+time,at:time,mode:'lob',power:1,yaw:p.yaw||0,target,relay:true,applied:false};return;}
 const next=predictSoccerBall(b,.55,2).at(-1),goal=g.members[id]===1?F.near:F.far,center=soccerGoalX(F,goal);
 g.finishes||={};g.finishes[id]={kind:'volley',sky:true,iron:kind==='iron',relayTarget:target,x:p.x,z:p.z,airX:next.x,airZ:next.z,airY:next.y,at:time,contactAt:time+550,until:time+1550,yaw:Math.atan2(center-p.x,goal-p.z),fromYaw:p.yaw||0,targetX:center+1.9,goal,applied:false};
}
export function stepSoccerSecretPowers(g,players,F,time){
 if(!soccerSecretActive(g))return false;
 let changed=false;const b=g.ball;
 for(const [id,power]of Object.entries(g.secretPowers||{})){
  const p=players[id];if(!p?.online||!soccerSecretMember(g,id)){delete g.secretPowers[id];if(b.handOwner===id){delete b.handOwner;delete b.bellyOwner;b.dribbler='';}continue;}
  if(soccerUltimateKind(power.kind)){changed=stepSoccerUltimate(g,id,power,players,F,time)||changed;continue;}
  if(power.used)continue;
  if(power.kind==='belly'&&time>=power.at+850){power.used=true;if(b.handOwner===id){launchSoccerSecretShot(g,id,p,F,time,'belly');changed=true;}}
  if(power.kind==='taichi'&&time<power.until&&!b.dribbler&&b.keeperOwner===undefined&&b.y<3.3&&Math.hypot(b.x-p.x,b.z-p.z)<2.5&&Math.hypot(b.vx,b.vz)>2){power.used=true;power.hitAt=time;launchSoccerSecretShot(g,id,p,F,time,'taichi');changed=true;}
 }
 return changed;
}
