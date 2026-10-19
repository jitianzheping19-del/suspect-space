// Task simulation has no renderer, network or wall clock dependency. A session
// owns its input and is discarded when the terminal closes.
export const FROST_TASK_MODES = [
  'circuit', 'clocks', 'cargo', 'drone', 'stars', 'defrost',
  'triangulate', 'waveform', 'tubing', 'medicine', 'irrigation', 'fins',
  'core', 'centrifuge', 'sterile', 'freezer', 'overcurrent', 'battery',
  'drill', 'seal', 'radar', 'rover',
];
export const taskInstructions = {
  circuit: '回路を回して、3つの区画へつなぐ', clocks: '針が光る目盛りに来たら止める',
  cargo: '貨物を動かして、台を水平にする', drone: '右のパッドで誘導。着陸枠でゆっくり止まる',
  stars: '左の星図と同じ星を、順番につなぐ', defrost: 'レンズをなぞって霜を落とす',
  triangulate: 'アンテナを回し、3本とも信号を最大にする', waveform: '波形がつながる順に断片を並べる',
  tubing: 'チューブの先を、光る固定具へ順に通す', medicine: '＋を押して注入。入れすぎたら−で吸い戻す',
  irrigation: '苗床を押して給水。3つとも緑の湿度へ', fins: 'ぶつからない順にフィンを開き、固定する',
  core: '刃を光る地層に合わせて採取し、右へ引き出す', centrifuge: '右のパッドで軸を中心へ戻して安定させる',
  sterile: '右のパッドでトレーを傾け、汚染壁を避けて右下へ', freezer: '温度変化の遅れを見ながら、−18℃に保つ',
  overcurrent: '電流計を見て、過電流の回線だけを切る', battery: '−端子から外し、固定具を解除して電池を交換',
  drill: '矢印の向きへ工具を回す。力をかけすぎない', seal: '亀裂をなぞり、発泡材で隙間を埋める',
  radar: '探査ヘッドを左右へ走査。見つけた空洞を押す', rover: '巻く・緩めるで張力を保ち、引っ掛かりを外す',
};
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const tubeClips = [[-2.8, 1.1], [-1.4, .35], [0, 1], [1.3, -.5], [2.8, -1.1]];
export const antennaBases = [[-2.5, -1.05], [0, -1.05], [2.5, -1.05]];
export const signalSource = [.65, 1.65];
export const starPoints = [[-.9, .85], [-.35, -.3], [.1, .4], [.9, -.7], [1.25, .5], [-1.3, -.8], [.8, 1.3], [-.3, 1.4]];
export const frostPixels = Array.from({ length: 11 * 7 }, (_, i) => [-2.6 + i % 11 * .52, -1.5 + Math.floor(i / 11) * .5])
  .filter(([x, y]) => (x / 3) ** 2 + (y / 1.85) ** 2 < .94);
export const crackPoints = [
  [-2.8, 1.1], [-2.3, .9], [-1.8, .5], [-1.3, .65], [-.8, .15], [-.3, .3],
  [.2, -.15], [.7, -.45], [1.2, -.35], [1.7, -.85], [2.2, -.7], [2.8, -1.1],
  [-.8, 1.4], [-.8, .95], [-.8, .55], [.5, 1.3], [.4, .8], [.3, .35],
];
const rotatePorts = (mask, turns) => ((mask << turns) | (mask >> (4 - turns))) & 15;
export const circuitPorts = [0, 6, 10, 10, 15, 10, 0, 3, 10];
function connectedCircuit(turns) {
  const ports = circuitPorts.map((p, i) => rotatePorts(p, turns[i]));
  const visited = new Set(), queue = [3], outputs = new Set();
  if (!(ports[3] & 8)) return { visited, outputs, valid: false };
  let leak = false;
  while (queue.length) {
    const i = queue.shift(); if (visited.has(i)) continue; visited.add(i);
    for (const [bit, dx, dy, opposite] of [[1, 0, -1, 4], [2, 1, 0, 8], [4, 0, 1, 1], [8, -1, 0, 2]]) {
      if (!(ports[i] & bit)) continue;
      const x = i % 3 + dx, y = Math.floor(i / 3) + dy;
      if (i === 3 && bit === 8) continue;
      if (x === 3 && bit === 2) { outputs.add(i); continue; }
      if (x < 0 || x > 2 || y < 0 || y > 2 || !(ports[y * 3 + x] & opposite)) { leak = true; continue; }
      queue.push(y * 3 + x);
    }
  }
  return { visited, outputs, valid: !leak && outputs.size === 3 };
}
const distanceToSegment = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = dx * dx + dy * dy;
  const t = d ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d, 0, 1) : 0;
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
};

