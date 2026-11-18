// Built UI, local Firebase transport, authoritative host command validation.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.resolve(__dirname,'check-sabotage-input.cjs');
let source=fs.readFileSync(filename,'utf8').replace("path.resolve(root,'../qa-dist')","path.resolve(root,'qa-location-dist')");
source=source.replace(' if(built){'," if(built&&!process.env.LOCATION_QA_REUSE){");
const probe=`window.__locationQA={
 prepare({map='classic',alive=true,three=false,reporter='host',emergency=false}={}){
  __sabotageQA.prepare({map,alive});show('meetingMapTools',false);renderContextLost=true;cancelAnimationFrame(frameRequestId);ownBallot=null;
  self().role='crew';self().subrole='crewmate';game.players.host.role='impostor';game.players.crew2.alive=false;
  game.phase='meeting';meeting3DManual2D=!three;if(!three)set3DMode(false);
  game.meeting={id:'location-'+map,startedAt:now()-100000,presentationEndsAt:now()-90000,votingAt:now()-30000,endsAt:now()+500000,reporter,reason:emergency?'緊急会議':'遺体を発見',bodyId:'crew2',body:{name:'crew2'},voted:{},chat:[],rosterOrder:Object.keys(game.players),rosterAliveOrder:Object.keys(game.players).filter(id=>game.players[id].alive)};
  for(const timer of commandAckTimers.values())clearTimeout(timer);commandAckTimers.clear();meetingChatOutbox.clear();meetingChatSubmitLock=false;chatRenderStamp='';
  renderUI();show('meetingIntro',false);meetingLocations.sync();post3DState(latest3D);post3DUi();return this.state();
 },
 state(){return {game:JSON.parse(JSON.stringify(game)),layout:meetingLocationLayout(),reports:visibleMeetingLocations(),can:hostOnline(),writes:__sabotageQA.state().writes};},
 mayor(){self().subrole='mayor';game.settings.mayorVoteWeight=7;this.refresh();},
 tally(){const snapshot=structuredClone(game);finishMeeting(snapshot,{qa:{target:'skip'}});return snapshot.lastVoteResult.counts.skip;},
 seatData(){return latest3D.seatsList;},
 blackChat(){game.players.host.hue=.998;game.meeting.chat=[{id:'contrast',uid:'host',name:'Black',alive:true,text:'黒スキンの発言',at:now()}];chatRenderStamp='';this.refresh();},
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
 const out=path.join(root,'qa-results');fs.mkdirSync(out,{recursive:true});const iconCatalog=new Map();
 await page.setViewportSize({width:1024,height:768});
 const prepare=async o=>{await page.evaluate(o=>__locationQA.prepare(o),o);await page.waitForTimeout(180);const rotate=page.getByRole('button',{name:'縦向きで続ける'});if(await rotate.isVisible())await rotate.click();};
 const modal=page.locator('#meetingLocationMap'),close=async()=>modal.getByRole('button',{name:'閉じる',exact:true}).click();
 const room=()=>modal.locator('[data-room]').first();
 await prepare({reporter:'qa'});assert(await modal.isVisible());assert.equal(await modal.getAttribute('aria-label'),'死体の場所を報告する');
 await room().click();assert(await modal.locator('.meetingLocationSend').isEnabled());await modal.locator('.meetingLocationSend').click();
 let state=await page.evaluate(()=>__locationQA.process());assert.equal(state.game.meeting.chat.length,1);const body=state.game.meeting.chat[0];assert.equal(body.locationReport.kind,'body');assert.equal(body.locationReport.selection.exact,false);assert(body.text.includes('crew2の死体は'));assert.equal(Object.keys(state.game.meeting.locationReports).length,1);
 await page.locator('.meetingLocationThumb').first().click();assert.equal(await modal.locator('[data-location-pin="body"]').count(),1);await close();await page.locator('#meetingMapBtn').tap();assert.equal(await modal.locator('[data-location-pin="body"]').count(),1);await close();
 await page.evaluate(s=>__locationQA.receive(s),state.game);await page.locator('.meetingLocationThumb').first().click();assert((await modal.textContent()).includes('qa'));await close();
 await page.evaluate(()=>__locationQA.clearChat());await page.locator('#meetingMapBtn').tap();assert.equal(await modal.locator('[data-location-pin="body"]').count(),1);await close();
 console.log('PASS reporter automatic UI, host submission, receiver preview, reopen and chat truncation persistence');
 // Position testimony and precise selection; disconnected sender keeps chosen location.
 await prepare();await page.locator('#meetingMapBtn').tap();await modal.getByRole('button',{name:'現在地を選ぶ',exact:true}).tap();await modal.getByRole('button',{name:'自分の位置を選ぶ'}).tap();
 await page.evaluate(()=>__locationQA.disconnect());assert(await modal.locator('.meetingLocationSend').isDisabled());assert(await modal.isVisible());await page.evaluate(()=>__locationQA.reconnect());await modal.locator('.meetingLocationSend').click();state=await page.evaluate(()=>__locationQA.process());assert.equal(state.game.meeting.chat.length,0);assert.equal(Object.values(state.game.meeting.locationReports)[0].locationReport.kind,'position');assert.equal(await page.locator('#chatMessages .chatText').count(),0);
 await page.evaluate(s=>__locationQA.receive(s),state.game);assert.equal(await page.locator('.meetingMapUnread').innerText(),'1');await page.locator('#meetingMapBtn').tap();assert(await page.locator('.meetingMapUnread').isHidden());assert.equal(await modal.locator('[data-location-pin="position"]').count(),1);assert((await modal.locator('svg').textContent()).includes('qa'));await modal.locator('.meetingLocationFilters').getByRole('button',{name:'経路'}).tap();assert.equal(await modal.locator('[data-location-pin]').count(),0);await close();
 await prepare();await page.locator('#meetingLocation-body').click();
 const point=await modal.locator('svg').evaluate(svg=>{const b=svg.getBoundingClientRect(),v=svg.parentElement.getBoundingClientRect();for(let x=Math.max(b.left,v.left)+20;x<Math.min(b.right,v.right)-20;x+=15)for(let y=Math.max(b.top,v.top)+20;y<Math.min(b.bottom,v.bottom)-20;y+=15){const target=document.elementFromPoint(x,y);if(svg.contains(target)&&target.tagName==='path'&&!target.closest('[data-room]'))return{x,y};}throw Error('No visible precise-map point');});
 await page.mouse.click(point.x,point.y);await modal.locator('.meetingLocationSend').click();state=await page.evaluate(()=>__locationQA.process());assert.equal(state.game.meeting.chat[0].locationReport.selection.exact,true);
 console.log('PASS named/color position pin, exact point and connection-loss draft retention');
 // Tap explicit room buttons; a swipe must not record intermediate rooms.
 await prepare();await page.locator('#meetingLocation-route').click();
 await modal.locator('.meetingLocationRooms summary').tap();
 for(const i of [0,1,0])await modal.locator('[data-pick-room]').nth(i).tap();
 assert.equal(await modal.locator('[data-route-step]').count(),2);const lines=await modal.locator('[data-route-step]').evaluateAll(ps=>ps.map(p=>p.getAttribute('d')));assert.notEqual(lines[0].replace(/^M|L/g,''),lines[1].replace(/^M|L/g,''));
 await page.screenshot({path:path.join(out,'location-return-route.png')});
 await modal.getByRole('button',{name:'一つ戻す'}).click();assert.equal(await modal.locator('[data-route-step]').count(),1);await room().click();assert.equal(await modal.locator('[data-route-step]').count(),2);await modal.locator('.meetingLocationSend').click();state=await page.evaluate(()=>__locationQA.process());assert.equal(state.game.meeting.chat.length,0);assert.equal(Object.values(state.game.meeting.locationReports)[0].locationReport.stops.length,3);
 await page.evaluate(s=>__locationQA.receive(s),state.game);await page.locator('#meetingMapBtn').tap();assert.equal(await modal.locator('[data-route-step]').count(),2);await close();
 console.log('PASS explicit room taps, return route, undo, room buttons and recipient route preview');
 // Every layout and viewport, genuine room-label taps and visible confirmation.
 for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1024,height:768}])for(const map of ['classic','astra','frost']){
  await page.setViewportSize(size);await prepare({map});const controls=await page.evaluate(()=>({map:document.querySelector('#meetingMapBtn').getBoundingClientRect().toJSON(),timer:document.querySelector('#meetingCountdown').getBoundingClientRect().toJSON()}));assert.equal(await page.locator('#meetingPositionBtn').count(),0);assert(controls.map.left>=controls.timer.right||controls.map.top>=controls.timer.bottom);await page.evaluate(()=>__locationQA.open('body'));
  await page.waitForFunction(()=>{const map=document.querySelector('#meetingLocationMap');return [...map.querySelectorAll('[data-room]')].every(room=>room.querySelector('[data-room-icon]')?.getAttribute('href')?.startsWith('data:image/svg+xml'));});
  const icons=await modal.locator('[data-pick-room]').evaluateAll(async entries=>{await Promise.all(entries.map(entry=>entry.querySelector('img').decode()));return entries.map(entry=>({id:entry.dataset.pickRoom,name:entry.textContent,url:entry.querySelector('img').src}));});
  const roomsInMap=(await page.evaluate(()=>__locationQA.state())).layout.rooms;assert.equal(icons.length,roomsInMap.length);assert.equal(await modal.locator('[data-room-icon]').count(),roomsInMap.length);
  if(size.width===1024){for(const icon of icons)iconCatalog.set(icon.url,{name:icon.name,url:icon.url});}
  if(map==='classic'){await modal.locator('.meetingLocationRooms summary').tap();await modal.locator('[data-pick-room]').first().tap();}else await room().tap();await page.waitForFunction(()=>document.querySelector('.meetingLocationSend')?.disabled===false,null,{timeout:3000});
  const send=modal.locator('.meetingLocationSend');await send.scrollIntoViewIfNeeded();assert(await send.isEnabled());const closeBox=await modal.getByRole('button',{name:'閉じる',exact:true}).boundingBox();assert(closeBox.y>=0&&closeBox.y+closeBox.height<=size.height,JSON.stringify(closeBox));const rect=await send.boundingBox();assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=size.width+1&&rect.y+rect.height<=size.height+1,JSON.stringify(rect));
  assert.equal(await modal.getByRole('button',{name:'拡大',exact:true}).count(),0);const mapSvg=modal.locator('svg'),before=await mapSvg.evaluate(svg=>svg.getScreenCTM().a);await mapSvg.focus();await page.keyboard.press('+');const enlarged=await mapSvg.evaluate(svg=>svg.getScreenCTM().a);assert(enlarged/before>1.2&&enlarged/before<1.3);await page.keyboard.press('0');
  if(map==='classic')await page.screenshot({path:path.join(out,'location-'+size.width+'.png')});await send.tap();state=await page.evaluate(()=>__locationQA.process());assert.equal(state.game.meeting.chat[0].locationReport.mapMode,map);
 }
 console.log('PASS all 52 room icons, image decoding, three layouts, four viewport sizes, icon-list selection, zoom and send');
 // Host validation rejects spoofed room/name/map/stale meeting, and routes ghosts separately.
 await prepare();state=await page.evaluate(()=>__locationQA.state());const base={kind:'body',mapMode:'classic',meetingId:state.game.meeting.id,victimId:'crew2',victimName:'fake',selection:{roomId:state.layout.rooms[0].id,label:'fake'}};
 const clean=await page.evaluate(r=>__locationQA.rules(r),base);assert.equal(clean.victimName,'crew2');assert.notEqual(clean.selection.label,'fake');
 for(const raw of [{...base,mapMode:'frost'},{...base,meetingId:'old'},{...base,victimId:'crew3'},{...base,selection:{roomId:'missing'}},{...base,selection:{x:1e9,z:0}},{...base,kind:'route',stops:[base.selection]}])assert.equal(await page.evaluate(r=>__locationQA.rules(r),raw),null);
 await page.evaluate(r=>__locationQA.command(r),{...base,mapMode:'frost'});state=await page.evaluate(()=>__locationQA.process());assert.equal(state.game.meeting.chat.length,0);assert.equal(state.game.commandResults.qa.ok,false);
 await prepare({alive:false});await page.evaluate(()=>__locationQA.open('position'));assert.equal(await modal.locator('.meetingLocationSend').textContent(),'ゴーストに共有');await modal.getByRole('button',{name:'自分の位置を選ぶ'}).tap();await modal.locator('.meetingLocationSend').click();state=await page.evaluate(()=>__locationQA.process());assert.equal((state.game.meeting.ghostChat||[]).length,0);assert.equal(state.game.meeting.chat.length,0);assert.equal(Object.keys(state.game.meeting.ghostLocationReports).length,1);
 await page.evaluate(s=>__locationQA.receive(s,'crew3'),state.game);await page.locator('#meetingMapBtn').tap();assert.equal(await modal.locator('[data-location-pin]').count(),0);await page.evaluate(()=>__locationQA.end());assert.equal(await modal.count(),0);
 console.log('PASS canonical validation, host rejection, ghost channel separation, meeting cleanup');
 // Embedded 3D chat mirrors both the composer actions and received map previews.
 await page.setViewportSize({width:1024,height:768});await prepare({three:true});const frame=await(await page.locator('#meeting3D').elementHandle()).contentFrame();await frame.waitForFunction(()=>window.meetingScene,null,{timeout:60000});await page.evaluate(()=>__locationQA.refresh());
 await frame.evaluate(()=>{window.__meetingEjectionOverlayActive=true;});await frame.locator('[data-location-action="meetingLocation-route"]').click();await close();await page.locator('#meetingMapBtn').tap();await modal.getByRole('button',{name:'現在地を選ぶ',exact:true}).tap();await modal.getByRole('button',{name:'自分の位置を選ぶ'}).tap();await modal.locator('.meetingLocationSend').click();state=await page.evaluate(()=>__locationQA.process());await page.evaluate(()=>__locationQA.refresh());assert.equal(await frame.getByRole('button',{name:'報告された場所をマップで見る'}).count(),0);await page.locator('#meetingMapBtn').tap();await modal.locator('[data-location-pin="position"]').waitFor({state:'visible'});assert.equal(await modal.locator('[data-location-pin="position"]').count(),1);await close();
 for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1024,height:768}]){await page.setViewportSize(size);await page.evaluate(()=>__locationQA.refresh());assert(!(await page.locator('#meetingCountdown').isVisible()));const timer=await frame.locator('#meetingTimerBar').boundingBox(),map=await page.locator('#meetingMapBtn').boundingBox();assert(map.y>=timer.y+timer.height+4,JSON.stringify({timer,map}));assert.equal(await page.locator('#meetingPositionBtn').count(),0);await page.screenshot({path:path.join(out,'location-3d-header-'+size.width+'.png')});}
 await page.evaluate(()=>__locationQA.newMeeting());await page.evaluate(()=>__locationQA.open('shared'));assert.equal(await modal.locator('[data-location-pin]').count(),0);
 for(const three of [false,true]){
  await prepare({three,emergency:true});assert(await page.locator('#meetingLocation-body').isHidden());
  await page.evaluate(()=>__locationQA.open('body'));assert.equal(await modal.count(),0);
  await page.locator('#meetingMapBtn').tap();assert.equal(await modal.getByRole('button',{name:'死体の場所',exact:true}).count(),0);await close();
  if(three){await page.evaluate(()=>__locationQA.refresh());assert.equal(await frame.locator('[data-location-action="meetingLocation-body"]').count(),0);assert(await frame.locator('[data-location-action="meetingLocation-route"]').isVisible());}
 }
 await prepare();await page.evaluate(()=>__locationQA.mayor());
 await page.locator('#mayorBtn').click();await page.locator('.mayorConfirmYes').click();
 const boosted=await page.evaluate(()=>__locationQA.process());
 assert.equal(boosted.game.meeting.chat.length,0);assert.equal(boosted.game.commandResults.qa.ok,true);
 assert.equal(await page.evaluate(()=>__locationQA.tally()),7);
 await page.evaluate(s=>__locationQA.receive(s,'crew3'),boosted.game);await page.locator('#mayorBtn').waitFor({state:'hidden'});
 assert(!(await page.evaluate(()=>__locationQA.seatData())).some(seat=>'boosted' in seat));
 await page.evaluate(()=>__locationQA.blackChat());
 const text=page.locator('[data-message-id="contrast"] .chatText');
 assert.equal(await text.textContent(),'黒スキンの発言');
 const colors=await text.evaluate(el=>[getComputedStyle(el).color,getComputedStyle(el.closest('.chatBubble')).backgroundColor,getComputedStyle(el.closest('.chatLine').querySelector('.chatAvatar')).backgroundColor]);
 const lum=rgb=>rgb.match(/[0-9.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const [a,b]=colors.map(lum);assert((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,JSON.stringify(colors));assert.equal(colors[2],'rgb(36, 38, 46)');
 console.log('PASS private mayor activation, seven-vote tally and black suit chat contrast');
 console.log('PASS emergency meeting body action absent in 2D, 3D and map tabs');
 console.log('PASS built 3D actions, thumbnail preview, next-meeting reset');
 await page.setViewportSize({width:1024,height:900});await page.evaluate(()=>__locationQA.end());
 await page.evaluate(icons=>{const sheet=document.createElement('section');sheet.id='qaRoomIconSheet';sheet.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0c1928;color:#eaf5ff;padding:24px;overflow:auto;font:14px system-ui';const title=document.createElement('h2');title.textContent='部屋の3Dアイコン';sheet.append(title);const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(7,1fr);gap:10px';for(const icon of icons){const item=document.createElement('div');item.style.cssText='background:#172b3d;border:1px solid #7297ae44;border-radius:12px;padding:8px;text-align:center';const img=new Image();img.src=icon.url;img.width=88;img.height=88;img.style.display='block';img.style.margin='auto';const label=document.createElement('span');label.textContent=icon.name;item.append(img,label);grid.append(item);}sheet.append(grid);document.body.append(sheet);},[...iconCatalog.values()]);
 await page.locator('#qaRoomIconSheet img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));await page.screenshot({path:path.join(out,'room-icon-catalog.png')});
`;
source=source.slice(0,begin)+checks+source.slice(end);
source=source.replace(' } finally {await browser.close();'," } catch(error){const pages=browser.contexts().flatMap(c=>c.pages());await pages[0]?.screenshot({path:path.join(root,'qa-results/location-failure.png')});throw error;} finally {await browser.close();");
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(source,filename);
