// Shared host rules and visual timing for a held, interruptible standing tackle.
export const SOCCER_PRESS={hold:180,lease:850,heartbeat:240,windup:190,recovery:560,exhaustion:4200,rest:1100,reach:1.16,range:14};
const pressDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const pressPlayer=p=>p?.online===true&&(!p.bot||p.soccerBot===true)&&!p.observer&&!p.lobbyKart&&!p.lobbyCircuit&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&p.x>12.5&&p.x<36.5&&p.z> -5&&p.z<25.5;
const pressGrounded=p=>pressPlayer(p)&&Math.abs(p.lobbyY||0)<.2;
export function soccerPressTarget(g,id,roster,time){
 const target=g?.ball?.dribbler,p=roster[id],q=roster[target];
 if(g?.kickoff&&!g.kickoff.released&&time<g.kickoff.until)return '';
 if(!target||target===id||!pressGrounded(p)||!pressGrounded(q)||!['idle','playing'].includes(g.status)||time<Number(g.ball.resetUntil||0)||pressDistance(p,q)>SOCCER_PRESS.range)return '';
 if(g.status==='playing'&&(g.members?.[id]===undefined||g.members?.[target]===undefined||g.members[id]===g.members[target]))return '';
 return target;
}
export function soccerPressActive(g,id,time){
 const p=g?.presses?.[id];return p&&p.held&&time<p.until&&!p.outcome&&time>=p.at?p:null;
}
export function soccerPressThreat(g,id,time){
 return Object.entries(g?.presses||{}).filter(([who,p])=>p.target===id&&soccerPressActive(g,who,time)&&p.distance<2.3).sort((a,b)=>a[1].distance-b[1].distance||a[0].localeCompare(b[0]))[0]?.[1]||null;
}
export function applySoccerPress(g,input,roster,time){
 const {uid:id,held,serial,at}=input||{};
 if(!g||typeof id!=='string'||typeof held!=='boolean'||!Number.isSafeInteger(serial)||!Number.isFinite(at)||Math.abs(time-at)>3000||serial<=Number(g.pressInputs?.[id]?.serial??-1))return false;
 g.pressInputs||={};g.pressInputs[id]={serial,at:time};g.presses||={};
 const old=g.presses[id];
 if(!held){if(old){old.held=false;old.until=time;if(!old.outcome){old.phase='released';old.phaseAt=time;}}return true;}
 const target=soccerPressTarget(g,id,roster,time);
 if(!target)return true;
 if(soccerPressActive(g,id,time)&&old.target===target){old.until=time+SOCCER_PRESS.lease;return true;}
 if(time<Number(old?.recoverUntil||0))return true;
 // A completed challenge requires a fresh press, not a late heartbeat.
 if(old?.outcome&&old.held&&time<old.until)return true;
 const p=roster[id],q=roster[target],side=(p.x-q.x)*Math.cos(q.yaw||0)-(p.z-q.z)*Math.sin(q.yaw||0)>=0?1:-1;
 g.presses[id]={id:String(serial),target,held:true,at:time,until:time+SOCCER_PRESS.lease,phase:'chase',phaseAt:time,distance:pressDistance(p,q),side,yaw:Math.atan2(g.ball.x-p.x,g.ball.z-p.z),energy:1};
 return true;
}
export function stepSoccerPress(g,roster,time){
 let changed=false;const b=g.ball;
 for(const [id,p]of Object.entries(g.presses||{}).sort((a,b)=>a[1].at-b[1].at||a[0].localeCompare(b[0]))){
  if(!p.held||p.outcome)continue;
  if(time>=p.until||soccerPressTarget(g,id,roster,time)!==p.target){p.held=false;p.phase='released';p.phaseAt=time;changed=true;continue;}
  const player=roster[id],holder=roster[p.target];
  p.distance=pressDistance(player,holder);p.energy=Math.max(0,1-(time-p.at)/SOCCER_PRESS.exhaustion);changed=true;
  if(!p.energy){p.outcome='tired';p.phase='recover';p.phaseAt=time;p.recoverUntil=time+SOCCER_PRESS.rest;continue;}
  if(p.phase==='recover'){
   if(time<p.recoverUntil)continue;
   p.phase='chase';p.phaseAt=time;
  }
  if(p.phase!=='reach'){
   p.yaw=Math.atan2(b.x-player.x,b.z-player.z);
   if(p.distance<1.9&&pressDistance(player,b)<1.45&&time-p.at>=260){p.phase='reach';p.phaseAt=time;p.contactAt=time+SOCCER_PRESS.windup;p.result='';}
   else p.phase=p.distance<2.5?'jockey':'chase';
   continue;
  }
  if(time<p.contactAt)continue;
  const dx=b.x-player.x,dz=b.z-player.z,ballDistance=Math.hypot(dx,dz),facing=(dx*Math.sin(Number(player.yaw)||0)+dz*Math.cos(Number(player.yaw)||0))/Math.max(.001,ballDistance);
  const hx=b.x-holder.x,hz=b.z-holder.z,exposure=((player.x-holder.x)*hx+(player.z-holder.z)*hz)/Math.max(.001,p.distance*Math.hypot(hx,hz));
  const along=((holder.x-player.x)*dx+(holder.z-player.z)*dz)/Math.max(.001,ballDistance*ballDistance);
  const blocked=along>0&&along<.95&&Math.hypot(player.x+dx*along-holder.x,player.z+dz*along-holder.z)<.46;
  const skill=g.skills?.[p.target],skillAge=time-Number(skill?.at||0),evaded=skill&&!skill.cancelled&&skillAge>=40&&skillAge<680;
  const won=ballDistance<=SOCCER_PRESS.reach&&facing>.65&&exposure>-.2&&!blocked&&!evaded&&b.y<.55&&Math.abs(b.vy)<1.5&&time>=Number(b.contestUntil||0);
  p.phase='recover';p.phaseAt=time;p.recoverUntil=time+SOCCER_PRESS.recovery;p.contact={x:b.x,y:b.y,z:b.z,at:time};
  p.result=won?'won':evaded?'evaded':blocked||exposure<=-.2?'shielded':'miss';
  if(won){
   p.outcome='won';b.dribbler=id;b.lastTouch=id;b.contestUntil=time+480;b.contestOwner=id;b.vy=0;
   g.dribble={uid:id,at:time};if(skill&&!skill.released)skill.cancelled=true;
  }else if(evaded){p.outcome='beaten';p.recoverUntil=time+850;}
 }
 return changed;
}
