// iOS home-screen apps can change their visible area without window.resize.
// Keep the renderer projection and canvas bounds in sync after those changes.
export function installGameViewportSync({viewport, resize}) {
  let frame=0,previous='';const settling=new Set();
  const update=()=>{
    frame=0;
    if(document.hidden||!viewport?.isConnected)return;
    const editing=document.activeElement?.matches?.('input,textarea,select,[contenteditable="true"]');
    if(!editing&&(window.scrollX||window.scrollY))window.scrollTo(0,0);
    const rect=viewport.getBoundingClientRect();
    const visible=window.visualViewport;
    const key=[rect.x,rect.y,rect.width,rect.height,window.devicePixelRatio,visible?.width,visible?.height,visible?.offsetLeft,visible?.offsetTop,visible?.scale,screen.orientation?.angle].join('|');
    if(key===previous)return;
    previous=key;resize();window.dispatchEvent(new Event('spaceviewportchange'));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const resume=()=>{previous='';schedule();};
  // Safari can deliver the orientation event before its final viewport and
  // safe-area layout. Reconcile again after the rotation animation settles.
  const rotate=()=>{for(const timer of settling)clearTimeout(timer);settling.clear();resume();for(const delay of [120,350,700]){const timer=setTimeout(()=>{settling.delete(timer);resume();},delay);settling.add(timer);}};
  const observer=new ResizeObserver(schedule);observer.observe(viewport);
  for(const event of ['resize','pageshow'])window.addEventListener(event,resume,{passive:true});
  window.addEventListener('orientationchange',rotate,{passive:true});screen.orientation?.addEventListener('change',rotate);
  document.addEventListener('visibilitychange',resume);
  document.addEventListener('focusout',schedule);
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  schedule();
  return ()=>{
    observer.disconnect();cancelAnimationFrame(frame);
    for(const event of ['resize','pageshow'])window.removeEventListener(event,resume);
    window.removeEventListener('orientationchange',rotate);screen.orientation?.removeEventListener('change',rotate);
    for(const timer of settling)clearTimeout(timer);settling.clear();
    document.removeEventListener('visibilitychange',resume);document.removeEventListener('focusout',schedule);
    window.visualViewport?.removeEventListener('resize',schedule);window.visualViewport?.removeEventListener('scroll',schedule);
  };
}
