export function soccerMatchOptions(value,solo=false){
 if(value===undefined)return {enabled:solo,blue:1,red:1};
 if(!value||typeof value.enabled!=='boolean'||![value.blue,value.red].every(n=>Number.isInteger(n)&&n>=0&&n<=10))return null;
 return {enabled:value.enabled,blue:value.blue,red:value.red};
}
export function soccerPitch(count=0){
 const size=count>=16?2:count>=10?1:0,width=[20,21.4,22][size],length=[30,38,44][size];
 return {size,width,length,minX:12,maxX:37,minZ:10-length/2-2.5,maxZ:10+length/2+3,left:23-width/2,right:23+width/2,near:10-length/2,far:10+length/2,goal:6.4,goalHeight:2.5,goalDepth:1.2,postRadius:.075,radius:.3};
}
// Resolve even identical spawn coordinates. A radial free-space search handles
// crowded walls/corners where repeated pairwise projections can cycle.
export function resolveSoccerOverlap(id,position,players,F,blocked=()=>false){
 const radius=.88,others=Object.entries(players).filter(([other,p])=>other!==id&&p?.online&&!p.observer&&(!p.bot||p.soccerBot)&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs((p.lobbyY||0)-(position.y||0))<1.6&&p.x>=F.minX&&p.x<=F.maxX&&p.z>=F.minZ&&p.z<=F.maxZ).sort(([a],[b])=>a.localeCompare(b));
 const clamp=q=>({x:Math.max(F.minX+.55,Math.min(F.maxX-.55,q.x)),z:Math.max(F.minZ+.55,Math.min(F.maxZ-.55,q.z))});
 const free=q=>!blocked(q.x,q.z)&&others.every(([,p])=>Math.hypot(q.x-p.x,q.z-p.z)>=radius-1e-5);
 let q=clamp(position);if(free(q))return q;
 for(let pass=0;pass<12;pass++){
  for(const [other,p]of others){let dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz);if(d>=radius)continue;
   if(d<1e-6){let hash=0;for(const c of [id,other].sort().join(':'))hash=(hash*31+c.charCodeAt(0))>>>0;const angle=hash/4294967296*Math.PI*2+(id<other?0:Math.PI);dx=Math.sin(angle);dz=Math.cos(angle);d=1;}
   q=clamp({x:p.x+dx/d*radius,z:p.z+dz/d*radius});
  }if(free(q))return q;
 }
 for(let r=.2;r<=Math.hypot(F.maxX-F.minX,F.maxZ-F.minZ);r+=.2){const steps=Math.max(16,Math.ceil(r*24));for(let i=0;i<steps;i++){const angle=i*Math.PI*2/steps,candidate=clamp({x:position.x+Math.sin(angle)*r,z:position.z+Math.cos(angle)*r});if(free(candidate))return candidate;}}
 return q;
}
