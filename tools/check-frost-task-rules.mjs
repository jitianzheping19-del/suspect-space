import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createFrostTaskRun, FROST_TASK_MODES, antennaBases, signalSource, tubeClips, frostPixels, crackPoints, angleDelta, clamp } from '../frost-task-rules.js';
import { createFrostGameLayout } from '../frost-game-layout.js';

const data = JSON.parse(await readFile(new URL('../frost-map-data.json', import.meta.url)));
const tasks = data.tasks.filter((t) => !t.sabotage);
assert.equal(tasks.length, 22); assert.equal(new Set(tasks.map((t) => t.mode)).size, 22);
assert.deepEqual([...tasks.map((t) => t.mode)].sort(), [...FROST_TASK_MODES].sort());
assert(data.rooms.every((room) => tasks.filter((t) => t.roomId === room.id).length === 2));
const layout = createFrostGameLayout(data);
assert.equal(layout.tasks.length, 22); assert.equal(layout.emergencyPanels.length, 9); assert.equal(layout.colliders.length, 32);

const results = [];
for (const task of tasks) {
  let completions = 0;
  const run = createFrostTaskRun(task, () => completions++), s = run.state;
  const press = (id, x, y) => run.dispatch({ type: 'press', id, x, y });
  const drag = (id, x, y) => run.dispatch({ type: 'drag', id, x, y });
  const release = () => run.dispatch({ type: 'release' });
  const step = (seconds) => { for (let t = 0; t < seconds - 1e-8; t += .02) run.step(.02); };
  const pad = (x, y) => drag('pad', 3.15 + clamp(x, -1, 1) * .7, -.9 + clamp(y, -1, 1) * .7);
  assert(!s.finished, 'Task completes on open: ' + task.mode);
  run.dispatch({ type: 'drag', x: NaN, y: Infinity });
  // Waiting alone must never solve a mechanism.
  step(1); assert(!s.finished, task.mode);
  switch (task.mode) {
    case 'circuit':
      for (let i = 0; i < 9; i++) for (let turn = 0; turn < 4 && s.turns[i] !== 0 && !s.finished; turn++) press('tile:' + i);
      break;
    case 'clocks':
      press('clock:0'); assert(!s.locked[0], 'Wrong clock timing accepted');
      for (let i = 0; i < 1800 && !s.finished; i++) { for (let j = 0; j < 3; j++) if (!s.locked[j] && Math.abs(angleDelta(s.angles[j], Math.PI / 2)) < .12) press('clock:' + j); step(.02); }
      break;
    case 'cargo': press('cargo:2', s.cargo[2], 0); drag('cargo:2', 1, 0); release(); step(1); break;
    case 'drone':
      for (let i = 0; i < 1500 && !s.finished; i++) { pad((.65 - s.x) * 1.8 - s.vx * 1.6, (-.85 - s.y) * 1.8 - s.vy * 1.6); step(.02); }
      break;
    case 'stars': press('star:3'); assert.equal(s.selected.length, 0); for (let i = 0; i < 5; i++) press('star:' + i); break;
    case 'defrost':
      press('wipe', -3, -1.5); for (let row = 0; row < 7; row++) { const y = -1.5 + row * .5; drag('wipe', row % 2 ? 3 : -3, y); drag('wipe', row % 2 ? -3 : 3, y); } release();
      assert(s.clear.length === frostPixels.length); break;
    case 'triangulate': for (let i = 0; i < 3; i++) { press('antenna:' + i, ...antennaBases[i]); drag('antenna:' + i, ...signalSource); release(); } break;
    case 'waveform':
      for (let slot = 0; slot < 4; slot++) { press('wave:' + slot, -2.7 + s.order.indexOf(slot) * 1.8, .1); drag('wave:' + slot, -2.7 + slot * 1.8, .1); release(); }
      break;
    case 'tubing': press('tube', ...s.tip); for (const point of tubeClips) drag('tube', ...point); release(); break;
    case 'medicine':
      for (let i = 0; i < 3; i++) { press('dose:' + i + '+'); for (let j = 0; j < 200 && s.levels[i] < s.targets[i] - .002 && !s.finished; j++) step(.02); release(); }
      step(.7); break;
    case 'irrigation':
      for (let i = 0; i < 3; i++) { if (s.moisture[i] < .6) { press('bed:' + i); for (let j = 0; j < 200 && s.moisture[i] < .63 && !s.finished; j++) step(.02); release(); } }
      step(1); break;
    case 'fins': press('fin:0'); assert(!s.open[0]); for (const i of [1, 0, 2]) { press('fin:' + i); step(.45); } press('latch'); break;
    case 'core': press('cut'); assert(!s.cut); drag('depth', .5, 1.5 - s.target * 3); press('cut'); drag('extract', 3.1, -.4); break;
    case 'centrifuge':
      for (let i = 0; i < 900 && !s.finished; i++) { pad(-s.x * 4, -s.y * 4); step(.02); }
      break;
    case 'sterile':
      for (const [x, y] of [[-2.8, 1.1], [-.6, 1.05], [-.6, -1.05], [1.35, -1.05]]) {
        for (let i = 0; i < 700 && !s.finished; i++) { pad((x - s.x) * 2.5 - s.vx * 1.4, (y - s.y) * 2.5 - s.vy * 1.4); step(.02); if (Math.hypot(s.x - x, s.y - y) < .09 && Math.hypot(s.vx, s.vy) < .15) break; }
      }
      break;
    case 'freezer':
      for (let i = 0; i < 1600 && !s.finished; i++) {
        const predicted = s.temperature + s.rate / 1.8;
        if (predicted > -17.95) press('cool'); else if (predicted < -18.4) press('heat'); else release();
        step(.02);
      }
      break;
    case 'overcurrent': press('breaker:0'); assert(!s.finished); press('breaker:0'); press('breaker:2'); break;
    case 'battery':
      press('positive'); assert.equal(s.stage, 0); press('negative'); press('positive'); press('clamp');
      drag('old', -3, 0); drag('new', 0, 0); press('rotate'); press('clamp'); press('positive'); press('negative'); break;
    case 'drill':
      for (let i = 0; i < 40 && !s.finished; i++) { run.dispatch({ type: 'rotate', id: 'wrench', delta: s.direction * .2 }); step(.08); }
      break;
    case 'seal': for (const point of crackPoints) { press('foam', ...point); step(.34); release(); } break;
    case 'radar': press('mark', ...s.cavity); assert(!s.finished); drag('head', -3, 1.3); drag('head', 3, 1.3); press('mark', -2, -.5); assert(!s.finished); press('mark', ...s.cavity); break;
    case 'rover':
      for (let i = 0; i < 3000 && !s.finished; i++) {
        if (s.snagged) press('unwind'); else if (s.tension > .73) press('unwind'); else press('wind');
        step(.02);
      }
      break;
  }
  assert(s.finished, task.mode + ' not completable: ' + JSON.stringify(s));
  assert.equal(s.progress, 1, task.mode); assert.equal(completions, 1, task.mode);
  press('repeat', 0, 0); step(1); assert.equal(completions, 1, 'Duplicate completion: ' + task.mode);
  const retry = createFrostTaskRun(task); retry.dispatch({ type: 'press', id: task.mode === 'medicine' ? 'dose:0+' : 'pad', x: 3.8, y: -.9 });
  retry.release(); assert.equal(retry.state.hold, ''); if (retry.state.control) assert.deepEqual(retry.state.control, [0, 0]);
  results.push({ mode: task.mode, simulatedSeconds: Math.round(s.elapsed * 10) / 10 });
}
console.table(results);
console.log('PASS: 22 distinct tasks, invalid inputs, full completion, retry, input release and game layout');
