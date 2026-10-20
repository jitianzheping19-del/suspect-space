// Geometry, automatic-door collision, real WebGL, keyboard and multitouch QA.
// Start `npm run build && npx vite preview --host 127.0.0.1 --port 4173` first.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.FROST_QA_OUT || path.join(root, 'tmp/frost-walls');
const url = process.env.FROST_QA_URL || 'http://127.0.0.1:4173/suspect-space/frost-walls-preview.html';
fs.mkdirSync(out, { recursive: true });

async function testNavigation() {
  const { createFrostNavigation, pointInPolygon } = await import(pathToFileURL(path.join(root, 'frost-navigation.js')));
  const data = JSON.parse(fs.readFileSync(path.join(root, 'frost-map-data.json'), 'utf8'));
  let traversals = 0;
  for (const route of data.routes) {
    for (const reverse of [false, true]) {
      const points = reverse ? [...route.points].reverse() : route.points;
      const nav = createFrostNavigation(data);
      const position = { x: points[0][0], z: -points[0][1] };
      assert(nav.canStand(position.x, position.z), 'Invalid route start: ' + route.id);
      for (const [x, y] of points.slice(1)) {
        let frames = 0;
        while (Math.hypot(x - position.x, -y - position.z) > 0.025 && frames < 3000) {
          nav.updateDoors(position, 1 / 60);
          const dx = x - position.x, dz = -y - position.z;
          const distance = Math.hypot(dx, dz), step = Math.min(distance, 4.4 / 60);
          nav.move(position, dx / distance * step, dz / distance * step);
          assert(pointInPolygon(position.x, -position.z, data.navigation), 'Walker escaped floor');
          frames++;
        }
        assert(frames < 3000, 'Blocked route: ' + route.id);
      }
      traversals++;
    }
  }
  const closed = createFrostNavigation(data);
  assert(!closed.canStand(1, -6), 'Closed door did not block the walker');
  const stopped = { x: 1, z: -4 };
  closed.move(stopped, 0, -4);
  assert(stopped.z > -5.55 && stopped.z < -5.2, 'Walker crossed a closed door');
  const wall = { x: 0, z: -3 };
  closed.move(wall, 20, 0);
  assert(wall.x > 6 && wall.x < 6.55, 'Long movement crossed a wall');
  assert(!closed.canStand(-8, -5), 'Courtyard hole became walkable');
  assert(!closed.canStand(0, 0), 'Meeting pedestal is not solid');
  let furnitureProbes = 0;
  for (const prop of data.props) {
    assert(!closed.canStand(prop.position[0], -prop.position[1]), 'Furniture is not solid: ' + prop.id);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const halfSize = dx ? prop.width / 2 : prop.depth / 2;
      const start = { x: prop.position[0] + dx * (halfSize + 1), z: -prop.position[1] + dz * (halfSize + 1) };
      if (!closed.canStand(start.x, start.z)) continue;
      closed.move(start, -dx * (halfSize + 2), -dz * (halfSize + 2));
      assert(dx ? Math.abs(start.x - prop.position[0]) > prop.width / 2 : Math.abs(start.z + prop.position[1]) > prop.depth / 2,
        'Movement crossed furniture: ' + prop.id);
      furnitureProbes++;
    }
  }
  assert(furnitureProbes >= data.props.length, 'Furniture collision did not get enough approach probes');
  for (const task of data.tasks) assert(closed.canStand(task.approach[0], -task.approach[1]), 'Task approach blocked: ' + task.id);
  for (const vent of data.vents) assert(closed.canStand(vent.exit[0], -vent.exit[1]), 'Vent exit blocked: ' + vent.id);
  console.log('PASS', traversals, 'route traversals, closed door, wall and courtyard collision');
  return { traversals, rooms: data.rooms.length, doors: data.doors.length, props: data.props.length, furnitureProbes };
}

