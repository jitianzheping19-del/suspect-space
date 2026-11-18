import './interaction-feedback.css';

// A hold never sends a command. Only a release on the original control commits.
export function installActionPreview({active,cancelSelection,selectionOpen}){
 const ids=new Set(['abilityBtn','killBtn','killSecondBtn','taskBtn','reportBtn','jackalSidekickBtn']);
 let held=null,preview=null,suppressUntil=0;
 const events=new AbortController(),cancelledPointers=new Set();
 const listen=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:events.signal});
 const cancel=document.createElement('button');cancel.id='actionCancel';cancel.type='button';cancel.textContent='取り消す';cancel.hidden=true;
 const hint=document.createElement('p');hint.id='actionPreviewHint';hint.hidden=true;hint.setAttribute('role','status');
 document.body.append(cancel,hint);
 const hide=(node,value)=>{if(node.hidden!==value)node.hidden=value;};
 function clear(){if(held){clearTimeout(held.timer);cancelledPointers.add(held.id);if(cancelledPointers.size>16)cancelledPointers.delete(cancelledPointers.values().next().value);suppressUntil=performance.now()+800;}held=null;preview=null;hide(hint,true);hide(cancel,!selectionOpen());}
 function abort(){suppressUntil=performance.now()+800;clear();cancelSelection();hide(cancel,true);}
 cancel.onclick=abort;
 listen(document,'pointerdown',e=>{
  const button=e.target.closest?.('button');if(!ids.has(button?.id)||!active())return;
  cancelledPointers.delete(e.pointerId);
  if(held){e.preventDefault();e.stopImmediatePropagation();return;}
  e.preventDefault();e.stopImmediatePropagation();
  held={id:e.pointerId,button,x:e.clientX,y:e.clientY,at:performance.now(),timer:setTimeout(()=>{
   if(!held)return;preview=held.button.id;hide(hint,false);hide(cancel,false);sync();
  },240)};
 },{capture:true,passive:false});
 function release(e,cancelled=false){
  if(cancelledPointers.delete(e.pointerId)){e.preventDefault();e.stopImmediatePropagation();suppressUntil=performance.now()+800;return;}
  if(!held||e.pointerId!==held.id)return;
  const h=held,rect=h.button.getBoundingClientRect();
  const inside=e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
  e.preventDefault();e.stopImmediatePropagation();suppressUntil=performance.now()+800;clear();cancelledPointers.delete(e.pointerId);
  if(!cancelled&&inside&&!h.button.disabled&&active())h.button.click();
 }
 listen(document,'pointerup',e=>release(e),{capture:true,passive:false});
 listen(document,'pointercancel',e=>release(e,true),{capture:true,passive:false});
 listen(document,'click',e=>{if(e.isTrusted&&performance.now()<suppressUntil&&ids.has(e.target.closest?.('button')?.id)){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
 listen(document,'keydown',e=>{if(e.key==='Escape'&&(held||selectionOpen())){e.preventDefault();e.stopImmediatePropagation();abort();}},{capture:true});
 listen(window,'blur',abort);listen(document,'visibilitychange',()=>{if(document.hidden)abort();});
 listen(window,'spacesuspect:room-leave',abort);
 function sync(){if(held&&!active())clear();hide(cancel,!preview&&!selectionOpen());if(preview){const text='ボタンの外で離すと取り消し';if(hint.textContent!==text)hint.textContent=text;}}
 return{sync,clear,handles:id=>ids.has(id),dispose(){abort();events.abort();cancelledPointers.clear();cancel.remove();hint.remove();},get preview(){return preview;},get held(){return held?.button.id||null;}};
}

export function createNotificationCounter(windowMs=6000){let last=null;return{push(text,kind,at=Date.now()){const same=last&&last.text===text&&last.kind===kind&&at-last.at<=windowMs;last={text,kind,at,count:same?last.count+1:1};return last.count;},clear(){last=null;}};}
