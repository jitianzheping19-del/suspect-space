import {SOCCER_SKILLS} from './lobby-soccer-skills.js';
import './lobby-soccer-flick.css';

export function createSoccerFlickControls({document,window,context,send,clock=()=>window.performance.now(),readStick=()=>window.__spaceInputVector||{x:0,z:0}}){
 const zone=document.createElement('div');zone.id='soccerFlickZone';zone.hidden=true;zone.setAttribute('role','application');zone.setAttribute('aria-label','サッカー操作。右側を押してジョイスティックを横でルーレット、前でダブルタッチ、後ろでヒールリフト');zone.tabIndex=0;
 zone.innerHTML='<svg aria-hidden="true"><path></path><circle r="8"/></svg><div class="soccerFlickGuide"><strong>フリック · アドバンス</strong><span>フリック：パス ／ 長押し→フリック：シュート</span><span>右側を押してスティック：横でルーレット ／ 前でダブルタッチ ／ 後ろでヒールリフト</span><i><b></b></i><output aria-live="polite"></output></div>';
 document.body.append(zone);const path=zone.querySelector('path'),dot=zone.querySelector('circle'),output=zone.querySelector('output'),powerBar=zone.querySelector('b');
 let gesture=null,armed=null,raf=0,noticeUntil=0;
 function clear(keepArmed=false){if(raf)window.cancelAnimationFrame(raf);raf=0;gesture=null;if(!keepArmed)armed=null;zone.classList.remove('holding');path.setAttribute('d','');dot.style.display='none';powerBar.style.transform='scaleX(0)';}
 function notice(text){output.textContent=text;noticeUntil=clock()+1700;}
 function tryStick(c){
  if(!armed)return false;
  if(!c.canSkill||!gesture&&clock()>armed.until){armed=null;return false;}
  const {x=0,z=0}=readStick(),magnitude=Math.hypot(x,z);
  if(magnitude<.25)armed.ready=true;
  // Holding a direction before the right press must not fire a skill by itself.
  if(magnitude<.55||!armed.ready&&Math.hypot(x-armed.x,z-armed.z)<.55)return false;
  const skill=Math.abs(x)>Math.abs(z)?'roulette':z<0?'doubleTouch':'heelLift',side=x<0?-1:1,yaw=armed.yaw;
  clear();send('soccer-skill',{skill,side,yaw});notice(SOCCER_SKILLS[skill].name);return true;
 }
 function draw(){
  raf=0;if(!gesture&&!armed)return;const c=context();if(!c.visible||!c.enabled||!document.hasFocus()){clear();return;}
  if(tryStick(c))return;
  if(gesture){
   const points=gesture.points,power=Math.min(1,(clock()-gesture.at)/900);
   path.setAttribute('d',points.map((p,i)=>(i?'L':'M')+(p.x-gesture.rect.left)+' '+(p.y-gesture.rect.top)).join(' '));dot.setAttribute('cx',points.at(-1).x-gesture.rect.left);dot.setAttribute('cy',points.at(-1).y-gesture.rect.top);dot.style.display='';
   powerBar.style.transform='scaleX('+power+')';output.textContent=armed?'スティックを倒してフェイント':clock()-gesture.at>=280?'シュート '+Math.round(power*100)+'%':'パス';
  }
  if(gesture||armed)raf=window.requestAnimationFrame(draw);
 }
 zone.addEventListener('pointerdown',event=>{
  if(event.button!==0||gesture)return;event.preventDefault();event.stopPropagation();const c=context();
  if(!c.visible||!c.enabled){notice(c.pending?'操作を送信中…':'ボールに近づいて操作');return;}
  clear();const stick=readStick();armed=c.canSkill?{x:stick.x,z:stick.z,yaw:c.yaw,ready:Math.hypot(stick.x,stick.z)<.25,until:Infinity}:null;
  const rect=zone.getBoundingClientRect();gesture={id:event.pointerId,at:clock(),points:[{x:event.clientX,y:event.clientY}],rect,basis:c};zone.setPointerCapture?.(event.pointerId);zone.classList.add('holding');draw();
 },{passive:false});
 zone.addEventListener('pointermove',event=>{if(!gesture||event.pointerId!==gesture.id)return;event.preventDefault();event.stopPropagation();const points=gesture.points,samples=event.getCoalescedEvents?.()||[];for(const sample of samples.length?samples:[event]){const p={x:sample.clientX,y:sample.clientY};if(Math.hypot(p.x-points.at(-1).x,p.y-points.at(-1).y)>3){points.push(p);if(points.length>100)points.splice(1,1);}if(Math.hypot(p.x-points[0].x,p.y-points[0].y)>26)armed=null;}},{passive:false});
 zone.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;event.preventDefault();event.stopPropagation();const g=gesture,c=context(),age=clock()-g.at;
  const end={x:event.clientX,y:event.clientY};if(Math.hypot(end.x-g.points.at(-1).x,end.y-g.points.at(-1).y)>3)g.points.push(end);
  const dx=end.x-g.points[0].x,dy=end.y-g.points[0].y,isFlick=Math.hypot(dx,dy)>26;
  clear(!isFlick);zone.releasePointerCapture?.(event.pointerId);if(!c.visible||!c.enabled){clear();return;}
  if(isFlick){const b=g.basis,x=dx*b.rightX-dy*b.forwardX,z=dx*b.rightZ-dy*b.forwardZ,mode=age>=280?'shot':'pass';send('kick',{mode,yaw:Math.atan2(x,z),power:Math.max(.16,Math.min(1,age/900))});notice(mode==='shot'?'シュート':'パス');}
  else if(armed){armed.until=clock()+1000;notice('スティックを倒してフェイント');draw();}
  else notice('ボールをキープしてフェイント');
 },{passive:false});
 zone.addEventListener('pointercancel',()=>clear());zone.addEventListener('lostpointercapture',()=>{if(gesture)clear();});window.addEventListener('blur',()=>clear());document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 zone.addEventListener('keydown',event=>{if(event.key==='Escape'){clear();return;}const c=context();if(!c.visible||!c.enabled||event.repeat)return;const skills={q:'doubleTouch',e:'roulette',r:'heelLift'},kind=skills[event.key.toLowerCase()];if(kind&&c.canSkill){event.preventDefault();clear();send('soccer-skill',{skill:kind,side:event.shiftKey?-1:1,yaw:c.yaw});}else if(['x','c'].includes(event.key.toLowerCase())){event.preventDefault();clear();send('kick',{mode:event.key.toLowerCase()==='x'?'pass':'shot',yaw:c.yaw,power:.6});}});
 function update(){const c=context();zone.hidden=!c.visible;zone.classList.toggle('available',!!c.enabled);if(!c.visible||!c.enabled){if(gesture||armed)clear();}if(!gesture&&!armed&&clock()>noticeUntil)output.textContent=c.enabled?'右側の画面で操作':'ボールに近づいて操作';}
 return{update,cancel:clear};
}
