const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict'), { createServer } = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), out = process.env.FROST_QA_OUT || path.join(root, 'tmp/task-dial');
fs.mkdirSync(out, { recursive: true });
const html = fs.readFileSync(path.join(root, 'space-suspect-complete.html'), 'utf8');
const factory = html.slice(html.indexOf('function createInteractiveTaskMachine('), html.indexOf('/* INTERACTIVE_TASK_MACHINES_V1_END */'));
const start = html.indexOf('frame.srcdoc=', html.indexOf('window.__ssOpenTaskTerminal=station=>')) + 'frame.srcdoc='.length;
let end = start + 1;
for (; end < html.length; end++) { if (html[end] === '\\') { end++; continue; } if (html[end] === '"') { end++; break; } }
const child = vm.runInNewContext(html.slice(start, end));
// Test-only introspection, inserted into the exact production task and camera.
const embedded = child.replaceAll('__THREE_CDN_BASE__', 'https://cdn.jsdelivr.net/npm/three@0.164.1')
  .replace('renderer.setPixelRatio(Math.min(devicePixelRatio,2))', 'renderer.setPixelRatio(.5)')
  .replace('renderer.shadowMap.enabled=true', 'renderer.shadowMap.enabled=false')
  .replace('const t={name:"キャリブレーション"', 'const t={inspect:()=>({ang,zone,stage,hold,dragging}),name:"キャリブレーション"')
  .replace('parent.postMessage({type:"ss-task-terminal-init"},"*");', `
window.__embeddedDialQA={state:()=>({...terms[3].tk.inspect(),focus,drag}),point(x,y){const p=new THREE.Vector3((x/W-.5)*2.4,(.5-y/H)*1.8,0);terms[3].scr.localToWorld(p);p.project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}};
window.postMessage({type:'ss-task-terminal-open',id:'dial-test',index:3,volume:0},'*');`);
const harness = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#stage{margin:0;width:100%;height:100%;overflow:hidden;background:#0b1929}canvas{width:100%;height:100%;touch-action:none}</style></head><body><div id="stage"></div><script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js';
${factory}
let machine,state;window.__dialQA={open(mode){machine?.dispose();state={mode,accepting:true,value:50,target:70,done:0,total:3};machine=createInteractiveTaskMachine(THREE,document.getElementById('stage'),()=>state,()=>{},v=>state.value=v);},state:()=>state,point(angle,radius=.7){const control=machine.controls.find(o=>o.userData.taskControl.drag==='knob'),c=control.getWorldPosition(new THREE.Vector3());const p=new THREE.Vector3(c.x+Math.cos(angle)*radius,c.y+Math.sin(angle)*radius,.7).project(machine.camera),rect=machine.canvas.getBoundingClientRect();return{x:rect.x+(p.x+1)*rect.width/2,y:rect.y+(1-p.y)*rect.height/2};},captures:()=>machine.canvas.hasPointerCapture(1)};
window.__dialQA.open('engine');</script></body></html>`;

(async () => {
  const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(req.url === '/embedded' ? embedded : harness); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const touch of [false, true]) {
      if (process.env.TASK_DIAL_TOUCH && String(touch) !== process.env.TASK_DIAL_TOUCH) continue;
      const page = await browser.newPage({ viewport: touch ? { width: 844, height: 390 } : { width: 1280, height: 800 }, hasTouch: touch, isMobile: touch });
      const errors = []; page.on('pageerror', (e) => errors.push(e.message));
      const cdp = await page.context().newCDPSession(page);
      let pressed = false;
      async function pointer(type, p) {
        if (!touch) { if (type === 'down') { await page.mouse.move(p.x, p.y); await page.mouse.down(); } else if (type === 'move') await page.mouse.move(p.x, p.y); else await page.mouse.up(); }
        else { await cdp.send('Input.dispatchTouchEvent', { type: type === 'down' ? 'touchStart' : type === 'move' ? 'touchMove' : type === 'cancel' ? 'touchCancel' : 'touchEnd', touchPoints: ['up', 'cancel'].includes(type) ? [] : [{ x: p.x, y: p.y, id: 1 }] }); }
        pressed = ['down', 'move'].includes(type);
      }
      await page.goto('http://127.0.0.1:' + server.address().port);
      await page.waitForFunction(() => window.__dialQA);
      for (const mode of process.env.TASK_DIAL_ONLY_EMBEDDED ? [] : ['engine', 'emergency-comms']) {
        await page.evaluate((mode) => window.__dialQA.open(mode), mode);
        let p = await page.evaluate(() => window.__dialQA.point(0));
        await pointer('down', p); assert.equal((await page.evaluate(() => window.__dialQA.state())).value, 50, 'Dial jumped on contact');
        for (let i = 1; i <= 12; i++) { p = await page.evaluate((a) => window.__dialQA.point(a), -i / 12 * Math.PI / 2); await pointer('move', p); }
        await page.waitForFunction(()=>Math.abs(window.__dialQA.state().value-83)<=2);
        assert(Math.abs((await page.evaluate(() => window.__dialQA.state())).value - 83) <= 2, 'Quarter turn did not track the pointer');
        await pointer('up');
        await page.evaluate((mode) => window.__dialQA.open(mode), mode);
        p = await page.evaluate(() => window.__dialQA.point(3)); await pointer('down', p);
        for (let i = 1; i <= 8; i++) { p = await page.evaluate((a) => window.__dialQA.point(a), 3 + i * .05); await pointer('move', p); }
        assert(Math.abs((await page.evaluate(() => window.__dialQA.state())).value - 42) <= 2, 'Angle wrapping jumped at ±180°');
        await pointer('cancel');
        const before = (await page.evaluate(() => window.__dialQA.state())).value;
        await page.mouse.move(40, 40); assert.equal((await page.evaluate(() => window.__dialQA.state())).value, before, 'Cancelled drag kept changing the dial');
        console.log('PASS rotary dial', mode, touch ? 'touch' : 'mouse');
      }
      await page.goto('http://127.0.0.1:' + server.address().port + '/embedded');
      await page.waitForFunction(() => window.__embeddedDialQA);
      // Let the actual moving camera settle before projecting screen points.
      await page.waitForTimeout(1200);
      const initial = await page.evaluate(() => window.__embeddedDialQA.state());
      const point = (angle, radius) => page.evaluate(({ angle, radius }) => window.__embeddedDialQA.point(256 + Math.cos(angle) * radius, 250 + Math.sin(angle) * radius), { angle, radius });
      let p = await point(-2.7, 90); await pointer('down', p);
      await page.waitForFunction(()=>window.__embeddedDialQA.state().dragging&&window.__embeddedDialQA.state().focus===3);
      const contact = await page.evaluate(() => window.__embeddedDialQA.state());
      assert(contact.dragging && contact.focus === 3, 'An invisible terminal stole the dial contact');
      assert(Math.abs((await page.evaluate(() => window.__embeddedDialQA.state())).ang - initial.ang) < .035, 'Embedded dial jumped on contact');
      for (let i = 1; i <= 10; i++) { p = await point(-2.7 + i * .06, 90); await pointer('move', p); }
      const after = await page.evaluate(() => window.__embeddedDialQA.state());
      assert(Math.abs(after.ang - initial.ang - .6) < .12, 'Embedded dial did not follow rotation');
      // Outside the terminal's right edge, while remaining in the browser.
      // A point beyond the phone viewport would instead be cancelled by the OS.
      p = await point(0, 300);
      const viewport = page.viewportSize();
      assert(p.x > 0 && p.x < viewport.width && p.y > 0 && p.y < viewport.height, 'Drag probe left the browser viewport');
      await pointer('move', p);
      await page.waitForFunction(before=>window.__embeddedDialQA.state().ang>before+.08,after.ang,{timeout:5000});
      const outside = await page.evaluate(() => window.__embeddedDialQA.state());
      assert(outside.ang > after.ang + .08, 'Embedded dial stopped tracking outside the screen');
      await pointer('up');
      await page.waitForFunction(()=>!window.__embeddedDialQA.state().dragging);
      const up = await page.evaluate(() => window.__embeddedDialQA.state()); assert.equal(up.dragging, false);
      await page.screenshot({ path: path.join(out, touch ? 'dial-phone.png' : 'dial-desktop.png') });
      assert.deepEqual(errors, []);
      results.push({ touch, nativeEngine: true, nativeComms: true, embedded: true, wrap: true, release: true, errors });
      console.log('PASS embedded calibration dial', touch ? 'touch' : 'mouse'); await page.close();
    }
  } finally { await browser.close(); server.close(); }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
