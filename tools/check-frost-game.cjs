// Actual room settings, host meeting flow, map switching and WebGL; Firebase is
// isolated in memory so the playtest never joins or writes a real user room.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = process.env.FROST_GAME_QA_OUT || path.join(root, 'tmp/frost-game');
fs.mkdirSync(out, { recursive: true });
const old = fs.readFileSync(path.join(__dirname, 'check-room-rejoin.cjs'), 'utf8');
let { fakeDatabase, fixture } = vm.runInNewContext(old.slice(old.indexOf('const fakeDatabase='), old.indexOf('(async()=>{')) + '\n({fakeDatabase,fixture})');
fakeDatabase = fakeDatabase.replace('const refs=new Map();', 'const refs=new Map(),values=new Map();')
  .replace('val:()=>value', 'val:()=>structuredClone(value)')
  .replace('return Promise.resolve();}', `for(const [key,fn] of values)if(path===key||path.startsWith(key+'/')){const next=snapshot(key.split('/').at(-1),structuredClone(read(key)));queueMicrotask(()=>fn(next));}return Promise.resolve();}`)
  .replace('export const onValue=(r,fn)=>{', 'export const onValue=(r,fn)=>{values.set(r.path,fn);')
  .replace("window.__qaEmitPlayer=", "window.__qaSetGame=value=>write('rooms/5291/game',value);\nwindow.__qaEmitPlayer=");
