const {build}=require('esbuild'),{chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const bundle=await build({entryPoints:['lobby-soccer-feedback.js'],bundle:true,write:false,format:'iife',globalName:'Feedback'}),browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setContent('<input id="audioEffectsVolume" value="0"><button>play</button>');await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.evaluate(()=>{
   window.testNow=100000;window.audible=true;window.starts=0;window.created=0;const Base=window.AudioContext;
   window.AudioContext=class extends Base {constructor(){super();created++;window.testAudio=this;}createOscillator(){const node=super.createOscillator(),start=node.start.bind(node);node.start=(...args)=>{starts++;return start(...args);};return node;}};
   window.feedback=Feedback.createSoccerFeedback({document,window,visible:()=>audible,clock:()=>testNow});
   window.game={kicks:{self:{id:'one',power:1,connected:true,contact:{at:testNow}}}};
  });
  await page.locator('button').click();assert.equal(await page.evaluate(()=>created),0,'muted input does not allocate audio');
  await page.evaluate(()=>document.getElementById('audioEffectsVolume').value='70');await page.locator('button').click();await page.waitForFunction(()=>testAudio.state==='running');assert.equal(await page.evaluate(()=>created),1);
  await page.evaluate(()=>{feedback.update(game);feedback.update(game);});assert.equal(await page.evaluate(()=>starts),1,'one sound per confirmed event');
  await page.evaluate(()=>{game.kicks.self={id:'pending',at:testNow,power:1,applied:false};feedback.update(game);});assert.equal(await page.evaluate(()=>starts),1,'pending kicks are silent');
  await page.evaluate(()=>{document.getElementById('audioEffectsVolume').value='0';game.kicks.self={id:'muted',connected:true,contact:{at:testNow}};feedback.update(game);document.getElementById('audioEffectsVolume').value='70';feedback.update(game);});assert.equal(await page.evaluate(()=>starts),1,'unmuting does not replay a muted event');
  await page.evaluate(()=>{audible=false;game.lastSave={at:testNow};feedback.update(game);audible=true;feedback.update(game);});assert.equal(await page.evaluate(()=>starts),1,'reentering does not replay events heard elsewhere');
  await page.evaluate(()=>{game.lastGoal={at:testNow+100};feedback.update(game);});assert.equal(await page.evaluate(()=>starts),1,'future goal waits for its timestamp');await page.evaluate(()=>{testNow+=100;feedback.update(game);});assert.equal(await page.evaluate(()=>starts),2);
  await page.evaluate(()=>{game.lastGoal={at:testNow-1000};feedback.update(game);feedback.dispose();});assert.equal(await page.evaluate(()=>starts),2);await page.waitForFunction(()=>testAudio.state==='closed');assert.deepEqual(errors,[]);
  console.log('PASS real Web Audio gesture unlock, effects volume, confirmed events, duplicate/stale suppression, future event timing, area exit and disposal');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
