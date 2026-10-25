import * as THREE from 'three';
import { taskInstructions, circuitPorts, tubeClips, antennaBases, signalSource, starPoints, frostPixels, crackPoints, clamp, angleDelta } from './frost-task-rules.js';

// Retain one idle WebGL context between terminals. Task state, listeners and
// scene resources are still discarded on close; no hidden render loop remains.
let idleTaskRenderer = null;
export function prepareFrostTaskRenderer() {
  if (idleTaskRenderer?.getContext().isContextLost()) {
    idleTaskRenderer.dispose(); idleTaskRenderer = null;
  }
  if (!idleTaskRenderer) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    idleTaskRenderer = renderer;
  }
  return idleTaskRenderer;
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  idleTaskRenderer?.dispose(); idleTaskRenderer?.forceContextLoss(); idleTaskRenderer = null;
});

// Each task builds its own mechanism; the simulation remains in the run object.
export function createFrostTaskMachine(host, run, { onUnavailable, onClose } = {}) {
  const s = run.state, mode = s.mode;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5.4, 5.4, 2.65, -2.65, .1, 50);
  camera.position.set(0, .4, 16); camera.lookAt(0, 0, 0);
  const renderer = prepareFrostTaskRenderer(); idleTaskRenderer = null;
  const canvas = renderer.domElement;
  canvas.style.cssText = 'width:100%;height:100%;display:block;touch-action:none;user-select:none;outline:none';
  canvas.tabIndex = 0; canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', s.task.name + '。' + taskInstructions[mode] + '。Tabで操作箇所、矢印で調整、Enterで操作、Escapeで閉じる。');
  host.classList.remove("task-complete");host.replaceChildren(canvas);
  scene.add(new THREE.HemisphereLight('#d9f5ff', '#102235', 2.6));
  for (const [color, intensity, x, y, z] of [['#e2f1ff', 4, -4, 6, 9], ['#65d5e8', 2.5, 7, 1, 5], ['#e8ad70', 1.4, -6, -4, 4]]) {
    const light = new THREE.DirectionalLight(color, intensity); light.position.set(x, y, z); scene.add(light);
  }
  const geometries = new Set(), materials = new Set(), textures = new Set(), updates = [], controls = [];
  const own = (g) => (geometries.add(g), g);
  const material = (color, options = {}) => { const m = new THREE.MeshStandardMaterial({ color, metalness: .48, roughness: .35, ...options }); materials.add(m); return m; };
  const glow = (color, opacity = 1) => { const m = new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1, toneMapped: false }); materials.add(m); return m; };
  const metal = material('#314c60'), trim = material('#94b5c2', { metalness: .78, roughness: .27 });
  const dark = material('#081b29', { roughness: .72 }), rubber = material('#102b3b', { metalness: 0, roughness: .8 });
  const white = material('#e4edf0'), brass = material('#cba879', { metalness: .8 });
  const cyan = glow('#68e7ea'), green = glow('#78ebbc'), amber = glow('#ffd58b'), red = glow('#ff7182');
  const blue = material('#447ca3'), violet = material('#8e73ab');
  const glass = material('#bde8ed', { transparent: true, opacity: .2, metalness: .1, roughness: .15, depthWrite: false });
  const mesh = (g, m, x = 0, y = 0, z = 0, parent = scene) => { const o = new THREE.Mesh(own(g), m); o.position.set(x, y, z); parent.add(o); return o; };
  const box = (w, h, d, m, x = 0, y = 0, z = 0, p = scene) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, p);
  const ball = (r, m, x = 0, y = 0, z = 0, p = scene) => mesh(new THREE.SphereGeometry(r, 20, 12), m, x, y, z, p);
  function plate(w, h, d, m, x = 0, y = 0, z = 0, p = scene, radius = .12) {
    const sh = new THREE.Shape(), a = -w / 2, b = -h / 2, r = Math.min(radius, w / 3, h / 3);
    sh.moveTo(a + r, b); sh.lineTo(a + w - r, b); sh.quadraticCurveTo(a + w, b, a + w, b + r);
    sh.lineTo(a + w, b + h - r); sh.quadraticCurveTo(a + w, b + h, a + w - r, b + h);
    sh.lineTo(a + r, b + h); sh.quadraticCurveTo(a, b + h, a, b + h - r);
    sh.lineTo(a, b + r); sh.quadraticCurveTo(a, b, a + r, b);
    return mesh(new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, curveSegments: 5 }), m, x, y, z, p);
  }
  function disc(r, depth, m, x = 0, y = 0, z = 0, p = scene) {
    const o = mesh(new THREE.CylinderGeometry(r, r, depth, 40), m, x, y, z, p); o.rotation.x = Math.PI / 2; return o;
  }
  const ring = (r, t, m, x = 0, y = 0, z = 0, p = scene) => mesh(new THREE.TorusGeometry(r, t, 8, 64), m, x, y, z, p);
  const group = (x = 0, y = 0, z = 0, p = scene) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
  const labelCache = new Map();
  function label(text, x, y, z = .65, width = 2, color = '#dceff3', parent = scene, maxHeight = .3) {
    const key = text + color;
    let texture = labelCache.get(key);
    if (!texture) {
      const c = document.createElement('canvas'), ctx = c.getContext('2d'); ctx.font = '600 48px system-ui,sans-serif';
      c.width = Math.min(1800, Math.ceil(ctx.measureText(text).width) + 28); c.height = 72;
      ctx.font = '600 48px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color;
      ctx.fillText(text, c.width / 2, 37, c.width - 16);
      texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture); labelCache.set(key, texture);
    }
    const m = new THREE.SpriteMaterial({ map: texture, depthWrite: false, transparent: true }); materials.add(m);
    const o = new THREE.Sprite(m), aspect = texture.image.width / 72, h = Math.min(width / aspect, maxHeight);
    o.position.set(x, y, z); o.scale.set(h * aspect, h, 1); parent.add(o); return o;
  }
  function screen(x, y, w, h, bezel = true) {
    const housing = bezel ? plate(w + .15, h + .15, .12, trim, x, y, .05) : null;
    const c = document.createElement('canvas'); c.width = 768; c.height = Math.round(768 * h / w);
    const ctx = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; textures.add(tex);
    const m = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent: !bezel, depthWrite: bezel }); materials.add(m);
    const surface = mesh(new THREE.PlaneGeometry(w, h), m, x, y, .21);
    let key;
    const paint = (nextKey, draw) => { if (key === nextKey) return; key = nextKey; ctx.clearRect(0, 0, c.width, c.height); if (bezel) { ctx.fillStyle = '#051622'; ctx.fillRect(0, 0, c.width, c.height); } draw(ctx, c.width, c.height); tex.needsUpdate = true; };
    paint.setVisible = (visible) => { surface.visible = visible; if (housing) housing.visible = visible; };
    return paint;
  }
  function segment(a, b, m = trim, radius = .035, parent = scene) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b), delta = bv.clone().sub(av);
    const o = mesh(new THREE.CylinderGeometry(radius, radius, Math.max(.001, delta.length()), 8), m, ...av.clone().add(bv).multiplyScalar(.5).toArray(), parent);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return o;
  }
  function line(points, color = '#7ce3e8', parent = scene) {
    const g = own(new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(...p))));
    const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .9, toneMapped: false }); materials.add(m);
    const o = new THREE.Line(g, m); parent.add(o); return o;
  }
  function hit(id, x, y, w = .85, h = .85, kind = 'tap', parent = scene, z = 1.2) {
    const m = new THREE.MeshBasicMaterial({ visible: false }); materials.add(m);
    const touch=matchMedia("(pointer:coarse)").matches;const o = box(w*(touch?1.16:1), h*(touch?1.16:1), .05, m, x, y, z, parent);
    o.userData.taskControl = { id, drag: kind === 'tap' ? '' : kind, index: controls.length };
    controls.push(o); return o;
  }
  function button(text, id, x, y, w = 1.3, m = metal) {
    plate(w, .62, .15, rubber, x, y, .25); const cap = plate(w - .13, .48, .12, m, x, y + .02, .42);
    label(text, x, y + .02, .68, w - .18); hit(id, x, y, w + .08, .8);
    updates.push(() => { cap.position.z = s.hold === id ? .36 : .42; });
    return cap;
  }
  function gauge(x, y, w, value, target = null) {
    plate(w, .2, .06, rubber, x, y, .3);
    if (target) box((target[1] - target[0]) * (w - .1), .25, .025, glow('#58b694', .28), x - (w - .1) / 2 + (target[0] + target[1]) / 2 * (w - .1), y, .39);
    const fill = box(1, .1, .03, cyan, x - w / 2, y, .45);
    updates.push(() => { const v = clamp(value(), .001, 1); fill.scale.x = (w - .1) * v; fill.position.x = x - (w - .1) / 2 + fill.scale.x / 2; });
  }
  function pad() {
    disc(.85, .17, metal, 3.15, -.9, .2); ring(.74, .025, trim, 3.15, -.9, .34);
    box(.04, 1.25, .04, trim, 3.15, -.9, .37); box(1.25, .04, .04, trim, 3.15, -.9, .37);
    const knob = disc(.28, .2, rubber, 3.15, -.9, .5), knobRing = ring(.27, .035, cyan, 3.15, -.9, .63);
    hit('pad', 3.15, -.9, 1.9, 1.9, 'pad');
    updates.push(() => { knob.position.x = 3.15 + s.control[0] * .5; knob.position.y = -.9 + s.control[1] * .5; knobRing.position.set(knob.position.x, knob.position.y, .63); });
    label('誘導', 3.15, .25, .6, 1.2);
  }
  function grid(x, y, w, h) {
    plate(w, h, .08, dark, x, y, -.05);
    for (let i = -3; i <= 3; i++) {
      box(.012, h - .1, .01, rubber, x + i * (w - .1) / 6, y, .06);
      box(w - .1, .012, .01, rubber, x, y + i * (h - .1) / 6, .06);
    }
  }

  // The industrial frame stays in view while parts move, so fitting the camera
  // never jumps during an extraction, rotation or completion animation.
  plate(10, 4.95, .24, metal, 0, 0, -.55, scene, .23);
  plate(9.68, 4.62, .08, dark, 0, 0, -.25, scene, .2);
  for (const x of [-4.75, 4.75]) for (const y of [-2.2, 2.2]) {
    disc(.075, .06, trim, x, y, -.03); box(.085, .014, .02, dark, x, y, .02);
  }
  box(8.7, .02, .02, metal, 0, 1.84, 0);
  label(s.task.instrument || s.task.name, 0, 2.13, .3, 7.9, '#bddee8', scene, .29);
  const statusScreen = screen(0, -1.83, 7.5, .26, false);
  const progressLight = box(.035, .035, .035, green, -4.3, 2.12, .2);

  if (mode === 'circuit') {
    const tiles = [];
    circuitPorts.forEach((ports, i) => {
      const x = -2.4 + i % 3 * 1.8, y = 1.1 - Math.floor(i / 3) * 1.12;
      const g = group(x, y, .12); plate(1.56, .95, .1, metal, 0, 0, 0, g);
      const wiring = group(0, 0, .15, g), traces = [];
      for (const bit of [1, 2, 4, 8]) if (ports & bit) traces.push(segment([0, 0, 0], [0, .43, 0], brass, .05, wiring));
      const led = disc(.1, .05, ports ? amber : rubber, 0, 0, .06, wiring);
      if (ports && ports !== 15) hit('tile:' + i, x, y, 1.63, 1);
      tiles.push({ wiring, traces, led, ports });
    });
    label('電源', -3.8, 0, .5, 1); disc(.15, .12, cyan, -3.5, 0, .1);
    for (let i = 0; i < 3; i++) { disc(.16, .1, green, 3.6, 1.1 - i * 1.12, .1); label(String(i + 1), 4, 1.1 - i * 1.12, .4, .45); }
    updates.push(() => tiles.forEach(({ traces, led, ports }, i) => {
      // Refit the pipes to the rectangular tile after rotating the circuit.
      const bits = [1, 2, 4, 8].filter((bit) => ports & bit);
      traces.forEach((trace, j) => {
        const direction = (Math.log2(bits[j]) + s.turns[i]) % 4;
        const dx = [0, .74, 0, -.74][direction], dy = [.43, 0, -.43, 0][direction];
        trace.position.set(dx / 2, dy / 2, 0); trace.scale.y = Math.hypot(dx, dy) / .43;
        trace.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, 0).normalize());
      });
      led.material = s.powered?.has(i) ? green : rubber;
      for (const t of traces) t.material = s.powered?.has(i) ? cyan : brass;
    }));
  } else if (mode === 'clocks') {
    for (let i = 0; i < 3; i++) {
      const g = group((i - 1) * 2.8, .15, .1);
      disc(1.13, .2, trim, 0, 0, 0, g); disc(1.02, .08, dark, 0, 0, .14, g);
      for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, tick = box(k % 6 ? .025 : .05, k % 6 ? .09 : .18, .025, k === 6 ? green : trim, Math.cos(a) * .9, Math.sin(a) * .9, .22, g); tick.rotation.z = a - Math.PI / 2; }
      const target = ring(.22, .035, green, 0, .9, .25, g);
      const needle = group(0, 0, .3, g); box(.82, .04, .05, amber, .34, 0, 0, needle); disc(.1, .1, brass, 0, 0, .04, needle);
      const lock = label('✓', 0, -.58, .55, .55, '#78ebbc', g); hit('clock:' + i, (i - 1) * 2.8, .15, 2.4, 2.5);
      updates.push(() => { needle.rotation.z = s.angles[i]; lock.visible = s.locked[i]; target.material = s.locked[i] ? green : amber; });
      label('0' + (i + 1), (i - 1) * 2.8, -1.28, .6, 1.1);
    }
  } else if (mode === 'cargo') {
    const platform = group(0, -.7, .2); plate(7, .35, .5, trim, 0, 0, 0, platform);
    mesh(new THREE.ConeGeometry(.35, .8, 3), brass, 0, -1.24, .1);
    const crates = s.weights.map((weight, i) => {
      const g = group(s.cargo[i], -.12, .7); const size = .6 + weight * .12;
      plate(size, size, .45, [blue, violet, metal][i], 0, 0, 0, g);
      for (const dx of [-.25, .25]) box(.08, size + .04, .06, trim, dx, 0, .48, g);
      label(['A', 'B', 'C'][i], 0, 0, .54, .5, '#e4f4fa', g);
      const control = hit('cargo:' + i, 0, 0, size + .18, 1.1, 'drag', g, .7); return { g, control };
    });
    gauge(0, 1.2, 5, () => .5 + s.torque / 20, [.48, .52]);
    label('重心', -3.8, 1.2, .5, .9);
    updates.push(() => { platform.rotation.z = clamp(-s.torque * .025, -.18, .18); crates.forEach(({ g }, i) => { g.position.x = s.cargo[i]; g.position.y = -.12 + s.cargo[i] * platform.rotation.z; g.rotation.z = platform.rotation.z; }); });
  } else if (mode === 'drone') {
    grid(-.85, .05, 5.4, 3.2); ring(.48, .045, green, .65, -.85, .1); box(.5, .035, .02, green, .65, -.85, .13);
    const drone = group(s.x, s.y, .55); const body = ball(.24, white, 0, 0, 0, drone); body.scale.set(1, .65, 1);
    const propellers = [];
    for (const dx of [-.35, .35]) for (const dy of [-.24, .24]) {
      segment([0, 0, 0], [dx, dy, 0], trim, .035, drone); disc(.12, .09, metal, dx, dy, 0, drone);
      const prop = group(dx, dy, .1, drone); box(.42, .05, .025, dark, 0, 0, 0, prop); propellers.push(prop);
      ring(.25, .018, glow('#8ad7e8', .18), dx, dy, .08, drone);
    }
    disc(.07, .02, cyan, 0, -.12, .24, drone); pad();
    const wind = label('➜', -.9, 1.3, .4, 1, '#89c8df');
    updates.push(() => { drone.position.set(s.x, s.y, .55); drone.rotation.z = -s.vx * .1; propellers.forEach((p) => { p.rotation.z = s.elapsed * 32; }); wind.position.x = -1.4 + Math.sin(s.elapsed * .8) * .5; });
  } else if (mode === 'stars') {
    grid(-2.85, .1, 2.3, 2.7); grid(1.35, .1, 5.2, 3.1);
    const ref = starPoints.slice(0, 5).map(([x, y]) => [-2.9 + x * .68, y * .68 + .1, .3]);
    line(ref); ref.forEach(([x, y], i) => { ball(.065, white, x, y, .35); label(String(i + 1), x + .15, y + .14, .5, .25); });
    const spots = starPoints.map(([x, y], i) => {
      const px = 1.3 + x * 1.3, py = y;
      const star = ball(i < 5 ? .12 : .065, i < 5 ? white : metal, px, py, .35);
      const guide = ring(.25, .025, cyan, px, py, .3);
      if (i < 5) label(String(i + 1), px, py + .3, .55, .4, '#dceff3', scene, .34);
      updates.push(() => { guide.visible = i === s.selected.length && !s.finished; guide.scale.setScalar(1 + Math.sin(s.elapsed * 4) * .1); });
      hit('star:' + i, px, py, .8, .8); return star;
    });
    const connections = line([[0, 0, .4], [0, 0, .4]]);
    let count = -1;
    updates.push(() => { spots.forEach((star, i) => { star.material = s.selected.includes(i) ? cyan : white; }); if (count !== s.selected.length) { count = s.selected.length; connections.geometry.dispose(); const points = s.selected.map((i) => spots[i].position.clone()); connections.geometry = own(new THREE.BufferGeometry().setFromPoints(points.length ? points : [new THREE.Vector3()])); } });
  } else if (mode === 'defrost') {
    const lens = disc(1.85, .2, trim, 0, 0, 0); lens.scale.x = 1.62; ring(1.76, .035, cyan, 0, 0, .14).scale.x = 1.62;
    disc(1.72, .06, dark, 0, 0, .16).scale.x = 1.62;
    for (let i = 0; i < 45; i++) { const a = i * 2.4, r = Math.sqrt((i + 1) / 45); ball(i % 5 ? .022 : .045, i % 3 ? white : cyan, Math.cos(a) * r * 2.6, Math.sin(a) * r * 1.55, .22); }
    const planet = ball(.45, blue, .8, .35, .25); ring(.7, .03, brass, .8, .35, .25).rotation.x = .5;
    const iceMat = material('#c8eef5', { transparent: true, opacity: .9, roughness: .2, metalness: .05 });
    const ice = frostPixels.map(([x, y], i) => { const shard = mesh(new THREE.CylinderGeometry(.34, .29, .06 + i % 3 * .025, 6), iceMat, x, y, .38); shard.rotation.set(Math.PI / 2, 0, i * .4); return shard; });
    const brush = ring(.4, .02, cyan, 0, 0, .7); hit('wipe', 0, 0, 6.1, 3.65, 'surface');
    updates.push(() => { ice.forEach((o, i) => { o.visible = !s.clear[i]; }); brush.visible = !!s.previous; if (s.previous) brush.position.set(...s.previous, .7); planet.rotation.y = s.elapsed * .1; });
  } else if (mode === 'triangulate') {
    grid(0, .15, 7.7, 3.15);
    for (let i = 0; i < 3; i++) {
      const [x, y] = antennaBases[i]; disc(.32, .2, metal, x, y, .22); ring(.29, .03, trim, x, y, .36);
      const dish = group(x, y, .46); const bowl = mesh(new THREE.ConeGeometry(.48, .65, 32, 1, true), trim, 0, .23, 0, dish); bowl.rotation.x = Math.PI / 2;
      segment([0, 0, .1], [0, .55, .1], brass, .035, dish); ball(.09, cyan, 0, .58, .1, dish);
      const beam = box(.025, 2.7, .02, glow('#66e5df', .55), 0, 1.35, -.05, dish);
      const led = disc(.08, .05, amber, x - .45, y, .5); hit('antenna:' + i, x, y, 1.25, 1.15, 'aim');
      gauge(x, 1.38, 1.9, () => s.strength[i]);
      updates.push(() => { dish.rotation.z = s.angles[i] - Math.PI / 2; led.material = s.strength[i] > .9 ? green : amber; beam.material.opacity = .14 + s.strength[i] * .65; });
    }
    const beacon = ring(.15, .018, glow('#85ddd8', .25), ...signalSource, .2);
    updates.push(() => { beacon.material.opacity = .15 + Math.min(...s.strength) * .85; });
  } else if (mode === 'waveform') {
    grid(0, .1, 7.5, 2.6); const pieces = [];
    for (let i = 0; i < 4; i++) {
      const g = group(0, .1, .3); plate(1.63, 2.1, .13, metal, 0, 0, 0, g); plate(1.46, 1.8, .04, dark, 0, 0, .17, g);
      const f = (t) => Math.sin(t * 1.8) * .6 + Math.sin(t * 4.5) * .2;
      line(Array.from({ length: 45 }, (_, j) => [-.7 + j / 44 * 1.4, f(i + j / 44), .27]), '#6be8dd', g);
      for (const side of [-1, 1]) { const end = f(i + (side > 0 ? 1 : 0)); disc(.07, .07, brass, side * .77, end, .28, g); }
      hit('wave:' + i, 0, 0, 1.65, 2.25, 'drag', g, .7); pieces.push(g);
    }
    updates.push(() => pieces.forEach((g, i) => { g.position.x = s.dragging === i ? s.dragX : -2.7 + s.order.indexOf(i) * 1.8; g.position.z = s.dragging === i ? .8 : .3; g.rotation.z = s.dragging === i ? .025 : 0; }));
  } else if (mode === 'tubing') {
    grid(0, 0, 7.3, 3.2);
    const clips = tubeClips.map(([x, y], i) => { plate(.45, .42, .12, trim, x, y, .1); ring(.16, .045, brass, x, y, .3); return disc(.07, .04, amber, x + .27, y, .27); });
    const tubing = group(), tip = group(s.tip[0], s.tip[1], .55); disc(.18, .36, white, 0, 0, 0, tip); ring(.15, .04, cyan, 0, 0, .2, tip); hit('tube', 0, 0, .85, .85, 'drag', tip, .6);
    let oldPath = '';
    updates.push(() => {
      const points = [[-3.3, -1.2, .35], ...tubeClips.slice(0, s.clips).map((p) => [...p, .35]), [...s.tip, .4]], key = JSON.stringify(points);
      if (key !== oldPath) { oldPath = key; while (tubing.children.length) { const child = tubing.children[0]; child.geometry.dispose(); geometries.delete(child.geometry); tubing.remove(child); } for (let i = 1; i < points.length; i++) segment(points[i - 1], points[i], i <= s.clips ? green : cyan, .065, tubing); }
      tip.position.set(...s.tip, .55); clips.forEach((o, i) => { o.material = i < s.clips ? green : i === s.clips ? amber : rubber; });
    });
  } else if (mode === 'medicine') {
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 2.6; plate(1.95, 2.25, .09, metal, x, .3, 0);
      const liquidMat = material(['#6de4dd', '#edabdd', '#b0e687'][i], { metalness: 0, roughness: .15, transparent: true, opacity: .9 });
      const liquid = mesh(new THREE.CylinderGeometry(.35, .35, 1, 32), liquidMat, x, -.65, .4);
      mesh(new THREE.CylinderGeometry(.39, .39, 1.75, 32, 1, true), glass, x, .2, .4);
      for (const y of [-.68, 1.08]) disc(.42, .08, trim, x, y, .4).rotation.x = 0;
      box(.9, .025, .03, green, x, -.65 + s.targets[i] * 1.65, .86);
      label(Math.round(s.targets[i] * 100) + ' ml', x + .6, .7, .7, .7, '#a1f2c7');
      button('−', 'dose:' + i + '-', x - .46, -1.22, .82); button('＋', 'dose:' + i + '+', x + .46, -1.22, .82);
      updates.push(() => { liquid.scale.y = Math.max(.005, s.levels[i] * 1.65); liquid.position.y = -.65 + liquid.scale.y / 2; });
    }
  } else if (mode === 'irrigation') {
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 2.6; plate(2.1, 1.4, .35, metal, x, -.65, .1); plate(1.85, .95, .08, material('#423c35', { roughness: 1, metalness: 0 }), x, -.5, .52);
      const leaves = [];
      for (let k = 0; k < 3; k++) {
        const px = x + (k - 1) * .52; segment([px, -.6, .7], [px, .5, .7], brass, .025);
        for (const sign of [-1, 1]) { const leaf = ball(.25, material('#6cbf92', { metalness: 0, roughness: .7 }), px + sign * .16, .1 + k * .12, .73); leaf.scale.set(.85, .42, .2); leaf.rotation.z = sign * .5; leaves.push(leaf); }
      }
      segment([x - .85, .9, .2], [x, 1.15, .3]); disc(.17, .1, trim, x, 1.08, .4);
      const drops = Array.from({ length: 6 }, (_, k) => ball(.03, cyan, x + Math.sin(k) * .3, .4, .75));
      gauge(x, -1.35, 2, () => s.moisture[i], [.45, .75]); hit('bed:' + i, x, .2, 2.25, 2.8, 'hold');
      updates.push(() => { leaves.forEach((leaf, k) => { leaf.rotation.z = (k % 2 ? 1 : -1) * (.15 + s.moisture[i] * .5); }); drops.forEach((drop, k) => { drop.visible = s.water === i; drop.position.y = .9 - (s.elapsed * 1.6 + k / 6) % 1.4; }); });
    }
  } else if (mode === 'fins') {
    const hinges = [], indicators = [];
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 2.35; plate(2.15, 2.6, .22, metal, x, .1, 0);
      indicators.push(ring(.15, .035, amber, x, 1.18, .68));
      label(String(i + 1), x, 1.18, .72, .18);
      const hinge = group(x - .85, .1, .4);
      for (let j = 0; j < 7; j++) box(.12, 2.1, .4, j % 2 ? trim : blue, .14 + j * .23, 0, 0, hinge);
      for (const y of [-1, 1]) disc(.12, .15, brass, x - .85, y + .1, .55);
      hit('fin:' + i, x, .1, 2.1, 2.7); hinges.push(hinge);
    }
    const latch = button('固定', 'latch', 3.7, -1.25, 1.6);
    updates.push(() => {
      hinges.forEach((h, i) => { h.rotation.y = -(1 - s.extension[i]) * 1.45; indicators[i].material = s.open[i] ? green : amber; });
      latch.material = s.open.every(Boolean) ? green : metal;
    });
  } else if (mode === 'core') {
    plate(3.3, 3.25, .2, metal, -.9, .03, -.05);
    const ice = material('#90cbdc', { metalness: .1, roughness: .2, transparent: true, opacity: .8 });
    for (let i = 0; i < 13; i++) mesh(new THREE.CylinderGeometry(.53, .53, .22, 32), i === 8 ? brass : ice, -.8, 1.4 - i * .23, .35);
    for (const x of [-1.8, .2]) box(.06, 3.1, .08, trim, x, 0, .1);
    const blade = group(-.8, 0, .95); plate(2.4, .13, .15, white, 0, 0, 0, blade); box(.48, .27, .2, brass, 1.25, 0, .1, blade);
    const depthHit = hit('depth', .5, 0, 1.1, .9, 'drag');
    const sample = mesh(new THREE.CylinderGeometry(.52, .52, .18, 32), brass, -.8, 1.5 - s.target * 3, .45);
    const sampleHit = hit('extract', -.8, 1.5 - s.target * 3, 1.6, .9, 'drag');
    plate(2, .8, .18, trim, 2.9, -1.05, .1); label('保管', 2.9, -.4, .5, 1.2); button('採取', 'cut', 2.9, .7, 1.7);
    updates.push(() => { blade.position.y = 1.5 - s.depth * 3; depthHit.position.y = blade.position.y; depthHit.visible = !s.cut; sample.visible = s.cut; sample.position.x = -.8 + s.extraction * 3.6; sampleHit.visible = s.cut; sampleHit.position.x = sample.position.x; });
  } else if (mode === 'centrifuge') {
    disc(1.65, .35, metal, -1.3, .1, .05); disc(1.43, .08, dark, -1.3, .1, .3); ring(1.35, .045, trim, -1.3, .1, .4);
    ring(.27, .025, green, -1.3, .1, .8); box(.7, .015, .01, cyan, -1.3, .1, .82); box(.015, .7, .01, cyan, -1.3, .1, .82);
    const rotor = group(-1.3, .1, .55); disc(.28, .15, brass, 0, 0, 0, rotor);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; segment([0, 0, 0], [Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0], trim, .065, rotor); const tube = plate(.2, .55, .14, i % 2 ? blue : white, Math.cos(a) * 1.02, Math.sin(a) * 1.02, .1, rotor); tube.rotation.z = a; }
    pad(); gauge(0, 1.52, 5, () => s.steady / 2.5);
    updates.push(() => { rotor.position.set(-1.3 + s.x, .1 + s.y, .55); rotor.rotation.z = s.rotor; });
  } else if (mode === 'sterile') {
    plate(5.65, 3.25, .25, trim, -.8, .05, -.02); grid(-.8, .05, 5.3, 2.95);
    for (const [x, y, h] of [[-1.3, -.6, 1.9], [.3, .6, 1.9]]) { plate(.26, h, .25, rubber, x, y, .2); box(.08, h - .12, .02, red, x, y, .5); }
    ring(.3, .035, green, 1.35, -1.05, .3);
    const sample = group(s.x, s.y, .5); ball(.15, white, 0, 0, 0, sample); ring(.16, .025, cyan, 0, 0, .09, sample);
    pad(); updates.push(() => { sample.position.set(s.x, s.y, .5); sample.rotation.z = s.x * 2; });
  } else if (mode === 'freezer') {
    plate(3.9, 3.15, .35, metal, -1.8, .05, -.05); plate(3.3, 2.65, .12, rubber, -1.8, .05, .35);
    for (let i = 0; i < 7; i++) { const pipe = ring(.22, .045, trim, -2.8 + (i % 2) * .12, -.9 + i * .3, .55); pipe.scale.x = 3.4; }
    const snow = material('#b5deec', { roughness: .15 });
    for (let i = 0; i < 4; i++) mesh(new THREE.OctahedronGeometry(.22), snow, -2.5 + i * .6, -.4 + i % 2 * .6, .8);
    const readout = screen(1.5, .65, 2.4, 1.1); label('目標 −18℃', 1.5, 1.46, .5, 2);
    button('冷却', 'cool', .65, -.75, 1.5, blue); button('加熱', 'heat', 2.55, -.75, 1.5, brass);
    gauge(1.5, -1.4, 3.7, () => (s.temperature + 30) / 35, [11 / 35, 13 / 35]);
    updates.push(() => readout(Math.round(s.temperature * 10) + ':' + Math.round(s.rate * 5), (ctx, w, h) => { ctx.fillStyle = Math.abs(s.temperature + 18) < 1 ? '#7aefbd' : '#c2e9f5'; ctx.font = '600 76px monospace'; ctx.textAlign = 'center'; ctx.fillText(s.temperature.toFixed(1) + '°C', w / 2, h * .6); ctx.font = '28px sans-serif'; ctx.fillText(s.rate < -.3 ? '▼ 冷却中' : s.rate > .3 ? '▲ 上昇中' : '安定', w / 2, h * .88); }));
  } else if (mode === 'overcurrent') {
    box(7.6, .12, .08, brass, 0, 1.35, .1);
    for (let i = 0; i < 5; i++) {
      const x = (i - 2) * 1.65; plate(1.4, 2.65, .2, metal, x, -.05, .05); box(.05, .32, .06, brass, x, 1.2, .12);
      disc(.48, .07, dark, x, .65, .3); const a = Math.PI * .85 - s.amps[i] / 20 * Math.PI * .7;
      const needle = box(.36, .025, .02, i === s.fault ? red : cyan, x + Math.cos(a) * .14, .65 + Math.sin(a) * .14, .45); needle.rotation.z = a;
      label(s.amps[i] + 'A', x, .35, .6, 1, i === s.fault ? '#ff8a90' : '#98edd1');
      const lever = group(x, -.6, .5); plate(.32, .65, .16, trim, 0, 0, 0, lever); box(.52, .14, .2, rubber, 0, .2, .12, lever);
      hit('breaker:' + i, x, -.4, 1.45, 2.2); label('0' + (i + 1), x, -1.42, .6, .75);
      updates.push(() => { lever.rotation.x = s.switches[i] ? -.35 : .65; });
    }
  } else if (mode === 'battery') {
    plate(3.45, 2.7, .35, metal, 0, 0, 0); plate(2.6, 2.25, .15, rubber, 0, 0, .4);
    function pack(x, color) { const g = group(x, 0, .6); plate(1.8, 1.8, .4, color, 0, 0, 0, g); for (const y of [-.62, -.3, .02, .34, .66]) box(1.45, .08, .03, trim, 0, y, .45, g); label('＋', -.55, .62, .55, .4, '#ffadb1', g); label('−', .55, .62, .55, .4, '#94e6f4', g); return g; }
    const old = pack(0, metal), fresh = pack(3, blue); const oldHit = hit('old', 0, 0, 1.8, 1.8, 'drag', old, .9), newHit = hit('new', 0, 0, 1.8, 1.8, 'drag', fresh, .9);
    const negative = button('−端子', 'negative', 1.25, 1.2, 1.25), positive = button('＋端子', 'positive', -1.25, 1.2, 1.25);
    const latch = button('固定具', 'clamp', 0, -1.38, 1.8); button('回す', 'rotate', 3.35, -1.3, 1.2);
    updates.push(() => { old.position.x = s.oldX; old.visible = s.stage < 4; fresh.position.x = s.newX; fresh.rotation.z = s.orientation * Math.PI; oldHit.visible = s.stage === 3; newHit.visible = s.stage === 4; negative.material = [0, 8].includes(s.stage) ? cyan : metal; positive.material = [1, 7].includes(s.stage) ? red : metal; latch.material = [2, 6].includes(s.stage) ? amber : metal; });
  } else if (mode === 'drill') {
    disc(1.52, .4, metal, -.85, 0, .05); ring(1.37, .075, trim, -.85, 0, .32);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, tooth = box(.23, .23, .18, trim, -.85 + Math.cos(a) * 1.45, Math.sin(a) * 1.45, .23); tooth.rotation.z = a; }
    const wrench = group(-.85, 0, .55); disc(.42, .15, brass, 0, 0, 0, wrench); plate(.28, 2.6, .17, trim, 0, -.85, .05, wrench); plate(.43, .85, .22, rubber, 0, -1.72, .13, wrench);
    hit('wrench', -.85, 0, 3.7, 3.6, 'rotate');
    const left = label('↶', 2.75, .65, .65, 1.4, '#ffd58b', scene, .9), right = label('↷', 2.75, .65, .65, 1.4, '#ffd58b', scene, .9);
    label('トルク', 2.75, -.25, .6, 1.6); gauge(2.75, -.8, 2.3, () => s.torque, [.15, .8]);
    updates.push(() => { wrench.rotation.z = s.angle; left.visible = s.direction > 0; right.visible = s.direction < 0; });
  } else if (mode === 'seal') {
    const rock = material('#526572', { metalness: .1, roughness: 1 }); plate(7.4, 3.3, .2, rock, 0, 0, .03);
    for (let i = 0; i < crackPoints.length; i++) {
      const [x, y] = crackPoints[i]; if (i && i !== 12 && i !== 15) segment([...crackPoints[i - 1], .32], [x, y, .32], dark, .065);
      const foam = ball(.26, material('#bde9c5', { roughness: .7, metalness: 0 }), x, y, .42);
      updates.push(() => { foam.scale.set(.1 + s.fill[i] * 1.2, .1 + s.fill[i] * .85, .1 + s.fill[i]); foam.visible = s.fill[i] > .01; });
    }
    const nozzle = group(0, 0, .8); disc(.16, .4, trim, 0, 0, 0, nozzle); ring(.13, .035, amber, 0, 0, .23, nozzle); hit('foam', 0, 0, 7.7, 3.4, 'surface');
    updates.push(() => { nozzle.visible = !!s.pointer; if (s.pointer) nozzle.position.set(...s.pointer, .8); });
  } else if (mode === 'radar') {
    const paint = screen(0, -.1, 6.9, 2.7); const carriage = group(s.head, 1.37, .7); plate(.75, .42, .2, trim, 0, 0, 0, carriage); box(.12, .23, .15, cyan, 0, -.2, .06, carriage);
    box(6.8, .07, .07, brass, 0, 1.38, .1); hit('head', 0, 0, .95, .85, 'drag', carriage, .5); hit('mark', 0, -.2, 6.8, 2.5, 'tap', scene, .5);
    updates.push(() => { carriage.position.x = s.head; paint(s.scanned.map(Number).join(''), (ctx, w, h) => {
      ctx.strokeStyle = '#174354'; ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) { ctx.beginPath(); ctx.moveTo(0, i / 12 * h); ctx.lineTo(w, i / 12 * h); ctx.stroke(); }
      for (let i = 0; i < 25; i++) {
        const px = (i + .5) / 25 * w; if (!s.scanned[i]) continue;
        ctx.fillStyle = '#0d3443'; ctx.fillRect(i / 25 * w, 0, w / 25 + 1, h);
        for (let j = 0; j < 5; j++) { const yy = (.12 + j * .17 + Math.sin(i * .35 + j) * .03) * h; ctx.fillStyle = j % 2 ? '#83d7d7' : '#498b9c'; ctx.fillRect(px - w / 50, yy, w / 25 + 1, 2); }
        if (i >= 14 && i <= 17) { ctx.fillStyle = '#020f1b'; ctx.fillRect(i / 25 * w, h * .52, w / 25 + 1, h * .28); ctx.fillStyle = '#c6f3e8'; ctx.fillRect(i / 25 * w, h * .52, w / 25 + 1, 4); }
      }
    }); });
  } else if (mode === 'rover') {
    grid(0, .1, 7.7, 3.1);
    const winch = group(-3, .4, .3); disc(.63, .2, trim, 0, 0, 0, winch); const wheel = disc(.45, .12, rubber, 0, 0, .2, winch);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; segment([0, 0, .1], [Math.cos(a) * .4, Math.sin(a) * .4, .1], brass, .04, wheel); }
    const rover = group(2.5, .35, .4); plate(1.1, .65, .38, blue, 0, 0, 0, rover); box(.5, .3, .25, white, 0, .4, .1, rover);
    for (const x of [-.4, .4]) for (const y of [-.32, .32]) disc(.18, .2, rubber, x, y, .12, rover);
    const tether = box(5, .035, .035, brass, -.5, .4, .25); const snag = mesh(new THREE.DodecahedronGeometry(.28), metal, .5, .35, .3);
    button('巻く', 'wind', -.9, -1.15, 1.8, blue); button('緩める', 'unwind', 1.35, -1.15, 1.8);
    label('張力', -.4, 1.25, .5, .9); gauge(1.65, 1.25, 3.3, () => s.tension, [.1, .95]);
    updates.push(() => { rover.position.x = 2.5 - s.recovered * 4; wheel.rotation.z = s.wheel; tether.scale.x = (rover.position.x + 3) / 5; tether.position.x = (-3 + rover.position.x) / 2; snag.material = s.snagged ? red : metal; });
  }

  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -.85);
  let dragging = null, disposed = false, raf = 0, previous = performance.now(), lastW = 0, lastH = 0, keyboardIndex = 0;
  function rayAt(event) { const r = canvas.getBoundingClientRect(); pointer.set((event.clientX - r.left) / r.width * 2 - 1, -(event.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(pointer, camera); return ray; }
  function world(event) { return rayAt(event).ray.intersectPlane(plane, new THREE.Vector3()); }
  function enabled(object) { for (let o = object; o; o = o.parent) if (!o.visible) return false; return true; }
  function controlAt(event) {scene.updateMatrixWorld(true);const hits=rayAt(event).intersectObjects(controls,false).filter(h=>enabled(h.object));let selected=null,best=Infinity;for(const h of hits){const local=h.object.worldToLocal(h.point.clone()),size=h.object.geometry.parameters,score=(local.x/size.width)**2+(local.y/size.height)**2;if(score<best){best=score;selected=h.object;}}return selected;}

  function down(event) {
    if (!s.accepting || dragging || (event.button !== undefined && event.button !== 0)) return;
    const object = controlAt(event), p = world(event); if (!object || !p) return;
    event.preventDefault(); event.stopPropagation(); canvas.focus({ preventScroll: true }); canvas.setPointerCapture(event.pointerId);
    const c = object.userData.taskControl, center = object.getWorldPosition(new THREE.Vector3()); keyboardIndex = c.index;
    dragging = { pointer: event.pointerId, id: c.id, kind: c.drag, center, offset: c.drag === 'drag' ? [p.x - center.x, p.y - center.y] : [0, 0], angle: Math.hypot(p.x-center.x,p.y-center.y)>.15?Math.atan2(p.y-center.y,p.x-center.x):null };
    run.dispatch({ type: 'press', id: c.id, x: p.x - dragging.offset[0], y: p.y - dragging.offset[1] });
    update(0); // Make a moved control's next hit test match its visible position.
  }
  function move(event) {
    if (!dragging || event.pointerId !== dragging.pointer) { canvas.style.cursor = s.accepting && controlAt(event) ? 'pointer' : 'default'; return; }
    event.preventDefault(); event.stopPropagation(); const p = world(event); if (!p) return;
    const d = dragging;
    if (d.kind === 'rotate') { const angle = Math.atan2(p.y - d.center.y, p.x - d.center.x); if (Math.hypot(p.x - d.center.x, p.y - d.center.y) > .15) { run.dispatch({ type: 'rotate', id: d.id, delta: d.angle===null?0:angleDelta(angle, d.angle) }); d.angle = angle; } }
    else if (d.kind) run.dispatch({ type: 'drag', id: d.id, x: p.x - d.offset[0], y: p.y - d.offset[1] });
    update(0);
  }
  function release(event) {
    if (!dragging || (event && event.pointerId !== dragging.pointer)) return;
    const d = dragging; dragging = null; run.dispatch({ type: 'release', id: d.id });
    if (canvas.hasPointerCapture(d.pointer)) canvas.releasePointerCapture(d.pointer);
    if (!disposed) update(0);
  }
  function keyboard(event) {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose?.(); return; }
    if (event.key === 'Tab') { event.preventDefault(); const visible = controls.filter(enabled); const index = visible.indexOf(controls[keyboardIndex]); keyboardIndex = visible[(index + (event.shiftKey ? visible.length - 1 : 1)) % visible.length]?.userData.taskControl.index ?? 0; return; }
    const object = controls[keyboardIndex]; if (!object || !enabled(object)) return;
    const c = object.userData.taskControl, p = object.getWorldPosition(new THREE.Vector3());
    if (['Enter', ' '].includes(event.key)) { event.preventDefault(); event.stopPropagation(); if (!event.repeat) run.dispatch({ type: 'press', id: c.id, x: p.x, y: p.y }); return; }
    if (!event.key.startsWith('Arrow')) return;
    event.preventDefault(); event.stopPropagation(); const dx = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0, dy = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0;
    if (c.drag === 'rotate') run.dispatch({ type: 'rotate', id: c.id, delta: (dx || dy) * .12 });
    else if (c.drag === 'pad') run.dispatch({ type: 'drag', id: c.id, x: 3.15 + dx * .7, y: -.9 + dy * .7 });
    else run.dispatch({ type: 'drag', id: c.id, x: p.x + dx * .12, y: p.y + dy * .12 });
    update(0);
  }
  function keyup(event) { if (event.key.startsWith('Arrow') || ['Enter', ' '].includes(event.key)) run.dispatch({ type: 'release' }); }
  function pause() { release(); run.release(); previous = performance.now(); }
  function resize() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight); if (w === lastW && h === lastH) return;
    lastW = w; lastH = h; renderer.setSize(w, h, false); const a = w / h, v = Math.max(2.62, 5.2 / a);
    camera.left = -v * a; camera.right = v * a; camera.top = v; camera.bottom = -v; camera.updateProjectionMatrix();
  }
  let completedShown=false;
  function update(dt) {
    if(s.finished&&!completedShown){completedShown=true;host.classList.add('task-complete');host.dispatchEvent(new CustomEvent('spacesuspect:task-completed',{bubbles:true}));}
    // Keep the mechanisms' timing consistent on a slower renderer. Substeps
    // preserve collision/temperature stability instead of slowing the task.
    for (let remaining = dt; remaining > 0; remaining -= .02) run.step(Math.min(.02, remaining));
    for (const fn of updates) fn();
    const roverPrompt = mode === 'rover' ? s.snagged ? '引っ掛かり！「緩める」を長押し' : s.tension > .95 ? '張りすぎ！「緩める」を長押し' : '「巻く」を長押しで回収' : '';
    const message = s.finished ? 'タスク完了' : s.feedback || roverPrompt;
    statusScreen.setVisible(!!message);
    statusScreen(message, (ctx, w, h) => { ctx.fillStyle = s.errorUntil > s.elapsed ? '#ff9ba5' : '#8df1c7'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '600 30px system-ui,sans-serif'; ctx.fillText(message, w / 2, h / 2, w - 10); });
    progressLight.scale.x = Math.max(.3, Math.min(1, s.progress) * 18); progressLight.material = s.finished ? green : cyan;
    scene.updateMatrixWorld(true);
  }
  function tick(now) {
    if (disposed) return; raf = requestAnimationFrame(tick);
    const dt = Math.min(.2, Math.max(0, (now - previous) / 1000)); previous = now;
    if (document.hidden) return;
    resize(); update(dt); renderer.render(scene, camera);
  }
  function lost(event) { event.preventDefault(); dispose(); onUnavailable?.(); }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const handlers = [['pointerdown', down], ['pointermove', move], ['pointerup', release], ['pointercancel', release], ['lostpointercapture', () => {}], ['keydown', keyboard], ['keyup', keyup], ['blur', pause], ['contextmenu', (event) => event.preventDefault()], ['webglcontextlost', lost]];
  for (const [name, fn] of handlers) canvas.addEventListener(name, fn);
  const outsideMove=event=>{if(dragging&&event.pointerId===dragging.pointer&&!canvas.hasPointerCapture(event.pointerId))move(event);};
  window.addEventListener('pointermove',outsideMove,{passive:false});window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
  document.addEventListener('visibilitychange', pause);
  function dispose() {
    if (disposed) return; disposed = true; pause(); cancelAnimationFrame(raf); observer.disconnect();
    for (const [name, fn] of handlers) canvas.removeEventListener(name, fn);
    window.removeEventListener('pointermove',outsideMove);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);
    document.removeEventListener('visibilitychange', pause);
    for (const g of geometries) g.dispose(); for (const m of materials) m.dispose(); for (const t of textures) t.dispose();
    renderer.setRenderTarget(null); renderer.clear(); renderer.renderLists.dispose(); canvas.remove();
    if (renderer.getContext().isContextLost() || idleTaskRenderer) {
      renderer.dispose(); renderer.forceContextLoss();
    } else idleTaskRenderer = renderer;
  }
  resize(); update(0); renderer.render(scene, camera); raf = requestAnimationFrame(tick);
  return { canvas, scene, camera, renderer, controls, run, dispose };
}
