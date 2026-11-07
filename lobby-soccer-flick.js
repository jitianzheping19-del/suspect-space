import {SOCCER_SKILLS} from './lobby-soccer-skills.js';
import {createSoccerAction3D} from './lobby-soccer-action-3d.js';
import './lobby-soccer-flick.css';

const CHARGE_MS=1000,DASH_HOLD_MS=280,DOUBLE_TAP_MS=300,THROUGH_HOLD_MS=350;
export function createSoccerFlickControls({document,window,context,send,onAim=()=>{},sendDash=held=>send('soccer-dash',{held}),clock=()=>window.performance.now(),readStick=()=>window.__spaceInputVector||{x:0,z:0}}){
 const zone=document.createElement('div');zone.id='soccerFlickZone';zone.hidden=true;zone.setAttribute('role','group');zone.setAttribute('aria-label','サッカー操作');
 zone.innerHTML='<button id="soccerFeintBtn" type="button" data-space-pointer-action="direct"><svg viewBox="0 0 40 32" aria-hidden="true"><path d="M7 26V19Q7 14 14 14H26Q33 14 33 7V5M27 10L33 4L38 10"/></svg><span>フェイント</span><small>長押し：ダッシュ</small></button><button id="soccerKickBtn" type="button" data-space-pointer-action="direct"><svg viewBox="0 0 48 42" aria-hidden="true"><circle cx="13" cy="29" r="8"/><path d="M22 25L40 7M27 7H40V20"/></svg><span>パス</span><small>2回タップ：シュート</small></button><output id="soccerDuelFeedback" aria-live="polite" hidden></output>';
 document.body.append(zone);
 const feint=zone.querySelector('#soccerFeintBtn'),kick=zone.querySelector('#soccerKickBtn'),feedback=zone.querySelector('output'),model=createSoccerAction3D(feint);
 let feintTap=null,feintTimer=0;
 let gesture=null,hold=null,raf=0,lastAim='',lastDuel='',feedbackUntil=0,noticeUntil=0,firstTap=null,tapTimer=0;
 const power=()=>gesture?Math.min(1,(clock()-gesture.at)/CHARGE_MS):0;
 function resolve(c,yaw,forceShot=false,lob=false){if(lob){const aim=c.resolveLobAim?.(yaw);if(aim)return aim;}return c.resolveAim?.(yaw,forceShot)||{yaw,mode:'shot',target:''};}
 function gestureAim(c,g){const aim=resolve(c,g?.yaw??c.yaw,!!g?.forceShot||!!c.teammateBall,!!g?.lob);return !aim.goal&&g?.flicked&&!g.forceShot&&!g.lob?(c.resolvePassAim?.(g.yaw)||aim):aim;}
 function paintAim(c){
  const yaw=gesture?.yaw??c.yaw,forceShot=!!gesture?.forceShot||!!c.teammateBall,aim=gestureAim(c,gesture);
  if(gesture&&aim.mode==='pass'&&gesture.flicked&&!gesture.forceShot&&!gesture.lob){if(gesture.throughTarget!==aim.target){gesture.throughTarget=aim.target;gesture.stillAt=clock();}gesture.through=clock()-gesture.stillAt>=THROUGH_HOLD_MS;if(gesture.through)aim.mode='through';}else if(gesture)gesture.through=false;
  kick.dataset.mode=c.volleyReady?'volley':c.overheadReady?'overhead':c.headerReady?'header':aim.mode;kick.querySelector('span').textContent=c.volleyReady?'ジャンピングボレー':c.overheadReady?'オーバーヘッド':c.headerReady?'ヘディング':aim.mode==='lob'?'フライパス':aim.mode==='through'?'スルーパス':aim.mode==='pass'?'パス':'シュート';
  kick.querySelector('small').textContent=c.shotBuffered?'シュート予約中':c.teammateBall?'先行入力：受けたらシュート':c.overheadReady?'タップで空中シュート':c.headerReady?'合わせてタップ':aim.mode==='through'?'離して前方へパス':aim.mode==='pass'&&gesture?.flicked?'そのまま保持：スルー':aim.mode==='lob'?'離して浮かせる':gesture?.spin&&aim.mode==='shot'?'カーブシュート':'狙って戻す：フライ';
  kick.setAttribute('aria-label',c.overheadReady?'タップでオーバーヘッドシュート':c.headerReady?'タップでダイビングヘディング':aim.mode==='lob'?'離して味方へフライパス':(aim.mode==='pass'?'味方へパス':'シュート')+'。狙ってボタンへ戻すとフライパス。2回タップでシュート');
  const value={active:!!gesture&&!!c.visible&&!!c.enabled,yaw,forceShot,lob:!!gesture?.lob,through:aim.mode==='through',passPreview:aim.mode==='pass'||aim.mode==='through',spin:aim.mode==='shot'?(gesture?.spin||0):0,charging:!!gesture,power:power()},key=JSON.stringify({...value,full:value.power===1,yaw:Math.round(yaw*100)/100,power:Math.round(value.power*50)/50});
  if(key!==lastAim){lastAim=key;onAim(value);}
  return aim;
 }
 function releaseCapture(button,id){if(id!==undefined&&button.hasPointerCapture?.(id))button.releasePointerCapture(id);}
 function clearKick(){const old=gesture;gesture=null;kick.classList.remove('holding');kick.setAttribute('aria-pressed','false');releaseCapture(kick,old?.id);}
 function clearFeint(){const old=hold;hold=null;feint.classList.remove('holding');feint.setAttribute('aria-pressed','false');if(old?.dashing)sendDash(false);releaseCapture(feint,old?.id);}
 function clearTap(){window.clearTimeout(tapTimer);tapTimer=0;firstTap=null;}
 function consumeFeintTap(){const twice=!!feintTap&&clock()-feintTap.at<=DOUBLE_TAP_MS;if(twice){window.clearTimeout(feintTimer);feintTap=null;}return twice;}
 function consumeTap(){const twice=!!firstTap&&clock()-firstTap.at<=DOUBLE_TAP_MS;clearTap();return twice;}
 function cancel(){window.clearTimeout(feintTimer);feintTap=null;clearTap();clearKick();clearFeint();if(raf)window.cancelAnimationFrame(raf);raf=0;paintAim({...context(),enabled:false});}
 function notice(text){feedback.textContent=text;feedback.hidden=false;noticeUntil=clock()+1300;}
 function animate(){
  raf=0;const c=context();
  if(!c.visible||document.hidden||!document.hasFocus()){cancel();return;}
  if(gesture&&!c.enabled)clearKick();
  if(hold){
   if(!hold.flick&&clock()-hold.at>=DASH_HOLD_MS){
    hold.long=true;window.clearTimeout(feintTimer);feintTap=null;
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
  if(distance>=24){if(!gesture.stillPoint||Math.hypot(event.clientX-gesture.stillPoint.x,event.clientY-gesture.stillPoint.y)>10){gesture.stillPoint={x:event.clientX,y:event.clientY};gesture.stillAt=clock();}const b=gesture.basis;gesture.flicked=true;gesture.lob=false;gesture.yaw=Math.atan2(dx*b.rightX-dy*b.forwardX,dx*b.rightZ-dy*b.forwardZ);gesture.startYaw??=gesture.yaw;const bend=Math.atan2(Math.sin(gesture.yaw-gesture.startYaw),Math.cos(gesture.yaw-gesture.startYaw));gesture.spin=Math.abs(bend)>.22?Math.max(-1,Math.min(1,bend*1.6)):0;const target=context().resolveLobAim?.(gesture.yaw);if(distance>=gesture.maxTravel*.75){if(target)gesture.lobYaw=target.yaw;else delete gesture.lobYaw;}}
 }
 kick.addEventListener('pointerdown',event=>{
  const c=context();if(event.button!==0||gesture||!c.visible||!c.enabled||kick.disabled)return;
  event.preventDefault();event.stopPropagation();if(c.volleyReady){clearTap();send('soccer-volley',{});notice('ジャンピングボレー');return;}if(c.overheadReady){clearTap();send('soccer-overhead',{});notice('オーバーヘッド！');return;}if(c.headerReady){clearTap();send('soccer-header',{});notice('ダイビングヘッド');return;}const forceShot=consumeTap()||!!c.teammateBall;gesture={id:event.pointerId,at:clock(),x:event.clientX,y:event.clientY,yaw:c.yaw,basis:c,forceShot};kick.setPointerCapture?.(event.pointerId);kick.classList.add('holding');kick.setAttribute('aria-pressed','true');paintAim(c);startAnimation();
 },{passive:false});
 kick.addEventListener('pointermove',event=>{if(gesture?.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();aimAt(event);paintAim(context());},{passive:false});
 function shoot(){
  if(!gesture)return;paintAim(context());const g=gesture,holdMs=Math.min(10000,Math.max(0,clock()-(gesture.stillAt??clock()))),strength=Math.max(.16,power()),quick=!g.forceShot&&!g.flicked&&clock()-g.at<250;clearKick();
  function commit(){const c=context(),aim=gestureAim(c,g);if(g.lob&&!c.resolveLobAim?.(g.yaw)){notice('味方を狙い直してください');paintAim(c);return;}if(g.through&&aim.mode==='pass')aim.mode='through';if(c.visible&&c.enabled){const spin=aim.mode==='shot'?(g.spin||0):0;send('kick',{buffered:!!c.canBuffer,mode:aim.mode,yaw:aim.yaw,power:g.forceShot?Math.max(.72,strength):strength,spin,holdMs,target:aim.target||''});notice(c.canBuffer?'シュート予約':aim.mode==='lob'?'フライパス':aim.mode==='through'?'スルーパス':aim.mode==='pass'?'パス':spin?'カーブシュート':'シュート');}paintAim(context());}
  if(quick){clearTap();firstTap={at:clock()};tapTimer=window.setTimeout(()=>{clearTap();commit();},DOUBLE_TAP_MS);}else commit();paintAim(context());
 }
 kick.addEventListener('pointerup',event=>{if(gesture?.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();aimAt(event);shoot();});
 for(const type of ['pointercancel','lostpointercapture'])kick.addEventListener(type,event=>{if(gesture?.id===event.pointerId){clearKick();paintAim(context());}});
 function kickFeint(c){
  if(!gesture&&!firstTap||!c.enabled||!c.canSkill)return false;
  const yaw=gesture?.yaw??c.yaw,{x=0}=readStick();clearTap();clearKick();
  send('soccer-skill',{skill:'shotFeint',side:x<0?-1:1,yaw});notice('キックフェイント');paintAim(c);return true;
 }
 feint.addEventListener('pointerdown',event=>{
  const c=context();if(event.button!==0||hold||!c.visible||feint.disabled)return;event.preventDefault();event.stopPropagation();if(kickFeint(c))return;clearTap();hold={doubleTap:consumeFeintTap(),id:event.pointerId,at:clock(),lastSent:-Infinity,long:false,dashing:false,x:event.clientX,y:event.clientY,yaw:c.yaw,basis:c};feint.setPointerCapture?.(event.pointerId);feint.classList.add('holding');feint.setAttribute('aria-pressed','true');startAnimation();
 },{passive:false});
 function feintDirection(event){if(!hold||hold.long||hold.x===undefined)return;const dx=event.clientX-hold.x,dy=event.clientY-hold.y;if(Math.hypot(dx,dy)<20)return;
  const b=hold.basis,wx=dx*b.rightX-dy*b.forwardX,wz=dx*b.rightZ-dy*b.forwardZ,yaw=hold.yaw;
  hold.flick={x:wx*Math.cos(yaw)-wz*Math.sin(yaw),z:wx*Math.sin(yaw)+wz*Math.cos(yaw)};
 }
 feint.addEventListener('pointermove',e=>{if(hold?.id===e.pointerId){e.preventDefault();e.stopPropagation();feintDirection(e);}},{passive:false});
 function finishFeint(cancelled=false){
  const old=hold;if(!old)return;const c=context(),tap=!cancelled&&!old.long&&(!!old.flick||clock()-old.at<DASH_HOLD_MS);clearFeint();
  if(tap&&c.visible&&c.canTrap){send('soccer-trap',{});notice('トラップ');}else if(tap&&c.visible&&c.enabled&&c.canSkill){const {x=0,z=0}=old.flick||{x:0,z:0},skill=Math.hypot(x,z)<20?'doubleTouch':Math.abs(x)>Math.abs(z)?'roulette':z<0?'heelLift':'doubleTouch';if(old.doubleTap){window.clearTimeout(feintTimer);feintTap=null;send('soccer-skill',{skill:'nutmeg',side:x<0?-1:1,yaw:c.yaw});notice('股抜き');}else{feintTap={at:clock(),skill,side:x<0?-1:1,yaw:c.yaw};window.clearTimeout(feintTimer);feintTimer=window.setTimeout(()=>{const tap=feintTap;feintTap=null;const current=context();if(tap&&current.visible&&current.enabled&&current.canSkill){send('soccer-skill',{skill:tap.skill,side:tap.side,yaw:tap.yaw});notice(SOCCER_SKILLS[tap.skill].name);}},DOUBLE_TAP_MS);}}update();
 }
 feint.addEventListener('pointerup',event=>{if(hold?.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();feintDirection(event);finishFeint();});
 for(const type of ['pointercancel','lostpointercapture'])feint.addEventListener(type,event=>{if(hold?.id===event.pointerId)finishFeint(true);});
 for(const button of [kick,feint]){
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
  button.addEventListener('keydown',event=>{
   if(event.key==='Escape'){event.preventDefault();cancel();return;}if(!['Enter',' '].includes(event.key))return;event.preventDefault();event.stopPropagation();const c=context();if(event.repeat||!c.visible||button.disabled)return;
   if(button===kick&&c.volleyReady){clearTap();send('soccer-volley',{});notice('ジャンピングボレー');return;}
   if(button===kick&&c.overheadReady){clearTap();send('soccer-overhead',{});notice('オーバーヘッド！');return;}
   if(button===kick&&c.headerReady){clearTap();send('soccer-header',{});notice('ダイビングヘッド');return;}
   if(button===kick&&!gesture&&c.enabled){gesture={key:event.key,at:clock(),yaw:c.yaw,basis:c,forceShot:consumeTap()||!!c.teammateBall};kick.classList.add('holding');kick.setAttribute('aria-pressed','true');}
   else if(button===feint&&!hold){if(kickFeint(c))return;clearTap();hold={doubleTap:consumeFeintTap(),key:event.key,at:clock(),lastSent:-Infinity,long:false,dashing:false};feint.classList.add('holding');feint.setAttribute('aria-pressed','true');}startAnimation();
  });
  button.addEventListener('keyup',event=>{if(button===kick&&gesture?.key===event.key){event.preventDefault();shoot();}if(button===feint&&hold?.key===event.key){event.preventDefault();finishFeint();}});
  button.addEventListener('blur',()=>{if(button===kick&&gesture?.key){clearKick();paintAim(context());}if(button===feint&&hold?.key)finishFeint(true);});
 }
 zone.addEventListener('contextmenu',event=>event.preventDefault());
 window.addEventListener('touchcancel',cancel,{passive:true});
 window.addEventListener('blur',cancel);window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 function update(){
  const c=context(),attacking=c.hasBall||c.teammateBall||c.shotBuffered||c.volleyReady||c.overheadReady||c.headerReady;zone.hidden=!c.visible||!attacking&&!hold;
  kick.hidden=!attacking;feint.hidden=!!c.defenseDashHeld;
  if(zone.hidden){cancel();return;}
  if(firstTap&&!c.enabled)clearTap();
  if(gesture&&!c.enabled)clearKick();
  kick.disabled=!c.enabled;feint.disabled=!hold&&!c.canDash&&!c.canTrap&&!(c.enabled&&c.canSkill);
  feint.dataset.mode=hold?.dashing?'dash':'feint';feint.querySelector('span').textContent=hold?.dashing?'ダッシュ':c.canTrap?'トラップ':'フェイント';
  feint.querySelector('small').textContent=!c.hasBall?'長押し：ダッシュ':c.canTrap?'タップで受け止める':gesture?'押してキックを中止':'2回タップ：股抜き';feint.setAttribute('aria-label',c.canTrap?'タップでトラップ':'フェイント。タップでフェイント、長押し中はダッシュ。シュート準備中に押すとキックフェイント');paintAim(c);
  const duel=c.duel,key=duel?duel.at+':'+duel.text:'';
  if(duel&&key!==lastDuel){lastDuel=key;feedback.textContent=duel.text;feedback.dataset.result=duel.result;feedbackUntil=clock()+1300;}
  feedback.hidden=clock()>=Math.max(feedbackUntil,noticeUntil);model.draw(clock(),hold?.dashing?'dash':'feint',!!hold);
 }
 return{update,cancel,get dashHeld(){return !!hold;}};
}
