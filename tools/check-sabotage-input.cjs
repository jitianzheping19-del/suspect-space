// Exercise the real game UI and host command handler with an in-memory database.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {createServer} = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const built=process.env.SABOTAGE_QA_BUILD==='1';
const servedRoot=built?path.resolve(root,'../qa-dist'):root;
const baseline=process.env.SABOTAGE_QA_BASELINE==='1';
const baselineHtml=baseline?require('node:child_process').execFileSync('git',['show','HEAD:index.html'],{cwd:root,encoding:'utf8',maxBuffer:32*1024*1024}):null;
const old = fs.readFileSync(path.join(__dirname, 'check-room-rejoin.cjs'), 'utf8');
const {fakeDatabase} = vm.runInNewContext(old.slice(old.indexOf('const fakeDatabase='), old.indexOf('(async()=>{')) + '\n({fakeDatabase})');
const fixture = `
window.__sabotageQA={
 prepare({map='classic',alive=true,subrole='impostor',cooldown=0,active=false,freeze=false,movementLocked=false}={}){
  uid='qa';hostId='host';code='5291';connected=true;db={};hostBusy=true;serverOffset=0;
  clearTimeout(commandRetryTimer);commandRetryTimer=null;commandQueue=[];pendingCommand=false;pendingCommandId='';commands={};
  const stamp=now(),spot=SPAWN_POINTS[0];position={x:spot.x,z:spot.z};deathPauseUntil=0;
  players={};const roster={};for(const [i,id]of ['qa','host','crew2','crew3','crew4'].entries()){
   players[id]={name:id,online:true,x:spot.x+i*.5,z:spot.z,hue:i/5,updatedAt:stamp,lastSeenAt:stamp,costume:'standard'};
   roster[id]={...players[id],role:id==='qa'||(!alive&&id==='host')?'impostor':'crew',subrole:id==='qa'?subrole:'crewmate',alive:id==='qa'?alive:true,assignedTasks:['fuel'],tasks:{},readyAt:0};
  }
  game={phase:'play',round:1,revision:0,startedAt:stamp-50000,playStartsAt:stamp-40000,countdownEndsAt:stamp-40000,settings:{mapMode:map,viewMode:'3d',waveMode:'normal',roles:{},voiceEnabled:false,sabotageCooldownSeconds:30},players:roster,bodies:{},sabotageReadyAt:stamp+cooldown};
  if(active)game.sabotage=createSabotage('lights','host',stamp);
  if(freeze)game.freeze={by:'host',until:stamp+60000};
  roomCreatedAt=stamp-100000;roomRosterRaw={...players};window.__qaDatabase={rooms:{'5291':{hostId,createdAt:roomCreatedAt,players:{...players},game}}};window.__qaWrites=[];
  setMapMode(map);clearTimeout(showTimers.get('roleReveal'));$('roleReveal').classList.remove('is-leaving','is-entering');$('roleReveal').classList.add('hidden');$('roleReveal').style.removeProperty('display');for(const id of ['setup','nameGate','roleReveal','roundRoles','meeting','meetingIntro','deathIntro','killAnimation','firebaseConnecting'])show(id,false);
  if(movementLocked){deathPauseUntil=performance.now()+60000;clearTimeout(showTimers.get('roleReveal'));$('roleReveal').style.display='none';$('roleReveal').classList.remove('hidden');}
  closeSabotageMap();renderUI();return this.state();
 },
 state(){return{can:canUseSabotage(),canPlay:canPlay(),open:!$('sabotageMap').classList.contains('hidden'),phase:game.phase,role:self()?.role,host:hostOnline(),locked:killActionsLocked(),pins:[...$('sabotageMap').querySelectorAll('button[data-sabotage-action],button[data-door-group]')].map(b=>({action:b.dataset.sabotageAction,door:b.dataset.doorGroup,disabled:b.disabled})),writes:window.__qaWrites.filter(w=>w.path.includes('/commands/')&&w.value?.type).map(w=>w.value),modals:[...document.querySelectorAll('[aria-modal=true]')].filter(e=>!e.classList.contains('hidden')&&!e.hidden).map(e=>e.id)};},
 advance(ms){serverOffset+=ms;updateSabotageMapActions();},
 disconnect(){connected=false;},
 freeze(){game.freeze={by:'host',until:now()+60000};updateSabotageMapActions();},
 async process(){
  const submitted=Object.values(window.__qaDatabase.rooms[code].commands?.qa||{}).filter(Boolean);hostId=uid;window.__qaDatabase.rooms[code].hostId=uid;hostBusy=false;
  ingestCommandSnapshot({qa:Object.fromEntries(submitted.map(c=>[c.id,c]))});await hostTick();hostBusy=true;
  const result=window.__qaDatabase.rooms[code].game;return{type:result.sabotage?.type,by:result.sabotage?.by,doors:result.doors,result:result.commandResults?.qa,phase:result.phase,submitted};
 }
};
`;
const server = createServer((req, res) => {
 const name = decodeURIComponent(new URL(req.url, 'http://local').pathname);
 const file = path.resolve(servedRoot, '.' + name.replace(/^\/suspect-space\//,'/'));
 if (!file.startsWith(servedRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
 let body = fs.readFileSync(file);
 let type = file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : 'text/html';
 if (file.endsWith('.css') && req.headers['sec-fetch-dest'] === 'script') {
  type = 'application/javascript'; body = 'const style=document.createElement("style");style.textContent=' + JSON.stringify(body.toString()) + ';document.head.append(style);';
 }
 if (file === path.join(root, 'index.html')) body = (baselineHtml||body.toString()).replace('function showMeetingIntro(reason)', () => fixture + '\nfunction showMeetingIntro(reason)');
 res.writeHead(200, {'Content-Type':type}).end(body);
});
(async () => {
 if(built){
  const {build}=await import('vite');
  await build({root,logLevel:'error',plugins:[{name:'sabotage-qa-fixture',transformIndexHtml:{order:'pre',handler:html=>html.replace('function showMeetingIntro(reason)',()=>fixture+'\nfunction showMeetingIntro(reason)')},load(id){if(id===path.join(root,'firebase-database-session.js'))return fakeDatabase+'\nexport const activateDatabaseSession=()=>{},blockDatabaseSession=()=>{},closeDatabaseSession=async()=>{};';}}],build:{outDir:servedRoot,emptyOutDir:true,rollupOptions:{input:path.join(root,'index.html')}}});
 }
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try {
  const page = await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
  page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});
  await page.addInitScript(()=>{if(window===top)sessionStorage.setItem('space-suspect-skip-autologin-once','1');});
  await page.route('**/firebase-database-session.js', r => r.fulfill({contentType:'application/javascript', body:fakeDatabase+'\nexport const activateDatabaseSession=()=>{},blockDatabaseSession=()=>{},closeDatabaseSession=async()=>{};'}));
  await page.route('**/firebase-database.js', r => r.fulfill({contentType:'application/javascript',body:fakeDatabase}));
  await page.route(/firebasedatabase\.app|firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/, r => r.abort());
  await page.route(/https:\/\/(cdn.jsdelivr.net\/npm|unpkg.com)\/three@0.164.1\//, r => r.fulfill({path:path.join(root,'node_modules/three',r.request().url().split('three@0.164.1/')[1]),contentType:'application/javascript'}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__sabotageQA,null,{timeout:30000});
  for(const options of [{alive:false,freeze:true},{movementLocked:true}]){
   await page.evaluate(options=>__sabotageQA.prepare(options),options);
   await page.waitForTimeout(250);await page.keyboard.press('q');
   await page.locator('#sabotageMap').waitFor({state:'visible'});
   assert(await page.locator('[data-sabotage-action="lights"]').isEnabled(),'Movement-only locks must not disable host-allowed sabotage: '+JSON.stringify(options));
   await page.locator('[data-sabotage-action="lights"]').tap();
   const result=await page.evaluate(()=>__sabotageQA.process());assert.equal(result.type,'lights');assert(result.result.ok);
   console.log('PASS host-allowed sabotage despite movement UI locks',options);
  }
  const cdp=await page.context().newCDPSession(page);
  const center=async selector=>{const r=await page.locator(selector).boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2,radiusX:1,radiusY:1,force:1};};
  await page.evaluate(()=>__sabotageQA.prepare());
  await page.locator('#sabotageBtn').waitFor({state:'visible'});await page.waitForTimeout(250);
  const stick={...await center('#stick'),id:1};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick,{...await center('#sabotageBtn'),id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[stick]});
  assert((await page.evaluate(()=>__sabotageQA.state())).open);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[stick,{...await center('[data-sabotage-action="reactor"]'),id:3}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[stick]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.equal((await page.evaluate(()=>__sabotageQA.state())).writes.length,1);
  const multi=await page.evaluate(()=>__sabotageQA.process());assert.equal(multi.type,'reactor');assert(multi.result.ok);
  console.log('PASS sabotage during joystick touch');
  for(const options of [{subrole:'samurai'},{cooldown:15000},{freeze:true}]){
   await page.evaluate(options=>__sabotageQA.prepare(options.freeze?{}:options),options);await page.locator('#sabotageBtn').tap();
   if(options.freeze)await page.evaluate(()=>__sabotageQA.freeze());
   assert(await page.locator('[data-sabotage-action="lights"]').isDisabled());
   const status=page.locator('#sabotageMapStatus');assert.equal(await status.getAttribute('data-visible'),'true');
   assert((await status.boundingBox()).height>5,'A blocked action must show a readable reason');
   if(options.cooldown){await page.evaluate(()=>__sabotageQA.advance(16000));assert(await page.locator('[data-sabotage-action="lights"]').isEnabled());}
  }
  console.log('PASS role restrictions, living freeze and cooldown expiry with visible feedback');
  await page.evaluate(()=>__sabotageQA.prepare({active:true}));await page.locator('#sabotageBtn').tap();
  assert(await page.locator('[data-sabotage-action="lights"]').isDisabled());
  const door=page.locator('[data-door-group]').first();const group=await door.getAttribute('data-door-group');await door.tap();
  const doorResult=await page.evaluate(()=>__sabotageQA.process());assert(doorResult.result.ok);assert(doorResult.doors.some(d=>d.groupId===group&&(d.closed||d.pendingClose)));
  console.log('PASS door sabotage remains usable during an active ship sabotage');
  await page.evaluate(()=>__sabotageQA.prepare());await page.locator('#sabotageBtn').tap();
  await page.evaluate(()=>{__sabotageQA.disconnect();document.querySelector('[data-sabotage-action="lights"]').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0,pointerType:'touch',pointerId:7}));});
  const rejected=await page.evaluate(()=>__sabotageQA.state());assert(rejected.open);assert.equal(rejected.writes.length,0);assert((await page.locator('#sabotageMapStatus').textContent()).includes('接続'));
  console.log('PASS connection loss at selection keeps the map and explains the rejection');
  for(const method of ['click','keyboard']){
   await page.evaluate(()=>__sabotageQA.prepare());await page.locator('#sabotageBtn').tap();const pin=page.locator('[data-sabotage-action="comms"]');
   if(method==='keyboard'){await pin.focus();await page.keyboard.press('Enter');}else await pin.click();
   const state=await page.evaluate(()=>__sabotageQA.state());assert.equal(state.writes.length,1);assert(!state.open);
   const result=await page.evaluate(()=>__sabotageQA.process());assert.equal(result.type,'comms');assert(result.result.ok);
  }
  console.log('PASS mouse and keyboard send exactly one selected sabotage');
  for(const size of (process.env.SABOTAGE_QA_MULTI?[]:[{width:667,height:375},{width:844,height:390},{width:1024,height:768},{width:1366,height:768}])){
   await page.setViewportSize(size);
   for(const map of ['classic','astra','frost'])for(const type of ['lights','comms','oxygen','reactor']){
    await page.evaluate(map=>__sabotageQA.prepare({map}),map);
    await page.locator('#sabotageBtn').tap();
    const pin=page.locator('#sabotageMapPins [data-sabotage-action="'+type+'"]');
    try{await pin.tap({timeout:5000});}catch(error){console.log('FAILED',size.width,map,type,await page.evaluate(()=>__sabotageQA.state()),await pin.evaluate(b=>{const r=b.getBoundingClientRect();return{rect:r.toJSON(),hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML};}));throw error;}
    await page.waitForFunction(()=>__sabotageQA.state().writes.length===1);
    const result=await page.evaluate(()=>__sabotageQA.process());
    assert.equal(result.type,type,JSON.stringify(result));assert.equal(result.by,'qa');assert(result.result.ok);
    console.log('PASS',size.width,map,type);
   }
  }
  assert.deepEqual(errors,[]);
 } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
