import {adminRoomCounts} from './skeld-operations.js';

export function createAdminTerminal({getGame,getRooms,getCorridors,getPose,contains,eligible,now,cooldown,setCooldown,toast,onOpen=()=>{}}){
 const ns='http://www.w3.org/2000/svg',node=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
 const modal=document.createElement('section');modal.id='ssAdminModal';modal.className='hidden';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','ssAdminTitle');
 modal.innerHTML=`<style>
 #ssAdminModal{position:fixed;inset:0;z-index:2000000;display:grid;place-items:center;padding:max(12px,env(safe-area-inset-top)) 12px;background:#020912dc;color:#eef8f5}#ssAdminModal.hidden{display:none!important}
 #ssAdminPanel{width:min(1100px,96vw);max-height:94dvh;display:grid;grid-template-rows:auto minmax(0,1fr) auto auto;padding:clamp(10px,2vw,22px);gap:12px;background:linear-gradient(145deg,#102b30,#061319);border:1px solid #548979;border-radius:18px;box-shadow:0 20px 80px #000b}
 #ssAdminPanel header,#ssAdminPanel footer{display:flex;align-items:center;justify-content:space-between;gap:12px}#ssAdminTitle{font-size:clamp(17px,2.4vw,24px);margin:0}#ssAdminPanel button{border:1px solid #659b8a;border-radius:9px;padding:8px 13px;background:#193d3d;color:#fff;font:inherit;cursor:pointer}#ssAdminPanel button:focus-visible{outline:3px solid #ffe580;outline-offset:2px}
 #ssAdminMap{width:100%;height:min(68dvh,650px);display:block;background:radial-gradient(ellipse,#123c3c,#061b23);border:1px solid #345e5c;border-radius:10px}#ssAdminMap .adminRoom{fill:#174d43;stroke:#6aa891;stroke-width:2}#ssAdminMap .adminHall{fill:#16343c;stroke:#356265;stroke-width:1}#ssAdminMap text{fill:#d2e8df;font:600 12px system-ui,sans-serif;text-anchor:middle;paint-order:stroke;stroke:#102e30;stroke-width:3px}
 #ssAdminPanel footer{font-size:12px;color:#bad4c9}#ssAdminRemaining{color:#ffdf76;font-variant-numeric:tabular-nums;white-space:nowrap}.adminLegend{display:inline-flex;align-items:center;gap:7px}.adminLegend svg{width:12px;height:20px;fill:#ffdc58}
 #ssAdminOccupancy{display:none}.adminRoomPeople{display:flex;gap:6px;flex-wrap:wrap}.adminRoomPeople svg{width:12px;height:20px;fill:#ffdc58;flex:none}
 @media(max-width:600px) and (min-height:501px){#ssAdminMap{height:auto;aspect-ratio:1000/620}#ssAdminOccupancy{display:grid;gap:8px;max-height:42dvh;overflow:auto}.adminRoomSummary{padding:9px 10px;border:1px solid #375e55;border-radius:8px;background:#0a2429}.adminRoomSummary strong{display:block;font-size:12px;margin-bottom:6px}#ssAdminPanel footer{flex-wrap:wrap;font-size:11px}}
 @media(max-height:500px){#ssAdminPanel{gap:5px;padding:8px}#ssAdminMap{height:66dvh}#ssAdminPanel header button{padding:4px 10px}#ssAdminPanel footer{font-size:10px}}
 </style><div id="ssAdminPanel"><header><h2 id="ssAdminTitle">アドミン</h2><span id="ssAdminRemaining"></span><button id="ssAdminClose" type="button">閉じる</button></header><svg id="ssAdminMap" viewBox="0 0 1000 620" role="img" aria-label="各部屋の人数"></svg><div id="ssAdminOccupancy" aria-label="部屋ごとの人数"></div><footer><span class="adminLegend"><svg viewBox="0 0 12 20" aria-hidden="true"><circle cx="6" cy="3" r="3"/><path d="M2 7h8v8H8v5H6.7v-5H5.3v5H4v-5H2z"/></svg>1つにつき1人・遺体も含む</span><span>使用5秒 ／ クールタイム30秒</span></footer></div>`;
 document.body.append(modal);
 const svg=modal.querySelector('#ssAdminMap'),remaining=modal.querySelector('#ssAdminRemaining'),closeButton=modal.querySelector('#ssAdminClose'),occupancy=modal.querySelector('#ssAdminOccupancy');
 let opened=false,until=0,timer=0,previousFocus=null,layoutKey='',lastCounts='',markerLayer=null,project=null;
 function layout(){
  const rooms=getRooms(),corridors=getCorridors(),key=JSON.stringify(rooms.map(r=>[r.id,r.polygon]));if(key===layoutKey)return;layoutKey=key;lastCounts='';svg.replaceChildren();
  const points=[...rooms,...corridors].flatMap(r=>r.polygon),xs=points.map(p=>p.x),zs=points.map(p=>p.z),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),scale=Math.min(940/(maxX-minX),560/(maxZ-minZ));
  project=(x,z)=>({x:500+(x-(minX+maxX)/2)*scale,y:310+(z-(minZ+maxZ)/2)*scale});
  const defs=node('defs'),person=node('g',{id:'ssAdminPerson',fill:'#ffdc58'});person.append(node('circle',{cx:6,cy:3,r:3}),node('path',{d:'M2 7h8v8H8v5H6.7v-5H5.3v5H4v-5H2z'}));defs.append(person);svg.append(defs);
  for(const r of [...corridors,...rooms]){const shape=node('polygon',{class:rooms.includes(r)?'adminRoom':'adminHall',points:r.polygon.map(p=>{const q=project(p.x,p.z);return q.x+','+q.y;}).join(' ')});svg.append(shape);}
  markerLayer=node('g');svg.append(markerLayer);
 }
 function update(){
  if(!opened)return;
  if(now()>=until||!eligible()){close();return;}
  const g=getGame();if(g.sabotage?.type==='comms'&&g.sabotage.endsAt>now()){close();toast('通信妨害中はアドミンを使用できません。');return;}
  remaining.textContent='残り '+Math.max(0,Math.ceil((until-now())/1000))+'秒';layout();
  const rooms=getRooms(),counts=adminRoomCounts(g,rooms,getPose,contains,now()),stamp=JSON.stringify(counts);if(stamp===lastCounts)return;lastCounts=stamp;markerLayer.replaceChildren();occupancy.replaceChildren();
  for(const r of rooms){
   const count=counts[r.id],p=project(r.x,r.z),group=node('g',{'data-room':r.id,'aria-label':`${r.label||r.name}：${count}人`});
   const label=node('text',{x:p.x,y:p.y-10});label.textContent=r.label||r.name;group.append(label);
   const columns=Math.min(5,Math.max(1,Math.ceil(Math.sqrt(count*1.4)))),size=count>10?1:1.15;
   for(let i=0;i<count;i++){const row=Math.floor(i/columns),inRow=Math.min(columns,count-row*columns),x=p.x+((i%columns)-(inRow-1)/2)*16*size-6*size,y=p.y+row*23*size;group.append(node('use',{href:'#ssAdminPerson',class:'adminPerson',transform:`translate(${x} ${y}) scale(${size})`}));}
   group.dataset.count=String(count);markerLayer.append(group);
   if(count){const card=document.createElement('div'),title=document.createElement('strong'),people=document.createElement('div');card.className='adminRoomSummary';title.textContent=r.label||r.name;people.className='adminRoomPeople';people.setAttribute('aria-label',count+'人');for(let i=0;i<count;i++){const icon=node('svg',{viewBox:'0 0 12 20','aria-hidden':'true'});icon.append(node('use',{href:'#ssAdminPerson'}));people.append(icon);}card.append(title,people);occupancy.append(card);}
  }
 }
 function close(){if(!opened)return;opened=false;clearInterval(timer);timer=0;modal.classList.add('hidden');setCooldown(30000);markerLayer?.replaceChildren();occupancy.replaceChildren();lastCounts='';previousFocus?.focus?.({preventScroll:true});}
 function open(){
  if(opened)return;if(!eligible())return toast('管理室の机の左側で使用できます。');if(cooldown()>0)return toast(`アドミンはあと${cooldown()}秒で使用できます。`);
  const g=getGame();if(g.sabotage?.type==='comms'&&g.sabotage.endsAt>now())return toast('通信妨害中はアドミンを使用できません。');
  previousFocus=document.activeElement;onOpen();opened=true;until=now()+5000;setCooldown(35000);modal.classList.remove('hidden');closeButton.focus();update();timer=setInterval(update,100);
 }
 closeButton.onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});
 const key=e=>{if(opened&&e.key==='Escape'){e.preventDefault();close();}},visibility=()=>{if(document.hidden)close();};
 document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);
 return{open,close,get active(){return opened;},dispose(){close();document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);modal.remove();}};
}
