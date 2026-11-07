const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({stdin:{contents:"export {createSoccerFlickControls} from './lobby-soccer-flick.js';export {createSoccerDefenseControls} from './lobby-soccer-defense-ui.js';",resolveDir:process.cwd()},bundle:true,write:false,outfile:'controls.js',format:'iife',globalName:'Controls'});
 const html=fs.readFileSync('index.html','utf8'),styles=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
 const reset=html.slice(html.indexOf('function resetInput() {'),html.indexOf('window.SpaceSuspect.runtime.stopGameInputForModal='));
 const stick=html.slice(html.indexOf('function updateStick(event) {'),html.indexOf('    // A second finger activates actions'));
 const filter=html.split('    const touchActionButtons=')[1].split('// Host writes only game;')[0];
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height] of [[390,844],[844,390],[568,320],[1024,768]]){
  const p=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="controls"><div id="stick"><div id="knob"></div></div></div><div id="setup" class="hidden"></div>');
  await p.clock.install();await p.addStyleTag({content:styles});await p.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});
  await p.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
  await p.addScriptTag({content:`const joystick={x:0,z:0},keys=new Set();let pointerId=null,joystickTouchId=null,joystickTouchFallback=false;const code='TEST',game={phase:'lobby'};const $=id=>id==='lobbyAttachedFrame'?{contentWindow:{postMessage(){}}}:document.getElementById(id);const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),modalVisible=()=>false,isLobbyInteractionActive=()=>true,self=()=>({alive:true});${reset}${stick}const touchActionButtons=${filter}`});
  await p.evaluate(()=>{
   document.body.dataset.phase='lobby';window.ctx={visible:true,enabled:true,hasBall:true,canDash:true,canSkill:true,canSlide:true,canPress:true,yaw:0,rightX:1,rightZ:0,forwardX:0,forwardZ:1};window.dashes=[];
   const context=()=>({...ctx,attackDashHeld:window.attack?.dashHeld,defenseDashHeld:window.defense?.dashHeld}),sendDash=held=>dashes.push(held);
   window.defense=Controls.createSoccerDefenseControls({document,window,context,sendDash,sendPress(){},sendSlide(){}});
   window.attack=Controls.createSoccerFlickControls({document,window,context,sendDash,send(){}});window.refresh=()=>{attack.update();defense.update();};refresh();
  });
  const cdp=await p.context().newCDPSession(p),touch=async(type,points)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});await p.clock.runFor(25);};
  const center=async(id)=>{const r=await p.locator('#'+id).boundingBox();assert(r);return {id:1,x:r.x+r.width/2,y:r.y+r.height/2};};
  // Both physical dash buttons keep their original pointer through owner changes.
  for(const origin of ['attack','defense']){
   await p.evaluate(origin=>{ctx.hasBall=origin==='attack';ctx.teammateBall=false;ctx.defending=false;ctx.canDash=true;ctx.dashing=false;dashes.length=0;refresh();},origin);
   const finger=await center(origin==='attack'?'soccerFeintBtn':'soccerPressBtn');await touch('touchStart',[finger]);await p.clock.runFor(350);assert.equal(await p.evaluate(()=>dashes.at(-1)),true);
   for(const owner of ['enemy','self','friend','loose']){
    await p.evaluate(owner=>{ctx.hasBall=owner==='self';ctx.teammateBall=owner==='friend';ctx.defending=owner==='enemy';refresh();},owner);await p.clock.runFor(300);
    assert.equal(await p.evaluate(()=>dashes.includes(false)),false,'owner change must not release dash: '+origin+'/'+owner);
   }
   await p.evaluate(()=>{ctx.canDash=false;ctx.dashing=false;refresh();});await p.clock.runFor(600);assert.equal(await p.evaluate(()=>dashes.includes(false)),false,'hold survives stamina recovery');
   const count=await p.evaluate(()=>dashes.length);await p.evaluate(()=>{ctx.canDash=true;refresh();});await p.clock.runFor(300);assert((await p.evaluate(()=>dashes.length))>count);
   await touch('touchEnd',[]);assert.equal(await p.evaluate(()=>dashes.at(-1)),false);await p.evaluate(()=>refresh());
  }
  const stickCenter=await center('stick');await touch('touchStart',[stickCenter]);await touch('touchMove',[{...stickCenter,x:stickCenter.x+30,y:stickCenter.y-15}]);assert(await p.evaluate(()=>Math.abs(__spaceInputVector.x)>.1));await touch('touchEnd',[]);
  for(const size of [110,150,190]){
   await p.evaluate(size=>{document.documentElement.style.setProperty('--stick-size',size+'px');document.documentElement.style.setProperty('--knob-size',size*64/150+'px');},size);
   const result=await p.evaluate(()=>{const a=document.getElementById('stick').getBoundingClientRect(),b=document.getElementById('knob').getBoundingClientRect();return {dx:a.x+a.width/2-b.x-b.width/2,dy:a.y+a.height/2-b.y-b.height/2,v:__spaceInputVector};});assert(Math.abs(result.dx)<.1&&Math.abs(result.dy)<.1,JSON.stringify(result));assert.deepEqual(result.v,{x:0,z:0});
  }
  assert.deepEqual(errors,[]);await p.close();console.log('PASS touch dash survives all possession changes/recovery; release stops; actual CSS stick centers at three sizes',width,height);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
