import {locationPath,locationWalkable} from './meeting-location-navigation.js';
import {installMapGestures} from './meeting-map-gestures.js';
import {bindLocationAction} from './meeting-location-input.js';
import './meeting-location-map.css';
import {roomIcon,loadRoomIcons} from './meeting-room-icons.js';
import {normalizeLocationSelection,normalizeLocationReport,locationReportText,locationRoom,routeSegments,MAX_ROUTE_STOPS,canReportBody} from './meeting-location-rules.js';
const NS='http://www.w3.org/2000/svg';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
const shape=(tag,attrs={},text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=String(text);return n;};
const color=record=>/^#[a-f0-9]{6}$/i.test(record?.color||'')?record.color:'#86d9ed';
const points=region=>Array.isArray(region.polygon)?region.polygon:[{x:region.x-region.w/2,z:region.z-region.d/2},{x:region.x+region.w/2,z:region.z-region.d/2},{x:region.x+region.w/2,z:region.z+region.d/2},{x:region.x-region.w/2,z:region.z+region.d/2}];
const floorPath=region=>[points(region),...(region.holes||[])].map(r=>'M'+r.map(p=>p.x+','+p.z).join('L')+'Z').join('');
export function drawLocationMap(layout,records=[],{compact=false,selected='',onRoom,selfPosition}={}){
 const b=layout.bounds,w=b.maxX-b.minX,h=b.maxZ-b.minZ,unit=w/100;
 const svg=shape('svg',{viewBox:`${b.minX-2*unit} ${b.minZ-2*unit} ${w+4*unit} ${h+4*unit}`,role:'img','aria-label':'会議の共有マップ'});svg.classList.add('meetingLocationSvg');svg.style.setProperty('--map-aspect',String(w/h));
 for(const region of [...(layout.corridors||[]),...layout.rooms])svg.append(shape('path',{d:floorPath(region),'fill-rule':'evenodd',fill:layout.rooms.includes(region)?'#203748':'#142b3d'}));
 const labels=[],precisePins=[];
 for(const room of layout.rooms){
  const group=shape('g',{'data-room':room.id});
  const active=records.some(record=>record.report.kind!=='route'&&record.report.selection?.roomId===room.id),highlight=records.find(record=>record.report.selection?.roomId===room.id);
  if(active)svg.append(shape('path',{d:floorPath(room),'fill-rule':'evenodd',fill:color(highlight),'fill-opacity':.3}));
  if(!compact){
   const text=String(room.label||room.name||room.id),font=unit*1.9,width=text.length*font,icon=roomIcon(room),size=unit*5;
   group.append(shape('rect',{x:room.x-width/2-unit*.2-size,y:room.z-size/2,width:width+unit*.9+size,height:size,rx:unit*.5,fill:'#091623',stroke:active?'#ffe29a':'#69899d','stroke-width':.7,'vector-effect':'non-scaling-stroke'}));
   group.append(shape('image',{...(icon.url?{href:icon.url}:{}),x:room.x-width/2-unit*.2-size,y:room.z-size/2,width:size,height:size,'data-room-icon':icon.kind,'aria-hidden':'true','pointer-events':'none'}));
   if(!icon.url)group.append(shape('circle',{cx:room.x-width/2-unit*.2-size/2,cy:room.z,r:unit*.8,fill:icon.color,'data-icon-placeholder':'true','pointer-events':'none'}));
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
   const clipId=arrowId+'-floor',clip=shape('clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'});
   for(const region of [...layout.rooms,...(layout.corridors||[])])clip.append(shape('path',{d:floorPath(region),'clip-rule':'evenodd'}));defs.append(clip);
   const ink=shape('g',{'clip-path':`url(#${clipId})`}),legs=new Map();group.append(ink);
   for(const segment of routeSegments(r.stops,unit*1.2,layout)){if(!legs.has(segment.step))legs.set(segment.step,[]);legs.get(segment.step).push(segment);}
   for(const [step,segments]of legs){
    const d=`M${segments[0].from.x},${segments[0].from.z}`+segments.map(({to:b})=>`L${b.x},${b.z}`).join('');
    ink.append(shape('path',{d,fill:'none',stroke:c,'stroke-width':compact?1.8:2.8,'stroke-linecap':'round','vector-effect':'non-scaling-stroke','marker-end':`url(#${arrowId})`,'data-route-step':step}));
    const segment=segments[Math.floor(segments.length/2)],a=segment.from,z=segment.to,dx=z.x-a.x,dz=z.z-a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len,ax=(a.x+z.x)/2,az=(a.z+z.z)/2;
    ink.append(shape('polygon',{points:[[ax+ux*unit,az+uz*unit],[ax-ux*unit*.6-uz*unit*.6,az-uz*unit*.6+ux*unit*.6],[ax-ux*unit*.6+uz*unit*.6,az-uz*unit*.6-ux*unit*.6]].map(p=>p.join(',')).join(' '),fill:c}));
   }
   const visits=new Map();for(const [i,stop]of r.stops.entries()){const key=stop.roomId||stop.x+':'+stop.z;if(!visits.has(key))visits.set(key,{stop,orders:[]});visits.get(key).orders.push(i+1);}
   for(const {stop,orders}of visits.values()){group.append(shape('circle',{cx:stop.x,cy:stop.z,r:unit*.75,fill:c,stroke:'#091623','stroke-width':1,'vector-effect':'non-scaling-stroke'}));if(!compact){const label=shape('text',{x:stop.x,y:stop.z-unit*1.3,'font-size':unit*1.7,'text-anchor':'middle'},orders.slice(0,4).join('・')+(orders.length>4?'…':''));label.append(shape('title',{},'通った順番：'+orders.join(' → ')));group.append(label);}}
   const first=r.stops[0],last=r.stops.at(-1);if(!compact){group.append(shape('text',{x:first.x,y:first.z-unit*2,'font-size':unit*1.7,'text-anchor':'middle'},'出発'));group.append(shape('text',{x:last.x,y:last.z+unit*3,'font-size':unit*1.7,'text-anchor':'middle'},(record.name||'あなた')+' 到着'));}
  }else if(r.kind==='position'&&r.selection.exact){
   const {x,z}=r.selection;
   group.append(shape('circle',{cx:x,cy:z,r:unit*1.45,fill:c,stroke:'#fff','stroke-width':1.5,'vector-effect':'non-scaling-stroke','data-location-pin':'position'}));
   if(!compact)group.append(shape('text',{x,y:z-unit*1.5,'font-size':unit*1.8,'text-anchor':'middle'},record.name));
   precisePins.push(group);continue;
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
 // Only actual walls are outlined: room/corridor rectangles have open doors.
 const walls=shape('g',{'pointer-events':'none','aria-hidden':'true'});
 for(const wall of layout.walls||[])if(!wall.interiorEquipment)walls.append(shape('line',{x1:wall.ax,y1:wall.az,x2:wall.bx,y2:wall.bz,stroke:'#8eaab9','stroke-width':1.6,'vector-effect':'non-scaling-stroke'}));svg.append(walls);
 for(const label of labels)svg.append(label);
 for(const pin of precisePins)svg.append(pin);
 // Local guidance is drawn only in the viewer's dialog, never in report previews.
 const self=selfPosition&&locationWalkable(layout,selfPosition)?selfPosition:null;
 if(self&&!compact){const marker=shape('g',{'data-self-position':'true','pointer-events':'none','aria-label':'自分の現在地（自分だけに表示）'});marker.append(shape('circle',{cx:self.x,cy:self.z,r:unit*1.1,fill:'#65dfff',stroke:'#fff','stroke-width':2,'vector-effect':'non-scaling-stroke'}),shape('text',{x:self.x,y:self.z-unit*1.8,'font-size':unit*2,'text-anchor':'middle'},'自分'));svg.append(marker);}
 return svg;
}
export function createMeetingLocationMap({getContext,getLayout,sendReport,notify,setToolsVisible}){
 let panel=null,mode='shared',draft=null,scope='',seenAuto=new Set(),zoom=1,focused='',renderStamp='',frameTarget=null;
 const cached=new Map(),frameSent=new Set(),drafts=new Map();
 let viewportObserver;
 let actions,filter='all',readIds=new Set();
 const filters={all:'すべて',position:'現在地',route:'経路',body:'死体'};
 function updateUnread(c){
  const mapButton=document.getElementById('meetingMapBtn');
  if(!mapButton)return;
  const rows=c.phase==='meeting'?(c.reports||[]).filter(row=>row.id&&row.uid!==c.uid&&row.report?.mapMode===c.mapMode):[];
  let changed=false;
  if(panel&&mode==='shared'&&!document.hidden){
   for(const row of rows)if((filter==='all'||row.report.kind===filter)&&!readIds.has(row.id)){readIds.add(row.id);changed=true;}
  }
  if(changed){
   const retained=new Set(rows.map(row=>row.id));
   readIds=new Set([...readIds].filter(id=>retained.has(id)));
   try{sessionStorage.setItem('meeting-map-read',JSON.stringify({scope,ids:[...readIds]}));}catch{}
  }
  const count=rows.filter(row=>!readIds.has(row.id)).length;
  let badge=mapButton.querySelector('.meetingMapUnread');
  if(!badge){badge=el('span','','meetingMapUnread');badge.setAttribute('aria-hidden','true');mapButton.append(badge);}
  const label=count?'マップ（未読'+count+'件）':'マップ';
  if(mapButton.getAttribute('aria-label')!==label)mapButton.setAttribute('aria-label',label);
  if(badge.textContent!==String(count))badge.textContent=String(count);
  badge.hidden=!count;
 }
 const context=()=>getContext();
 const button=(text,fn,cls)=>{const b=el('button',text,cls);b.type='button';b.onclick=fn;return b;};
 function close(){viewportObserver?.disconnect();const wasOpen=!!panel;panel?.remove();panel=null;drafts.clear();renderStamp='';if(wasOpen)document.getElementById('meetingMapBtn')?.focus({preventScroll:true});}
 function sync(){
  const c=context(),key=[c.room,c.uid,c.round,c.meeting?.startedAt,c.self?.alive===false||c.self?.observer].join(':');
  if(scope!==key){
   scope=key;close();cached.clear();frameSent.clear();readIds=new Set();
   try{const saved=JSON.parse(sessionStorage.getItem('meeting-map-read'));if(saved?.scope===scope&&Array.isArray(saved.ids))readIds=new Set(saved.ids);}catch{}
  }
  updateUnread(c);
  if(!actions){actions=el('div',undefined);actions.id='meetingLocationActions';actions.dataset.nativeTap='true';for(const[k,label]of [['body','死体の場所を報告'],['route','経路を説明']]){const b=button(label,()=>open(k));b.id='meetingLocation-'+k;bindLocationAction(b,()=>open(k));actions.append(b);}document.getElementById('chatForm')?.before(actions);}
  const available=c.phase==='meeting'&&c.presentationReady!==false;
  actions.hidden=!available;for(const b of actions.children){b.hidden=!available||b.id==='meetingLocation-body'&&!canReportBody(c.meeting);b.disabled=!c.canSend||b.hidden;}
  const tools=document.getElementById('meetingMapTools');if(tools){
   const visible=available,changed=tools.dataset.spaceUiVisible!==String(visible);setToolsVisible?.(visible);
   tools.classList.toggle('hidden',!visible);
   tools.hidden=!visible;tools.dataset.spaceUiVisible=String(visible);
   // An open report dialog owns background isolation until it closes.
   if(changed||!visible){tools.inert=!visible;if(tools.getAttribute('aria-hidden')!==String(!visible))tools.setAttribute('aria-hidden',String(!visible));}
  }
  if(!available){if(panel)close();return;}
  if(panel){if(mode==='body'&&!canReportBody(c.meeting)){close();return;}if(draft&&mode!=='shared')draft.meetingId=c.meeting.id;panel.querySelector('.meetingLocationSend')?.toggleAttribute('disabled',!ready()||!c.canSend);paint();}
  const autoKey=[c.room,c.round,c.meeting?.startedAt].join(':');
  if(c.canSend&&c.meeting?.reason==='遺体を発見'&&c.meeting.reporter===c.uid&&c.self?.alive&&!seenAuto.has(autoKey)){
   seenAuto.add(autoKey);if(seenAuto.size>20)seenAuto.delete(seenAuto.values().next().value);if(!panel)open('body');
  }
 }
 function records(){const c=context(),latest=new Map();for(const row of c.reports||[]){const r=row.report;if(!r||r.mapMode!==c.mapMode)continue;latest.set(row.uid+':'+r.kind+':'+(r.victimId||''),row);}const list=[...latest.values()];if(focused&&cached.has(focused)&&!list.some(r=>r.id===focused))list.push(cached.get(focused).record);return list;}
 function ready(){if(mode==='shared')return false;return mode==='route'?draft?.stops?.length>=2&&draft.stops.every((stop,i)=>!i||!!locationPath(getLayout(context().mapMode),draft.stops[i-1],stop)):!!draft?.selection;}
 function addStop(selection){
  if(!selection.roomId)return;if(draft.stops.length>=MAX_ROUTE_STOPS){notify('経路は'+MAX_ROUTE_STOPS+'部屋までです。不要な部屋を取り消してください。');return;}const layout=getLayout(context().mapMode),normalized=normalizeLocationSelection(selection,layout);if(!normalized)return;
  const last=draft.stops.at(-1);if(last&&(last.roomId&&last.roomId===normalized.roomId||Math.hypot(last.x-normalized.x,last.z-normalized.z)<1.5))return;
  if(last&&!locationPath(layout,last,normalized)){notify('この部屋へ続く通路がありません。別の部屋を選んでください。');return;}
  draft.stops.push(normalized);paint();
 }
 function selectRoom(room){if(mode==='shared')return;if(mode==='route')addStop({roomId:room.id});else{draft.selection=normalizeLocationSelection({roomId:room.id},getLayout(context().mapMode));paint();}}
 function selectPoint(point,layout){
  const selection=point&&normalizeLocationSelection(point,layout);
  if(!selection&&mode!=='position')return;
  draft.selection=selection;
  paint();
  if(!selection)notify('床の上を選んでください。');
 }
 function mapPoint(event,svg){const pt=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());return {x:pt.x,z:pt.y};}
 function fitMap(viewport){
  const svg=viewport.querySelector('svg');if(!svg)return;
  const box=svg.viewBox.baseVal,aspect=box.width/box.height;
  const width=Math.min(viewport.clientWidth,viewport.clientHeight*aspect)*zoom;
  svg.style.width=width+'px';svg.style.height=width/aspect+'px';
 }
 function paint(){
  if(!panel||panel.querySelector('.meetingLocationViewport')?.dataset.gesturing==='true')return;const c=context(),layout=getLayout(c.mapMode),list=mode==='shared'?records().filter(row=>filter==='all'||row.report.kind===filter):[];
  const own=mode!=='shared'&&ready()?{id:'draft',uid:c.uid,name:c.self?.name||'あなた',color:c.color,report:draft}:null;
  // A single start point should also be visible while drawing a route.
  if(mode==='route'&&draft.stops.length&&!own)list.push({id:'draft',uid:c.uid,name:'あなた',color:c.color,report:draft});else if(own)list.push(own);
  const stamp=JSON.stringify([mode,filter,list,zoom,focused,c.position]);if(stamp===renderStamp)return;renderStamp=stamp;
  const viewport=panel.querySelector('.meetingLocationViewport'),previous=viewport.querySelector('svg');viewport.dataset.zoom=String(zoom);
  const svg=drawLocationMap(layout,list,{selected:focused,onRoom:mode==='route'||mode==='body'?selectRoom:null,selfPosition:c.position});svg.setAttribute('tabindex','0');svg.setAttribute('aria-label',mode==='route'?'部屋をタップして経路を選ぶマップ':'場所を選ぶマップ');
  previous?.remove();viewport.append(svg);fitMap(viewport);
  const summary=panel.querySelector('.meetingLocationSelection');summary.textContent=mode==='shared'?(list.length?focused?locationReportText(list.find(row=>row.id===focused)?.report||list[0].report):'':'この種類の報告はまだありません。'):ready()?locationReportText(draft):mode==='route'?'通った部屋を順番に選んでください。':mode==='position'?'地点を選択':'場所を選択';
  if(mode==='route'&&draft.stops.length>=2&&!ready())summary.textContent='通路がつながらない部屋があります。「一つ戻す」で経路を修正してください。';
  const send=panel.querySelector('.meetingLocationSend');if(send)send.disabled=!ready()||!c.canSend;
  syncRoomPicker();
  const undo=panel.querySelector('[data-route-undo]');if(undo)undo.disabled=!draft?.stops?.length;
  const itinerary=panel.querySelector('.meetingLocationItinerary');if(itinerary){itinerary.replaceChildren();for(const [i,stop]of draft.stops.entries()){const step=button((i+1)+'. '+stop.label+' ×',()=>{const next=draft.stops.filter((_,j)=>j!==i);if(next.some((p,j)=>j&&!locationPath(layout,next[j-1],p))){notify('前後の部屋がつながらなくなるため削除できません。');return;}draft.stops=next.filter((p,j)=>!j||p.roomId!==next[j-1].roomId);paint();});step.dataset.routeStop=String(i);step.setAttribute('aria-label',(i+1)+'番目の'+stop.label+'を取り消す');itinerary.append(step);}}
  if(mode==='shared'){
   const legend=panel.querySelector('.meetingLocationLegend');legend.replaceChildren();for(const row of list){const b=button(row.name+' · '+({body:'死体',position:'現在位置',route:'経路'}[row.report.kind]),()=>{focused=focused===row.id?'':row.id;paint();});b.style.setProperty('--report-color',color(row));b.setAttribute('aria-pressed',String(focused===row.id));legend.append(b);}
  }
  if(mode==='shared')return;
  svg.addEventListener('click',e=>{if(mode!=='position'&&e.target.closest('[data-room]'))return;const point=mapPoint(e,svg);if(mode==='route'){const room=locationRoom(layout,point.x,point.z);if(room)selectRoom(room);return;}selectPoint(point,layout);});
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
  const c=context();if(c.phase!=='meeting'||c.presentationReady===false||kind==='body'&&!canReportBody(c.meeting))return;if(kind!=='shared'&&!c.canSend){notify('会議チャットを使える状態になってから報告できます。');return;}
  if(panel&&mode!=='shared')drafts.set(mode,draft);
  viewportObserver?.disconnect();panel?.remove();renderStamp='';mode=kind;focused=key;filter='all';zoom=1;
  draft=drafts.get(kind)||{kind,mapMode:c.mapMode,meetingId:c.meeting.id,victimId:kind==='body'?c.meeting.bodyId||'':'',stops:[]};
  panel=el('section',undefined,'meetingLocationOverlay');panel.id='meetingLocationMap';panel.dataset.nativeTap='true';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',kind==='shared'?'会議の共有マップ':kind==='body'?'死体の場所を報告する':kind==='position'?'自分の現在位置を報告する':'経路を説明する');
  const card=el('div',undefined,'meetingLocationCard'),header=el('header'),toolbar=el('div',undefined,'meetingLocationToolbar');
  toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','閲覧と報告の切り替え');
  for(const [k,label,name] of [['shared','共有','共有を見る'],['position','現在地','現在地を選ぶ'],['route','経路','経路を作る'],['body','死体','死体の場所']]){
   if(k==='body'&&!canReportBody(c.meeting))continue;
   const b=button(label,()=>{if(mode!==k)open(k);});b.setAttribute('aria-label',name);b.setAttribute('aria-pressed',String(kind===k));b.disabled=k!=='shared'&&!c.canSend;toolbar.append(b);
  }
  const dismiss=button('×',close,'meetingLocationDismiss');dismiss.setAttribute('aria-label','閉じる');
  header.append(toolbar,dismiss);card.append(header);
  const main=el('div',undefined,'meetingLocationMain'),viewport=el('div',undefined,'meetingLocationViewport'),dock=el('div',undefined,'meetingLocationDock');
  viewport.dataset.route=String(kind==='route');main.append(viewport,dock);card.append(main);
  installMapGestures(viewport,{getZoom:()=>zoom,setZoom:value=>{zoom=value;renderStamp='';}});
  if(kind==='position')viewport.addEventListener('click',e=>{if(e.target===viewport)selectPoint(null);});
  if(kind==='shared'){
   const group=el('div',undefined,'meetingLocationFilters');group.setAttribute('role','group');group.setAttribute('aria-label','表示する報告');
   for(const [value,label] of Object.entries(filters)){
    if(value==='body'&&!canReportBody(c.meeting))continue;
    const b=button(label,()=>{filter=value;focused='';for(const choice of group.children)choice.setAttribute('aria-pressed',String(choice===b));paint();updateUnread(context());});
    b.setAttribute('aria-pressed',String(value===filter));group.append(b);
   }
   dock.append(group);
  }
  const controls=el('div',undefined,'meetingLocationEditControls');
  if(kind==='position'&&c.position&&locationWalkable(getLayout(c.mapMode),c.position)){
   controls.append(button('自分の位置を選ぶ',()=>{
    draft.selection=normalizeLocationSelection(context().position,getLayout(c.mapMode));paint();
   }));
  }
  if(kind==='body'){
   const label=el('label','誰の死体：'),select=el('select');select.setAttribute('aria-label','死体のプレイヤー');select.append(new Option('不明・名前を付けない',''));
   const victims=new Map(Object.entries(c.players||{}).filter(([,p])=>p.alive===false&&!p.observer).map(([id,p])=>[id,p.name]));if(c.meeting.bodyId)victims.set(c.meeting.bodyId,c.meeting.body?.name||victims.get(c.meeting.bodyId)||'通報された死体');for(const[id,name]of victims)select.append(new Option(name,id));select.value=draft.victimId;draft.victimName=victims.get(draft.victimId)||'';select.onchange=()=>{draft.victimId=select.value;draft.victimName=victims.get(select.value)||'';renderStamp='';paint();};label.append(select);controls.append(label);
  }
  if(kind==='route'){const undo=button('一つ戻す',()=>{draft.stops.pop();paint();});undo.dataset.routeUndo='true';controls.append(undo,button('描き直す',()=>{draft.stops=[];paint();}));}
  if(controls.childElementCount)dock.append(controls);
  if(kind==='shared')dock.append(el('div',undefined,'meetingLocationLegend'));
  else if(kind!=='position'){
   const picker=el('details',undefined,'meetingLocationRooms'),grid=el('div',undefined,'meetingLocationRoomGrid');picker.append(el('summary','部屋一覧から選ぶ'));
    if(kind==='route'){const itinerary=el('div',undefined,'meetingLocationItinerary');itinerary.setAttribute('aria-label','選んだ部屋の順番');itinerary.setAttribute('aria-live','polite');dock.append(itinerary);}
   for(const room of getLayout(c.mapMode).rooms){const icon=roomIcon(room),entry=button('',()=>selectRoom(room)),img=el('img');img.width=44;img.height=44;img.alt='';img.hidden=!icon.url;if(icon.url)img.src=icon.url;entry.dataset.pickRoom=room.id;entry.setAttribute('aria-label',(room.label||room.name)+'を選択');entry.style.setProperty('--room-color',icon.color);entry.append(img,el('span',room.label||room.name));grid.append(entry);}
   picker.append(grid);dock.append(picker);
  }
  const footer=el('footer',undefined,'meetingLocationFooter');footer.append(el('p','', 'meetingLocationSelection'));
  const ghost=c.self?.alive===false||c.self?.observer;
  if(kind!=='shared')footer.append(button(ghost?'ゴーストに共有':({position:'現在地を共有',route:'経路を共有',body:'死体を報告'})[kind],()=>{
   const live=context();if(!live.canSend||!ready())return;const report=normalizeLocationReport(draft,{layout:getLayout(live.mapMode),mapMode:live.mapMode,meeting:live.meeting,players:live.players});
   if(!report){notify('場所を選び直してください。');return;}if(sendReport(report))close();
  },'meetingLocationSend'));
  dock.append(footer);panel.append(card);document.body.append(panel);panel.onclick=e=>{if(e.target===panel)close();};paint();updateUnread(context());dismiss.focus({preventScroll:true});
  viewportObserver=new ResizeObserver(()=>fitMap(viewport));viewportObserver.observe(viewport);
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
