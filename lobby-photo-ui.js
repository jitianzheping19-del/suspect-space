// Only shot metadata is synchronized. Each connected device captures the same
// shutter time locally, and keeps its image in memory for one minute.
export function createLobbyPhotoUI({document,window,frame,isActive,isNear,isAtCamera,request,getUid,clock=Date.now}){
 const overlay=document.createElement('div');overlay.id='lobbyPhotoViewfinder';overlay.hidden=true;overlay.setAttribute('role','status');
 overlay.innerHTML='<div class="photoChrome"><span>◉ STARLIGHT CAMERA</span><span>GROUP PORTRAIT · 16:9</span></div><div class="photoFocus"><small>撮影まで</small><strong aria-live="polite">5</strong></div><div class="photoChrome photoBottom"><span>動いてポーズを決めよう</span><span>撮影後は前のカメラで保存 · 1分間</span></div>';
 const flash=document.createElement('div');flash.id='lobbyPhotoFlash';flash.hidden=true;flash.setAttribute('aria-hidden','true');
 const panel=document.createElement('section');panel.id='lobbyPhotoDialog';panel.hidden=true;panel.inert=true;panel.dataset.spaceUiVisible='false';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','集合写真の保存');
 panel.innerHTML='<div class="lobbyPhotoResult"><header><strong>CREW MEMORIES</strong><button type="button" data-photo-close>閉じる</button></header><img alt="ロビーで撮影した集合写真" hidden><footer><button type="button" data-photo-save hidden>写真を保存</button><span role="status"></span></footer></div>';
 document.body.append(overlay,flash,panel);
 const image=panel.querySelector('img'),status=panel.querySelector('[role="status"]'),save=panel.querySelector('[data-photo-save]'),number=overlay.querySelector('strong');
 let shot=null,pending=null,photo=null,seen='',timer=0,opener=null,flashUntil=0;
 const post=data=>frame()?.contentWindow?.postMessage(data,'*');
 function close(){panel.hidden=true;panel.inert=true;panel.dataset.spaceUiVisible='false';panel.setAttribute('aria-hidden','true');if(document.body.dataset.lobbyPhoto==='result')delete document.body.dataset.lobbyPhoto;opener?.focus?.({preventScroll:true});opener=null;}
 function reset(){if(pending)post({type:'lobby-photo-cancel',id:pending.id});pending=shot=photo=null;seen='';overlay.hidden=flash.hidden=true;image.removeAttribute('src');close();delete document.body.dataset.lobbyPhoto;window.clearInterval(timer);timer=0;}
 function update(){
  if(!isActive()){reset();return;}
  const t=clock();
  if(photo&&t>=photo.expiresAt){photo=null;image.removeAttribute('src');}
  const viewing=shot&&t<shot.at+150&&t>=shot.at-5000&&!!shot.members?.[getUid()]&&isNear();
  overlay.hidden=!viewing;
  if(viewing){document.body.dataset.lobbyPhoto='countdown';const label=String(Math.max(1,Math.ceil((shot.at-t)/1000)));if(number.textContent!==label)number.textContent=label;}
  else if(document.body.dataset.lobbyPhoto==='countdown')delete document.body.dataset.lobbyPhoto;
  if(pending&&!pending.flashed&&t>=pending.at){pending.flashed=true;if(shot.members?.[getUid()]&&isNear())flashUntil=t+180;}
  flash.hidden=t>=flashUntil;
  if(pending&&t>pending.at+10000){post({type:'lobby-photo-cancel',id:pending.id});pending=null;}
  if(!panel.hidden){
   if(!isAtCamera()){close();return;}
   const valid=photo&&t<photo.expiresAt;image.hidden=save.hidden=!valid;save.disabled=!valid;
   if(valid){if(image.getAttribute('src')!==photo.image)image.src=photo.image;status.textContent=`保存できる時間：あと${Math.ceil((photo.expiresAt-t)/1000)}秒`;}
   else status.textContent=pending?'撮影中です…':'保存できる写真はありません。ステージで撮影してください。';
  }
 }
 function ensureTimer(){if(!timer)timer=window.setInterval(update,80);}
 function sync(next){
  if(!isActive()){if(shot||photo||pending)reset();return;}
  if(!next){if(shot||pending||photo)reset();return;}
  if(next.id===seen)return;
  if(typeof next.id!=='string'||!Number.isFinite(next.at)||next.expiresAt!==next.at+60000||next.at-clock()>6000)return;
  if(clock()>=next.at)return; // Never pretend to capture an earlier shutter time.
  if(pending)post({type:'lobby-photo-cancel',id:pending.id});
  close();seen=next.id;shot=next;pending={id:next.id,at:next.at};
  post({type:'lobby-photo-start',id:next.id,at:Date.now()+next.at-clock(),preview:!!next.members?.[getUid()]});ensureTimer();update();
 }
 function start(){if(!isActive()||!isNear()||pending)return;request();}
 function openAtCamera(){if(!isActive()||!isAtCamera())return;opener=document.activeElement;panel.hidden=false;panel.inert=false;panel.dataset.spaceUiVisible='true';panel.setAttribute('aria-hidden','false');document.body.dataset.lobbyPhoto='result';ensureTimer();update();panel.querySelector('[data-photo-close]').focus();}
 window.addEventListener('message',event=>{
  const data=event.data;if(event.source!==frame()?.contentWindow||!pending||data?.id!==pending.id)return;
  if(data.type==='lobby-photo-error'){pending=null;return;}
  if(data.type!=='lobby-photo-result'||typeof data.image!=='string'||data.image.length>12000000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.image))return;
  if(!isActive()){reset();return;}if(!pending.flashed&&shot.members?.[getUid()]&&isNear())flashUntil=clock()+180;if(clock()<shot.expiresAt)photo={id:shot.id,image:data.image,expiresAt:shot.expiresAt};pending=null;update();
 });
 save.onclick=async()=>{
  const current=photo;if(!current||clock()>=current.expiresAt||!isAtCamera())return;save.disabled=true;
  try{const blob=await(await fetch(current.image)).blob();if(clock()>=current.expiresAt||!isActive())return;
   const name='SPACE-SUSPECT-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png',file=new File([blob],name,{type:'image/png'});
   if(window.navigator.canShare?.({files:[file]}))await window.navigator.share({files:[file],title:'SPACE SUSPECT 集合写真'});
   else{const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),60000);}
  }catch(error){if(error.name!=='AbortError')status.textContent='写真を長押しして保存することもできます';}finally{save.disabled=false;}
 };
 panel.querySelector('[data-photo-close]').onclick=close;
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 new MutationObserver(()=>{if(!isActive()&&(shot||photo||!panel.hidden))reset();}).observe(document.body,{attributes:true,attributeFilter:['data-phase','data-logging-out']});
 window.addEventListener('pagehide',reset);
 return{start,sync,openAtCamera,close:reset,get busy(){return !panel.hidden;}};
}
