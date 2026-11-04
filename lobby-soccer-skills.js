// Original motion curves. The host and the renderer share the same contact clock.
export const SOCCER_SKILLS={
 doubleTouch:{name:'ダブルタッチ',duration:680,release:680,speed:4.6,lift:.25,cooldown:1050},
 roulette:{name:'ルーレット',duration:960,release:960,speed:4.2,lift:.3,cooldown:1350},
 heelLift:{name:'ヒールリフト',duration:1120,release:430,speed:4.8,lift:7,cooldown:1450}
};
// Contact, follow-through and recovery share one clock on the host and renderer.
export function sampleSoccerDribble(age,walking=true,rollAge=-1,rollSide=1,dashing=false,phaseOverride=null){
 const cycle=phaseOverride??Math.max(0,age)/(dashing?340:300),step=Math.floor(cycle),u=cycle-step,foot=step%2,phase=cycle*Math.PI;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const contact=walking?(u<.25?smooth(u/.25):1-smooth((u-.25)/.28)):0,contacts=[0,0];contacts[foot]=contact;
 const push=smooth((u-.22)/.21)*(1-smooth((u-.49)/.51)),side=foot===0?-1:1;
 let x=walking?side*.16*(1-smooth((u-.53)/.47)*2):0,z=.64+(walking?push*(dashing?.82:.27):0);
 const sole=rollAge>=0&&rollAge<320?Math.sin(rollAge/320*Math.PI):0;
 if(sole){contacts[rollSide<0?0:1]=sole;contacts[rollSide<0?1:0]=0;x=rollSide*.12*sole;z-=.1*sole;}
 return {x,z,contacts,phase,sole,foot:sole?(rollSide<0?0:1):foot,push,stride:dashing?1.2:.65};
}
export function sampleSoccerSkill(kind,age,side=1){
 const skill=SOCCER_SKILLS[kind];if(!skill||age<0||age>skill.duration)return null;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const curve=(frames,t)=>{let i=1;while(i<frames.length-1&&t>frames[i][0])i++;const a=frames[i-1],b=frames[i],u=smooth((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*u);};
 const p=age/skill.duration,w=Math.sin(Math.PI*p),s=side<0?-1:1;
 let points,turn=0,left=0,right=0,lean=0,bank=0,bounce=0,stance=0,travelX=0,travelZ=0,plant=0;
 if(kind==='doubleTouch'){
  points=[[0,0,.74,.3],[.18,-.34,.55,.3],[.43,.45,.58,.3],[.77,.24,.72,.3],[1,0,.74,.3]];
  travelX=.62*smooth(p/.5);travelZ=1.8*smooth((p-.28)/.72);
  left=-.65*Math.sin(Math.PI*Math.min(1,p/.44));right=-.85*Math.sin(Math.PI*Math.max(0,(p-.28)/.72));bank=s*.2*Math.sin(p*Math.PI*2);lean=.12*w;stance=.1*w;
 }else if(kind==='roulette'){
  points=[[0,0,.74,.3],[.16,.28,.56,.3],[.36,.36,-.18,.3],[.50,.24,-.42,.3],[.66,-.30,.05,.3],[.84,-.20,.84,.3],[1,0,.74,.3]];
  // First half: pivot around the planted right foot. Then step around and accelerate out.
  turn=s*curve([[0,0],[.16,.18*Math.PI],[.40,.94*Math.PI],[.64,1.55*Math.PI],[.84,2*Math.PI],[1,2*Math.PI]],p)[0];
  const pivotX=.23*(1-Math.cos(turn)),pivotZ=.23*Math.sin(turn)*s;
  const escape=smooth((p-.45)/.55);travelX=pivotX*(1-escape)+1.05*escape;travelZ=pivotZ*(1-escape)+2.8*escape;
  plant=1-smooth((p-.40)/.12);left=-.65*Math.sin(Math.PI*Math.min(1,p/.6));right=-.5*Math.sin(Math.PI*Math.max(0,(p-.45)/.55));bank=s*.12*w*(1-plant);lean=.12*w;stance=.08*w;
 }else{
  points=[[0,0,.85,.3],[.16,0,.1,.3],[.29,0,-.3,.33],[.384,0,-.36,.55],[1,0,1.3,.55]];
  travelZ=3.0*smooth((p-.27)/.73);
  left=curve([[0,0],[.22,.35],[.38,1.3],[.56,-.55],[1,0]],p)[0];right=curve([[0,0],[.22,-.4],[.38,1.05],[.56,-.35],[1,0]],p)[0];lean=curve([[0,0],[.25,.28],[.4,-.24],[.65,.16],[1,0]],p)[0];bounce=.12*Math.sin(Math.PI*Math.max(0,Math.min(1,(p-.27)/.4)));stance=-.10*w;
 }
 const [x,z,y]=curve(points,p);
 return{side:s,x:x*s,z,y,turn,left:s<0?right:left,right:s<0?left:right,lean,bank,bounce,stance,weight:w,travelX:travelX*s,travelZ,plant};
}

// Compound strokes select skills; straight strokes remain passes and shots.
export function classifySoccerGesture(points){
 if(points.length<2)return null;const origin=points[0],last=points.at(-1),dx=last.x-origin.x,dy=last.y-origin.y;
 const segments=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(Math.hypot(b.x-a.x,b.y-a.y)>=4)segments.push(Math.atan2(b.y-a.y,b.x-a.x));}
 let turn=0;for(let i=1;i<segments.length;i++)turn+=Math.atan2(Math.sin(segments[i]-segments[i-1]),Math.cos(segments[i]-segments[i-1]));
 const length=points.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-points[i].x,p.y-points[i].y),0);
 const down=Math.max(...points.map(p=>p.y-origin.y));
 if(down>22&&dy< -25&&Math.abs(dx)<Math.max(35,-dy*.7))return{skill:'heelLift',side:1};
 // Accept rounded corners and diagonals on small screens; a sharp L is not required.
 const corner=points.slice(1,-1).find(p=>{const side=p.x-origin.x,rise=p.y-last.y;return Math.abs(side)>=18&&Math.abs(p.y-origin.y)<Math.max(22,Math.abs(side)*.65)&&rise>=24&&dy< -15&&Math.abs(last.x-p.x)<Math.max(36,rise*.65);});
 if(corner&&Math.abs(turn)<2.65)return{skill:'doubleTouch',side:corner.x>origin.x?1:-1};
 if(length>65&&Math.abs(turn)>2.2)return{skill:'roulette',side:turn>0?1:-1};
 return null;
}
