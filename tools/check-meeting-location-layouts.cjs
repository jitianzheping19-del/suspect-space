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
 fs.mkdirSync(path.join(root,'qa-results/layouts'),{recursive:true});
 for(const map of ['classic','astra','frost']){await page.evaluate(map=>__locationQA.prepare({map}),map);const layout=(await page.evaluate(()=>__locationQA.state())).layout;fs.writeFileSync(path.join(root,'qa-results/layouts/'+map+'.json'),JSON.stringify(layout));console.log('PASS exported actual map geometry',map,layout.rooms.length);}

`;
source=source.slice(0,begin)+checks+source.slice(end);
source=source.replace(' } finally {await browser.close();'," } catch(error){const pages=browser.contexts().flatMap(c=>c.pages());await pages[0]?.screenshot({path:path.join(root,'qa-results/location-failure.png')});throw error;} finally {await browser.close();");
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(source,filename);
