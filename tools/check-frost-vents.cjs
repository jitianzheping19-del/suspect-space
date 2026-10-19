// Vent graph, animation isolation, real desktop/iPad/phone interactions.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.FROST_QA_OUT || path.join(root, 'tmp/frost-vents');
const url = process.env.FROST_QA_URL || 'http://127.0.0.1:4173/suspect-space/frost-walls-preview.html';
fs.mkdirSync(out, { recursive: true });

async function testSimulation() {
  const { createFrostVentState, FROST_VENT_TIMING: duration } = await import(pathToFileURL(path.join(root, 'frost-vent-state.js')));
  const { createFrostNavigation, pointInPolygon } = await import(pathToFileURL(path.join(root, 'frost-navigation.js')));
  const data = JSON.parse(fs.readFileSync(path.join(root, 'frost-map-data.json'), 'utf8'));
  const source = JSON.parse(fs.readFileSync(path.join(root, 'assets-source/frost-vent-layout-v1.json'), 'utf8'));
  assert.equal(source.status, 'approved');
  assert.equal(data.vents.length, 10);
  assert.equal(new Set(data.vents.map((vent) => vent.network)).size, 3);
  assert(!data.vents.some((vent) => vent.roomId === 'dome'));
  const nav = createFrostNavigation(data);
  const state = createFrostVentState(data.vents);
  let time = 1000, entries = 0, exits = 0, traversals = 0;
  function animate(phase, lid) {
    let opened = false;
    for (let i = 0; i < 60; i++) {
      state.update(time + duration[phase] * i / 60);
      assert.equal(state.phase, phase);
      assert.equal(state.hidden, true, 'Vented player became visible');
      const open = state.snapshot().lids.filter((item) => item.angle > 0);
      opened ||= open.length > 0;
      if (lid) assert(open.every((item) => item.id === lid), 'Animation leaked into another vent');
      else assert.equal(open.length, 0, 'Travel opened a hatch');
      assert(open.length <= 1);
    }
    time += duration[phase];
    assert(state.update(time));
    assert(state.snapshot().lids.every((item) => item.angle === 0), 'Lid stayed open');
    if (lid) assert(opened, 'Hatch never animated');
    time += 50;
  }
  for (const vent of data.vents) {
    assert(nav.canStand(vent.exit[0], -vent.exit[1]), 'Blocked exit: ' + vent.id);
    assert(pointInPolygon(...vent.position, data.navigation), 'Grate must stay walkable');
    assert(!pointInPolygon(...vent.position, data.renderFloor), 'Floor still covers the vent shaft');
    const walker = { x: vent.exit[0], z: -vent.exit[1] };
    assert(state.enter(vent.id, walker, time)); entries++;
    assert(!state.enter(vent.id, walker, time));
    assert(!state.travel(vent.links[0], time));
    assert(!state.exit(time));
    animate('entering', vent.id);
    assert.equal(state.phase, 'inside');
    assert(!state.enter(vent.id, walker, time));
    assert(!state.travel(vent.id, time));
    assert(!state.travel('missing', time));
    for (const other of data.vents.filter((item) => !vent.links.includes(item.id))) {
      assert(!state.travel(other.id, time), 'Unlinked shortcut permitted');
    }
    assert(state.exit(time));
    assert(!state.exit(time));
    assert(!state.travel(vent.links[0], time));
    animate('exiting', vent.id); exits++;
    assert.equal(state.hidden, false);
    assert.deepEqual(state.pose, { x: vent.exit[0], z: -vent.exit[1], height: 1.65 });
  }
  for (const vent of data.vents) {
    for (const destination of vent.links) {
      assert(state.enter(vent.id, { x: vent.exit[0], z: -vent.exit[1] }, time));
      animate('entering', vent.id);
      assert(state.travel(destination, time));
      assert(!state.travel(vent.id, time));
      assert(!state.exit(time));
      animate('traveling', null); traversals++;
      assert.equal(state.activeId, destination);
      const target = data.vents.find((item) => item.id === destination);
      assert.deepEqual(state.pose, { x: target.position[0], z: -target.position[1], height: -.7 });
      assert(state.exit(time));
      animate('exiting', destination);
      assert.equal(state.hidden, false);
      assert.deepEqual(state.pose, { x: target.exit[0], z: -target.exit[1], height: 1.65 });
    }
  }
  assert.equal(traversals, 14);
  assert(!state.enter('missing', { x: 0, z: 0 }, time));
  assert(!state.enter('A1', { x: NaN, z: 0 }, time));
  state.enter('A1', { x: -20, z: -16.1 }, time);
  state.update(time + 180);
  state.reset();
  assert.equal(state.vented, false);
  assert(state.snapshot().lids.every((item) => item.angle === 0));
  console.log('PASS simulation:', entries, 'entries,', exits, 'exits,', traversals, 'directed links; isolated lids and hidden player');
  return { entries, exits, traversals };
}

