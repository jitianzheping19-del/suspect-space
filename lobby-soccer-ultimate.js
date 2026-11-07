import {soccerSecretActive,soccerGoalX} from './lobby-soccer-secret.js';
import {soccerTargetLift} from './lobby-soccer-kick.js';
const SOCCER_ULTIMATES={thunder:[450,1100,5500],meteor:[850,1450,6500],cyclone:[350,1200,5500],ice:[300,2400,6500],dragon:[500,1200,4000],drive:[550,1200,5000]};
export function soccerUltimateKind(kind){return Object.hasOwn(SOCCER_ULTIMATES,kind);}
export function canSoccerUltimate(g,id,kind,players,target){
 const b=g.ball,p=players[id];
 if(kind==='ice')return b.dribbler!==id;
 if(kind==='cyclone')return b.dribbler!==id&&(!b.dribbler||g.members[b.dribbler]!==g.members[id])&&b.y<1.5&&Math.hypot(b.x-p.x,b.z-p.z)<2.8;
 return ['thunder','meteor','dragon','drive'].includes(kind)&&b.dribbler===id&&(kind!=='dragon'||!!target);
}
export function beginSoccerUltimate(g,id,kind,players,F,time,target){
 const p=players[id],[windup,duration,cooldown]=SOCCER_ULTIMATES[kind],yaw=Number(p.yaw)||0;
 g.secretPowers[id]={kind,at:time,releaseAt:time+windup,until:time+duration,cooldownUntil:time+cooldown,used:false,target:target||'',yaw,x:p.x,z:p.z};
 if(kind==='ice'){g.secretPowers[id].x=Math.max(F.left+2,Math.min(F.right-2,p.x+Math.sin(yaw)*1.6));g.secretPowers[id].z=Math.max(F.near+.6,Math.min(F.far-.6,p.z+Math.cos(yaw)*1.6));}
 if(g.skills?.[id])g.skills[id].cancelled=true;
 if(g.kicks?.[id]&&!g.kicks[id].applied){g.kicks[id].applied=true;g.kicks[id].cancelled=true;}
 if(g.queuedKicks)delete g.queuedKicks[id];
}
export function stepSoccerUltimate(g,id,power,players,F,time){
 const p=players[id],b=g.ball;
 if(power.used||time<power.releaseAt)return false;
 if(power.kind==='ice'){power.used=true;return true;}
 const valid=p?.online&&!p.observer&&!p.lobbyKart&&!p.lobbyCircuit&&Math.abs(p.lobbyY||0)<.3&&p.x>=F.left&&p.x<=F.right&&p.z>=F.near&&p.z<=F.far;
 if(!valid||time>power.until||b.keeperOwner!==undefined||time<Number(b.resetUntil||0)){power.used=true;power.cancelled=true;return true;}
 power.used=true;
 if(power.kind==='cyclone'){
  if(!canSoccerUltimate(g,id,'cyclone',players)){power.cancelled=true;return true;}
  const old=b.dribbler;if(old&&g.kicks?.[old])g.kicks[old].applied=true;if(old&&g.skills?.[old])g.skills[old].cancelled=true;
  Object.assign(b,{x:p.x+Math.sin(power.yaw)*.7,y:.3,z:p.z+Math.cos(power.yaw)*.7,dribbler:id,lastTouch:id,vx:0,vy:0,vz:0,spin:0,fire:false,releaseUntil:0,freeUntil:0});
  delete b.handOwner;delete b.bellyOwner;delete b.secretShot;g.flight=null;g.dribble={uid:id,at:time};power.hitAt=time;return true;
 }
 if(b.dribbler!==id||Math.hypot(b.x-p.x,b.z-p.z)>2.2){power.cancelled=true;return true;}
 const goal=g.members[id]===1?F.near:F.far,center=soccerGoalX(F,goal),keeper=g.keepers?.[g.members[id]===1?0:1],x=center+(keeper?.x>=center?-1:1)*(F.goal/2-.85);
 let dx=x-b.x,dz=goal-b.z,d=Math.max(.1,Math.hypot(dx,dz)),speed=32;
 if(power.kind==='dragon'){
  const q=players[power.target];
  if(!q?.online||q.observer||q.lobbyKart||q.lobbyCircuit||g.members[power.target]!==g.members[id]||q.x<F.left||q.x>F.right||q.z<F.near||q.z>F.far){power.cancelled=true;return true;}
  dx=q.x-b.x;dz=q.z-b.z;const travel=Math.max(1.25,Math.hypot(dx,dz)/25),factor=.18/(1-Math.exp(-.18*travel));
  Object.assign(b,{vx:dx*factor,vz:dz*factor,vy:(1.1-b.y)/travel+4.9*travel});
  g.flight={from:id,target:power.target,at:time,arrivalAt:time+travel*1000,x:q.x,z:q.z};
  g.secretChain={count:Math.min(5,g.secretChain&&time-g.secretChain.at<8000&&g.secretChain.lastTouch!==id?g.secretChain.count+1:1),lastTouch:id,at:time};
 }else if(power.kind==='drive'){
  speed=20;const travel=-Math.log(Math.max(.1,1-.18*d/speed))/.18,delay=travel*.28,pull=14;
  Object.assign(b,{vx:dx/d*speed,vz:dz/d*speed,vy:(1.6-b.y)/travel+4.9*travel+.5*pull*(travel-delay)**2/travel,driveAge:0,driveDelay:delay,drivePull:pull});g.flight=null;
 }else if(power.kind==='meteor'){
  const travel=Math.max(2.1,d/15),factor=.18/(1-Math.exp(-.18*travel));
  Object.assign(b,{vx:dx*factor,vz:dz*factor,vy:(1.7-b.y)/travel+4.9*travel});g.flight=null;
 }else{Object.assign(b,{vx:dx/d*speed,vz:dz/d*speed,vy:soccerTargetLift(b.y,1.2,d,speed)});g.flight=null;}
 Object.assign(b,{dribbler:'',lastTouch:id,spin:0,fire:power.kind==='meteor',releaseUntil:time+700,freeUntil:time+220,secretShot:{kind:power.kind,from:id,at:time,until:time+5000}});
 delete b.handOwner;delete b.bellyOwner;power.hitAt=time;power.yaw=Math.atan2(dx,dz);return true;
}
export function soccerIceWallPieces(){
 return [-2,-1,0,1,2].map(i=>({x:i*.7,halfX:.56,halfY:1.45-Math.abs(i)*.18,halfZ:.32}));
}
export function collideSoccerIceWalls(g,F,time,old){
 const b=g.ball;if(!soccerSecretActive(g)||b.dribbler||b.keeperOwner!==undefined||time<Number(b.resetUntil||0))return false;
 let hit=null;
 for(const [id,p]of Object.entries(g.secretPowers||{})){
  if(p.kind!=='ice'||p.cancelled||p.hitAt||time<p.releaseAt||time>=p.until||g.members[id]===undefined||g.members[b.lastTouch]===g.members[id])continue;
  const c=Math.cos(p.yaw),s=Math.sin(p.yaw),local=q=>({x:(q.x-p.x)*c-(q.z-p.z)*s,y:q.y,z:(q.x-p.x)*s+(q.z-p.z)*c}),a=local(old),end=local(b);
  for(const part of soccerIceWallPieces()){
   if(Math.min(a.x,end.x)>part.x+part.halfX+F.radius||Math.max(a.x,end.x)<part.x-part.halfX-F.radius||Math.min(a.y,end.y)>part.halfY*2+F.radius||Math.max(a.y,end.y)<-F.radius||Math.min(a.z,end.z)>part.halfZ+F.radius||Math.max(a.z,end.z)<-part.halfZ-F.radius)continue;
   let enter=0,exit=1,normal=null;
   // Inflate the actual crystal's eight planes by the ball radius and sweep
   // against that convex shape, including fast shots and sloped crystal tips.
   for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
    const nx=sx/part.halfX,ny=sy/part.halfY,nz=sz/part.halfZ,norm=Math.hypot(nx,ny,nz),limit=1+F.radius*norm;
    const from=(a.x-part.x)*nx+(a.y-part.halfY)*ny+a.z*nz-limit,to=(end.x-part.x)*nx+(end.y-part.halfY)*ny+end.z*nz-limit;
    if(from>0&&to>0){exit=-1;continue;}
    if(from>0&&to<=0){const t=from/(from-to);if(t>=enter){enter=t;normal={x:(nx*c+nz*s)/norm,y:ny/norm,z:(-nx*s+nz*c)/norm};}}
    else if(from<=0&&to>0)exit=Math.min(exit,from/(from-to));
   }
   if(normal&&enter<=exit&&enter>=0&&enter<=1&&(!hit||enter<hit.t))hit={p,id,t:enter,n:normal};
  }
 }
 if(!hit)return false;
 const {p,id,t,n}=hit,x=old.x+(b.x-old.x)*t,y=old.y+(b.y-old.y)*t,z=old.z+(b.z-old.z)*t,incoming=b.vx*n.x+b.vy*n.y+b.vz*n.z;
 b.x=x+n.x*.01;b.y=Math.max(F.radius,y+n.y*.01);b.z=z+n.z*.01;
 if(incoming<0){b.vx-=1.72*incoming*n.x;b.vy-=1.72*incoming*n.y;b.vz-=1.72*incoming*n.z;}
 b.spin=0;b.fire=false;b.lastTouch=id;b.releaseUntil=time+300;delete b.secretShot;g.flight=null;
 p.hitAt=time;p.hit={x,y,z};p.until=Math.min(p.until,time+650);return true;
}
export function markSoccerMeteorImpact(g,old,time){
 const b=g.ball,shot=b.secretShot;
 if(soccerSecretActive(g)&&shot?.kind==='meteor'&&!shot.impacted&&old.y>.302&&b.y<=.302){
  shot.impacted=true;b.fire=false;g.secretImpact={kind:'meteor',at:time,x:b.x,z:b.z};return true;
 }
 return false;
}
