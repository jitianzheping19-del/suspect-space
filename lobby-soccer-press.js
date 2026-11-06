import {soccerPitch} from './lobby-soccer-match.js';
// Shared host rules and visual timing for a held, interruptible standing tackle.
export const SOCCER_PRESS={hold:180,lease:850,heartbeat:240,reaction:140,windup:190,recovery:560,exhaustion:4200,rest:1100,reach:1.16,range:35};
const pressDistance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const pressPlayer=p=>p?.online===true&&(!p.bot||p.soccerBot===true)&&!p.observer&&!p.lobbyKart&&!p.lobbyCircuit&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const pressGrounded=p=>pressPlayer(p)&&Math.abs(p.lobbyY||0)<.2;
export function soccerPressTarget(g,id,roster,time){
 const target=g?.ball?.dribbler,p=roster[id],q=roster[target],F=soccerPitch(g?.pitchCount||0);
 if(time<Number(g?.nutmegs?.[id]?.until||0))return '';
 if(time<Number(g?.knockdowns?.[id]?.until||0)||[p,q].some(v=>v&&(v.x<F.minX||v.x>F.maxX||v.z<F.minZ||v.z>F.maxZ)))return '';
 if(g?.slides?.[id]&&time<g.slides[id].until)return '';
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
export function updateSoccerPressRead(p,player,holder,ball,time){
 if(p.readAt!==undefined&&time-p.readAt<SOCCER_PRESS.reaction)return;
 const elapsed=p.readAt===undefined?0:(time-p.readAt)/1000,dx=holder.x-(p.readX??holder.x),dz=holder.z-(p.readZ??holder.z),distance=Math.hypot(dx,dz);
 const lead=elapsed>0&&distance<1.5?Math.min(.12,elapsed)*Math.min(1,5*elapsed/Math.max(.001,distance))/elapsed:0;
 const fx=Math.sin(holder.yaw||0),fz=Math.cos(holder.yaw||0),front=(player.x-holder.x)*fx+(player.z-holder.z)*fz;
 p.readAt=time;p.readX=holder.x;p.readZ=holder.z;p.flanking=front<.1;
 p.aimX=p.flanking?holder.x+fx*.5+fz*p.side*1.15:ball.x+dx*lead;
 p.aimZ=p.flanking?holder.z+fz*.5-fx*p.side*1.15:ball.z+dz*lead;
 if(p.mode==='matchup'){
  const x=player.x-holder.x,z=player.z-holder.z,d=Math.hypot(x,z);
  p.aimX=holder.x+(d>.01?x/d:fx)*2.3;p.aimZ=holder.z+(d>.01?z/d:fz)*2.3;p.flanking=false;
 }
}
export function applySoccerPress(g,input,roster,time){
 const {uid:id,held,serial,at,mode='press'}=input||{};
 if(!g||!['press','matchup'].includes(mode)||typeof id!=='string'||typeof held!=='boolean'||!Number.isSafeInteger(serial)||!Number.isFinite(at)||Math.abs(time-at)>3000||serial<=Number(g.pressInputs?.[id]?.serial??-1))return false;
 g.pressInputs||={};g.pressInputs[id]={serial,at:time};g.presses||={};
 const old=g.presses[id];
 if(!held){if(old){old.held=false;old.until=time;if(!old.outcome){old.phase='released';old.phaseAt=time;}}return true;}
 const target=soccerPressTarget(g,id,roster,time);
 if(!target)return true;
 if(soccerPressActive(g,id,time)&&old.target===target){old.until=time+SOCCER_PRESS.lease;if((old.mode||'press')!==mode){old.mode=mode;if(!(old.phase==='recover'&&time<old.recoverUntil)){old.phase='chase';old.phaseAt=time;}delete old.readAt;updateSoccerPressRead(old,roster[id],roster[target],g.ball,time);}return true;}
 if(time<Number(old?.recoverUntil||0))return true;
 // A completed challenge requires a fresh press, not a late heartbeat.
 if(old?.outcome&&old.held&&time<old.until)return true;
 const p=roster[id],q=roster[target],side=(p.x-q.x)*Math.cos(q.yaw||0)-(p.z-q.z)*Math.sin(q.yaw||0)>=0?1:-1;
 g.pressAttempts||={};const attempt=g.pressAttempts[id]=(g.pressAttempts[id]||0)+1;
 g.presses[id]={variant:(attempt-1)%4,id:String(serial),target,held:true,mode,at:time,until:time+SOCCER_PRESS.lease,phase:'chase',phaseAt:time,distance:pressDistance(p,q),side,yaw:Math.atan2(g.ball.x-p.x,g.ball.z-p.z),energy:1};
 updateSoccerPressRead(g.presses[id],p,q,g.ball,time);
 return true;
}
export function stepSoccerPress(g,roster,time){
 let changed=false;const b=g.ball;
 for(const [id,p]of Object.entries(g.presses||{}).sort((a,b)=>a[1].at-b[1].at||a[0].localeCompare(b[0]))){
  if(!p.held||p.outcome)continue;
  if(time>=p.until||soccerPressTarget(g,id,roster,time)!==p.target){p.held=false;p.phase='released';p.phaseAt=time;changed=true;continue;}
  const player=roster[id],holder=roster[p.target];
  if(p.phase!=='reach')updateSoccerPressRead(p,player,holder,b,time);
  p.distance=pressDistance(player,holder);
  p.effort=(p.effort||0)+Math.max(0,time-(p.energyAt??p.at))*(p.mode==='matchup'?.5:1);p.energyAt=time;
  p.energy=Math.max(0,1-p.effort/SOCCER_PRESS.exhaustion);changed=true;
  if(!p.energy){p.outcome='tired';p.phase='recover';p.phaseAt=time;p.recoverUntil=time+SOCCER_PRESS.rest;continue;}
  if(p.phase==='recover'){
   if(time<p.recoverUntil)continue;
   p.phase='chase';p.phaseAt=time;
  }
  if(p.mode==='matchup'){p.phase='contain';p.yaw=Math.atan2(b.x-player.x,b.z-player.z);continue;}
  if(p.phase!=='reach'){
   p.yaw=Math.atan2(b.x-player.x,b.z-player.z);
   if(p.distance<1.9&&pressDistance(player,b)<1.45&&time-p.at>=260){p.phase='reach';p.phaseAt=time;p.contactAt=time+SOCCER_PRESS.windup;p.result='';p.variant=((p.variant||0)+Number(p.challengeCount||0))%4;p.challengeCount=(p.challengeCount||0)+1;}
   else p.phase=p.distance<2.5?'jockey':'chase';
   continue;
  }
  if(time<p.contactAt)continue;
  const dx=b.x-player.x,dz=b.z-player.z,ballDistance=Math.hypot(dx,dz),facing=(dx*Math.sin(Number(player.yaw)||0)+dz*Math.cos(Number(player.yaw)||0))/Math.max(.001,ballDistance);
  const hx=b.x-holder.x,hz=b.z-holder.z,exposure=((player.x-holder.x)*hx+(player.z-holder.z)*hz)/Math.max(.001,p.distance*Math.hypot(hx,hz));
  const along=((holder.x-player.x)*dx+(holder.z-player.z)*dz)/Math.max(.001,ballDistance*ballDistance);
  const blocked=along>0&&along<.95&&Math.hypot(player.x+dx*along-holder.x,player.z+dz*along-holder.z)<.46;
  const skill=g.skills?.[p.target],skillAge=time-Number(skill?.at||0);
  // Only the change of direction beats a committed tackle; setup and recovery remain exposed.
  const window={nutmeg:[70,320],doubleTouch:[90,410],roulette:[180,650],heelLift:[180,440],shotFeint:[140,390]}[skill?.kind];
  const evaded=skill&&!skill.cancelled&&window&&skillAge>=window[0]&&skillAge<window[1];
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
