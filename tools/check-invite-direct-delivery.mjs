import assert from 'node:assert/strict';
import {InviteDirectDelivery} from '../invite-direct-delivery.js';
// Deterministic transport tests exercise both ends without production traffic.
class Peer {
  static peers=new Map();
  constructor(){this.id=crypto.randomUUID();Peer.peers.set(this.id,this);this.iceGatheringState='complete';this.connectionState='new';}
  createDataChannel(label){return this.out={label,readyState:'connecting',send:value=>queueMicrotask(()=>this.out.peer?.onmessage?.({data:value})),close(){this.readyState='closed';}};}
  async createOffer(){return{type:'offer',sdp:this.id};}
  async createAnswer(){return{type:'answer',sdp:this.id};}
  async setLocalDescription(desc){this.localDescription=desc;}
  async setRemoteDescription(desc){this.remote=Peer.peers.get(desc.sdp);if(desc.type==='answer'){
    const source=this.out,target={label:source.label,readyState:'open',send:value=>queueMicrotask(()=>source.onmessage?.({data:value})),close(){this.readyState='closed';}};
    source.peer=target;source.readyState='open';this.remote.ondatachannel({channel:target});queueMicrotask(()=>source.onopen?.());
  }}
  close(){this.connectionState='closed';this.onconnectionstatechange?.();}
}
let received=[],watchers={},signals={},validations=0;
function manager(uid){return new InviteDirectDelivery({uid,PeerConnection:Peer,
  write:async(to,value,id)=>{const key=uid+':'+to;if(id&&signals[key]?.id!==id)return;if(value)value=JSON.parse(JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v));signals[key]=value;if(value)queueMicrotask(()=>watchers[to]?.({from:uid,value}));},
  watch:fn=>{watchers[uid]=fn;return()=>delete watchers[uid];},
  validate:async invite=>{validations++;return invite.hostId==='host'&&invite.roomCode==='1234'&&invite.roomCreatedAt===42;},
  onInvite:(id,invite)=>received.push({uid,id,invite})});}
const host=manager('host'),guest=manager('guest');
const invite={hostId:'host',hostName:'レモン',roomCode:'1234',roomCreatedAt:42,phase:'lobby',accepted:false,mirrorReady:true,createdAt:Date.now()};
assert(await host.send('guest','invite-1',invite));
for(let i=0;i<15;i++)await new Promise(r=>setTimeout(r,0));
assert.equal(received.length,1);assert.equal(received[0].uid,'guest');assert.deepEqual(received[0].invite,invite);
assert.equal(host.links.size,0,'Reliable acknowledgement must close the outgoing connection');
assert.equal(signals['host:guest'],null,'Offer SDP must be removed after acknowledgement');
const before=validations;
await guest.receive({from:'attacker',value:{kind:'offer',id:'bad',sdp:'fake',createdAt:Date.now(),invite}});
await guest.receive({from:'host',value:{kind:'offer',id:'expired',sdp:'fake',createdAt:Date.now()-31000,invite}});
assert.equal(validations,before,'Unbound sender and expired discovery must be rejected before validation');
await guest.receive({from:'host',value:{kind:'offer',id:'wrong-room',sdp:'fake',createdAt:Date.now(),invite:{...invite,roomCreatedAt:43}}});
assert.equal(received.length,1,'An old room incarnation cannot send a notification');
host.stop();guest.stop();assert.equal(guest.links.size,0);
assert.equal(await host.send('guest','after-stop',invite),false);
console.log('PASS reliable cross-room invitation delivery, ACK cleanup, sender binding, room epoch, expiry and session teardown');
