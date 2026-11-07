import {soccerGoalX,soccerSecretActive} from './lobby-soccer-secret.js';
import {soccerAirAction} from './lobby-soccer-finishes.js';
import {soccerBallCrossing,soccerTargetLift} from './lobby-soccer-kick.js';
// Shared by the authoritative host and the lobby renderer.
export function soccerReception(g,id,players,F,time){
 const p=players[id],b=g?.ball;
 if(!p?.online||p.bot&&!p.soccerBot||p.observer||p.lobbyKart||p.lobbyCircuit||Math.abs(p.lobbyY||0)>.25||p.x<F.left||p.x>F.right||p.z<F.near||p.z>F.far||!['playing','idle'].includes(g?.status)||g.status==='playing'&&g.members?.[id]===undefined||!b||b.dribbler||b.keeperOwner!==undefined||time<Number(b.resetUntil||0)||time<Number(g.knockdowns?.[id]?.until||0)||time<Number(g.slides?.[id]?.until||0)||time<Number(g.finishes?.[id]?.until||0)||!g.receives?.[id]?.ground&&time<Number(g.receives?.[id]?.until||0))return {trap:false,header:false};
 const d=Math.hypot(p.x-b.x,p.z-b.z),speed=Math.hypot(b.vx,b.vz),ownRelease=b.lastTouch===id&&time<Number(b.releaseUntil||0);
 const trap=!ownRelease&&d<2&&b.y>=.3&&b.y<2.5&&b.vy<2&&speed<15&&time>=Number(b.freeUntil||0);
 return {trap,header:soccerAirAction(g,id,players,F,time)==='header',goal:g.members[id]===1?F.near:F.far};
}
export function soccerTrapPart(ball){return ball.y>=1.8?'head':ball.y>=1.1?'chest':ball.y>=.65?'knee':ball.y>.38||Math.hypot(ball.vx,ball.vz)>4?'foot':'sole';}
export function beginSoccerReceive(g,id,kind,p,time,F){
 const b=g.ball,goal=g.members[id]===0?F.far:F.near,keeper=g.keepers?.[g.members[id]===0?1:0];
 const center=soccerGoalX(F,goal),targetX=center+(keeper?.x>=center?-1:1)*1.65;
 g.receives||={};g.receives[id]={kind,part:kind==='trap'?soccerTrapPart(b):'head',at:time,until:time+(kind==='header'?1350:650),contactAt:time+(kind==='header'?140:0),applied:false,x:b.x,y:b.y,z:b.z,yaw:Math.atan2(targetX-p.x,goal-p.z),targetX,goal};
 if(kind==='trap'){
  Object.assign(g.receives[id],{trapYaw:Number(p.yaw)||0,steerAt:time});
  const ground=b.y<=.55,speed=Math.hypot(b.vx,b.vz);g.flight=null;b.dribbler=ground?id:'';b.spin=0;
  if(ground){Object.assign(g.receives[id],{ground:true,applied:true,until:time+380});g.dribble={uid:id,at:time,receiveAt:time,receiveDuration:300,receiveSide:(b.x-p.x)*Math.cos(p.yaw||0)-(b.z-p.z)*Math.sin(p.yaw||0)<0?-1:1};}else b.vx=b.vy=b.vz=0;
 }
}
export function stepSoccerReceives(g,players,F,time,eligible){
 const b=g.ball;let controlled=false,changed=false;
 for(const [id,r]of Object.entries(g.receives||{})){
  const p=players[id];if(!eligible(id)||time>r.until+1500){delete g.receives[id];continue;}
  if(r.kind==='trap'&&!r.applied&&Math.hypot(p.x-b.x,p.z-b.z)>2.3){delete g.receives[id];b.freeUntil=time+100;changed=true;continue;}
  const age=time-r.at;
  if(r.kind==='trap'&&time<=r.until){
   const dt=Math.max(0,Math.min(.1,(time-(r.steerAt??r.at))/1000)),yaw=Number(p.yaw)||0;
   r.trapYaw??=yaw;const turn=Math.atan2(Math.sin(yaw-r.trapYaw),Math.cos(yaw-r.trapYaw));
   const rate=r.ground?12:8;r.trapYaw+=Math.max(-rate*dt,Math.min(rate*dt,turn));r.steerAt=time;
  }
  if(r.ground)continue;
  if(r.kind==='header'&&!r.applied&&time>=r.contactAt){
   r.applied=true;changed=true;
   if(!b.dribbler&&b.keeperOwner===undefined&&Math.hypot(p.x-b.x,p.z-b.z)<3.5&&b.y>.6&&b.y<3.3){
    const dx=r.targetX-b.x,dz=r.goal-b.z,d=Math.hypot(dx,dz),speed=15.5;
    b.vx=dx/d*speed;b.vz=dz/d*speed;b.vy=soccerTargetLift(b.y,F.goalHeight-F.radius-F.postRadius-.2,d,speed);b.dribbler='';b.spin=0;b.lastTouch=id;b.releaseUntil=time+900;b.freeUntil=time+350;g.flight=null;r.connected=true;
   }
  }else if(r.kind==='trap'&&age<550){
   const u=Math.max(0,Math.min(1,age/550)),ease=u*u*(3-2*u),yaw=r.trapYaw??(Number(p.yaw)||0);
   b.x=r.x+(p.x+Math.sin(yaw)*.72-r.x)*ease;b.z=r.z+(p.z+Math.cos(yaw)*.72-r.z)*ease;b.y=r.y+(.3-r.y)*ease;b.vx=b.vy=b.vz=0;b.lastTouch=id;b.freeUntil=time+30;controlled=changed=true;
  }else if(r.kind==='trap'&&!r.applied){r.applied=true;b.dribbler=id;g.dribble={uid:id,at:time};changed=true;}
 }
 if(g.flight&&time>g.flight.at+3500){g.flight=null;changed=true;}
 if(!controlled&&!b.dribbler&&b.keeperOwner===undefined&&b.vy<=.3&&b.y<=2.15&&b.y>=.3&&Math.hypot(b.vx,b.vz)>.3||!controlled&&!b.dribbler&&b.keeperOwner===undefined&&b.vy<-.1&&b.y<=2.15&&b.y>.3){
  const candidates=Object.keys(players).filter(id=>eligible(id)&&soccerReception(g,id,players,F,time).trap&&Math.hypot(players[id].x-b.x,players[id].z-b.z)<.95).sort((a,c)=>Math.hypot(players[a].x-b.x,players[a].z-b.z)-Math.hypot(players[c].x-b.x,players[c].z-b.z));
  if(candidates[0]){beginSoccerReceive(g,candidates[0],'trap',players[candidates[0]],time,F);controlled=changed=true;}
 }
 return {controlled,changed};
}
export function holdSoccerKeeperBall(g,k,time,pickup=false){
 const b=g.ball,age=k.phase==='dive'?(time-k.at)/1000:0,dir=k.team===0?1:-1;
 k.grabRoll=k.phase==='dive'?-k.side*dir*1.25*Math.sin(Math.min(1,age/.95)*Math.PI):0;
 k.grabLift=k.phase==='dive'?Math.sin(Math.min(1,age/.65)*Math.PI)*Math.max(.25,(k.height||1)-.6):0;
 delete k.distribution;delete k.distributionAt;delete k.puntStartedAt;delete k.contact;
 k.phase=pickup?'pickup':'catch';k.at=time;k.until=time+1200;k.grabFrom={x:b.x,y:b.y,z:b.z};k.holdYaw=dir===1?0:Math.PI;
 b.keeperOwner=k.team;b.dribbler='';b.spin=0;b.lastTouch='keeper-'+k.team;b.vx=b.vy=b.vz=0;g.flight=null;
 for(const kick of Object.values(g.kicks||{}))kick.applied=true;
 for(const skill of Object.values(g.skills||{}))skill.cancelled=true;
 g.presses={};
}
export function soccerKeeperOutlet(g,k,players,F){
 const targets=Object.keys(g.members||{}).filter(id=>{const p=players[id];return g.members[id]===k.team&&p?.online&&(!p.bot||p.soccerBot===true)&&!p.observer&&!p.lobbyKart&&!p.lobbyCircuit&&Math.abs(p.lobbyY||0)<.25&&p.x>=F.left&&p.x<=F.right&&p.z>F.near+.5&&p.z<F.far-.5&&Math.hypot(p.x-k.x,p.z-k.z)>1.2;}).sort((a,c)=>Math.hypot(players[a].x-k.x,players[a].z-k.z)-Math.hypot(players[c].x-k.x,players[c].z-k.z)||a.localeCompare(c));
 const target=targets[0]||'',q=players[target]||{x:23,z:k.z+(k.team===0?1:-1)*8};
 return {target,x:q.x,z:q.z,yaw:Math.atan2(q.x-k.x,q.z-k.z)};
}
export function stepSoccerKeepers(g,F,time,dt,players={}){
 // Goalkeepers stay active independently of the optional field-player bots.
 const previous=JSON.stringify(g.keepers||{}),heldBefore=g.ball.keeperOwner!==undefined;g.keepers||={};const b=g.ball,playing=['idle','playing'].includes(g.status)&&time>=Number(b.resetUntil||0);
 for(const team of [0,1]){
  const dir=team===0?1:-1,z=(team===0?F.near:F.far)+dir*.75,center=soccerGoalX(F,team===0?F.near:F.far);
  const k=g.keepers[team]||(g.keepers[team]={team,x:23,z,y:0,phase:'ready',until:0,saves:0});if(k.phase==='ready'&&b.keeperOwner!==team&&Math.abs(b.z-z)>3.5)k.z+=(z-k.z)*Math.min(1,dt*5);
  const offset=center-23,shift=offset-(k.goalOffset||0);k.goalOffset=offset;k.x+=shift;if(Number.isFinite(k.fromX))k.fromX+=shift;if(Number.isFinite(k.toX))k.toX+=shift;
  k.goalMoving=soccerSecretActive(g)&&g.secretGoalMove?.team===team&&time<g.secretGoalMove.until;
  if(!playing){Object.assign(k,{x:center,y:0,z,phase:'ready',until:0,watch:0});delete b.keeperOwner;continue;}
  if(k.secretKnockback&&time<k.secretKnockback.until)continue;
  if(b.keeperOwner===team){
   const target=soccerKeeperOutlet(g,k,players,F);
   if(!k.distribution){k.distribution=!target.target||Math.hypot(target.x-k.x,target.z-k.z)>=10?'punt':'throw';k.distributionAt=k.at;k.until=k.at+(k.distribution==='punt'?1550:1200);if(k.distribution==='punt')k.puntStartedAt=k.at;}
   const lift=Math.max(0,Math.min(1,(time-k.at)/360)),ease=lift*lift*(3-2*lift),outlet=soccerKeeperOutlet(g,k,players,F);
   const turn=Math.atan2(Math.sin(outlet.yaw-k.holdYaw),Math.cos(outlet.yaw-k.holdYaw));k.holdYaw+=turn*Math.min(1,dt*8);k.target=outlet.target;
   const pose=k.distribution==='punt'?sampleSoccerPunt(time-k.distributionAt):sampleSoccerKeeperThrow(time-k.distributionAt);
   b.x=k.grabFrom.x+(k.x+Math.sin(k.holdYaw)*pose.reach-k.grabFrom.x)*ease;b.z=k.grabFrom.z+(k.z+Math.cos(k.holdYaw)*pose.reach-k.grabFrom.z)*ease;b.y=k.grabFrom.y+(pose.ballY-k.grabFrom.y)*ease;b.at=time;
   if(time>=k.until){
    k.contact={x:b.x,y:b.y,z:b.z,at:time};
    const target=outlet.target,q=outlet,punt=k.distribution==='punt',travel=Math.max(punt?1.15:.85,Math.min(punt?2:1.8,Math.hypot(q.x-b.x,q.z-b.z)/(punt?13:11))),factor=.18/(1-Math.exp(-.18*travel));
    b.vx=(q.x-b.x)*factor;b.vz=(q.z-b.z)*factor;b.vy=(1.45-b.y)/travel+4.9*travel;b.lastTouch='keeper-'+team;b.keeperReleaseUntil=time+900;b.freeUntil=time+200;delete b.keeperOwner;
    g.flight={from:'keeper-'+team,team,target,at:time,arrivalAt:time+travel*1000,x:q.x,z:q.z};k.phase=punt?'punt':'distribute';k.at=time;k.until=time+(punt?750:550);k.target=target;k.throwYaw=Math.atan2(q.x-k.x,q.z-k.z);
   }
   continue;
  }
  if(b.keeperOwner!==undefined)continue;
  if(['distribute','punt'].includes(k.phase)&&time<k.until)continue;
  const loose=!b.dribbler&&b.y<.8&&Math.hypot(b.vx,b.vz)<5&&Math.abs(b.z-z)<3.5&&Math.abs(b.x-center)<F.goal/2+.4&&time>=Number(b.keeperReleaseUntil||0);
  if(loose&&k.phase!=='dive'&&k.phase!=='recover'){
   const dx=b.x-k.x,dz=b.z-k.z,d=Math.hypot(dx,dz),step=Math.min(d,dt*3.6);if(d>.65){k.x+=dx/d*step;k.z+=dz/d*step;}else holdSoccerKeeperBall(g,k,time,true);
   continue;
  }
  if(k.phase==='dive'&&time<k.until)continue;
  if(k.phase==='dive'){k.x=k.toX;k.phase='recover';k.until=time+500;continue;}
  if(k.phase==='recover'&&time<k.until)continue;
  k.phase='ready';k.z+=(z-k.z)*Math.min(1,dt*5);
  const target=time<Number(k.giantUntil||0)?center+(k.giantSide||1)*1.65:Math.max(center-1.85,Math.min(center+1.85,center+(b.x-center)*.5)),step=Math.min(1,dt*3.6);k.x+=(target-k.x)*step;
  const eta=Math.abs(b.vz)>.01?(z-b.z)/b.vz:-1,danger=b.vz*dir< -2&&eta>0&&eta<.65;
  if(!danger){k.watch=0;continue;}if(!k.watch)k.watch=time;
  if(time-k.watch<210)continue;
  const predicted=b.spin?soccerBallCrossing(b,z):null;
  const x=predicted?.x??b.x+b.vx*eta,y=predicted?.y??b.y+b.vy*eta-4.9*eta*eta;
  if(Math.abs(x-center)>F.goal/2+.6||y>3.2||y<-.5)continue;
  k.phase='dive';k.at=time;k.until=time+850;k.fromX=k.x;k.toX=Math.max(k.x-1.3,Math.min(k.x+1.3,x));k.height=Math.max(.25,Math.min(2.35,y));k.side=x<k.x?-1:1;k.watch=0;
 }
 if(soccerSecretActive(g)){
  g.secretNextGiantAt??=(g.startAt||time)+11000;
  if(time>=g.secretNextGiantAt){const team=(g.secretGiantCount||0)%2;g.secretGiantCount=(g.secretGiantCount||0)+1;g.secretNextGiantAt=time+27000;if(g.keepers[team]){g.keepers[team].giantUntil=time+1800;g.keepers[team].giantSide=team===0?1:-1;}}
 }
 return {controlled:b.keeperOwner!==undefined,changed:heldBefore||b.keeperOwner!==undefined||previous!==JSON.stringify(g.keepers)};
}
// This pose is shared by the renderer and the authoritative collision shapes.
export function sampleSoccerKeeperPose(k,time){
 const recoil=k.secretKnockback;if(recoil&&time<recoil.until){const u=Math.max(0,Math.min(1,(time-recoil.at)/600));return {x:recoil.x,z:recoil.z+(k.team===0?-1:1)*1.8*u,y:Math.sin(u*Math.PI)*.6,yaw:k.team===0?0:Math.PI,roll:1.2*u,bodyY:.88,pitch:-.6*u,armX:-1.8,armZ:1.2,legX:[.6,.8]};}
 const dir=k.team===0?1:-1,dive=k.phase==='dive',age=dive?Math.max(0,(time-k.at)/1000):0;
 const recovery=k.phase==='recover'?Math.max(0,Math.min(1,(k.until-time)/500)):0;
 const land=Math.max(0,Math.min(1,(age-.42)/.35));
 return {x:dive?k.fromX+(k.toX-k.fromX)*Math.min(1,age/.28):k.x,z:k.z,
  y:dive?Math.sin(Math.min(1,age/.65)*Math.PI)*Math.max(.25,(k.height||1)-.6):0,
  yaw:dir===1?0:Math.PI,roll:dive?-k.side*dir*1.25*Math.sin(Math.min(1,age/.95)*Math.PI):recovery*-dir*(k.side||1)*.5,
  bodyY:.88-(dive?land*.42:recovery*.22),pitch:dive?.2:recovery?.35:.12,
  armX:dive?-1.35:k.goalMoving?-.9:-.48,armZ:dive?.85:k.goalMoving?1.25:.28,legX:[dive?-.25:recovery?.6:.15,dive?.7:recovery?.6:.15]};
}
export function soccerKeeperColliders(k,time){
 const pose=sampleSoccerKeeperPose(k,time),shapes=[];
 function rotate(v,x=0,y=0,z=0){
  const cz=Math.cos(z),sz=Math.sin(z),cy=Math.cos(y),sy=Math.sin(y),cx=Math.cos(x),sx=Math.sin(x);
  const a=v.x*cz-v.y*sz,b=v.x*sz+v.y*cz,c=a*cy+v.z*sy,d=-a*sy+v.z*cy;
  return {x:c,y:b*cx-d*sx,z:b*sx+d*cx};
 }
 function world(v){const b=rotate(v,pose.pitch);b.y+=pose.bodyY;const r=rotate(b,0,pose.yaw,pose.roll);return {x:r.x+pose.x,y:r.y+pose.y,z:r.z+pose.z};}
 function add(part,a,b,radius){shapes.push({part,a:world(a),b:world(b),radius});}
 add('body',{x:0,y:.115,z:0},{x:0,y:.645,z:0},.43);
 for(const [i,side]of [-1,1].entries()){
  const arm=v=>{const p=rotate(v,pose.armX,0,side*pose.armZ);return {x:p.x+side*.48,y:p.y+.43,z:p.z};};
  add('arm',arm({x:side*.12,y:-.29,z:.02}),arm({x:side*.12,y:.01,z:.02}),.13);
  const glove=arm({x:side*.16,y:-.4,z:.12});add('glove',glove,glove,.21*(time<Number(k.giantUntil||0)&&side===(k.giantSide||1)?3.4:1));
  const leg=v=>{const p=rotate(v,pose.legX[i],0,side*.12);return {x:p.x+side*.24,y:p.y-.5,z:p.z};};
  add('leg',leg({x:0,y:-.15,z:0}),leg({x:0,y:.11,z:0}),.16);
  add('boot',leg({x:0,y:-.3,z:-.035}),leg({x:0,y:-.3,z:.195}),.12);
 }
 return shapes;
}
// Closest points on the swept ball segment and a body-part capsule axis.
function keeperSegmentContact(p,q,a,b,radius){
 const sub=(u,v)=>({x:u.x-v.x,y:u.y-v.y,z:u.z-v.z}),dot=(u,v)=>u.x*v.x+u.y*v.y+u.z*v.z,clamp=v=>Math.max(0,Math.min(1,v));
 const d=sub(q,p),e=sub(b,a),r=sub(p,a),dd=dot(d,d),ee=dot(e,e),de=dot(d,e),dr=dot(d,r),er=dot(e,r);
 let t=dd>1e-12?clamp(-dr/dd):0,u=0;
 if(ee>1e-12){const den=dd*ee-de*de;t=den>1e-12?clamp((de*er-dr*ee)/den):0;u=(de*t+er)/ee;
  if(u<0){u=0;t=dd>1e-12?clamp(-dr/dd):0;}else if(u>1){u=1;t=dd>1e-12?clamp((de-dr)/dd):0;}}
 const distanceAt=v=>{const offset={x:r.x+d.x*v,y:r.y+d.y*v,z:r.z+d.z*v},u=ee>1e-12?clamp(dot(offset,e)/ee):0;return Math.hypot(offset.x-e.x*u,offset.y-e.y*u,offset.z-e.z*u);};
 if(distanceAt(t)<=radius&&distanceAt(0)>radius){let lo=0,hi=t;for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(distanceAt(mid)>radius)lo=mid;else hi=mid;}t=hi;u=ee>1e-12?clamp((de*t+er)/ee):0;}
 const point={x:p.x+d.x*t,y:p.y+d.y*t,z:p.z+d.z*t},axis={x:a.x+e.x*u,y:a.y+e.y*u,z:a.z+e.z*u};
 return {t,point,distance:Math.hypot(point.x-axis.x,point.y-axis.y,point.z-axis.z)};
}
export function collideSoccerKeeper(g,F,time,old){
 const b=g.ball;if(b.keeperOwner!==undefined||time<Number(b.keeperReleaseUntil||0))return false;
 let hit=null;
 for(const k of Object.values(g.keepers||{})){
  if(['pickup','catch'].includes(k.phase))continue;
  for(const shape of soccerKeeperColliders(k,time)){
   const contact=keeperSegmentContact(old,b,shape.a,shape.b,shape.radius+(F.radius||.3));
   if(contact.distance>shape.radius+(F.radius||.3))continue;
   if(!hit||contact.t<hit.t)hit={...contact,k,part:shape.part};
  }
 }
 if(!hit)return false;
 const k=hit.k,dir=k.team===0?1:-1,{x:bx,y:by,z:bz}=hit.point,pose=sampleSoccerKeeperPose(k,time);
 if(b.fire&&soccerSecretActive(g)){k.secretKnockback={at:time,until:time+1200,x:pose.x,z:pose.z};b.vx*=.9;b.vz*=.9;b.keeperReleaseUntil=time+1000;g.lastSave={team:k.team,at:time,x:bx,y:by,z:bz,part:'fire-break'};return true;}
 const catchable=Math.hypot(b.vx,b.vy,b.vz)<13&&by<2.2;
 b.x=bx;b.y=Math.max(.3,by);b.z=bz;k.saves++;k.saveAt=time;g.lastSave={team:k.team,at:time,x:bx,y:by,z:bz,part:hit.part};
 if(catchable){if(k.phase==='dive')k.x=pose.x;holdSoccerKeeperBall(g,k,time);return true;}
 b.z=bz+dir*.05;b.vx=(bx>=pose.x?1:-1)*(1.8+Math.abs(b.vx)*.2);b.vz=dir*(3.2+Math.abs(b.vz)*.22);b.vy=1.65;b.dribbler='';b.spin=0;b.lastTouch='keeper-'+k.team;b.keeperReleaseUntil=time+650;b.freeUntil=time+250;g.flight=null;return true;
}

