import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {alignRemotePoseTimeline} from '../remote-pose-timeline.js';
for(const entry of ['index.html','space-suspect-complete.html','space-suspect.html','space-suspect-final.html']){
 const html=fs.readFileSync(new URL('../'+entry,import.meta.url),'utf8');
 const begin=html.indexOf('const REMOTE_POSE_BUFFER_LIMIT='),end=html.indexOf('/* OCT11_BITE_POISON_V1 */',begin);
 const ctx={alignRemotePoseTimeline,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),performance:{now:()=>160}};
 vm.createContext(ctx);vm.runInContext(html.slice(begin,end),ctx);
 const avatar={userData:{},position:{x:0,z:0}};
 [100,150,151,152,153].forEach((receivedAt,i)=>ctx.captureRemotePose(avatar,{x:i*.16,z:0,yaw:0,walking:true,updatedAt:100000+i*16},receivedAt,100100));
 const samples=avatar.userData.remotePoseSamples;
 for(let i=1;i<samples.length;i++)assert.equal(samples[i].sampleAt-samples[i-1].sampleAt,16,'packet bursts must retain sender sample spacing');
 for(let t=105;t<=153;t+=4){const pose=ctx.sampleRemotePoseRaw(avatar,t);assert(Math.abs(pose.x-(t-89)*.01)<1e-9,'constant-speed motion must remain constant through a packet burst');}
 const count=samples.length;assert.equal(ctx.captureRemotePose(avatar,{x:99,z:0,walking:true,updatedAt:99999},170,100170),null);assert.equal(samples.length,count,'out-of-order state must not rewind movement');
 ctx.captureRemotePose(avatar,{x:.64,z:0,yaw:0,walking:false,updatedAt:100080},180,100180);
 assert.equal(ctx.sampleRemotePoseRaw(avatar,1000).x,.64,'stopped players must not continue extrapolating');
 ctx.captureRemotePose(avatar,{x:20,z:0,yaw:0,walking:false,updatedAt:101000},1200,101010);
 assert.equal(samples.length,1);assert(avatar.userData.poseCorrection,'recovery must retain the existing visual correction');
 const noTimestamp={userData:{},position:{x:0,z:0}};ctx.captureRemotePose(noTimestamp,{x:0,z:0},100,100000);ctx.captureRemotePose(noTimestamp,{x:.1,z:0},200,100100);assert.equal(ctx.sampleRemotePoseRaw(noTimestamp,150).x,.05,'legacy poses without timestamps remain supported');
 console.log('PASS',entry,'burst timing, constant-speed interpolation, ordering, stopping, reconnection and timestamp-free compatibility');
}
