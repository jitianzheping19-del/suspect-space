const assert=require('node:assert/strict'),fs=require('node:fs'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['meeting-location-map.js'],bundle:true,write:false,format:'iife',globalName:'Locations',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox']});try{
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<style>.hidden{display:none}</style><div id="meetingMapTools" class="hidden" inert aria-hidden="true" data-space-ui-visible="false"><button id="meetingMapBtn">Map</button></div>');await page.addStyleTag({content:fs.readFileSync('meeting-location-map.css','utf8')});await page.addScriptTag({content:bundle.outputFiles[0].text});
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
  assert.deepEqual(errors,[]);console.log('PASS real touch room labels over a hole, room-wise returns, valid floor anchors and report submission');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
