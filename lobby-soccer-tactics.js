// Small deterministic pitch queries shared by pass assistance and practice bots.
const tacticsLive=p=>p?.online===true&&(!p.bot||p.soccerBot===true)&&!p.observer&&!p.lobbyKart&&!p.lobbyCircuit&&Math.abs(p.lobbyY||0)<.3&&Number.isFinite(p.x)&&Number.isFinite(p.z);
export function soccerPassLane(from,to,g,players,team){
 const dx=to.x-from.x,dz=to.z-from.z,length2=dx*dx+dz*dz;
 if(length2<.01)return 0;
 let risk=0;
 for(const [id,p]of Object.entries(players)){
  if(!tacticsLive(p)||g.members?.[id]===undefined||g.members[id]===team)continue;
  const u=((p.x-from.x)*dx+(p.z-from.z)*dz)/length2;if(u<.06||u>1.08)continue;
  const t=Math.min(1,u),gap=Math.hypot(from.x+dx*t-p.x,from.z+dz*t-p.z);
  const reach=1.05+Math.min(.65,Math.sqrt(length2)*t*.055);
  risk=Math.max(risk,Math.max(0,1-gap/reach));
 }
 return risk;
}
export function soccerSupportSpot(g,id,players,F,reserved=[]){
 const p=players[id],team=g.members[id],dir=team===0?1:-1,holder=players[g.ball.dribbler]||g.ball,options=[];
 for(const dx of [-7,-3.5,0,3.5,7])for(const dz of [4,8,-3,-7]){
  const q={x:Math.max(F.left+1.2,Math.min(F.right-1.2,holder.x+dx)),z:Math.max(F.near+2,Math.min(F.far-2,holder.z+dir*dz))};
  let clearance=5,crowding=0;
  for(const [other,r]of Object.entries(players)){
   if(other===id||!tacticsLive(r)||g.members[other]===undefined)continue;
   const gap=Math.hypot(q.x-r.x,q.z-r.z);
   if(g.members[other]===team)crowding+=Math.max(0,2.6-gap)*2;
   else clearance=Math.min(clearance,gap);
  }
  for(const r of reserved)crowding+=Math.max(0,3.2-Math.hypot(q.x-r.x,q.z-r.z))*4;
  const lane=soccerPassLane(holder,q,g,players,team),travel=Math.hypot(q.x-p.x,q.z-p.z);
  const holderGap=Math.hypot(q.x-holder.x,q.z-holder.z);
  const score=clearance*.35-lane*3-crowding-travel*.08+(dz>0?.25:0)-Math.max(0,3-holderGap)*4;
  options.push({...q,score});
 }
 return options.sort((a,b)=>b.score-a.score||a.x-b.x||a.z-b.z)[0];
}

