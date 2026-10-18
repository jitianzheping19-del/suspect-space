// Real game DOM/input and the existing renderer, with Firebase replaced in memory.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createServer}=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'tmp/action-hud-3d');fs.mkdirSync(out,{recursive:true});
const old=fs.readFileSync(path.join(__dirname,'check-room-rejoin.cjs'),'utf8');
const {fakeDatabase,fixture}=vm.runInNewContext(old.slice(old.indexOf('const fakeDatabase='),old.indexOf('(async()=>{'))+'\n({fakeDatabase,fixture})');
const probes=`
window.__actionsQA={
 role(role,cooldown=0){
  clearTimeout(roleRevealTimer);clearTimeout(revealDelayTimer);pendingRoleReveal=null;$("roleReveal").classList.add("hidden");
  const me=game.players[uid];me.role=['crewmate','scientist','guardianAngel'].includes(role)?'crew':'impostor';me.subrole=role;me.alive=true;me.observer=false;me.disconnected=false;me.readyAt=now()+cooldown;me.abilityReadyAt=now()+cooldown;me.ventId='';
  const spawn=findCafeteriaSpawn(0);position.x=spawn.x;position.z=spawn.z;
  Object.assign(players[uid],spawn);Object.assign(me,spawn);
  Object.assign(players[hostId],{x:spawn.x+1.1,z:spawn.z,online:true});Object.assign(game.players[hostId],{x:spawn.x+1.1,z:spawn.z,alive:true});
  for(const a of avatars.values())delete a.userData.remotePoseSamples;
  game.settings.killCooldownSeconds=10;game.settings.samuraiCooldownSeconds=10;safeRenderUI();actionHud3D.invalidate();
 },
 state(){const context=document.createElement('canvas').getContext('2d');const rect=id=>{const b=$(id),r=b.getBoundingClientRect(),style=getComputedStyle(b),text=(b.querySelector('#abilityCaption,#rocketLaunchCaption')||b).textContent;context.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;return {id,x:r.x,y:r.y,w:r.width,h:r.height,disabled:b.disabled,text:b.textContent,textWidth:context.measureText(text).width,availableWidth:r.width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-parseFloat(style.borderLeftWidth)-parseFloat(style.borderRightWidth),visible:!b.closest('.hidden')&&r.width>0&&r.height>0&&style.visibility!=='hidden'};};
  return {hud:actionHud3D.getStats(),buttonPanel:rect('buttons'),buttons:[...$("buttons").querySelectorAll(':scope>button')].map(b=>rect(b.id)),top:['role','taskProgressHud','roundRoleBtn','mapBtn','titleInputSettingsBtn'].map(rect),
    stick:rect('stick'),joystick:{...joystick},pointerId,canvasCount:document.querySelectorAll('#viewport canvas').length,
    hit:document.elementFromPoint($('stick').getBoundingClientRect().x+$('stick').getBoundingClientRect().width*.7,$('stick').getBoundingClientRect().y+$('stick').getBoundingClientRect().height/2)?.id,modal:modalVisible(),touch:joystickTouchId,fallback:joystickTouchFallback,
    errors:$("uiRecoveryMessage").textContent,recoveryVisible:!$("uiRecoveryBanner").classList.contains('hidden'),writes:window.__qaWrites.filter(w=>w.path.includes('/commands/')).length,trace:window.__touchTrace};},
 trace(){window.__touchTrace=[];const original=resetInput;resetInput=()=>{window.__touchTrace.push({type:'reset',stack:new Error().stack});original()};
   for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture','touchstart','touchend','touchcancel'])document.addEventListener(type,e=>window.__touchTrace.push({type,target:e.target.id,pointer:e.pointerId,touches:e.touches?[...e.touches].map(t=>t.identifier):null,changed:e.changedTouches?[...e.changedTouches].map(t=>t.identifier):null}),true);},
 modal(open){show('roleMonitorModal',open);actionHud3D.invalidate();},
 phase(phase){game.phase=phase;safeRenderUI();actionHud3D.invalidate();},
 spent(){game.players[uid].samuraiUsed=true;safeRenderUI();actionHud3D.invalidate();}
};`;
(async()=>{
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const results=[];
 try{
 for(const [width,height,touch] of (process.env.ACTION_QA_TOUCH_ONLY?[[1024,768,true]]:[[1280,800,false],[1024,768,true],[1366,1024,true],[844,390,true]])){
  const file='space-suspect-complete.html',page=await browser.newPage({viewport:{width,height},isMobile:touch,hasTouch:touch}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/firebase-database.js',r=>r.fulfill({body:fakeDatabase,contentType:'application/javascript'}));
  await page.route(/(?:firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)/,r=>r.abort());
  await page.route('**/'+file,r=>r.fulfill({body:fs.readFileSync(path.join(root,file),'utf8').replace('function showMeetingIntro(reason)',fixture+probes+'\nfunction showMeetingIntro(reason)').replace('if(!skipAutoLoginOnce){setTimeout(()=>connectFirebase(""),0);}',''),contentType:'text/html'}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/'+file,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__actionsQA,{timeout:90000});
  await page.evaluate(()=>window.__rejoinQA.load('2d'));
  const layouts=[];
  for(const role of ['impostor','samurai','doubleKiller','scientist']){
    await page.evaluate(role=>window.__actionsQA.role(role),role);
    await page.waitForFunction(()=>window.__actionsQA.state().hud.active,{},{timeout:10000});await page.waitForTimeout(350);
    const s=await page.evaluate(()=>window.__actionsQA.state());
    fs.writeFileSync(path.join(out,'latest-state.json'),JSON.stringify({width,height,role,...s},null,2));
    await page.screenshot({path:path.join(out,width+'-'+height+'-'+role+'.png')});
    const buttons=s.buttons.filter(b=>b.visible&&b.id!=='mapBtn');
    for(const b of buttons){assert(b.x>=0&&b.y>=0&&b.x+b.w<=width+1&&b.y+b.h<=height+1,'offscreen '+JSON.stringify(b));if(height>=600)assert.equal(b.h,82,'tablet/desktop buttons must be taller');assert(b.textWidth<=b.availableWidth+2,'caption overflow '+JSON.stringify(b));}
    const useButton=s.buttons.find(b=>b.id==='taskBtn'&&b.visible),killButton=s.buttons.find(b=>b.id==='killBtn'&&b.visible);
    if(useButton&&killButton){assert(Math.abs(useButton.w-killButton.w)<=1,'use and kill buttons must share the same width');assert(useButton.w<s.buttonPanel.w*.96,'use and kill buttons must be slightly narrower than their action row');}
    for(let a=0;a<buttons.length;a++)for(let b=a+1;b<buttons.length;b++){const x=buttons[a],y=buttons[b];assert(x.x+x.w<=y.x+1||y.x+y.w<=x.x+1||x.y+x.h<=y.y+1||y.y+y.h<=x.y+1,'overlapping buttons '+x.id+' / '+y.id+' at '+width);}
    const top=s.top.filter(b=>b.visible);
    for(let a=0;a<top.length;a++)for(let b=a+1;b<top.length;b++){const x=top[a],y=top[b];assert(x.x+x.w<=y.x+1||y.x+y.w<=x.x+1||x.y+x.h<=y.y+1||y.y+y.h<=x.y+1,'overlapping top controls '+x.id+' / '+y.id+' at '+width);}
    assert.equal(s.canvasCount,1,'HUD must reuse the game WebGL canvas');assert(!s.recoveryVisible,s.errors);assert(s.hud.draws>0);layouts.push({role,buttons,hud:s.hud});
  }
  await page.evaluate(()=>window.__actionsQA.role('samurai',8000));await page.waitForTimeout(550);
  let s=await page.evaluate(()=>window.__actionsQA.state());const cooling=s.hud.visible.find(b=>b.id==='killBtn');assert(cooling.cooldown>0&&cooling.cooldownIndices>0&&cooling.cooldownIndices<288,'kill cooldown arc absent');assert(s.buttons.find(b=>b.id==='killBtn').disabled);
  const disabledKill=s.buttons.find(b=>b.id==='killBtn'),writes=s.writes;await page.mouse.click(disabledKill.x+disabledKill.w/2,disabledKill.y+disabledKill.h/2);
  assert.equal((await page.evaluate(()=>window.__actionsQA.state())).writes,writes,'disabled kill fired an action');
  await page.screenshot({path:path.join(out,width+'-'+height+'-cooldown.png')});
  await page.evaluate(()=>window.__actionsQA.spent());await page.waitForFunction(()=>window.__actionsQA.state().hud.visible.find(b=>b.id==='abilityBtn')?.spent);await page.screenshot({path:path.join(out,width+'-'+height+'-spent.png')});
  if(touch){
    await page.evaluate(()=>window.__actionsQA.role('samurai'));await page.waitForTimeout(550);s=await page.evaluate(()=>window.__actionsQA.state());
    const stick=s.stick,kill=s.buttons.find(b=>b.id==='killBtn');assert(!kill.disabled,'fixture kill must be available');
    const cdp=await page.context().newCDPSession(page),one={id:1,x:stick.x+stick.w*.7,y:stick.y+stick.h/2};
    await page.evaluate(()=>window.__actionsQA.trace());
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[one]});
    const first=await page.evaluate(()=>window.__actionsQA.state());
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...one,x:one.x+4}]});
    const moved=await page.evaluate(()=>window.__actionsQA.state());
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...one,x:one.x+4},{id:2,x:kill.x+kill.w/2,y:kill.y+kill.h/2}]});
    // Chromium releases the listed contact; keep the joystick contact alive.
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{id:2,x:kill.x+kill.w/2,y:kill.y+kill.h/2}]});
    s=await page.evaluate(()=>window.__actionsQA.state());if(Math.abs(s.joystick.x)<=.1){fs.writeFileSync(path.join(out,'touch-failure.json'),JSON.stringify({first,moved,after:s},null,2));}assert(Math.abs(s.joystick.x)>.1,'kill released held joystick');assert(s.writes>0,'kill tap did not reach existing game handler');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }
  await page.evaluate(()=>window.__actionsQA.modal(true));await page.waitForTimeout(300);s=await page.evaluate(()=>window.__actionsQA.state());assert(!s.hud.active,'3D HUD visible while modal is open');
  await page.evaluate(()=>window.__actionsQA.modal(false));await page.waitForTimeout(300);
  await page.evaluate(()=>window.__actionsQA.phase('lobby'));await page.waitForTimeout(350);s=await page.evaluate(()=>window.__actionsQA.state());assert(!s.hud.active,'3D HUD visible in lobby');
  assert.deepEqual(errors,[]);results.push({viewport:[width,height],touch,layouts,pageErrors:errors});console.log('PASS',width+'x'+height,'roles, bounds, one canvas, cooldown, overlays'+(touch?', moving kill':''));await page.close();
 }
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
