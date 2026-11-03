const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['lobby-soccer-flick.js'],bundle:true,write:false,outfile:'flick.js',format:'iife',globalName:'Flick'});
 const html=fs.readFileSync('index.html','utf8'),filter=html.split('    const touchActionButtons=')[1].split('// Host writes only game;')[0];
 const reset=html.slice(html.indexOf('function resetInput() {'),html.indexOf('window.SpaceSuspect.runtime.stopGameInputForModal='));
 const stick=html.slice(html.indexOf('function updateStick(event) {'),html.indexOf('    // A second finger activates actions'));
 const inputFixture=`const joystick={x:0,z:0},keys=new Set();let pointerId=null,joystickTouchId=null,joystickTouchFallback=false;
 const $=id=>id==='lobbyAttachedFrame'?{contentWindow:{postMessage(){}}}:document.getElementById(id);
 const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),modalVisible=()=>false,isLobbyInteractionActive=()=>true,self=()=>({alive:true});`;
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height] of [[844,390],[390,844],[568,320],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#174b39}#stick{position:fixed;bottom:30px;left:20px;width:90px;height:90px;touch-action:none}</style><div id="stick"><div id="knob"></div></div><div id="setup" class="hidden"></div><div id="controls"></div>');await page.clock.install();
  await page.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
  await page.addScriptTag({content:'const code="test",game={phase:"lobby"};'+inputFixture+reset+stick+'const touchActionButtons='+filter});
  await page.evaluate(()=>{window.ctx={visible:true,enabled:true,canSkill:true,yaw:0,rightX:1,rightZ:0,forwardX:0,forwardZ:1};window.commands=[];window.flick=Flick.createSoccerFlickControls({document,window,context:()=>ctx,send:(kind,data)=>commands.push({kind,...data})});flick.update();});
  assert.equal(await page.locator('#soccerFlickZone button').count(),0);
  const rect=await page.locator('#soccerFlickZone').boundingBox(),x=rect.x+rect.width*.5,y=rect.y+rect.height*.45,cdp=await page.context().newCDPSession(page);
  async function stroke(points,hold=0,cancel=false){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+points[0][0],y:y+points[0][1]}]});if(hold)await page.clock.runFor(hold);for(const [dx,dy]of points.slice(1)){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});await page.clock.runFor(12);}await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await page.clock.runFor(30);}
  await stroke([[0,0],[0,-30],[0,-55]]);assert.equal(await page.evaluate(()=>commands.at(-1).mode),'pass');
  await stroke([[0,0],[35,0],[55,0]],500);const shot=await page.evaluate(()=>commands.at(-1));assert.equal(shot.mode,'shot');assert(shot.power>.5);assert(Math.abs(shot.yaw-Math.PI/2)<.01);
  const stickRect=await page.locator('#stick').boundingBox(),sx=stickRect.x+stickRect.width/2,sy=stickRect.y+stickRect.height/2;
  const right={id:1,x,y},left=(dx=0,dz=0)=>({id:2,x:sx+dx*30,y:sy+dz*30});
  async function touches(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});await page.clock.runFor(35);}
  const count=()=>page.evaluate(()=>commands.length);
  let expected=await count();
  // Movement alone never selects a skill.
  await touches('touchStart',[left()]);await touches('touchMove',[left(1,0)]);await touches('touchEnd',[]);assert.equal(await count(),expected);
  for(const held of [false,true])for(const [dx,dz,skill]of [[-1,0,'roulette'],[1,0,'roulette'],[0,-1,'doubleTouch'],[0,1,'heelLift']]){
   await page.evaluate(()=>{ctx.yaw=.8;});
   await touches('touchStart',[right]);
   if(!held)await touches('touchEnd',[]);
   await page.evaluate(()=>{ctx.yaw=2;});
   await touches('touchStart',[...(held?[right]:[]),left()]);
   await touches('touchMove',[...(held?[right]:[]),left(dx,dz)]);
   const move=await page.evaluate(()=>commands.at(-1));assert.equal(move.skill,skill);assert.equal(move.yaw,.8,'skill uses facing at the right press');assert.equal(move.side,dx<0?-1:1);assert.equal(await count(),++expected);
   await touches('touchMove',[...(held?[right]:[]),left(-dx,-dz)]);await page.clock.runFor(1200);await touches('touchEnd',[]);assert.equal(await count(),expected,'one skill, no extra shot on release');
  }
  // An already held direction is ignored until the stick changes direction.
  await touches('touchStart',[left(0,-1)]);await touches('touchStart',[left(0,-1),right]);await page.clock.runFor(200);assert.equal(await count(),expected);
  await touches('touchMove',[left(1,0),right]);assert.equal((await page.evaluate(()=>commands.at(-1))).skill,'roulette');assert.equal(await count(),++expected);await touches('touchEnd',[]);
  // Cancels and expired taps must not leave a queued skill behind.
  for(const cancel of ['expiry','cancel','blur','disabled','possession','exit']){
   await touches('touchStart',[right]);await touches(cancel==='cancel'?'touchCancel':'touchEnd',[]);
   if(cancel==='expiry')await page.clock.runFor(1100);
   if(cancel==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   if(cancel==='disabled')await page.evaluate(()=>{ctx.enabled=false;flick.update();ctx.enabled=true;});
   if(cancel==='exit')await page.evaluate(()=>{ctx.visible=false;flick.update();ctx.visible=true;flick.update();});
   if(cancel==='possession'){await page.evaluate(()=>{ctx.canSkill=false;});await page.clock.runFor(35);await page.evaluate(()=>{ctx.canSkill=true;});}
   await touches('touchStart',[left()]);await touches('touchMove',[left(0,1)]);await touches('touchEnd',[]);assert.equal(await count(),expected,cancel+' clears queued skill');
  }
  // Right-side passing and shooting still work after using skills.
  await stroke([[0,0],[0,-55]]);assert.equal((await page.evaluate(()=>commands.at(-1))).mode,'pass');expected++;
  await stroke([[0,0],[55,0]],500);assert.equal((await page.evaluate(()=>commands.at(-1))).mode,'shot');expected++;
  await stroke([[0,0],[50,0]],0,true);assert.equal(await count(),expected);
  await page.evaluate(()=>{ctx.enabled=false;flick.update();});await stroke([[0,0],[55,0]]);assert.equal(await count(),expected);
  await page.evaluate(()=>{ctx.visible=false;flick.update();});assert(await page.locator('#soccerFlickZone').isHidden());
  console.log('PASS real joystick handlers, tap/hold + four directions, single action, stale input/cancel guards, pass and shot',width,height);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
