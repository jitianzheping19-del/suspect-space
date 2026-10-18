// Movement has no durable game authority. Firebase authenticates discovery and
// still owns roles, kills, votes, phase changes and recovery checkpoints.
// The host relays independent pose snapshots: guests need one connection, not
// a full mesh. No microphone permission, SkyWay token or new server is required.
export const POSE_NETWORK_VERSION = 1;
export const POSE_CHECKPOINT_MS = 5000;
export const POSE_FALLBACK_MS = 200;
const HEARTBEAT_MS = 250, FRESH_MS = 750, RETRY_MS = 30000;
const MAGIC = 0x5350, HEADER_BYTES = 9, ROW_BYTES = 33;
const MAX_ROWS = 40, MAX_BUFFERED = 16384;
const encoder = new TextEncoder(), decoder = new TextDecoder();
const finite = value => typeof value === 'number' && Number.isFinite(value);
const newer = (a, b) => a !== b && ((a - b) >>> 0) < 0x80000000;
const randomId = () => globalThis.crypto.randomUUID();

export function normalizePeerPose(value) {
  if (!value || !finite(value.x) || !finite(value.z) || Math.abs(value.x) > 4096 || Math.abs(value.z) > 4096) return null;
  const number = key => finite(value[key]) ? Math.round(value[key] * 1000) / 1000 : 0;
  return {
    x: number('x'), z: number('z'), yaw: number('yaw'), lobbyY: number('lobbyY'),
    walking: value.walking === true, lobbyKart: value.lobbyKart === true,
    lobbyCircuit: value.lobbyCircuit === true, lobbyVehicle: value.lobbyVehicle === true,
    lobbyVehicleX: finite(value.lobbyVehicleX) ? number('lobbyVehicleX') : null,
    lobbyVehicleZ: finite(value.lobbyVehicleZ) ? number('lobbyVehicleZ') : null,
    // A kart's session only matters while a vehicle or circuit is active.
    kartSession: (value.lobbyKart || value.lobbyCircuit || value.lobbyVehicle) && typeof value.kartSession === 'string' ? value.kartSession.slice(0, 128) : '',
    circuitCourse: ['sky', 'space', 'orbit'].includes(value.circuitCourse) ? value.circuitCourse : 'sky'
  };
}

// Full, independently decodable snapshots deliberately avoid delta baselines:
// losing a packet never corrupts the next one. Millimetre rounding matches the
// previous Firebase encoder; Float32 adds < 0.00001 units within the ship.
export function encodePosePacket(version, rows, complete = false) {
  const entries = rows.slice(0, MAX_ROWS).map(row => ({...row, session: encoder.encode(row.pose.kartSession)}));
  const size = HEADER_BYTES + entries.reduce((n, row) => n + ROW_BYTES + row.session.length +
    (row.pose.lobbyVehicleX !== null ? 4 : 0) + (row.pose.lobbyVehicleZ !== null ? 4 : 0), 0);
  const buffer = new ArrayBuffer(size), view = new DataView(buffer);
  view.setUint16(0, MAGIC); view.setUint8(2, POSE_NETWORK_VERSION);
  view.setUint8(3, complete ? 1 : 0); view.setUint32(4, version); view.setUint8(8, entries.length);
  let offset = HEADER_BYTES;
  for (const row of entries) {
    view.setUint8(offset++, row.slot); view.setUint32(offset, row.seq); offset += 4;
    view.setFloat64(offset, row.at); offset += 8;
    const p = row.pose;
    view.setUint8(offset++, (p.walking ? 1 : 0) | (p.lobbyKart ? 2 : 0) | (p.lobbyCircuit ? 4 : 0) |
      (p.lobbyVehicle ? 8 : 0) | (p.lobbyVehicleX !== null ? 16 : 0) | (p.lobbyVehicleZ !== null ? 32 : 0));
    view.setUint8(offset++, ['sky', 'space', 'orbit'].indexOf(p.circuitCourse));
    for (const key of ['x', 'z', 'yaw', 'lobbyY', 'lobbyVehicleX', 'lobbyVehicleZ']) {
      if (p[key] === null) continue;
      view.setFloat32(offset, p[key]); offset += 4;
    }
    view.setUint16(offset, row.session.length); offset += 2;
    new Uint8Array(buffer, offset, row.session.length).set(row.session); offset += row.session.length;
  }
  return buffer;
}