async function testBrowser() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [width, height, touch, chain] of [
      [1440, 1000, false, ['A1', 'A2', 'A3']],
      [1024, 768, true, ['B1', 'B2', 'B3']],
      [844, 390, true, ['C1', 'C2', 'C3', 'C4']],
    ]) {
      if (process.env.FROST_QA_WIDTH && width !== Number(process.env.FROST_QA_WIDTH)) continue;
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch });
      const errors = [], requests = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', (request) => requests.push(request.url()));
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__frostPreview?.state().renderedFrames > 0, null, { timeout: 60000 });
      assert.equal(await page.evaluate(() => window.__frostPreview.data.vents.length), 10);
      await page.screenshot({ path: path.join(out, `${width}-vents-overview.png`) });
      assert(await page.evaluate((id) => window.__frostPreview.approachVent(id), chain[0]));
      const enter = page.getByRole('button', { name: 'ベント', exact: true });
      await enter.waitFor({ state: 'visible' });
      await page.screenshot({ path: path.join(out, `${width}-vent-approach.png`) });
      if (touch) await enter.tap(); else await enter.click();
      await page.waitForFunction(() => window.__frostPreview.state().vent.phase === 'inside');
      const first = await page.evaluate(() => window.__frostPreview.state());
      assert.equal(first.vent.activeId, chain[0]);
      assert(first.vent.playerHidden && first.cameraHeight < 0);
      assert.equal(await page.locator('#taskAction').isVisible(), false);
      assert.equal(await page.locator('#joystick').isVisible(), false);
      assert(first.vent.lids.every((item) => item.angle === 0));
      let rect = await page.locator('#ventPanel').boundingBox();
      assert(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height);
      if (height < 500) assert(rect.width <= 264 && rect.height <= 145, 'Phone vent UI too large');
      await page.screenshot({ path: path.join(out, `${width}-vent-inside.png`) });
      for (const id of chain.slice(1)) {
        const target = page.locator(`#ventDestinations button[data-vent-id="${id}"]`);
        if (touch) await target.tap(); else await target.click();
        await page.waitForFunction((id) => {
          const s = window.__frostPreview.state().vent;
          return s.phase === 'inside' && s.activeId === id;
        }, id);
        const state = await page.evaluate(() => window.__frostPreview.state());
        assert(state.vent.playerHidden);
        assert(state.vent.lids.every((item) => item.angle === 0));
        const next = await page.locator('#ventPanel').boundingBox();
        assert.deepEqual(next, rect, 'Vent panel moved or resized during travel');
      }
      await page.screenshot({ path: path.join(out, `${width}-vent-destination.png`) });
      if (!touch) await page.keyboard.press('KeyF'); else await page.getByRole('button', { name: '出る', exact: true }).tap();
      await page.waitForFunction(() => window.__frostPreview.state().vent.phase === 'outside');
      const last = await page.evaluate(() => {
        const api = window.__frostPreview, state = api.state();
        return { ...state, canStand: api.navigation.canStand(state.walker.x, state.walker.z) };
      });
      assert(last.canStand && !last.vent.playerHidden && last.cameraHeight === 1.65);
      assert.equal(await page.locator('#ventPanel').isVisible(), false);
      if (touch) assert.equal(await page.locator('#joystick').isVisible(), true);
      await page.screenshot({ path: path.join(out, `${width}-vent-exit.png`) });
      const beforeMove = last.walker;
      if (touch) {
        const cdp = await page.context().newCDPSession(page);
        const stick = await page.locator('#joystick').boundingBox();
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
          { x: stick.x + stick.width / 2, y: stick.y + stick.height * .2, id: 1 },
        ] });
        await page.waitForFunction((start) => Math.hypot(window.__frostPreview.state().walker.x - start.x,
          window.__frostPreview.state().walker.z - start.z) > .3, beforeMove);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
      } else {
        await page.keyboard.down('KeyW');
        await page.waitForFunction((start) => Math.hypot(window.__frostPreview.state().walker.x - start.x,
          window.__frostPreview.state().walker.z - start.z) > .3, beforeMove);
        await page.keyboard.up('KeyW');
      }

      // Switching preview views/rooms while inside resets the old hatch once.
      await page.evaluate((id) => window.__frostPreview.approachVent(id), chain[0]);
      if (touch) {
        const point = await page.evaluate((id) => {
          const api = window.__frostPreview, vent = api.data.vents.find((item) => item.id === id);
          return api.project(vent.position[0], .08, -vent.position[1]);
        }, chain[0]);
        await page.touchscreen.tap(point.x, point.y);
      } else await page.keyboard.press('KeyF');
      await page.waitForFunction(() => window.__frostPreview.state().vent.phase === 'inside');
      await page.selectOption('#roomPicker', 'dome');
      assert.equal(await page.evaluate(() => window.__frostPreview.state().vent.phase), 'outside');
      assert.equal(await page.locator('#ventPanel').isVisible(), false);
      assert(await page.evaluate(() => window.__frostPreview.navigation.canStand(window.__frostPreview.state().walker.x, window.__frostPreview.state().walker.z)));

      assert(!requests.some((url) => /firebasedatabase|firebaseio|skyway/.test(url)), 'Preview touched live multiplayer services');
      assert.deepEqual(errors, []);
      results.push({ width, height, touch, chain, panel: rect, calls: first.calls, triangles: first.triangles, errors });
      console.log('PASS WebGL vents:', width, height, chain.join(' → '));
      await page.close();
    }
  } finally { await browser.close(); }
  return results;
}

(async () => {
  const simulation = await testSimulation();
  const browser = process.env.FROST_QA_SIMULATION_ONLY ? [] : await testBrowser();
  fs.writeFileSync(path.join(out, 'vents-results.json'), JSON.stringify({ simulation, browser }, null, 2) + '\n');
})().catch((error) => { console.error(error); process.exitCode = 1; });