export function sampleSoccerPunt(age){
 const p=Math.max(0,Math.min(1,age/2300));
 const frames=[[0,1.15,.5,-.15,.1,-1.25,0],[.32,1.15,.5,-.1,.1,-1.25,0],[.46,1.34,.64,.35,.15,-1.05,-.08],[.57,1.12,.72,.95,.1,-.65,-.12],[1550/2300,.62,.85,-1.25,.22,-.3,.2],[.79,.3,1,-1.05,.18,-.45,.28],[1,.3,.65,.15,.15,-.48,.12]];
 let i=1;while(i<frames.length-1&&p>frames[i][0])i++;const a=frames[i-1],b=frames[i],u=(p-a[0])/(b[0]-a[0]),w=u*u*(3-2*u),[ballY,reach,kick,plant,arm,pitch]=a.slice(1).map((v,j)=>v+(b[j+1]-v)*w);
 return {ballY,reach,kick,plant,arm,pitch};
}

// Hand preparation and follow-through use the same 1200 ms release as the ball.
export function sampleSoccerKeeperThrow(age){
 const t=Math.max(0,Math.min(1750,age));
 const frames=[[0,1.15,.5,-1.25,.12,.15],[650,1.15,.5,-1.25,.12,.15],[950,1.65,.38,-2.3,-.12,.25],[1100,1.9,.28,-2.65,-.18,.35],[1200,1.75,.62,-1.85,.18,-.35],[1380,1.3,.75,-.7,.3,-.6],[1750,1.15,.5,-.48,.12,.15]];
 let i=1;while(i<frames.length-1&&t>frames[i][0])i++;
 const a=frames[i-1],b=frames[i],u=(t-a[0])/(b[0]-a[0]),ease=u*u*(3-2*u),[ballY,reach,arm,pitch,plant]=a.slice(1).map((v,j)=>v+(b[j+1]-v)*ease);
 return {ballY,reach,arm,pitch,plant};
}
