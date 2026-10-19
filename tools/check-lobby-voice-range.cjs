// Exercise the shipped receive gates and Web Audio distance settings without
// connecting to a live room or requesting a microphone.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const entries = ['index.html', 'space-suspect-complete.html', 'space-suspect-final.html', 'space-suspect.html'];
const param = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
for (const entry of entries) {
  const html = fs.readFileSync(path.join(__dirname, '..', entry), 'utf8');
  const start = html.indexOf('    function voiceDistanceProfile(){');
  const end = html.indexOf('    function renderRoomPlayerSettings(){', start);
  assert(start > 0 && end > start);
  const peer = { gain: { gain: param() }, panner: { positionX: param(), positionY: param(), positionZ: param() } };
  const ctx = {
    uid: 'self', game: { phase: 'lobby', players: {} }, connected: true, voiceJoined: true,
    players: { self: { x: 0, z: 0, online: true }, remote: { x: 12, z: 0, online: true } },
    position: { x: 0, z: 0 }, lobbyFacingYaw: 0, voicePositionOverride: null,
    voiceContext: { currentTime: 0, listener: Object.fromEntries(['positionX', 'positionY', 'positionZ', 'forwardX', 'forwardY', 'forwardZ', 'upX', 'upY', 'upZ'].map(k => [k, param()])) },
    voicePeers: new Map([['remote', peer]]), voiceRemoteStates: new Map([['remote', { joined: true, mic: true }]]),
    window: {}, document: { getElementById: () => null },
    voiceRoomIsEnabled: () => ctx.roomEnabled, voiceForcedMuteReason: () => '',
    voiceCamouflageActive: () => false, voiceIdentitySuppressed: () => false,
    voicePlayerIsGhost: id => ctx.ghosts.has(id),
    voicePlayerPreference: () => ctx.preference,
    voiceSabotageActive: () => ctx.game.phase === 'play' && ctx.sabotage,
    voiceIsImpostor: id => ctx.impostors.has(id),
    wallBetween: () => { ctx.wallChecks++; return ctx.wallBlocked; },
    now: () => 0,
    THREE: { Vector3: class { constructor() { this.y = 0; } project() { this.x = ctx.onScreen ? 0 : 2; this.y = 0; this.z = 0; return this; } } },
    avatars: new Map([['remote', { updateWorldMatrix() {}, getWorldPosition: v => v }]]),
    camera: { updateMatrixWorld() {} },
    roomEnabled: true, preference: { muted: false, volume: 1 },
    ghosts: new Set(), impostors: new Set(), sabotage: false,
    wallChecks: 0, wallBlocked: true, onScreen: false,
  };
  vm.createContext(ctx); vm.runInContext(html.slice(start, end), ctx);
  const gainAt = gap => { ctx.players.remote.x = gap; ctx.updateVoiceReceiveGates(); return peer.gain.gain.value; };

  // Off-screen listeners in the lobby must hear beyond the old 6.4m cutoff.
  // Ship-map wall data must not accidentally mute the separate lobby scene.
  assert.equal(gainAt(12), 1); assert.equal(gainAt(15), 1);
  assert.equal(gainAt(17.5), .5); assert.equal(gainAt(20), 0); assert.equal(gainAt(25), 0);
  assert.equal(ctx.wallChecks, 0);
  ctx.players.remote.x = undefined; ctx.updateVoiceReceiveGates(); assert.equal(peer.gain.gain.value, 0);
  ctx.preference.muted = true; assert.equal(gainAt(12), 0);
  ctx.preference = { muted: false, volume: .4 }; assert.equal(gainAt(12), .4);
  ctx.preference.volume = 1;
  ctx.voiceRemoteStates.get('remote').mic = false; assert.equal(gainAt(12), 0);
  ctx.voiceRemoteStates.get('remote').mic = true;
  ctx.players.remote.online = false; assert.equal(gainAt(12), 0); ctx.players.remote.online = true;
  ctx.roomEnabled = false; assert.equal(gainAt(12), 0); ctx.roomEnabled = true;
  ctx.updateVoiceSpatialAudio();
  assert.equal(peer.panner.maxDistance, 20); assert.equal(peer.panner.refDistance, 8);

  // Starting a match restores its previous distance, wall and visibility rules.
  ctx.game.phase = 'play'; ctx.wallBlocked = false; ctx.onScreen = true;
  assert.equal(gainAt(12), 0); assert.equal(gainAt(3), 1); assert.equal(gainAt(6.4), 0);
  assert(Math.abs(gainAt(5.5) - .5) < 1e-10);
  ctx.onScreen = false; assert.equal(gainAt(3), 0); ctx.onScreen = true;
  ctx.wallBlocked = true; assert.equal(gainAt(3), 0); ctx.wallBlocked = false;
  ctx.ghosts.add('remote'); assert.equal(gainAt(3), 0); ctx.ghosts.clear();
  ctx.updateVoiceSpatialAudio();
  assert.equal(peer.panner.maxDistance, 6.4); assert.equal(peer.panner.refDistance, 2.5);
  assert.equal(peer.panner.rolloffFactor, 1.15);

  ctx.game.phase = 'meeting'; assert.equal(gainAt(40), 1); ctx.updateVoiceSpatialAudio();
  assert.equal(peer.panner.rolloffFactor, 0);
  ctx.game.phase = 'play'; ctx.sabotage = true; ctx.impostors = new Set(['self', 'remote']);
  assert.equal(gainAt(40), 1); ctx.updateVoiceSpatialAudio(); assert.equal(peer.panner.rolloffFactor, 0);
  ctx.game.phase = 'lobby'; ctx.updateVoiceSpatialAudio();
  assert.equal(peer.panner.maxDistance, 20); assert.equal(peer.panner.refDistance, 8);
  assert.equal(peer.panner.rolloffFactor, 1.15);
  console.log('PASS', entry, 'lobby range/fade, off-screen, mute preferences, match restoration and meeting/comms bypass');
}
