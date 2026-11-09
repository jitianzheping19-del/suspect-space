// Structured player testimony. Coordinates are chosen by the sender, never read
// from hidden player positions or corpse records.
export const LOCATION_KINDS=['body','position','route'];
export const MAX_ROUTE_STOPS=32;
export function containsLocation(region,x,z){
 const points=region?.polygon;
 if(Array.isArray(points)&&points.length>2){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }return inside;}
 return Math.abs(x-Number(region?.x))<=Number(region?.w)/2&&Math.abs(z-Number(region?.z))<=Number(region?.d)/2;
}
export function locationRoom(layout,x,z){return layout.rooms.find(room=>containsLocation(room,x,z));}
export function normalizeLocationSelection(raw,layout){
 if(!raw||typeof raw!=='object'||!layout?.bounds||!Array.isArray(layout.rooms))return null;
 if(typeof raw.roomId==='string'){
  const room=layout.rooms.find(r=>r.id===raw.roomId);if(!room)return null;
  return {roomId:room.id,label:String(room.label||room.name||room.id).slice(0,40),x:Number(room.x),z:Number(room.z),exact:false};
 }
 const {x,z}=raw,b=layout.bounds;if(typeof x!=='number'||typeof z!=='number'||!Number.isFinite(x)||!Number.isFinite(z)||x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return null;
 const room=locationRoom(layout,x,z);return {x:Math.round(x*100)/100,z:Math.round(z*100)/100,label:String(room?.label||room?.name||'通路・屋外').slice(0,40),exact:true};
}
export function normalizeLocationReport(raw,{layout,mapMode,meeting,players={}}){
 if(!raw||!LOCATION_KINDS.includes(raw.kind)||raw.mapMode!==mapMode||raw.meetingId!==meeting?.id)return null;
 const result={version:1,kind:raw.kind,mapMode,meetingId:meeting.id};
 if(raw.kind==='route'){
  if(!Array.isArray(raw.stops)||raw.stops.length<2||raw.stops.length>MAX_ROUTE_STOPS)return null;
  const stops=raw.stops.map(stop=>normalizeLocationSelection(stop,layout));if(stops.some(stop=>!stop))return null;
  if(stops.every(stop=>Math.hypot(stop.x-stops[0].x,stop.z-stops[0].z)<.01))return null;
  result.stops=stops;return result;
 }
 const selection=normalizeLocationSelection(raw.selection,layout);if(!selection)return null;result.selection=selection;
 if(raw.kind==='body'){
  const id=typeof raw.victimId==='string'?raw.victimId:'';let name='';
  if(id){
   if(id===meeting.bodyId)name=meeting.body?.name||players[id]?.name||'';
   else if(players[id]?.alive===false&&!players[id].observer)name=players[id].name||'';
   else return null;
  }
  result.victimId=id;result.victimName=String(name).slice(0,40);
 }
 return result;
}
export function locationReportText(report){
 if(report.kind==='route')return ('移動経路：'+report.stops.map(s=>s.label).join(' → ')).slice(0,120);
 const where=report.selection.label+(report.selection.exact?'のこの位置':'');
 return report.kind==='body'?`${report.victimName?report.victimName+'の':''}死体は${where}にありました。`:`私は${where}にいます。`;
}
export function routeSegments(stops,spacing=1){
 const lanes=new Map(),segments=[];
 for(let i=1;i<stops.length;i++){
  const a=stops[i-1],b=stops[i],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.01)continue;
  const key=[a.x,a.z,b.x,b.z].join(':'),lane=(lanes.get(key)||0)+1;lanes.set(key,lane);
  // Opposite directions have opposite normals, so returning paths stay separate.
  const offset=spacing*(lane-.5),ox=-dz/len*offset,oz=dx/len*offset;
  segments.push({from:{x:a.x+ox,z:a.z+oz},to:{x:b.x+ox,z:b.z+oz},step:i});
 }
 return segments;
}