export function decodePosePacket(buffer) {
  if (!(buffer instanceof ArrayBuffer) || buffer.byteLength < HEADER_BYTES || buffer.byteLength > 24576) return null;
  const view = new DataView(buffer);
  if (view.getUint16(0) !== MAGIC || view.getUint8(2) !== POSE_NETWORK_VERSION || view.getUint8(8) > MAX_ROWS) return null;
  const rows = [], slots = new Set(); let offset = HEADER_BYTES;
  for (let i = 0; i < view.getUint8(8); i++) {
    if (offset + ROW_BYTES > buffer.byteLength) return null;
    const slot = view.getUint8(offset++), seq = view.getUint32(offset); offset += 4;
    const at = view.getFloat64(offset); offset += 8;
    if (slots.has(slot) || !finite(at) || at <= 0) return null;
    slots.add(slot); const pose = {};
    const flags = view.getUint8(offset++), course = view.getUint8(offset++);
    if (flags > 63 || course > 2 || offset + 18 + (flags & 16 ? 4 : 0) + (flags & 32 ? 4 : 0) > buffer.byteLength) return null;
    for (const key of ['x', 'z', 'yaw', 'lobbyY', ...(flags & 16 ? ['lobbyVehicleX'] : []), ...(flags & 32 ? ['lobbyVehicleZ'] : [])]) {
      pose[key] = view.getFloat32(offset); offset += 4;
      if (!finite(pose[key]) || Math.abs(pose[key]) > 4096) return null;
    }
    const length = view.getUint16(offset); offset += 2;
    if (flags > 63 || course > 2 || length > 512 || offset + length > buffer.byteLength) return null;
    pose.walking = !!(flags & 1); pose.lobbyKart = !!(flags & 2);
    pose.lobbyCircuit = !!(flags & 4); pose.lobbyVehicle = !!(flags & 8);
    if (!(flags & 16)) pose.lobbyVehicleX = null;
    if (!(flags & 32)) pose.lobbyVehicleZ = null;
    pose.circuitCourse = ['sky', 'space', 'orbit'][course];
    pose.kartSession = decoder.decode(new Uint8Array(buffer, offset, length)); offset += length;
    if (pose.kartSession.length > 128) return null;
    rows.push({slot, seq, at, pose});
  }
  return offset === buffer.byteLength ? {version: view.getUint32(4), complete: !!view.getUint8(3), rows} : null;
}

export class PeerPoseNetwork {
  constructor({writePresence, writeSignal, onPoses = () => {}, onReset = () => {},
    clock = () => Date.now(), PeerConnection = globalThis.RTCPeerConnection, rtcConfiguration} = {}) {
    this.writePresence = writePresence; this.writeSignal = writeSignal;
    this.onPoses = onPoses; this.onReset = onReset; this.clock = clock;
    this.PeerConnection = PeerConnection;
    this.rtcConfiguration = rtcConfiguration || {iceServers: [
      {urls: 'stun:stun.l.google.com:19302'}, {urls: 'stun:stun.cloudflare.com:3478'}
    ]};
    this.context = null; this.generation = 0; this.version = 0;
    this.links = new Map(); this.rows = new Map(); this.poses = new Map();
    this.dirtyRows = new Set(); this.pendingPoses = {};
    this.retryAt = new Map(); this.writeQueue = Promise.resolve();
    this.stats = {sentBytes: 0, receivedBytes: 0, signals: 0, dropped: 0};
  }

