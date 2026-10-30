// Test the shipped srcdoc and minified runtime with external requests blocked.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {gunzipSync} = require('node:zlib');
const {build} = require('esbuild');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.MEETING_LOADING_QA_OUT || path.join(root, 'tmp/meeting-loading');
const entries = ['index.html', 'space-suspect-complete.html', 'space-suspect.html', 'space-suspect-final.html'];

async function main() {
  let scene;
  for (const entry of entries) {
    const html = fs.readFileSync(path.join(root, entry), 'utf8');
    const match = html.match(/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/);
    const assets = JSON.parse(gunzipSync(Buffer.from(JSON.parse(match[1]).join(''), 'base64')));
    if (scene) assert.equal(assets.MEETING_3D_SRCDOC, scene, entry);
    scene = assets.MEETING_3D_SRCDOC;
  }
  assert(!scene.includes('<script type="importmap">'));
  assert(!/^import .*from ["']three/m.test(scene));
  const bundled = await build({
    entryPoints: [path.join(root, 'meeting-scene-ejections.js'), path.join(root, 'render-shadow-settings.js')],
    bundle: true, write: false, format: 'esm', minify: true, outdir: 'unused',
  });
  const [{patchMeetingRuntime}, {withShadowSettings}] = await Promise.all(bundled.outputFiles.map(file =>
    import('data:text/javascript;base64,' + Buffer.from(file.text).toString('base64'))));
  const srcdoc = withShadowSettings(patchMeetingRuntime(scene));
  fs.mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({args: ['--no-sandbox', '--enable-unsafe-swiftshader']});
  try {
    for (const size of [{width: 844, height: 390, mobile: true}, {width: 1366, height: 768, mobile: false}]) {
      const page = await browser.newPage({viewport: {width: size.width, height: size.height}, isMobile: size.mobile, hasTouch: size.mobile});
      page.setDefaultTimeout(20000);
      const errors = [], requests = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => { requests.push(route.request().url()); return route.abort(); });
      await page.setContent('<style>body{margin:0}iframe{width:100vw;height:100vh;border:0}</style><iframe id="meeting"></iframe>');
      await page.evaluate(source => {
        const frame = document.getElementById('meeting');
        let active = false, meetingId = 'first';
        const picks = [], chats = [];
        function send() {
          frame.contentWindow.postMessage({type: 'ss3d-state', renderActive: active, meetingId,
            meetingStartedAt: Date.now() - 5000, me: 'self', voting: true, ownVoted: '', allVoted: false,
            seats: ['self', 'other', 'third'].map((id, i) => ({id, name: ['自分', '相手', '参加者'][i],
              isMe: id === 'self', hue: i / 3, alive: true, costume: 'standard'}))}, '*');
          frame.contentWindow.postMessage({type: 'ss3d-ui', meetingId, buttons: [], chat: [], bubbles: {},
            remainMs: 60000, votingOpen: true, canChat: true}, '*');
        }
        addEventListener('message', event => {
          if (event.source !== frame.contentWindow) return;
          if (event.data.type === 'ss3d-ready') send();
          if (event.data.type === 'ss3d-pick') picks.push(event.data);
          if (event.data.type === 'ss3d-chat') chats.push(event.data.text);
        });
        window.qa = {picks, chats, activate() {active = true; send();},
          reload() {frame.srcdoc = source;}, next() {meetingId = 'second'; frame.srcdoc = source;}};
        frame.srcdoc = source;
      }, srcdoc);
      const frame = await (await page.locator('#meeting').elementHandle()).contentFrame();
      await frame.waitForFunction(() => window.meetingScene?.getState().seats === 3);
      console.log('PASS scene initialization with blocked requests', size.width);
      assert.equal((await frame.evaluate(() => window.meetingScene.getState())).rendering.frames, 0);
      // iOS may suspend animation callbacks while the parent keeps the iframe
      // transparent until its first frame. State delivery must break that wait.
      await frame.evaluate(() => {window.__qaRequestFrame = requestAnimationFrame;window.requestAnimationFrame = () => 0;});
      await page.evaluate(() => qa.activate());
      await frame.waitForFunction(() => window.meetingScene?.getState().rendering.frames > 0);
      assert(await frame.locator('#meetingSceneLoading').evaluate(element => element.hidden));
      console.log('PASS first frame without animation callbacks', size.width);
      await frame.evaluate(() => {window.requestAnimationFrame = window.__qaRequestFrame;});
      await page.evaluate(() => qa.activate());
      await frame.waitForFunction(() => window.meetingScene?.getState().rendering.frames > 2);
      console.log('PASS actual 3D frames', size.width);
      if(process.env.MEETING_LOADING_FIRST_FRAME_ONLY){assert.deepEqual(errors,[]);await page.close();continue;}
      assert(await frame.locator('#meetingSceneLoading').evaluate(element => element.hidden));
      await frame.locator('#meetingSkipBtn').click();
      await frame.getByRole('button', {name: '投票する', exact: true}).click();
      await page.waitForFunction(() => qa.picks.length === 1);
      assert.equal((await page.evaluate(() => qa.picks[0])).target, 'skip');
      await frame.locator('#chatText').fill('3D会議に参加できました');
      await frame.getByRole('button', {name: '送信', exact: true}).click();
      await page.waitForFunction(() => qa.chats.length === 1);
      assert.equal(await page.evaluate(() => qa.chats[0]), '3D会議に参加できました');
      console.log('PASS 3D voting and chat', size.width);
      await page.screenshot({path: path.join(out, `meeting-${size.width}.png`)});
      await frame.evaluate(() => {
        window.__loss = document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context');
        window.__loss.loseContext();
      });
      await frame.waitForFunction(() => window.meetingScene.getState().rendering.lost);
      await page.waitForTimeout(200);
      await frame.evaluate(() => window.__loss.restoreContext());
      await frame.waitForFunction(() => !window.meetingScene.getState().rendering.lost &&
        document.getElementById('meetingSceneLoading').hidden);
      for (const action of ['reload', 'next']) {
        await page.evaluate(action => qa[action](), action);
        await frame.waitForFunction(() => window.meetingScene?.getState().seats === 3 &&
          window.meetingScene.getState().rendering.frames > 2);
      }
      await frame.locator('#meetingSkipBtn').click();
      await frame.getByRole('button', {name: '投票する', exact: true}).click();
      await page.waitForFunction(() => qa.picks.length === 2);
      assert.equal((await page.evaluate(() => qa.picks[1])).meetingId, 'second');
      assert(!requests.some(url => /(?:jsdelivr\.net|unpkg\.com).*three@/.test(url)), 'meeting must not request Three.js from a CDN');
      assert.deepEqual(errors, []);
      console.log(`PASS ${size.width}: blocked external requests; preload, 3D rendering, vote, chat, GPU restore, reload and next meeting`);
      await page.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
