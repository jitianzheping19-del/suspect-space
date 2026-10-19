// Exercise actual picked meshes with mouse/touch. No completion events or
// simulation fields are written by this playtest.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.FROST_QA_OUT || path.join(root, 'tmp/frost-task-machines');
const url = process.env.FROST_QA_URL || 'http://127.0.0.1:4173/suspect-space/frost-walls-preview.html';
fs.mkdirSync(out, { recursive: true });
const pause = (page, ms = 80) => page.waitForTimeout(ms);

async function play(page, task, touch = false) {
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const current = () => page.evaluate((id) => {
    const api = window.__frostPreview, s = api.tasks.manager.state();
    return s || { finished: api.tasks.manager.completed.has(id) };
  }, task.id);
  const control = async (id) => {
    const c = await page.evaluate((id) => window.__frostPreview.taskControls().find((c) => c.id === id), id);
    assert(c, task.mode + ' missing visible control: ' + id); return c;
  };
  const point = (x, y, z = .85) => page.evaluate(({ x, y, z }) => {
    const m = window.__frostPreview.tasks.machine, p = new m.camera.position.constructor(x, y, z).project(m.camera), r = m.canvas.getBoundingClientRect();
    return { x: r.x + (p.x + 1) * r.width / 2, y: r.y + (1 - p.y) * r.height / 2 };
  }, { x, y, z });
  const down = async (p) => { if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] }); else { await page.mouse.move(p.x, p.y); await page.mouse.down(); } };
  const move = async (p) => { if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x, y: p.y, id: 1 }] }); else await page.mouse.move(p.x, p.y); };
  const up = async () => { if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up(); };
  const click = async (id) => { const p = await control(id); if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); };
  const drag = async (id, positions) => { await down(await control(id)); for (const [x, y] of positions) await move(await point(x, y)); await up(); };
  const wait = async (predicate, timeout = 15000) => {
    const deadline = Date.now() + timeout;
    for (;;) { const s = await current(); if (predicate(s) || s.finished) return s; if (Date.now() > deadline) throw Error(task.mode + ' timed out: ' + JSON.stringify(s)); await pause(page, 40); }
  };
  const drive = async (target, mode) => {
    await down(await control('pad'));
    const deadline = Date.now() + 40000;
    for (;;) {
      const s = await current(); if (s.finished) break;
      const [tx, ty] = target(s), gain = mode === 'centrifuge' ? 4 : 2.5;
      const vx = s.vx || 0, vy = s.vy || 0;
      const dx = Math.max(-1, Math.min(1, (tx - s.x) * gain - vx * 1.5));
      const dy = Math.max(-1, Math.min(1, (ty - s.y) * gain - vy * 1.5));
      await move(await point(3.15 + dx * .7, -.9 + dy * .7));
      if (Date.now() > deadline) throw Error(task.mode + ' control timeout: ' + JSON.stringify(s));
      if (mode === 'waypoint' && Math.hypot(tx - s.x, ty - s.y) < .12 && Math.hypot(vx, vy) < .2) break;
      await pause(page, 65);
    }
    await up();
  };
  switch (task.mode) {
    case 'circuit':
      for (const i of [1, 2, 3, 5, 7, 8]) for (let turn = 0; turn < 4; turn++) { const s = await current(); if (s.finished || s.turns[i] === 0) break; await click('tile:' + i); }
      break;
    case 'clocks':
      for (let i = 0; i < 3; i++) for (let retry = 0; retry < 3; retry++) {
        await wait((s) => s.locked[i] || Math.abs(Math.atan2(Math.sin(s.angles[i] - Math.PI / 2), Math.cos(s.angles[i] - Math.PI / 2))) < .13, 16000);
        await click('clock:' + i); if ((await current()).locked?.[i] || (await current()).finished) break;
      }
      break;
    case 'cargo': await drag('cargo:2', [[1, 0]]); break;
    case 'drone': await drive(() => [.65, -.85], 'drone'); break;
    case 'stars': for (let i = 0; i < 5; i++) await click('star:' + i); break;
    case 'defrost': {
      await down(await control('wipe'));
      for (let row = 0; row < 7; row++) { const y = -1.5 + row * .5; await move(await point(row % 2 ? 3 : -3, y)); await move(await point(row % 2 ? -3 : 3, y)); }
      await up(); break;
    }
    case 'triangulate': for (let i = 0; i < 3; i++) await drag('antenna:' + i, [[.65, 1.65]]); break;
    case 'waveform': for (let i = 0; i < 4; i++) { if ((await current()).finished) break; await drag('wave:' + i, [[-2.7 + i * 1.8, .1]]); } break;
    case 'tubing': await drag('tube', [[-2.8, 1.1], [-1.4, .35], [0, 1], [1.3, -.5], [2.8, -1.1]]); break;
    case 'medicine':
      for (let i = 0; i < 3; i++) {
        await down(await control('dose:' + i + '+')); await wait((s) => s.levels[i] >= s.targets[i] - .01); await up();
        for (let retry = 0; retry < 5; retry++) {
          const s = await current(); if (s.finished || Math.abs(s.levels[i] - s.targets[i]) < .035) break;
          const direction = s.levels[i] > s.targets[i] ? '-' : '+';
          await down(await control('dose:' + i + direction)); await pause(page, 90); await up();
        }
      }
      break;
    case 'irrigation':
      for (let i = 0; i < 3; i++) { if ((await current()).finished) break; const s = await current(); if (s.moisture[i] < .6) { await down(await control('bed:' + i)); await wait((s) => s.moisture[i] >= .62); await up(); } }
      break;
    case 'fins': for (const i of [1, 0, 2]) { await click('fin:' + i); await pause(page, 500); } await click('latch'); break;
    case 'core': { const s = await current(); await drag('depth', [[.5, 1.5 - s.target * 3]]); await click('cut'); await drag('extract', [[3.1, 1.5 - s.target * 3]]); break; }
    case 'centrifuge': await drive(() => [0, 0], 'centrifuge'); break;
    case 'sterile':
      for (const target of [[-2.8, 1.1], [-.6, 1.05], [-.6, -1.05], [1.35, -1.05]]) { if ((await current()).finished) break; await drive(() => target, 'waypoint'); }
      break;
    case 'freezer': {
      const deadline = Date.now() + 35000; let held = '';
      while (!(await current()).finished) {
        const s = await current(), predicted = s.temperature + s.rate / 1.8;
        const desired = predicted > -17.95 ? 'cool' : predicted < -18.4 ? 'heat' : '';
        if (desired !== held) { if (held) await up(); if (desired) await down(await control(desired)); held = desired; }
        if (Date.now() > deadline) throw Error('Freezer did not stabilize: ' + JSON.stringify(s)); await pause(page);
      }
      if (held) await up(); break;
    }
    case 'overcurrent': await click('breaker:2'); break;
    case 'battery':
      await click('negative'); await click('positive'); await click('clamp'); await drag('old', [[-3, 0]]); await drag('new', [[0, 0]]);
      await click('rotate'); await click('clamp'); await click('positive'); await click('negative'); break;
    case 'drill': {
      let angle = .5; const p = await point(-.85 + Math.cos(angle), Math.sin(angle)); await down(p);
      for (let i = 0; i < 40; i++) { const s = await current(); if (s.finished) break; angle += s.direction * .18; await move(await point(-.85 + Math.cos(angle), Math.sin(angle))); await pause(page, 40); }
      await up(); break;
    }
    case 'seal': {
      const points = [[-2.8,1.1],[-2.3,.9],[-1.8,.5],[-1.3,.65],[-.8,.15],[-.3,.3],[.2,-.15],[.7,-.45],[1.2,-.35],[1.7,-.85],[2.2,-.7],[2.8,-1.1],[-.8,1.4],[-.8,.95],[-.8,.55],[.5,1.3],[.4,.8],[.3,.35]];
      await down(await control('foam'));
      for (let i = 0; i < points.length; i++) { if ((await current()).finished) break; await move(await point(...points[i])); await wait((s) => s.fill[i] > .9); }
      await up(); break;
    }
    case 'radar': await drag('head', [[-3, 1.37], [3, 1.37]]); { const p = await point(.85, -.5); if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); } break;
    case 'rover': {
      const deadline = Date.now() + 40000; let held = '';
      while (!(await current()).finished) {
        const s = await current(), desired = s.snagged || s.tension > .73 ? 'unwind' : 'wind';
        if (desired !== held) { if (held) await up(); await down(await control(desired)); held = desired; }
        if (Date.now() > deadline) throw Error('Rover did not return: ' + JSON.stringify(s)); await pause(page);
      }
      if (held) await up(); break;
    }
  }
  await wait((s) => s.finished, 6000);
  assert(await page.evaluate((id) => window.__frostPreview.tasks.manager.completed.has(id), task.id), task.mode + ' completion missing');
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const touch of [false, true]) {
      if (process.env.FROST_TASK_QA_TOUCH && String(touch) !== process.env.FROST_TASK_QA_TOUCH) continue;
      const width = touch ? 844 : 1280, height = touch ? 390 : 800;
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: .7, hasTouch: touch, isMobile: touch });
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url); await page.waitForFunction(() => window.__frostPreview?.state().renderedFrames > 0, null, { timeout: 90000 });
      const tasks = await page.evaluate(() => window.__frostPreview.data.tasks.filter((t) => !t.sabotage));
      const touchModes = ['circuit', 'cargo', 'stars', 'defrost', 'waveform', 'tubing', 'medicine', 'core', 'drill', 'radar'];
      for (const task of tasks) {
        if (touch && !touchModes.includes(task.mode)) continue;
        if (process.env.FROST_TASK_QA_MODE && !process.env.FROST_TASK_QA_MODE.split(',').includes(task.mode)) continue;
        await page.selectOption('#taskPicker', task.id);
        await page.waitForFunction((mode) => window.__frostPreview.tasks.machine?.run?.state.mode === mode, task.mode);
        const bounds = await page.locator('#taskModal').boundingBox();
        assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1);
        assert((await page.locator('#taskStage').boundingBox()).height > height * .7);
        await page.screenshot({ path: path.join(out, `${width}-${task.mode}.png`) });
        try { await play(page, task, touch); }
        catch (error) { await page.screenshot({ path: path.join(out, `${width}-${task.mode}-failure.png`) }); throw error; }
        console.log('PASS', touch ? 'touch' : 'mouse', task.mode);
        results.push({ mode: task.mode, touch, completed: true });
        fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
        await page.evaluate(() => window.__frostPreview.tasks.close());
        assert.equal(await page.locator('canvas').count(), 1, 'Terminal retained a WebGL canvas');
      }
      // Closing a held dose must stop it, and reopening must start a new run.
      await page.selectOption('#taskPicker', 'medical-medicine');
      const dose = await page.evaluate(() => window.__frostPreview.taskControls().find((c) => c.id === 'dose:0+'));
      await page.mouse.move(dose.x, dose.y); await page.mouse.down();
      await page.evaluate(() => window.__frostPreview.tasks.close()); await page.mouse.up();
      await page.selectOption('#taskPicker', 'medical-medicine');
      assert.deepEqual(await page.evaluate(() => window.__frostPreview.tasks.manager.state().levels), [0, 0, 0]);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#taskModal').evaluate((m) => m.open), false);
      assert.deepEqual(errors, []); await page.close();
    }
  } finally { await browser.close(); }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
})().catch((error) => { console.error(error); process.exitCode = 1; });
