import './meeting-location-map.css';
import {roomIcon,loadRoomIcons} from './meeting-room-icons.js';
import {normalizeLocationSelection,normalizeLocationReport,locationReportText,locationRoom,routeSegments,MAX_ROUTE_STOPS} from './meeting-location-rules.js';
const NS='http://www.w3.org/2000/svg';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const shape=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);return n;};
const color=record=>/^#[a-f0-9]{6}$/i.test(record?.color||'')?record.color:'#86d9ed';
const points=region=>Array.isArray(region.polygon)?region.polygon:[{x:region.x-region.w/2,z:region.z-region.d/2},{x:region.x+region.w/2,z:region.z-region.d/2},{x:region.x+region.w/2,z:region.z+region.d/2},{x:region.x-region.w/2,z:region.z+region.d/2}];
export function drawLocationMap(layout,records=[],{compact=false,selected='',onRoom}={}){
 const b=layout.bounds,w=b.maxX-b.minX,h=b.maxZ-b.minZ,unit=w/100;
 const svg=shape('svg',{viewBox:`${b.minX-2*unit} ${b.minZ-2*unit} ${w+4*unit} ${h+4*unit}`,role:'img','aria-label':'会議の共有マップ'});svg.classList.add('meetingLocationSvg');svg.style.setProperty('--map-aspect',String(w/h));
 for(const region of [...(layout.corridors||[]),...layout.rooms])svg.append(shape('polygon',{points:points(region).map(p=>`${p.x},${p.z}`).join(' '),fill:layout.rooms.includes(region)?'#203748':'#142b3d',stroke:'#708fa4','stroke-width':.7,'vector-effect':'non-scaling-stroke'}));
 const labels=[];
 for(const room of layout.rooms){
  const group=shape('g',{'data-room':room.id});
  const active=records.some(record=>record.report.kind!=='route'&&record.report.selection?.roomId===room.id),highlight=records.find(record=>record.report.selection?.roomId===room.id);
  if(active)svg.append(shape('polygon',{points:points(room).map(p=>`${p.x},${p.z}`).join(' '),fill:color(highlight),'fill-opacity':.3,stroke:color(highlight),'stroke-width':2,'vector-effect':'non-scaling-stroke'}));
  if(!compact){
   const text=String(room.label||room.name||room.id),font=unit*1.55,width=Math.max(4,text.length)*font*.96,icon=roomIcon(room),size=unit*3.6;
   group.append(shape('rect',{x:room.x-width/2-unit*.7-size,y:room.z-size/2,width:width+unit*1.4+size,height:size,rx:unit*.5,fill:'#091623',stroke:active?'#ffe29a':'#69899d','stroke-width':.7,'vector-effect':'non-scaling-stroke'}));
   group.append(shape('image',{...(icon.url?{href:icon.url}:{}),x:room.x-width/2-unit*.7-size,y:room.z-size/2,width:size,height:size,'data-room-icon':icon.kind,'aria-hidden':'true','pointer-events':'none'}));
   if(!icon.url)group.append(shape('circle',{cx:room.x-width/2-unit*.7-size/2,cy:room.z,r:unit*.8,fill:icon.color,'data-icon-placeholder':'true','pointer-events':'none'}));
   group.append(shape('text',{x:room.x,y:room.z+font*.38,'font-size':font,'text-anchor':'middle'},text));
   if(onRoom){group.setAttribute('role','button');group.setAttribute('tabindex','0');group.setAttribute('aria-label',text+'を選択');group.addEventListener('click',e=>{e.stopPropagation();onRoom(room);});group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onRoom(room);}});}
   labels.push(group);
  }
 }
 let serial=0;const occupied=new Map();
 for(const record of records){
  const r=record.report,c=color(record),group=shape('g',{'data-report':record.id||'','pointer-events':'none',opacity:selected&&record.id!==selected?'.45':'1'});
  if(r.kind==='route'){
   const arrowId='location-arrow-'+(++serial)+'-'+Math.random().toString(36).slice(2,7),defs=shape('defs'),marker=shape('marker',{id:arrowId,viewBox:'0 0 10 10',refX:8,refY:5,markerWidth:5,markerHeight:5,orient:'auto-start-reverse'});marker.append(shape('path',{d:'M0 0L10 5L0 10Z',fill:c}));defs.append(marker);svg.append(defs);
   for(const segment of routeSegments(r.stops,unit*1.2)){
    const a=segment.from,z=segment.to;group.append(shape('path',{d:`M${a.x},${a.z}L${z.x},${z.z}`,fill:'none',stroke:c,'stroke-width':compact?1.8:2.8,'stroke-linecap':'round','vector-effect':'non-scaling-stroke','marker-end':`url(#${arrowId})`,'data-route-step':segment.step}));
    const dx=z.x-a.x,dz=z.z-a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,ax=a.x+dx*.62,az=a.z+dz*.62;
    group.append(shape('polygon',{points:[[ax+ux*unit*1.4,az+uz*unit*1.4],[ax-ux*unit*.8-uz*unit*.85,az-uz*unit*.8+ux*unit*.85],[ax-ux*unit*.8+uz*unit*.85,az-uz*unit*.8-ux*unit*.85]].map(p=>p.join(',')).join(' '),fill:c}));
    if(!compact)group.append(shape('text',{x:(a.x+z.x)/2-uz*unit*1.7,y:(a.z+z.z)/2+ux*unit*1.7,'font-size':unit*1.7,'text-anchor':'middle',fill:c},segment.step));
   }
   for(const [i,stop]of r.stops.entries())group.append(shape('circle',{cx:stop.x,cy:stop.z,r:unit*.75,fill:c,stroke:'#091623','stroke-width':1,'vector-effect':'non-scaling-stroke'}));
   const first=r.stops[0],last=r.stops.at(-1);if(!compact){group.append(shape('text',{x:first.x,y:first.z-unit*2,'font-size':unit*1.7,'text-anchor':'middle'},'出発'));group.append(shape('text',{x:last.x,y:last.z+unit*3,'font-size':unit*1.7,'text-anchor':'middle'},(record.name||'あなた')+' 到着'));}
  }else{
   const p=r.selection,key=p.x+':'+p.z,offset=(occupied.get(key)||0);occupied.set(key,offset+1);
   const x=p.x+offset*unit*3,y=p.z-unit*2.6;
   group.append(shape('line',{x1:p.x,y1:p.z,x2:x,y2:y,stroke:c,'stroke-width':1.5,'vector-effect':'non-scaling-stroke'}));
   group.append(shape('circle',{cx:x,cy:y,r:unit*1.65,fill:c,stroke:'#07111d','stroke-width':1.5,'vector-effect':'non-scaling-stroke','data-location-pin':r.kind}));
   group.append(shape('text',{x,y:y+unit*.65,'text-anchor':'middle','font-size':unit*2,fill:'#07111d'},r.kind==='body'?'×':'●'));
   if(!compact)group.append(shape('text',{x,y:y-unit*2.2,'font-size':unit*1.7,'text-anchor':'middle'},r.kind==='body'?(r.victimName||'死体')+'（'+record.name+'）':record.name));
  }
  svg.append(group);
 }
 // Room buttons remain easy to hit; pins above them remain visible.
 svg.prepend(...labels); // Re-appended after geography below, without covering report pins.
 const firstReport=svg.querySelector('[data-report]');for(const label of labels)svg.insertBefore(label,firstReport||null);
 return svg;
}
export function createMeetingLocationMap({getContext,getLayout,sendReport,notify}){
 let panel=null,mode='shared',draft=null,scope='',seenAuto=new Set(),zoom=1,focused='',drag=null,renderStamp='',frameTarget=null;
 const cached=new Map(),frameSent=new Set();let actions;
 const context=()=>getContext();
 const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
 function close(){panel?.remove();panel=null;drag=null;renderStamp='';document.getElementById('meetingMapBtn')?.focus({preventScroll:true});}
 function sync(){
  const c=context(),key=[c.room,c.uid,c.round,c.meeting?.startedAt,c.self?.alive===false||c.self?.observer].join(':');
  if(scope!==key){scope=key;close();cached.clear();frameSent.clear();}
  if(!actions){actions=el('div',undefined);actions.id='meetingLocationActions';for(const[k,label]of [['body','死体の場所を報告'],['route','経路を説明']]){const b=button(label,()=>open(k));b.id='meetingLocation-'+k;actions.append(b);}document.getElementById('chatForm')?.before(actions);}
  actions.hidden=c.phase!=='meeting';for(const b of actions.children)b.disabled=!c.canSend;
  const tools=document.getElementById('meetingMapTools'),position=document.getElementById('meetingPositionBtn');if(tools){tools.classList.toggle('hidden',c.phase!=='meeting');tools.hidden=c.phase!=='meeting';}if(position)position.disabled=!c.canSend;
  if(c.phase!=='meeting'){if(panel)close();return;}
  if(panel){if(draft&&mode!=='shared')draft.meetingId=c.meeting.id;panel.querySelector('.meetingLocationSend')?.toggleAttribute('disabled',!ready()||!c.canSend);if(mode==='shared'&&!drag)paint();}
  const autoKey=[c.room,c.round,c.meeting?.startedAt].join(':');
  if(c.canSend&&c.meeting?.reason==='遺体を発見'&&c.meeting.reporter===c.uid&&c.self?.alive&&!seenAuto.has(autoKey)){
   seenAuto.add(autoKey);if(seenAuto.size>20)seenAuto.delete(seenAuto.values().next().value);if(!panel)open('body');
  }
 }
 function records(){const c=context(),latest=new Map();for(const row of c.reports||[]){const r=row.report;if(!r||r.mapMode!==c.mapMode)continue;latest.set(row.uid+':'+r.kind+':'+(r.victimId||''),row);}const list=[...latest.values()];if(focused&&cached.has(focused)&&!list.some(r=>r.id===focused))list.push(cached.get(focused).record);return list;}
 function ready(){return mode==='route'?draft?.stops?.length>=2:!!draft?.selection;}
 function rawSelection(point){const room=locationRoom(getLayout(context().mapMode),point.x,point.z);return room?{roomId:room.id}:{x:point.x,z:point.z};}
 function addStop(selection){
  if(draft.stops.length>=MAX_ROUTE_STOPS)return;const normalized=normalizeLocationSelection(selection,getLayout(context().mapMode));if(!normalized)return;
  const last=draft.stops.at(-1);if(last&&(last.roomId&&last.roomId===normalized.roomId||Math.hypot(last.x-normalized.x,last.z-normalized.z)<1.5))return;
  draft.stops.push(normalized);paint();
 }
 function selectRoom(room){if(mode==='shared')return;if(mode==='route')addStop({roomId:room.id});else{draft.selection=normalizeLocationSelection({roomId:room.id},getLayout(context().mapMode));paint();}}
 function mapPoint(event,svg){const pt=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());return {x:pt.x,z:pt.y};}
 function paint(){
  if(!panel)return;const c=context(),layout=getLayout(c.mapMode),list=mode==='shared'?records():[];
  const own=mode!=='shared'&&ready()?{id:'draft',uid:c.uid,name:c.self?.name||'あなた',color:c.color,report:draft}:null;
  // A single start point should also be visible while drawing a route.
  if(mode==='route'&&draft.stops.length&&!own)list.push({id:'draft',uid:c.uid,name:'あなた',color:c.color,report:draft});else if(own)list.push(own);
  const stamp=JSON.stringify([mode,list,zoom,focused]);if(stamp===renderStamp)return;renderStamp=stamp;
  const viewport=panel.querySelector('.meetingLocationViewport'),previous=viewport.querySelector('svg');viewport.dataset.zoom=String(zoom);
  const svg=drawLocationMap(layout,list,{selected:focused,onRoom:mode!=='shared'?selectRoom:null}),box=svg.viewBox.baseVal,aspect=box.width/box.height,fitWidth=Math.min(viewport.clientWidth,innerHeight*(innerHeight<=500?.36:.5)*aspect);svg.style.width=fitWidth*zoom+'px';svg.style.height=fitWidth*zoom/aspect+'px';svg.style.marginInline='auto';svg.setAttribute('tabindex','0');svg.setAttribute('aria-label',mode==='route'?'経路をドラッグして描くマップ':'場所を選ぶマップ');
  if(drag){ // Keep the captured SVG alive until the drawing finger is released.
   previous?.querySelector('[data-draft-preview]')?.remove();const group=shape('g',{'data-draft-preview':'true'});for(const n of [...svg.querySelectorAll('[data-report],defs')])group.append(n);previous?.append(group);
  }else{previous?.remove();viewport.append(svg);}
  const summary=panel.querySelector('.meetingLocationSelection');summary.textContent=mode==='shared'?(list.length?focused?cached.get(focused)?.text||'共有された報告':'名前と色で、報告された場所を確認できます。':'まだ場所の報告はありません。'):ready()?locationReportText(draft):mode==='route'?'出発地点からドラッグしてください。':'まだ場所を選んでいません。';
  const send=panel.querySelector('.meetingLocationSend');if(send)send.disabled=!ready()||!c.canSend;
  syncRoomPicker();
  const undo=panel.querySelector('[data-route-undo]');if(undo)undo.disabled=!draft?.stops?.length;
  if(mode==='shared'){
   const legend=panel.querySelector('.meetingLocationLegend');legend.replaceChildren();for(const row of list){const b=button(row.name+' · '+({body:'死体',position:'現在位置',route:'経路'}[row.report.kind]),()=>{focused=focused===row.id?'':row.id;paint();});b.style.setProperty('--report-color',color(row));b.setAttribute('aria-pressed',String(focused===row.id));legend.append(b);}
  }
  if(mode==='shared')return;
  svg.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;
   if(mode==='route'){e.preventDefault();const p=mapPoint(e,svg);drag={id:e.pointerId,svg};addStop(rawSelection(p));try{svg.setPointerCapture(e.pointerId);}catch{};}
  });
  svg.addEventListener('pointermove',e=>{if(mode==='route'&&drag?.id===e.pointerId){e.preventDefault();addStop(rawSelection(mapPoint(e,svg)));}});
  const end=e=>{if(drag?.id!==e.pointerId)return;drag=null;renderStamp='';paint();};svg.addEventListener('pointerup',end);svg.addEventListener('pointercancel',end);
  svg.addEventListener('click',e=>{if(mode==='route'||e.target.closest('[data-room]'))return;const selected=normalizeLocationSelection(mapPoint(e,svg),layout);if(selected){draft.selection=selected;paint();}});
 }
 function syncRoomPicker(){
  if(!panel)return;
  for(const entry of panel.querySelectorAll('[data-pick-room]')){
   const room=getLayout(context().mapMode).rooms.find(r=>r.id===entry.dataset.pickRoom),icon=roomIcon(room),img=entry.querySelector('img');
   if(icon.url&&img.getAttribute('src')!==icon.url){img.src=icon.url;img.hidden=false;}
   entry.setAttribute('aria-pressed',String(mode==='route'?draft.stops.some(s=>s.roomId===room.id):draft?.selection?.roomId===room.id));
  }
 }
 function open(kind='shared',key=''){
  const c=context();if(c.phase!=='meeting')return;if(kind!=='shared'&&!c.canSend){notify('会議チャットを使える状態になってから報告できます。');return;}
  close();mode=kind;focused=key;zoom=1;draft={kind,mapMode:c.mapMode,meetingId:c.meeting.id,victimId:kind==='body'?c.meeting.bodyId||'':'',stops:[]};
  panel=el('section',undefined,'meetingLocationOverlay');panel.id='meetingLocationMap';panel.dataset.nativeTap='true';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',kind==='shared'?'会議の共有マップ':kind==='body'?'死体の場所を報告する':kind==='position'?'自分の現在位置を報告する':'経路を説明する');
  const card=el('div',undefined,'meetingLocationCard'),header=el('header');header.append(el('strong',panel.getAttribute('aria-label')),button('閉じる',close));card.append(header);
  const toolbar=el('div',undefined,'meetingLocationToolbar');for(const[k,label]of [['shared','共有マップ'],['body','死体の場所'],['position','自分の現在位置'],['route','経路を説明']]){const b=button(label,()=>open(k));b.setAttribute('aria-pressed',String(kind===k));b.disabled=k!=='shared'&&!c.canSend;toolbar.append(b);}
  if(kind==='body'){
   const label=el('label','誰の死体：'),select=el('select');select.setAttribute('aria-label','死体のプレイヤー');select.append(new Option('不明・名前を付けない',''));
   const victims=new Map(Object.entries(c.players||{}).filter(([,p])=>p.alive===false&&!p.observer).map(([id,p])=>[id,p.name]));if(c.meeting.bodyId)victims.set(c.meeting.bodyId,c.meeting.body?.name||victims.get(c.meeting.bodyId)||'通報された死体');for(const[id,name]of victims)select.append(new Option(name,id));select.value=draft.victimId;draft.victimName=victims.get(draft.victimId)||'';select.onchange=()=>{draft.victimId=select.value;draft.victimName=victims.get(select.value)||'';renderStamp='';paint();};label.append(select);toolbar.append(label);
  }
  const zoomButton=button('拡大',()=>{zoom=zoom===1?1.7:zoom===1.7?2.5:1;zoomButton.textContent=zoom===1?'拡大':zoom+'倍';paint();});toolbar.append(zoomButton);
  if(kind==='route'){const undo=button('一つ戻す',()=>{draft.stops.pop();paint();});undo.dataset.routeUndo='true';toolbar.append(undo,button('描き直す',()=>{draft.stops=[];paint();}));}
  card.append(toolbar,el('p',kind==='shared'?'会議で共有された場所と経路です。':kind==='route'?'出発地点からドラッグ。部屋名を順に押しても描けます。往復は別々の矢印で表示します。':'部屋のアイコン・名前で部屋全体、マップを直接押すと細かい位置を選べます。','meetingLocationHint'));
  if(c.self?.alive===false||c.self?.observer)card.append(el('p','送信先：ゴーストチャット','meetingLocationHint'));
  const viewport=el('div',undefined,'meetingLocationViewport');viewport.dataset.route=String(kind==='route');card.append(viewport);
  if(kind==='shared')card.append(el('div',undefined,'meetingLocationLegend'));
  else{
   const picker=el('details',undefined,'meetingLocationRooms'),grid=el('div',undefined,'meetingLocationRoomGrid');picker.append(el('summary','部屋一覧から選ぶ'));
   for(const room of getLayout(c.mapMode).rooms){const icon=roomIcon(room),entry=button('',()=>selectRoom(room)),img=el('img');img.width=36;img.height=36;img.alt='';img.hidden=!icon.url;if(icon.url)img.src=icon.url;entry.dataset.pickRoom=room.id;entry.setAttribute('aria-label',(room.label||room.name)+'を選択');entry.style.setProperty('--room-color',icon.color);entry.append(img,el('span',room.label||room.name));grid.append(entry);}
   picker.append(grid);card.append(picker);
  }
  const footer=el('footer',undefined,'meetingLocationFooter');footer.append(el('p','', 'meetingLocationSelection'));
  if(kind!=='shared')footer.append(button('送信',()=>{
   if(!ready())return;const live=context(),report=normalizeLocationReport(draft,{layout:getLayout(live.mapMode),mapMode:live.mapMode,meeting:live.meeting,players:live.players});
   if(!report){notify('場所を選び直してください。');return;}if(sendReport(report))close();
  },'meetingLocationSend'));
  card.append(footer);panel.append(card);document.body.append(panel);panel.onclick=e=>{if(e.target===panel)close();};paint();header.querySelector('button').focus({preventScroll:true});
  loadRoomIcons().then(()=>{
   if(!panel)return;
   for(const group of panel.querySelectorAll('[data-room]')){const icon=roomIcon({id:group.dataset.room}),img=group.querySelector('[data-room-icon]');if(icon.url&&img){img.setAttribute('href',icon.url);group.querySelector('[data-icon-placeholder]')?.remove();}}
   syncRoomPicker();
  }).catch(()=>{});
 }
 function decorate(node,report,key,author){
  if(!report||!key)return;const c=context();if(report.mapMode!==c.mapMode)return;const record={id:key,uid:author.uid,name:author.name,color:author.color,report};
  let entry=cached.get(key);if(!entry){const svg=drawLocationMap(getLayout(report.mapMode),[record],{compact:true});entry={record,text:locationReportText(report),svg,url:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg))};cached.set(key,entry);while(cached.size>160)cached.delete(cached.keys().next().value);}
  node.dataset.locationKey=key;node.replaceChildren(document.createTextNode(entry.text));const thumb=button('',()=>open('shared',key),'meetingLocationThumb');thumb.setAttribute('aria-label','報告された場所をマップで見る');thumb.append(entry.svg.cloneNode(true),el('small','タップしてマップを開く'));node.append(thumb);
 }
 function syncFrame(frame,reset=false){if(!frame)return;if(frame!==frameTarget||reset){frameTarget=frame;frameSent.clear();}for(const[key,row]of cached)if(!frameSent.has(key)){frame.postMessage({type:'ss3d-location-cache',key,url:row.url,text:row.text},'*');frameSent.add(key);}}
 window.addEventListener('resize',()=>{if(panel){renderStamp='';paint();}});
 document.addEventListener('keydown',e=>{if(!panel)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}if(e.key==='Tab'){const nodes=[...panel.querySelectorAll('button:not(:disabled),select,[tabindex="0"]')],first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}},true);
 return {sync,open,close,decorate,syncFrame,openPreview:key=>{if(cached.has(key)||(context().reports||[]).some(r=>r.id===key))open('shared',key);}};
}
