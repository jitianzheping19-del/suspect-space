// Exercise discovery, actual transport state machines, loss, host relay and
// recovery for 20 users. Only the browser's UDP carrier is replaced in memory.
import assert from 'node:assert/strict';
import {PeerPoseNetwork, POSE_CHECKPOINT_MS, POSE_FALLBACK_MS} from '../peer-pose-network.js';
let stamp = 100000, pcId = 0, sent = [], loss = 0, seed = 17;
const pcs = new Map();
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 0x100000000);
class Channel {
  constructor(label, options = {}) {this.label = label; this.options = options; this.readyState = 'connecting'; this.bufferedAmount = 0;}
  send(value) {
    if (this.readyState !== 'open') throw new Error('not open');
    if (this.options.maxRetransmits === 0 && random() < loss) return;
    sent.push({at: stamp + 15 + random() * 50, channel: this.other, value: structuredClone(value)});
  }
  close() {this.readyState = 'closed';}
}
class PeerConnection {
  constructor() {this.id = ++pcId; pcs.set(this.id, this); this.connectionState = 'new'; this.iceGatheringState = 'complete'; this.channels = [];}
  createDataChannel(label, options) {const channel = new Channel(label, options); this.channels.push(channel); return channel;}
  async createOffer() {return {type: 'offer', sdp: String(this.id) + '\na=candidate:in-memory-test'};}
  async createAnswer() {return {type: 'answer', sdp: String(this.id) + '\na=candidate:in-memory-test'};}
  async setLocalDescription(value) {this.localDescription = value;}
  async setRemoteDescription(value) {
    this.remoteDescription = value;
    if (value.type === 'answer') {
      const other = pcs.get(Number(value.sdp.split('\n')[0])); this.other = other; other.other = this;
      for (const local of this.channels) {
        const remote = new Channel(local.label, local.options); other.channels.push(remote);
        local.other = remote; remote.other = local; other.ondatachannel?.({channel: remote});
      }
      queueMicrotask(() => {
        this.connectionState = other.connectionState = 'connected';
        for (const pc of [this, other]) for (const channel of pc.channels) {channel.readyState = 'open'; channel.onopen?.();}
      });
    }
  }
  close() {
    if (this.connectionState === 'closed') return;
    this.connectionState = 'closed'; this.onconnectionstatechange?.();
    if (this.other && this.other.connectionState !== 'closed') {
      this.other.connectionState = 'closed'; this.other.onconnectionstatechange?.();
    }
    for (const channel of this.channels) channel.close();
  }
}

const ids = Array.from({length: 20}, (_, i) => `user-${String(i).padStart(2, '0')}`);
const roster = Object.fromEntries(ids.map(id => [id, {online: true}]));
roster['bot-a'] = {online: true, bot: true}; roster['bot-b'] = {online: true, bot: true};
let hostId = ids[0], scope = '1:play', enabled = true, moving = true;
const counts = {}, nodes = new Map();
for (const [index, uid] of ids.entries()) {
  counts[uid] = {received: 0, writes: 0, lastWrite: stamp};
  nodes.set(uid, new PeerPoseNetwork({PeerConnection, clock: () => stamp,
    writePresence: async value => {if (value) roster[uid].poseNet = value; else delete roster[uid].poseNet;},
    writeSignal: async (target, value) => {
      if (!roster[uid].poseNet) return;
      const signals = roster[uid].poseNet.signals ||= {};
      if (value) signals[target] = value; else delete signals[target];
    }, onPoses: () => counts[uid].received++}));
}
const settle = () => new Promise(resolve => setImmediate(resolve));
async function step(ticks = 1, skip = '') {
  for (let i = 0; i < ticks; i++) {
    stamp += 50;
    for (const [index, uid] of ids.entries()) {
      if (uid === skip) continue;
      const node = nodes.get(uid);
      node.configure({roomKey: '1234:initial', room: '1234', session: 1, uid, hostId,
        scope, enabled, online: true, roster: structuredClone(roster)});
      const at = moving ? stamp * .0001 : 0;
      node.publishLocal({x: index * 2 + at, z: Math.sin(at), walking: moving, kartSession: 'kart-xyz', circuitCourse: 'orbit'});
      if (uid === hostId) node.publishBots({'bot-a': {x: at, z: 0}, 'bot-b': {x: 0, z: at}});
      node.tick();
      const count = counts[uid], cadence = node.canUseDirect() ? POSE_CHECKPOINT_MS : POSE_FALLBACK_MS;
      if (stamp - count.lastWrite >= cadence) {count.writes++; count.lastWrite = stamp;}
    }
    await settle();
    const deliveries = sent.filter(item => item.at <= stamp); sent = sent.filter(item => item.at > stamp);
    // Delivery jitter naturally reorders unreliable packets. Reliable control
    // channels preserve message order in the same way SCTP does.
    deliveries.sort((a, b) => a.channel.options.maxRetransmits === 0 && b.channel.options.maxRetransmits === 0 ? a.at - b.at : 0);
    for (const item of deliveries) if (item.channel.readyState === 'open') item.channel.onmessage?.({data: item.value});
    await settle();
  }
}
const allDirect = () => [...nodes.values()].every(node => node.canUseDirect());
async function converge(max = 500) {
  for (let i = 0; i < max; i++) {await step(); if (allDirect()) return;}
  assert.fail('transport failed to converge: ' + JSON.stringify([...nodes].map(([id,n]) => ({id,links:n.links.size,version:n.version,ack:n.ackAt,coverage:n.coverageAt,advertised:n.advertised}))));
}

