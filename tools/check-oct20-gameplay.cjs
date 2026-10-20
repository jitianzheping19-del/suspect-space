// Native-game regression checks. All backend data and SkyWay are isolated;
// the browser supplies a synthetic microphone and real WebGL rendering.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {createServer}=require('node:http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out='/workspace/artifacts/oct20-native';fs.mkdirSync(out,{recursive:true});
const old=fs.readFileSync(path.join(__dirname,'check-room-rejoin.cjs'),'utf8');
const {fakeDatabase,fixture}=vm.runInNewContext(old.slice(old.indexOf('const fakeDatabase='),old.indexOf('(async()=>{'))+'\n({fakeDatabase,fixture})');
const probe=`
window.__oct20QA={
 async boot(){await window.__rejoinQA.load('2d');connected=false;return true;},
 vent(){const me=self(),v=VENTS[0];position.x=v.x;position.z=v.z;me.ventId=v.id;me.ventUntil=now()+60000;const a=avatars.get(uid);delete a.userData.ventTransition;delete a.userData.lastVentAnimationSignature;safeRenderUI();return v.id;},
 ventState(){return{visible:avatars.get(uid)?.visible,transition:avatars.get(uid)?.userData.ventTransition,vent:self()?.ventId};},
 settings(){show('ventTravel',false);self().ventId='';window.__openSpaceInputSettings();window.__spaceSelectSettingsTab('quality');return true;},
 quality(){const p=$('performancePanel'),b=p.querySelector('[data-quality=high]'),r=b.getBoundingClientRect();return{inert:!!b.closest('[inert]'),hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.dataset.quality,preset:renderPreset};},
 selectTab(key){window.__spaceSelectSettingsTab(key);},
 mirage(){const g={settings:{roles:{mirage:1}},players:{dead:{role:'impostor',subrole:'samurai',alive:false},living:{role:'crew',subrole:'crewmate',alive:true}},bodies:{},deathRecords:{dead:{at:now()}},playStartsAt:now()-1000};assignGhostRole(g,g.players.dead);grantMirageGhosts(g);const candidates=mirageBodyCandidates(g);const result=spawnMirageBody({g,p:g.players.dead,actor:'dead',loc:{x:2,z:3},stamp:now()});return{role:g.players.dead.subrole,trait:g.players.dead.mirage,count:candidates.length,ok:result.ok,body:Object.values(g.bodies)[0]};},
 async disconnect(){
  const saved={game,hostId,connected,players};hostId=uid;connected=true;players={...players};
  const g=clone(game);g.phase='play';g.settings.roles={};g.revision=50;
  for(let i=0;i<4;i++){const id='qa-online-'+i,p={...g.players['qa-host'],name:'乗員'+i,role:'crew',subrole:'crewmate',alive:true};g.players[id]=p;players[id]={...p,online:true,updatedAt:now()};}
  players['qa-host']={...players['qa-host'],online:false,updatedAt:now()-16000,disconnectMode:'temporary'};
  game=g;window.__qaDatabase.rooms['5291'].game=g;window.__qaDatabase.rooms['5291'].hostId=uid;missingSince.set('qa-host',now()-16000);
  await hostTick();let next=window.__qaDatabase.rooms['5291'].game;const left={disconnected:next.players['qa-host'].disconnected,notice:next.notice};
  game=clone(next);players['qa-host'].online=true;window.__qaDatabase.rooms['5291'].game=game;await hostTick();next=window.__qaDatabase.rooms['5291'].game;
  const returned={disconnected:next.players['qa-host'].disconnected,alive:next.players['qa-host'].alive};
  game=saved.game;hostId=saved.hostId;connected=saved.connected;players=saved.players;window.__qaDatabase.rooms['5291'].game=game;window.__qaDatabase.rooms['5291'].hostId=hostId;
  return {left,returned};
 },
 async voice(){
  window.__closeSpaceInputSettings();self().ventId='';self().alive=true;
  const add=()=>{};
  loadSkyWayNoiseCanceller=async()=>{throw new Error('QA uses the raw synthetic microphone');};
  requestSkyWayToken=async()=>{window.__voiceTokenCalls=(window.__voiceTokenCalls||0)+1;return 'qa-local';};
  loadSkyWaySdk=async()=>({LocalAudioStream:class{constructor(track){this.track=track;}release(){}},SkyWayContext:{Create:async()=>({dispose(){},onTokenUpdateReminder:{add}})},SkyWayRoom:{FindOrCreate:async()=>({publications:[],members:[],onStreamPublished:{add},onStreamUnpublished:{add},onMemberLeft:{add},dispose:async()=>{},join:async()=>({id:uid,leave:async()=>{},publish:async()=>({id:'qa-publication',disable:async()=>{},enable:async()=>{}})})})}});
  game.settings.voiceEnabled=true;voiceEnabledByRoom=true;saveStored('space-suspect-voice-muted','1');
  voiceAutoJoinKey='';await Promise.all([resumePermittedVoice(),resumePermittedVoice()]);return this.voiceState();
 },
 voiceState(){return{joined:voiceJoined,muted:voiceMuted,prompt:voicePromptOpen,calls:window.__voiceTokenCalls,tracks:voiceStream?.getAudioTracks().map(t=>t.enabled),stored:readStored('space-suspect-voice-muted')};},
 async stopVoice(){await stopVoiceChat();game.settings.voiceEnabled=false;voiceEnabledByRoom=false;},
 ghost(){self().alive=false;self().subrole="samurai";self().samuraiUsed=true;self().mirage=true;self().deathAt=now();(game.deathRecords||={})[uid]={at:now()};clearVictimDeathOverlays();safeRenderUI();window.SpacePreferences.input.set({stickX:8,leftHanded:false});},
 ui(){const rect=id=>{const e=$(id),r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,exhausted:e.dataset.exhausted,visible:getComputedStyle(e).display!=='none'&&!e.closest('.hidden')};};return{mic:rect('voiceToggleBtn'),role:rect('role'),task:rect('taskProgressHud'),jump:rect('jumpBtn'),stick:rect('stick'),ghost:rect('ghostHud'),ability:rect('abilityBtn'),buttons:$('buttons').textContent};}
};
`;
(async()=>{
 const server=createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 try{
  const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,permissions:['microphone']});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/firebase-database.js',r=>r.fulfill({body:fakeDatabase,contentType:'application/javascript'}));
  await page.route(/(?:firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)/,r=>r.abort());
  await page.route('**/space-suspect-complete.html',r=>r.fulfill({body:fs.readFileSync(path.join(root,'space-suspect-complete.html'),'utf8').replace('function showMeetingIntro(reason)',fixture+probe+'\nfunction showMeetingIntro(reason)').replace('if(!skipAutoLoginOnce){setTimeout(()=>connectFirebase(""),0);}',''),contentType:'text/html'}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/space-suspect-complete.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__oct20QA,{timeout:90000});await page.evaluate(()=>window.__oct20QA.boot());await page.waitForTimeout(300);
  if(process.env.OCT20_GHOST_ONLY){await page.setViewportSize({width:844,height:390});await page.evaluate(()=>window.__oct20QA.ghost());await page.waitForTimeout(700);console.log(JSON.stringify(await page.evaluate(()=>{const b=document.getElementById('abilityBtn'),rules=[];const walk=items=>{for(const r of items){if(r.media&&!matchMedia(r.media.mediaText).matches)continue;if(r.selectorText&&(r.style?.width||r.style?.minWidth)&&b.matches(r.selectorText))rules.push({selector:r.selectorText,width:r.style.width,height:r.style.height,minWidth:r.style.minWidth,maxWidth:r.style.maxWidth});else if(r.cssRules)walk(r.cssRules);}};for(const sh of document.styleSheets)try{walk(sh.cssRules)}catch{}return {ui:window.__oct20QA.ui(),style:b.getAttribute('style'),computed:{width:getComputedStyle(b).width,height:getComputedStyle(b).height,minWidth:getComputedStyle(b).minWidth,maxWidth:getComputedStyle(b).maxWidth,transform:getComputedStyle(b).transform,position:getComputedStyle(b).position},rules};}),null,2));await page.screenshot({path:out+'/phone-ghost-debug.png'});return;}
  const centred=await page.evaluate(()=>window.__oct20QA.ui());assert(Math.abs(centred.task.x+centred.task.w/2-512)<1,'iPad task bar must be centred: '+JSON.stringify(centred.task));
  await page.evaluate(()=>window.__oct20QA.vent());await page.waitForTimeout(1600);const vent=await page.evaluate(()=>window.__oct20QA.ventState());assert(vent.vent&&!vent.visible,'Own vent occupant must disappear after entry, including after followCamera');await page.screenshot({path:out+'/ipad-vent.png'});console.log('PASS vent stays hidden through camera updates');
  await page.evaluate(()=>window.__oct20QA.settings());await page.waitForTimeout(200);let quality=await page.evaluate(()=>window.__oct20QA.quality());assert(!quality.inert,'Graphics panel retained inert state');assert.equal(quality.hit,'high');await page.locator('#performancePanel [data-quality=high]').click();quality=await page.evaluate(()=>window.__oct20QA.quality());assert.equal(quality.preset,'high');await page.screenshot({path:out+'/ipad-quality.png'});console.log('PASS graphics controls hit-test and change renderer preset');
  const mirage=await page.evaluate(()=>window.__oct20QA.mirage());assert.equal(mirage.role,'samurai');assert(mirage.trait&&mirage.ok&&mirage.count===1);assert.equal(mirage.body.x,2);console.log('PASS postmortem Mirage preserves original role and clones recent death without live body');
  const disconnect=await page.evaluate(()=>window.__oct20QA.disconnect());assert(disconnect.left.disconnected&&disconnect.left.notice.includes('が退出しました。'));assert.equal(disconnect.returned.disconnected,false);assert.equal(disconnect.returned.alive,false);console.log('PASS 15s disconnect notice and rejoin without resurrection');
  const voice=await page.evaluate(()=>window.__oct20QA.voice());assert(voice.joined&&voice.muted&&!voice.prompt);assert.equal(voice.calls,1);assert(voice.tracks.every(enabled=>!enabled));assert.equal(voice.stored,'1');const voiceUI=await page.evaluate(()=>window.__oct20QA.ui());assert(voiceUI.mic.x>=voiceUI.role.x+voiceUI.role.w||voiceUI.mic.y>=voiceUI.role.y+voiceUI.role.h,'iPad mic overlaps role');await page.evaluate(()=>window.__oct20QA.stopVoice());console.log('PASS permitted microphone autojoin, remembered mute and concurrent call deduplication');
  await page.setViewportSize({width:844,height:390});await page.waitForTimeout(200);const ui=await page.evaluate(()=>window.__oct20QA.ui());assert(!/\[(E|F|R|Q)\]/.test(ui.buttons),'Touch UI contains keyboard hints');await page.screenshot({path:out+'/phone-game.png'});console.log('PASS phone touch captions');
  await page.evaluate(()=>window.__oct20QA.ghost());await page.waitForTimeout(200);const ghostUI=await page.evaluate(()=>window.__oct20QA.ui());const a=ghostUI.ghost,b=ghostUI.stick;assert(a.visible&&a.w>300,'Ghost strip should be longer');assert(Math.abs(a.x+a.w/2-422)<1,'Ghost strip should be centred at the bottom');assert(ghostUI.ability.visible,'Mirage ability is hidden by spectator CSS');assert.notEqual(ghostUI.ability.exhausted,'true','A spent living ability must not exhaust Mirage');assert(ghostUI.ability.w<=122&&ghostUI.ability.h<=56,'Mirage action must stay compact');assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Ghost strip overlaps the customised joystick');await page.screenshot({path:out+'/phone-ghost.png'});console.log('PASS centred longer ghost strip avoids customised joystick');
  for(const [width,height] of [[1024,768],[1366,1024]]){await page.setViewportSize({width,height});await page.waitForTimeout(200);const ui=await page.evaluate(()=>window.__oct20QA.ui()),g=ui.ghost;assert(Math.abs(g.x+g.w/2-width/2)<1,'Ghost strip centre at '+width);assert(g.y+g.h<=height&&g.y+g.h>=height-12,'Ghost strip bottom at '+width);await page.screenshot({path:out+'/ghost-'+width+'.png'});}console.log('PASS iPad and large-screen ghost centring');
  assert.deepEqual(errors,[]);console.log('ERRORS',errors);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