export function createFrostTaskRun(task, onComplete = () => {}) {
  if (!FROST_TASK_MODES.includes(task.mode)) throw new Error('Unknown FROST task: ' + task.mode);
  const mode = task.mode;
  const s = { task, mode, elapsed: 0, progress: 0, finished: false, accepting: true,
    feedback: '', errorUntil: 0, hold: '', pointer: null, steady: 0, touched: false };
  const initializers = {
    circuit: () => ({ turns: [0, 1, 1, 1, 0, 1, 0, 2, 1] }),
    clocks: () => ({ angles: [-1.1, .1, 3.7], locked: [false, false, false] }),
    cargo: () => ({ cargo: [-2.4, -.3, 1.6], weights: [1, 2, 3], torque: 1.8 }),
    drone: () => ({ x: -2.8, y: 1.05, vx: 0, vy: 0, control: [0, 0] }),
    stars: () => ({ selected: [], rotation: .7 }),
    defrost: () => ({ clear: frostPixels.map(() => false), previous: null }),
    triangulate: () => ({ angles: [.6, 1.9, 2.55], strength: [0, 0, 0] }),
    waveform: () => ({ order: [2, 0, 3, 1], dragging: -1, dragX: 0 }),
    tubing: () => ({ clips: 0, tip: [-3.3, -1.2] }),
    medicine: () => ({ levels: [0, 0, 0], targets: [.35, .65, .5] }),
    irrigation: () => ({ moisture: [.18, .7, .3], water: -1 }),
    fins: () => ({ open: [false, false, false], extension: [0, 0, 0] }),
    core: () => ({ depth: .15, target: .63, cut: false, extraction: 0 }),
    centrifuge: () => ({ x: .55, y: -.3, control: [0, 0], rotor: 0 }),
    sterile: () => ({ x: -2.8, y: 1.1, vx: 0, vy: 0, control: [0, 0], collisions: 0 }),
    freezer: () => ({ temperature: -10, rate: 0, power: 0 }),
    overcurrent: () => ({ switches: [true, true, true, true, true], fault: 2, amps: [4, 6, 18, 5, 3] }),
    battery: () => ({ stage: 0, oldX: 0, newX: 3, orientation: 1 }),
    drill: () => ({ direction: -1, turns: 0, angle: 0, torque: 0, swings: 0 }),
    seal: () => ({ fill: crackPoints.map(() => 0) }),
    radar: () => ({ head: -3, scanned: Array(25).fill(false), cavity: [.85, -.5] }),
    rover: () => ({ recovered: 0, tension: .38, winch: 0, snagged: false, unhooked: false, wheel: 0 }),
  };
  Object.assign(s, initializers[mode]());
  const error = (message) => { s.feedback = message; s.errorUntil = s.elapsed + 1.4; };
  function complete() {
    if (s.finished) return;
    s.finished = true; s.accepting = false; s.progress = 1; s.feedback = 'タスク完了'; s.errorUntil = 0;
    release(); onComplete(task);
  }
  function release() {
    s.hold = ''; s.pointer = null;
    if (s.control) s.control = [0, 0];
    if (mode === 'irrigation') s.water = -1;
    if (mode === 'freezer') s.power = 0;
    if (mode === 'rover') s.winch = 0;
    if (mode === 'defrost') s.previous = null;
  }
  function dispatch(event) {
    if (!s.accepting) return false;
    if (!event || !['press', 'drag', 'release', 'rotate'].includes(event.type)) return false;
    const { type, id = '' } = event;
    const x = Number(event.x), y = Number(event.y), n = Number(id.split(':')[1]);
    if (type === 'release') {
      if (mode === 'waveform' && s.dragging >= 0) {
        const from = s.order.indexOf(s.dragging), to = clamp(Math.round((s.dragX + 2.7) / 1.8), 0, 3);
        [s.order[from], s.order[to]] = [s.order[to], s.order[from]];
        s.dragging = -1;
        if (s.order.every((part, i) => part === i)) complete();
      }
      release(); return true;
    }
    if (type === 'drag' && (!Number.isFinite(x) || !Number.isFinite(y))) return false;
    s.touched = true;
    if (type === 'press') {
      s.hold = id;
      if (mode === 'circuit' && id.startsWith('tile:') && n >= 0 && n < 9 && circuitPorts[n]) s.turns[n] = (s.turns[n] + 1) % 4;
      if (mode === 'clocks' && n >= 0 && n < 3) {
        if (Math.abs(angleDelta(s.angles[n], Math.PI / 2)) < .3) s.locked[n] = true;
        else error('光る目盛りでもう一度');
      }
      if (mode === 'stars' && n >= 0 && n < 8) {
        if (n === s.selected.length) { s.selected.push(n); if (s.selected.length === 5) complete(); }
        else { s.selected = []; error('左の星図と同じ順番でつなぐ'); }
      }
      if (mode === 'waveform' && n >= 0 && n < 4) { s.dragging = n; s.dragX = -2.7 + s.order.indexOf(n) * 1.8; }
      if (mode === 'irrigation' && n >= 0 && n < 3) s.water = n;
      if (mode === 'fins') {
        if (id === 'latch' && s.open.every(Boolean) && s.extension.every((v) => v > .98)) complete();
        else if (id.startsWith('fin:') && n >= 0 && n < 3) {
          const next = [1, 0, 2].find((i) => !s.open[i]);
          if (n === next) s.open[n] = true; else if (!s.open[n]) error('先に手前のフィンを開く');
        }
      }
      if (mode === 'core' && id === 'cut') {
        if (Math.abs(s.depth - s.target) < .035) s.cut = true;
        else error('刃を黄色の地層へ合わせる');
      }
      if (mode === 'freezer') s.power = id === 'cool' ? -1 : id === 'heat' ? 1 : 0;
      if (mode === 'overcurrent' && n >= 0 && n < 5) {
        s.switches[n] = !s.switches[n];
        if (!s.switches[n] && n !== s.fault) error('正常な回線はつないだままにする');
        if (s.switches.every((on, i) => on === (i !== s.fault))) complete();
      }
      if (mode === 'battery') {
        const expected = ['negative', 'positive', 'clamp', '', '', 'rotate', 'clamp', 'positive', 'negative'][s.stage];
        if (id === expected) {
          if (id === 'rotate') s.orientation = 0;
          if (++s.stage === 9) complete();
        } else if (['negative', 'positive', 'clamp', 'rotate'].includes(id)) error(s.stage === 0 ? 'まず−端子を外す' : '光る接続箇所を確認');
      }
      if (mode === 'rover') s.winch = id === 'wind' ? 1 : id === 'unwind' ? -1 : 0;
      if (mode === 'radar' && id === 'mark' && s.scanned.filter(Boolean).length >= 20) {
        if (Math.hypot(x - s.cavity[0], y - s.cavity[1]) < .48) complete();
        else error('反射が途切れる空洞を指定する');
      }
    }
    if (type === 'drag' || (type === 'press' && Number.isFinite(x) && Number.isFinite(y))) {
      if (mode === 'cargo' && id.startsWith('cargo:') && n >= 0 && n < 3) s.cargo[n] = clamp(x, -2.8, 2.8);
      if (['drone', 'centrifuge', 'sterile'].includes(mode) && id === 'pad') s.control = [clamp((x - 3.15) / .7, -1, 1), clamp((y + .9) / .7, -1, 1)];
      if (mode === 'defrost') {
        const p = [x, y], from = s.previous || p;
        frostPixels.forEach((cell, i) => { if (distanceToSegment(cell, from, p) < .46) s.clear[i] = true; });
        s.previous = p;
      }
      if (mode === 'triangulate' && n >= 0 && n < 3 && Math.hypot(x - antennaBases[n][0], y - antennaBases[n][1]) > .2) s.angles[n] = clamp(Math.atan2(y - antennaBases[n][1], x - antennaBases[n][0]), .08, Math.PI - .08);
      if (mode === 'waveform' && s.dragging >= 0) s.dragX = clamp(x, -2.7, 2.7);
      if (mode === 'tubing' && id === 'tube') {
        const next = tubeClips[s.clips];
        if (next && distanceToSegment(next, s.tip, [x, y]) < .32) s.clips++;
        s.tip = [clamp(x, -3.5, 3.5), clamp(y, -1.6, 1.6)];
        if (s.clips === tubeClips.length) complete();
      }
      if (mode === 'core' && id === 'depth' && !s.cut) s.depth = clamp((1.5 - y) / 3, 0, 1);
      if (mode === 'core' && id === 'extract' && s.cut) { s.extraction = clamp((x + .4) / 3.5, 0, 1); if (s.extraction > .93) complete(); }
      if (mode === 'battery' && s.stage === 3 && id === 'old') { s.oldX = clamp(x, -3.2, 0); if (x < -2.5) s.stage = 4; }
      if (mode === 'battery' && s.stage === 4 && id === 'new') { s.newX = clamp(x, 0, 3.2); if (x < .35) s.stage = 5; }
      if (mode === 'seal') s.pointer = [x, y];
      if (mode === 'radar' && id === 'head') {
        const previous = s.head; s.head = clamp(x, -3, 3);
        s.scanned.forEach((_, i) => { const at = -3 + i * .25; if (at >= Math.min(previous, s.head) - .18 && at <= Math.max(previous, s.head) + .18) s.scanned[i] = true; });
      }
    }
    if (mode === 'drill' && type === 'rotate' && Number.isFinite(event.delta)) {
      const delta = clamp(event.delta, -.55, .55);
      s.angle += delta;
      if (delta * s.direction > 0) {
        s.turns += Math.abs(delta); s.torque = clamp(s.torque + Math.abs(delta) * .35, 0, 1.2);
        if (s.torque > 1) { s.turns = 0; s.torque = .2; error('ゆっくり回してトルクを下げる'); }
        if (s.turns >= .9) { s.swings++; s.turns = 0; s.torque = .2; s.direction *= -1; if (s.swings >= 4) complete(); }
      } else s.torque = Math.max(0, s.torque - Math.abs(delta) * .3);
    }
    evaluate(); return true;
  }
  function evaluate() {
    if (s.finished) { s.progress = 1; return; }
    switch (mode) {
      case 'circuit': { const net = connectedCircuit(s.turns); s.powered = net.visited; s.progress = net.outputs.size / 3; if (net.valid) complete(); break; }
      case 'clocks': s.progress = s.locked.filter(Boolean).length / 3; if (s.locked.every(Boolean)) complete(); break;
      case 'cargo': s.torque = s.cargo.reduce((sum, x, i) => sum + x * s.weights[i], 0); s.progress = clamp(1 - Math.abs(s.torque) / 10, 0, .9); break;
      case 'stars': s.progress = s.selected.length / 5; break;
      case 'defrost': s.progress = s.clear.filter(Boolean).length / s.clear.length; if (s.progress > .92) complete(); break;
      case 'triangulate':
        s.strength = s.angles.map((a, i) => clamp(1 - Math.abs(angleDelta(a, Math.atan2(signalSource[1] - antennaBases[i][1], signalSource[0] - antennaBases[i][0]))) / .65, 0, 1));
        s.progress = s.strength.reduce((a, b) => a + b, 0) / 3;
        if (s.strength.every((v) => v > .9)) complete(); break;
      case 'waveform': s.progress = s.order.filter((p, i) => p === i).length / 4; break;
      case 'tubing': s.progress = s.clips / tubeClips.length; break;
      case 'medicine': s.progress = s.levels.reduce((a, v, i) => a + clamp(1 - Math.abs(v - s.targets[i]) / s.targets[i], 0, 1), 0) / 3; break;
      case 'irrigation': s.progress = s.moisture.filter((v) => v >= .45 && v <= .75).length / 3; break;
      case 'fins': s.progress = s.open.filter(Boolean).length / 4; break;
      case 'core': s.progress = s.cut ? .6 + .4 * s.extraction : Math.abs(s.depth - s.target) < .035 ? .4 : 0; break;
      case 'battery': s.progress = s.stage / 9; break;
      case 'drill': s.progress = (s.swings + s.turns / .9) / 4; break;
      case 'seal': s.progress = s.fill.reduce((a, b) => a + b, 0) / s.fill.length; if (s.fill.every((v) => v >= .85)) complete(); break;
      case 'radar': s.progress = s.scanned.filter(Boolean).length / 26; break;
      case 'rover': s.progress = s.recovered; if (s.recovered >= 1 && s.tension < .85) complete(); break;
    }
  }
  function step(seconds) {
    if (!s.accepting || !Number.isFinite(seconds) || seconds <= 0) return;
    const dt = Math.min(seconds, .05); s.elapsed += dt;
    if (s.feedback && s.elapsed > s.errorUntil) s.feedback = '';
    if (mode === 'clocks') s.angles = s.angles.map((a, i) => s.locked[i] ? a : a + [.8, -1.05, 1.3][i] * dt);
    if (mode === 'cargo') {
      s.steady = s.touched && Math.abs(s.torque) < .32 && !s.hold ? s.steady + dt : 0;
      if (s.steady > .85) complete();
    }
    if (mode === 'drone') {
      s.vx += (s.control[0] * 2.7 + Math.sin(s.elapsed * .8) * .16 - s.vx * 2.1) * dt;
      s.vy += (s.control[1] * 2.7 - s.vy * 2.1) * dt;
      s.x = clamp(s.x + s.vx * dt, -3.4, 1.75); s.y = clamp(s.y + s.vy * dt, -1.5, 1.5);
      s.steady = Math.hypot(s.x - .65, s.y + .85) < .43 && Math.hypot(s.vx, s.vy) < .3 ? s.steady + dt : 0;
      s.progress = clamp(1 - Math.hypot(s.x - .65, s.y + .85) / 4.8, 0, .9);
      if (s.steady > .85) complete();
    }
    if (mode === 'medicine') {
      const match = s.hold.match(/^dose:(\d)([+-])$/);
      if (match) {
        const i = Number(match[1]);
        if (i < 3) {
          // The pipette meters slowly near the graduation, keeping a finger
          // release precise without snapping or capping the dose at its goal.
          const flow = .32 * clamp(Math.abs(s.levels[i] - s.targets[i]) / .2, .25, 1);
          s.levels[i] = clamp(s.levels[i] + (match[2] === '+' ? 1 : -1) * dt * flow, 0, 1);
        }
      }
      s.steady = s.levels.every((v, i) => Math.abs(v - s.targets[i]) < .04) && !s.hold ? s.steady + dt : 0;
      if (s.steady > .5) complete();
    }
    if (mode === 'irrigation') {
      s.moisture = s.moisture.map((v, i) => clamp(v + (s.water === i ? .5 : -[.027, .018, .035][i]) * dt, 0, 1));
      s.steady = s.moisture.every((v) => v >= .45 && v <= .75) ? s.steady + dt : 0;
      if (s.steady > .8) complete();
    }
    if (mode === 'fins') s.extension = s.extension.map((v, i) => Math.min(s.open[i] ? 1 : 0, v + dt * 2.8));
    if (mode === 'centrifuge') {
      s.rotor += dt * 12;
      s.x = clamp(s.x + (s.control[0] * .95 + Math.cos(s.elapsed * 2) * .09) * dt, -.85, .85);
      s.y = clamp(s.y + (s.control[1] * .95 + Math.sin(s.elapsed * 1.7) * .09) * dt, -.85, .85);
      s.steady = s.touched && Math.hypot(s.x, s.y) < .23 ? s.steady + dt : Math.max(0, s.steady - dt * 1.5);
      s.progress = s.steady / 2.5; if (s.steady >= 2.5) complete();
    }
    if (mode === 'sterile') {
      s.vx += (s.control[0] * 3.8 - s.vx * 3) * dt; s.vy += (s.control[1] * 3.8 - s.vy * 3) * dt;
      const nx = clamp(s.x + s.vx * dt, -3.25, 1.75), ny = clamp(s.y + s.vy * dt, -1.45, 1.45);
      const collision = (Math.abs(nx + 1.3) < .28 && ny < .35) || (Math.abs(nx - .3) < .28 && ny > -.35);
      if (collision) { s.vx *= -.4; s.vy *= -.4; s.collisions++; error('汚染壁を避ける'); }
      else { s.x = nx; s.y = ny; }
      s.progress = clamp((s.x + 2.8) / 4.2, 0, .95);
      if (Math.hypot(s.x - 1.35, s.y + 1.05) < .32 && Math.hypot(s.vx, s.vy) < .5) complete();
    }
    if (mode === 'freezer') {
      const capacity = 3.2 * clamp(Math.abs(s.temperature + 18) / 5, .24, 1);
      s.rate += (s.power * capacity + .12 - s.rate) * dt * 1.8;
      s.temperature = clamp(s.temperature + s.rate * dt, -30, 5);
      s.steady = s.touched && Math.abs(s.temperature + 18) < 1 && Math.abs(s.rate) < .65 ? s.steady + dt : 0;
      s.progress = s.steady / 2;
      if (s.steady > 2) complete();
    }
    if (mode === 'drill') s.torque = Math.max(0, s.torque - dt * .3);
    if (mode === 'seal' && s.pointer) crackPoints.forEach((p, i) => { if (Math.hypot(p[0] - s.pointer[0], p[1] - s.pointer[1]) < .47) s.fill[i] = Math.min(1, s.fill[i] + dt * 2.8); });
    if (mode === 'rover') {
      s.tension = clamp(s.tension + (s.winch > 0 ? .29 : s.winch < 0 ? -.55 : -.045) * dt, 0, 1.1);
      if (!s.unhooked && s.recovered >= .44) s.snagged = true;
      if (s.snagged && s.tension < .22) { s.unhooked = true; s.snagged = false; }
      if (s.winch > 0 && s.tension >= .28 && s.tension <= .8 && !s.snagged) s.recovered = Math.min(1, s.recovered + dt * .22);
      if (s.winch < 0) s.recovered = Math.max(0, s.recovered - dt * .018);
      if (s.tension > 1) { s.tension = .36; s.recovered = Math.max(0, s.recovered - .15); error('張力が強すぎます。緩める'); }
      s.wheel += s.winch * dt * 3;
    }
    evaluate();
  }
  evaluate();
  return { state: s, dispatch, step, release };
}
