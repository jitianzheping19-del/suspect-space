// Original shared contact clock: animation, host impulse and replay use one event.
const kickClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const kickEase=t=>{t=kickClamp(t,0,1);return t*t*(3-2*t);};
export function soccerKickContact(k){return k.at+(k.mode==='lob'?260:120);}
export function soccerKickFoot(p,b,yaw){
 const lateral=(b.x-p.x)*Math.cos(yaw)-(b.z-p.z)*Math.sin(yaw);
 return lateral<-.08?0:1;
}
export function sampleSoccerKick(k,time){
 if(!k||k.cancelled)return null;
 const age=time-k.at,contact=soccerKickContact(k)-k.at,duration=k.mode==='lob'?750:620;
 if(age<0||age>duration)return null;
 const power=kickClamp(k.power??.55,.12,1),side=k.foot===0?-1:1,pass=k.mode==='pass'||k.mode==='through';
 const wind=kickEase(age/(contact*.65)),strike=kickEase((age-contact*.65)/(contact*.35));
 const settle=1-kickEase((age-contact)/(duration-contact)),weight=kickEase(age/(contact*.5))*settle;
 const backswing=(pass?.48:.65+power*.28),follow=pass?.70:1.1+power*.42;
 const swing=age<contact?backswing*wind*(1-strike)-follow*strike:-follow*settle;
 const impact=kickEase((age-contact*.65)/(contact*.35))*(1-kickEase((age-contact)/110));
 return {foot:k.foot===0?0:1,side,swing,weight,impact,plant:weight,lean:(k.mode==='lob'?-.18:pass?.07:.12+power*.08)*weight,
  twist:side*((1-strike)*-.18+strike*.25)*weight,bank:side*.07*weight,arm:weight*(pass?.3:.6),lift:impact*(k.mode==='lob'?.18:.045),duration};
}
// Turning velocity preserves speed: spin bends the path without adding energy.
export function stepSoccerSpin(ball,dt){
 if(!ball.spin||ball.dribbler||ball.keeperOwner!==undefined)return;
 const spin=kickClamp(ball.spin,-1,1),angle=spin*.78*Math.max(0,Math.min(.1,dt))*(ball.y>.31?1:.45),c=Math.cos(angle),s=Math.sin(angle),x=ball.vx;
 ball.vx=x*c+ball.vz*s;ball.vz=ball.vz*c-x*s;ball.spin=spin*Math.exp(-dt*(ball.y>.31?.55:2.4));
 if(Math.abs(ball.spin)<.005)ball.spin=0;
}
export function advanceSoccerBall(ball,dt){
 stepSoccerSpin(ball,dt);ball.vy-=9.8*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;ball.z+=ball.vz*dt;
 if(ball.y<.3){ball.y=.3;ball.vy=Math.abs(ball.vy)>.8?-ball.vy*.48:0;}
 const drag=Math.exp(-(ball.y<=.301?.45:.18)*dt);ball.vx*=drag;ball.vz*=drag;
}
export function predictSoccerBall(origin,duration=.85,count=26){
 const b={...origin},points=[{x:b.x,y:b.y,z:b.z,time:0}],step=duration/(count-1),substeps=Math.ceil(step*180),h=step/substeps;
 for(let i=1;i<count;i++){
  for(let j=0;j<substeps;j++){
   advanceSoccerBall(b,h);
  }
  points.push({x:b.x,y:b.y,z:b.z,time:i*step});
 }
 return points;
}
// Match the airborne drag and gravity used by the host's small physics steps.
export function soccerTargetLift(originY,targetY,distance,speed){
 const travel=Math.max(.12,-Math.log(Math.max(.08,1-.18*distance/speed))/.18);
 return kickClamp((targetY-originY)/travel+4.9*travel+9.8/360,-12,16);
}
export function soccerShotVelocity(origin,yaw,power,F){
 const charge=kickClamp(power??.55,.12,1),speed=10+charge*7,sx=Math.sin(yaw),sz=Math.cos(yaw);
 let vy=1.5+charge*3.5;
 if(F&&Math.abs(sz)>.001){
  const line=sz>0?F.far:F.near,distance=(line-origin.z)/sz,x=origin.x+sx*distance;
  if(distance>.5&&distance<55&&Math.abs(x-23)<F.goal/2+1.6){
   const ceiling=F.goalHeight-F.postRadius-F.radius-.1,targetY=.45+(ceiling-.45)*charge**1.3;
   const loft=kickEase((charge-.18)/.82);
   vy+=(soccerTargetLift(origin.y??.3,targetY,distance,speed)-vy)*loft;
  }
 }
 return {vx:sx*speed,vy,vz:sz*speed};
}
export function sampleSoccerShotPath(origin,yaw,power,spin=0,duration=.85,count=26,F){
 return predictSoccerBall({...origin,y:origin.y??.3,...soccerShotVelocity(origin,yaw,power,F),spin,dribbler:'',keeperOwner:undefined},duration,count);
}
export function soccerBallCrossing(ball,z,duration=.7){
 const points=predictSoccerBall(ball,duration,29);
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],dz=b.z-a.z;if(Math.abs(dz)<1e-8)continue;
  const u=(z-a.z)/dz;if(u<0||u>1)continue;
  return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,eta:a.time+(b.time-a.time)*u};
 }
 return null;
}

