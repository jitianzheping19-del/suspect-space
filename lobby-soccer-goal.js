// Nets stop entries through the sides/roof/back, leaving only the goal mouth open.
export function collideSoccerNet(b,old,F){
 let hit=false;
 for(const [line,dir,center]of [[F.near,-1,F.nearGoalX??23],[F.far,1,F.farGoalX??23]]){
  const left=center-F.goal/2,right=center+F.goal/2,back=line+dir*F.goalDepth,low=Math.min(line,back),high=Math.max(line,back),r=F.radius;
  const planes=[['x',left,'y',0,F.goalHeight,'z',low,high],['x',right,'y',0,F.goalHeight,'z',low,high],['y',F.goalHeight,'x',left,right,'z',low,high],['z',back,'x',left,right,'y',0,F.goalHeight]];
  for(const [axis,value,u,u0,u1,v,v0,v1]of planes){
   const before=old[axis]-value,after=b[axis]-value,side=before<0?-1:1;
   if(Math.abs(before)<r||after*side>=r||after===before)continue;
   const t=(side*r-before)/(after-before);if(t<0||t>1)continue;
   const a=old[u]+(b[u]-old[u])*t,c=old[v]+(b[v]-old[v])*t;
   if(a<u0||a>u1||c<v0||c>v1)continue;
   b[axis]=value+side*(r+.001);if(b['v'+axis]*side<0)b['v'+axis]*=-.3;b.dribbler='';hit=true;
  }
 }
 return hit;
}
export function soccerStrandedGoal(g,F,time){
 const b=g.ball;
 if(b.keeperOwner!==undefined||time<Number(b.resetUntil||0)){g.goalRecovery=null;return null;}
 const side=b.z<F.near-F.radius?0:b.z>F.far+F.radius?1:-1;
 if(side<0){g.goalRecovery=null;return null;}
 const center=(side===0?F.nearGoalX:F.farGoalX)??23,line=side===0?F.near:F.far;
 const inside=Math.abs(b.x-center)<F.goal/2-F.postRadius-F.radius&&b.y+F.radius<F.goalHeight-F.postRadius&&Math.abs(b.z-line)<F.goalDepth+F.radius;
 if(!g.goalRecovery||g.goalRecovery.side!==side||g.goalRecovery.inside!==inside)g.goalRecovery={side,inside,at:time};
 if(time-g.goalRecovery.at<(inside?0:1500))return null;
 g.goalRecovery=null;return {score:inside,team:side===0?1:0};
}
