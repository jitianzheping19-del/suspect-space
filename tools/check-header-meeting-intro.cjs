// Real game styles and meeting lifecycle, with the shared in-memory transport.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.resolve(__dirname,'check-sabotage-input.cjs');
let source=fs.readFileSync(filename,'utf8').replace("path.resolve(root,'../qa-dist')","path.resolve(root,'tmp/header-meeting-intro-dist')");
source=source.replace(' if(built){',' if(built&&!process.env.HEADER_QA_REUSE){');
const probe=`window.__headerQA={
 play(role='crewmate'){
  __sabotageQA.prepare({subrole:role});renderContextLost=true;cancelAnimationFrame(frameRequestId);
  self().role='crew';renderUI();
 },
 meeting({three=false,report=false,stage='pending'}={}){
  meetingLocations.close();meeting3DManual2D=!three;if(!three)set3DMode(false);
  game.phase='meeting';const stamp=now();game.meeting={id:'header-intro-'+stamp,reporter:uid,reason:report?'遺体を発見':'緊急会議',bodyId:report?'crew2':'',body:{name:'crew2'},startedAt:stamp-1000,presentationEndsAt:stamp+60000,votingAt:stamp+60000,endsAt:stamp+120000,chat:[],ghostChat:[],voted:{}};
  this.stage(stage);
 },
 stage(stage){
  const intro=$('meetingIntro');clearTimeout(showTimers.get('meetingIntro'));clearTimeout(effectTimers.get('meetingIntro'));
  intro.classList.remove('is-entering','is-leaving');intro.classList.toggle('hidden',stage!=='animating');
  game.meeting.presentationEndsAt=now()+(stage==='pending'?60000:-1000);renderUI();meetingLocations.sync();
 },
 open(){meetingLocations.open('shared');},
 refresh(){renderUI();meetingLocations.sync();},
 close(){meetingLocations.close();}
};
`;
source=source.replace('window.__sabotageQA={',probe+'window.__sabotageQA={');
const begin=source.indexOf('  for(const options of'),end=source.indexOf('  assert.deepEqual(errors,[]);',begin);
const checks=`
 const out=path.join(root,'tmp/header-meeting-intro');fs.mkdirSync(out,{recursive:true});
 for(const size of [{width:320,height:568},{width:390,height:844},{width:667,height:375},{width:844,height:390},{width:768,height:1024},{width:1024,height:768},{width:1366,height:1024}]){
  await page.setViewportSize(size);
  for(const role of ['crewmate','bountyHunter','niceGuesser']){
   await page.evaluate(role=>__headerQA.play(role),role);
   await page.waitForTimeout(250);
   const rotate=page.getByRole('button',{name:'縦向きで続ける'});if(await rotate.isVisible())await rotate.click();
   const rects=await page.evaluate(()=>['role','taskProgressHud','roundRoleBtn','mapBtn'].map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return {id,text:el.textContent,x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};}));
   for(const r of rects)assert(r.w>0&&r.h>0&&r.x>=0&&r.right<=innerWidthForTest(size)+1,JSON.stringify({size,r}));
   const [roleRect,taskRect]=rects;
   for(const r of [roleRect,...rects.slice(2)])assert(taskRect.right+4<=r.x||r.right+4<=taskRect.x||taskRect.bottom+4<=r.y||r.bottom+4<=taskRect.y,'Task HUD overlap: '+JSON.stringify({size,rects}));
  }
  await page.screenshot({path:path.join(out,'hud-'+size.width+'.png')});
 }
 function innerWidthForTest(size){return size.width;}
 console.log('PASS role/task separation and header bounds in seven viewport sizes');
 await page.setViewportSize({width:844,height:390});
 for(const three of [false,true])for(const report of [false,true]){
  await page.evaluate(options=>__headerQA.meeting(options),{three,report});
  for(const stage of ['pending','animating']){
   await page.evaluate(stage=>__headerQA.stage(stage),stage);
   assert(await page.locator('#meetingMapTools').isHidden(),'Map tools visible during '+stage);
   assert(await page.locator('#meetingMapTools').evaluate(n=>n.inert));
   await page.evaluate(()=>__headerQA.open());assert.equal(await page.locator('#meetingLocationMap').count(),0,'Map opened during '+stage);
  }
  await page.evaluate(()=>__headerQA.stage('ready'));
  if(report){await page.locator('#meetingLocationMap').waitFor({state:'visible'});await page.evaluate(()=>__headerQA.close());}
  await page.locator('#meetingMapBtn').waitFor({state:'visible'});assert.equal(await page.locator('#meetingPositionBtn').count(),0);
  await page.locator('#meetingMapBtn').tap();assert(await page.locator('#meetingLocationMap').isVisible());await page.evaluate(()=>__headerQA.close());
  await page.locator('#meetingMapBtn').tap();await page.getByRole('button',{name:'現在地を選ぶ',exact:true}).tap();assert(await page.locator('#meetingLocationMap').isVisible());await page.evaluate(()=>__headerQA.close());
  let chat=page;
  if(three){chat=await(await page.locator('#meeting3D').elementHandle()).contentFrame();await chat.waitForFunction(()=>window.meetingScene);await chat.evaluate(()=>{window.__meetingEjectionOverlayActive=true;});await page.evaluate(()=>__headerQA.refresh());}
  for(const kind of (report?['route','body']:['route'])){
   const selector=three?'[data-location-action="meetingLocation-'+kind+'"]':'#meetingLocation-'+kind;
   await chat.locator(selector).tap();await page.locator('#meetingLocationMap').waitFor({state:'visible',timeout:5000});await page.evaluate(()=>__headerQA.close());
  }
  console.log('PASS chat route/body taps', {three,report});
 }
 console.log('PASS emergency/body meetings in 2D/3D: hidden while loading and animating, usable after intro');
`;
source=source.slice(0,begin)+checks+source.slice(end);
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(source,filename);
