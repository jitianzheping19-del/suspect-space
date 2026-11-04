import {SOCCER_SKILLS} from './lobby-soccer-skills.js';
import {createSoccerAction3D} from './lobby-soccer-action-3d.js';
import './lobby-soccer-flick.css';

const CHARGE_MS=1200,DASH_HOLD_MS=280,DOUBLE_TAP_MS=300;
export function createSoccerFlickControls({document,window,context,send,onAim=()=>{},sendDash=held=>send('soccer-dash',{held}),clock=()=>window.performance.now(),readStick=()=>window.__spaceInputVector||{x:0,z:0}}){
 const zone=document.createElement('div');zone.id='soccerFlickZone';zone.hidden=true;zone.setAttribute('role','group');zone.setAttribute('aria-label','サッカー操作');
 zone.innerHTML='<button id="soccerFeintBtn" type="button" data-space-pointer-action="direct"><svg viewBox="0 0 40 32" aria-hidden="true"><path d="M7 26V19Q7 14 14 14H26Q33 14 33 7V5M27 10L33 4L38 10"/></svg><span>フェイント</span><small>長押し：ダッシュ</small></button><button id="soccerKickBtn" type="button" data-space-pointer-action="direct"><svg viewBox="0 0 48 42" aria-hidden="true"><circle cx="13" cy="29" r="8"/><path d="M22 25L40 7M27 7H40V20"/></svg><span>パス</span><small>2回タップ：シュート</small></button><output id="soccerDuelFeedback" aria-live="polite" hidden></output>';
 document.body.append(zone);
 const feint=zone.querySelector('#soccerFeintBtn'),kick=zone.querySelector('#soccerKickBtn'),feedback=zone.querySelector('output'),model=createSoccerAction3D(feint);
 let gesture=null,hold=null,raf=0,lastAim='',lastDuel='',feedbackUntil=0,noticeUntil=0,firstTap=null,tapTimer=0;
 const power=()=>gesture?Math.min(1,(clock()-gesture.at)/CHARGE_MS):0;
 function resolve(c,yaw,forceShot=false,lob=false){if(lob){const aim=c.resolveLobAim?.(yaw);if(aim)return aim;}return c.resolveAim?.(yaw,forceShot)||{yaw,mode:'shot',target:''};}
 function paintAim(c){
  const yaw=gesture?.yaw??c.yaw,forceShot=!!gesture?.forceShot,aim=resolve(c,yaw,forceShot,gesture?.lob);
  kick.dataset.mode=c.overheadReady?'overhead':c.headerReady?'header':aim.mode;kick.querySelector('span').textContent=c.overheadReady?'オーバーヘッド':c.headerReady?'ヘディング':aim.mode==='lob'?'フライパス':aim.mode==='pass'?'パス':'シュート';
  kick.querySelector('small').textContent=c.overheadReady?'タップで空中シュート':c.headerReady?'合わせてタップ':aim.mode==='lob'?'離して浮かせる':'狙って戻す：フライ';
  kick.setAttribute('aria-label',c.overheadReady?'タップでオーバーヘッドシュート':c.headerReady?'タップでダイビングヘディング':aim.mode==='lob'?'離して味方へフライパス':(aim.mode==='pass'?'味方へパス':'シュート')+'。狙ってボタンへ戻すとフライパス。2回タップでシュート');
  const value={active:!!c.visible&&!!c.enabled,yaw,forceShot,lob:!!gesture?.lob,charging:!!gesture,power:power()},key=JSON.stringify({...value,yaw:Math.round(yaw*100)/100,power:Math.round(value.power*50)/50});
  if(key!==lastAim){lastAim=key;onAim(value);}
  return aim;
 }
 function releaseCapture(button,id){if(id!==undefined&&button.hasPointerCapture?.(id))button.releasePointerCapture(id);}
 function clearKick(){const old=gesture;gesture=null;kick.classList.remove('holding');kick.setAttribute('aria-pressed','false');releaseCapture(kick,old?.id);}
 function clearFeint(){const old=hold;hold=null;feint.classList.remove('holding');feint.setAttribute('aria-pressed','false');if(old?.dashing)sendDash(false);releaseCapture(feint,old?.id);}
 function clearTap(){window.clearTimeout(tapTimer);tapTimer=0;firstTap=null;}
 function consumeTap(){const twice=!!firstTap&&clock()-firstTap.at<=DOUBLE_TAP_MS;clearTap();return twice;}
 function cancel(){clearTap();clearKick();clearFeint();if(raf)window.cancelAnimationFrame(raf);raf=0;paintAim({...context(),enabled:false});}
 function notice(text){feedback.textContent=text;feedback.hidden=false;noticeUntil=clock()+1300;}
 function animate(){
  raf=0;const c=context();
  if(!c.visible||document.hidden||!document.hasFocus()){cancel();return;}
  if(gesture&&!c.enabled)clearKick();
  if(hold){
   if(clock()-hold.at>=DASH_HOLD_MS){
    hold.long=true;
    if((c.canDash||c.dashing)&&!c.pending&&clock()-hold.lastSent>=250){hold.dashing=true;hold.lastSent=clock();sendDash(true);}
   }
   feint.dataset.mode=hold.dashing?'dash':'feint';feint.querySelector('span').textContent=hold.dashing?'ダッシュ':c.canTrap?'トラップ':'フェイント';
  }
  paintAim(c);model.draw(clock(),hold?.dashing?'dash':'feint',!!hold);
  if(gesture||hold)raf=window.requestAnimationFrame(animate);
 }
 function startAnimation(){if(!raf)raf=window.requestAnimationFrame(animate);}
 function aimAt(event){
  if(!gesture)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
  const rect=kick.getBoundingClientRect(),radius=rect.width/2,fromCenter=Math.hypot(event.clientX-rect.x-radius,event.clientY-rect.y-radius);if(fromCenter>radius+4)gesture.leftButton=true;
  const distance=Math.hypot(dx,dy);gesture.maxTravel=Math.max(gesture.maxTravel||0,distance);
  if(gesture.lobYaw!==undefined&&(distance<18||gesture.leftButton&&fromCenter<radius*.85)&&gesture.maxTravel>32&&!gesture.forceShot){gesture.lob=true;gesture.yaw=gesture.lobYaw;return;}
  if(distance>=24){const b=gesture.basis;gesture.flicked=true;gesture.lob=false;gesture.yaw=Math.atan2(dx*b.rightX-dy*b.forwardX,dx*b.rightZ-dy*b.forwardZ);const target=context().resolveLobAim?.(gesture.yaw);if(distance>=gesture.maxTravel*.75){if(target)gesture.lobYaw=target.yaw;else delete gesture.lobYaw;}}
 }
 kick.addEventListener('pointerdown',event=>{
  const c=context();if(event.button!==0||gesture||!c.visible||!c.enabled||kick.disabled)return;
  event.preventDefault();event.stopPropagation();if(c.overheadReady){clearTap();send('soccer-overhead',{});notice('オーバーヘッド！');return;}if(c.headerReady){clearTap();send('soccer-header',{});notice('ダイビングヘッド');return;}const forceShot=consumeTap();gesture={id:event.pointerId,at:clock(),x:event.clientX,y:event.clientY,yaw:c.yaw,basis:c,forceShot};kick.setPointerCapture?.(event.pointerId);kick.classList.add('holding');kick.setAttribute('aria-pressed','true');paintAim(c);startAnimation();
 },{passive:false});
 kick.addEventListener('pointermove',event=>{if(gesture?.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();aimAt(event);paintAim(context());},{passive:false});
 function shoot(){
  if(!gesture)return;const g=gesture,strength=Math.max(.16,power()),quick=!g.forceShot&&!g.flicked&&clock()-g.at<250;clearKick();
  function commit(){const c=context(),aim=resolve(c,g.yaw,g.forceShot,g.lob);if(g.lob&&!c.resolveLobAim?.(g.yaw)){notice('味方を狙い直してください');paintAim(c);return;}if(c.visible&&c.enabled){send('kick',{mode:aim.mode,yaw:aim.yaw,power:strength});notice(aim.mode==='lob'?'フライパス':aim.mode==='pass'?'パス':'シュート');}paintAim(context());}
  if(quick){clearTap();firstTap={at:clock()};tapTimer=window.setTimeout(()=>{clearTap();commit();},DOUBLE_TAP_MS);}else commit();paintAim(context());
 }
 kick.addEventListener('pointerup',event=>{if(gesture?.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();aimAt(event);shoot();});
 for(const type of ['pointercancel','lostpointercapture'])kick.addEventListener(type,event=>{if(gesture?.id===event.pointerId){clearKick();paintAim(context());}});
 feint.addEventListener('pointerdown',event=>{
  const c=context();if(event.button!==0||hold||!c.visible||feint.disabled)return;event.preventDefault();event.stopPropagation();clearTap();hold={id:event.pointerId,at:clock(),lastSent:-Infinity,long:false,dashing:false};feint.setPointerCapture?.(event.pointerId);feint.classList.add('holding');feint.setAttribute('aria-pressed','true');startAnimation();
 },{passive:false});
 function finishFeint(cancelled=false){
  const old=hold;if(!old)return;const c=context(),tap=!cancelled&&!old.long&&clock()-old.at<DASH_HOLD_MS;clearFeint();
  if(tap&&c.visible&&c.canTrap){send('soccer-trap',{});notice('トラップ');}else if(tap&&c.visible&&c.enabled&&c.canSkill){const {x=0,z=0}=readStick(),skill=Math.hypot(x,z)<.55?'doubleTouch':Math.abs(x)>Math.abs(z)?'roulette':z>0?'heelLift':'doubleTouch';send('soccer-skill',{skill,side:x<0?-1:1,yaw:c.yaw});notice(SOCCER_SKILLS[skill].name);}update();
 }
 feint.addEventListener('pointerup',event=>{if(hold?.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();finishFeint();});
 for(const type of ['pointercancel','lostpointercapture'])feint.addEventListener(type,event=>{if(hold?.id===event.pointerId)finishFeint(true);});
 for(const button of [kick,feint]){
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
  button.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();cancel();return;}if(!['Enter',' '].includes(event.key))return;event.preventDefault();event.stopPropagation();const c=context();if(event.repeat||!c.visible||button.disabled)return;
   if(button===kick&&c.overheadReady){clearTap();send('soccer-overhead',{});notice('オーバーヘッド！');return;}
   if(button===kick&&c.headerReady){clearTap();send('soccer-header',{});notice('ダイビングヘッド');return;}
   if(button===kick&&!gesture&&c.enabled){gesture={key:event.key,at:clock(),yaw:c.yaw,basis:c,forceShot:consumeTap()};kick.classList.add('holding');kick.setAttribute('aria-pressed','true');}
   else if(button===feint&&!hold){clearTap();hold={key:event.key,at:clock(),lastSent:-Infinity,long:false,dashing:false};feint.classList.add('holding');feint.setAttribute('aria-pressed','true');}startAnimation();
  });
  button.addEventListener('keyup',event=>{if(button===kick&&gesture?.key===event.key){event.preventDefault();shoot();}if(button===feint&&hold?.key===event.key){event.preventDefault();finishFeint();}});
  button.addEventListener('blur',()=>{if(button===kick&&gesture?.key){clearKick();paintAim(context());}if(button===feint&&hold?.key)finishFeint(true);});
 }
 zone.addEventListener('contextmenu',event=>event.preventDefault());
 window.addEventListener('touchcancel',cancel,{passive:true});
 window.addEventListener('blur',cancel);window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 function update(){
  const c=context();zone.hidden=!c.visible;
  if(!c.visible){cancel();return;}
  if(firstTap&&!c.enabled)clearTap();
  if(gesture&&!c.enabled)clearKick();
  kick.disabled=!c.enabled;feint.disabled=!hold&&!c.canDash&&!c.canTrap&&!(c.enabled&&c.canSkill);
  feint.dataset.mode=hold?.dashing?'dash':'feint';feint.querySelector('span').textContent=hold?.dashing?'ダッシュ':c.canTrap?'トラップ':'フェイント';
  feint.querySelector('small').textContent=c.canTrap?'タップで受け止める':'長押し：ダッシュ';feint.setAttribute('aria-label',c.canTrap?'タップでトラップ':'フェイント。タップでフェイント、長押し中はダッシュ');paintAim(c);
  const duel=c.duel,key=duel?duel.at+':'+duel.text:'';
  if(duel&&key!==lastDuel){lastDuel=key;feedback.textContent=duel.text;feedback.dataset.result=duel.result;feedbackUntil=clock()+1300;}
  feedback.hidden=clock()>=Math.max(feedbackUntil,noticeUntil);model.draw(clock(),hold?.dashing?'dash':'feint',!!hold);
 }
 return{update,cancel};
}