export function soccerBotAssignments(g,players,F,time){
 const b=g.ball,ready=id=>tacticsLive(players[id])&&g.members[id]!==undefined&&players[id].x>=F.left&&players[id].x<=F.right&&players[id].z>=F.near&&players[id].z<=F.far&&time>=Number(g.knockdowns?.[id]?.until||0)&&time>=Number(g.nutmegs?.[id]?.until||0)&&time>=Number(g.receives?.[id]?.until||0)&&time>=Number(g.finishes?.[id]?.until||0);
 const bots=Object.keys(g.bots||{}).filter(ready).sort();
 const kick=g.kicks?.[b.lastTouch],flight=g.flight;
 const intended=!b.dribbler&&b.keeperOwner===undefined?(flight&&time<flight.arrivalAt+700?flight.target:kick?.connected&&kick.mode!=='shot'&&time<kick.contact.at+1600?kick.target:''):'';
 const receiver=intended&&tacticsLive(players[intended])&&g.members[intended]!==undefined?intended:'';
 const key=[b.dribbler||'',b.keeperOwner??'',receiver,...bots.map(id=>id+':'+g.members[id])].join('|'),old=g.botTactics;
 if(old?.key===key&&time-old.at<500&&Math.hypot(b.x-old.x,b.z-old.z)<3)return old.roles;
 const roles={};
 for(const team of [0,1]){
  const ids=bots.filter(id=>g.members[id]===team),dir=team===0?1:-1;
  const ally=g.members[b.dribbler]===team||b.keeperOwner===team,opponent=!!b.dribbler&&!ally||b.keeperOwner!==undefined&&!ally;
  const target={x:b.x,z:b.z};
  if(!b.dribbler&&b.keeperOwner===undefined){const fall=b.y>.8?(b.vy+Math.sqrt(b.vy*b.vy+19.6*Math.max(0,b.y-.3)))/9.8:.2;target.x+=b.vx*Math.min(.65,fall);target.z+=b.vz*Math.min(.65,fall);}
  let chaser='';
  if(!ally&&b.keeperOwner===undefined){
   if(receiver&&g.members[receiver]===team)chaser=ids.includes(receiver)?receiver:'';
   else{
    const ranked=[...ids].sort((a,c)=>Math.hypot(players[a].x-target.x,players[a].z-target.z)-Math.hypot(players[c].x-target.x,players[c].z-target.z)||a.localeCompare(c));
    chaser=ranked[0]||'';
    const previous=old?.key===key?ids.find(id=>['chase','press'].includes(old.roles[id]?.role)):'';
    if(previous&&chaser&&Math.hypot(players[previous].x-target.x,players[previous].z-target.z)<Math.hypot(players[chaser].x-target.x,players[chaser].z-target.z)+1.2)chaser=previous;
   }
  }
  if(chaser)roles[chaser]={role:b.dribbler?'press':'chase',...target};
  if(receiver&&ids.includes(receiver))roles[receiver]={role:'receive',x:flight?.x??target.x,z:flight?.z??target.z};
  const rest=ids.filter(id=>id!==b.dribbler&&!roles[id]),reserved=[];
  const opponents=Object.keys(g.members).filter(id=>id!==b.dribbler&&g.members[id]!==team&&tacticsLive(players[id])).sort((a,c)=>dir*(players[a].z-players[c].z)||a.localeCompare(c));
  for(const [i,id]of rest.entries()){
   let q,role;
   if(opponent){
    const mark=players[opponents[i]],ownGoal=team===0?F.near:F.far;
    if(mark){const dx=23-mark.x,dz=ownGoal-mark.z,d=Math.hypot(dx,dz)||1;q={x:mark.x+dx/d*1.8,z:mark.z+dz/d*1.8};role='mark';}
    else{q={x:23+(b.x-23)*.25+[-4,4,0][i%3],z:b.z-dir*(4+Math.floor(i/3)*3)};role='cover';}
   }else if(i===0&&ids.length>=3){q={x:23+(b.x-23)*.35,z:b.z-dir*6};role='cover';}
   else{q=soccerSupportSpot(g,id,players,F,reserved);role='support';}
   q={role,x:Math.max(F.left+1.2,Math.min(F.right-1.2,q.x)),z:Math.max(F.near+1.25,Math.min(F.far-1.25,q.z))};roles[id]=q;reserved.push(q);
  }
 }
 g.botTactics={key,at:time,x:b.x,z:b.z,roles};return roles;
}

export function soccerBotPassTarget(g,id,players,F,preferred=''){
 const p=players[id],team=g.members[id],dir=team===0?1:-1;
 const choices=Object.keys(g.members).filter(other=>other!==id&&g.members[other]===team&&tacticsLive(players[other])&&players[other].x>F.left+.5&&players[other].x<F.right-.5&&players[other].z>F.near+.5&&players[other].z<F.far-.5&&Math.hypot(players[other].x-p.x,players[other].z-p.z)>2&&Math.hypot(players[other].x-p.x,players[other].z-p.z)<25);
 const score=other=>{
  const q=players[other];let space=4;
  for(const [enemy,r]of Object.entries(players))if(tacticsLive(r)&&g.members[enemy]!==undefined&&g.members[enemy]!==team)space=Math.min(space,Math.hypot(q.x-r.x,q.z-r.z));
  return soccerPassLane(p,q,g,players,team)*4+(4-space)*.55+Math.hypot(q.x-p.x,q.z-p.z)*.025-Math.max(-10,Math.min(10,(q.z-p.z)*dir))*.06-(other===preferred?.25:0);
 };
 return choices.sort((a,b)=>score(a)-score(b)||a.localeCompare(b))[0]||'';
}
