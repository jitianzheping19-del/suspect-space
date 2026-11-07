const assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['lobby-soccer-flick.js'],bundle:true,write:false,outfile:'flick.js',format:'iife',globalName:'Flick'});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height]of [[390,844],[844,390],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1">');await page.clock.install({time:100000});await page.clock.pauseAt(100000);
  await page.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
  await page.evaluate(()=>{window.ctx={secret:true,visible:true,enabled:true,canSkill:true,canDash:true,hasBall:true,yaw:0,rightX:1,rightZ:0,forwardX:0,forwardZ:1};window.commands=[];window.flick=Flick.createSoccerFlickControls({document,window,context:()=>ctx,send:(kind,data)=>commands.push({kind,...data})});flick.update();});
  const tap=async()=>{await page.locator('#soccerFeintBtn').tap();await page.clock.runFor(65);};
  await tap();await tap();assert.equal(await page.evaluate(()=>commands.length),0);await tap();await page.clock.runFor(400);
  assert.deepEqual(await page.evaluate(()=>commands.map(c=>c.kind)),['soccer-hand'],'triple tap does not leak double-touch or nutmeg');
  await page.evaluate(()=>{commands=[];ctx.handHeld=true;ctx.canSkill=false;flick.update();});await tap();await tap();await tap();assert.equal(await page.evaluate(()=>commands.at(-1).kind),'soccer-hand');
  await page.evaluate(()=>{commands=[];ctx.handHeld=false;ctx.canSkill=true;flick.update();});await tap();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.clock.runFor(400);assert.equal(await page.evaluate(()=>commands.length),0);
  await tap();await page.evaluate(()=>{ctx.secret=false;flick.update();});await page.clock.runFor(400);assert.equal(await page.evaluate(()=>commands.length),0,'round end cancels pending gesture');
  await tap();await page.clock.runFor(400);assert.equal(await page.evaluate(()=>commands.at(-1).skill),'doubleTouch','normal single tap preserved');
  await page.evaluate(()=>{commands=[];ctx.secret=true;flick.update();});await tap();await page.clock.runFor(400);assert.equal(await page.evaluate(()=>commands.at(-1).skill),'doubleTouch');
  await page.evaluate(()=>{ctx.skyReady=true;ctx.volleyReady=true;flick.update();});assert.equal(await page.locator('#soccerKickBtn span').innerText(),'天空シュート');await page.locator('#soccerKickBtn').tap();assert.equal(await page.evaluate(()=>commands.at(-1).kind),'soccer-volley');
  assert.deepEqual(errors,[]);console.log('PASS touch triple, held ball release, cancellation, normal feint and sky shot',width,height);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
