// Real built UI with local-only Firebase and deterministic meeting states.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.resolve(__dirname,'check-sabotage-input.cjs');
let source=fs.readFileSync(filename,'utf8').replace("path.resolve(root,'../qa-dist')","path.resolve(root,'qa-vote-dist')");
const probe=`window.__voteGhostQA={
 pause(){renderContextLost=true;cancelAnimationFrame(frameRequestId);},
 prepare(alive=false){__sabotageQA.prepare({alive});renderContextLost=true;cancelAnimationFrame(frameRequestId);ownBallot=null;self().role='crew';self().subrole='crewmate';game.players.host.role='impostor';game.players.crew2.tasks={fuel:true};renderUI();},
 refresh(){renderUI();return {vector:{...joystick},pointer:pointerId,phase:game.phase};},
 revive(){self().alive=true;renderUI();},
 progress(){game.players.crew3.tasks={fuel:true};renderUI();},
 follow(){spectatorManual=false;spectatorTargetId='crew2';renderUI();},
 meeting({left=9,alive=true,voted=false,discussion=false,three=false}={}){
  this.prepare(alive);self().role='crew';self().subrole='crewmate';game.phase='meeting';
  meeting3DManual2D=!three;if(!three)set3DMode(false);
  game.meeting={id:'qa-vote',startedAt:now()-100000,presentationEndsAt:now()-90000,votingAt:now()+(discussion?20000:-30000),endsAt:now()+left*1000,reporter:'host',reason:'緊急会議',voted:voted?{qa:true}:{},chat:[],rosterOrder:Object.keys(game.players),rosterAliveOrder:Object.keys(game.players)};
  if(voted)ownBallot={round:game.round,meeting:'qa-vote',target:'skip'};
  renderUI();post3DState(latest3D);post3DUi();
 },
 vote(){ownBallot={round:game.round,meeting:game.meeting.id,target:'skip'};game.meeting.voted.qa=true;renderUI();post3DState(latest3D);post3DUi();},
 death(){self().alive=false;renderUI();post3DState(latest3D);post3DUi();},
 finish(ballots,options={}){
  const g={phase:'meeting',round:1,settings:{anonymousVotes:!!options.anonymous},players:Object.fromEntries(['a','b','c','d'].map(id=>[id,{name:id,alive:true,role:'crew',subrole:'crewmate'}])),meeting:{id:'test',startedAt:1,votingAt:1,voteSwaps:options.swaps||[],...(options.scales?{scalesVote:{targets:['a','b']}}:{})},bodies:{}};
  if(options.mayor)Object.assign(g.players.d,{mayorBoostMeeting:'test',mayorVoteWeight:5});
  finishMeeting(g,ballots);return {result:g.lastVoteResult,history:g.voteHistory[0]};
 },
 introductions(){return {ids:Object.keys(ROLE_INTRODUCTIONS),labels:Object.keys(ROLE_LABELS),doorDefault:ROLE_COOLDOWN_SETTINGS.doorerCooldownSeconds.default,doorActual:upgradedRoleCooldownMs('doorer',{}),doorInput:Number($('doorerCooldownSeconds').defaultValue),view:Object.keys(ROLE_LABELS).map(id=>({id,text:createRoleAbilityPresentation(id).textContent,hasSettings:!!createRoleAbilityPresentation(id).querySelector('.roleTimePreview,.roleAbilityStats')})),settings:!!createRoleAbilityPresentation('doorer',{fromInputs:true}).querySelector('.roleTimePreview')};},
 roles(){return {roles:ROLE_OPTIONS.map(r=>({...r,name:ROLE_LABELS[r.id]?.[0],description:ROLE_LABELS[r.id]?.[1]})),base:[['crewmate',...ROLE_LABELS.crewmate],['impostor',...ROLE_LABELS.impostor]]};}
};
`;
source=source.replace('window.__sabotageQA={',probe+'window.__sabotageQA={');
const begin=source.indexOf('  for(const options of'),end=source.indexOf('  assert.deepEqual(errors,[]);',begin);
const checks=`
  const tally=(ballots,options)=>page.evaluate(([b,o])=>__voteGhostQA.finish(b,o),[ballots,options]);
  let r=await tally({a:{target:'b'}});assert.deepEqual(r.result.counts,{b:1});assert.equal(r.result.noVoteCount,3);assert.equal(r.result.ejected,'b');assert.equal(r.result.votes.c.target,'');assert(r.result.votes.c.noVote);
  r=await tally({a:{target:'skip'}});assert.deepEqual(r.result.counts,{skip:1});assert.equal(r.result.outcome,'skip');assert.equal(r.result.noVoteCount,3);
  r=await tally({});assert.deepEqual(r.result.counts,{});assert.equal(r.result.outcome,'no-votes');assert.equal(r.result.noVoteCount,4);
  r=await tally({a:{target:'missing'},b:{target:'skip',noVote:true}},{mayor:true});assert.deepEqual(r.result.counts,{});assert.equal(r.result.noVoteCount,4);assert.equal(r.result.votes.d.weight,0);
  r=await tally({a:{target:'b'}},{anonymous:true});assert.deepEqual(r.result.votes,{});assert.equal(r.history.noVoteCount,3);
  r=await tally({a:{target:'b'}},{swaps:[['a','b']]});assert.equal(r.result.ejected,'a');assert.equal(r.result.noVoteCount,3);
  r=await tally({a:{target:'skip'},c:{target:'a'}},{scales:true});assert.deepEqual(r.result.counts,{a:1});assert.equal(r.result.noVoteCount,3);assert.equal(r.result.ejected,'a');
  console.log('PASS abstention, explicit skip, invalid ballot, mayor, anonymous, swap and scales tally/history');
  const intros=await page.evaluate(()=>__voteGhostQA.introductions());assert.equal(intros.ids.length,84);assert.deepEqual(intros.ids.sort(),intros.labels.sort());assert.equal(intros.doorDefault,10);assert.equal(intros.doorActual,10000);assert.equal(intros.doorInput,10);assert(intros.settings);
  for(const row of intros.view){assert(!row.hasSettings,row.id);assert(!/クールタイム|クールダウン|初期設定/.test(row.text),row.id+': '+row.text);}
  console.log('PASS all 84 role introductions, no cooldown settings in viewer, editable door default/actual ten seconds');
  const out=path.join(root,'qa-results');fs.mkdirSync(out,{recursive:true});
  for(const size of [{width:390,height:844},{width:844,height:390},{width:1024,height:768},{width:1366,height:768}]){
   await page.setViewportSize(size);await page.evaluate(()=>__voteGhostQA.prepare());await page.waitForTimeout(250);
   const portraitContinue=page.getByRole('button',{name:'縦向きで続ける'});if(await portraitContinue.isVisible())await portraitContinue.click();
   assert(!(await page.locator('#reportBtn').isVisible()));assert(await page.locator('#ghostTaskProgress').isVisible());
   assert.equal(await page.locator('#ghostTaskProgress progress').getAttribute('value'),'1');
   await page.evaluate(()=>__voteGhostQA.follow());assert(await page.locator('#ghostTaskProgress').isVisible());
   await page.evaluate(()=>__voteGhostQA.progress());assert.equal(await page.locator('#ghostTaskProgress progress').getAttribute('value'),'2');
   const bar=await page.locator('#ghostTaskProgress').boundingBox();assert(bar.x>=0&&bar.y>=0&&bar.x+bar.width<=size.width+1&&bar.y+bar.height<=size.height+1,JSON.stringify(bar));
   await page.screenshot({path:path.join(out,'ghost-'+size.width+'.png')});
   await page.evaluate(()=>__voteGhostQA.revive());assert(await page.locator('#reportBtn').isVisible());
   console.log('PASS ghost report hidden, live task progress, follow and revival',size.width);
  }
  await page.setViewportSize({width:844,height:390});
  await page.evaluate(()=>{__sabotageQA.prepare();__voteGhostQA.pause();});
  const cdp=await page.context().newCDPSession(page),center=async selector=>{const r=await page.locator(selector).boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2};};
  const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:1,radiusY:1,force:1}))});
  const stick={...await center('#stick'),id:1};stick.x+=28;
  await send('touchStart',[stick]);assert(Math.hypot(...Object.values((await page.evaluate(()=>__voteGhostQA.refresh())).vector))>.1,JSON.stringify(await page.evaluate(()=>__voteGhostQA.refresh())));
  const action={...await center('#sabotageBtn'),id:2};await send('touchStart',[stick,action]);await send('touchEnd',[action]);
  assert((await page.evaluate(()=>__sabotageQA.state())).open);assert(Math.hypot(...Object.values((await page.evaluate(()=>__voteGhostQA.refresh())).vector))>.1,JSON.stringify(await page.evaluate(()=>__voteGhostQA.refresh())));
  const pin={...await center('[data-sabotage-action="reactor"]'),id:3};await send('touchStart',[stick,pin]);await send('touchEnd',[pin]);
  assert.equal((await page.evaluate(()=>__sabotageQA.state())).writes.length,1);assert(Math.hypot(...Object.values((await page.evaluate(()=>__voteGhostQA.refresh())).vector))>.1,JSON.stringify(await page.evaluate(()=>__voteGhostQA.refresh())));
  await send('touchEnd',[]);console.log('PASS moving finger remains held while opening and activating sabotage, one command');
  for(const [options,expected] of [[{left:11},false],[{left:9},true],[{left:9,alive:false},false],[{left:9,voted:true},false],[{left:9,discussion:true},false],[{left:0},false]]){
   await page.evaluate(o=>__voteGhostQA.meeting(o),options);
   assert.equal(await page.locator('#meeting').evaluate(e=>e.classList.contains('criticalMeeting')),expected,JSON.stringify(options));
  }
  await page.evaluate(()=>__voteGhostQA.meeting({left:9}));await page.screenshot({path:path.join(out,'vote-2d.png')});await page.evaluate(()=>__voteGhostQA.vote());assert(!(await page.locator('#meeting').evaluate(e=>e.classList.contains('criticalMeeting'))));
  console.log('PASS last ten seconds only, living unvoted players only, clears after vote/expiry');
  await page.evaluate(()=>__voteGhostQA.meeting({left:9,three:true}));
  const frame=await(await page.locator('#meeting3D').elementHandle()).contentFrame();await frame.waitForFunction(()=>window.meetingScene,null,{timeout:60000});
  await page.evaluate(()=>__voteGhostQA.meeting({left:9,three:true}));await frame.waitForFunction(()=>document.body.classList.contains('voteUrgent'));
  await page.screenshot({path:path.join(out,'vote-3d.png')});
  await page.evaluate(()=>__voteGhostQA.vote());await frame.waitForFunction(()=>!document.body.classList.contains('voteUrgent'));
  await page.evaluate(()=>__voteGhostQA.meeting({left:9,three:true}));await frame.waitForFunction(()=>document.body.classList.contains('voteUrgent'));await page.evaluate(()=>__voteGhostQA.death());await frame.waitForFunction(()=>!document.body.classList.contains('voteUrgent'));
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>__voteGhostQA.meeting({left:9,three:true}));await frame.waitForFunction(()=>document.body.classList.contains('voteUrgent'));assert.equal(await frame.locator('#meetingTimerBar').evaluate(e=>getComputedStyle(e).animationName),'none');
  console.log('PASS 3D deadline glow, vote/death cleanup and reduced motion');
  fs.writeFileSync(path.join(out,'roles-current.json'),JSON.stringify(await page.evaluate(()=>__voteGhostQA.roles()),null,2));
`;
source=source.slice(0,begin)+checks+source.slice(end);
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(source,filename);