  configure(context) {
    if (!context?.enabled || !context.online || !context.uid || !context.hostId || !this.PeerConnection) {
      if (this.context) this.stop();
      return;
    }
    const identity = `${context.roomKey}:${context.session}:${context.uid}:${context.hostId}`;
    if (identity !== this.identity) {
      this.stop(); this.identity = identity; this.context = context;
      this.epoch = randomId(); this.advertiseAt = 0; this.advertised = false;
      this.lastReconcile = -Infinity; this.localSeq = 0; this.lastLocalAt = 0;
      this.lastSnapshotAt = 0; this.coverageAt = 0; this.ackAt = 0;
    }
    const scopeChanged = this.context.scope !== context.scope;
    this.context = context;
    if (scopeChanged) {
      this.rows.clear(); this.poses.clear(); this.coverageAt = 0; this.ackAt = 0;
      this.dirtyRows.clear(); this.pendingPoses = {};
      this.lastLocalAt = 0; this.localSignature = ''; this.onReset();
      if (!this.isHost) {this.ids = null; this.version = 0;}
    }
    const ids = Object.keys(context.roster).filter(id => context.roster[id]?.online === true).sort().slice(0, MAX_ROWS);
    if (this.isHost && (scopeChanged || JSON.stringify(ids) !== JSON.stringify(this.ids))) {
      this.ids = ids; this.version = (this.version + 1) >>> 0 || 1;
      this.forceFull = true;
      for (const id of this.rows.keys()) if (!ids.includes(id)) this.rows.delete(id);
      for (const link of this.links.values()) {link.readyVersion = 0; this.sendConfig(link);}
    }
    const stamp = this.clock();
    if (!this.advertised && !this.advertising && stamp >= this.advertiseAt) this.advertise();
    if (stamp - this.lastReconcile >= 250) {this.lastReconcile = stamp; this.reconcile();}
  }

  get isHost() {return !!this.context && this.context.uid === this.context.hostId;}
  valid(link) {return this.context && this.links.get(link.peerId) === link && link.generation === this.generation;}
  open(link) {return link?.data?.readyState === 'open' && link?.control?.readyState === 'open';}
  expectedPeers() {
    return Object.keys(this.context?.roster || {}).filter(id => id !== this.context.uid &&
      this.context.roster[id]?.online === true && !this.context.roster[id]?.bot);
  }

  queueWrite(action, context = this.context, generation = this.generation) {
    const job = this.writeQueue.then(() => {
      if (generation !== this.generation || context?.roomKey !== this.context?.roomKey) return;
      return action(context);
    });
    this.writeQueue = job.catch(() => {});
    return job;
  }

  advertise() {
    const generation = this.generation; this.advertising = true;
    this.queueWrite(context => this.writePresence({v: POSE_NETWORK_VERSION, epoch: this.epoch}, context))
      .then(() => {if (generation === this.generation) this.advertised = true;})
      .catch(() => {if (generation === this.generation) this.advertiseAt = this.clock() + RETRY_MS;})
      .finally(() => {if (generation === this.generation) this.advertising = false;});
  }

  reconcile() {
    if (!this.context || !this.advertised) return;
    const desired = this.isHost ? this.expectedPeers() : [this.context.hostId];
    for (const [id, link] of this.links) {
      const capability = this.context.roster[id]?.poseNet;
      if (!desired.includes(id) || capability?.epoch !== link.peerEpoch || capability?.v !== POSE_NETWORK_VERSION) {
        this.closeLink(link); this.retryAt.delete(id);
      }
    }
    for (const peerId of desired) {
      const profile = this.context.roster[peerId], capability = profile?.poseNet;
      if (!profile?.online || capability?.v !== POSE_NETWORK_VERSION || typeof capability.epoch !== 'string') continue;
      const signal = capability.signals?.[this.context.uid];
      let link = this.links.get(peerId);
      if (!link && this.clock() < (this.retryAt.get(peerId) || 0)) continue;
      if (this.isHost) {
        if (!link && this.clock() >= (this.retryAt.get(peerId) || 0)) {
          link = this.createLink(peerId, capability.epoch, randomId());
          if (!link) continue;
          this.startOffer(link).catch(() => this.failLink(link));
        }
        if (link && this.validSignal(signal, link, 'answer') && !link.answerStarted) {
          link.answerStarted = true;
          link.pc.setRemoteDescription({type: 'answer', sdp: signal.sdp}).catch(() => this.failLink(link));
        }
      } else if (signal?.kind === 'offer' && signal.toEpoch === this.epoch &&
          typeof signal.id === 'string' && typeof signal.sdp === 'string' && signal.sdp.length <= 32768) {
        if (link?.id === signal.id) continue;
        if (link) this.closeLink(link);
        link = this.createLink(peerId, capability.epoch, signal.id);
        if (!link) continue;
        this.answerOffer(link, signal).catch(() => this.failLink(link));
      }
    }
    for (const link of this.links.values()) {
      if (this.clock() - link.createdAt > 15000 && (!this.open(link) || !link.lastReceivedAt)) this.failLink(link);
    }
  }