const probes = `
window.__frostGameQA={
 async boot(){
  await window.__rejoinQA.load('2d');hostId=uid;connected=true;renderPixelRatio=.8;
  const g=clone(game);g.phase='lobby';g.round=4;delete g.meeting;
  g.lobbySettings=lobbySettingsPayload(snapshotMatchSettingsFromInputs({mapMode:'classic',viewMode:'2d',voiceEnabled:false,bots:false}));
  for(let i=0;i<3;i++){const id='qa-crew-'+i,p={...g.players['qa-host'],name:'クルー'+i,role:'crew',subrole:'crewmate',x:SPAWN_POINTS[i+5].x,z:SPAWN_POINTS[i+5].z};g.players[id]=p;players[id]={...p,online:true,updatedAt:now()};}
  g.players[uid].role='crew';g.players[uid].subrole='crewmate';g.players['qa-host'].role='impostor';g.players['qa-host'].subrole='impostor';
  window.__qaDatabase.rooms['5291'].hostId=uid;await window.__qaSetGame(g);openRoomSettings();resize();return true;
 },
 async play(view='2d'){
  if(lobbySettingsWriteTimer)await flushLobbySettingsSave();
  const g=clone(game);g.phase='play';g.settings={...g.settings,viewMode:view,mapMode:'frost',voiceEnabled:false,waveMode:'normal'};
  g.lobbySettings.mapMode='frost';delete g.meeting;delete g.sabotage;delete g.winner;
  g.startedAt=now()-60000;g.playStartsAt=now()-50000;g.countdownEndsAt=now()-50000;g.meetingReadyAt=0;
  setMapMode('frost');let i=0;for(const [id,p] of Object.entries(g.players)){const spawn=SPAWN_POINTS[i++];Object.assign(p,spawn,{assignedTasks:[],tasks:{},alive:true,online:true});if(players[id])Object.assign(players[id],spawn);}
  position={x:g.players[uid].x,z:g.players[uid].z};await window.__qaSetGame(g);lobbyPanelOpen=false;show('lobby',false);safeRenderUI();followCamera();return true;
 },
 state(){return{map:currentMapMode,phase:game.phase,hostId,uid,isHost:isHost(),connected,applyingSavedMatchSettings,rooms:ROOMS.length,tasks:TASKS.length,panels:EMERGENCY_PANELS.length,vents:VENTS.length,doors:shipDoorLayout(game).doors.length,spawn:SPAWN_POINTS.length,
  selected:$('roomMapMode').value,saved:window.__qaDatabase.rooms['5291'].game.lobbySettings.mapMode,
  roots:{classic:classicStructureRoot.visible,frost:frostMap?.root.visible,astra:astraMap?.root.visible},
  toast:$('toast').textContent,meeting:game.meeting?.id,canSabotage:canUseSabotage(),
  avatar:avatars.get(uid)?.visible,position:{...position},calls:renderer.info.render.calls};},
 layout(){return frostGameLayout;},
 async frostTask(id,ghost=false){
  this.switchMap('frost');const station=TASKS.find(t=>t.id===id),g=clone(game),pose={x:station.approach[0],z:-station.approach[1]};
  g.phase='play';delete g.meeting;delete g.sabotage;delete g.winner;
  delete g.killPresentation;delete g.killEvent;delete g.deathRecords;delete g.lastVoteResult;
  g.playStartsAt=now()-50000;g.countdownEndsAt=now()-50000;g.meetingReadyAt=0;
  Object.assign(g.players[uid],pose,{role:'crew',subrole:'crewmate',alive:!ghost,observer:false,disconnected:false,assignedTasks:[id,'dome-circuit'],tasks:{}});
  for(const p of Object.values(g.players))if(p!==g.players[uid])p.assignedTasks=[];
  hostId=uid;connected=true;position={...pose};window.__qaEmitPlayer('5291',uid,{...players[uid],...pose,online:true,updatedAt:now()});
  // A restored ghost is already past its death presentation. This fixture
  // tests terminal access rather than manufacturing an incomplete kill event.
  if(ghost){game.players[uid].alive=false;clearVictimDeathOverlays();}
  await window.__qaSetGame(g);if(ghost)clearVictimDeathOverlays();safeRenderUI();startTask();return this.frostTaskState();
 },
 frostTaskState(){return{open:!!taskGame,mode:taskGame?.mode,task:taskGame?.station.id,finished:taskGame?.frostRun?.state.finished,completed:window.__qaDatabase.rooms['5291'].game.players[uid].tasks,lock:taskInteractionLock,ready:canPlay(),nearest:nearestTask()?.id,position:{...position},alive:self()?.alive,phase:game.phase,toast:$('toast').textContent,connected,host:hostOnline(),killLocked:killActionsLocked(),deathPause:deathPauseUntil-performance.now(),reveal:!$('roleReveal').classList.contains('hidden'),assigned:self()?.assignedTasks};},
 useTask(){if(!taskGame&&canPlay())startTask();return !!taskGame;},
 frostControl(id){const m=taskMachine3D,o=m.controls.find(o=>o.userData.taskControl.id===id),p=o.getWorldPosition(new THREE.Vector3()).project(m.camera),r=m.canvas.getBoundingClientRect();return{x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};},
 async processTask(){await flushCommandQueue();await hostTick();return this.frostTaskState();},
 async frostOxygen(){
  closeTaskGame();const g=clone(game),panel=EMERGENCY_PANELS.find(p=>p.id==='oxygen-habitat'),pose={x:panel.approach[0],z:-panel.approach[1]};
  g.phase='play';g.players[uid].alive=true;g.sabotage={id:'qa-oxygen',type:'oxygen',code:'123456',endsAt:now()+90000,startedAt:now(),panels:{}};
  Object.assign(g.players[uid],pose);position={...pose};window.__qaEmitPlayer('5291',uid,{...players[uid],...pose,online:true,updatedAt:now()});
  await window.__qaSetGame(g);startTask();return{panel:emergencyPanelOpen?.panelId,mode:emergencyTaskMachineState()?.mode};
 },
 oxygenState(){return window.__qaDatabase.rooms['5291'].game.sabotage?.panels||{};},
 paths(){return ${JSON.stringify(require('../frost-map-data.json').routes.map((r) => r.points))}.map(points=>points.every((p,i)=>!i||Array.from({length:31},(_,j)=>({x:points[i-1][0]+(p[0]-points[i-1][0])*j/30,z:-(points[i-1][1]+(p[1]-points[i-1][1])*j/30)})).every(p=>!collision(p.x,p.z,true))));},
 async malformedMeeting(){const g=clone(game);g.phase='meeting';delete g.meeting;await window.__qaSetGame(g);await hostTick();return this.state();},
 async meeting(){const g=clone(game);g.phase='play';delete g.meeting;const ok=beginMeeting(g,uid,'緊急会議');await window.__qaSetGame(g);await hostTick();return{ok,...this.state()};},
 switchMap(map){game.phase='play';game.settings.mapMode=map;setMapMode(map);return this.state();},
 task(id='air'){this.switchMap('classic');game.players[uid].assignedTasks=[id];game.players[uid].role='crew';game.players[uid].subrole='crewmate';game.phase='play';safeRenderUI();show('meetingIntro',false);show('meeting',false);show('roleReveal',false);openTaskGame(SKELD_TASKS.find(t=>t.id===id));},
 taskState(){const m=taskMachine3D;return{open:!$('taskGame').classList.contains('hidden'),three:!!m,mode:taskGame?.mode,progress:getComputedStyle($('taskProgressTrack')).display,title:getComputedStyle($('taskGameTitle')).display};},
 closeTask(){closeTaskGame();},
 hostReset(){hostId='qa-host';connected=false;},
};
`;

