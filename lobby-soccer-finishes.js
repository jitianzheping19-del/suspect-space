export function canSoccerOverhead(g,id,players,F,time){
 const p=players[id],b=g?.ball,k=g?.skills?.[id],age=time-Number(k?.at||0);
 return !!(p?.online&&!p.observer&&!p.lobbyKart&&!p.lobbyCircuit&&Math.abs(p.lobbyY||0)<.3&&p.x>=F.left&&p.x<=F.right&&p.z>=F.near&&p.z<=F.far&&['idle','playing'].includes(g?.status)&&(g.status==='idle'||g.members?.[id]!==undefined)&&k?.kind==='heelLift'&&!k.cancelled&&age>=80&&age<=1120&&b.keeperOwner===undefined&&time>=Number(b.resetUntil||0)&&!(g.finishes?.[id]&&time<g.finishes[id].until)&&(b.dribbler===id||k.released&&b.lastTouch===id&&Math.hypot(p.x-b.x,p.z-b.z)<3.4&&b.y<3.7));
}
export function beginSoccerOverhead(g,id,p,F,time){
 const skill=g.skills[id],team=g.members[id],goal=team===1?F.near:team===0?F.far:Math.cos(skill.yaw)>=0?F.far:F.near,keeper=g.keepers?.[team===1?0:1],x=23+(keeper?.x>=23?-1:1)*1.65;
 const contactAt=Math.max(time+360,skill.at+790);g.finishes||={};g.finishes[id]={at:time,contactAt,until:contactAt+1250,yaw:Math.atan2(x-p.x,goal-p.z),fromYaw:skill.yaw,x:p.x,z:p.z,targetX:x,goal,applied:false};
 if(g.dashes?.[id]){g.dashes[id].held=false;g.dashes[id].until=time;}if(g.presses?.[id])g.presses[id].held=false;
}
export function stepSoccerFinishes(g,players,time,eligible){
 let changed=false;const b=g.ball;
 for(const [id,f]of Object.entries(g.finishes||{})){
  if(!eligible(id)||time>f.until){delete g.finishes[id];changed=true;continue;}
  if(f.applied||time<f.contactAt)continue;f.applied=true;changed=true;const p=players[id];
  if(b.keeperOwner!==undefined||b.lastTouch!==id||b.y<.85||b.y>3.8||Math.hypot(p.x-b.x,p.z-b.z)>3.7)continue;
  const dx=f.targetX-b.x,dz=f.goal-b.z,d=Math.hypot(dx,dz),speed=21,travel=Math.max(.18,d/speed);
  b.vx=dx/Math.max(.01,d)*speed;b.vz=dz/Math.max(.01,d)*speed;b.vy=Math.max(-8,Math.min(5,(.9-b.y)/travel+4.9*travel));b.dribbler='';b.releaseUntil=time+1000;b.freeUntil=time+350;g.flight=null;f.connected=true;f.contact={x:b.x,y:b.y,z:b.z};
  if(g.skills[id])g.skills[id].cancelled=true;
 }
 return changed;
}
export function sampleSoccerOverhead(f,time){
 if(time<f.at||time>f.until)return null;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const curve=(frames,t)=>{let i=1;while(i<frames.length-1&&t>frames[i][0])i++;const a=frames[i-1],b=frames[i],u=smooth((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*u);};
 const before=time<=f.contactAt,p=before?(time-f.at)/(f.contactAt-f.at):(time-f.contactAt)/(f.until-f.contactAt);
 const [height,pitch,left,right,spread,roll]=before?curve([[0,0,0,0,0,.2,0],[.25,-.16,-.18,.4,.3,.35,0],[.68,1.15,-.85,1.15,-.4,.9,0],[1,1.6,-1.5,.85,-1.85,.85,0]],p):curve([[0,1.6,-1.5,.85,-1.85,.85,0],[.22,.9,-1.95,-.5,.8,1,0],[.43,-.18,-1.57,.3,.6,.7,.12],[.62,-.2,-1.3,.5,.5,.5,.65],[.82,-.12,-.5,.7,.7,.3,.25],[1,0,0,0,0,.2,0]],p);
 const turn=smooth((time-f.at)/Math.max(1,(f.contactAt-f.at)*.75)),delta=Math.atan2(Math.sin(f.yaw+Math.PI-f.fromYaw),Math.cos(f.yaw+Math.PI-f.fromYaw));
 return {height,pitch,left,right,spread,roll,yaw:f.fromYaw+delta*turn,phase:p,before};
}
