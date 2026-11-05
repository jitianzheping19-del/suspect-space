// Original motion curves. The host and the renderer share the same contact clock.
export const SOCCER_SKILLS={
 scissors:{name:'シザース',duration:1000,release:1000,speed:3,lift:.3,cooldown:1400},
 nutmeg:{name:'股抜き',duration:1050,release:320,speed:7.5,lift:.3,cooldown:1800},
 shotFeint:{name:'キックフェイント',duration:700,release:700,speed:3.8,lift:.3,cooldown:1100},
 doubleTouch:{name:'ダブルタッチ',duration:680,release:680,speed:4.6,lift:.25,cooldown:1050},
 roulette:{name:'ルーレット',duration:960,release:960,speed:4.2,lift:.3,cooldown:1350},
 heelLift:{name:'ヒールリフト',duration:1120,release:430,speed:4.8,lift:7,cooldown:1450}
};
export const SOCCER_CLOSE_TOUCH={duration:560,repeat:620,deadDistance:.0005};
// Track real displacement so a short nudge survives a false walking flag or a sparse pose update.
export function updateSoccerDribble(control,p,time,dt,sprinting=false,skillActive=false){
 const yaw=Number(p.yaw)||0,dx=p.x-(control.x??p.x),dz=p.z-(control.z??p.z),distance=Math.hypot(dx,dz);
 const traveled=distance<1.5?(control.travelRemainder||0)+distance:0;
 const moved=traveled>=SOCCER_CLOSE_TOUCH.deadDistance&&distance>0&&distance<1.5;control.travelRemainder=moved?0:traveled;
 const lastAt=Number(control.sampleAt??(time-Math.max(.001,dt)*1000)),elapsed=Math.max(1/120,Math.min(.25,(time-lastAt)/1000));
 if(moved){
  const speed=Math.min(7,traveled/elapsed),blend=1-Math.exp(-elapsed*18);control.speed=control.speed===undefined?speed:control.speed+(speed-control.speed)*blend;control.sampleAt=time;control.lastMoveAt=time;
  const localX=dx*Math.cos(yaw)-dz*Math.sin(yaw),localZ=dx*Math.sin(yaw)+dz*Math.cos(yaw);
  control.directionX=localX/distance;control.directionZ=localZ/distance;
 }else if(time-Number(control.lastMoveAt??time)>150)control.speed=(control.speed||0)*Math.exp(-Math.max(0,dt)*12);
 const walking=!!p.walking||moved||time-Number(control.lastMoveAt??-Infinity)<110;
 const backwards=control.directionZ<-.4,precision=!sprinting&&(backwards||(control.speed??(walking?.6:0))<1.35);
 const duration=control.rollDuration||SOCCER_CLOSE_TOUCH.duration,age=control.rollAt===undefined?Infinity:time-control.rollAt;
 const start=walking&&!control.walking,stop=!walking&&control.walking;
 const turning=moved&&Math.hypot((control.directionX||0)-(control.rollX||0),(control.directionZ||0)-(control.rollZ||0))>.9;
 if(!skillActive&&!sprinting&&(start&&age>=duration||precision&&walking&&moved&&age>=SOCCER_CLOSE_TOUCH.repeat||precision&&turning&&age>=duration||stop&&age>=duration)){
  const x=control.directionX||0,z=control.directionZ||0;
  control.rollAt=time;control.rollDuration=SOCCER_CLOSE_TOUCH.duration;control.rollKind=stop?'stop':Math.abs(x)>.55?'lateral':z<-.4?'drag':'nudge';
  control.rollSide=Math.abs(x)>.2?(x<0?-1:1):-(control.rollSide||-1);control.rollX=x;control.rollZ=z;
 }
 if(skillActive||sprinting)delete control.rollAt;
 control.walking=walking;control.precision=precision;control.x=p.x;control.z=p.z;
 // Sample pose updates once, then extrapolate only the bounded contact clock on the renderer.
 control.phaseRate=walking&&!skillActive?Math.max(.35,Math.min(5,(control.speed??.6)/(sprinting?1.15:.85))):0;
 control.phase=(control.phase||0)+Math.max(0,Math.min(.1,dt))*control.phaseRate;control.phaseAt=time;
 return control;
}
// Contact, follow-through and recovery share one clock on the host and renderer.
export function sampleSoccerDribble(age,walking=true,rollAge=-1,rollSide=1,dashing=false,phaseOverride=null,control=null){
 const cycle=phaseOverride??Math.max(0,age)/(dashing?340:300),step=Math.floor(cycle),u=cycle-step,foot=step%2,phase=cycle*Math.PI;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const contact=walking?(u<.25?smooth(u/.25):1-smooth((u-.25)/.28)):0,contacts=[0,0];contacts[foot]=contact;
 const push=smooth((u-.22)/.21)*(1-smooth((u-.49)/.51)),side=foot===0?-1:1;
 let x=walking?side*.16*(1-smooth((u-.53)/.47)*2):0,z=.64+(walking?push*(dashing?.82:.27):0);
 const duration=control?.rollDuration||320,close=!!control?.precision;
 if(close){x*=.45;z=.64+(z-.64)*.35;}
 const uRoll=rollAge/duration,sole=rollAge>=0&&rollAge<duration?(control?.rollKind?smooth(uRoll/.23)*(1-smooth((uRoll-.63)/.37)):Math.sin(uRoll*Math.PI)):0;
 if(sole){
  contacts[rollSide<0?0:1]=sole;contacts[rollSide<0?1:0]=0;
  const roll=smooth((uRoll-.24)/.32)*(1-smooth((uRoll-.68)/.32)),kind=control?.rollKind;
  x=rollSide*(kind==='lateral'?.27:.10)*roll;
  z=.64+(kind==='drag'?-.22:kind==='nudge'?.13:kind==='stop'?-.10:-.06)*roll;
  if(!kind){x=rollSide*.12*sole;z=.64-.1*sole;}
 }
 const receiveAge=control?.receiveAt===undefined?-1:age+Number(control.at??0)-control.receiveAt,receiveDuration=control?.receiveDuration||1;
 const receive=receiveAge>=0&&receiveAge<receiveDuration?smooth(receiveAge/45)*(1-smooth((receiveAge-70)/(receiveDuration-70))):0,receiveFoot=control?.receiveSide<0?0:1;
 if(receive&&!sole){contacts[receiveFoot]=Math.max(contacts[receiveFoot],receive);contacts[1-receiveFoot]*=1-receive;x+=(control.receiveSide*.1-x)*receive;z+=.14*receive;}
 return {x,z,contacts,phase,sole,receive,foot:sole?(rollSide<0?0:1):receive?receiveFoot:foot,push,stride:dashing?1.2:close?.32:.65,precision:close};
}
export function sampleSoccerSkill(kind,age,side=1){
 const skill=SOCCER_SKILLS[kind];if(!skill||age<0||age>skill.duration)return null;
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 const curve=(frames,t)=>{let i=1;while(i<frames.length-1&&t>frames[i][0])i++;const a=frames[i-1],b=frames[i],u=smooth((t-a[0])/(b[0]-a[0]));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*u);};
 const p=age/skill.duration,w=Math.sin(Math.PI*p),s=side<0?-1:1;
 let points,turn=0,left=0,right=0,lean=0,bank=0,bounce=0,stance=0,travelX=0,travelZ=0,plant=0;
 if(kind==='scissors'){
  points=[[0,0,.74,.3],[.25,-.08,.7,.3],[.5,.08,.7,.3],[.75,-.13,.8,.3],[1,0,.74,.3]];
  left=-.75*Math.sin(Math.PI*Math.min(1,p*2));right=-.75*Math.sin(Math.PI*Math.max(0,(p-.45)*2));bank=.15*Math.sin(p*Math.PI*4);lean=.1*w;stance=.12*w;travelZ=.8*smooth((p-.7)/.3);
 }else if(kind==='nutmeg'){
  points=[[0,0,.74,.3],[.15,.1,.6,.3],[.305,0,.92,.3],[1,0,.74,.3]];
  right=curve([[0,0],[.17,.6],[.305,-1.15],[.55,-.3],[1,0]],p)[0];left=.25*w;lean=.23*w;travelX=1.1*smooth((p-.32)/.35);travelZ=2*smooth((p-.38)/.62);
 }else if(kind==='shotFeint'){
  points=[[0,0,.74,.3],[.18,.12,.70,.3],[.34,.18,.64,.3],[.56,-.46,.46,.3],[.82,-.28,.70,.3],[1,0,.74,.3]];
  travelX=-.78*smooth((p-.32)/.68);travelZ=1.25*smooth((p-.4)/.6);
  right=curve([[0,0],[.21,.8],[.36,-.65],[.62,.2],[1,0]],p)[0];left=-.35*w;
  lean=.15*w;bank=-s*.18*Math.sin(Math.PI*p);stance=.08*w;
 }else if(kind==='doubleTouch'){
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

export function createSoccerStickGesture(){
 let previous=null,total=0,start=0,last=0,readyAt=0;
 return (x,z,time,enabled)=>{
  if(!enabled||Math.hypot(x,z)<.55||time<readyAt){previous=null;total=0;return 0;}
  const angle=Math.atan2(z,x);if(previous===null||time-last>180||time-start>1500){previous=angle;total=0;start=time;last=time;return 0;}
  const delta=Math.atan2(Math.sin(angle-previous),Math.cos(angle-previous));previous=angle;last=time;
  if(Math.abs(delta)>1.5){total=0;start=time;return 0;}
  if(total&&Math.sign(delta)!==Math.sign(total)&&Math.abs(delta)>.08){total=0;start=time;}total+=delta;
  if(Math.abs(total)>=Math.PI*1.8&&time-start>=200){const side=Math.sign(total);total=0;previous=null;readyAt=time+1400;return side;}return 0;
 };
}
