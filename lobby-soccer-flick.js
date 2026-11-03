import {classifySoccerGesture,SOCCER_SKILLS} from './lobby-soccer-skills.js';
import './lobby-soccer-flick.css';

export function createSoccerFlickControls({document,window,context,send,clock=()=>window.performance.now()}){
 const zone=document.createElement('div');zone.id='soccerFlickZone';zone.hidden=true;zone.setAttribute('role','application');zone.setAttribute('aria-label','サッカーのフリック操作');zone.tabIndex=0;
 zone.innerHTML='<svg aria-hidden="true"><path></path><circle r="8"/></svg><div class="soccerFlickGuide"><strong>フリック · アドバンス</strong><span>フリック：パス ／ 長押し→フリック：シュート</span><span>横→上：ダブルタッチ ／ 半円：ルーレット ／ 下→上：ヒールリフト</span><i><b></b></i><output aria-live="polite"></output></div>';
 document.body.append(zone);const path=zone.querySelector('path'),dot=zone.querySelector('circle'),output=zone.querySelector('output'),powerBar=zone.querySelector('b');
 let gesture=null,raf=0,noticeUntil=0;
 function clear(){if(raf)window.cancelAnimationFrame(raf);raf=0;gesture=null;zone.classList.remove('holding');path.setAttribute('d','');dot.style.display='none';powerBar.style.transform='scaleX(0)';}
 function notice(text){output.textContent=text;noticeUntil=clock()+1700;}
 function draw(){
  if(!gesture)return;const c=context();if(!c.visible||!c.enabled||!document.hasFocus()){clear();return;}
  const points=gesture.points,move=classifySoccerGesture(points),power=Math.min(1,(clock()-gesture.at)/900);
  path.setAttribute('d',points.map((p,i)=>(i?'L':'M')+(p.x-gesture.rect.left)+' '+(p.y-gesture.rect.top)).join(' '));dot.setAttribute('cx',points.at(-1).x-gesture.rect.left);dot.setAttribute('cy',points.at(-1).y-gesture.rect.top);dot.style.display='';
  powerBar.style.transform='scaleX('+power+')';output.textContent=move?SOCCER_SKILLS[move.skill].name:clock()-gesture.at>=280?'シュート '+Math.round(power*100)+'%':'パス';raf=window.requestAnimationFrame(draw);
 }
 zone.addEventListener('pointerdown',event=>{
  if(event.button!==0||gesture)return;event.preventDefault();event.stopPropagation();const c=context();
  if(!c.enabled){notice(c.pending?'操作を送信中…':'ボールに近づいて操作');return;}
  const rect=zone.getBoundingClientRect();gesture={id:event.pointerId,at:clock(),points:[{x:event.clientX,y:event.clientY}],rect,basis:c};zone.setPointerCapture?.(event.pointerId);zone.classList.add('holding');draw();
 },{passive:false});
 zone.addEventListener('pointermove',event=>{if(!gesture||event.pointerId!==gesture.id)return;event.preventDefault();event.stopPropagation();const points=gesture.points,samples=event.getCoalescedEvents?.()||[];for(const sample of samples.length?samples:[event]){const p={x:sample.clientX,y:sample.clientY};if(Math.hypot(p.x-points.at(-1).x,p.y-points.at(-1).y)>3){points.push(p);if(points.length>100)points.splice(1,1);}}},{passive:false});
 zone.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;event.preventDefault();event.stopPropagation();const g=gesture,c=context(),age=clock()-g.at;
  const end={x:event.clientX,y:event.clientY};if(Math.hypot(end.x-g.points.at(-1).x,end.y-g.points.at(-1).y)>3)g.points.push(end);
  const move=classifySoccerGesture(g.points),dx=end.x-g.points[0].x,dy=end.y-g.points[0].y;clear();zone.releasePointerCapture?.(event.pointerId);if(!c.visible||!c.enabled)return;
  if(move){if(!c.canSkill){notice('ボールをキープしてフェイント');return;}send('soccer-skill',{...move,yaw:c.yaw});notice(SOCCER_SKILLS[move.skill].name);}
  else if(Math.hypot(dx,dy)>26){const b=g.basis,x=dx*b.rightX-dy*b.forwardX,z=dx*b.rightZ-dy*b.forwardZ,mode=age>=280?'shot':'pass';send('kick',{mode,yaw:Math.atan2(x,z),power:Math.max(.16,Math.min(1,age/900))});notice(mode==='shot'?'シュート':'パス');}
  else notice('指を滑らせて離す');
 },{passive:false});
 zone.addEventListener('pointercancel',clear);zone.addEventListener('lostpointercapture',clear);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 zone.addEventListener('keydown',event=>{if(event.key==='Escape'){clear();return;}const c=context();if(!c.visible||!c.enabled||event.repeat)return;const skills={q:'doubleTouch',e:'roulette',r:'heelLift'},kind=skills[event.key.toLowerCase()];if(kind&&c.canSkill){event.preventDefault();send('soccer-skill',{skill:kind,side:event.shiftKey?-1:1,yaw:c.yaw});}else if(['x','c'].includes(event.key.toLowerCase())){event.preventDefault();send('kick',{mode:event.key.toLowerCase()==='x'?'pass':'shot',yaw:c.yaw,power:.6});}});
 function update(){const c=context();zone.hidden=!c.visible;zone.classList.toggle('available',!!c.enabled);if(!c.visible||!c.enabled){if(gesture)clear();}if(!gesture&&clock()>noticeUntil)output.textContent=c.enabled?'右側の画面で操作':'ボールに近づいて操作';}
 return{update,cancel:clear};
}
