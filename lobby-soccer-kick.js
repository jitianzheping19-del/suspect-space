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
export function sampleSoccerShotPath(origin,yaw,power,spin=0,duration=.85,count=26){
 const speed=10+kickClamp(power,.12,1)*7;
 return predictSoccerBall({x:origin.x,y:origin.y??.3,z:origin.z,vx:Math.sin(yaw)*speed,vz:Math.cos(yaw)*speed,vy:1.5+kickClamp(power,.12,1)*3.5,spin},duration,count);
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