async function testBrowser() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [width, height, touch] of [[1440, 1000, false], [1024, 768, true], [844, 390, true]]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch });
      const errors = [], requests = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('request', (request) => requests.push(request.url()));
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__frostPreview?.state().renderedFrames > 0, { timeout: 60000 });
      await page.screenshot({ path: path.join(out, `${width}-overview.png`) });
      const original = await page.evaluate(() => window.__frostPreview.state());
      assert(original.calls < 100 && original.triangles < 100000, 'Unexpectedly expensive furnished map');

      for (const view of ['真上', '全体', '歩く']) {
        await page.getByRole('button', { name: view, exact: true }).click();
        await page.waitForTimeout(80);
        assert.equal(await page.getByRole('button', { name: view, exact: true }).getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('[data-view][aria-pressed="true"]').count(), 1);
        const bounds = await page.evaluate(() => {
          const rect = document.querySelector('#stage canvas').getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            overflow: document.documentElement.scrollWidth > innerWidth };
        });
        assert.deepEqual(bounds, { x: 0, y: 0, width, height, overflow: false });
        if (view === '真上') await page.screenshot({ path: path.join(out, `${width}-top.png`) });
      }

      if (!touch) {
        // Probe the rendered door leaves, not just the navigation polygon.
        const closedHits = await page.evaluate(() => window.__frostPreview.obstruction([0.75, 1.3, -5.2], [0.75, 1.3, -6.8]));
        assert(closedHits.some((hit) => hit.name === 'Sliding door leaves'), 'Rendered closed door missing');
        let testedDoors = 0;
        const ids = process.env.FROST_QA_SKIP_DOOR_MESH ? []
          : await page.evaluate(() => window.__frostPreview.data.doors.map((door) => door.id));
        for (const id of ids) {
          const positioned = await page.evaluate((id) => {
            const api = window.__frostPreview;
            const door = api.navigation.doors.find((item) => item.id === id);
            for (const side of [1, -1]) {
              if (api.setPose(door.x + door.nx * side, door.z + door.nz * side)) return true;
            }
            return false;
          }, id);
          assert(positioned, 'Cannot approach door: ' + id);
          await page.waitForFunction((id) => window.__frostPreview.navigation.doors.find((door) => door.id === id).open > 0.995, id);
          const hits = await page.evaluate((id) => {
            const api = window.__frostPreview;
            const door = api.navigation.doors.find((item) => item.id === id);
            const x = door.x + door.tx * 0.25, z = door.z + door.tz * 0.25;
            return api.obstruction([x + door.nx * 0.8, 1.3, z + door.nz * 0.8],
              [x - door.nx * 0.8, 1.3, z - door.nz * 0.8]);
          }, id);
          assert.deepEqual(hits, [], 'Mesh obstructs open door: ' + id);
          testedDoors++;
          if (testedDoors % 10 === 0) console.log('PASS rendered door openings:', testedDoors);
        }
        await page.evaluate(() => window.__frostPreview.teleport('dome'));
        await page.keyboard.down('KeyW');
        await page.waitForFunction(() => window.__frostPreview.state().walker.z < -1);
        await page.keyboard.up('KeyW');
        let state = await page.evaluate(() => window.__frostPreview.state());
        assert(state.walker.z < -1 && state.walker.z > -5.8, 'Keyboard movement failed');
        await page.screenshot({ path: path.join(out, `${width}-walk.png`) });
        const yaw = state.walker.yaw;
        await page.mouse.move(width * 0.65, height * 0.6);
        await page.mouse.down();
        await page.mouse.move(width * 0.65 + 80, height * 0.6 - 20, { steps: 6 });
        await page.mouse.up();
        state = await page.evaluate(() => window.__frostPreview.state());
        assert(Math.abs(state.walker.yaw - yaw) > 0.2, 'Drag look failed');

        await page.evaluate(() => { window.__frostPreview.setMode('overview'); window.__frostPreview.loseContext(); });
        await page.waitForFunction(() => window.__frostPreview.state().contextLost);
        await page.waitForTimeout(400);
        await page.evaluate(() => window.__frostPreview.restoreContext());
        await page.waitForFunction((geometries) => !window.__frostPreview.state().contextLost
          && document.querySelector('#status').hidden
          && window.__frostPreview.state().memory.geometries === geometries, original.memory.geometries);
        assert.deepEqual((await page.evaluate(() => window.__frostPreview.state())).memory, original.memory);
        console.log('PASS', testedDoors, 'rendered door openings, keyboard, look and WebGL recovery');
      } else {
        await page.evaluate(() => window.__frostPreview.teleport('dome'));
        const rect = await page.locator('#joystick').boundingBox();
        assert(rect && rect.y >= 0 && rect.x >= 0 && rect.y + rect.height <= height, 'Joystick outside viewport');
        const cdp = await page.context().newCDPSession(page);
        const one = { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height * 0.22 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [one] });
        await page.waitForFunction(() => window.__frostPreview.state().walker.z < -0.3);
        const beforeLook = await page.evaluate(() => window.__frostPreview.state());
        assert(beforeLook.stick.y < -0.5 && beforeLook.walker.z < -0.3, 'Touch movement failed');
        const two = { id: 2, x: width * 0.66, y: height * 0.56 };
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [one, two] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [one, { ...two, x: two.x - 50 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ ...two, x: two.x - 50 }] });
        const afterLook = await page.evaluate(() => window.__frostPreview.state());
        assert(afterLook.stick.y < -0.5, 'Look gesture cancelled held joystick');
        assert(Math.abs(afterLook.walker.yaw - beforeLook.walker.yaw) > 0.1, 'Multitouch look failed');
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await cdp.detach();
        assert.equal((await page.evaluate(() => window.__frostPreview.state())).stick.y, 0);
        await page.screenshot({ path: path.join(out, `${width}-walk.png`) });
      }

      assert(await page.evaluate(() => window.__frostPreview.approachMeeting()));
      const meetingButton = page.getByRole('button', { name: '会議', exact: true });
      if (touch) await meetingButton.tap(); else await meetingButton.click();
      assert.equal(await page.evaluate(() => window.__frostPreview.state().meetingPressCount), 1);
      assert.equal(await page.evaluate(() => window.__frostPreview.data.vents.length), 10, 'Approved vent count changed');
      await page.getByRole('button', { name: '全体', exact: true }).click();
      const framing = await page.evaluate(() => {
        const api = window.__frostPreview;
        return api.data.floor.outline.map(([x, y]) => api.project(x, 3.3, -y));
      });
      assert(framing.every((point) => point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height), 'Map clipped by viewport');
      const beforeResize = await page.evaluate(() => window.__frostPreview.state().memory);
      await page.setViewportSize({ width: width - 64, height: height - 20 });
      await page.waitForTimeout(100);
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(150);
      assert.deepEqual((await page.evaluate(() => window.__frostPreview.state())).memory, beforeResize, 'Resize leaked resources');
      assert(!requests.some((request) => /firebase|skyway|firebasedatabase/.test(request)), 'Preview loaded multiplayer services');
      assert.deepEqual(errors, [], 'Browser errors');
      results.push({ width, height, touch, calls: original.calls, triangles: original.triangles, errors });
      console.log('PASS', `${width}×${height}`, touch ? 'layout and multitouch' : 'layout and mouse/keyboard');
      await page.close();
    }
  } finally { await browser.close(); }
  return results;
}

(async () => {
  const geometry = await testNavigation();
  const browser = await testBrowser();
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ geometry, browser }, null, 2) + '\n');
})().catch((error) => { console.error(error); process.exitCode = 1; });
