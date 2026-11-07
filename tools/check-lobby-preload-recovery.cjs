// Exercise the shipped loader in a browser. Timers and preparation jobs are controlled.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<style>[hidden]{display:none!important}</style><iframe id="frame"></iframe>');
  await page.clock.install();
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'lobby-game-preload.js'),'utf8').replace('export ','')+`
   document.body.dataset.phase='lobby';
   window.make=tasks=>{window.preloader?.dispose();window.preloader=createLobbyGamePreloader({frame:()=>document.getElementById('frame'),tasks});};
   window.ack=()=>window.dispatchEvent(new MessageEvent('message',{source:document.getElementById('frame').contentWindow,data:{type:'lobby-rendered'}}));
  `});
  await page.evaluate(()=>{window.calls=[0,0];window.jobs=[];make([()=>{calls[0]++;},()=>{calls[1]++;return new Promise(resolve=>jobs.push(resolve));}]);ack();});
  await page.clock.runFor(200);assert.deepEqual(await page.evaluate(()=>calls),[1,1]);
  await page.evaluate(()=>document.body.dataset.phase='play');await page.waitForFunction(()=>!preloader.state().running);
  await page.evaluate(()=>document.body.dataset.phase='lobby');await page.clock.runFor(200);
  assert.deepEqual(await page.evaluate(()=>calls),[1,2]);
  await page.evaluate(()=>jobs[0]());assert.equal(await page.evaluate(()=>preloader.state().completed),1,'late cancelled preparation must not complete a new attempt');
  await page.evaluate(()=>jobs[1]());await page.clock.runFor(1200);assert(await page.locator('#lobbyLoadingScreen').isHidden());
  console.log('PASS leaving aborts a stalled wait; reentry retries only unfinished jobs and ignores stale completion');

  await page.evaluate(()=>document.getElementById('frame').dispatchEvent(new Event('load')));
  await page.clock.runFor(500);assert(await page.locator('#lobbyLoadingScreen').isVisible());
  assert.equal(await page.evaluate(()=>preloader.state().sceneReady),false);
  await page.clock.runFor(20000);assert(await page.locator('[data-loading-retry]').isVisible());assert(await page.locator('[data-loading-continue]').isHidden());
  await page.evaluate(()=>ack());await page.clock.runFor(1200);assert(await page.locator('#lobbyLoadingScreen').isHidden());assert.deepEqual(await page.evaluate(()=>calls),[1,2]);
  console.log('PASS reloaded iframe must render again; recovery actions appear and prepared resources are reused');

  await page.evaluate(()=>{window.calls=[0,0];make([()=>{calls[0]++;},()=>{if(++calls[1]===1)throw Error('temporary preparation failure');}]);});
  await page.clock.runFor(200);assert(await page.locator('[data-loading-retry]').isVisible());
  await page.locator('[data-loading-retry]').click();await page.clock.runFor(200);assert.deepEqual(await page.evaluate(()=>calls),[1,2]);
  assert.equal(await page.evaluate(()=>preloader.state().completed),2);assert(await page.locator('#lobbyLoadingScreen').isVisible());
  await page.evaluate(()=>ack());await page.clock.runFor(1200);assert(await page.locator('#lobbyLoadingScreen').isHidden());
  console.log('PASS retry recovers a failed job without repeating completed jobs or bypassing scene readiness');

  await page.evaluate(()=>{make([()=>new Promise(resolve=>window.lateJob=resolve)]);ack();});
  await page.clock.runFor(21500);assert.equal(await page.evaluate(()=>preloader.state().running),false);
  assert(await page.locator('#lobbyLoadingScreen').isHidden(),'ready lobby remains usable when optional effects fail');
  assert.match(await page.locator('#lobbyGameDownload').textContent(),/開始時に読み込み/);
  await page.evaluate(()=>lateJob());assert.equal(await page.evaluate(()=>preloader.state().completed),0);
  await page.evaluate(()=>preloader.dispose());await page.clock.runFor(22000);
  assert.equal(await page.locator('#lobbyLoadingScreen').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS preparation timeout uses on-demand fallback, late work is ignored and dispose cancels recovery');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
