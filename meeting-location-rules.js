import {containsLocation,locationWalkable,locationRoomAnchor,locationPath,locationSegmentClear} from './meeting-location-navigation.js';
export {containsLocation} from './meeting-location-navigation.js';
// Structured player testimony. Coordinates are chosen by the sender, never read
// from hidden player positions or corpse records.
export const LOCATION_KINDS=['body','position','route'];
export const MAX_ROUTE_STOPS=32;
export function locationRoom(layout,x,z){return layout.rooms.find(room=>containsLocation(room,x,z));}
export function normalizeLocationSelection(raw,layout){
 if(!raw||typeof raw!=='object'||!layout?.bounds||!Array.isArray(layout.rooms))return null;
 if(typeof raw.roomId==='string'){
  const room=layout.rooms.find(r=>r.id===raw.roomId);if(!room)return null;
  const anchor=locationRoomAnchor(room);if(!anchor)return null;return {roomId:room.id,label:String(room.label||room.name||room.id).slice(0,40),x:anchor.x,z:anchor.z,exact:false};
 }
 const {x,z}=raw,b=layout.bounds;if(typeof x!=='number'||typeof z!=='number'||!Number.isFinite(x)||!Number.isFinite(z)||x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return null;
 if(!locationWalkable(layout,{x,z}))return null;
 const room=locationRoom(layout,x,z);return {x:Math.round(x*100)/100,z:Math.round(z*100)/100,label:String(room?.label||room?.name||'通路').slice(0,40),exact:true};
}
export function normalizeLocationReport(raw,{layout,mapMode,meeting,players={}}){
 if(!raw||!LOCATION_KINDS.includes(raw.kind)||raw.mapMode!==mapMode||raw.meetingId!==meeting?.id)return null;
 const result={version:1,kind:raw.kind,mapMode,meetingId:meeting.id};
 if(raw.kind==='route'){
  if(!Array.isArray(raw.stops)||raw.stops.length<2||raw.stops.length>MAX_ROUTE_STOPS)return null;
  const stops=raw.stops.map(stop=>normalizeLocationSelection(stop,layout));if(stops.some(stop=>!stop))return null;
  if(stops.every(stop=>Math.hypot(stop.x-stops[0].x,stop.z-stops[0].z)<.01))return null;
  for(let i=1;i<stops.length;i++)if(!locationPath(layout,stops[i-1],stops[i]))return null;
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
export function routeSegments(stops,spacing=1,layout=null){
 const lanes=new Map(),segments=[];
 for(let i=1;i<stops.length;i++){
  const path=layout?locationPath(layout,stops[i-1],stops[i]):[stops[i-1],stops[i]];if(!path)continue;
  for(let j=1;j<path.length;j++){
   const a=path[j-1],b=path[j],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.001)continue;
   const key=[a.x,a.z,b.x,b.z].join(':'),lane=(lanes.get(key)||0)+1;lanes.set(key,lane);
   let offset=Math.min(.18,spacing*.18)*(lane%2?1:-1),from,to;
   for(let attempt=0;attempt<6;attempt++){from={x:a.x-dz/len*offset,z:a.z+dx/len*offset};to={x:b.x-dz/len*offset,z:b.z+dx/len*offset};if(!layout||locationSegmentClear(layout,from,to))break;offset=attempt===4?0:offset/2;}
   segments.push({from,to,step:i,roomId:layout?locationRoom(layout,(from.x+to.x)/2,(from.z+to.z)/2)?.id||'corridor':undefined});
  }
 }
 return segments;
}
