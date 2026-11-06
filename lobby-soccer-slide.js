import {soccerPoseChannel} from './lobby-soccer-kick.js';
import {soccerPitch} from './lobby-soccer-match.js';
// Shared tackle timing: the scene animates travel; the host awards actual ball contact.
export const SOCCER_SLIDE={duration:1640,launchMs:160,travelMs:840,distance:3.6,cooldown:2300,reach:1.22};
export function soccerSlideActive(g,id,time){const s=g?.slides?.[id];return s&&time>=s.at&&time<s.until?s:null;}
export function canSoccerSlide(g,id,players,time){
 const p=players[id],b=g?.ball,k=g?.kickoff,F=soccerPitch(g?.pitchCount||0);
 return !!(p?.online&&!p.bot&&!p.observer&&!p.lobbyKart&&!p.lobbyCircuit&&Math.abs(p.lobbyY||0)<.2&&p.x>F.left&&p.x<F.right&&p.z>F.near&&p.z<F.far&&['idle','playing'].includes(g?.status)&&(g.status==='idle'||g.members?.[id]!==undefined)&&b&&b.keeperOwner===undefined&&b.dribbler!==id&&!(b.dribbler&&g.status==='playing'&&g.members[b.dribbler]===g.members[id])&&time>=Number(b.resetUntil||0)&&!(k&&!k.released&&time<k.until)&&time>=Number(g.knockdowns?.[id]?.until||0)&&time>=Number(g.slides?.[id]?.readyAt||0)&&!(g.finishes?.[id]&&time<g.finishes[id].until)&&!(g.receives?.[id]&&time<g.receives[id].until)&&!(g.skills?.[id]&&!g.skills[id].cancelled&&time<g.skills[id].at+1300));
}
export function beginSoccerSlide(g,id,p,yaw,time){
 g.slides||={};g.slides[id]={at:time,until:time+SOCCER_SLIDE.duration,readyAt:time+SOCCER_SLIDE.cooldown,yaw,lastX:p.x,lastZ:p.z};
 if(g.presses?.[id])g.presses[id].held=false;
 if(g.dashes?.[id]){g.dashes[id].held=false;g.dashes[id].until=Math.min(g.dashes[id].until,time);}
}
export function sampleSoccerSlide(s,time){
 if(!s||time<s.at||time>=s.until)return null;
 const age=time-s.at,smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
 // Plant the leading foot before the hip drops; recover through a supported kneel.
 const frames=[
  [0,0,0,0,0,0,0,0,0,0,0,0],
  [70,-.035,.10,-.025,-.22,.22,.04,.14,-.10,.30,-.35,.12],
  [160,-.18,.28,-.07,.38,-.30,.12,.21,-.16,.5,-.65,.38],
  [260,-.39,-.60,.14,-1.02,.74,.05,.48,-.22,-.4,-.95,.88],
  [360,-.47,-1.03,.18,-1.38,.78,0,.60,-.25,-.72,-1.2,1],
  [690,-.47,-1.00,.16,-1.34,.78,.02,.59,-.24,-.65,-1.08,1],
  [840,-.49,-.82,.28,-1.12,1.02,.02,.47,-.25,-.35,-.80,1],
  [980,-.58,-.40,.17,-.72,1.12,.07,.32,-.28,.12,-.55,1],
  [1110,-.44,.12,.08,-.22,1.20,.15,.23,-.25,.32,-.38,.82],
  [1280,-.23,.34,-.035,.20,.65,.17,.12,-.13,.40,-.22,.52],
  [1480,-.035,.075,-.012,.06,.12,.035,.025,-.025,.12,-.06,.12],
  [1640,0,0,0,0,0,0,0,0,0,0,0]
 ];
 let i=1;while(i<frames.length-1&&age>frames[i][0])i++;
 const a=frames[i-1],b=frames[i],u=smooth((age-a[0])/(b[0]-a[0]));
 const [height,pitch,roll,lead,trail,offset,leadZ,trailZ,frontArm,backArm,weight]=a.slice(1).map((v,j)=>soccerPoseChannel(frames,i,j+1,age));
 const progress=Math.max(0,Math.min(1,(age-SOCCER_SLIDE.launchMs)/(SOCCER_SLIDE.travelMs-SOCCER_SLIDE.launchMs))),travel=SOCCER_SLIDE.distance*smooth(progress);
 const handPlant=smooth((age-800)/140)*(1-smooth((age-1030)/200));
 const entry=smooth(age/160)*(1-smooth((age-160)/150)),kneel=smooth((age-880)/180)*(1-smooth((age-1150)/290));
 return {travel,weight,pitch,roll,height,lead,trail,offset,leadZ,trailZ,frontArm,backArm,handPlant,entry,kneel,recover:smooth((age-840)/800)};
}
export function stepSoccerSlides(g,players,time){
 let changed=false;const b=g.ball;
 for(const [id,s]of Object.entries(g.slides||{})){
  const p=players[id];if(!p||!p.online||p.observer||g.status==='finished'||g.status==='countdown'||g.status==='playing'&&g.members?.[id]===undefined){delete g.slides[id];changed=true;continue;}
  if(time>=s.until||time<s.at)continue;
  const dx=p.x-s.lastX,dz=p.z-s.lastZ,len=dx*dx+dz*dz,u=Math.max(0,Math.min(1,((b.x-s.lastX)*dx+(b.z-s.lastZ)*dz)/Math.max(.001,len)));
  const distance=Math.hypot(b.x-(s.lastX+u*dx),b.z-(s.lastZ+u*dz)),owner=b.dribbler;
  const facing=(b.x-p.x)*Math.sin(s.yaw)+(b.z-p.z)*Math.cos(s.yaw);
  if(!s.connected&&time-s.at>=SOCCER_SLIDE.launchMs+40&&time-s.at<=SOCCER_SLIDE.travelMs&&Math.hypot(dx,dz)<4.2&&distance<SOCCER_SLIDE.reach&&facing>-.65&&b.y<.6&&Math.abs(p.lobbyY||0)<.2&&time>=Number(b.resetUntil||0)&&b.keeperOwner===undefined&&time>=Number(b.contestUntil||0)&&(!owner||owner!==id&&(g.status==='idle'||g.members[owner]!==g.members[id]))){
   s.connected=true;s.contact={x:b.x,y:b.y,z:b.z,at:time};b.dribbler='';b.spin=0;b.lastTouch=id;b.vx=Math.sin(s.yaw)*5.2;b.vz=Math.cos(s.yaw)*5.2;b.vy=.7;b.freeUntil=time+240;b.releaseUntil=time+500;b.contestUntil=time+400;b.contestOwner=id;g.flight=null;
   if(g.skills?.[owner])g.skills[owner].cancelled=true;
   changed=true;
  }
  if(time-s.at>=SOCCER_SLIDE.launchMs+40&&time-s.at<=SOCCER_SLIDE.travelMs&&Math.hypot(dx,dz)<4.2){
   g.knockdowns||={};s.hitPlayers||={};
   for(const [other,q]of Object.entries(players)){
    if(other===id||s.hitPlayers[other]||!q?.online||q.observer||q.bot&&!q.soccerBot||Math.abs(q.lobbyY||0)>.3||g.status==='playing'&&(g.members[other]===undefined||g.members[other]===g.members[id])||time<Number(g.knockdowns[other]?.until||0)+300)continue;
    const u=Math.max(0,Math.min(1,((q.x-s.lastX)*dx+(q.z-s.lastZ)*dz)/Math.max(.001,len))),gap=Math.hypot(q.x-s.lastX-u*dx,q.z-s.lastZ-u*dz),front=(q.x-p.x)*Math.sin(s.yaw)+(q.z-p.z)*Math.cos(s.yaw);
    if(gap>1.05||front<-.25)continue;
    s.hitPlayers[other]=true;g.knockdowns[other]={at:time,until:time+1450,yaw:s.yaw,from:id};
    if(g.presses?.[other])g.presses[other].held=false;
    if(g.dashes?.[other])g.dashes[other].until=Math.min(g.dashes[other].until,time);
    if(g.skills?.[other])g.skills[other].cancelled=true;
    if(g.kicks?.[other])g.kicks[other].applied=true;
    if(g.receives?.[other])delete g.receives[other];if(g.finishes?.[other])delete g.finishes[other];
    if(b.dribbler===other){b.dribbler='';b.lastTouch=id;b.vx=Math.sin(s.yaw)*3;b.vz=Math.cos(s.yaw)*3;b.vy=.5;b.freeUntil=time+250;}
    changed=true;
   }
  }
  s.lastX=p.x;s.lastZ=p.z;
 }
 return changed;
}
