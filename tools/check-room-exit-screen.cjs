const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['room-exit-screen.js'],bundle:true,write:false,outfile:'exit.js',format:'iife',globalName:'ExitScreen'});
 const entry=fs.readFileSync('index.html','utf8');
 const wrapper=entry.slice(entry.indexOf('async function leaveRoom() {'),entry.indexOf('async function leaveRoomSession() {'));
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage({hasTouch:true,isMobile:true});
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>@layer portrait-guidance,play-action-layout;@layer play-action-layout{#gameUI{visibility:visible!important}}#gameUI{position:fixed;inset:0}</style><button id="gameUI">ゲーム操作</button><dialog id="settings">設定</dialog>');
  await page.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});
  await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
  await page.addScriptTag({content:'const rolePracticeMode=false;let code="1234",leaving=false;const {showRoomExitScreen}=ExitScreen;async function leaveRoomSession(){return new Promise((resolve,reject)=>window.finishExit=failed=>failed?reject(new Error("fixture")):resolve(true));}'+wrapper});
  for(const [width,height]of [[320,568],[390,844],[568,320],[844,390]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>{document.getElementById('settings').showModal();window.finishExit=null;window.exitPromise=leaveRoom();});
   await page.waitForFunction(()=>!!window.finishExit);
   const box=await page.locator('#roomExitScreen').boundingBox();assert.deepEqual(box,{x:0,y:0,width,height});
   assert.equal(await page.locator('#gameUI').evaluate(n=>getComputedStyle(n).visibility),'hidden');
   assert.equal(await page.locator('#settings').evaluate(n=>getComputedStyle(n).visibility),'hidden');
   assert.equal(await page.evaluate(()=>leaveRoom()),false,'duplicate exit does not start again');
   await page.keyboard.press('Escape');assert(await page.locator('#roomExitScreen').isVisible());
   assert(await page.locator('.lobbyLoadSatellite').evaluate(n=>n.getAnimations().length)>0);
   const card=await page.locator('#roomExitScreen .lobbyLoadCard').boundingBox();assert(card.y>=0&&card.y+card.height<=height);
   await page.evaluate(async()=>{window.finishExit(false);await window.exitPromise;document.getElementById('settings').close();});
   assert.equal(await page.locator('#roomExitScreen').isVisible(),false);
   assert.equal(await page.locator('#gameUI').evaluate(n=>getComputedStyle(n).visibility),'visible');
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{window.finishExit=null;window.exitPromise=leaveRoom().catch(()=>false);});
  await page.waitForFunction(()=>!!window.finishExit);
  assert.equal(await page.locator('.lobbyLoadSatellite').evaluate(n=>n.getAnimations().length),0);
  await page.evaluate(async()=>{window.finishExit(true);await window.exitPromise;});
  assert.equal(await page.locator('#roomExitScreen').isVisible(),false);
  assert.equal(await page.evaluate(()=>leaving),false,'failed exit clears busy guard');
  console.log('PASS exit hides existing UI, covers four phone sizes, animates, blocks duplicate/Escape, restores UI on success and failure, respects reduced motion');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
