const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.FROST_QA_OUT || path.join(root, 'tmp/frost-walls');
const url = process.env.FROST_QA_URL || 'http://127.0.0.1:4173/suspect-space/frost-walls-preview.html';
fs.mkdirSync(out, { recursive: true });

async function rules() {
  const { createFrostTaskState } = await import(pathToFileURL(path.join(root, 'frost-task-state.js')));
  const data = JSON.parse(fs.readFileSync(path.join(root, 'frost-map-data.json'), 'utf8'));
  let time = 0;
  const manager = createFrostTaskState(data.tasks, () => {}, () => time);
  for (const task of data.tasks.filter((task) => !task.sabotage)) {
    manager.open(task.id);
    switch (task.mode) {
      case 'filter': case 'shields':
        manager.action(0); manager.action(0);
        assert.equal(manager.state().done, 1, 'Repeated action counted twice');
        for (let i = 1; i < 6; i++) manager.action(i);
        break;
      case 'sample':
        assert.equal(manager.action((manager.state().target + 1) % 4), false);
        for (let i = 0; i < 3; i++) manager.action(manager.state().target);
        break;
      case 'engine':
        assert.equal(manager.action(0), false);
        for (let i = 0; i < 3; i++) { manager.setValue(manager.state().target); manager.action(0); }
        break;
      case 'convert':
        assert.equal(manager.action(0), false); manager.setValue(100); manager.action(0); break;
      case 'sort':
        assert.equal(manager.action(1), false);
        for (let i = 0; i < 6; i++) manager.action(i % 2);
        break;
      case 'upload':
        manager.action(0); time += 5001; manager.tick(); break;
    }
    assert(manager.state().finished && manager.completed.has(task.id), task.id);
  }
  for (const type of ['oxygen', 'lights', 'reactor', 'comms']) {
    manager.activate(type);
    for (const task of data.tasks.filter((task) => task.sabotage === type)) {
      manager.open(task.id);
      if (type === 'oxygen') {
        assert.equal(manager.action(12), false);
        for (const digit of manager.state().code) manager.action(Number(digit));
        manager.action(12);
      } else if (type === 'reactor') {
        manager.action(0); time += 1001; manager.tick();
      } else if (type === 'comms') {
        assert.equal(manager.action(0), false); manager.setValue(manager.state().target); manager.action(0);
      } else manager.action(0);
      assert(manager.state().finished, task.id);
    }
    assert.equal(manager.sabotage, null, type + ' remained active');
  }
  manager.activate('oxygen'); manager.open('oxygen-habitat'); time += 90001; manager.tick();
  assert(manager.sabotage.failed && !manager.action(12), 'Expired emergency accepted input');
  console.log('PASS 22 normal tasks, 9 emergency panels, invalid input and timeout');
}

async function press(page, index) {
  const control = await page.evaluate((index) => window.__frostPreview.taskControls().find((control) => control.index === index), index);
  assert(control, 'Missing task control ' + index);
  await page.mouse.click(control.x, control.y);
}

async function dial(page, target) {
  for (let i = 0; i < 110; i++) {
    const value = await page.evaluate(() => window.__frostPreview.tasks.manager.state().value);
    const diff = target - value;
    if (Math.abs(diff) <= 1) return;
    await page.keyboard.press((Math.abs(diff) >= 5 ? 'Shift+' : '') + (diff > 0 ? 'ArrowRight' : 'ArrowLeft'));
  }
  assert.fail('Dial did not reach target');
}

