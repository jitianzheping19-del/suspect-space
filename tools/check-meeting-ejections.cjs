// Exercises the actual embedded meeting scene with real Three.js actors.
// Optional: MEETING_QA_SHOTS=/tmp/meeting-shots node tools/check-meeting-ejections.cjs
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),zlib=require('zlib'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),shots=process.env.MEETING_QA_SHOTS;
const modes=process.env.MEETING_QA_MODES?.split(',')||['rocket','collapse','beam','missile','meteor','ufo','balance'];
(async()=>{
 const {patchMeetingRuntime}=await import(pathToFileURL(path.join(root,'meeting-scene-ejections.js')));
 const html=fs.readFileSync(path.join(root,'space-suspect-complete.html'),'utf8');
 const payload=html.match(/const EMBEDDED_ASSET_PAYLOAD=(\[[\s\S]*?\])\.join\(""\);/);
 const assets=JSON.parse(zlib.gunzipSync(Buffer.from(JSON.parse(payload[1]).join(''),'base64')));
 let source=patchMeetingRuntime(assets.MEETING_3D_SRCDOC);
 assert(!source.includes('frame.srcdoc=MR_EJECTION_ASSET'));
 assert(!source.includes('const MR_EJECTION_ASSET='));
 assert(source.includes('tween(landT+1.8,.01,()=>{},()=>mrStartEjection(ejectedIds,r));'),'ejection should wait a little longer after vote reveal');
 const diagnostic=`
 window.__meetingPaused=false;renderer.setPixelRatio(.8);
 window.__meetingQA={
 init(costumeSource,n=12,scale=false){
  window.__meetingPaused=false;
  libCostumeSource=costumeSource;libCostume=new Function('THREE','clamp',costumeSource+';return {buildLightCostume:buildLightCostume};')(THREE,clamp);
  const list=Array.from({length:n},(_,i)=>({id:'p'+i,name:i===0?'ものすごく長いプレイヤーの名前1234567890':i===2?'レモンかす':'テストBot '+(i+1),hue:i/n,alive:true,voted:true,role:i===2?'侍':'',costume:['standard','captain','crown','suit'][i%4]}));
  applyState({meetingId:'qa-'+Math.random(),me:'p2',seats:list,voting:false,ownVoted:'',allVoted:true,scalesTargets:scale?['p2','p5']:[]});
  chatPanel.style.display='none';timerBar.style.display='none';
 },
 pause(){window.__meetingPaused=true;NOW+=10;window.__qaMeetingUpdate(0,0,NOW);},
 start(mode,ids=['p2']){camera.position.set(7.2,8.4,13.6);orb.target.set(0,1.8,0);orb.enableDamping=false;orb.update();
  const result={id:'result-'+Math.random(),ejected:ids[0],ejecteds:ids,outcome:'ejected',revealMode:'role',ejectedDisclosure:ids.map(id=>({id,label:id==='p2'?'侍':'クルーメイト',impostor:id==='p2'})),remainingImpostors:1,showImpostorCount:true,counts:{p2:6,p5:3}};
  this.started=NOW;this.before=seats.map(p=>({id:p.id,root:p.c.root.uuid,tag:p.tag.s.uuid,costume:p.costumeRoot?.uuid,color:p.c.suit.color.getHex(),name:p.tag.text,font:p.tag.renderedFontSize}));this.camera=camera.position.toArray();this.quaternion=camera.quaternion.toArray();mrStartEjection(ids,result,mode);
 },
 at(t){NOW=this.started+t;window.__qaMeetingUpdate(.016,.016,NOW);scene.updateMatrixWorld(true);renderer.render(scene,camera);return this.state();},
 state(){return {...getLiveMeetingEjections().getState(),nameRects:seats.filter(p=>p.tag.s.visible).map(p=>{const a=p.tag.s.position.clone(),q=a.clone().project(camera),z=-a.applyMatrix4(camera.matrixWorldInverse).z,pixels=innerHeight/(2*Math.tan(camera.fov*Math.PI/360))/z;return{id:p.id,x:(q.x+1)*innerWidth/2,y:(1-q.y)*innerHeight/2,w:p.tag.s.scale.x*pixels*Math.min(1,(p.tag.g.measureText(p.tag.text).width+20)/p.tag.w),h:p.tag.s.scale.y*pixels*.73};}),camera:camera.position.toArray(),quaternion:camera.quaternion.toArray(),before:this.before,actors:seats.map(p=>({id:p.id,root:p.c.root.uuid,tag:p.tag.s.uuid,costume:p.costumeRoot?.uuid,color:p.c.suit.color.getHex(),name:p.tag.text,font:p.tag.renderedFontSize,visible:p.c.root.visible,alive:p.alive})),iframe:document.querySelectorAll('iframe').length,outcome:meetingOutcome.textContent,outcomeVisible:meetingOutcome.style.display,scaleBroken:mrScaleBroken};}
 };
 `;
 source=source.replace('window.meetingScene={',diagnostic+'\nwindow.meetingScene={').replace('NOW+=dt;updateMeetingAbilityView();','NOW+=window.__meetingPaused?0:dt;updateMeetingAbilityView();').replace('function startLoop(update){','function startLoop(update){window.__qaMeetingUpdate=update;').replace('(function frame(){const rdt=','(function frame(){if(window.__meetingPaused){requestAnimationFrame(frame);return;}const rdt=');
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/qa-meeting.html',r=>r.fulfill({body:source,contentType:'text/html'}));
 await page.goto('http://meeting.test/qa-meeting.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__meetingQA,{timeout:90000});
 if(shots)fs.mkdirSync(shots,{recursive:true});
 for(const mode of modes){
  await page.evaluate(([src,mode])=>window.__meetingQA.init(src,12,mode==='balance'),[assets.COSTUME_LIB_SRC,mode]);await page.waitForTimeout(250);
  const fittedNames=await page.evaluate(()=>window.__meetingQA.state().actors.filter(p=>p.id==='p0'||p.id==='p2'));
  const longName=fittedNames.find(p=>p.id==='p0'),shortName=fittedNames.find(p=>p.id==='p2');
  assert.equal(longName.name,'ものすごく長いプレイヤーの名前1234567890','meeting scene must keep the full long name');
  assert(longName.font<shortName.font,'long meeting names must shrink to fit instead of being truncated');
  await page.evaluate(mode=>{window.__meetingQA.pause();window.__meetingQA.start(mode,mode==='balance'?['p2','p5']:['p2']);},mode);
  for(const t of [0,1.35,2.25,3.5,4.4,5.9]){
   const s=await page.evaluate(t=>window.__meetingQA.at(t),t);await page.waitForTimeout(35);
   assert.equal(s.iframe,0,mode+' cannot replace the room with an iframe');
   for(const p of s.actors){const before=s.before.find(x=>x.id===p.id);for(const key of ['root','tag','costume','color','name','font'])assert.deepEqual(p[key],before[key],mode+' changed '+key+' for '+p.id);}
   assert(s.camera.every(Number.isFinite),mode+' camera became invalid');
   if(t===0)assert.deepEqual(s.camera,[7.2,8.4,13.6],mode+' reset the initial camera');
   if(t===3.5)assert.notDeepEqual(s.camera,[7.2,8.4,13.6],mode+' must follow the ejected actor');
   for(let a=0;a<s.nameRects.length;a++)for(let b=a+1;b<s.nameRects.length;b++){const x=s.nameRects[a],y=s.nameRects[b];assert(Math.abs(x.x-y.x)>=(x.w+y.w)/2||Math.abs(x.y-y.y)>=(x.h+y.h)/2,mode+' overlapping names '+x.id+' / '+y.id); }
   for(const p of s.actors.filter(p=>p.id!=='p2'&&(mode!=='balance'||p.id!=='p5')))assert(p.alive&&p.visible,'witness disappeared');
   if(shots&&[1.35,3.5,4.4].includes(t))await page.screenshot({path:path.join(shots,mode+'-'+t+'.png')});
   if(t===5.9){assert(s.dead&&!s.active,mode+' did not finish');assert(s.outcome.includes('レモンかすは侍だった')&&s.outcome.includes('残り人狼 1 人'));console.log('PASS',mode,'identity/camera-follow/names/outcome');}
  }
 }
 console.log('ERRORS',errors);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
