// Original motion curves. The host and the renderer share the same contact clock.
export const SOCCER_SKILLS={
 doubleTouch:{name:'ダブルタッチ',duration:680,release:520,speed:4.6,lift:.25,cooldown:1050},
 roulette:{name:'ルーレット',duration:960,release:790,speed:4.2,lift:.3,cooldown:1350},
 heelLift:{name:'ヒールリフト',duration:1120,release:430,speed:4.8,lift:7,cooldown:1450}
};
export function sampleSoccerSkill(kind,age,side=1){
 const skill=SOCCER_SKILLS[kind];if(!skill||age<0||age>skill.duration)return null;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const curve=(frames,t)=>{let i=1;while(i<frames.length-1&&t>frames[i][0])i++;const a=frames[i-1],b=frames[i],u=smooth((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*u);};
 const p=age/skill.duration,w=Math.sin(Math.PI*p),s=side<0?-1:1;
 let points,turn=0,left=0,right=0,lean=0,bank=0,bounce=0,stance=0;
 if(kind==='doubleTouch'){
  points=[[0,0,.85,.3],[.18,-.34,.55,.3],[.43,.52,.62,.3],[.77,.64,1.05,.3],[1,.64,1.3,.3]];
  left=-.65*Math.sin(Math.PI*Math.min(1,p/.44));right=-.85*Math.sin(Math.PI*Math.max(0,(p-.28)/.72));bank=s*.2*Math.sin(p*Math.PI*2);lean=.12*w;stance=.1*w;
 }else if(kind==='roulette'){
  points=[[0,0,.85,.3],[.22,.36,.36,.3],[.48,.40,-.40,.3],[.70,-.20,.12,.3],[.83,-.35,.98,.3],[1,-.35,1.3,.3]];
  turn=s*Math.PI*2*smooth(p);left=-.7*Math.sin(p*Math.PI*2);right=.7*Math.sin(p*Math.PI*2+.4);bank=s*.18*w;lean=.16*w;stance=.12*w;
 }else{
  points=[[0,0,.85,.3],[.16,0,.1,.3],[.29,0,-.3,.33],[.384,0,-.36,.55],[1,0,1.3,.55]];
  left=curve([[0,0],[.22,.35],[.38,1.3],[.56,-.55],[1,0]],p)[0];right=curve([[0,0],[.22,-.4],[.38,1.05],[.56,-.35],[1,0]],p)[0];lean=curve([[0,0],[.25,.28],[.4,-.24],[.65,.16],[1,0]],p)[0];bounce=.12*Math.sin(Math.PI*Math.max(0,Math.min(1,(p-.27)/.4)));stance=-.10*w;
 }
 const [x,z,y]=curve(points,p);
 return{side:s,x:x*s,z,y,turn,left:s<0?right:left,right:s<0?left:right,lean,bank,bounce,stance,weight:w};
}

// Compound strokes select skills; straight strokes remain passes and shots.
export function classifySoccerGesture(points){
 if(points.length<2)return null;const origin=points[0],last=points.at(-1),dx=last.x-origin.x,dy=last.y-origin.y;
 const segments=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(Math.hypot(b.x-a.x,b.y-a.y)>=4)segments.push(Math.atan2(b.y-a.y,b.x-a.x));}
 let turn=0;for(let i=1;i<segments.length;i++)turn+=Math.atan2(Math.sin(segments[i]-segments[i-1]),Math.cos(segments[i]-segments[i-1]));
 const length=points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);
 const down=Math.max(...points.map(p=>p.y-origin.y));
 if(down>22&&dy< -25&&Math.abs(dx)<Math.max(35,-dy*.7))return{skill:'heelLift',side:1};
 if(length>65&&Math.abs(turn)>2.2)return{skill:'roulette',side:turn>0?1:-1};
 const corner=points.find(p=>Math.abs(p.x-origin.x)>24&&Math.abs(p.y-origin.y)<18);
 if(corner&&dy< -28&&Math.abs(last.x-corner.x)<30)return{skill:'doubleTouch',side:corner.x>origin.x?1:-1};
 return null;
}
