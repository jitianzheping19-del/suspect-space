// Self-contained so the same preference can be installed in generated scenes.
export function createMotionPreference(){
 if(globalThis.__spaceMotionPreference)return globalThis.__spaceMotionPreference;
 const key='space-suspect-motion-v1',query=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)'),listeners=new Set();
 let mode='system';try{if(localStorage.getItem(key)==='reduce')mode='reduce';}catch{}
 try{if(parent!==window&&parent.__spaceMotionPreference)mode=parent.__spaceMotionPreference.mode;}catch{}
 const frames=()=>globalThis.document?.querySelectorAll('iframe')||[];
 const preference={get mode(){return mode;},get matches(){return mode==='reduce'||query?.matches===true;},
  set(value,persist=true){if(!['system','reduce'].includes(value))return;mode=value;if(persist)try{localStorage.setItem(key,mode);}catch{}sync();},
  addEventListener(type,listener){if(type==='change')listeners.add(listener);},removeEventListener(type,listener){if(type==='change')listeners.delete(listener);}};
 globalThis.__spaceMotionPreference=preference;
 const send=frame=>frame?.postMessage({type:'ss-motion-preference',mode},'*');
 function sync(){
  if(globalThis.document?.documentElement)document.documentElement.dataset.reducedMotion=String(preference.matches);
  for(const frame of frames())send(frame.contentWindow);
  for(const listener of listeners)listener({matches:preference.matches,mode});
 }
 query?.addEventListener?.('change',sync);
 globalThis.addEventListener?.('message',event=>{
  if(globalThis.parent!==globalThis&&event.source===globalThis.parent&&event.data?.type==='ss-motion-preference')preference.set(event.data.mode,false);
  else if(event.data?.type==='ss-motion-preference-request'&&[...frames()].some(frame=>frame.contentWindow===event.source))send(event.source);
 });
 globalThis.document?.addEventListener('load',event=>{if(event.target?.tagName==='IFRAME')send(event.target.contentWindow);},true);
 // Decorative CSS only: simulation clocks, controls and decision timers are unchanged.
 if(globalThis.document){const style=document.createElement('style');style.textContent='html[data-reduced-motion="true"] *,html[data-reduced-motion="true"] *::before,html[data-reduced-motion="true"] *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}html[data-reduced-motion="true"] :is(#ssxFxCanvas,#ssxFxFlash,#ssxSabLayer,.flash,.ssxFlash){display:none!important}';document.head.append(style);}
 sync();if(globalThis.parent&&globalThis.parent!==globalThis)globalThis.parent.postMessage({type:'ss-motion-preference-request'},'*');
 return preference;
}
