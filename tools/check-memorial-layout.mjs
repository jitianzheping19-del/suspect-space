import assert from 'node:assert/strict';
import {memorialCameraPose} from '../meeting-memorial-layout.js';
import {meetingMemorialDuration} from '../oct28-meeting-rules.js';
assert.equal(meetingMemorialDuration([]),1500);assert.equal(meetingMemorialDuration([{}]),2500);assert.equal(meetingMemorialDuration([{},{}]),3250);assert.equal(meetingMemorialDuration([{},{},{}]),4000);assert.equal(meetingMemorialDuration(Array(40).fill({})),10000);
for(const count of [1,3,10,20,40])for(const aspect of [1,2.4,8]){
 const pose=memorialCameraPose(count,aspect),dx=pose.x,dy=pose.y-1,dz=pose.z,d=Math.hypot(dx,dy,dz);
 assert(Math.abs(Math.atan2(dy,Math.hypot(dx,dz))*180/Math.PI-52)<1e-9,'wide rows must retain the overhead angle');
 const yaw=-8*Math.PI/180,e=52*Math.PI/180,tan=Math.tan(35*Math.PI/360),half=((count-1)*2.65+2.5)/2;
 for(const x of [-half,half])for(const y of [-.1,3])for(const z of [-1.9,1.8]){
  const u=x*Math.cos(yaw)-z*Math.sin(yaw),v=-x*Math.sin(e)*Math.sin(yaw)+(y-1)*Math.cos(e)-z*Math.sin(e)*Math.cos(yaw),depth=d-(x*dx+(y-1)*dy+z*dz)/d;
  assert(depth>0);assert(Math.abs(u)/(depth*tan*aspect)<1);assert(Math.abs(v)/(depth*tan)<1);
 }
}
console.log('PASS 3 deceased = 4 seconds; capped duration; 52-degree overhead view and all grave bounds visible across row lengths/aspects');
