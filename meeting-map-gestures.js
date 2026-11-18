// Gesture state belongs to the viewport; replacing the SVG must not add listeners.
export function installMapGestures(viewport,{getZoom,setZoom}){
 const pointers=new Map();let previous=null,moved=false,suppressClick=false;
 const snapshot=()=>{const p=[...pointers.values()],a=p[0],b=p[1]||a;return a?{x:(a.x+b.x)/2,y:(a.y+b.y)/2,distance:Math.hypot(b.x-a.x,b.y-a.y),count:p.length}:null;};
 function scale(next,from,to=from){
  const svg=viewport.querySelector('svg');if(!svg)return;
  next=Math.max(1,Math.min(4,next));const old=getZoom(),rect=svg.getBoundingClientRect();
  const u=(from.x-rect.left)/rect.width,v=(from.y-rect.top)/rect.height;
  svg.style.width=rect.width*next/old+'px';svg.style.height=rect.height*next/old+'px';
  setZoom(next);viewport.dataset.zoom=String(next);
  const after=svg.getBoundingClientRect();viewport.scrollLeft+=after.left+u*after.width-to.x;viewport.scrollTop+=after.top+v*after.height-to.y;
 }
 viewport.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(!pointers.size){moved=false;suppressClick=false;}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY});previous=snapshot();
  if(pointers.size>1){moved=true;suppressClick=true;viewport.dataset.gesturing='true';for(const id of pointers.keys())try{viewport.setPointerCapture(id);}catch{}}
 });
 viewport.addEventListener('pointermove',e=>{
  const point=pointers.get(e.pointerId);if(!point)return;
  point.x=e.clientX;point.y=e.clientY;const current=snapshot();
  if(!moved&&Math.hypot(point.x-point.startX,point.y-point.startY)<6)return;
  if(!moved){moved=true;suppressClick=true;viewport.dataset.gesturing='true';try{viewport.setPointerCapture(e.pointerId);}catch{}}
  e.preventDefault();
  if(current.count>1&&previous?.count>1&&previous.distance>0)scale(getZoom()*current.distance/previous.distance,previous,current);
  else if(previous){viewport.scrollLeft+=previous.x-current.x;viewport.scrollTop+=previous.y-current.y;}
  previous=current;
 },{passive:false});
 const end=e=>{pointers.delete(e.pointerId);previous=snapshot();if(!pointers.size)viewport.dataset.gesturing='false';};
 viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('lostpointercapture',end);
 viewport.addEventListener('click',e=>{if(suppressClick&&e.detail!==0){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
 viewport.addEventListener('wheel',e=>{e.preventDefault();scale(getZoom()*Math.exp(-e.deltaY*.003),{x:e.clientX,y:e.clientY});},{passive:false});
 viewport.addEventListener('keydown',e=>{
  if(!['+','=','-','0'].includes(e.key))return;e.preventDefault();
  const r=viewport.getBoundingClientRect();scale(e.key==='0'?1:getZoom()*(e.key==='-'?1/1.25:1.25),{x:r.left+r.width/2,y:r.top+r.height/2});
 });
}
