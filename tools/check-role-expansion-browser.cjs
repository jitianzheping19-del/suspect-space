const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.ROLE_QA_OUT||path.join(root,'../verification'));
const existing=fs.readFileSync(path.join(__dirname,'check-room-rejoin.cjs'),'utf8');
const fakeDB=existing.split('const fakeDatabase=`')[1].split('`;')[0];
const fixture=`
window.__roleActors=[];const originalRoleCrew=makeAstronaut;makeAstronaut=(...args)=>{const a=originalRoleCrew(...args);window.__roleActors.push(a);return a;};
window.__roleQA={
 prepare(){
  uid='qa';hostId='host';code='5291';connected=true;db={};
  const stamp=now(),spot=SPAWN_POINTS[0];position={x:spot.x,z:spot.z};
  players={qa:{name:'自分',online:true,x:spot.x,z:spot.z,hue:.1,updatedAt:stamp},host:{name:'ホスト',online:true,x:spot.x+1,z:spot.z,hue:.5,updatedAt:stamp}};
  game={phase:'play',round:1,startedAt:stamp-50000,playStartsAt:stamp-40000,countdownEndsAt:stamp-40000,settings:{mapMode:'classic',viewMode:'3d',waveMode:'normal',roles:{},voiceEnabled:false},players:{qa:{...players.qa,role:'crew',subrole:'crewmate',alive:true,assignedTasks:[],tasks:{},costume:'standard'},host:{...players.host,role:'crew',subrole:'crewmate',alive:true,assignedTasks:[],tasks:{}}},bodies:{}};
  roomRosterRaw={...players};window.__qaDatabase={rooms:{'5291':{players:{...players},game}}};window.__qaWrites=[];show('setup',false);show('nameGate',false);renderUI();
 },
 state(){return {subrole:self()?.subrole,role:self()?.role};},
 role(id){game.phase='play';delete game.freeze;game.players.qa.subrole=id;game.players.qa.role=EXPANSION_ROLES[id]?.side||(['crewmate','impostor'].includes(id)?(id==='crewmate'?'crew':'impostor'):'jackal');game.players.qa.abilityReadyAt=0;game.players.qa.readyAt=0;renderUI();expansionUI.sync();},
 cooldown(role,remaining,seconds,lock=0,overloaded=false){
  this.role(role);const p=self();p.meetingActionReadyAt=now()+lock;p.overloaded=overloaded;p.overloadedAt=now()-1500;p.abilityReadyAt=now()+remaining;game.settings[role+'CooldownSeconds']=seconds;renderUI();
  return{caption:$('abilityCaption').textContent,arc:parseFloat($('abilityBtn').style.getPropertyValue('--cooldown')),disabled:$('abilityBtn').disabled,context:{connected,host:hostOnline(),blocked:killActionsLocked(),phase:game.phase,alive:p.alive,disconnected:p.disconnected,observer:p.observer,stamp:now(),meeting:p.meetingActionReadyAt,start:game.playStartsAt,countdown:game.countdownEndsAt}};
 },
 openMap(cleanup=false){this.role('impostor');if(cleanup)show('sabotageMap',false);trySabotage();},
 shadow(){const a=makeAstronaut('影',.1,'standard'),s=a.userData.groundShadow;const result={width:s.geometry.parameters.width,height:s.geometry.parameters.height,casters:0};a.traverse(n=>{if(n.castShadow)result.casters++;});disposeObject(a);return result;},
 use(){expansionUI.useAbility();},
 memorial(count){
  const skins=['premium-abyssdiver','premium-sakurakimono','premium-piratecaptain','captain','bunny'];
  game.phase='meeting';game.meeting={id:'qa-'+Math.random(),startedAt:now()-3100,endsAt:now()+120000,votingAt:now()+60000,reporter:'host',reason:'緊急会議',rosterOrder:['qa','host'],rosterAliveOrder:['qa','host'],newDeaths:Array.from({length:count},(_,i)=>({id:'dead-'+i,name:['深海の旅人','桜の守り人','幽海の船長','船長','うさぎ'][i%5],hue:i*.17,costume:skins[i%5]})),memorialDurationMs:count?60000:1500};
  showMeetingIntro('緊急会議');
 },
 dispose(){meetingMemorialPresentation?.dispose();meetingIntroPresentation?.dispose();clearTimeout(meetingMemorialTimer);show('meetingIntro',false);},
 freeze(){game.phase='play';game.freeze={by:'qa',until:now()+5000};expansionUI.sync();},
 shield(){game.phase='play';game.foxShields={qa:{attacker:'host',at:now(),until:now()+1800}};const a=makeAstronaut('妖狐',.1,'standard');updateFoxShield(THREE,a,game,'qa','qa',now());const own=a.userData.foxShield.visible;updateFoxShield(THREE,a,game,'qa','host',now());const attacker=a.userData.foxShield.visible;updateFoxShield(THREE,a,game,'qa','other',now());const other=a.userData.foxShield.visible;disposeObject(a);return{own,attacker,other};}
};
`;
(async()=>{
 const server=require('node:http').createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  let body=fs.readFileSync(file,'utf8'),type=file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html';
  if(file.endsWith('.css')&&req.headers['sec-fetch-dest']==='script'){type='application/javascript';body='const style=document.createElement("style");style.textContent='+JSON.stringify(body)+';document.head.append(style);';}
  if(file===path.join(root,'index.html'))body=body.replace('function showMeetingIntro(reason)',fixture+'\nfunction showMeetingIntro(reason)').replace('if(!skipAutoLoginOnce){setTimeout(()=>connectFirebase(""),0);}','');
  res.setHeader('Content-Type',type);res.end(body);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port+'/';
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  fs.mkdirSync(out,{recursive:true});const page=await browser.newPage({hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/WebSocket|net::ERR|favicon/.test(m.text()))errors.push(m.text());});
  await page.route('**/build/three.module.js',r=>r.fulfill({path:'/workspace/emergency-3d-revision/three.module.js',contentType:'application/javascript'}));
  await page.route('**/firebase-database.js',r=>r.fulfill({body:fakeDB,contentType:'application/javascript'}));
  await page.route('**/firebase-app.js',r=>r.fulfill({body:'export const initializeApp=()=>({});',contentType:'application/javascript'}));
  await page.route('**/firebase-auth.js',r=>r.fulfill({body:'export const getAuth=()=>({}),setPersistence=async()=>{},indexedDBLocalPersistence={},browserLocalPersistence={},signInAnonymously=async()=>({}),updateProfile=async()=>{},signOut=async()=>{},signInWithEmailAndPassword=async()=>({}),createUserWithEmailAndPassword=async()=>({});',contentType:'application/javascript'}));
  await page.route(/(?:firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)/,r=>r.abort());
  await page.goto(base+'index.html',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.__roleQA,{timeout:60000});await page.clock.setFixedTime(new Date());await page.evaluate(()=>window.__roleQA.prepare());
  assert.deepEqual(await page.evaluate(()=>window.__roleQA.shield()),{own:true,attacker:true,other:false});
  assert.deepEqual(await page.evaluate(()=>window.__roleQA.shadow()),{width:1.15,height:1.15,casters:0});
  for(const role of ['crewmate','impostor']){await page.evaluate(role=>window.__roleQA.role(role),role);assert(!await page.locator('#jackalSidekickBtn').isVisible(),role+' cannot recruit');}
  let cooldown=await page.evaluate(()=>window.__roleQA.cooldown('cracker',15000,60));
  assert.equal(cooldown.caption,'15秒');assert(cooldown.arc>89&&cooldown.arc<=90);assert(cooldown.disabled);
  cooldown=await page.evaluate(()=>window.__roleQA.cooldown('freezer',-1000,30,5000));assert.equal(cooldown.caption,'5秒');assert(cooldown.disabled);
  cooldown=await page.evaluate(()=>window.__roleQA.cooldown('freezer',-1000,30));assert.equal(cooldown.arc,0);assert.equal(cooldown.caption,'時間停止');assert(!cooldown.disabled,JSON.stringify(cooldown));
  cooldown=await page.evaluate(()=>window.__roleQA.cooldown('overloader',60000,60,0,true));assert.equal(cooldown.caption,'2秒');assert(cooldown.arc>178&&cooldown.arc<=180);
  await page.evaluate(()=>window.__roleQA.cooldown('cracker',-1000,30));
  for(const size of [{width:844,height:390},{width:1024,height:768},{width:1366,height:768}]){
   await page.setViewportSize(size);await page.evaluate(()=>window.__roleQA.openMap());await page.evaluate(()=>window.__roleQA.openMap(true));await page.waitForTimeout(260);
   assert(await page.locator('#sabotageMap').isVisible(),'pending cleanup must not close reopened map');assert(!await page.locator('#sabotageMap').evaluate(el=>el.inert));
   await page.locator('#sabotageMapClose').tap();assert(!await page.locator('#sabotageMap').isVisible(),'touch close after cleanup');
   await page.evaluate(()=>window.__roleQA.openMap());await page.locator('#sabotageMapClose').click();assert(!await page.locator('#sabotageMap').isVisible(),'mouse close');
   await page.evaluate(()=>window.__roleQA.openMap());await page.keyboard.press('Escape');assert(!await page.locator('#sabotageMap').isVisible(),'keyboard close');
  }
  for(const id of ['overloader','cracker','missionary','bodyguard','sandworm','eater','freezer']){
   await page.evaluate(id=>window.__roleQA.role(id),id);if(!await page.locator('#abilityBtn').isVisible())console.log('HIDDEN',id,await page.locator('#abilityBtn').evaluate(el=>{const a=[];for(let p=el;p;p=p.parentElement)a.push({id:p.id,cls:p.className,display:getComputedStyle(p).display});return a;}),errors);assert(await page.locator('#abilityBtn').isVisible(),id+' ability visible');assert(await page.locator('#abilityCaption').textContent());
  }
  await page.evaluate(()=>window.__roleQA.role('jackal'));assert(await page.locator('#jackalSidekickBtn').isVisible());
  await page.evaluate(()=>window.__roleQA.role('jackalSidekick'));assert(await page.locator('#killBtn').isDisabled(),'sidekick is immediately unable to kill');await page.locator('#killBtn').waitFor({state:'hidden'});await page.evaluate(()=>window.__roleQA.role('jackal'));assert(await page.locator('#killBtn').isVisible(),'promoted jackal can kill');
  await page.evaluate(()=>window.__roleQA.freeze());assert(await page.locator('#timeFreezeStatus').isVisible());assert(await page.locator('#abilityBtn').isDisabled());
  for(const size of [{width:390,height:844},{width:844,height:390},{width:1024,height:768},{width:1366,height:768}]){
   await page.setViewportSize(size);
   const count=size.width===390?5:3;await page.evaluate(count=>window.__roleQA.memorial(count),count);await page.waitForSelector('.meetingMemorialView canvas');await page.waitForTimeout(250);assert(await page.evaluate(count=>{const actors=window.__roleActors.filter(a=>a.parent?.name?.startsWith('memorial-'));return actors.length===count&&actors.every(a=>a.scale.x>=.25);},count),'skins must remain large enough to see');
   assert.equal(await page.locator('.meetingMemorialNames button').count(),count);
   const box=await page.locator('.meetingMemorial').boundingBox();assert(box.x>=-1&&box.y>=-1&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,'memorial stays within viewport');
   const canvas=await page.locator('.meetingMemorialView canvas').boundingBox();assert(canvas.width>=600&&canvas.height>50);
   await page.screenshot({path:path.join(out,'memorial-'+size.width+'.png')});await page.evaluate(()=>window.__roleQA.dispose());assert.equal(await page.locator('.meetingMemorial').count(),0);
  }
  await page.evaluate(()=>window.__roleQA.memorial(0));assert.equal(await page.locator('.meetingMemorial h2').textContent(),'死亡者なし');await page.waitForTimeout(1600);assert.equal(await page.locator('.meetingMemorial').count(),0);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({passed:true,sizes:[390,844,1024,1366],errors},null,2));
  console.log('PASS actual game startup, seven ability controls, sidekick, freeze, fox shields, four memorial viewports and no-deaths cleanup');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
