import {containsLocation,locationWalkable,locationRoomAnchor,locationPath,corridorRoomNames} from './meeting-location-navigation.js';
export {containsLocation} from './meeting-location-navigation.js';
// Structured player testimony. Coordinates are chosen by the sender, never read
// from hidden player positions or corpse records.
export const LOCATION_KINDS=['body','position','route'];
export const MAX_ROUTE_STOPS=32;
export const canReportBody=meeting=>meeting?.reason==='遺体を発見';
export function locationRoom(layout,x,z){return layout.rooms.find(room=>containsLocation(room,x,z));}
export function normalizeLocationSelection(raw,layout){
 if(!raw||typeof raw!=='object'||!layout?.bounds||!Array.isArray(layout.rooms))return null;
 if(typeof raw.roomId==='string'){
  const room=layout.rooms.find(r=>r.id===raw.roomId);if(!room)return null;
  const anchor=locationRoomAnchor(room);if(!anchor)return null;return {roomId:room.id,label:String(room.label||room.name||room.id).slice(0,40),x:anchor.x,z:anchor.z,exact:false};
 }
 const {x,z}=raw,b=layout.bounds;if(typeof x!=='number'||typeof z!=='number'||!Number.isFinite(x)||!Number.isFinite(z)||x<b.minX||x>b.maxX||z<b.minZ||z>b.maxZ)return null;
 if(!locationWalkable(layout,{x,z}))return null;
 const roomAt=(px,pz)=>layout.rooms.find(r=>!/(通路|廊下)/.test(r.label||r.name||'')&&containsLocation(r,px,pz));
 const room=roomAt(x,z);
 let label=room?.label||room?.name||room?.id;
 if(!label){
  const corridor=layout.corridors?.find(r=>containsLocation(r,x,z));
  const ends=(corridor?.roomIds||[]).map(id=>layout.rooms.find(r=>r.id===id)?.label).filter(Boolean);
  const names=ends.length===2?ends:[...new Set([...ends,...corridorRoomNames(layout,{x,z},roomAt)])].slice(0,2);
  label=names.length===2?names.join('と')+'の間の通路':names.length===1?names[0]+'前の通路':'通路';
 }
 return {x,z,label,exact:true};
}
export function normalizeLocationReport(raw,{layout,mapMode,meeting,players={}}){
 if(!raw||!LOCATION_KINDS.includes(raw.kind)||raw.mapMode!==mapMode||raw.meetingId!==meeting?.id)return null;
 if(raw.kind==='body'&&!canReportBody(meeting))return null;
 const result={version:1,kind:raw.kind,mapMode,meetingId:meeting.id};
 if(raw.kind==='route'){
  if(!Array.isArray(raw.stops)||raw.stops.length<2||raw.stops.length>MAX_ROUTE_STOPS)return null;
  const stops=raw.stops.map(stop=>normalizeLocationSelection(stop,layout));if(stops.some(stop=>!stop))return null;
  if(stops.every(stop=>Math.hypot(stop.x-stops[0].x,stop.z-stops[0].z)<.01))return null;
  for(let i=1;i<stops.length;i++)if(!locationPath(layout,stops[i-1],stops[i]))return null;
  result.stops=stops;return result;
 }
 if(raw.kind==='position'&&raw.selection?.roomId!==undefined)return null;
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
 const where=report.selection.label;
 return report.kind==='body'?`${report.victimName?report.victimName+'の':''}死体は${where}にありました。`:`私は${where}にいます。`;
}
export function routeSegments(stops,spacing=1,layout=null){
 const segments=[];
 for(let i=1;i<stops.length;i++){
  const path=layout?locationPath(layout,stops[i-1],stops[i]):[stops[i-1],stops[i]];if(!path)continue;
  for(let j=1;j<path.length;j++){
   const a=path[j-1],b=path[j],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.001)continue;
   const from={x:a.x,z:a.z},to={x:b.x,z:b.z};
   segments.push({from,to,step:i,roomId:layout?locationRoom(layout,(from.x+to.x)/2,(from.z+to.z)/2)?.id||'corridor':undefined});
  }
 }
 return segments;
}
