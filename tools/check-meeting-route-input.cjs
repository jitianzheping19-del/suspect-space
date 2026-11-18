const assert=require('node:assert/strict'),fs=require('node:fs'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['meeting-location-map.js'],bundle:true,write:false,format:'iife',globalName:'Locations',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox']});try{
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<style>.hidden{display:none}</style><div id="meetingMapTools" class="hidden" inert aria-hidden="true" data-space-ui-visible="false"><button id="meetingMapBtn">Map</button></div><form id="chatForm"></form>');await page.addStyleTag({content:fs.readFileSync('meeting-location-map.css','utf8')});await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.evaluate(()=>{
   const room=(id,x,z,w,d)=>({id,label:id,x,z,w,d});
   window.layout={bounds:{minX:-5,maxX:14,minZ:-5,maxZ:5},rooms:[{...room('A',0,0,8,8),holes:[[{x:-1,z:-1},{x:1,z:-1},{x:1,z:1},{x:-1,z:1}]]},room('B',10,0,4,4)],corridors:[room('passage',6,0,4,2)]};
   window.context={room:'test',uid:'self',round:1,phase:'meeting',meeting:{id:'m'},self:{alive:true,name:'Self'},canSend:true,mapMode:'classic',reports:[],color:'#ff8080',players:{}};
   window.controller=Locations.createMeetingLocationMap({getContext:()=>context,getLayout:()=>layout,notify:()=>{},sendReport:r=>{window.report=r;return true;}});controller.sync();controller.open('route');
  });
  assert.equal(await page.locator('#meetingMapTools').getAttribute('aria-hidden'),'false');assert(!(await page.locator('#meetingMapTools').evaluate(e=>e.inert)));
  for(const id of ['A','B','A'])await page.locator('#meetingLocationMap [data-room="'+id+'"]').tap();
  assert.equal(await page.locator('[data-route-step]').count(),2);assert.match(await page.locator('.meetingLocationSelection').innerText(),/A → B → A/);assert(await page.locator('.meetingLocationSend').isEnabled());
  await page.locator('.meetingLocationSend').tap();assert.deepEqual(await page.evaluate(()=>report.stops.map(s=>s.roomId)),['A','B','A']);
  assert(await page.evaluate(()=>report.stops.every(s=>!(Math.abs(s.x)<1&&Math.abs(s.z)<1))),'room selection snaps to floor instead of center hole');
  assert(await page.locator('#meetingLocation-body').isHidden());await page.evaluate(()=>controller.open('body'));assert.equal(await page.locator('#meetingLocationMap').count(),0,'emergency meeting cannot open a body report');
  for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1024,height:768}]){
   await page.setViewportSize(size);await page.evaluate(()=>controller.open('route'));
   assert.equal(await page.locator('.meetingLocationToolbar').getByRole('button',{name:'死体の場所',exact:true}).count(),0);
   assert(!(await page.locator('.meetingLocationRooms').evaluate(e=>e.open)));await page.locator('.meetingLocationRooms summary').tap();
   const rooms=page.locator('[data-pick-room]');for(const item of await rooms.all()){const b=await item.boundingBox();assert(b.height>=60&&b.width>=136,JSON.stringify(b));}
   await rooms.first().tap();await rooms.last().tap();await rooms.first().tap();assert.equal(await page.locator('[data-route-stop]').count(),3);
   await page.locator('[data-route-stop="2"]').tap();assert.equal(await page.locator('[data-route-stop]').count(),2);
   await page.getByRole('button',{name:'一つ戻す',exact:true}).tap();assert(await page.locator('.meetingLocationSend').isDisabled());
   await rooms.last().tap();await page.locator('.meetingLocationSend').tap();assert.deepEqual(await page.evaluate(()=>report.stops.map(s=>s.roomId)),['A','B']);
  }
  await page.setViewportSize({width:844,height:390});await page.evaluate(()=>controller.open('route'));
  const positions=await page.locator('[data-room]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,id:1};})),cdp=await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[positions[0]]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[positions[1]]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal(await page.locator('[data-route-stop]').count(),0,'swiping the map must not add rooms');
  await page.evaluate(()=>{controller.close();context.meeting.reason='遺体を発見';controller.sync();});assert(await page.locator('#meetingLocation-body').isVisible());await page.locator('#meetingLocation-body').tap();assert(await page.locator('#meetingLocationMap').isVisible());
  await page.evaluate(()=>{
   controller.close();context.position={x:10,z:1};controller.sync();controller.open('position');
  });
  assert.equal(await page.locator('[data-self-position]').count(),1);
  await page.getByRole('button',{name:'自分の位置を選ぶ'}).tap();
  await page.getByRole('button',{name:'経路を作る',exact:true}).tap();
  assert.equal(await page.locator('[data-route-stop]').count(),0);
  await page.getByRole('button',{name:'現在地を選ぶ',exact:true}).tap();
  assert(await page.locator('.meetingLocationSelection').innerText().then(t=>t.includes('B')));
  await page.locator('.meetingLocationSend').tap();
  assert.deepEqual(await page.evaluate(()=>[report.kind,report.selection.label,report.selection.exact,report.selection.z]),['position','B',true,1]);
  await page.evaluate(()=>{
   const row=(id,uid)=>({id,uid,name:uid,color:'#667788',report});context.reports=[row('own','self'),row('one','friend'),row('two','friend')];
   controller.sync();controller.sync();
  });
  const badge=page.locator('.meetingMapUnread');
  assert.equal(await badge.innerText(),'2');
  await page.evaluate(()=>controller.open('position'));assert.equal(await badge.innerText(),'2');
  await page.getByRole('button',{name:'共有を見る'}).tap();assert(await badge.isHidden());
  await page.locator('.meetingLocationFilters').getByRole('button',{name:'経路'}).tap();
  await page.evaluate(()=>{context.reports.push({...context.reports[1],id:'three'});controller.sync();});
  assert.equal(await badge.innerText(),'1');
  await page.locator('.meetingLocationFilters').getByRole('button',{name:'現在地'}).tap();assert(await badge.isHidden());
  await page.evaluate(()=>{controller.close();controller.sync();});assert(await badge.isHidden());
  assert.deepEqual(errors,[]);console.log('PASS real touch room labels over a hole, room-wise returns, valid floor anchors and report submission');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
