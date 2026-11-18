import './meeting-photos.css';

export const meetingPhotoId=text=>/^写真 \[photo:([a-f0-9]{24})\]$/.exec(String(text||''))?.[1]||'';
const validImage=value=>typeof value==='string'&&value.length<=49152&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value);
export function createMeetingPhotoLibrary({getContext,capture,savePhoto,loadPhoto,sendChat,notify,onChange=()=>{}}){
 const images=new Map(),requested=new Map();let scope='',gallery=null,viewer=null,trigger=null,lastShare=0,sending=false;
 let pendingShot=null,shutterFrame=null,shutterTimer=0;
 const context=()=>getContext();
 function closeShutter(){
  clearTimeout(shutterTimer);shutterFrame?.remove();shutterFrame=null;
  delete document.body.dataset.photoShutter;
 }
 function snapshot(){
  const {canvas,url}=capture();
  if(!validImage(url))throw Error('Invalid snapshot');
  closeShutter();
  canvas.id='rolePhotoShutter';canvas.setAttribute('aria-hidden','true');
  shutterFrame=canvas;document.body.append(canvas);document.body.dataset.photoShutter='true';
  shutterTimer=setTimeout(closeShutter,220);
  return url;
 }
 function prepareShot(commandId){
  sync();
  try{pendingShot={commandId,url:snapshot()};}
  catch(error){pendingShot=null;closeShutter();console.warn('Game photo preview failed',error);}
 }
 function cancelShot(){pendingShot=null;closeShutter();}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)closeShutter();});

 function mayShare(c){const me=c.players[c.uid];return c.phase==='meeting'&&!!me?.alive&&!me.observer&&!me.disconnected;}

 function sync(){
  const c=context(),key=c.room+':'+c.round+':'+c.uid;
  if(key!==scope){cancelShot();if(scope)try{sessionStorage.removeItem('ssx-photos:'+scope);}catch{}scope=key;images.clear();requested.clear();gallery?.remove();viewer?.remove();gallery=viewer=null;if(c.room&&c.uid)try{for(const [id,item] of JSON.parse(sessionStorage.getItem('ssx-photos:'+scope)||'[]'))if(/^[a-f0-9]{24}$/.test(id)&&item?.from===c.uid&&validImage(item.url))images.set(id,item);}catch{}}
  if((pendingShot||shutterFrame)&&(c.phase!=='play'||c.blocked||!c.players[c.uid]?.alive))cancelShot();
  if(!trigger){trigger=document.createElement('button');trigger.id='ssxPhotoGalleryOpen';trigger.type='button';trigger.textContent='写真ライブラリ';trigger.onclick=open;trigger.dataset.nativeTap='';}
  const parent=c.phase==='meeting'?document.getElementById('meeting'):document.body;
  if(parent&&trigger.parentElement!==parent){
   parent.append(trigger);
   if(c.phase==='meeting'){trigger.inert=false;trigger.removeAttribute('aria-hidden');}
  }
  trigger.hidden=c.blocked||!c.room||!['play','meeting','results'].includes(c.phase)||!(c.role==='photographer'||[...images.values()].some(image=>image.from===c.uid));
  if(gallery)for(const share of gallery.querySelectorAll('figure button'))share.disabled=!mayShare(c)||sending;
  if(trigger.hidden){gallery?.remove();gallery=null;if(c.blocked||!c.room){viewer?.remove();viewer=null;}}
 }
 function remember(id,item){images.set(id,item);while(images.size>12)images.delete(images.keys().next().value);if(item.from===context().uid)try{sessionStorage.setItem('ssx-photos:'+scope,JSON.stringify([...images].filter(([,photo])=>photo.from===context().uid)));}catch(error){console.warn('写真の一時保存に失敗しました',error);}onChange();if(gallery)open();}
 async function request(id,manual=false){
  if(requested.has(id)&&(!manual||Date.now()-requested.get(id)<2500))return;
  requested.set(id,Date.now());
  const originalScope=scope;
  try{
   const url=await loadPhoto(id);
   if(scope!==originalScope)return;
   if(validImage(url)){remember(id,{url,shared:true});return;}
  }catch{}
  if(manual&&scope===originalScope)notify('写真を受信できませんでした。もう一度押してください。');
 }
 function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;}
 function modal(id){const panel=document.createElement('section');panel.id=id;panel.dataset.nativeTap='';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.className='meetingPhotoOverlay';document.body.append(panel);return panel;}
 function showImage(id){
  const item=images.get(id);if(!item){void request(id,true);notify('写真を受信中です。少し待ってからもう一度押してください。');return;}
  viewer?.remove();viewer=modal('meetingPhotoViewer');viewer.setAttribute('aria-label','写真の拡大表示');
  const close=button('閉じる',()=>{viewer?.remove();viewer=null;}),img=document.createElement('img');img.src=item.url;img.alt='会議で共有された写真';
  viewer.append(img,close);viewer.onclick=e=>{if(e.target===viewer)close.click();};close.focus({preventScroll:true});
 }
 function decorate(node,text){
  const id=meetingPhotoId(text);if(!id)return;
  node.dataset.photoId=id;node.replaceChildren();
  const item=images.get(id),b=button('写真を表示',()=>showImage(id));b.className='meetingPhotoThumb';
  if(item){const image=document.createElement('img');image.src=item.url;image.alt='撮影した写真を拡大';image.loading='lazy';b.replaceChildren(image);}else request(id);
  node.append(b);
 }
 function syncFrame(frame){if(!frame)return;for(const[id,item]of images)if(item.shared||item.from!==context().uid)frame.postMessage({type:'ss3d-photo-cache',id,url:item.url},'*');}
 function open(){
  sync();gallery?.remove();gallery=modal('ssxPhotoGallery');gallery.setAttribute('aria-label','写真ライブラリ');const card=document.createElement('div');card.className='meetingPhotoCard';
  const head=document.createElement('header'),title=document.createElement('strong');title.textContent='写真ライブラリ';head.append(title,button('閉じる',()=>{gallery?.remove();gallery=null;}));card.append(head);
  const own=[...images].filter(([,item])=>item.from===context().uid);
  if(!own.length){const empty=document.createElement('p');empty.textContent='写真はまだありません。';card.append(empty);}
  for(const[id,item]of own.reverse()){
   const figure=document.createElement('figure'),image=document.createElement('img');image.src=item.url;image.alt='撮影した写真';image.onclick=()=>showImage(id);
   const share=button('会議に匿名で送る',async()=>{
    const c=context();if(!mayShare(c)||sending||Date.now()-lastShare<1800)return;
    const originalScope=scope;sending=true;share.disabled=true;
    try{
     try{await savePhoto(id,item.url);}
     catch{
      if(scope===originalScope)notify('写真を送信できませんでした。接続を確認してもう一度送ってください。');
      return;
     }
     if(scope!==originalScope||context().meetingId!==c.meetingId||!mayShare(context()))return;
     if(sendChat('写真 '+`[photo:${id}]`)){lastShare=Date.now();gallery?.remove();gallery=null;remember(id,{...item,shared:true});}
    }finally{sending=false;share.disabled=!mayShare(context());}
   });share.disabled=!mayShare(context())||sending;figure.append(image,share);card.append(figure);
  }
  gallery.append(card);gallery.onclick=e=>{if(e.target===gallery){gallery.remove();gallery=null;}};
 }
 function take(commandId){
  sync();
  try{
   const url=pendingShot?.commandId===commandId?pendingShot.url:snapshot();
   const id=crypto.randomUUID().replaceAll('-','').slice(0,24);
   remember(id,{url,from:context().uid,at:Date.now()});notify('写真を保存しました。');open();
  }catch(error){closeShutter();console.warn('Game photo capture failed',error);notify('写真を保存できませんでした。');}
  finally{pendingShot=null;}
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(viewer||gallery)){e.preventDefault();e.stopPropagation();if(viewer){viewer.remove();viewer=null;}else if(gallery){gallery.remove();gallery=null;}}});
 return{sync,open,prepareShot,take,decorate,syncFrame,showImage,ensure:id=>{if(!images.has(id))void request(id);},clear:()=>{cancelShot();if(scope)try{sessionStorage.removeItem('ssx-photos:'+scope);}catch{}scope='';images.clear();requested.clear();gallery?.remove();viewer?.remove();trigger?.remove();gallery=viewer=trigger=null;}};
}
