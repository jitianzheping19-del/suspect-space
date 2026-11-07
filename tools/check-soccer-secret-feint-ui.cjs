const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({stdin:{contents:"export {createSoccerSecretControls} from './lobby-soccer-secret-ui.js';export {createSoccerFlickControls} from './lobby-soccer-flick.js';export {createLobbyGamesRules} from './lobby-games-rules.js';import './lobby-soccer-match.css';",resolveDir:process.cwd()},bundle:true,format:'iife',globalName:'Secret',write:false,outfile:'controls.js'});
 const html=fs.readFileSync('index.html','utf8'),filter=html.split('    const touchActionButtons=')[1].split('// Host writes only game;')[0];
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height]of [[320,568],[390,844],[568,320],[844,390],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="stick" style="position:fixed;left:20px;bottom:30px;width:80px;height:80px;touch-action:none"></div>');
  await page.clock.install({time:100000});await page.clock.pauseAt(100000);
  await page.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
  await page.addScriptTag({content:'const code="test",game={phase:"lobby"};const touchActionButtons='+filter});
  await page.evaluate(()=>{
   const R=Secret.createLobbyGamesRules(),players={self:{online:true,x:23,z:8,yaw:.4},ally:{online:true,x:23,z:16,yaw:0}};let serial=0;
   window.commands=[];window.pending=false;window.visible=true;
   const context=()=>({visible,secret:state.soccer.secretMode&&state.soccer.status==='playing',enabled:!pending&&R.canKick(state,'self',players,Date.now()),canSkill:R.canSkill(state,'self',players,Date.now()),canDash:true,hasBall:state.soccer.ball.dribbler==='self',yaw:players.self.yaw,rightX:1,rightZ:0,forwardX:0,forwardZ:1});
   const send=(kind,data)=>{const r=R.command(state,{uid:'self',kind,...data,id:'tap'+(++serial),at:Date.now()},players,'self',new Set(),Date.now());commands.push({kind,...data,ok:r.ok});if(r.ok)window.state=r.state;window.refresh();};
   window.flick=Secret.createSoccerFlickControls({document,window,context,send});
   window.powers=Secret.createSoccerSecretControls({document,context:()=>{const c=context();return {g:state.soccer,uid:'self',players,F:R.SOCCER,time:Date.now(),pending,visible,canFeint:c.enabled&&c.canSkill&&c.hasBall};},send,onFeint:()=>flick.feint()});
   window.refresh=()=>{flick.update();powers.update();};
   window.reset=()=>{flick.cancel();commands=[];pending=false;visible=true;window.__spaceInputVector={x:0,z:0};window.state=R.fresh('self',Date.now());Object.assign(state.soccer,{secretMode:true,status:'playing',members:{self:0,ally:0},endAt:Date.now()+180000});Object.assign(state.soccer.ball,{x:23,z:8.7,dribbler:'self'});refresh();};
   // The first reset needs a state before cancel() consults the context.
   window.state=R.fresh('self',Date.now());reset();
  });
  const direct=page.getByRole('button',{name:'分身フェイント',exact:true}),old=page.locator('#soccerFeintBtn');
  for(const button of await page.locator('#soccerSecretPowers button:visible').all()){
   const r=await button.boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);assert(r.width>=43.99&&r.height>=43.99);
   assert(await button.evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'button is reachable without another control covering it');
  }
  assert.equal(await page.locator('[data-power=iron] small').innerText(),'浮き球を待つ');
  assert.equal(await direct.getAttribute('data-state'),'ready');
  await page.addStyleTag({content:'body{background:#163132}'});
  fs.mkdirSync('verification/shaolin-quality',{recursive:true});
  await page.locator('#soccerSecretPowers').screenshot({path:'verification/shaolin-quality/controls-'+width+'.png'});
  await page.getByRole('tab',{name:'奥義',exact:true}).tap();
  assert(await direct.isHidden());
  for(const b of await page.locator('#soccerSecretPowers button:visible').all()){
   const r=await b.boundingBox();assert(r.x>=0&&r.x+r.width<=width&&r.y+r.height<=height&&r.width>=43.99&&r.height>=43.99,JSON.stringify({width,height,label:await b.getAttribute('aria-label'),r}));
   assert(await b.evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'advanced buttons must remain reachable');
  }
  await page.locator('#soccerSecretPowers').screenshot({path:'verification/shaolin-quality/ultimates-'+width+'.png'});
  assert.equal(await page.evaluate(()=>commands.length),0,'changing pages never sends a game action');
  await page.getByRole('tab',{name:'連携',exact:true}).tap();
  assert(await page.getByRole('button',{name:'ドライブシュート',exact:true}).isVisible());
  assert.equal(await page.locator('.soccerSecretAuto:visible').count(),2);
  for(const b of await page.locator('#soccerSecretPowers button:visible').all()){
   const r=await b.boundingBox();assert(r.x>=0&&r.x+r.width<=width&&r.y+r.height<=height&&r.width>=43.99&&r.height>=43.99,JSON.stringify({width,height,label:await b.getAttribute('aria-label'),r}));
   assert(await b.evaluate(b=>{const r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}));
  }
  await page.locator('#soccerSecretPowers').screenshot({path:'verification/shaolin-quality/combinations-'+width+'.png'});
  await page.getByRole('tab',{name:'基本技',exact:true}).tap();
  await direct.tap();await page.clock.runFor(500);await page.evaluate(()=>refresh());
  assert.equal(await direct.getAttribute('data-state'),'active');
  assert.equal(await page.locator('#soccerSecretAnnouncement').innerText(),'分身フェイント！');
  assert.deepEqual(await page.evaluate(()=>commands.map(c=>[c.kind,c.skill,c.ok])),[['soccer-skill','doubleTouch',true]]);assert(await direct.isDisabled(),'cooldown blocks repeat input');
  await page.clock.runFor(250);await page.evaluate(()=>refresh());
  assert.equal(await direct.getAttribute('data-state'),'cooldown');
  assert.equal(await direct.locator('small').innerText(),'回復中');
  const refill=await direct.evaluate(b=>Number(b.style.getPropertyValue('--recharge')));assert(refill>0&&refill<1);
  await page.clock.runFor(450);await page.evaluate(()=>refresh());assert(await direct.isEnabled());
  // A second finger can feint left while the first finger stays on the joystick.
  await page.evaluate(()=>{reset();window.__spaceInputVector.x=-1;});
  const cdp=await page.context().newCDPSession(page),r=await direct.boundingBox(),left={id:1,x:50,y:height-60},right={id:2,x:r.x+r.width/2,y:r.y+r.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.deepEqual(await page.evaluate(()=>commands.map(c=>[c.kind,c.side,c.yaw,c.ok])),[['soccer-skill',-1,.4,true]]);
  // Replacing a queued tap or charged kick must not release a second action later.
  for(const queued of ['feint','kick']){
   await page.evaluate(()=>reset());await page.locator(queued==='feint'?'#soccerFeintBtn':'#soccerKickBtn').tap();await page.clock.runFor(70);await direct.tap();await page.clock.runFor(500);
   assert.deepEqual(await page.evaluate(()=>commands.map(c=>c.kind)),['soccer-skill'],queued+' queued action cancelled');
  }
  await page.evaluate(()=>reset());const k=await page.locator('#soccerKickBtn').boundingBox(),held={id:3,x:k.x+k.width/2,y:k.y+k.height/2};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held]});await page.clock.runFor(800);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[held,right]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.clock.runFor(500);
  assert.deepEqual(await page.evaluate(()=>commands.map(c=>[c.kind,c.ok])),[['soccer-skill',true]],'charged shot cancelled on feint');
  await page.evaluate(()=>reset());for(let i=0;i<3;i++){await old.tap();await page.clock.runFor(65);}await page.clock.runFor(400);
  assert.deepEqual(await page.evaluate(()=>commands.map(c=>c.kind)),['soccer-hand']);assert.equal(await page.evaluate(()=>state.soccer.ball.handOwner),'self');assert(await direct.isDisabled());
  await page.evaluate(()=>reset());await direct.focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>commands.length),1);
  await page.evaluate(()=>{reset();pending=true;refresh();});assert(await direct.isDisabled());
  for(const status of ['countdown','finished']){await page.evaluate(status=>{reset();state.soccer.status=status;refresh();},status);assert(await direct.isHidden());}
  await page.evaluate(()=>{reset();state.soccer.secretMode=false;refresh();flick.feint();});assert(await direct.isHidden());assert.equal(await page.evaluate(()=>commands.length),0);
  await old.tap();await page.clock.runFor(400);assert.equal(await page.evaluate(()=>commands.at(-1).skill),'doubleTouch','ordinary feint preserved');
  await page.evaluate(()=>{reset();visible=false;refresh();flick.feint();});assert(await direct.isHidden());assert.equal(await page.evaluate(()=>commands.length),0);
  assert.deepEqual(errors,[]);console.log('PASS dedicated feint: real touch filter, layout, second finger, cooldown, charge/tap cancellation, hand command and normal mode',width,height);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
