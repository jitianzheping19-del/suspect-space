const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['lobby-games-runtime.js'],bundle:true,write:false,format:'iife',globalName:'Games',loader:{'.css':'empty'}});
 const html=fs.readFileSync('index.html','utf8'),filter=html.split('    const touchActionButtons=')[1].split('// Host writes only game;')[0];
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height]of [[390,844],[844,390],[568,320],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1">');const frozen=new Date('2026-11-04T12:00:00Z');await page.clock.install({time:frozen});await page.clock.pauseAt(frozen);
  await page.evaluate(()=>{const orig=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return /webgl/.test(t)?null:orig.call(this,t,...a);};});
  await page.addScriptTag({content:bundle.outputFiles[0].text});await page.addScriptTag({content:'const code="TEST",game={phase:"lobby"};const touchActionButtons='+filter});for(const css of ['lobby-games.css','lobby-soccer-flick.css','lobby-soccer-defense.css','lobby-soccer-match.css'])await page.addStyleTag({content:fs.readFileSync(css,'utf8')});
  await page.evaluate(()=>{
   window.ctx={enabled:true,uid:'guest',host:'host',room:'TEST',players:{guest:{online:true,x:23,z:8,lobbyY:0},host:{online:true,x:23,z:12,lobbyY:0,yaw:Math.PI}},admins:new Set()};window.commands=[];window.presses=[];window.sent=[];
   window.runtime=Games.createLobbyGamesRuntime({context:()=>ctx,db:()=>null,ref:(_,p)=>p,update:async()=>{},set:async()=>{},frame:()=>({postMessage:x=>sent.push(x)}),transport:()=>({publishEphemeral(x){if(x.kind==='lobby-games-command')commands.push(x.command);if(x.kind==='lobby-games-press')presses.push(x.command);return true;}}),toast(){}});
   ctx.snapshot=runtime.rules.fresh('host',Date.now());Object.assign(ctx.snapshot.soccer,{status:'playing',members:{guest:0,host:1},endAt:Date.now()+180000});Object.assign(ctx.snapshot.soccer.ball,{x:23,z:11.26,dribbler:'host'});
   window.refresh=()=>runtime.handleFrame({type:'lobby-games-action',area:'soccer',enabled:false,yaw:0,rightX:1,rightZ:0,forwardX:0,forwardZ:1});
  });await page.clock.runFor(100);await page.evaluate(()=>refresh());
  const press=page.locator('#soccerPressBtn'),slide=page.locator('#soccerSlideBtn');assert(await press.isVisible());assert(await slide.isVisible());assert(await page.locator('#soccerFlickZone').isVisible(),'dash stays in its attack position while defending');assert(await press.isEnabled());
  for(const b of [press,slide,page.locator('#soccerMatchupBtn')]){const r=await b.boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=width&&r.y+r.height<=height);}
  await page.evaluate(()=>{window.events=[];for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture'])document.addEventListener(type,e=>events.push({type,id:e.pointerId,target:e.target.id}),true);});
  const cdp=await page.context().newCDPSession(page),r=await press.boundingBox(),finger={id:1,x:r.x+r.width/2,y:r.y+r.height/2},stick={id:2,x:55,y:height-65};
  async function touch(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});await page.clock.runFor(20);}
  await touch('touchStart',[finger]);await touch('touchEnd',[]);assert.equal(await page.evaluate(()=>presses.length),0,'quick tap does not tackle');
  await touch('touchStart',[finger]);await touch('touchStart',[finger,stick]);await page.clock.runFor(230);assert.equal(await page.evaluate(()=>presses.at(-1).held),true);const count=await page.evaluate(()=>presses.length);await page.clock.runFor(520);assert((await page.evaluate(()=>presses.length))>count);await touch('touchEnd',[finger]);assert.equal(await page.evaluate(()=>presses.at(-1).held),false,JSON.stringify(await page.evaluate(()=>({events,presses}))));await touch('touchEnd',[]);
  await touch('touchStart',[finger]);await page.clock.runFor(210);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>presses.at(-1).held),false);await touch('touchEnd',[]);
  const matchup=await page.locator('#soccerMatchupBtn').boundingBox(),matchFinger={id:5,x:matchup.x+matchup.width/2,y:matchup.y+matchup.height/2};
  const apart=(a,b)=>a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y;assert(apart(matchup,r),'matchup does not overlap press');
  const sr=await slide.boundingBox();assert(apart(matchup,sr),'matchup does not overlap slide');
  await touch('touchStart',[matchFinger]);await page.clock.runFor(240);assert.equal(await page.evaluate(()=>presses.at(-1).mode),'matchup');assert.equal(await page.evaluate(()=>presses.at(-1).held),true);
  await touch('touchEnd',[]);assert.equal(await page.evaluate(()=>presses.at(-1).held),false);
  // Flicks use screen-to-world camera basis and send exactly one host command.
  for(const [dx,dy,yaw]of [[0,-55,0],[55,0,Math.PI/2],[-55,0,-Math.PI/2],[0,55,Math.PI]]){
   const b=await slide.boundingBox(),f={id:3,x:b.x+b.width/2,y:b.y+b.height/2};await touch('touchStart',[f]);await touch('touchMove',[{...f,x:f.x+dx,y:f.y+dy}]);await touch('touchEnd',[]);
   const command=await page.evaluate(()=>commands.at(-1));assert.equal(command.kind,'soccer-slide');assert(Math.abs(Math.atan2(Math.sin(command.yaw-yaw),Math.cos(command.yaw-yaw)))<.001);await page.evaluate(c=>runtime.receive({kind:'lobby-games-result',id:c.id,ok:true},{from:'host'}),command);
  }
  assert.equal(await page.evaluate(()=>commands.length),4);
  // A cancelled swipe must never submit a tackle.
  {const b=await slide.boundingBox();await touch('touchStart',[{id:3,x:b.x+b.width/2,y:b.y+b.height/2}]);await touch('touchCancel',[]);assert.equal(await page.evaluate(()=>commands.length),4);}
  await page.evaluate(()=>{ctx.snapshot.soccer.ball.dribbler='guest';ctx.snapshot.at=Date.now();runtime.receive({kind:'lobby-games-state',state:ctx.snapshot},{from:'host'});refresh();});assert(await page.locator('#soccerDefenseZone').isHidden());assert(await page.locator('#soccerFlickZone').isVisible());
  await page.evaluate(()=>{const g=ctx.snapshot.soccer;Object.assign(g.ball,{dribbler:'',lastTouch:'guest',y:2});g.skills={guest:{kind:'heelLift',at:Date.now()-800,yaw:0,released:true}};ctx.snapshot.at=Date.now();runtime.receive({kind:'lobby-games-state',state:ctx.snapshot},{from:'host'});refresh();});
  assert(await page.locator('#soccerDefenseZone').isHidden(),'airborne own ball preserves attack controls');assert(await page.locator('#soccerKickBtn').isVisible());assert.equal(await page.locator('#soccerKickBtn span').innerText(),'オーバーヘッド');
  await page.evaluate(()=>{ctx.enabled=false;refresh();});assert(await page.locator('#soccerDefenseZone').isHidden());assert.deepEqual(errors,[]);await page.close();console.log('PASS runtime touch: hold/release/heartbeat, multitouch, cancel, four flick directions, possession switch and bounds',width,height);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