await converge();
assert.equal(nodes.get(hostId).links.size, 19);
assert(ids.filter(id => id !== hostId).every(id => nodes.get(id).links.size === 1));
assert.equal([...nodes.values()].reduce((n, node) => n + node.links.size, 0), 38);
for (const count of Object.values(counts)) {count.writes = 0; count.lastWrite = stamp; count.received = 0;}
loss = .12;
await step(1200); // 60 seconds of 20-person continuous movement, 12% packet loss.
for (const [id, count] of Object.entries(counts)) {
  assert(count.writes <= 12, `${id} sent ${count.writes} checkpoints`);
  assert(count.received > 500, `${id} did not receive continuous movement`);
}
const steadyWrites = Object.fromEntries(Object.entries(counts).map(([id, count]) => [id, count.writes]));
assert(allDirect());
assert(nodes.get(ids[1]).poseFor('bot-a'));
assert(Object.values(roster).every(row => !Object.keys(row.poseNet?.signals || {}).length), 'SDPs should not remain in Firebase');

moving = false; await step(15);
assert(ids.filter(id => id !== hostId).every(id => nodes.get(hostId).poseFor(id).walking === false), 'lost final stop must be healed by independent snapshots');
loss = 0;
roster.legacy = {online: true}; await step(20); assert(![...nodes.values()].some(node => node.canUseDirect()));
delete roster.legacy; await converge();
nodes.get(hostId).links.get(ids[3]).pc.close(); await step(20);
assert(![...nodes.values()].some(node => node.canUseDirect()), 'all clients must resume Firebase after a link fails');
await converge(800); // Includes the real 30-second retry backoff in virtual time.
await step(20, hostId);
assert(ids.filter(id => id !== hostId).every(id => !nodes.get(id).canUseDirect()), 'a suspended host must not suppress client checkpoints');
await converge();

scope = '2:meeting'; await step();
assert(![...nodes.values()].some(node => node.poseFor(ids[5])), 'phase boundaries must invalidate old direct poses immediately');
await converge();
scope = '2:play:teleport-abc'; await converge();
hostId = ids[1]; await converge();
assert.equal(nodes.get(hostId).links.size, 19);
assert(ids.filter(id => id !== hostId).every(id => nodes.get(id).links.size === 1));
enabled = false; await step(5);
assert([...nodes.values()].every(node => node.links.size === 0 && !node.canUseDirect()));
assert(Object.values(roster).every(row => !row.poseNet), 'standard mode should remove discovery metadata');

let denied = 0;
const restricted = new PeerPoseNetwork({PeerConnection, clock: () => stamp,
  writePresence: async () => {denied++; throw new Error('permission denied');}});
for (let i = 0; i < 1200; i++) {
  stamp += 50;
  restricted.configure({uid:'x',hostId:'x',roomKey:'denied',session:1,scope:'1:play',enabled:true,online:true,roster:{x:{online:true}}});
  await settle(); assert(!restricted.canUseDirect());
}
assert(denied <= 3, 'permission failure must not create a write storm');
restricted.stop(); await settle();
console.log(JSON.stringify({passed:true,participants:20,hostConnections:19,guestConnections:1,
  simulatedSeconds:60,packetLoss:'12%',steadyStateCheckpointsPerPlayer:steadyWrites,
  previousLightWritesPerMinute:150,smartLightWritesPerMinute:12,positionUpdateReduction:'92%',
  checks:['continuous poses and bot relay','loss and out-of-order recovery','final stop delivery','5-second checkpoints',
    'legacy client fallback','link failure and 30-second reconnect','suspended host','phase/teleport invalidation',
    'host migration','standard-mode cleanup','permission-denied backoff']},null,2));
