import assert from 'node:assert/strict';
import {PeerPoseNetwork} from '../peer-pose-network.js';
import {createPoseTrafficMeter} from '../pose-traffic-meter.js';
for(const fps of [20,30,60,144]){
 let stamp=100000,packets=0;
 const net=new PeerPoseNetwork({clock:()=>stamp});net.context={uid:'host',hostId:'host',roster:{host:{online:true},guest:{online:true}}};net.ids=['host','guest'];net.version=1;net.advertised=true;net.localSeq=0;
 const channel={readyState:'open',bufferedAmount:0,send(){packets++;}};net.links.set('guest',{peerId:'guest',data:channel,control:channel,readyVersion:1,lastReceivedAt:stamp});
 for(let frame=0;frame<fps;frame++){stamp=100000+Math.round(frame*1000/fps);net.publishLocal({x:frame*.01,z:0,walking:true});net.tick();}
 const rate=net.trafficMeter.snapshot(101000);assert.equal(rate.sendHz,packets);assert(Math.abs(packets-Math.min(fps,60))<=2);
 const idle=net.trafficMeter.snapshot(102000);assert.equal(idle.sendHz,0,'inactive connection must not keep reporting previous traffic');
 console.log('PASS actual send rate',JSON.stringify({callbacksPerSecond:fps,successfulPackets:packets,reported:rate.sendHz}));
}
const m=createPoseTrafficMeter();for(let i=0;i<60;i++){m.record('send','a',1000+i*16);m.record('send','b',1000+i*16);m.record('receive','other',1000+i*16);}assert.deepEqual(m.snapshot(2000),{sendHz:60,receiveHz:60},'fan-out must not count two copies as 120 samples per peer');m.reset();assert.deepEqual(m.snapshot(3000),{sendHz:0,receiveHz:0});
console.log('PASS per-peer fan-out accounting, accepted receive samples and reset');
