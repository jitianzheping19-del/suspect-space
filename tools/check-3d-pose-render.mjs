import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {alignRemotePoseTimeline} from '../remote-pose-timeline.js';
for(const entry of ['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html']){
 const html=fs.readFileSync(new URL('../'+entry,import.meta.url),'utf8');
 const a=html.indexOf('const REMOTE_POSE_BUFFER_LIMIT='),b=html.indexOf('/* OCT11_BITE_POISON_V1 */',a);
 const from=html.indexOf('const remotePose=id===uid?null:sampleRemotePose('),to=html.indexOf('const vx = avatar.position.x - oldX;',from);
 assert(a>=0&&b>a&&from>=0&&to>from);
 const ctx={alignRemotePoseTimeline,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),performance:{now:()=>0},remotePoseInterpolationDelayMs:()=>100,boxerPose:()=>null,waveCannonMovementLock:()=>null,game:{},uid:'self',avatars:new Map()};vm.createContext(ctx);vm.runInContext(html.slice(a,b),ctx);
 vm.runInContext(`function drawRemote(avatar,p,stamp){const id='remote',poseReceivedAt=stamp,poseWallNow=100000+stamp,state={},ventProgress=1,ventEase=1,dt=1/30,position={x:99,z:99};let ventTransition=null;${html.slice(from,to)}return{x:avatar.position.x,z:avatar.position.z};}`,ctx);
 const avatar={userData:{},position:{x:0,z:0}},jitter=[0,28,1,40,2,9,0,30];let next=0,previous=0,draws=0,moving=0;
 const packets=Array.from({length:120},(_,i)=>({at:i*1000/60,received:i*1000/60+30+jitter[i%jitter.length],x:i*.05})).sort((a,b)=>a.received-b.received);
 let lastPose={x:0,z:0,yaw:0,walking:true};
 for(let stamp=0;stamp<=1800;stamp+=1000/30){
  while(next<packets.length&&packets[next].received<=stamp){const row=packets[next++];lastPose={x:row.x,z:0,yaw:0,walking:true,updatedAt:100000+row.at};ctx.captureRemotePose(avatar,lastPose,row.received,100000+row.received);}
  const p=ctx.drawRemote(avatar,lastPose,stamp);assert(p.x>=previous-1e-8,'continuous forward movement must not snap backwards');assert(p.x-previous<.17,'arrival bursts must not jump the rendered 3D body');if(p.x-previous>.01)moving++;previous=p.x;draws++;
 }
 assert(moving>draws*.8,'motion must update on rendered frames, not on a half-second UI checkpoint');
 console.log('PASS',entry,JSON.stringify({renderedFrames:draws,movingFrames:moving,packetJitterMs:40,renderFps:30,sourceFps:60}));
}
