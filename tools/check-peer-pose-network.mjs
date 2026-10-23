import assert from 'node:assert/strict';
import {PeerPoseNetwork, normalizePeerPose, encodePosePacket, decodePosePacket} from '../peer-pose-network.js';

const pose = normalizePeerPose({x: -31.123456, z: 28.654321, yaw: Math.PI, lobbyY: 1.2345,
  walking: true, lobbyKart: true, lobbyCircuit: true, lobbyVehicle: true,
  lobbyVehicleX: 0, lobbyVehicleZ: -12.87654, circuitCourse: 'orbit', kartSession: '日本語-🚀-session'});
const row = {slot: 2, seq: 4294967295, at: 1792358700000, pose};
const encoded = encodePosePacket(7, [row], true), decoded = decodePosePacket(encoded);
assert.equal(decoded.version, 7); assert.equal(decoded.complete, true);
for (const key of ['x', 'z', 'yaw', 'lobbyY', 'lobbyVehicleX', 'lobbyVehicleZ']) assert(Math.abs(decoded.rows[0].pose[key] - pose[key]) < .00001, key);
assert.equal(decoded.rows[0].pose.kartSession, pose.kartSession);
assert.equal(decoded.rows[0].pose.circuitCourse, 'orbit');
for (let size = 0; size < encoded.byteLength; size++) assert.equal(decodePosePacket(encoded.slice(0, size)), null);
const nan = encoded.slice(0); new DataView(nan).setFloat32(22, NaN); assert.equal(decodePosePacket(nan), null);
const duplicate = encodePosePacket(7, [row, row]); assert.equal(decodePosePacket(duplicate), null);
const oversized = encoded.slice(0); new DataView(oversized).setUint16(48, 65535); assert.equal(decodePosePacket(oversized), null);
assert.equal(normalizePeerPose({x: Infinity, z: 1}), null);
assert.equal(normalizePeerPose({x: '1', z: 1}), null);
// Untrusted channel payloads must never throw, allocate from a claimed length,
// or accept a truncated snapshot.
for (let i = 0; i < 5000; i++) {
  const bytes = new Uint8Array(Math.floor(Math.random() * 100)); crypto.getRandomValues(bytes);
  assert.doesNotThrow(() => decodePosePacket(bytes.buffer));
}

let stamp = 100000;
const client = new PeerPoseNetwork({clock: () => stamp, writePresence: async () => {}, writeSignal: async () => {}});
client.context = {uid: 'guest', hostId: 'host', scope: 'play', roster: {host: {online: true}, guest: {online: true}}};
client.ids = ['host', 'guest']; client.version = 3; client.advertised = true; client.localSeq = 9;
client.rows.set('guest', {...row, seq: 9});
const link = {peerId: 'host', data: {readyState: 'open'}, control: {readyState: 'open'}};
client.links.set('host', link);
client.receiveData(link, encodePosePacket(3, [{...row, slot: 1, seq: 8, at: stamp}], true));
assert.equal(client.canUseDirect(), true, 'an in-flight newer local sample must not invalidate a healthy ACK');
stamp += 751; assert.equal(client.canUseDirect(), false, 'missing host snapshots must restore Firebase');

const host = new PeerPoseNetwork({clock: () => stamp, writePresence: async () => {}, writeSignal: async () => {}});
host.context = {uid: 'host', hostId: 'host', roster: {host: {online: true}, guest: {online: true}, other: {online: true}}};
host.ids = ['host', 'guest', 'other']; host.version = 4;
const guestLink = {peerId: 'guest'};
host.receiveData(guestLink, encodePosePacket(4, [{...row, slot: 2, at: stamp}]));
assert.equal(host.poseFor('other'), null, 'a guest cannot move another player');
host.receiveData(guestLink, encodePosePacket(4, [{...row, slot: 1, seq: 10, at: stamp}]));
assert.equal(host.poseFor('guest').x, decoded.rows[0].pose.x);
host.receiveData(guestLink, encodePosePacket(4, [{...row, slot: 1, seq: 9, at: stamp, pose: {...pose, x: 999}}]));
assert.notEqual(host.poseFor('guest').x, 999, 'out-of-order packets cannot rewind a player');
host.receiveData(guestLink, encodePosePacket(3, [{...row, slot: 1, seq: 11, at: stamp, pose: {...pose, x: 999}}]));
assert.notEqual(host.poseFor('guest').x, 999, 'old scene packets must be ignored');
stamp += 751; assert.equal(host.poseFor('guest'), null, 'stale direct positions cannot overwrite Firebase recovery');
const noRtc = new PeerPoseNetwork({PeerConnection: null});
noRtc.configure({enabled: true, online: true, uid: 'x', hostId: 'x'});
assert.equal(noRtc.canUseDirect(), false);

// Exercise a 60 Hz render pump and a faster monitor. The 60 Hz lane must
// preserve every moving sample, while a 144 Hz caller cannot flood the channel.
function measureRate(step){
 let at=100000,packets=0;
 const net=new PeerPoseNetwork({clock:()=>at});
 net.context={uid:'host',hostId:'host',roster:{host:{online:true},guest:{online:true}}};
 net.ids=['host','guest'];net.version=1;net.advertised=true;net.localSeq=0;
 const channel={readyState:'open',bufferedAmount:0,send:()=>packets++};
 net.links.set('guest',{peerId:'guest',data:channel,control:channel,readyVersion:1,lastReceivedAt:at});
 for(let frame=0;frame<Math.ceil(1000/step);frame++){at=100000+frame*step;net.publishLocal({x:frame*.01,z:0,walking:true});net.tick();}
 return {samples:net.localSeq,packets};
}
const sixty=measureRate(1000/60),fast=measureRate(1000/144);
assert(sixty.samples>=59&&sixty.packets>=59,'A 60 Hz render loop must deliver roughly 60 samples');
assert(fast.samples>=59&&fast.samples<=64&&fast.packets>=59&&fast.packets<=64,'A high-refresh display must retain the transport rate cap');
console.log('PASS 60 Hz render cadence and high-refresh backpressure',JSON.stringify({sixty,fast}));

console.log(JSON.stringify({passed: true,checks: ['millimetre fidelity', 'UTF-8 kart metadata', 'truncation and corruption', '5000 malformed packets', 'ACK while moving', 'subsecond fallback', 'sender binding', 'ordering and scene isolation', 'unsupported browser fallback'],
  packetBytes: encoded.byteLength, bandwidthPolicyCheck:'tools/check-pose-bandwidth.cjs'}, null, 2));
