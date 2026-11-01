const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const source=fs.readFileSync('index.html','utf8');
 const styles=[...source.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('\n');
 // The actual render branch must resume immediately after an opaque launch,
 // and keep drawing the map behind the translucent meeting-return countdown.
 const vm=require('vm');
 const drawBranch=source.slice(source.indexOf('      const launchPresentationActive='),source.indexOf('      recordPerformanceFrame(time,performance.now()-frameWorkStarted);'));
 for(const [phase,kind,active,reveal,expected]of [
  ['play','launch',true,false,0],['play','post-role',true,false,0],['play','launch',false,true,0],
  ['play','meeting-return',true,false,1],['play','post-role',false,false,1]
 ]){
  let draws=0;const context={game:{phase},taskViewActive:false,time:0,renderer:{},renderBudget:{shadows(){}},
   actionHud3D:{draw(){}},lobbyAction3D:{draw(){}},drawVisibilityFrame:()=>draws++,isWaitingLobbyForRunningMatch:()=>false,
   $:id=>id==='roleReveal'?{classList:{contains:()=>!reveal}}:{dataset:{kind,countdownActive:String(active)}}};
  vm.runInNewContext(drawBranch,context);assert.equal(draws,expected,kind+' map rendering');
 }
 console.log('PASS opaque launch skips GPU drawing; play and meeting-return resume drawing');
 const countdown=source.match(/<section id="gameCountdown"[\s\S]*?<\/section>/)[0];
 const roles=source.match(/<section id="roundRoles"[\s\S]*?<\/section>/)[0];
 const render=source.slice(source.indexOf('      const countdownLeft = phase'),source.indexOf('      const countdownProgress=document'));
 const compiled=await build({stdin:{contents:"import {updateCountdownPresentation} from './countdown-presentation.js';window.updateCountdownPresentation=updateCountdownPresentation",resolveDir:process.cwd()},bundle:true,write:false,outfile:'test.js',format:'iife'});
 const js=compiled.outputFiles.find(f=>f.path.endsWith('.js')).text,css=compiled.outputFiles.find(f=>f.path.endsWith('.css')).text;
 const out=path.resolve('../artifacts/countdown-role-smooth-2026-10-30');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  for(const order of ['pages','gas'])for(const size of [{width:390,height:844},{width:844,height:390},{width:1024,height:768},{width:1366,height:768}]){
   const page=await browser.newPage({viewport:size,hasTouch:size.width<1300});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent((order==='pages'?'<style>'+css+'</style>'+styles:styles+'<style>'+css+'</style>')+countdown+roles);
   await page.addScriptTag({content:js});
   await page.evaluate(render=>{
    window.$=id=>document.getElementById(id);window.now=()=>Date.now();window.code='test';window.phase='play';window.pendingRoleReveal=null;
    window.show=(id,value)=>$(id).classList.toggle('hidden',!value);
    const reveal=document.createElement('div');reveal.id='roleReveal';reveal.className='hidden';document.body.append(reveal);
    document.body.dataset.phase='play';window.game={round:1,countdownKind:'launch',countdownEndsAt:now()+5000,playStartsAt:now()+15000,meetingCount:0,settings:{waveMode:'normal'}};
    window.renderRoundRoleList=()=>{
     $('roundRoles').classList.add('roundRolesFitsContent');$('roundRoleList').dataset.roleLayout='quality';
     $('roundRoleList').innerHTML=['クルー','インポスター','第三陣営'].map((name,index)=>'<div class="roleFactionColumn"><h3 class="roleFactionHeading">'+name+'</h3><div class="roleFactionCards">'+Array.from({length:8},(_,i)=>'<button class="roleChoiceButton"><span class="roleChoiceTitle">'+['シェリフ','サムライ','ジャッカル'][index]+(i+1)+'</span><span class="roleChoiceBadge">1人</span></button>').join('')+'</div></div>').join('');
    };
    window.renderCountdown=new Function(render);renderCountdown();
   },render);
   const layout=await page.evaluate(()=>{
    const r=$('roundRoles'),button=r.querySelector('button.roleChoiceButton'),rect=button.getBoundingClientRect(),digit=$('gameCountdownNumber').getBoundingClientRect(),title=$('roundRolesTitle').getBoundingClientRect();
    return {display:getComputedStyle(r).display,visibility:getComputedStyle(r).visibility,hit:document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)===button||button.contains(document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)),text:$('gameCountdownNumber').textContent,digit:digit.toJSON(),title:title.toJSON(),width:innerWidth};
   });
   assert.notEqual(layout.display,'none',order+' role list visible');assert.equal(layout.visibility,'visible');assert(layout.hit,'role details must be tappable');assert.equal(layout.text,'5');
   assert(layout.digit.bottom<=layout.title.top,'countdown must not overlap title');assert(layout.digit.x>=0&&layout.digit.right<=layout.width);
   await page.screenshot({path:path.join(out,order+'-'+size.width+'.png')});
   // Exercise the real visibility branch at the end of the five seconds.
   await page.evaluate(()=>{game.countdownEndsAt=now()-1;pendingRoleReveal={room:code,round:1};renderCountdown();});
   assert(await page.locator('#roundRoles').evaluate(e=>e.classList.contains('hidden')),'list closes for personal role reveal');
   await page.evaluate(()=>{pendingRoleReveal=null;game.playStartsAt=now()+3000;renderCountdown();});
   assert.equal(await page.locator('#gameCountdown').getAttribute('data-kind'),'post-role');
   await page.evaluate(()=>{game.meetingCount=1;game.countdownKind='meeting-return';game.countdownEndsAt=now()+3000;renderCountdown();});
   assert.equal(await page.locator('#gameCountdown').getAttribute('data-kind'),'meeting-return');
   assert(await page.locator('#roundRoles').evaluate(e=>e.classList.contains('hidden')));
   assert.deepEqual(errors,[]);console.log('PASS role-list visibility, touch hit, countdown separation and phase cleanup',order,size.width);await page.close();
  }
  const page=await browser.newPage();await page.setContent('<style>'+css+'</style>'+countdown);await page.addScriptTag({content:js});
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  for(const kind of ['post-role','meeting-return']){
   await page.evaluate(kind=>{
    const stage=document.getElementById('gameCountdown');stage.dataset.kind=kind;
    window.deadline=performance.now()+3000;window.sequence=kind;
    updateCountdownPresentation(stage,3,{remainingMs:3000,sequence:kind});
    window.artNode=stage.querySelector(kind==='post-role'?'.ringRotor':'.impulseOrbit');window.artAnimation=artNode.getAnimations()[0];
    window.initialTransform=getComputedStyle(artNode).transform;
   },kind);
   // No HUD updates at all for a second: both the art and number must advance.
   await page.waitForTimeout(1150);
   const state=await page.evaluate(()=>{
    const stage=document.getElementById('gameCountdown'),before=artAnimation;
    updateCountdownPresentation(stage,2,{remainingMs:deadline-performance.now(),sequence});
    return {digit:stage.querySelector('.countdownDigit').textContent,changed:getComputedStyle(artNode).transform!==initialTransform,same:before===artNode.getAnimations()[0],elapsed:before.currentTime};
   });
   assert.equal(state.digit,'2');assert(state.changed);assert(state.same,'HUD update must not restart the art');assert(state.elapsed>=1000);
   await page.waitForTimeout(1950);
   assert.equal(await page.locator('#gameCountdown').getAttribute('data-countdown-active'),'false');
   assert.equal(await page.locator('#gameCountdown').evaluate(e=>e.getAnimations({subtree:true}).length),0,'deadline cancels all effects');
   console.log('PASS continuous art/digits without HUD ticks, stable animation, deadline cleanup under 4x CPU slowdown',kind);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.evaluate(()=>{const s=document.getElementById('gameCountdown');updateCountdownPresentation(s,3,{sequence:'reduced'});return s.getAnimations({subtree:true}).length;}),0);
  await page.evaluate(()=>{const s=document.getElementById('gameCountdown');updateCountdownPresentation(s,0,{visible:false});});
  assert.equal(await page.locator('#gameCountdown').getAttribute('data-countdown-active'),'false');
  await page.close();
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
