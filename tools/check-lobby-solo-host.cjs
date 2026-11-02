const assert=require('node:assert/strict');
const fs=require('node:fs');
const {build}=require('esbuild');
const {chromium}=require('playwright');

(async()=>{
 const {createLobbyGamesRules}=await import('../lobby-games-rules.js');
 const R=createLobbyGamesRules(),admins=new Set(['admin']),T=100000;
 const position=area=>({online:true,name:'Crew',x:area==='survival'?-15:area==='soccer'?23:0,z:0,lobbyY:0});
 let sequence=0;
 const command=(s,uid,kind,roster,at=T,extra={})=>R.command(s,{id:'solo-host-'+(++sequence),uid,kind,at,...extra},roster,'host',admins,at);
 for(const area of ['tag','survival','soccer']){
  const roster={host:position(area)},result=command(R.fresh('host',T),'host','start-'+area,roster);
  assert(result.ok,area+' starts alone');
  const s=result.state,g=s[area];assert(g.practice);
  if(area==='survival')Object.assign(roster.host,{...R.tilePoint(0),lobbyY:3});
  R.step(s,roster,T+3100,1/60);assert.equal(g.status,'playing',area+' survives countdown');
  R.step(s,roster,T+4100,1/60);assert.equal(g.status,'playing',area+' continues with one participant');
  assert(command(s,'host','stop',roster,T+4200,{game:area}).ok);
  roster.host.online=false;R.step(s,roster,T+4300,1/60);assert.equal(g.status,'finished',area+' ends when empty');
  const players={host:position(area),guest:position(area),admin:position(area)};
  for(const uid of ['guest','admin']){
   assert.equal(command(R.fresh('host',T),uid,'start-'+area,players).ok,false,uid+' cannot start '+area);
   const playing=command(R.fresh('host',T),'host','start-'+area,players).state;
   assert.equal(command(playing,uid,'stop',players,T+100,{game:area}).ok,false,uid+' cannot stop '+area);
  }
 }
 const roster={host:position('tag'),guest:position('tag')};
 const multiplayer=command(R.fresh('host',T),'host','start-tag',roster).state;
 roster.guest.online=false;R.step(multiplayer,roster,T+3100,1/60);
 assert.equal(multiplayer.tag.status,'finished','normal multiplayer still ends with too few participants');
 console.log('PASS all three solo games continue after countdown, empty games end, and only hosts can start/stop');

 const bundle=await build({entryPoints:['lobby-games-runtime.js'],bundle:true,minify:true,write:false,format:'iife',globalName:'LobbyGames',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox']});
 const errors=[];
 try{
  for(const uid of ['host','guest','admin']){
   const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
   page.on('pageerror',error=>errors.push(error.message));
   await page.setContent('<style>.hidden{display:none!important}</style><div id="lobbyRoster">プレイヤー一覧</div><button id="lobbyUseBtn">使用</button>');
   await page.addStyleTag({content:fs.readFileSync('lobby-games.css','utf8')});
   const touch=fs.readFileSync('index.html','utf8').split('    const touchActionButtons=')[1].split('// Host writes only game;')[0];
   await page.addScriptTag({content:'const code="fixture",game={phase:"lobby"};const touchActionButtons='+touch});
   await page.addScriptTag({content:bundle.outputFiles[0].text});
   await page.evaluate(({uid,player})=>{
    document.body.dataset.phase='lobby';
    window.ctx={enabled:true,room:'solo-host',uid,host:'host',admins:new Set(['admin']),players:{[uid]:player},snapshot:null,timeOffset:0};
    window.controller=LobbyGames.createLobbyGamesRuntime({context:()=>window.ctx,db:()=>({}),ref:(_,p)=>p,set:async()=>{},update:async()=>{},transport:()=>null,toast:()=>{},frame:()=>({postMessage(value){window.frameState=value;}}),clock:()=>Date.now()+window.ctx.timeOffset});
   },{uid,player:position('tag')});
   await page.waitForFunction(()=>!!window.frameState);
   const toggle=page.locator('#lobbyMiniGameToggle'),start=page.locator('.miniGameButtons button').first(),stop=page.locator('#lobbyMiniGameStop');
   if(uid==='host'){
    assert(await toggle.isVisible());await toggle.tap();await start.tap();
    await page.waitForFunction(()=>window.frameState.state.tag?.status==='countdown');
    assert(await page.locator('#lobbyMiniGameCountdown').isVisible());
    assert.equal(await page.evaluate(()=>document.body.dataset.lobbyMinigame),'tag');
    assert(await page.locator('#lobbyRoster').isHidden(),'participant roster hidden');
    await page.evaluate(()=>window.ctx.timeOffset+=4100);
    await page.waitForFunction(()=>window.frameState.state.tag?.status==='playing');
    assert.equal(await page.locator('#lobbyMiniGameCountdown').isVisible(),false);
    assert(await stop.isVisible());assert.match(await page.locator('#lobbyMiniGamePanel').innerText(),/1人練習/);
    await stop.tap();await page.waitForFunction(()=>window.frameState.state.tag?.status==='finished');
    assert(await page.locator('#lobbyRoster').isVisible(),'end restores roster');
    for(const area of ['survival','soccer']){
     await page.evaluate(({area,player})=>{window.ctx.players.host=player;window.controller.handleFrame({type:'lobby-games-action',area,enabled:false});},{area,player:position(area)});
     await start.tap();await page.waitForFunction(area=>window.frameState.state[area]?.status==='countdown'&&window.frameState.state[area].practice,area);
     assert(await page.locator('#lobbyMiniGameCountdown').isVisible(),area+' participant countdown');
     if(area==='soccer'){
      assert(await page.locator('#lobbySoccerScore').isVisible());assert.match(await page.locator('#lobbySoccerScore').textContent(),/Crew（あなた）/);
      const a=await page.locator('#lobbySoccerScore').boundingBox(),b=await page.locator('#lobbyMiniGamePanel').boundingBox();assert(a.y+a.height<=b.y||b.y+b.height<=a.y,'score does not overlap controls');
     }
     await stop.tap();await page.waitForFunction(area=>window.frameState.state[area]?.status==='finished',area);
     assert.equal(await page.locator('#lobbyMiniGameCountdown').isVisible(),false,'cancel clears countdown');
     assert.equal(await page.evaluate(()=>document.body.dataset.lobbyMinigame),undefined,'cancel restores normal UI');
    }
    await page.evaluate(()=>{window.controller.handleFrame({type:'lobby-games-action',area:'lobby',enabled:false});});
    assert(await page.locator('#lobbyMiniGamePanel').isVisible());assert(await page.locator('#lobbySoccerScore').isHidden(),'room exit hides score');
    await page.evaluate(()=>window.ctx.host='other');
    await page.waitForFunction(()=>document.getElementById('lobbyMiniGameToggle').classList.contains('hidden'));
    assert.equal(await start.isVisible(),false);assert.equal(await stop.isVisible(),false);
    assert.equal(await page.locator('#lobbyMiniGamePanel').isVisible(),false,'host handover closes the old host menu');
   }else{
    assert.equal(await toggle.isVisible(),false);assert.equal(await start.isVisible(),false);
    for(const area of ['tag','survival','soccer']){
     for(const member of [false,true]){
      await page.evaluate(({area,uid,member})=>{
       const t=Date.now(),state=window.controller.rules.fresh('host',t);
       state[area]={status:'countdown',startAt:t+10000,endAt:t+90000,oni:'host',members:member?{[uid]:area==='soccer'?0:area==='survival'?{alive:true}:true}: {host:true}};
       window.ctx.snapshot=state;window.controller.handleFrame({type:'lobby-games-action',area:area==='tag'?'lobby':area,enabled:false});
      },{area,uid,member});
      await page.waitForFunction(({area,member,uid})=>window.frameState.state?.[area]?.status==='countdown'&&Object.hasOwn(window.frameState.state[area].members,uid)===member,{area,member,uid});
      assert.equal(await page.locator('#lobbyMiniGameCountdown').isVisible(),member,area+' countdown only for participants');
      assert.equal(await page.evaluate(()=>document.body.dataset.lobbyMinigame),member?area:undefined,area+' immersive UI only for participants');
      assert.equal(await page.locator('#lobbyRoster').isHidden(),member,area+' spectator retains normal UI');
     }
     await page.evaluate(({area,uid})=>{
      const t=Date.now(),state=window.controller.rules.fresh('host',t);
      state[area]={status:'playing',startAt:t,endAt:t+90000,oni:uid,immune:{},frozenUntil:0,members:area==='tag'?{[uid]:true,host:true}:area==='soccer'?{[uid]:0,host:1}:{[uid]:{alive:true},host:{alive:true}}};
      window.ctx.snapshot=state;
      window.controller.handleFrame({type:'lobby-games-action',area:area==='tag'?'lobby':area,enabled:true,target:'host'});
     },{area,uid});
     await page.waitForFunction(area=>window.frameState.state?.[area]?.status==='playing',area);
     assert.equal(await start.isVisible(),false);assert.equal(await stop.isVisible(),false);
     if(area==='tag')assert(await page.locator('#lobbyTagTouchBtn').isVisible(),'participants retain tag control');
    }
   }
   await page.close();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS minified mobile UI: solo touch start/stop, host-only menus including admins, participant controls and host handover');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
