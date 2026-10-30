import './gameplay-clarity.css';
import './countdown-presentation.css';

const presentations=new WeakMap();

// Follow the host deadline with one small timer per second. The HUD can update
// slowly without delaying the digits or restarting compositor animations.
function stopPresentation(state){
 clearTimeout(state.timer);state.timer=0;
 for(const animation of [...state.animations,...state.digitAnimations])animation.cancel();
 state.animations.length=0;state.digitAnimations.length=0;state.visible=false;
}
function animate(state,node,frames,options,elapsed=0,handles=state.animations){
 if(!node?.animate)return;
 const animation=node.animate(frames,{fill:'both',...options});
 animation.currentTime=elapsed;handles.push(animation);
}
function startArt(state,kind,elapsed){
 if(state.reduced)return;
 const node=selector=>state.art.querySelector(selector),duration=state.duration;
 if(kind==='launch'||kind==='post-role'){
  // One continuous contraction/opening, independent of the HUD/digit ticks.
  const opening=Math.max(0,1-360/duration);
  for(const [side,sign]of [['left',-1],['right',1]]){
   const frames=kind==='launch'?[
    {transform:'translateX(0)'},
    {transform:`translateX(${sign*4}%)`,offset:opening,easing:'cubic-bezier(.2,.8,.25,1)'},
    {transform:`translateX(${sign*96}%)`}
   ]:[
    {transform:'scale(1.16)'},
    {transform:'scale(1)',offset:opening,easing:'cubic-bezier(.2,.8,.25,1)'},
    {transform:`translateX(${sign*52}%) scale(1.04)`}
   ];
   animate(state,node((kind==='launch'?'.bulkheadWing.':'.ringHalf.')+side),frames,{duration},elapsed);
  }
  if(kind==='post-role')animate(state,node('.ringRotor'),[{transform:'rotate(0deg)'},{transform:'rotate(180deg)'}],{duration},elapsed);
 }else if(kind==='meeting-return'){
  animate(state,node('.impulseOrbit'),[{transform:'rotate(-28deg) scale(.92)'},{transform:'rotate(152deg) scale(.92)'}],{duration},elapsed);
  for(const [selector,delay]of [['.impulseWave',0],['.impulseWave.echo',180]]){
   animate(state,node(selector),[{opacity:0,transform:'scale(.42)'},{opacity:.65,transform:'scale(.62)',offset:.18},{opacity:0,transform:'scale(1.65)'}],{duration:1000,delay,iterations:duration/1000,fill:'none'},elapsed);
  }
  for(const [selector,sign]of [['.impulseRay.left',-1],['.impulseRay.right',1]]){
   animate(state,node(selector),[{opacity:0,transform:`translateX(${sign*32}%) scaleX(.4)`},{opacity:.7,transform:'translateX(0) scaleX(1)',offset:.45},{opacity:0,transform:'translateX(0) scaleX(.6)'}],{duration:1000,iterations:duration/1000,fill:'none'},elapsed);
  }
 }
}
function tickPresentation(stage,state){
 clearTimeout(state.timer);state.timer=0;
 if(!state.visible)return;
 if(!stage.isConnected||stage.classList.contains('hidden')){stopPresentation(state);return;}
 const remaining=state.deadline-performance.now();
 if(remaining<=0){stage.dataset.countdownActive='false';stopPresentation(state);return;}
 const value=Math.ceil(remaining/1000);
 if(state.value!==value){
  for(const animation of state.digitAnimations)animation.cancel();state.digitAnimations.length=0;
  state.value=value;state.digit.textContent=String(value);
  const step=Math.max(0,Math.min(3,4-value));
  state.art.querySelectorAll('.countdownLocks i').forEach((lock,i)=>lock.classList.toggle('released',i<step));
  if(!state.reduced)animate(state,state.digit,[
   {opacity:.65,transform:'translateY(5px) scale(.94)'},
   {opacity:1,transform:'translateY(0) scale(1)'}
  ],{duration:220,easing:'cubic-bezier(.16,.85,.25,1)'},value*1000-remaining,state.digitAnimations);
 }
 state.timer=setTimeout(()=>tickPresentation(stage,state),Math.max(1,remaining-(value-1)*1000+1));
}
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
  const number=stage.querySelector('#gameCountdownNumber'),digit=document.createElement('span');digit.className='countdownDigit';
  if(number){digit.textContent=number.textContent;number.replaceChildren(digit);}
  state={layout,number,digit,art,animations:[],digitAnimations:[],timer:0,key:'',value:null,visible:false};presentations.set(stage,state);
 }
 const kind=stage.dataset.kind||'launch',key=kind+':'+sequence;
 stage.dataset.presentation=kind;
 const active=!!visible&&Number.isFinite(remainingMs)&&remainingMs>0;
 stage.dataset.countdownActive=String(active);
 stage.classList.remove('countdown-releasing');
 if(!active){stopPresentation(state);return;}
 const stamp=performance.now(),deadline=stamp+remainingMs;
 const reduced=!!globalThis.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
 // Ignore tiny clock differences on routine updates; preserve the timeline.
 if(!state.visible||state.key!==key||state.reduced!==reduced||Math.abs(state.deadline-deadline)>120){
  stopPresentation(state);
  state.key=key;state.value=null;state.visible=true;state.reduced=reduced;
  state.deadline=deadline;state.duration=Math.max(kind==='launch'?5000:3000,Math.ceil(remainingMs/1000)*1000);
  startArt(state,kind,state.duration-remainingMs);
 }
 // The caller reveals the stage later in this same HUD update.
 stage.classList.remove('hidden');
 tickPresentation(stage,state);
}
