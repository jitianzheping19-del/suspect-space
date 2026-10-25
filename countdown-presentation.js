import './gameplay-clarity.css';
import './countdown-presentation.css';

const presentations=new WeakMap();

// Presentation follows the existing host deadline. No timers, extra render
// loop, or changes to the round/meeting transition are needed for the effects.
export function updateCountdownPresentation(stage,value,{visible=Number(value)>0,remainingMs=Number(value)*1000,sequence=''}={}){
 if(!stage)return;
 let state=presentations.get(stage);
 if(!state){
  const layout=document.createElement('div');layout.className='countdownLayout';
  const art=document.createElement('div');art.className='countdownArt';art.setAttribute('aria-hidden','true');
  art.innerHTML=`<div class="countdownBulkhead">
   <div class="bulkheadWing left"><i></i><i></i><i></i></div><div class="bulkheadWing right"><i></i><i></i><i></i></div>
   <div class="bulkheadRail top"></div><div class="bulkheadRail bottom"></div><div class="countdownLocks"><i></i><i></i><i></i></div>
  </div><div class="countdownRingStage"><div class="ringHalo"></div><div class="ringHalf left"></div><div class="ringHalf right"></div><div class="ringRotor"></div><div class="ringCore"></div></div>
  <div class="countdownImpulse"><div class="impulseRay left"></div><div class="impulseRay right"></div><div class="impulseOrbit"></div><div class="impulseWave"></div><div class="impulseWave echo"></div></div>`;
  layout.append(art);
  for(const id of['gameCountdownLabel','gameCountdownNumber']){const node=stage.querySelector('#'+id);if(node)layout.append(node);}
  stage.querySelector('.countdownLayout')?.remove();stage.prepend(layout);
  state={layout,number:stage.querySelector('#gameCountdownNumber'),art,animations:[],key:'',value:null,visible:false};presentations.set(stage,state);
 }
 const kind=stage.dataset.kind||'launch',key=kind+':'+sequence;
 stage.dataset.presentation=kind;
 if(!visible){
  if(state.visible){for(const animation of state.animations)animation.cancel();state.animations.length=0;}
  state.visible=false;stage.classList.remove('countdown-releasing');return;
 }
 const changed=!state.visible||state.key!==key||state.value!==value;
 // Main HUD updates are deliberately throttled. Schedule the final opening
 // on the animation timeline so a 500ms HUD tick cannot miss that transition.
 stage.classList.toggle('countdown-releasing',!state.number?.animate&&Number.isFinite(remainingMs)&&remainingMs<=420);
 if(!changed)return;
 for(const animation of state.animations)animation.cancel();state.animations.length=0;
 state.key=key;state.value=value;state.visible=true;
 if(state.number)state.number.textContent=String(value);
 const step=Math.max(0,Math.min(3,4-Number(value)));
 state.art.style.setProperty('--lock-step',String(step));
 state.art.style.setProperty('--ring-angle',`${step*32}deg`);
 state.art.style.setProperty('--ring-contraction',String(1.16-step*.053));
 state.art.querySelectorAll('.countdownLocks i').forEach((lock,i)=>lock.classList.toggle('released',i<step));
 if(globalThis.matchMedia?.('(prefers-reduced-motion:reduce)').matches)return;
 const animate=(node,frames,options)=>{if(node?.animate)state.animations.push(node.animate(frames,{fill:'none',...options}));};
 if(Number(value)===1&&Number.isFinite(remainingMs)&&remainingMs>0){
  const delay=Math.max(0,remainingMs-360),options={delay,duration:Math.min(320,remainingMs),fill:'forwards',easing:'cubic-bezier(.2,.8,.25,1)'};
  for(const[side,sign]of[['left',-1],['right',1]]){
   if(kind==='launch')animate(state.art.querySelector('.bulkheadWing.'+side),[{transform:`translateX(${step*sign*1.2}%)`},{transform:`translateX(${sign*96}%)`}],options);
   else if(kind==='post-role')animate(state.art.querySelector('.ringHalf.'+side),[{transform:`scale(${1.16-step*.053})`},{transform:`translateX(${sign*52}%) scale(1.04)`}],options);
  }
 }
 animate(state.number,kind==='meeting-return'?
  [{opacity:0,transform:'translateY(9px) scale(.8)'},{opacity:1,transform:'translateY(0) scale(1.07)',offset:.35},{opacity:1,transform:'translateY(0) scale(1)'}]:
  [{opacity:0,transform:'translateY(-14px) scale(1.14)'},{opacity:1,transform:'translateY(0) scale(.98)',offset:.6},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:kind==='meeting-return'?440:340,easing:'cubic-bezier(.16,.85,.25,1)'});
 if(kind==='meeting-return'){
  for(const[selector,delay]of[['.impulseWave',0],['.impulseWave.echo',120]]){
   animate(state.art.querySelector(selector),[{opacity:0,transform:'scale(.42)'},{opacity:.8,transform:'scale(.65)',offset:.16},{opacity:0,transform:'scale(1.65)'}],{duration:780,delay,easing:'cubic-bezier(.12,.65,.2,1)'});
  }
  for(const[selector,side]of[['.impulseRay.left',-1],['.impulseRay.right',1]])animate(state.art.querySelector(selector),[{opacity:0,transform:`translateX(${side*32}%) scaleX(.4)`},{opacity:.9,transform:'translateX(0) scaleX(1)',offset:.5},{opacity:0,transform:'translateX(0) scaleX(.6)'}],{duration:460,easing:'ease-out'});
 }
}
