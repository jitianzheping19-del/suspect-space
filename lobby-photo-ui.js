import {createLobbyPhotoLibrary} from './lobby-photo-library.js';
export const PHOTO_BACKGROUNDS=[{id:'aurora',name:'オーロラ',colors:['#103749','#88eed6']},{id:'sunset',name:'夕焼け',colors:['#522f62','#ffb978']},{id:'moon',name:'月夜',colors:['#112343','#b4d9ff']},{id:'rose',name:'桜色',colors:['#422844','#ffb4d5']}];
export function createLobbyPhotoUI({document,window,frame,isActive,isNear,isAtCamera,request,getUid,isHost=()=>false,changeBackground=()=>{},clock=Date.now,changePose=()=>{},isObscured=()=>false}){
 const library=createLobbyPhotoLibrary({clock});
 const overlay=document.createElement('div');overlay.id='lobbyPhotoViewfinder';overlay.hidden=true;overlay.setAttribute('role','status');
 overlay.innerHTML='<div class="photoChrome"><span>◉ STARLIGHT CAMERA</span><span>CREW PORTRAIT · 16:9</span></div><div class="photoFocus"><small>撮影まで</small><strong aria-live="polite">5</strong></div>';
 const flash=document.createElement('div');flash.id='lobbyPhotoFlash';flash.hidden=true;flash.setAttribute('aria-hidden','true');
 const panel=document.createElement('section');panel.id='lobbyPhotoDialog';panel.hidden=true;panel.inert=true;panel.dataset.spaceUiVisible='false';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','集合写真カメラ');
 panel.innerHTML='<div class="lobbyPhotoResult"><header><div><small>STARLIGHT STUDIO</small><strong>集合写真カメラ</strong></div><button type="button" data-photo-close>閉じる</button></header><nav aria-label="カメラメニュー"><button type="button" data-photo-tab="camera">撮影</button><button type="button" data-photo-tab="library">ライブラリ</button><button type="button" data-photo-tab="background">背景</button></nav><section data-photo-view="camera" class="photoCameraHome"><div class="photoCameraIllustration" aria-hidden="true"><i></i><b>✦</b></div><button type="button" data-photo-shutter>撮影</button></section><section data-photo-view="library" hidden><div class="photoLibraryHeading"><h3>最近の写真</h3><span>この端末 · 撮影後1分間</span></div><div class="photoLibraryGrid"></div><p data-photo-empty>まだ写真がありません。最初の1枚を撮ってみよう。</p><img class="photoSelected" alt="選択した集合写真" hidden><button type="button" data-photo-save hidden>写真を保存</button></section><section data-photo-view="background" hidden><h3>背景を選ぶ</h3><p data-photo-host-note></p><div class="photoBackgroundGrid"></div></section><footer><span role="status" aria-live="polite"></span></footer></div>';
 document.body.append(overlay,flash,panel);
 const poseButton=document.createElement('button');poseButton.id='lobbyPhotoPoseBtn';poseButton.type='button';poseButton.hidden=true;poseButton.innerHTML='<span>ポーズ</span><small>立つ</small>';document.body.append(poseButton);
 const poses=[['stand','立つ'],['wave','手を振る'],['cheer','ばんざい'],['hero','ヒーロー']];let poseIndex=0;
 poseButton.onclick=()=>{if(!canUse()||!panel.hidden)return;poseIndex=(poseIndex+1)%poses.length;const [pose,name]=poses[poseIndex];changePose(pose);poseButton.querySelector('small').textContent=name;poseButton.setAttribute('aria-label','ポーズ：'+name+'。押すと切り替え');};
 function syncPoseButton(){
  const use=document.getElementById('lobbyUseBtn'),rect=use?.getBoundingClientRect();
  const show=canUse()&&!isObscured()&&panel.hidden&&rect?.width>0&&rect?.height>0&&!use.classList.contains('hidden')&&!document.body.dataset.loggingOut;
  poseButton.hidden=!show;if(!show)return;
  poseButton.style.left=rect.left+'px';poseButton.style.top=Math.max(8,rect.top-56)+'px';poseButton.style.width=rect.width+'px';
 }
 const image=panel.querySelector('img'),status=panel.querySelector('[role="status"]'),save=panel.querySelector('[data-photo-save]'),number=overlay.querySelector('strong'),grid=panel.querySelector('.photoLibraryGrid');
 let shot=null,pending=null,selected=null,album=[],seen='',timer=0,opener=null,flashUntil=0,view='camera',background='aurora',albumOwner='',generation=0,saving=false,storageNotice='';
 const post=data=>frame()?.contentWindow?.postMessage(data,'*');
 const canUse=()=>isActive()&&(isNear()||isAtCamera());
 function close(){panel.hidden=true;panel.inert=true;panel.dataset.spaceUiVisible='false';panel.setAttribute('aria-hidden','true');if(document.body.dataset.lobbyPhoto==='result')delete document.body.dataset.lobbyPhoto;opener?.focus?.({preventScroll:true});opener=null;}
 function reset(){if(pending)post({type:'lobby-photo-cancel',id:pending.id});library.clear();pending=shot=null;seen='';poseButton.hidden=true;poseIndex=0;poseButton.querySelector('small').textContent='立つ';overlay.hidden=flash.hidden=true;close();delete document.body.dataset.lobbyPhoto;window.clearInterval(timer);timer=0;generation++;selected=null;album=[];albumOwner='';image.removeAttribute('src');grid.replaceChildren();}
 function choose(photo){selected=photo;image.src=photo.image;image.hidden=save.hidden=false;save.disabled=saving;grid.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.photoId===photo.id)));}
 function renderAlbum(){grid.replaceChildren();panel.querySelector('[data-photo-empty]').hidden=album.length>0;for(const photo of album){const button=document.createElement('button'),thumb=document.createElement('img'),date=document.createElement('span');button.type='button';button.dataset.photoId=photo.id;thumb.src=photo.image;thumb.alt='集合写真';thumb.loading='lazy';date.textContent=new Date(photo.at).toLocaleString('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});button.setAttribute('aria-label',date.textContent+'の写真を見る');button.append(thumb,date);button.onclick=()=>choose(photo);grid.append(button);}if(album.length)choose(album.find(p=>p.id===selected?.id)||album[0]);else{selected=null;image.hidden=save.hidden=true;image.removeAttribute('src');}}
 async function refreshAlbum(){const owner=String(getUid()||''),version=++generation;albumOwner=owner;const rows=await library.list(owner);if(version!==generation||owner!==String(getUid()||''))return;album=rows;renderAlbum();}
 function paintBackgrounds(){const allowed=isHost();panel.querySelector('[data-photo-host-note]').textContent=allowed?'選んだ背景は全員に反映されます。':'背景はホストが変更できます。';for(const button of panel.querySelectorAll('[data-photo-background]')){button.disabled=!allowed||!!pending;button.setAttribute('aria-pressed',String(button.dataset.photoBackground===background));}}
 function setView(next){view=next;panel.querySelectorAll('[data-photo-view]').forEach(n=>n.hidden=n.dataset.photoView!==next);panel.querySelectorAll('[data-photo-tab]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.photoTab===next)));if(next==='library')void refreshAlbum();paintBackgrounds();status.textContent=storageNotice;}
 for(const theme of PHOTO_BACKGROUNDS){const button=document.createElement('button');button.type='button';button.dataset.photoBackground=theme.id;button.style.setProperty('--photo-theme-dark',theme.colors[0]);button.style.setProperty('--photo-theme-light',theme.colors[1]);const swatch=document.createElement('i'),label=document.createElement('span');swatch.setAttribute('aria-hidden','true');label.textContent=theme.name;button.append(swatch,label);button.onclick=()=>{if(!isHost()||pending||!canUse())return;status.textContent='背景を変更中…';changeBackground(theme.id);};panel.querySelector('.photoBackgroundGrid').append(button);}
 function update(){
  if(!isActive()){reset();return;}syncPoseButton();const t=clock();library.prune();
  if(album.some(photo=>t>=photo.expiresAt)){album=album.filter(photo=>t<photo.expiresAt);renderAlbum();status.textContent=album.length?'写真は撮影から1分間だけ保存できます':'写真の保存期間が終了しました';}
  if(albumOwner&&albumOwner!==String(getUid()||'')){reset();return;}
  const viewing=shot&&t<shot.at+150&&t>=shot.at-5000&&!!shot.members?.[getUid()]&&(isNear()||isAtCamera());overlay.hidden=!viewing;
  if(viewing){document.body.dataset.lobbyPhoto='countdown';const label=String(Math.max(1,Math.ceil((shot.at-t)/1000)));if(number.textContent!==label)number.textContent=label;}
  else if(document.body.dataset.lobbyPhoto==='countdown')delete document.body.dataset.lobbyPhoto;
  if(pending&&!pending.flashed&&t>=pending.at){pending.flashed=true;if(shot?.members?.[getUid()]&&(isNear()||isAtCamera()))flashUntil=t+180;}
  flash.hidden=t>=flashUntil;
  if(pending&&t>pending.at+10000){post({type:'lobby-photo-cancel',id:pending.id});pending=null;storageNotice='撮影できませんでした。もう一度お試しください。';}
  if(!panel.hidden){if(!canUse()){close();return;}paintBackgrounds();panel.querySelector('[data-photo-shutter]').disabled=!!pending;save.disabled=saving||!selected;}
 }
 function ensureTimer(){if(!timer)timer=window.setInterval(update,80);}
 function sync(next,nextBackground='aurora'){
  if(PHOTO_BACKGROUNDS.some(p=>p.id===nextBackground)&&background!==nextBackground){background=nextBackground;paintBackgrounds();if(!panel.hidden)status.textContent='背景を「'+PHOTO_BACKGROUNDS.find(p=>p.id===background).name+'」に変更しました';}
  if(!isActive()){reset();return;}ensureTimer();syncPoseButton();if(!next)return;if(next.id===seen)return;
  if(typeof next.id!=='string'||!Number.isFinite(next.at)||next.expiresAt!==next.at+60000||next.at-clock()>6000||clock()>=next.at)return;
  if(pending)post({type:'lobby-photo-cancel',id:pending.id});close();seen=next.id;shot=next;pending={id:next.id,at:next.at,owner:String(getUid()||'')};
  post({type:'lobby-photo-start',id:next.id,at:Date.now()+next.at-clock(),background:next.background||background,poses:next.poses||{},framed:true,dateLabel:new Date(next.at).toLocaleDateString('ja-JP'),preview:!!next.members?.[getUid()]});ensureTimer();update();
 }
 function start(){if(!canUse()||pending)return;close();request({framed:true});}
 function openAtCamera(){if(!canUse())return;opener=document.activeElement;panel.hidden=false;panel.inert=false;panel.dataset.spaceUiVisible='true';panel.setAttribute('aria-hidden','false');document.body.dataset.lobbyPhoto='result';setView('camera');ensureTimer();update();panel.querySelector('[data-photo-close]').focus();}

 window.addEventListener('message',async event=>{
  const data=event.data;if(event.source!==frame()?.contentWindow||!pending||data?.id!==pending.id)return;
  if(data.type==='lobby-photo-error'){pending=null;storageNotice='撮影できませんでした。もう一度お試しください。';return;}
  if(data.type!=='lobby-photo-result'||typeof data.image!=='string'||data.image.length>16000000||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data.image))return;
  if(!isActive()||pending.owner!==String(getUid()||'')){reset();return;}
  const owner=pending.owner,photo={id:shot.id,image:data.image,at:shot.at,expiresAt:shot.expiresAt,background:shot.background||background};
  if(!pending.flashed&&shot.members?.[getUid()]&&(isNear()||isAtCamera()))flashUntil=clock()+180;
  pending=null;const stored=await library.add(owner,photo);if(owner!==String(getUid()||'')||!isActive())return;
  storageNotice=stored?'写真を撮影しました。1分以内に保存してください':'写真の保存期間が終了しました';if(!panel.hidden&&view==='library')await refreshAlbum();update();
 });
 save.onclick=async()=>{
  const current=selected;if(!current||clock()>=current.expiresAt||!canUse()||saving)return;saving=true;save.disabled=true;
  try{const blob=await(await window.fetch(current.image)).blob();if(clock()>=current.expiresAt||!isActive()||current.owner!==String(getUid()||''))return;const name='SPACE-SUSPECT-'+new Date(current.at).toISOString().replace(/[:.]/g,'-')+'.png',file=new window.File([blob],name,{type:'image/png'});
   if(window.navigator.canShare?.({files:[file]}))await window.navigator.share({files:[file],title:'SPACE SUSPECT 集合写真'});
   else{const url=window.URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();window.setTimeout(()=>window.URL.revokeObjectURL(url),60000);}
  }catch(error){if(error.name!=='AbortError')status.textContent='写真を長押しして保存することもできます';}finally{saving=false;save.disabled=!selected;}
 };
 panel.querySelector('[data-photo-shutter]').onclick=start;panel.querySelector('[data-photo-close]').onclick=close;panel.querySelectorAll('[data-photo-tab]').forEach(button=>button.onclick=()=>setView(button.dataset.photoTab));
 // Direct pointer actions coexist with the game's document-level touch filter.
 for(const surface of [panel,poseButton]){surface.addEventListener('pointerdown',event=>{const button=event.target.closest('button');if(!button||button.disabled||event.button!==0)return;event.preventDefault();event.stopPropagation();button.dataset.photoPointerAt=String(window.performance.now());button.click();},{passive:false});
 surface.addEventListener('click',event=>{const button=event.target.closest('button');if(button&&event.isTrusted&&event.detail>0&&window.performance.now()-Number(button.dataset.photoPointerAt||-Infinity)<800){event.preventDefault();event.stopImmediatePropagation();}},true);}
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});
 new MutationObserver(()=>{if(!isActive()&&(shot||!panel.hidden))reset();}).observe(document.body,{attributes:true,attributeFilter:['data-phase','data-logging-out']});window.addEventListener('pagehide',reset);
 return{start,sync,openAtCamera,syncPoseButton,close:reset,get busy(){return !panel.hidden;}};
}
