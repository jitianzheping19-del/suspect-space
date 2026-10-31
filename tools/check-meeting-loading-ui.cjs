// Exercise the shipped parent UI while its 3D iframe is loading or repeatedly losing its GPU.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),s=fs.readFileSync(root+'/index.html','utf8');
const between=(a,b)=>{const start=s.indexOf(a);assert(start>=0,a);const end=s.indexOf(b,start);assert(end>start,b);return s.slice(start,end)};
const state=between('let meetingRecoveryTimer=','\nfunction post3DInit()');
const mode=between('function set3DMode(on)','meeting3DOn=true;setTimeout');
const phase=between('      if(phase !== "meeting" && phase !== "results"){meeting3DFailed=false;','      show("ending", phase === "ended"');
const messages=between('window.addEventListener("message",e=>{const f=meeting3DFrame();','\nfunction post3DUi()');
const sending=between('    let voteSendInFlight=false;','\nfunction nearestTask()');
const voting=between('    function confirmVote(target){','    function guessTargetRestriction(target)');
const html=(s.match(/<style\b[^>]*>[\s\S]*?<\/style>|<link rel="stylesheet" href="[^"]+">/g)||[]).map(tag=>tag.startsWith('<link')?'<style>'+fs.readFileSync(path.join(root,tag.match(/href="([^"]+)"/)[1]),'utf8')+'</style>':tag).join('\n')+between('<section id="meeting"','<section id="guesserPanel"')+'<section id="voteResult" class="overlay hidden"><div class="card">投票結果</div></section>';
const bootstrap=`const $=id=>document.getElementById(id);let meeting3DOn=false,latest3D=null,latest3DResult=null,game={phase:'lobby',round:1,players:{other:{name:'相手',alive:true}},meeting:{id:'qa',votingAt:0,endsAt:Date.now()+300000}},gameViewportMeta=null,gameViewportDefault='',lastVoteResultId='old',ownBallot=null,voteChoice=null;const uid='self';const MEETING_3D_SRCDOC='<div>会議室を読み込み中…</div>';const meeting3DFrame=()=>$('meeting3D'),self=()=>({alive:true});const post3DState=()=>{},post3DInit=()=>{},ssxPhotos={syncFrame(){}},reportMeetingResultReveal=()=>{},closeMeetingKeyboard=()=>{$('chatInput')?.blur();},toast=()=>{},now=()=>Date.now();const show=(id,on)=>$(id).classList.toggle('hidden',!on);const closeVoteConfirm=()=>show('voteConfirm',false);const code='local-qa',connected=true,hostOnline=()=>true,db={},token=()=>String(Date.now()),ref=(_,path)=>({path}),set=async(_,ballot)=>{window.__votes.push(ballot.target)},safeRenderUI=()=>{};${sending}const showVoteResult=()=>show('voteResult',true);window.__votes=[];
${state}\n${mode}\n${messages}\n${voting}
function render(){let phase=game.phase;${phase}}
window.qa={preload(){set3DMode(true)},enter(){game.phase='meeting';show('meeting',true);render()},render,leave(){game.phase='play';show('meeting',false);render()},result(){game.phase='results';game.lastVoteResult={id:'result'}},status(){return{on:meeting3DOn,manual:meeting3DManual2D,failed:meeting3DFailed,rendered:meetingFrameRendered,timer:!!meetingRecoveryTimer,attempts:meetingRecoveryAttempts}},signal(type){$('meeting3D').contentWindow.eval('parent.postMessage({type:'+JSON.stringify(type)+'},"*")')},select(){confirmVote('other')}};
document.body.dataset.phase='meeting';$('meetingTitle').textContent='緊急会議';$('meetingCountdown').textContent='投票終了まで 60秒';$('votePlayers').innerHTML='<button class="voteCard" data-player="other">相手</button>';$('votePlayers').firstChild.onclick=()=>confirmVote('other');`;

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{for(const [width,height]of[[390,844],[844,390],[1024,768],[1366,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true});
  await page.clock.install();await page.setContent(html);await page.addScriptTag({content:bootstrap});
  await page.evaluate(()=>{qa.preload();qa.enter()});
  for(const id of ['votePlayers','meetingChat','skipBtn','meetingLoadingStatus'])assert(await page.locator('#'+id).isVisible(),id+' must be usable immediately');
  assert(await page.locator('#meeting3D').evaluate(e=>e.getClientRects().length>0&&e.inert&&getComputedStyle(e).opacity==='0'));
  await page.locator('[data-player="other"]').click();
  assert(await page.locator('#voteConfirm').isVisible(),'2D votes require confirmation');
  assert.deepEqual(await page.evaluate(()=>__votes),[]);
  await page.locator('#voteConfirmYes').click();
  assert.deepEqual(await page.evaluate(()=>__votes),['other']);
  await page.evaluate(()=>{qa.render();qa.signal('ss3d-rendered')});await page.waitForTimeout(30);
  assert.equal((await page.evaluate(()=>qa.status())).on,false,'a 2D vote must keep its display');
  assert.equal((await page.evaluate(()=>qa.status())).manual,true);
  await page.evaluate(()=>{qa.leave();ownBallot=null;qa.enter()});
  await page.locator('#skipBtn').click();await page.locator('#voteConfirmYes').click();
  assert.deepEqual(await page.evaluate(()=>__votes),['other','skip']);
  await page.evaluate(()=>{qa.leave();ownBallot=null;qa.enter()});
  await page.locator('#chatInput').focus();
  assert(await page.locator('#chatInput').evaluate(e=>document.activeElement===e),'pinning 2D must keep the chat input focused');
  await page.locator('#chatInput').fill('会議を続けます');
  assert.equal((await page.evaluate(()=>qa.status())).manual,true,'typing must keep the 2D chat open');
  await page.evaluate(()=>{qa.leave();qa.enter()});
  await page.locator('#meeting3DBtn').click();await page.evaluate(()=>qa.render());
  assert.equal((await page.evaluate(()=>qa.status())).on,false,'manual 2D must survive UI refresh');
  await page.locator('#meeting3DBtn').click();
  await page.evaluate(()=>qa.signal('ss3d-ready'));await page.waitForTimeout(30);
  assert(await page.locator('#votePlayers').isVisible(),'ready alone is not a rendered frame');
  await page.evaluate(()=>qa.signal('ss3d-rendered'));await page.waitForTimeout(30);
  assert.equal(await page.locator('#meeting').getAttribute('data-render-mode'),'3d');
  assert.equal(await page.locator('#votePlayers').isVisible(),false);
  for(let i=0;i<1;i++){
   await page.evaluate(()=>qa.signal('ss3d-context-lost'));await page.waitForTimeout(30);
   assert(await page.locator('#votePlayers').isVisible(),'GPU loss must restore 2D immediately');
   await page.clock.fastForward(3001);

  }
  let state=await page.evaluate(()=>qa.status());assert.equal(state.failed,true);assert.equal(state.on,false);
  await page.evaluate(()=>{qa.leave();qa.enter()});
  for(let i=0;i<3;i++)await page.clock.fastForward(12001);
  state=await page.evaluate(()=>qa.status());assert.equal(state.failed,true);assert.equal(state.on,false);
  assert(await page.locator('#votePlayers').isVisible());
  await page.evaluate(()=>{qa.leave();qa.enter()});await page.waitForTimeout(100);await page.evaluate(()=>qa.signal('ss3d-rendered'));await page.waitForFunction(()=>qa.status().rendered);
  await page.evaluate(()=>{qa.result();qa.signal('ss3d-context-lost')});await page.waitForTimeout(30);
  assert(await page.locator('#voteResult').isVisible(),'2D results must show when 3D is lost');
  console.log('PASS immediate 2D voting/chat, manual choice, first-frame transition, bounded recovery and results',width,height);
  await page.close();
 }}finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
