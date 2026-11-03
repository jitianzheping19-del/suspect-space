import {SOCCER_SKILLS} from './lobby-soccer-skills.js';
import {SOCCER_PRESS} from './lobby-soccer-press.js';
import {createSoccerAction3D} from './lobby-soccer-action-3d.js';
import './lobby-soccer-flick.css';

export function createSoccerFlickControls({document,window,context,send,sendPress=held=>send('soccer-press',{held}),clock=()=>window.performance.now(),readStick=()=>window.__spaceInputVector||{x:0,z:0}}){
 const zone=document.createElement('div');zone.id='soccerFlickZone';zone.hidden=true;zone.setAttribute('role','application');zone.setAttribute('aria-label','サッカー操作。右側を押してジョイスティックを横でルーレット、前でダブルタッチ、後ろでヒールリフト');zone.tabIndex=0;
 zone.innerHTML='<svg aria-hidden="true"><path></path><circle r="8"/></svg><div class="soccerFlickGuide"><strong>フリック · アドバンス</strong><span>フリック：パス ／ 長押し→フリック：シュート</span><span>右側を押してスティック：横でルーレット ／ 前でダブルタッチ ／ 後ろでヒールリフト</span><i><b></b></i><output aria-live="polite"></output></div>';
 document.body.append(zone);const path=zone.querySelector('path'),dot=zone.querySelector('circle'),output=zone.querySelector('output'),powerBar=zone.querySelector('b');
 const feintButton=document.createElement('button');feintButton.id='soccerFeintBtn';feintButton.type='button';feintButton.hidden=true;feintButton.dataset.spacePointerAction='direct';
 feintButton.innerHTML='<svg viewBox="0 0 40 32" aria-hidden="true"><path d="M7 26V19Q7 14 14 14H26Q33 14 33 7V5M27 10L33 4L38 10"/><circle cx="7" cy="26" r="4"/></svg><span>フェイント</span><small></small>';
 feintButton.title='フェイント：横方向でルーレット、後ろでヒールリフト、それ以外はダブルタッチ';document.body.append(feintButton);
 let gesture=null,armed=null,raf=0,noticeUntil=0;
 const buttonLabel=feintButton.querySelector('span'),buttonHint=feintButton.querySelector('small'),buttonIcon=feintButton.querySelector('path');
 const feedback=document.createElement('output');feedback.id='soccerDuelFeedback';feedback.hidden=true;feedback.setAttribute('aria-live','polite');document.body.append(feedback);
 const model=createSoccerAction3D(feintButton),stickPointers=new Set(),stickTouches=new Set();
 const stickActive=()=>stickPointers.size>0||stickTouches.size>0||Math.hypot(readStick().x||0,readStick().z||0)>.08;
 document.addEventListener('pointerdown',event=>{if(event.target.closest?.('#stick')){stickPointers.add(event.pointerId);update();}},true);
 for(const type of ['pointerup','pointercancel'])document.addEventListener(type,event=>{if(stickPointers.delete(event.pointerId))update();},true);
 document.addEventListener('touchstart',event=>{if(event.target.closest?.('#stick')){for(const t of event.changedTouches)stickTouches.add(t.identifier);update();}},{passive:true,capture:true});
 for(const type of ['touchend','touchcancel'])document.addEventListener(type,event=>{for(const id of stickTouches)if(![...event.touches].some(t=>t.identifier===id))stickTouches.delete(id);update();},{passive:true,capture:true});
 let feintPointerAt=-Infinity,pressHold=null,pressRAF=0,lastDuel='',feedbackUntil=0;
 const hasBall=c=>c.hasBall??c.canSkill;
 function stopPress(){
  const hold=pressHold;pressHold=null;if(pressRAF)window.cancelAnimationFrame(pressRAF);pressRAF=0;
  feintButton.classList.remove('pressHolding');feintButton.setAttribute('aria-pressed','false');
  if(hold?.sent)sendPress(false);
  if(hold?.pointer!==undefined&&feintButton.hasPointerCapture?.(hold.pointer))feintButton.releasePointerCapture(hold.pointer);
 }
 function pulsePress(){
  pressRAF=0;const c=context(),hold=pressHold;if(!hold)return;
  if(!c.visible||!c.canPress||hasBall(c)||stickActive()||!document.hasFocus()||document.hidden||c.press?.outcome){stopPress();return;}
  const age=clock()-hold.at;
  feintButton.style.setProperty('--press-fill',String(hold.sent?c.press?.energy??1:Math.min(1,age/SOCCER_PRESS.hold)));
  if(age>=SOCCER_PRESS.hold&&(!hold.sent||clock()-hold.lastSent>=SOCCER_PRESS.heartbeat)){
   hold.sent=true;hold.lastSent=clock();sendPress(true);
  }
  if(pressHold===hold)pressRAF=window.requestAnimationFrame(pulsePress);
 }
 function startPress(pointer,key){
  const c=context();if(pressHold||!c.visible||!c.canPress||hasBall(c))return;
  clear();pressHold={pointer,key,at:clock(),sent:false,lastSent:0};
  feintButton.classList.add('pressHolding');feintButton.setAttribute('aria-pressed','true');
  if(pointer!==undefined)feintButton.setPointerCapture?.(pointer);pulsePress();
 }
 function activateFeint(){
  const c=context();if(!c.visible||!c.enabled||!c.canSkill)return;
  const {x=0,z=0}=readStick(),skill=Math.hypot(x,z)<.55?'doubleTouch':Math.abs(x)>Math.abs(z)?'roulette':z>0?'heelLift':'doubleTouch';
  clear();send('soccer-skill',{skill,side:x<0?-1:1,yaw:c.yaw});notice(SOCCER_SKILLS[skill].name);
 }
 function activateDash(){const c=context();if(!c.visible||!c.canDash||!stickActive())return;stopPress();clear();send('soccer-dash',{});notice('ダッシュ');}
 feintButton.addEventListener('pointerdown',event=>{if(event.button!==0||feintButton.disabled||pressHold)return;event.preventDefault();event.stopPropagation();feintPointerAt=clock();if(stickActive())activateDash();else if(hasBall(context()))activateFeint();else startPress(event.pointerId);},{passive:false});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])feintButton.addEventListener(type,event=>{if(pressHold?.pointer!==event.pointerId)return;event.preventDefault();event.stopPropagation();feintPointerAt=clock();stopPress();});
 feintButton.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(clock()-feintPointerAt>650){if(stickActive())activateDash();else if(hasBall(context()))activateFeint();}});
 feintButton.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;if(event.repeat){event.preventDefault();return;}if(stickActive()||hasBall(context()))feintPointerAt=-Infinity;else{event.preventDefault();event.stopPropagation();startPress(undefined,event.key);}});
 feintButton.addEventListener('keyup',event=>{if(pressHold?.key===event.key){event.preventDefault();stopPress();}});
 feintButton.addEventListener('blur',()=>stopPress());
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
  if(c.visible&&stickActive()){
   if(!c.canDash&&!c.enabled)return;clear();gesture={id:event.pointerId,at:clock(),points:[{x:event.clientX,y:event.clientY}],rect:zone.getBoundingClientRect(),basis:c,dash:true};zone.setPointerCapture?.(event.pointerId);return;
  }
  if(!c.visible||!c.enabled){notice(c.pending?'操作を送信中…':'ボールに近づいて操作');return;}
  clear();const stick=readStick();armed=c.canSkill?{x:stick.x,z:stick.z,yaw:c.yaw,ready:Math.hypot(stick.x,stick.z)<.25,until:Infinity}:null;
  const rect=zone.getBoundingClientRect();gesture={id:event.pointerId,at:clock(),points:[{x:event.clientX,y:event.clientY}],rect,basis:c};zone.setPointerCapture?.(event.pointerId);zone.classList.add('holding');draw();
 },{passive:false});
 zone.addEventListener('pointermove',event=>{if(!gesture||event.pointerId!==gesture.id)return;event.preventDefault();event.stopPropagation();const points=gesture.points,samples=event.getCoalescedEvents?.()||[];for(const sample of samples.length?samples:[event]){const p={x:sample.clientX,y:sample.clientY};if(Math.hypot(p.x-points.at(-1).x,p.y-points.at(-1).y)>3){points.push(p);if(points.length>100)points.splice(1,1);}if(Math.hypot(p.x-points[0].x,p.y-points[0].y)>26)armed=null;}},{passive:false});
 zone.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id)return;event.preventDefault();event.stopPropagation();const g=gesture,c=context(),age=clock()-g.at;
  const end={x:event.clientX,y:event.clientY};if(Math.hypot(end.x-g.points.at(-1).x,end.y-g.points.at(-1).y)>3)g.points.push(end);
  const dx=end.x-g.points[0].x,dy=end.y-g.points[0].y,isFlick=Math.hypot(dx,dy)>26;
  clear(!isFlick);zone.releasePointerCapture?.(event.pointerId);if(g.dash&&!isFlick){activateDash();return;}if(!c.visible||!c.enabled){clear();return;}
  if(isFlick){const b=g.basis,x=dx*b.rightX-dy*b.forwardX,z=dx*b.rightZ-dy*b.forwardZ,mode=age>=280?'shot':'pass';send('kick',{mode,yaw:Math.atan2(x,z),power:Math.max(.16,Math.min(1,age/900))});notice(mode==='shot'?'シュート':'パス');}
  else if(armed){armed.until=clock()+1000;notice('スティックを倒してフェイント');draw();}
  else notice('ボールをキープしてフェイント');
 },{passive:false});
 function cancelAll(){clear();stopPress();stickPointers.clear();stickTouches.clear();}
 zone.addEventListener('pointercancel',()=>clear());zone.addEventListener('lostpointercapture',()=>{if(gesture)clear();});window.addEventListener('blur',cancelAll);window.addEventListener('pagehide',cancelAll);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAll();});
 zone.addEventListener('keydown',event=>{if(event.key==='Escape'){clear();return;}const c=context();if(!c.visible||!c.enabled||event.repeat)return;const skills={q:'doubleTouch',e:'roulette',r:'heelLift'},kind=skills[event.key.toLowerCase()];if(kind&&c.canSkill){event.preventDefault();clear();send('soccer-skill',{skill:kind,side:event.shiftKey?-1:1,yaw:c.yaw});}else if(['x','c'].includes(event.key.toLowerCase())){event.preventDefault();clear();send('kick',{mode:event.key.toLowerCase()==='x'?'pass':'shot',yaw:c.yaw,power:.6});}});
 function update(){
  const c=context(),dash=stickActive(),attack=!!hasBall(c);zone.hidden=feintButton.hidden=!c.visible;
  if(pressHold&&(!c.visible||attack||dash||!c.canPress||c.press?.outcome))stopPress();
  feintButton.disabled=dash?!c.canDash:attack?!c.enabled||!c.canSkill:!c.canPress;feintButton.dataset.mode=dash?'dash':attack?'feint':'press';
  buttonLabel.textContent=dash?'ダッシュ':attack?'フェイント':'プレス';
  const labels={chase:'追走中',jockey:'間合いを詰める',reach:'踏み込み',recover:'体勢を戻す'};
  buttonHint.textContent=dash?(c.dashing?'加速中':'タップで加速'):attack?'':pressHold?(labels[c.press?.phase]||'長押しで追走'):c.recovering?'息を整える':c.canPress?'長押し':c.teammateBall?'味方がキープ中':'相手のボール待ち';
  feintButton.title=dash?'タップでダッシュ':attack?'フェイント：右側を押してスティックで技を選択':'長押しでボール保持者にプレス。離すと停止';
  feintButton.setAttribute('aria-label',buttonLabel.textContent+' '+buttonHint.textContent);
  buttonIcon.setAttribute('d',dash?'M4 8H16M2 16H12M4 24H16M22 7L32 16L22 25':attack?'M7 26V19Q7 14 14 14H26Q33 14 33 7V5M27 10L33 4L38 10':'M4 6L14 16L4 26M15 6L25 16L15 26M31 6V26');
  const duel=c.duel,key=duel?duel.at+':'+duel.text:'';
  if(duel&&key!==lastDuel){lastDuel=key;feedback.textContent=duel.text;feedback.dataset.result=duel.result;feedbackUntil=clock()+1300;}
  feedback.hidden=!c.visible||clock()>=feedbackUntil;
  zone.classList.toggle('available',!!c.enabled);if(!c.visible||!c.enabled&&!gesture?.dash){if(gesture||armed)clear();}if(!gesture&&!armed&&clock()>noticeUntil)output.textContent=c.enabled?'右側の画面で操作':'ボールに近づいて操作';
  model.draw(clock(),feintButton.dataset.mode,!!pressHold);
 }
 return{update,cancel:cancelAll};
}
