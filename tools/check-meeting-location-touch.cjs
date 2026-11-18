// Built UI, local Firebase transport, authoritative host command validation.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.resolve(__dirname,'check-sabotage-input.cjs');
let source=fs.readFileSync(filename,'utf8').replace("path.resolve(root,'../qa-dist')","path.resolve(root,'qa-location-dist')");
source=source.replace(' if(built){'," if(built&&!process.env.LOCATION_QA_REUSE){");
const probe=`window.__locationQA={
 prepare({map='classic',alive=true,three=false,reporter='host'}={}){
  __sabotageQA.prepare({map,alive});show('meetingMapTools',false);renderContextLost=true;cancelAnimationFrame(frameRequestId);ownBallot=null;
  self().role='crew';self().subrole='crewmate';game.players.host.role='impostor';game.players.crew2.alive=false;
  game.phase='meeting';meeting3DManual2D=!three;if(!three)set3DMode(false);
  game.meeting={id:'location-'+map,startedAt:now()-100000,presentationEndsAt:now()-90000,votingAt:now()-30000,endsAt:now()+500000,reporter,reason:'遺体を発見',bodyId:'crew2',body:{name:'crew2'},voted:{},chat:[],rosterOrder:Object.keys(game.players),rosterAliveOrder:Object.keys(game.players).filter(id=>game.players[id].alive)};
  for(const timer of commandAckTimers.values())clearTimeout(timer);commandAckTimers.clear();meetingChatOutbox.clear();meetingChatSubmitLock=false;chatRenderStamp='';
  renderUI();show('meetingIntro',false);meetingLocations.sync();post3DState(latest3D);post3DUi();return this.state();
 },
 state(){return {game:JSON.parse(JSON.stringify(game)),layout:meetingLocationLayout(),reports:visibleMeetingLocations(),can:hostOnline(),writes:__sabotageQA.state().writes};},
 refresh(){renderUI();meetingLocations.sync();post3DState(latest3D);post3DUi();},
 async process(){await __sabotageQA.process();game=JSON.parse(JSON.stringify(window.__qaDatabase.rooms[code].game));hostId='host';hostBusy=true;const result=game.commandResults?.[uid];if(result?.id)settleCommandFromHost(uid,result.id,result,false);chatRenderStamp='';this.refresh();return this.state();},
 receive(snapshot,viewer='crew3'){game=JSON.parse(JSON.stringify(snapshot));uid=viewer;meetingChatOutbox.clear();chatRenderStamp='';meetingLocations.close();this.refresh();},
 open(kind){meetingLocations.open(kind);},
 command(report){return sendCommand('chat',{text:'forged',locationReport:report},token());},
 disconnect(){connected=false;this.refresh();},
 reconnect(){connected=true;meetingChatSubmitLock=false;this.refresh();},
 end(){game.phase='play';this.refresh();},
 newMeeting(){game.meeting={...game.meeting,id:'second',startedAt:now(),reporter:'host',locationReports:{},ghostLocationReports:{},chat:[],ghostChat:[]};this.refresh();},
 clearChat(){game.meeting.chat=[];chatRenderStamp='';this.refresh();},
 rules(raw){return normalizeLocationReport(raw,{layout:meetingLocationLayout(),mapMode:game.settings.mapMode,meeting:game.meeting,players:game.players});}
};
`;
source=source.replace('window.__sabotageQA={',probe+'window.__sabotageQA={');
const begin=source.indexOf('  for(const options of'),end=source.indexOf('  assert.deepEqual(errors,[]);',begin);
const checks=`
 const modal=page.locator('#meetingLocationMap');
 for(const three of [false,true])for(const size of [{width:390,height:844},{width:844,height:390},{width:1024,height:768}]){
  if(three&&size.width!==1024)continue;
  await page.setViewportSize(size);await page.evaluate(three=>__locationQA.prepare({three}),three);await page.waitForTimeout(250);
  if(three){const f=await(await page.locator('#meeting3D').elementHandle()).contentFrame();await f.waitForFunction(()=>window.meetingScene,null,{timeout:60000});await page.evaluate(()=>__locationQA.refresh());await f.evaluate(()=>{window.requestAnimationFrame=()=>0;});}
  const rotate=page.getByRole('button',{name:'縦向きで続ける'});if(await rotate.isVisible())await rotate.click();
  if(!three){
   await page.evaluate(()=>__locationQA.refresh());
   assert.equal(await page.locator('#votePlayers .voteCard.dead').count(),1,'only the eliminated player is marked dead');
   const target=page.locator('#votePlayers [data-player="host"]');
   assert.equal(await target.getAttribute('aria-disabled'),'false');
   assert.equal(await target.evaluate(e=>e.classList.contains('disabled')),false);
  }
  assert.equal(await page.locator('#meetingPositionBtn').count(),0);
  await page.locator('#meetingMapBtn').tap();await modal.waitFor({state:'visible'});
  assert.equal(await modal.getAttribute('aria-label'),'会議の共有マップ');
  await modal.getByRole('button',{name:'現在地を選ぶ',exact:true}).tap();
  assert.equal(await modal.getAttribute('aria-label'),'自分の現在位置を報告する');
  const ui=await modal.evaluate(panel=>{
   const box=selector=>panel.querySelector(selector).getBoundingClientRect();
   const header=box('header'),close=box('.meetingLocationDismiss'),view=box('.meetingLocationViewport');
   const tabs=[...panel.querySelectorAll('.meetingLocationToolbar button')].map(b=>b.getBoundingClientRect());
   return {oneRow:tabs.every(t=>Math.abs(t.top-close.top)<2&&t.height>=40)&&close.height>=40,
    mapWidth:view.width,mapHeight:view.height,headerHeight:header.height,headings:panel.querySelectorAll('header :is(h1,h2,h3,p)').length};
  });
  assert(ui.oneRow&&ui.headings===0&&ui.headerHeight<58,JSON.stringify(ui));
  assert(ui.mapWidth>=size.width*.65&&ui.mapHeight>=size.height*.65,JSON.stringify(ui));
  if(three){await modal.getByRole('button',{name:'閉じる',exact:true}).tap();continue;}
  const layout=(await page.evaluate(()=>__locationQA.state())).layout;
  const cafe=layout.rooms.find(r=>r.id==='caf'),corridor=layout.corridors.find(r=>r.id==='upper-caf');
  const svg=modal.locator('svg'),send=modal.locator('.meetingLocationSend'),pin=modal.locator('[data-location-pin="position"]');
  const tapWorld=async(x,z)=>{
   const touch=await svg.evaluate((el,p)=>{
    const matrix=el.getScreenCTM(),screen=new DOMPoint(p.x,p.z).matrixTransform(matrix);
    return {x:Math.round(screen.x),y:Math.round(screen.y),scale:matrix.a};
   },{x,z});
   await page.touchscreen.tap(touch.x,touch.y);return 1.5/touch.scale;
  };
  const offsetX=cafe.x+1,offsetZ=cafe.z+.7;
  const roomTolerance=await tapWorld(offsetX,offsetZ);
  assert(await send.isEnabled());assert.equal(await pin.count(),1);
  assert(Math.abs(Number(await pin.getAttribute('cx'))-offsetX)<roomTolerance);
  assert(Math.abs(Number(await pin.getAttribute('cy'))-offsetZ)<roomTolerance);
  if(size.height>size.width){
   const margin=await modal.locator('.meetingLocationViewport').evaluate(view=>{
    const b=view.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+8;
    return {x,y,empty:document.elementFromPoint(x,y)===view};
   });
   assert(margin.empty);await page.touchscreen.tap(margin.x,margin.y);
   assert(await send.isDisabled());assert.equal(await pin.count(),0);
   await tapWorld(offsetX,offsetZ);assert(await send.isEnabled());
  }
  await tapWorld(layout.bounds.minX+1,layout.bounds.minZ+1);
  assert(await send.isDisabled());assert.equal(await pin.count(),0);
  const tolerance=await tapWorld(corridor.x,corridor.z);
  assert(await send.isEnabled());await send.tap();
  const state=await page.evaluate(()=>__locationQA.process());
  const report=Object.values(state.game.meeting.locationReports)[0].locationReport;
  assert.equal(report.kind,'position');assert.equal(report.selection.exact,true);
  assert.equal(report.selection.label,'上部エンジンとカフェテリアの間の通路');
  assert(Math.abs(report.selection.x-corridor.x)<tolerance&&Math.abs(report.selection.z-corridor.z)<tolerance);
  await page.evaluate(game=>__locationQA.receive(game),state.game);await page.locator('#meetingMapBtn').tap();
  assert.equal(Number(await pin.getAttribute('cx')),report.selection.x);
  assert.equal(Number(await pin.getAttribute('cy')),report.selection.z);
  await modal.getByRole('button',{name:'閉じる',exact:true}).tap();
  console.log('PASS exact room/corridor taps, blank floor rejection and received pin',size,ui);
 }
 console.log('PASS genuine touch shared map and position controls in both meeting renderers at phone/tablet sizes');

`;
source=source.slice(0,begin)+checks+source.slice(end);
source=source.replace(' } finally {await browser.close();'," } catch(error){const pages=browser.contexts().flatMap(c=>c.pages());await pages[0]?.screenshot({path:path.join(root,'qa-results/location-failure.png')});throw error;} finally {await browser.close();");
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(source,filename);
