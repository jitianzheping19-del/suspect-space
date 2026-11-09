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
  for(const id of ['meetingMapBtn','meetingPositionBtn']){
   console.log('TOUCH',three,size.width,id,await page.locator('#'+id).evaluate(e=>{const r=e.getBoundingClientRect();return{box:r.toJSON(),hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,160),inert:!!e.closest('[inert]'),aria:e.closest('[aria-hidden=true]')?.id};}));
   assert(!(await page.locator('#'+id).evaluate(e=>!!e.closest('[inert]'))),'meeting controls must recover from round reset');await page.locator('#'+id).tap();await modal.waitFor({state:'visible',timeout:3000});assert.equal(await modal.getAttribute('aria-label'),id==='meetingMapBtn'?'会議の共有マップ':'自分の現在位置を報告する');await modal.getByRole('button',{name:'閉じる',exact:true}).tap();
  }
 }
 console.log('PASS genuine touch shared map and position controls in both meeting renderers at phone/tablet sizes');

`;
source=source.slice(0,begin)+checks+source.slice(end);
source=source.replace(' } finally {await browser.close();'," } catch(error){const pages=browser.contexts().flatMap(c=>c.pages());await pages[0]?.screenshot({path:path.join(root,'qa-results/location-failure.png')});throw error;} finally {await browser.close();");
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(source,filename);