export function soccerPassPoint(q,F,power=.55,through=false){
 const lead=through?2.4+Math.max(.12,Math.min(1,power))*2:q.walking?.45:0;
 return {x:Math.max(F.left+.6,Math.min(F.right-.6,q.x+Math.sin(Number(q.yaw)||0)*lead)),z:Math.max(F.near+.6,Math.min(F.far-.6,q.z+Math.cos(Number(q.yaw)||0)*lead))};
}

export function smoothSoccerBall(view,ball,age,dt,reset=false){
 const target={...ball},horizon=Math.max(0,Math.min(.14,age));
 if(!ball.dribbler&&ball.keeperOwner===undefined&&!ball.resetUntil){for(let t=0;t<horizon;t+=1/180)advanceSoccerBall(target,Math.min(1/180,horizon-t));}
 else if(!ball.dribbler&&ball.keeperOwner===undefined){for(let t=0;t<horizon;t+=1/180)advanceSoccerBall(target,Math.min(1/180,horizon-t));}
 const distance=Math.hypot(target.x-view.x,target.y-view.y,target.z-view.z);
 if(reset||!Number.isFinite(distance)||distance>4){Object.assign(view,{x:target.x,y:target.y,z:target.z,vx:0,vy:0,vz:0});return view;}
 const omega=ball.dribbler?38:30,step=Math.max(0,Math.min(.05,dt)),decay=Math.exp(-omega*step);
 for(const axis of ['x','y','z']){const v='v'+axis,error=view[axis]-target[axis],j=(view[v]||0)+omega*error;view[axis]=target[axis]+(error+j*step)*decay;view[v]=((view[v]||0)-omega*j*step)*decay;}
 if(view.y<.3){view.y=.3;view.vy=Math.max(0,view.vy);}return view;
}
// Monotone cubic interpolation preserves momentum without overshooting poses.
export function soccerPoseChannel(frames,index,channel,time){
 const a=frames[index-1],b=frames[index],duration=b[0]-a[0],u=Math.max(0,Math.min(1,(time-a[0])/duration)),slope=(b[channel]-a[channel])/duration;
 const tangent=(before,point,after)=>{if(!before||!after)return 0;const x=(point[channel]-before[channel])/(point[0]-before[0]),y=(after[channel]-point[channel])/(after[0]-point[0]);return x*y<=0?0:2*x*y/(x+y);};
 const m0=tangent(frames[index-2],a,b),m1=tangent(a,b,frames[index+1]);
 return (2*u*u*u-3*u*u+1)*a[channel]+(u*u*u-2*u*u+u)*duration*m0+(-2*u*u*u+3*u*u)*b[channel]+(u*u*u-u*u)*duration*m1;
}