(async () => {
  await rules();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url);
    await page.waitForFunction(() => window.__frostPreview?.state().renderedFrames > 0);
    const types = await page.evaluate(() => [...new Map(window.__frostPreview.data.tasks.filter((task) => !task.sabotage).map((task) => [task.mode, task.id]))]);
    for (const [mode, id] of types) {
      assert(await page.evaluate((id) => window.__frostPreview.tasks.open(id), id));
      if (['filter', 'shields'].includes(mode)) for (let i = 0; i < 6; i++) await press(page, i);
      if (mode === 'sample') for (let i = 0; i < 3; i++) {
        await press(page, await page.evaluate(() => window.__frostPreview.tasks.manager.state().target));
      }
      if (mode === 'engine') for (let i = 0; i < 3; i++) {
        await dial(page, await page.evaluate(() => window.__frostPreview.tasks.manager.state().target));
        await page.keyboard.press('Enter');
      }
      if (mode === 'convert') { await dial(page, 100); await page.keyboard.press('Enter'); }
      if (mode === 'sort') for (let i = 0; i < 6; i++) await press(page, i % 2);
      if (mode === 'upload') await press(page, 0);
      await page.waitForFunction((id) => window.__frostPreview.tasks.manager.completed.has(id), id);
      await page.evaluate(() => window.__frostPreview.tasks.close());
      assert.equal(await page.locator('canvas').count(), 1, 'Closed task retained a canvas');
      console.log('PASS rendered task:', mode);
    }
    for (const type of ['oxygen', 'lights', 'reactor', 'comms']) {
      await page.selectOption('#sabotageType', type);
      const panels = await page.evaluate((type) => window.__frostPreview.data.tasks.filter((task) => task.sabotage === type).map((task) => task.id), type);
      for (const id of panels) {
        await page.evaluate((id) => window.__frostPreview.tasks.open(id), id);
        if (type === 'oxygen') {
          const code = await page.evaluate(() => window.__frostPreview.tasks.manager.state().code);
          await page.keyboard.type(code === '000000' ? '111111' : '000000'); await page.keyboard.press('Enter');
          assert(await page.evaluate(() => window.__frostPreview.tasks.manager.state().error));
          await page.keyboard.press('Delete'); await page.keyboard.type(code); await page.keyboard.press('Enter');
        } else if (type === 'comms') {
          await dial(page, await page.evaluate(() => window.__frostPreview.tasks.manager.state().target));
          await page.keyboard.press('Enter');
        } else await press(page, 0);
        await page.waitForFunction(() => window.__frostPreview.tasks.manager.state()?.finished);
        await page.evaluate(() => window.__frostPreview.tasks.close());
      }
      assert(await page.evaluate(() => window.__frostPreview.tasks.manager.sabotage === null), type);
      console.log('PASS rendered emergency:', type);
    }
    await page.evaluate(() => window.__frostPreview.approachTask('laboratory-core'));
    await page.waitForFunction(() => !document.querySelector('#taskAction').hidden);
    await page.getByRole('button', { name: '使用', exact: true }).click();
    await page.waitForFunction(() => !!window.__frostPreview.tasks.machine);
    await page.screenshot({ path: path.join(out, 'task-desktop-final.png') });
    await page.getByRole('button', { name: '閉じる', exact: true }).click();
    await page.evaluate(() => { const api = window.__frostPreview; api.tasks.open('dome-sync'); api.tasks.close(); });
    assert.equal(await page.locator('#taskModal').evaluate((modal) => modal.open), false, 'Cancelled async open revived a dialog');
    assert.deepEqual(errors, []);
    await page.close();

    const phone = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    await phone.goto(url);
    await phone.waitForFunction(() => window.__frostPreview?.state().renderedFrames > 0);
    await phone.evaluate(() => window.__frostPreview.approachTask('medical-sample'));
    await phone.waitForFunction(() => !document.querySelector('#taskAction').hidden);
    await phone.getByRole('button', { name: '使用', exact: true }).tap();
    await phone.waitForFunction(() => !!window.__frostPreview.tasks.machine);
    await phone.screenshot({ path: path.join(out, 'task-phone-final.png') });
    const bounds = await phone.locator('#taskModal').boundingBox();
    assert(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= 844 && bounds.y + bounds.height <= 390);
    for (let i = 0; i < 3; i++) {
      const control = await phone.evaluate(() => {
        const api = window.__frostPreview;
        return api.taskControls().find((control) => control.index === api.tasks.manager.state().target);
      });
      await phone.touchscreen.tap(control.x, control.y);
    }
    assert(await phone.evaluate(() => window.__frostPreview.tasks.manager.completed.has('medical-sample')));
    await phone.close();
    console.log('PASS desktop use, cancellation, phone bounds and touch task completion');
    fs.writeFileSync(path.join(out, 'tasks-results.json'), JSON.stringify({ normal: 22, emergency: 9, renderedTypes: 7, renderedEmergencyTypes: 4, desktop: true, phone: true, errors }, null, 2) + '\n');
  } finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
