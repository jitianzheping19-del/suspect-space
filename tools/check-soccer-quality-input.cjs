const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['lobby-soccer-flick.js'],bundle:true,write:false,format:'iife',globalName:'Flick',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height]of [[390,844],[844,390],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true});await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1">');await page.clock.install();
  await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});
  await page.addScriptTag({content:bundle.outputFiles[0].text});await page.addStyleTag({content:fs.readFileSync('lobby-soccer-flick.css','utf8')});
  await page.evaluate(()=>{window.ctx={visible:true,enabled:true,canSkill:true,canDash:true,yaw:0,rightX:1,rightZ:0,forwardX:0,forwardZ:1};window.commands=[];window.aim=null;window.control=Flick.createSoccerFlickControls({document,window,context:()=>ctx,send:(kind,data)=>commands.push({kind,...data}),onAim:v=>aim=v});control.update();});
  const k=await page.locator('#soccerKickBtn').boundingBox(),f=await page.locator('#soccerFeintBtn').boundingBox(),cdp=await page.context().newCDPSession(page);
  const kick={id:1,x:k.x+k.width/2,y:k.y+k.height/2},feint={id:2,x:f.x+f.width/2,y:f.y+f.height/2};
  const touch=async(type,touchPoints)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints});await page.clock.runFor(20);};
  await touch('touchStart',[kick]);await page.clock.runFor(450);await touch('touchStart',[kick,feint]);await touch('touchEnd',[kick]);await touch('touchEnd',[]);await page.clock.runFor(500);
  assert.deepEqual(await page.evaluate(()=>commands.map(c=>[c.kind,c.skill])),[['soccer-skill','shotFeint']]);assert.equal(await page.evaluate(()=>aim.active),false);
  await page.evaluate(()=>commands=[]);await touch('touchStart',[kick]);await touch('touchEnd',[]);await touch('touchStart',[feint]);await touch('touchEnd',[]);await page.clock.runFor(500);
  assert.deepEqual(await page.evaluate(()=>commands.map(c=>c.skill)),['shotFeint'],'pending quick kick is cancelled');
  await page.evaluate(()=>commands=[]);await touch('touchStart',[kick]);await page.clock.runFor(500);await touch('touchMove',[{...kick,y:kick.y-45}]);await touch('touchMove',[{...kick,x:kick.x+50,y:kick.y-70}]);await touch('touchEnd',[]);
  const shot=await page.evaluate(()=>commands[0]);assert.equal(shot.kind,'kick');assert.equal(shot.mode,'shot');assert(shot.spin>.5&&shot.spin<=1);assert(shot.power>.5);assert.equal(await page.evaluate(()=>commands.length),1);
  await page.evaluate(()=>commands=[]);await touch('touchStart',[kick]);await page.clock.runFor(500);await touch('touchMove',[{...kick,y:kick.y-50}]);await touch('touchEnd',[]);assert.equal(await page.evaluate(()=>commands[0].spin),0,'straight stroke stays straight');
  await page.evaluate(()=>commands=[]);await touch('touchStart',[kick]);await page.clock.runFor(500);await touch('touchCancel',[]);await page.clock.runFor(500);assert.equal(await page.evaluate(()=>commands.length),0,'cancellation never kicks');
  console.log('PASS real touch: simultaneous fake, queued kick cancellation, curved and straight shot, pointer cancellation',width,height);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
