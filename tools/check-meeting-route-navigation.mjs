import assert from 'node:assert/strict';
import {locationPath,locationSegmentClear,locationWalkable,locationRoomAnchor} from '../meeting-location-navigation.js';
import {routeSegments,normalizeLocationSelection,normalizeLocationReport} from '../meeting-location-rules.js';
const rect=(id,x,z,w,d)=>({id,label:id,x,z,w,d});
const layout={bounds:{minX:-3,maxX:13,minZ:-3,maxZ:13},rooms:[rect('A',0,0,4,4),rect('B',10,10,4,4)],corridors:[rect('east',5,0,10,2),rect('south',10,5,2,10)]};
const a=normalizeLocationSelection({roomId:'A'},layout),b=normalizeLocationSelection({roomId:'B'},layout),path=locationPath(layout,a,b);
assert(path?.length>2,'route takes corridor bend instead of outside diagonal');
for(let i=1;i<path.length;i++)assert(locationSegmentClear(layout,path[i-1],path[i]));
for(let repetition=0;repetition<20;repetition++){
 const stops=Array.from({length:repetition+2},(_,i)=>i%2?b:a);
 for(const s of routeSegments(stops,3,layout)){assert(locationSegmentClear(layout,s.from,s.to));assert(locationWalkable(layout,s.from));assert(locationWalkable(layout,s.to));}
}
assert.equal(normalizeLocationSelection({x:5,z:5},layout),null,'outside within map bounds is rejected');
const disconnected={...layout,corridors:[]};assert.equal(locationPath(disconnected,a,b),null);assert.equal(normalizeLocationReport({kind:'route',mapMode:'classic',meetingId:'m',stops:[a,b]},{layout:disconnected,mapMode:'classic',meeting:{id:'m'}}),null);
const hole={...rect('C',5,5,12,12),holes:[[{x:3,z:3},{x:7,z:3},{x:7,z:7},{x:3,z:7}]]},holes={bounds:{minX:-1,maxX:11,minZ:-1,maxZ:11},rooms:[hole],corridors:[]};
assert(!locationWalkable(holes,{x:5,z:5}));assert(locationWalkable(holes,locationRoomAnchor(hole)));const around=locationPath(holes,{x:1,z:5},{x:9,z:5});assert(around?.length>2);for(let i=1;i<around.length;i++)assert(locationSegmentClear(holes,around[i-1],around[i]));
const walls={...holes,rooms:[rect('room',5,5,12,12)],walls:[{ax:5,az:-1,bx:5,bz:7}]};const detour=locationPath(walls,{x:1,z:5},{x:9,z:5});assert(detour?.some(p=>p.z>=7));
console.log('PASS corridor routing, repeated return lanes, holes, walls, room anchors and rejection of outside/disconnected testimony');
