import {SOCCER_PRESS} from './lobby-soccer-press.js';
import './lobby-soccer-defense.css';

export function createSoccerDefenseControls({document,window,context,sendPress,sendSlide,sendDash=()=>{},clock=()=>window.performance.now()}){
 const zone=document.createElement('div');zone.id='soccerDefenseZone';zone.hidden=true;zone.setAttribute('role','group');zone.setAttribute('aria-label','サッカー守備操作');
 zone.innerHTML='<button type="button" id="soccerPressBtn" data-space-pointer-action="direct"><svg viewBox="0 0 48 42" aria-hidden="true"><circle cx="24" cy="24" r="7"/><path d="M3 9L14 20M3 20H14V9M45 9L34 20M34 9V20H45"/></svg><span>プレス</span><small>長押し＋スティック</small></button><button type="button" id="soccerSlideBtn" data-space-pointer-action="direct"><svg viewBox="0 0 48 42" aria-hidden="true"><path d="M8 29L19 19L29 26L42 26M19 19L22 11M5 35H39M4 29H10"/><circle cx="24" cy="6" r="4"/></svg><span>スライディング</span><small>フリックした方向へ</small></button>';
 document.body.append(zone);const press=zone.querySelector('#soccerPressBtn'),slide=zone.querySelector('#soccerSlideBtn');let held=null,flick=null,raf=0;
 function capture(b,e){b.setPointerCapture?.(e.pointerId);b.classList.add('holding');b.setAttribute('aria-pressed','true');}
 function release(b,id){b.classList.remove('holding');b.setAttribute('aria-pressed','false');if(id!==undefined&&b.hasPointerCapture?.(id))b.releasePointerCapture(id);}
 function stopPress(){const h=held;held=null;if(h?.sent){if(h.mode==='dash')sendDash(false);else sendPress(false);}release(h?.button||press,h?.id);}
 function stopSlide(){const f=flick;flick=null;release(slide,f?.id);}
 function cancel(){stopPress();stopSlide();if(raf)window.cancelAnimationFrame(raf);raf=0;}
 function tick(){raf=0;const c=context();if(!c.visible||c.hasBall||c.teammateBall||c.shotBuffered||document.hidden){cancel();return;}if(held){if(!(c.defending?c.canPress:c.canDash||c.dashing)){stopPress();return;}if(!c.pending&&clock()-held.at>=SOCCER_PRESS.hold&&clock()-held.last>=SOCCER_PRESS.heartbeat){held.last=clock();held.sent=true;if(held.mode==='dash')sendDash(true);else sendPress(true,'press');}raf=window.requestAnimationFrame(tick);}}
 function start(){if(!raf)raf=window.requestAnimationFrame(tick);}
 for(const button of [press])button.addEventListener('pointerdown',e=>{const c=context();if(e.button!==0||held||!c.visible||c.hasBall||!(c.defending?c.canPress:c.canDash||c.dashing))return;e.preventDefault();e.stopPropagation();held={id:e.pointerId,at:clock(),last:-Infinity,sent:false,button,mode:c.defending?'press':'dash'};capture(button,e);start();},{passive:false});
 for(const button of [press])for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,e=>{if(held?.id===e.pointerId){e.preventDefault();e.stopPropagation();stopPress();}});
 slide.addEventListener('pointerdown',e=>{const c=context();if(e.button!==0||flick||!c.visible||c.hasBall||!c.canSlide)return;e.preventDefault();e.stopPropagation();stopPress();flick={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:c.yaw,basis:c};capture(slide,e);},{passive:false});
 function aim(e){if(!flick)return;const dx=e.clientX-flick.x,dy=e.clientY-flick.y,b=flick.basis;if(Math.hypot(dx,dy)>=20)flick.yaw=Math.atan2(dx*b.rightX-dy*b.forwardX,dx*b.rightZ-dy*b.forwardZ);}
 slide.addEventListener('pointermove',e=>{if(flick?.id===e.pointerId){e.preventDefault();e.stopPropagation();aim(e);}},{passive:false});
 slide.addEventListener('pointerup',e=>{if(flick?.id!==e.pointerId)return;e.preventDefault();e.stopPropagation();aim(e);const yaw=flick.yaw;stopSlide();const c=context();if(c.visible&&!c.hasBall&&c.canSlide)sendSlide(yaw);});
 for(const type of ['pointercancel','lostpointercapture'])slide.addEventListener(type,e=>{if(flick?.id===e.pointerId)stopSlide();});
 for(const b of [press,slide]){
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();});
  b.addEventListener('keydown',e=>{if(e.key==='Escape'){cancel();return;}if(!['Enter',' '].includes(e.key))return;e.preventDefault();e.stopPropagation();const c=context();if(e.repeat||!c.visible||c.hasBall||b.disabled)return;if(b!==slide&&!held){held={key:e.key,at:clock(),last:-Infinity,sent:false,button:b,mode:c.defending?'press':'dash'};b.classList.add('holding');start();}else if(b===slide)sendSlide(c.yaw);});
  b.addEventListener('keyup',e=>{if(b!==slide&&held?.key===e.key){e.preventDefault();stopPress();}});b.addEventListener('blur',()=>{if(held?.key)stopPress();});
 }
 for(const type of ['blur','pagehide','touchcancel'])window.addEventListener(type,cancel);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});zone.addEventListener('contextmenu',e=>e.preventDefault());
 return {cancel,update(){const c=context();zone.hidden=!c.visible||c.hasBall||c.teammateBall||c.shotBuffered||c.volleyReady||c.overheadReady||c.headerReady;if(zone.hidden){cancel();return;}if(held&&(held.mode!==(c.defending?'press':'dash')||!(c.defending?c.canPress:c.canDash||c.dashing)))stopPress();if(flick&&!c.canSlide)stopSlide();press.disabled=!(c.defending?c.canPress:c.canDash||c.dashing);press.querySelector('span').textContent=c.defending?'プレス':'ダッシュ';press.querySelector('small').textContent=c.defending?'長押しで寄せる':'長押しで走る';slide.disabled=!c.canSlide;}};
}
