const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const code=await build({stdin:{contents:"export {createSoccerFlickControls} from './lobby-soccer-flick.js';export {createSoccerDefenseControls} from './lobby-soccer-defense-ui.js';export {createSoccerGuide} from './lobby-soccer-guide.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Q',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height]of [[390,844],[568,320],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});await page.route('http://local/**',r=>r.fulfill({body:'<meta name="viewport" content="width=device-width,initial-scale=1">',contentType:'text/html'}));await page.goto('http://local/');const frozen=new Date('2026-11-05T15:00:00Z');await page.clock.install({time:frozen});await page.clock.pauseAt(frozen);
  await page.evaluate(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/.test(kind)?null:old.call(this,kind,...args);};});await page.addScriptTag({content:code.outputFiles[0].text});
  for(const name of ['lobby-soccer-flick.css','lobby-soccer-defense.css','lobby-soccer-match.css'])await page.addStyleTag({content:fs.readFileSync(name,'utf8')});
  await page.evaluate(()=>{
   window.ctx={visible:true,enabled:true,canSkill:true,canDash:true,canSlide:true,canPress:true,defending:false,yaw:0,rightX:1,rightZ:0,forwardX:0,forwardZ:1,resolveAim:yaw=>({mode:'pass',target:'friend',yaw})};window.commands=[];window.aim={};window.events=[];document.addEventListener('pointermove',e=>events.push({x:e.clientX,y:e.clientY,t:performance.now()}),true);window.opened=[];
   window.controls=Q.createSoccerFlickControls({document,window,context:()=>ctx,send:(kind,p)=>commands.push({kind,...p}),onAim:p=>aim=p});window.defense=Q.createSoccerDefenseControls({document,window,context:()=>ctx,sendSlide:yaw=>commands.push({kind:'slide',yaw}),sendPress:held=>commands.push({kind:'press',held})});window.guide=Q.createSoccerGuide({document,window,onOpen:v=>opened.push(v)});controls.update();defense.update();guide.update(true);
  });
  const cdp=await page.context().newCDPSession(page),rect=await page.locator('#soccerKickBtn').boundingBox(),kick={id:1,x:rect.x+rect.width/2,y:rect.y+rect.height/2};
  const touch=async(type,touchPoints)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints});await page.waitForTimeout(25);};
  for(const duration of [349,351]){
   await page.evaluate(()=>commands=[]);await touch('touchStart',[kick]);await touch('touchMove',[{...kick,y:kick.y-45}]);await page.clock.runFor(duration);await touch('touchEnd',[]);
   assert.equal(await page.evaluate(()=>commands.at(-1).mode),duration<350?'pass':'through');assert.equal(await page.evaluate(()=>aim.active),false);
  }
  await page.evaluate(()=>commands=[]);await touch('touchStart',[kick]);await touch('touchMove',[{...kick,y:kick.y-45}]);await page.clock.runFor(400);assert(await page.evaluate(()=>aim.through));await touch('touchMove',[{...kick,x:kick.x+30,y:kick.y-45}]);await page.clock.runFor(100);assert.equal(await page.evaluate(()=>aim.through),false,JSON.stringify(await page.evaluate(()=>({aim,events,t:performance.now()}))));await touch('touchCancel',[]);assert.equal(await page.evaluate(()=>commands.length),0);
  const fr=await page.locator('#soccerFeintBtn').boundingBox(),finger={id:2,x:fr.x+fr.width/2,y:fr.y+fr.height/2};
  for(let i=0;i<2;i++){await touch('touchStart',[finger]);await page.clock.runFor(30);await touch('touchEnd',[]);await page.clock.runFor(60);}await page.clock.runFor(400);assert.deepEqual(await page.evaluate(()=>commands.map(c=>c.skill)),['nutmeg']);
  await page.evaluate(()=>commands=[]);await touch('touchStart',[finger]);await page.clock.runFor(350);await page.evaluate(()=>{ctx.defending=true;ctx.enabled=false;controls.update();defense.update();});await touch('touchEnd',[]);await page.clock.runFor(400);assert(!(await page.evaluate(()=>commands.some(c=>c.kind==='slide'))));
  const after=await page.locator('#soccerFeintBtn').boundingBox(),sl=await page.locator('#soccerSlideBtn').boundingBox();assert.equal(fr.x,after.x);assert.equal(fr.y,after.y);assert(after.x+after.width<=sl.x||sl.x+sl.width<=after.x||after.y+after.height<=sl.y||sl.y+sl.height<=after.y,'dash and slide never overlap');
  await page.locator('#soccerTutorialBtn').tap();assert(await page.locator('#soccerTutorial').isVisible());for(const tab of await page.locator('#soccerTutorial [role=tab]').all()){await tab.tap();assert.equal(await tab.getAttribute('aria-selected'),'true');assert(await page.locator('#soccerTutorial video').getAttribute('src'));}await page.locator('#soccerTutorial header button').tap();assert(!(await page.locator('#soccerTutorial').isVisible()));assert.deepEqual(await page.evaluate(()=>opened),[true,false]);
  console.log('PASS threshold, reset/cancel, double tap, persistent dash position, no slide after possession switch, guide tabs',width,height);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
