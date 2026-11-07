// Exercise the published bundle without connecting an account or online room.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve('dist');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const relative = url.pathname.replace(/^\/suspect-space\//, '');
    const file = path.resolve(root, relative || 'index.html');
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end(); return;
    }
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
    const errors = [], missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) missing.push(response.url()); });
    await page.addInitScript(() => { try { sessionStorage.setItem('space-suspect-skip-autologin-once', '1'); } catch {} });
    await page.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (request.method() !== 'GET') return route.abort();
      if (url.origin === base) return route.continue();
      if (/^https:\/\/(cdn.jsdelivr.net\/npm|unpkg.com)\/three@0.164.1\//.test(url.href)) {
        return route.fulfill({ path: path.resolve('node_modules/three', url.pathname.split('three@0.164.1/')[1]), contentType: 'application/javascript' });
      }
      if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/') && url.pathname.endsWith('.js')) return route.continue();
      return route.abort();
    });
    await page.routeWebSocket('**/*', socket => socket.close());
    await page.goto(base + '/suspect-space/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.getElementById('setupMessage')?.textContent === '4桁PINを入力してください。', null, { timeout: 45000 });
    assert(await page.locator('#nameGate').isVisible());
    assert(await page.locator('#loginInlineError').isHidden(), 'untouched login has no validation error');
    assert.equal(await page.locator('#loginInlineError').textContent(), '');
    await page.locator('#loginBtn').tap();
    assert(await page.locator('#loginInlineError').isVisible());
    assert.match(await page.locator('#loginInlineError').textContent(), /4桁/);
    for (const digit of ['1', '2', '3']) await page.locator('#pinPad [data-pin="' + digit + '"]').tap();
    assert.equal(await page.locator('#loginPinInput').inputValue(), '123');
    assert(await page.locator('#loginInlineError').isHidden(), 'editing dismisses the previous validation error');
    await page.locator('#loginBtn').tap();
    assert(await page.locator('#loginInlineError').isVisible(), 'incomplete manual submission explains the input');
    await page.locator('#pinPad [data-pin="backspace"]').tap();
    assert.equal(await page.locator('#loginPinInput').inputValue(), '12');
    assert(await page.locator('#loginInlineError').isHidden());
    await page.locator('#pinPad [data-pin="clear"]').tap();
    assert.equal(await page.locator('#loginPinInput').inputValue(), '');
    await page.locator('#createAccountBtn').tap();
    assert(await page.locator('#loginNameInput').isVisible());
    await page.locator('#loginBackBtn').tap();
    assert(!(await page.locator('#loginNameInput').isVisible()));
    assert(await page.locator('#rulesText').inputValue(), 'embedded settings reach the administrator display');
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    console.log('PASS published bundle boots on a phone, PIN input and login modes respond to touch, and embedded settings load; no missing local assets or runtime errors');
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
