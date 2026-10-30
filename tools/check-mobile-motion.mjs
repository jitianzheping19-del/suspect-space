import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRenderBudget} from '../render-performance.js';
import {createPoseReconnectState} from '../pose-reconnect-state.js';
import {PeerPoseNetwork} from '../peer-pose-network.js';
const source=fs.readFileSync('index.html','utf8');
for(const [name,navigator,mobile]of [
 ['iPhone',{userAgent:'iPhone'},true],['Android',{userAgent:'Android'},true],
 ['iPad desktop UA',{userAgent:'Macintosh',platform:'MacIntel',maxTouchPoints:5},true],
 ['desktop',{userAgent:'Windows',maxTouchPoints:0},false]
]){
 const budget=vm.runInNewContext('('+createRenderBudget.toString()+')()',{navigator,devicePixelRatio:3});
 assert.equal(budget.mobile,mobile);assert.equal(budget.fps,mobile?30:60);assert.equal(budget.pixelRatio(2),mobile?1:2);
 for(const refresh of [60,90,120,144]){
  const gate=budget.gate(budget.fps),frames=[];let distance=0,last=0;
  for(let i=0;i<=refresh*3;i++){const at=i*1000/refresh;if(gate.due(at)){distance+=3*(at-last)/1000;last=at;frames.push(at);}}
  assert.equal(frames.length,budget.fps*3+1);assert(Math.abs(distance-9)<.001,'movement speed must be independent of FPS');
  const intervals=frames.slice(1).map((t,i)=>t-frames[i]);
  assert(Math.max(...intervals)<=1000/budget.fps+1000/refresh+.01,'even frame pacing without long pauses');
 }
 console.log('PASS',name,'30/60 FPS pacing at 60/90/120/144 Hz, movement duration, render resolution');
}
for(const file of ['index.html','space-suspect.html','space-suspect-complete.html','space-suspect-final.html']){
 const s=fs.readFileSync(file,'utf8');assert(s.includes('simulationFrameGate=renderBudget.gate(renderBudget.fps)'));assert(!s.includes('createPoseConnectionNotices'));
}
assert(fs.readFileSync('assets-source/lobby-lounge.html','utf8').includes('lobbySimulationGate=lobbyBudget.gate(lobbyBudget.fps)'));
const start=source.indexOf('function checkPoseConnectionNotifications(){'),end=source.indexOf('window.__ssPoseNetworkStatus',start),check=source.slice(start,end);
let stamp=100000;
const clients=['host','bad','good'].map(uid=>{
 const net=new PeerPoseNetwork({clock:()=>stamp});net.context={uid,hostId:'host',roster:{host:{online:true},bad:{online:true},good:{online:true}}};net.advertised=true;net.version=1;
 const link=()=>({data:{readyState:'open'},control:{readyState:'open'},lastReceivedAt:stamp,readyVersion:1});
 if(uid==='host'){net.links.set('bad',link());net.links.set('good',link());}else{net.links.set('host',link());net.coverageAt=stamp;net.ackAt=stamp;}
 const notices=[],retries=[];net.reconnect=()=>retries.push(stamp);
 const context={document:{hidden:false},code:'room',uid,hostId:'host',peerPoseJoined:true,connected:true,leaving:false,
  peerPoseNetwork:net,roomRosterRaw:net.context.roster,poseReconnectKey:()=>uid+':room',performance:{now:()=>stamp},
  poseReconnectState:createPoseReconnectState(),showPoseConnectionNotice:text=>notices.push(text),toast:text=>notices.push(text)};
 vm.createContext(context);vm.runInContext(check,context);return {uid,net,notices,retries,context};
});
const tick=()=>clients.forEach(c=>c.context.checkPoseConnectionNotifications());tick();
const [host,bad,good]=clients;
stamp+=10;host.net.links.get('bad').data.readyState='closed';bad.net.links.get('host').data.readyState='closed';good.net.coverageAt=stamp-3000;
tick();for(const c of clients)assert(c.context.poseReconnectState.state.fastFallback,'working Firebase lane immediately covers the outage');
stamp+=1200;tick();
assert.equal(bad.retries.length,1);assert.equal(host.retries.length,1);assert.equal(good.retries.length,0,'other players must keep their healthy WebRTC channels');
assert.equal(bad.notices.length,1);assert.equal(host.notices.length,0,'host must not show another guest reconnecting');assert.equal(good.notices.length,0);
tick();assert.equal(bad.retries.length,1,'retry must not spin on every 50 ms check');
stamp+=100;host.net.links.get('bad').data.readyState='open';bad.net.links.get('host').data.readyState='open';
for(const c of clients){for(const l of c.net.links.values())l.lastReceivedAt=stamp;c.net.coverageAt=stamp;c.net.ackAt=stamp;}tick();
assert.equal(bad.notices.length,2);assert(bad.notices[1].includes('復旧'));assert.equal(host.notices.length,0);assert.equal(good.notices.length,0);
for(const c of clients)assert(!c.context.poseReconnectState.state.fastFallback);
console.log('PASS three-client outage: automatic reconnect, immediate fallback, only the affected guest receives lost/restored notifications');
