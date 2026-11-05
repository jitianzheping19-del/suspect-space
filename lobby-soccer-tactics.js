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
export function soccerSupportSpot(g,id,players,F){
 const p=players[id],team=g.members[id],dir=team===0?1:-1,holder=players[g.ball.dribbler]||g.ball,options=[];
 for(const dx of [-5,0,5])for(const dz of [4,-2.5]){
  const q={x:Math.max(F.left+1.2,Math.min(F.right-1.2,holder.x+dx)),z:Math.max(F.near+2,Math.min(F.far-2,holder.z+dir*dz))};
  let clearance=5,crowding=0;
  for(const [other,r]of Object.entries(players)){
   if(other===id||!tacticsLive(r)||g.members[other]===undefined)continue;
   const gap=Math.hypot(q.x-r.x,q.z-r.z);
   if(g.members[other]===team)crowding+=Math.max(0,2.6-gap)*2;
   else clearance=Math.min(clearance,gap);
  }
  const lane=soccerPassLane(holder,q,g,players,team),travel=Math.hypot(q.x-p.x,q.z-p.z);
  const score=clearance*.35-lane*3-crowding-travel*.08+(dz>0?.25:0);
  options.push({...q,score});
 }
 return options.sort((a,b)=>b.score-a.score||a.x-b.x||a.z-b.z)[0];
}