  validSignal(signal, link, kind) {
    return signal?.kind === kind && signal.id === link.id && signal.toEpoch === this.epoch &&
      typeof signal.sdp === 'string' && signal.sdp.length <= 32768;
  }

  createLink(peerId, peerEpoch, id) {
    let pc;
    try {pc = new this.PeerConnection(this.rtcConfiguration);} catch {this.retryAt.set(peerId, this.clock() + RETRY_MS); return null;}
    const link = {peerId, peerEpoch, id, pc,
      generation: this.generation, createdAt: this.clock(), lastReceivedAt: 0, readyVersion: 0};
    this.links.set(peerId, link);
    link.pc.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(link.pc.connectionState) && this.valid(link)) this.failLink(link);
    };
    link.pc.ondatachannel = event => this.attachChannel(link, event.channel);
    return link;
  }

  attachChannel(link, channel) {
    if (!this.valid(link) || !['ss-pose-v1', 'ss-pose-control-v1'].includes(channel.label)) {channel.close(); return;}
    const key = channel.label === 'ss-pose-v1' ? 'data' : 'control';
    if (link[key] && link[key] !== channel) {channel.close(); return;}
    link[key] = channel; channel.binaryType = 'arraybuffer';
    channel.onopen = () => {
      if (!this.valid(link)) return;
      if (this.isHost) this.sendConfig(link);
      if (this.open(link) && !link.signalCleared) {
        link.signalCleared = true;
        this.queueWrite(context => this.writeSignal(link.peerId, null, context)).catch(() => {});
      }
    };
    channel.onmessage = event => {
      if (!this.valid(link)) return;
      if (key === 'control') this.receiveControl(link, event.data);
      else this.receiveData(link, event.data);
    };
    channel.onclose = () => {if (this.valid(link)) this.failLink(link);};
    channel.onerror = () => {}; // Firebase fallback remains active until health is confirmed.
  }

  async gather(link) {
    if (link.pc.iceGatheringState === 'complete') return;
    await new Promise(resolve => {
      const finish = () => {clearTimeout(timer); link.pc.removeEventListener('icegatheringstatechange', check); resolve();};
      const check = () => {if (link.pc.iceGatheringState === 'complete' || !this.valid(link)) finish();};
      const timer = setTimeout(finish, 3500);
      link.pc.addEventListener('icegatheringstatechange', check); check();
    });
  }

  async signal(link, kind) {
    if (!this.valid(link)) return;
    const sdp = link.pc.localDescription?.sdp;
    // Managed browsers can forbid all direct candidates. Do not repeatedly
    // store unusable offers; simply keep Firebase's regular movement lane.
    if (!sdp || !/^a=candidate:/m.test(sdp)) throw new Error('No direct ICE candidate');
    const signal = {id: link.id, kind, toEpoch: link.peerEpoch, sdp};
    await this.queueWrite(context => {
      if (!this.valid(link)) return;
      this.stats.signals++;
      return this.writeSignal(link.peerId, signal, context);
    });
  }

  async startOffer(link) {
    this.attachChannel(link, link.pc.createDataChannel('ss-pose-control-v1'));
    this.attachChannel(link, link.pc.createDataChannel('ss-pose-v1', {ordered: false, maxRetransmits: 0}));
    await link.pc.setLocalDescription(await link.pc.createOffer());
    await this.gather(link); await this.signal(link, 'offer');
  }

  async answerOffer(link, signal) {
    await link.pc.setRemoteDescription({type: 'offer', sdp: signal.sdp});
    if (!this.valid(link)) return;
    await link.pc.setLocalDescription(await link.pc.createAnswer());
    await this.gather(link); await this.signal(link, 'answer');
  }

  send(channel, value) {
    if (channel?.readyState !== 'open' || channel.bufferedAmount > MAX_BUFFERED) {this.stats.dropped++; return false;}
    try {channel.send(value); this.stats.sentBytes += typeof value === 'string' ? encoder.encode(value).length : value.byteLength; return true;}
    catch {this.stats.dropped++; return false;}
  }

  sendConfig(link) {
    if (!this.isHost || !this.valid(link)) return;
    this.send(link.control, JSON.stringify({t: 'config', version: this.version, scope: this.context.scope, ids: this.ids}));
  }

  receiveControl(link, value) {
    if (typeof value !== 'string' || value.length > 8192) return;
    let message; try {message = JSON.parse(value);} catch {return;}
    if (!message || typeof message !== 'object') return;
    if (this.isHost) {
      if (message.t === 'ack' && message.version === this.version) {link.readyVersion = this.version; this.forceFull = true;}
      return;
    }
    if (message.t !== 'config' || message.scope !== this.context.scope || !Number.isInteger(message.version) ||
        message.version < 1 || !Array.isArray(message.ids) || message.ids.length > MAX_ROWS ||
        new Set(message.ids).size !== message.ids.length || !message.ids.includes(this.context.uid) ||
        message.ids.some(id => typeof id !== 'string' || !this.context.roster[id]?.online)) return;
    if (this.version !== message.version) {
      this.poses.clear(); this.rows.clear(); this.coverageAt = 0; this.lastLocalAt = 0; this.ackAt = 0;
    }
    this.ids = message.ids; this.version = message.version;
    this.send(link.control, JSON.stringify({t: 'ack', version: this.version}));
  }

  publishLocal(value) {
    if (!this.context || !this.advertised || !this.ids?.includes(this.context.uid)) return;
    const pose = normalizePeerPose(value); if (!pose) return;
    const stamp = this.clock(), signature = JSON.stringify(pose);
    if (signature === this.localSignature && stamp - this.lastLocalAt < HEARTBEAT_MS) return;
    this.localSignature = signature; this.lastLocalAt = stamp;
    const row = {id: this.context.uid, slot: this.ids.indexOf(this.context.uid),
      seq: this.localSeq = (this.localSeq + 1) >>> 0, at: stamp, pose};
    this.rows.set(row.id, row); this.dirtyRows.add(row.id); this.dirty = true;
    if (!this.isHost) {
      const link = this.links.get(this.context.hostId);
      if (this.open(link)) this.send(link.data, encodePosePacket(this.version, [row]));
    }
  }

  publishBots(values) {
    if (!this.isHost || !this.ids) return;
    const stamp = this.clock();
    for (const [id, value] of Object.entries(values)) {
      if (!this.context.roster[id]?.bot || !this.ids.includes(id)) continue;
      const pose = normalizePeerPose(value); if (!pose) continue;
      const previous = this.rows.get(id), signature = JSON.stringify(pose);
      if (previous?.signature === signature && stamp - previous.at < HEARTBEAT_MS) continue;
      this.rows.set(id, {id, slot: this.ids.indexOf(id), seq: ((previous?.seq || 0) + 1) >>> 0, at: stamp, pose, signature});
      this.dirtyRows.add(id);
      this.dirty = true;
    }
  }

  receiveData(link, value) {
    const packet = decodePosePacket(value);
    if (!packet || packet.version !== this.version || !this.ids) return;
    if (this.isHost && (packet.rows.length !== 1 || this.ids[packet.rows[0].slot] !== link.peerId)) return;
    const stamp = this.clock(), accepted = {};
    for (const row of packet.rows) {
      const id = this.ids[row.slot];
      if (!id || !this.context.roster[id]?.online || Math.abs(stamp - row.at) > 10000) continue;
      if (!this.isHost && id === this.context.uid) {
        if (newer(row.seq, this.lastAckSeq ?? 0) || row.seq === this.localSeq) {
          this.lastAckSeq = row.seq; this.ackAt = stamp;
        }
        continue;
      }
      const previous = this.rows.get(id);
      if (previous && !newer(row.seq, previous.seq)) {
        continue;
      }
      this.rows.set(id, {...row, id});
      if (this.isHost) this.dirtyRows.add(id);
      const pose = {...row.pose, updatedAt: row.at};
      this.poses.set(id, {pose, receivedAt: stamp}); accepted[id] = pose;
    }
    link.lastReceivedAt = stamp; this.stats.receivedBytes += value.byteLength;
    if (this.isHost) this.dirty = true;
    else {this.lastSnapshotAt = stamp; this.coverageAt = packet.complete ? stamp : 0;}
    if (Object.keys(accepted).length) {
      if (this.isHost) Object.assign(this.pendingPoses, accepted);
      else this.onPoses(accepted);
    }
  }

  canUseDirect() {
    if (!this.context || !this.advertised) return false;
    const stamp = this.clock();
    if (this.isHost) return this.expectedPeers().every(id => {
      const link = this.links.get(id);
      return this.open(link) && link.readyVersion === this.version && stamp - link.lastReceivedAt < FRESH_MS;
    });
    return this.open(this.links.get(this.context.hostId)) && this.coverageAt > 0 &&
      stamp - this.coverageAt < FRESH_MS && this.ackAt > 0 && stamp - this.ackAt < FRESH_MS;
  }

  poseFor(id) {
    const sample = this.poses.get(id);
    return this.context && sample && this.clock() - sample.receivedAt < FRESH_MS ? sample.pose : null;
  }

  tick() {
    if (!this.isHost || !this.ids) return;
    if (Object.keys(this.pendingPoses).length) {
      const poses = this.pendingPoses; this.pendingPoses = {}; this.onPoses(poses);
    }
    const stamp = this.clock();
    if (!this.dirty && !this.forceFull && stamp - this.lastSnapshotSentAt < HEARTBEAT_MS) return;
    const full = this.forceFull || stamp - (this.lastFullAt || 0) >= 2000;
    const rows = [...this.rows.values()].filter(row => this.ids.includes(row.id) && (full || this.dirtyRows.has(row.id)))
      .map(row => ({...row, slot: this.ids.indexOf(row.id)}));
    const buffer = encodePosePacket(this.version, rows, this.canUseDirect());
    for (const link of this.links.values()) {
      if (link.readyVersion !== this.version) {if (stamp - (link.configAt || 0) > 500) {link.configAt = stamp; this.sendConfig(link);} continue;}
      this.send(link.data, buffer);
    }
    if (full) this.lastFullAt = stamp;
    this.lastSnapshotSentAt = stamp; this.dirty = false; this.forceFull = false; this.dirtyRows.clear();
  }

  failLink(link) {
    if (!this.valid(link)) return;
    this.retryAt.set(link.peerId, this.clock() + RETRY_MS); this.closeLink(link);
  }

  closeLink(link) {
    this.links.delete(link.peerId); this.coverageAt = 0;
    this.poses.delete(link.peerId); this.rows.delete(link.peerId);
    link.pc.onconnectionstatechange = null; link.pc.ondatachannel = null;
    for (const channel of [link.data, link.control]) {
      if (channel) {channel.onclose = null; channel.onmessage = null; channel.onopen = null; try {channel.close();} catch {}}
    }
    try {link.pc.close();} catch {}
  }

  stop() {
    const previous = this.context;
    for (const link of [...this.links.values()]) this.closeLink(link);
    this.generation++; this.context = null; this.identity = ''; this.ids = null;
    this.advertised = false; this.advertising = false; this.advertiseAt = 0;
    this.rows.clear(); this.poses.clear(); this.retryAt.clear(); this.localSignature = '';
    this.dirtyRows.clear(); this.pendingPoses = {}; this.forceFull = false;
    this.coverageAt = 0; this.ackAt = 0; this.dirty = false;
    this.lastAckSeq = 0;
    if (previous) {
      this.onReset();
      // Serialize cleanup before any replacement epoch is advertised.
      this.writeQueue = this.writeQueue.then(() => this.writePresence(null, previous)).catch(() => {});
    }
  }
}
