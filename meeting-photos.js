import './meeting-photos.css';

const marker=/\[photo:([a-f0-9]{24})\]/;
const validImage=value=>typeof value==='string'&&value.length<=49152&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value);
export function createMeetingPhotoLibrary({getContext,capture,transport,sendChat,notify,onChange=()=>{}}){
 const images=new Map(),incoming=new Map(),requested=new Map();let scope='',gallery=null,viewer=null,trigger=null,lastShare=0;
 const context=()=>getContext();
 function sync(){
  const c=context(),key=c.room+':'+c.round;
  if(key!==scope){scope=key;images.clear();incoming.clear();requested.clear();gallery?.remove();viewer?.remove();gallery=viewer=null;}
  if(!trigger){trigger=document.createElement('button');trigger.id='ssxPhotoGalleryOpen';trigger.type='button';trigger.textContent='写真ライブラリ';trigger.onclick=open;document.body.append(trigger);}
  trigger.hidden=c.blocked||!c.room||!['play','meeting','results'].includes(c.phase)||!(c.role==='photographer'||[...images.values()].some(image=>image.from===c.uid));
  if(trigger.hidden){gallery?.remove();gallery=null;if(c.blocked||!c.room){viewer?.remove();viewer=null;}}
 }
 function remember(id,item){images.set(id,item);while(images.size>12)images.delete(images.keys().next().value);onChange();if(gallery)open();}
 function recipients(c){const me=c.players[c.uid],ghost=me?.alive===false||me?.observer;return Object.keys(c.players).filter(id=>!c.players[id]?.bot&&!c.players[id]?.disconnected&&(!ghost||c.players[id].alive===false||c.players[id].observer));}
 function deliver(id,item,to){
  const total=Math.ceil(item.url.length/2048);let ok=true;
  for(let index=0;index<total;index++)ok=transport({kind:'photo-chunk',id,index,total,data:item.url.slice(index*2048,(index+1)*2048),round:context().round},to)&&ok;
  return ok;
 }
 function receive(data,{from}={}){
  const c=context();if(!data||data.round!==c.round||!c.players[from]||!/^([a-f0-9]{24})$/.test(data.id||''))return;
  if(data.kind==='photo-request'){
   const item=images.get(data.id),person=c.players[from],me=c.players[c.uid];
   if(item?.from===c.uid&&(me?.alive!==false&&!me?.observer||person.alive===false||person.observer))deliver(data.id,item,[from]);return;
  }
  if((c.players[from].alive===false||c.players[from].observer)&&c.players[c.uid]?.alive!==false&&!c.players[c.uid]?.observer)return;
  if(data.kind!=='photo-chunk'||!Number.isInteger(data.index)||!Number.isInteger(data.total)||data.total<1||data.total>24||data.index<0||data.index>=data.total||typeof data.data!=='string'||data.data.length>2048)return;
  if(images.get(data.id)?.from===from)return;
  const key=from+':'+data.id;let transfer=incoming.get(key);
  if(!transfer){if(incoming.size>=8)incoming.delete(incoming.keys().next().value);transfer={parts:new Map(),total:data.total,at:Date.now()};incoming.set(key,transfer);}
  if(transfer.total!==data.total||Date.now()-transfer.at>15000){incoming.delete(key);return;}
  transfer.parts.set(data.index,data.data);
  if(transfer.parts.size===transfer.total){
   const url=Array.from({length:transfer.total},(_,i)=>transfer.parts.get(i)).join('');incoming.delete(key);
   if(validImage(url))remember(data.id,{url,from,at:Date.now()});
  }
 }
 function request(id,from){
  if(Date.now()-(requested.get(id)||0)<2500)return;requested.set(id,Date.now());transport({kind:'photo-request',id,round:context().round},[from]);
 }
 function button(text,action){const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=action;return b;}
 function modal(id){const panel=document.createElement('section');panel.id=id;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.className='meetingPhotoOverlay';document.body.append(panel);return panel;}
 function showImage(id,from){
  const item=images.get(id);if(!item||item.from!==from){request(id,from);notify('写真を受信中です。少し待ってからもう一度押してください。');return;}
  viewer?.remove();viewer=modal('meetingPhotoViewer');viewer.setAttribute('aria-label','写真の拡大表示');
  const close=button('閉じる',()=>{viewer?.remove();viewer=null;}),img=document.createElement('img');img.src=item.url;img.alt='会議で共有された写真';
  viewer.append(img,close);viewer.onclick=e=>{if(e.target===viewer)close.click();};close.focus({preventScroll:true});
 }
 function decorate(node,text,from){
  const id=String(text||'').match(marker)?.[1];if(!id)return;
  node.dataset.photoId=id;node.replaceChildren();
  const item=images.get(id),b=button('写真を表示',()=>showImage(id,from));b.className='meetingPhotoThumb';
  if(item?.from===from){const image=document.createElement('img');image.src=item.url;image.alt='撮影した写真を拡大';image.loading='lazy';b.replaceChildren(image);}else request(id,from);
  node.append(b);
 }
 function syncFrame(frame){if(!frame)return;for(const[id,item]of images)frame.postMessage({type:'ss3d-photo-cache',id,url:item.url,from:item.from},'*');}
 function open(){
  sync();gallery?.remove();gallery=modal('ssxPhotoGallery');gallery.setAttribute('aria-label','写真ライブラリ');const card=document.createElement('div');card.className='meetingPhotoCard';
  const head=document.createElement('header'),title=document.createElement('strong');title.textContent='写真ライブラリ';head.append(title,button('閉じる',()=>{gallery?.remove();gallery=null;}));card.append(head);
  const own=[...images].filter(([,item])=>item.from===context().uid);
  if(!own.length){const empty=document.createElement('p');empty.textContent='写真はまだありません。';card.append(empty);}
  for(const[id,item]of own.reverse()){
   const figure=document.createElement('figure'),image=document.createElement('img');image.src=item.url;image.alt='撮影した写真';image.onclick=()=>showImage(id,item.from);
   const share=button('会議チャットに送る',()=>{
    const c=context();if(c.phase!=='meeting'){notify('会議中に送信できます。');return;}
    if(Date.now()-lastShare<1800)return;
    if(!deliver(id,item,recipients(c))){notify('写真の通信を再接続中です。少し待ってから送信してください。');return;}
    if(sendChat('写真 '+`[photo:${id}]`)){lastShare=Date.now();notify('写真を会議チャットに送りました。');gallery?.remove();gallery=null;}
   });share.disabled=context().phase!=='meeting';figure.append(image,share);card.append(figure);
  }
  gallery.append(card);gallery.onclick=e=>{if(e.target===gallery){gallery.remove();gallery=null;}};
 }
 function take(){sync();try{const url=capture();if(!validImage(url))throw Error('Invalid snapshot');const id=crypto.randomUUID().replaceAll('-','').slice(0,24);remember(id,{url,from:context().uid,at:Date.now()});notify('写真を保存しました。');open();}catch(error){console.warn('Game photo capture failed',error);notify('写真を保存できませんでした。');}}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(viewer||gallery)){e.preventDefault();e.stopPropagation();if(viewer){viewer.remove();viewer=null;}else if(gallery){gallery.remove();gallery=null;}}});
 return{sync,open,take,receive,decorate,syncFrame,showImage,clear:()=>{scope='';images.clear();incoming.clear();requested.clear();gallery?.remove();viewer?.remove();trigger?.remove();gallery=viewer=trigger=null;}};
}
