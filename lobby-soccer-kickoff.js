export function soccerKickoffBlocks(g,id,time){
 const k=g?.kickoff;
 return !!(k&&!k.released&&time<k.until&&(time<k.readyAt||id!==k.kicker));
}
export function prepareSoccerKickoff(g,players,time,team,readyAt,id){
 const slots={},center=10;
 for(const side of [0,1]){
  const ids=Object.keys(g.members).filter(who=>g.members[who]===side&&players[who]?.online&&!players[who].observer).sort((a,b)=>Number(!!players[a].soccerBot)-Number(!!players[b].soccerBot)||a.localeCompare(b));
  const dir=side===0?1:-1;
  ids.forEach((who,index)=>{
   const kicking=side===team&&index===0,n=side===team?index-1:index;
   const column=side===team?[ -2.4,2.4,0 ][Math.max(0,n)%3]:[0,-2.4,2.4][n%3];
   slots[who]={x:kicking?23:23+column,z:center-dir*(kicking?.84:(side===team?3:3.4)+Math.floor(Math.max(0,n)/3)*2.4),yaw:dir===1?0:Math.PI};
  });
 }
 const kicker=Object.keys(slots).find(who=>g.members[who]===team)||'';
 g.kickoff={id,team,kicker,slots,readyAt,until:readyAt+5000,released:!kicker};
 g.ball={x:23,y:.3,z:center,vx:0,vy:0,vz:0,at:time,resetUntil:readyAt};
 for(const [who,p]of Object.entries(g.bots||{}))if(slots[who])Object.assign(p,slots[who],{walking:false,ownedAt:0,nextAction:readyAt+450});
 for(const k of Object.values(g.kicks||{}))k.applied=true;
 for(const s of Object.values(g.skills||{}))s.cancelled=true;
 for(const r of Object.values(g.receives||{}))r.until=time;
 for(const f of Object.values(g.finishes||{}))f.until=time;
 g.presses={};g.dashes={};g.flight=null;g.dribble=null;
 return g.kickoff;
}
export function stepSoccerKickoff(g,players,time){
 const k=g.kickoff;if(!k||k.released)return false;
 if(g.status==='finished'||g.status==='idle'){k.released=true;return true;}
 if(!players[k.kicker]?.online||g.members[k.kicker]!==k.team){prepareSoccerKickoff(g,players,time,k.team,Math.max(time+700,k.readyAt),k.id+':replace');return true;}
 if(time<k.readyAt)return false;
 if(time>=k.until||Math.hypot(g.ball.x-23,g.ball.z-10)>1.4){k.released=true;return true;}
 if(!k.started){k.started=true;g.ball.dribbler=k.kicker;g.ball.lastTouch=k.kicker;g.dribble={uid:k.kicker,at:time};return true;}
 return false;
}
