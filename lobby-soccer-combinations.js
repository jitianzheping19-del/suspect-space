import {soccerSecretActive,soccerGoalX} from './lobby-soccer-secret.js';
import {predictSoccerBall,soccerTargetLift} from './lobby-soccer-kick.js';
function soccerComboEligible(g,id,players,F,time,eligible,forming=false){
 const p=players[id];
 return eligible(id)&&p?.online&&!p.observer&&!p.lobbyKart&&!p.lobbyCircuit&&Math.abs(p.lobbyY||0)<.3&&p.x>=F.left&&p.x<=F.right&&p.z>=F.near&&p.z<=F.far&&time>=Number(g.slides?.[id]?.until||0)&&time>=Number(g.knockdowns?.[id]?.until||0)&&(!forming||time>=Number(g.finishes?.[id]?.until||0)&&time>=Number(g.secretPowers?.[id]?.until||0)&&time>=Number(g.combinationCooldowns?.[id]||0));
}
export function stepSoccerCombinations(g,players,F,time,eligible){
 if(!soccerSecretActive(g))return false;
 const b=g.ball,c=g.secretCombo;
 if(c&&!c.used&&!c.cancelled){
  const valid=c.ids.every(id=>soccerComboEligible(g,id,players,F,time,eligible)&&g.members[id]===c.team&&Math.hypot(players[id].x-c.starts[id].x,players[id].z-c.starts[id].z)<1.1);
  if(!valid||b.dribbler||b.keeperOwner!==undefined||(b.lastTouch||'')!==c.lastTouch||time<Number(b.resetUntil||0)||time>c.contactAt+160){
   c.cancelled=true;for(const id of c.ids)if(g.finishes?.[id]?.combo){g.finishes[id].cancelled=true;g.finishes[id].until=time;}return true;
  }
  if(time<c.contactAt)return false;
  c.used=true;
  if(Math.hypot(b.x-c.point.x,b.z-c.point.z)>1.1||Math.abs(b.y-c.point.y)>1.15){c.cancelled=true;for(const id of c.ids)g.finishes[id].until=time;return true;}
  const goal=c.team===1?F.near:F.far,center=soccerGoalX(F,goal),keeper=g.keepers?.[1-c.team],x=center+(keeper?.x>=center?-1:1)*(F.goal/2-.9),dx=x-b.x,dz=goal-b.z,d=Math.max(.1,Math.hypot(dx,dz)),speed=c.kind==='twinOverhead'?30:27;
  Object.assign(b,{vx:dx/d*speed,vz:dz/d*speed,vy:soccerTargetLift(b.y,1.9,d,speed),spin:0,fire:true,lastTouch:c.ids[0],dribbler:'',releaseUntil:time+850,freeUntil:time+250,secretShot:{kind:c.kind,from:c.ids[0],at:time,until:time+4000}});g.flight=null;c.hitAt=time;c.contact={x:b.x,y:b.y,z:b.z};
  for(const id of c.ids){g.finishes[id].connected=true;g.finishes[id].contact={...c.contact};}
  return true;
 }
 if(c&&time<c.until||b.dribbler||b.keeperOwner!==undefined||time<Number(b.resetUntil||0)||time<Number(b.freeUntil||0)||b.y<.8||b.y>18||g.kickoff&&!g.kickoff.released&&time<g.kickoff.until)return false;
 const point=predictSoccerBall(b,.4,2).at(-1);
 if(point.y<.65||point.y>18||point.x<F.left+.3||point.x>F.right-.3||point.z<F.near+.3||point.z>F.far-.3)return false;
 const ids=Object.keys(g.members).filter(id=>soccerComboEligible(g,id,players,F,time,eligible,true)&&Math.hypot(players[id].x-point.x,players[id].z-point.z)<1.8).sort();
 const pairs=[];
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
  const a=players[ids[i]],d=players[ids[j]];if(g.members[ids[i]]!==g.members[ids[j]]||Math.hypot(a.x-d.x,a.z-d.z)>2.5)continue;
  pairs.push({ids:[ids[i],ids[j]],distance:Math.hypot(a.x-point.x,a.z-point.z)+Math.hypot(d.x-point.x,d.z-point.z)});
 }
 pairs.sort((a,b)=>a.distance-b.distance||a.ids.join(':').localeCompare(b.ids.join(':')));if(!pairs.length)return false;
 const pair=pairs[0].ids,team=g.members[pair[0]],goal=team===1?F.near:F.far,yaw=Math.atan2(soccerGoalX(F,goal)-point.x,goal-point.z),back=pair.every(id=>{const p=players[id];return (point.x-p.x)*Math.sin(p.yaw||0)+(point.z-p.z)*Math.cos(p.yaw||0)<-.15;}),kind=point.y>=1.6||back?'twinOverhead':'twin';
 const combo={ids:pair,team,kind,at:time,contactAt:time+400,until:time+1350,point:{x:point.x,y:point.y,z:point.z},lastTouch:b.lastTouch||'',starts:{},used:false};
 g.secretCombo=combo;g.finishes||={};g.combinationCooldowns||={};
 pair.forEach((id,i)=>{
  const p=players[id],side=i?1:-1;combo.starts[id]={x:p.x,z:p.z};g.combinationCooldowns[id]=time+6500;
  g.finishes[id]={combo:true,kind:'volley',at:time,contactAt:combo.contactAt,until:combo.until,applied:true,x:p.x,z:p.z,airX:point.x+Math.cos(yaw)*side*.6,airZ:point.z-Math.sin(yaw)*side*.6,airY:point.y,yaw,side,fromYaw:p.yaw||0};
  if(g.kicks?.[id])g.kicks[id].applied=true;if(g.skills?.[id])g.skills[id].cancelled=true;if(g.queuedKicks)delete g.queuedKicks[id];if(g.dashes?.[id])g.dashes[id].until=time;
 });
 return true;
}
export function sampleSoccerComboPose(f,combo,time){
 if(!combo||!f?.combo||f.cancelled||combo?.cancelled||time<f.at||time>f.until)return null;
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},before=time<=f.contactAt,u=before?(time-f.at)/(f.contactAt-f.at):1-(time-f.contactAt)/(f.until-f.contactAt),weight=ease(u),overhead=combo.kind==='twinOverhead';
 return {weight,height:Math.max(.18,f.airY-(overhead?.8:.65))*weight,pitch:overhead?-1.55*weight:-.12*weight,yaw:f.yaw+(overhead?Math.PI:0),left:f.side<0?-1.65*weight:.5*weight,right:f.side>0?-1.65*weight:.5*weight};
}
