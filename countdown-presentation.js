import './gameplay-clarity.css';
export function updateCountdownPresentation(stage,value){
 if(!stage)return;
 let layout=stage.querySelector('.countdownLayout');
 if(!layout){
  layout=document.createElement('div');layout.className='countdownLayout';
  const art=document.createElement('div');art.className='countdownArt';art.setAttribute('aria-hidden','true');
  art.innerHTML='<div class="launchShutter left"></div><div class="launchShutter right"></div><div class="launchSeal">S</div><div class="departureLights"><i></i><i></i><i></i></div><div class="meetingReturnMark">✓</div>';
  layout.append(art);for(const id of['gameCountdownLabel','gameCountdownNumber']){const node=stage.querySelector('#'+id);if(node)layout.append(node);}stage.prepend(layout);
 }
 const kind=stage.dataset.kind||'launch';stage.dataset.presentation=kind;
 for(const[i,light]of layout.querySelectorAll('.departureLights i').entries())light.classList.toggle('lit',i>=Math.max(0,Number(value)-1));
}