(async () => {
  const server = createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.json') ? 'application/json' : file.endsWith('.css') ? 'text/css' : 'text/html');
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  const results = [];
  try {
    for (const [width, height, touch] of [[844, 390, true], [1024, 768, true], [1280, 800, false]]) {
      if (process.env.FROST_GAME_QA_WIDTH && Number(process.env.FROST_GAME_QA_WIDTH) !== width) continue;
      const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
      const errors = [];
      page.on('pageerror', (error) => { errors.push(error.message); console.error('BROWSER:', error.message); });
      await page.route('**/firebase-database.js', (route) => route.fulfill({ body: fakeDatabase, contentType: 'application/javascript' }));
      await page.route(/(?:firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)/, (route) => route.abort());
      await page.route('**/space-suspect-complete.html', (route) => route.fulfill({
        body: fs.readFileSync(path.join(root, 'space-suspect-complete.html'), 'utf8')
          .replace('function showMeetingIntro(reason)', fixture + probes + '\nfunction showMeetingIntro(reason)')
          .replace('if(!skipAutoLoginOnce){setTimeout(()=>connectFirebase(""),0);}', ''), contentType: 'text/html',
      }));
      await page.goto('http://127.0.0.1:' + server.address().port + '/space-suspect-complete.html', { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.__frostGameQA, null, { timeout: 90000 });
      await page.evaluate(() => window.__frostGameQA.boot());
      assert.equal(await page.locator('#roomMapMode option[value="frost"]').textContent(), 'フロスト');
      await page.selectOption('#roomMapMode', 'frost', { force: true });
      try {
        await page.waitForFunction(() => window.__frostGameQA.state().map === 'frost' && window.__frostGameQA.state().saved === 'frost');
      } catch (error) {
        console.error('SETTING STATE', await page.evaluate(() => ({ state: window.__frostGameQA.state(), writes: window.__qaWrites.filter(w=>w.path.includes('lobbySettings')).map(w=>({path:w.path,map:w.value.mapMode})) })));
        await page.screenshot({ path: path.join(out, `${width}-setting-failure.png`) });
        throw error;
      }
      await page.screenshot({ path: path.join(out, `${width}-frost-settings.png`) });
      for (const view of ['2d', '3d']) {
        await page.evaluate((view) => window.__frostGameQA.play(view), view);
        await page.waitForFunction(() => window.__frostGameQA.state().avatar === true);
        const s = await page.evaluate(() => window.__frostGameQA.state());
        assert.equal(s.map, 'frost'); assert.equal(s.rooms, 11); assert.equal(s.vents, 10); assert.equal(s.doors, 30);
        assert.equal(s.tasks, 22); assert.equal(s.panels, 9); assert.equal(s.canSabotage, false);
        assert(s.roots.frost && !s.roots.classic && !s.roots.astra);
        const routes = await page.evaluate(() => window.__frostGameQA.paths());
        assert(routes.every(Boolean), 'A FROST corridor is blocked');
        await page.screenshot({ path: path.join(out, `${width}-frost-${view}.png`) });
      }
      const malformed = await page.evaluate(() => window.__frostGameQA.malformedMeeting());
      assert(!/undefined|meeting\.id/.test(malformed.toast), 'Missing meeting crashed the host');
      const meeting = await page.evaluate(() => window.__frostGameQA.meeting());
      assert(meeting.ok && meeting.phase === 'meeting' && meeting.meeting, 'Emergency meeting failed');
      await page.screenshot({ path: path.join(out, `${width}-frost-meeting.png`) });
      for (const map of ['classic', 'astra', 'frost']) {
        const s = await page.evaluate((map) => window.__frostGameQA.switchMap(map), map);
        assert.equal(s.map, map); assert.equal(s.roots.frost, map === 'frost');
        if (map === 'classic') assert(s.tasks > 0 && s.panels > 0, 'Existing tasks were lost after switching back');
      }
      if(width===844){
        for(const ghost of [false,true]){
          let task=await page.evaluate(ghost=>window.__frostGameQA.frostTask('power-overcurrent',ghost),ghost);
          if(!task.open){console.log('WAIT FOR TASK READINESS',{ghost,task});await page.waitForFunction(()=>window.__frostGameQA.useTask());task=await page.evaluate(()=>window.__frostGameQA.frostTaskState());}
          assert.equal(task.mode,'frost');assert(task.open&&task.lock);
          await page.screenshot({path:path.join(out,ghost?'frost-ghost-task.png':'frost-live-task.png')});
          const control=await page.evaluate(()=>window.__frostGameQA.frostControl('breaker:2'));
          await page.touchscreen.tap(control.x,control.y);
          await page.evaluate(()=>window.__frostGameQA.processTask());
          try{await page.waitForFunction(()=>window.__frostGameQA.frostTaskState().completed['power-overcurrent']===true);}
          catch(error){console.error('TASK HOST FAILURE',await page.evaluate(()=>window.__frostGameQA.frostTaskState()));throw error;}
          await page.waitForFunction(()=>!window.__frostGameQA.frostTaskState().open);
          assert.equal((await page.evaluate(()=>window.__frostGameQA.frostTaskState())).lock,false);
        }
        const emergency=await page.evaluate(()=>window.__frostGameQA.frostOxygen());
        assert.equal(emergency.panel,'oxygen-habitat');assert.equal(emergency.mode,'emergency-oxygen');
        await page.keyboard.type('123456');await page.keyboard.press('Enter');
        await page.evaluate(()=>window.__frostGameQA.processTask());
        await page.waitForFunction(()=>Boolean(window.__frostGameQA.oxygenState()['oxygen-habitat']));
        console.log('PASS live FROST task completion, ghost tasks, input unlock and oxygen host validation');
      }
      await page.evaluate(() => { window.__frostGameQA.hostReset(); window.__frostGameQA.task('air'); });
      await page.waitForFunction(() => window.__frostGameQA.taskState().three);
      const task = await page.evaluate(() => window.__frostGameQA.taskState());
      assert.equal(task.progress, 'none'); assert.equal(task.title, 'none');
      const stage = await page.locator('#taskMachineStage').boundingBox(), close = await page.locator('#taskGameCloseBtn').boundingBox();
      console.log('TASK BOUNDS', { width, height, stage, close });
      await page.screenshot({ path: path.join(out, `${width}-task-expanded.png`) });
      assert(stage.width > width * .85 && stage.height > height * .7, 'Task display did not grow');
      assert(close.width <= 68 && close.height <= 34, 'Task close button is still too large');
      assert(close.x < 42 && close.y + close.height <= height && close.y > stage.y + stage.height, 'Close button is not outside the machine area');
      assert.equal(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id,
        { x: close.x + close.width / 2, y: close.y + close.height / 2 }), 'taskGameCloseBtn', 'Another HUD covers the close button');
      if(touch)await page.locator('#taskGameCloseBtn').tap();else await page.locator('#taskGameCloseBtn').click();
      await page.waitForFunction(()=>!window.__frostGameQA.taskState().open,null,{timeout:5000});
      assert.deepEqual(errors, []);
      results.push({ width, height, touch, meeting: true, tasks:22, emergencyPanels:9, taskStage: stage, close, errors });
      console.log('PASS', width, height, 'saved map setting, both cameras, 19 routes, meeting safety, map switch and task UI');
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
})().catch((error) => { console.error(error); process.exitCode = 1; });
