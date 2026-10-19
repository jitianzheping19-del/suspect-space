const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url'), { chromium } = require('playwright');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..'), out = process.env.FROST_QA_OUT || path.join(root, 'tmp/frost-emergencies');
const url = process.env.FROST_QA_URL || 'http://127.0.0.1:4173/suspect-space/frost-walls-preview.html';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const { createFrostTaskState } = await import(pathToFileURL(path.join(root, 'frost-task-state.js')));
  const data = JSON.parse(fs.readFileSync(path.join(root, 'frost-map-data.json')));
  let time = 0;
  const manager = createFrostTaskState(data.tasks, () => {}, () => time);
  for (const type of ['oxygen', 'lights', 'reactor', 'comms']) {
    manager.activate(type);
    for (const task of data.tasks.filter((t) => t.sabotage === type)) {
      manager.open(task.id);
      if (type === 'oxygen') { assert.equal(manager.action(12), false); for (const digit of manager.state().code) manager.action(Number(digit)); manager.action(12); }
      else if (type === 'reactor') { manager.action(0); assert(!manager.state().finished); time += 1001; manager.tick(); }
      else if (type === 'comms') { assert.equal(manager.action(0), false); manager.setValue(manager.state().target); manager.action(0); }
      else manager.action(0);
      assert(manager.state().finished, task.id);
    }
    assert.equal(manager.sabotage, null, type);
  }
  manager.activate('oxygen'); manager.open('oxygen-habitat'); time += 90001; manager.tick();
  assert(manager.sabotage.failed && !manager.action(12), 'Expired repair accepted');
  console.log('PASS 9 emergency panels, all 4 incident types and timeout');
  // Verify that the actual multiplayer repair rules accept the new panel IDs
  // and retain the required two-person reactor interlock.
  const html = fs.readFileSync(path.join(root, 'space-suspect-complete.html'), 'utf8');
  const source = html.slice(html.indexOf('function repairSabotage('), html.indexOf('const BOT_PERSONALITIES='));
  const repair = vm.runInNewContext(source + '\nrepairSabotage', {
    EMERGENCY_PANELS: data.tasks.filter((t) => t.sabotage).map((t) => ({ ...t, room: t.sabotage })),
    token: () => 'qa-repair', startSabotageCooldown(g, stamp) { g.sabotageReadyAt = stamp + 30000; },
  });
  for (const type of ['oxygen', 'lights', 'reactor', 'comms']) {
    const g = { sabotage: { type, endsAt: 100000, panels: {}, switches: {}, hands: {} } };
    const panels = data.tasks.filter((t) => t.sabotage === type).map((t) => ({ ...t, room: type }));
    if (type === 'reactor') {
      repair(g, panels[0], 'crew-a', 100); repair(g, panels[1], 'crew-a', 101);
      assert(g.sabotage, 'A single player bypassed the reactor interlock');
      repair(g, panels[1], 'crew-b', 102);
    } else {
      for (let i = 0; i < panels.length; i++) {
        repair(g, panels[i], 'crew-a', 100 + i);
        if (i < panels.length - 1) assert(g.sabotage, 'Incident cleared before all panels: ' + type);
      }
    }
    assert.equal(g.sabotage, undefined, type + ' host repair failed');
    assert(g.sabotageReadyAt > 100);
  }
  console.log('PASS host repair IDs, all-panel requirements and two-player reactor validation');
  if (process.env.FROST_EMERGENCY_RULES_ONLY) return;
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: .7 });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url); await page.waitForFunction(() => window.__frostPreview, null, { timeout: 90000 });
    for (const type of ['oxygen', 'lights', 'reactor', 'comms']) {
      await page.selectOption('#sabotageType', type);
      for (const task of data.tasks.filter((t) => t.sabotage === type)) {
        assert(await page.evaluate((id) => window.__frostPreview.tasks.open(id), task.id));
        await page.screenshot({ path: path.join(out, task.id + '.png') });
        if (type === 'oxygen') { const code = await page.evaluate(() => window.__frostPreview.tasks.manager.state().code); await page.keyboard.type(code); await page.keyboard.press('Enter'); }
        else if (type === 'comms') {
          for (let i = 0; i < 100; i++) {
            const s = await page.evaluate(() => { const s = window.__frostPreview.tasks.manager.state(); return { target: s.target, value: s.value }; });
            const delta = s.target - s.value; if (Math.abs(delta) <= 2) break;
            await page.keyboard.press((Math.abs(delta) >= 5 ? 'Shift+' : '') + (delta > 0 ? 'ArrowRight' : 'ArrowLeft'));
          }
          await page.keyboard.press('Enter');
        } else {
          const control = await page.evaluate(() => window.__frostPreview.taskControls().find((c) => c.index === 0));
          await page.touchscreen.tap(control.x, control.y);
        }
        await page.waitForFunction((id) => { const m = window.__frostPreview.tasks.manager; return !m.sabotage || m.sabotage.panels.has(id); }, task.id);
        await page.evaluate(() => window.__frostPreview.tasks.close());
      }
      console.log('PASS rendered emergency:', type);
    }
    await page.evaluate(() => { const a = window.__frostPreview; a.tasks.activate('comms'); a.tasks.open('comms-repair'); a.tasks.close(); });
    assert.equal(await page.locator('#taskModal').evaluate((m) => m.open), false, 'Closed async terminal reopened');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ panels: 9, types: 4, errors }, null, 2));
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
