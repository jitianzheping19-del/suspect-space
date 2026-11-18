const assert=require('node:assert/strict'),fs=require('node:fs'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['meeting-location-map.js'],bundle:true,write:false,format:'iife',globalName:'Locations',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="meetingMapTools"><button id="meetingMapBtn">Map</button></div><form id="chatForm"></form><div id="preview"></div>');
  await page.addStyleTag({content:fs.readFileSync('meeting-location-map.css','utf8')});await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.evaluate(()=>{
   window.layout={bounds:{minX:0,maxX:100,minZ:0,maxZ:60},rooms:[{id:'A',label:'保管庫',x:25,z:30,w:50,d:60},{id:'B',label:'電気室',x:75,z:30,w:50,d:60}],corridors:[]};
   window.context={room:'test',uid:'self',round:1,phase:'meeting',meeting:{id:'m',reason:'遺体を発見'},self:{alive:true,name:'Self'},position:{x:10,z:10},canSend:true,presentationReady:true,mapMode:'classic',reports:[],color:'#80f0ff',players:{}};
   window.controller=Locations.createMeetingLocationMap({getContext:()=>context,getLayout:()=>layout,notify:()=>{},sendReport:r=>{window.report=r;return true;}});controller.sync();controller.open('route');
  });
  const viewport=page.locator('.meetingLocationViewport'),svg=viewport.locator('svg'),cdp=await page.context().newCDPSession(page);
  assert.equal(await page.getByRole('button',{name:'拡大',exact:true}).count(),0);
  const rect=await viewport.boundingBox(),cx=rect.x+rect.width/2,cy=rect.y+Math.min(rect.height/2,70);
  async function pinch(from,to){
   const points=distance=>[{id:1,x:cx-distance/2,y:cy},{id:2,x:cx+distance/2,y:cy}];
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(from)});
   for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(from+(to-from)*i/5)});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }
  await pinch(60,150);assert(Number(await viewport.getAttribute('data-zoom'))>2.3);assert.equal(await page.locator('[data-route-stop]').count(),0,'pinch does not select rooms');
  const startScroll=await viewport.evaluate(n=>({x:n.scrollLeft,y:n.scrollTop}));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx,y:cy}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx-30,y:cy-20}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const afterScroll=await viewport.evaluate(n=>({x:n.scrollLeft,y:n.scrollTop}));assert(afterScroll.x>startScroll.x||afterScroll.y>startScroll.y,'one finger pans the enlarged map');assert.equal(await page.locator('[data-route-stop]').count(),0);
  await pinch(150,45);assert.equal(Number(await viewport.getAttribute('data-zoom')),1);
  await page.locator('.meetingLocationRooms summary').tap();await page.locator('[data-pick-room="A"]').tap();await page.locator('[data-pick-room="B"]').tap();
  assert.equal(await svg.locator('[data-self-position]').count(),1);
  await page.locator('.meetingLocationSend').tap();const report=await page.evaluate(()=>window.report);assert.deepEqual(report.stops.map(s=>s.roomId),['A','B']);assert(!JSON.stringify(report).includes('selfPosition'));assert(!Object.hasOwn(report,'position'));
  await page.evaluate(()=>controller.decorate(document.getElementById('preview'),report,'sent',{uid:'self',name:'Self',color:'#80f0ff'}));assert.equal(await page.locator('#preview [data-self-position]').count(),0,'private position is absent from sent thumbnails');
  for(const mode of ['shared','route','body','position']){await page.evaluate(mode=>controller.open(mode),mode);assert.equal(await page.locator('[data-self-position]').count(),1,'self marker in '+mode);}
  await page.evaluate(()=>{context.position={x:15,z:20};controller.sync();});assert.equal(await page.locator('[data-self-position] circle').getAttribute('cx'),'15');
  await viewport.hover();await page.mouse.wheel(0,-200);assert(Number(await viewport.getAttribute('data-zoom'))>1.5);await svg.focus();await page.keyboard.press('0');assert.equal(Number(await viewport.getAttribute('data-zoom')),1);
  await page.evaluate(()=>{context.uid='other';context.position={x:90,z:50};controller.sync();controller.open('shared');});assert.equal(await page.locator('[data-self-position] circle').getAttribute('cx'),'90','recipient sees their own position');
  console.log('PASS real pinch in/out, drag without selection, room taps, wheel/keyboard zoom and private current position');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
