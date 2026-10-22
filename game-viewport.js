// iOS home-screen apps can change their visible area without window.resize.
// Keep the renderer projection and canvas bounds in sync after those changes.
export function installGameViewportSync({viewport, resize}) {
  let frame=0,previous='';
  const update=()=>{
    frame=0;
    if(document.hidden||!viewport?.isConnected)return;
    const editing=document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
    if(!editing&&(window.scrollX||window.scrollY))window.scrollTo(0,0);
    const rect=viewport.getBoundingClientRect();
    const key=[rect.x,rect.y,rect.width,rect.height,window.devicePixelRatio].join('|');
    if(key===previous)return;
    previous=key;resize();
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const resume=()=>{previous='';schedule();};
  const observer=new ResizeObserver(schedule);observer.observe(viewport);
  for(const event of ['resize','orientationchange','pageshow'])window.addEventListener(event,resume,{passive:true});
  document.addEventListener('visibilitychange',resume);
  document.addEventListener('focusout',schedule);
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  schedule();
  return ()=>{
    observer.disconnect();cancelAnimationFrame(frame);
    for(const event of ['resize','orientationchange','pageshow'])window.removeEventListener(event,resume);
    document.removeEventListener('visibilitychange',resume);document.removeEventListener('focusout',schedule);
    window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
  };
}
