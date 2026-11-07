import {launchSoccerSecretRelay} from './lobby-soccer-powers.js';
import {soccerSecretMember,soccerGoalX} from './lobby-soccer-secret.js';
import {predictSoccerBall} from './lobby-soccer-kick.js';
import {soccerPoseChannel,soccerTargetLift} from './lobby-soccer-kick.js';
export function soccerAirAction(g,id,players,F,time){
 const p=players[id],b=g?.ball,skill=g?.skills?.[id];
 if(!p?.online||p.observer||p.bot&&!p.soccerBot||p.lobbyKart||p.lobbyCircuit||Math.abs(p.lobbyY||0)>.3||!b||b.keeperOwner!==undefined||!['idle','playing'].includes(g.status)||g.status==='playing'&&g.members?.[id]===undefined||p.x<F.left||p.x>F.right||p.z<F.near||p.z>F.far||time<Number(b.resetUntil||0)||time<Number(g.knockdowns?.[id]?.until||0)||time<Number(g.slides?.[id]?.until||0)||time<Number(g.finishes?.[id]?.until||0)||!g.receives?.[id]?.ground&&time<Number(g.receives?.[id]?.until||0))return '';
 const age=time-Number(skill?.at||0),d=Math.hypot(b.x-p.x,b.z-p.z);
 if(skill?.kind==='heelLift'&&!skill.cancelled&&age>=80&&age<=1120&&(b.dribbler===id||skill.released&&b.lastTouch===id&&d<3.4&&b.y<3.7))return 'overhead';
 if(soccerSecretMember(g,id)&&!b.dribbler&&b.y>3.1&&b.y<22&&d<6){const next=predictSoccerBall(b,.55,2).at(-1);if(next.y>2&&Math.hypot(next.x-p.x,next.z-p.z)<6)return 'volley';}
 if(b.dribbler||d>2.8||b.y<.55||b.y>3.1||time<Number(b.freeUntil||0)&&b.lastTouch===id)return '';
 const front=(b.x-p.x)*Math.sin(p.yaw||0)+(b.z-p.z)*Math.cos(p.yaw||0);
 return front<-.15&&b.y>1.1?'overhead':front>=-.15&&b.y>=1.3?'header':front>=-.15&&b.y<1.3?'volley':'';
}
export function canSoccerOverhead(g,id,players,F,time){return soccerAirAction(g,id,players,F,time)==='overhead';}
export function beginSoccerOverhead(g,id,p,F,time){
 const skill=g.skills?.[id],team=g.members[id],goal=team===1?F.near:team===0?F.far:Math.cos(p.yaw||0)>=0?F.far:F.near,keeper=g.keepers?.[team===1?0:1],x=soccerGoalX(F,goal)+(keeper?.x>=soccerGoalX(F,goal)?-1:1)*(F.goal/2-F.radius-F.postRadius-.65);
 const heel=skill?.kind==='heelLift'&&!skill.cancelled,contactAt=heel?Math.max(time+360,skill.at+790):time+320;g.finishes||={};g.finishes[id]={kind:'overhead',heel,windupAt:heel?Math.max(time,skill.at+480):time,at:time,contactAt,until:contactAt+1250,yaw:Math.atan2(x-p.x,goal-p.z),fromYaw:skill?.yaw??p.yaw??0,x:p.x,z:p.z,targetX:x,goal,applied:false};
 if(g.dashes?.[id]){g.dashes[id].held=false;g.dashes[id].until=Math.min(g.dashes[id].until,time);}if(g.presses?.[id])g.presses[id].held=false;
}
export function stepSoccerFinishes(g,players,time,eligible,F){
 let changed=false;const b=g.ball;
 for(const [id,f]of Object.entries(g.finishes||{})){
  if(!eligible(id)||time>f.until){delete g.finishes[id];changed=true;continue;}
  if(f.applied||time<f.contactAt)continue;f.applied=true;changed=true;const p=players[id];
  if(b.keeperOwner!==undefined||b.dribbler&&b.dribbler!==id||f.heel&&b.lastTouch!==id||b.y<(f.kind==='volley'?.3:.6)||b.y>(f.sky?22:3.8)||(f.sky?Math.hypot(f.airX-b.x,f.airZ-b.z)>1.6||Math.abs(f.airY-b.y)>1.6||Math.hypot(p.x-f.x,p.z-f.z)>1.5:Math.hypot(p.x-b.x,p.z-b.z)>3.7))continue;
  if(f.relayTarget){if(g.members[f.relayTarget]===g.members[id]&&eligible(f.relayTarget)&&launchSoccerSecretRelay(g,id,f.relayTarget,players,time)){f.connected=true;f.contact={x:b.x,y:b.y,z:b.z};}continue;}
  const dx=f.targetX-b.x,dz=f.goal-b.z,d=Math.hypot(dx,dz),speed=21;
  const edge=F.goalHeight-F.postRadius-F.radius,variation=Math.sin(d*1.7+b.y*2.3)*.055;
  const targetY=f.sky?edge-.2:edge+(f.kind==='overhead'?.035:-.055)+variation;
  b.vx=dx/Math.max(.01,d)*speed;b.vz=dz/Math.max(.01,d)*speed;b.vy=soccerTargetLift(b.y,targetY,d,speed);b.dribbler='';b.lastTouch=id;b.spin=0;delete b.secretShot;b.releaseUntil=time+1000;b.freeUntil=time+350;g.flight=null;if(f.sky&&g.secretChain?.count>1&&time-g.secretChain.at<8000)b.fire=true;if(f.iron){g.secretImpact={id,at:f.until,x:f.airX,z:f.airZ};b.fire=true;}if(f.sky){const travel=Math.max(.12,-Math.log(Math.max(.08,1-.18*d/speed))/.18);b.vy=(targetY-b.y)/travel+4.9*travel+9.8/360;}f.connected=true;f.contact={x:b.x,y:b.y,z:b.z};
  if(g.skills?.[id])g.skills[id].cancelled=true;
 }
 return changed;
}
export function sampleSoccerOverhead(f,time){
 const begin=f.windupAt??f.at;if(time<begin||time>f.until)return null;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const curve=(frames,t)=>{let i=1;while(i<frames.length-1&&t>frames[i][0])i++;const a=frames[i-1],b=frames[i],u=smooth((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>soccerPoseChannel(frames,i,j+1,t));};
 const before=time<=f.contactAt,p=before?(time-begin)/(f.contactAt-begin):(time-f.contactAt)/(f.until-f.contactAt);
 const [height,pitch,left,right,spread,roll]=before?curve([[0,0,0,0,0,.2,0],[.25,-.16,-.18,.4,.3,.35,0],[.68,1.15,-.85,1.15,-.4,.9,0],[1,1.6,-1.5,.85,-1.85,.85,0]],p):curve([[0,1.6,-1.5,.85,-1.85,.85,0],[.22,.9,-1.95,-.5,.8,1,0],[.43,-.18,-1.57,.3,.6,.7,.12],[.62,-.2,-1.3,.5,.5,.5,.65],[.82,-.12,-.5,.7,.7,.3,.25],[1,0,0,0,0,.2,0]],p);
 const turn=smooth((time-begin)/Math.max(1,(f.contactAt-begin)*.75)),delta=Math.atan2(Math.sin(f.yaw+Math.PI-f.fromYaw),Math.cos(f.yaw+Math.PI-f.fromYaw));
 return {height,pitch,left,right,spread,roll,yaw:f.fromYaw+delta*turn,phase:p,before};
}

export function beginSoccerVolley(g,id,p,F,time){
 const team=g.members[id],goal=team===1?F.near:F.far,targetX=soccerGoalX(F,goal)+(g.keepers?.[1-team]?.x>=soccerGoalX(F,goal)?-1:1)*(F.goal/2-F.radius-F.postRadius-.75);
 g.finishes||={};g.finishes[id]={kind:'volley',at:time,contactAt:time+180,until:time+1150,yaw:Math.atan2(targetX-p.x,goal-p.z),fromYaw:p.yaw||0,targetX,goal,applied:false};
 if(soccerSecretMember(g,id)&&g.ball.y>3.1){const next=predictSoccerBall(g.ball,.55,2).at(-1);Object.assign(g.finishes[id],{sky:true,x:p.x,z:p.z,airX:next.x,airZ:next.z,airY:next.y,contactAt:time+550,until:time+1550});}
 if(g.presses?.[id])g.presses[id].held=false;if(g.dashes?.[id])g.dashes[id].until=Math.min(g.dashes[id].until,time);
}
export function sampleSoccerVolley(f,time){
 const elapsed=time-f.at,age=f.sky?(time<=f.contactAt?elapsed/550*180:180+(time-f.contactAt)/1000*970):elapsed;if(age<0||time>f.until)return null;
 const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 // Coil over the left foot, sweep the right leg through contact, then land.
 const sample=(frames)=>{
  let i=1;while(i<frames.length-1&&age>frames[i][0])i++;
  const a=frames[i-1],b=frames[i],u=ease((age-a[0])/(b[0]-a[0]));return a[1]+(b[1]-a[1])*u;
 };
 return {
  height:f.sky?Math.max(0,f.airY-(f.iron?1.5:.65))*(time<=f.contactAt?ease(elapsed/550):1-ease((time-f.contactAt)/1000)):sample([[0,0],[65,-.1],[180,.62],[340,.7],[620,-.12],[900,0],[1150,0]]),
  pitch:sample([[0,0],[100,-.22],[180,-.12],[400,.3],[700,.18],[1150,0]]),
  turn:sample([[0,0],[100,-.72],[180,0],[410,1.05],[700,.4],[1150,0]]),
  kick:sample([[0,0],[90,.65],[180,-1.65],[360,-.85],[630,.4],[1150,0]]),
  sweep:sample([[0,0],[100,.85],[180,.12],[380,-1.1],[700,-.3],[1150,0]]),
  rightX:sample([[0,0],[100,.22],[180,.25],[400,-.3],[700,0],[1150,0]]),
  rightZ:sample([[0,0],[100,-.3],[180,.35],[400,.35],[700,0],[1150,0]]),
  plant:sample([[0,0],[80,.12],[250,.75],[440,.45],[620,-.12],[1150,0]]),
  arms:sample([[0,0],[100,.95],[300,1.1],[650,.45],[1150,0]]),
  weight:Math.sin(Math.min(1,age/1150)*Math.PI)
 };
}
