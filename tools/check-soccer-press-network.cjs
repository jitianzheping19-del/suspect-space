const {chromium}=require('playwright'),{build}=require('esbuild'),assert=require('node:assert/strict');
(async()=>{
 const bundle=await build({entryPoints:['lobby-games-runtime.js'],bundle:true,write:false,format:'iife',globalName:'Games',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const pages=new Map(),errors=[],server={host:'host',snapshot:null,players:{host:{online:true,x:23,z:10,lobbyY:0,yaw:0},guest:{online:true,x:23,z:15,lobbyY:0,yaw:Math.PI}},writes:0};
 try{
  async function sync(){await Promise.all([...pages.values()].map(page=>page.evaluate(s=>{Object.assign(ctx,{players:s.players,snapshot:s.snapshot,host:s.host});},server)));}
  for(const id of ['host','guest']){
   const page=await browser.newPage();pages.set(id,page);page.on('pageerror',e=>errors.push(e.message));await page.setContent('<button id="lobbyUseBtn">使用</button>');
   await page.exposeFunction('save',async(path,value)=>{if(path.endsWith('/game/lobbyGames')){assert.equal(id,server.host);server.snapshot=value;server.writes++;}else{assert(path.endsWith('/players/'+id));Object.assign(server.players[id],value);}await sync();});
   await page.exposeFunction('relay',async(payload,targets)=>{for(const target of targets)if(pages.has(target))await pages.get(target).evaluate(({payload,from})=>window.controller?.receive(payload,{from}),{payload,from:id});});
   await page.addScriptTag({content:bundle.outputFiles[0].text});
   await page.evaluate(({id,s})=>{
    window.ctx={enabled:true,room:'press-test',uid:id,host:s.host,players:s.players,snapshot:s.snapshot,admins:new Set(),offset:0,rtc:true};window.notices=[];window.intents=[];
    window.controller=Games.createLobbyGamesRuntime({context:()=>ctx,db:()=>({}),ref:(_,p)=>p,set:save,update:save,toast:x=>notices.push(x),clock:()=>Date.now()+ctx.offset,frame:()=>({postMessage(v){if(v.type==='lobby-games-state')window.frameState=v;else intents.push(v);}}),transport:()=>({publishEphemeral(payload,targets){if(!ctx.rtc)return false;void relay(payload,targets);return true;}})});
   },{id,s:server});
  }
  const host=pages.get('host'),guest=pages.get('guest');await guest.waitForFunction(()=>window.frameState?.state);
  await host.evaluate(()=>{Math.random=()=>.5;return controller.request('start-soccer');});await guest.waitForFunction(()=>frameState.state.soccer.status==='countdown');
  const slots=await host.evaluate(()=>frameState.state.soccer.kickoff.slots);for(const [id,slot]of Object.entries(slots))Object.assign(server.players[id],slot);await sync();
  await Promise.all([...pages.values()].map(p=>p.evaluate(()=>ctx.offset+=3100)));await guest.waitForFunction(()=>frameState.state.soccer.ball.dribbler==='host');
  await Promise.all([...pages.values()].map(p=>p.evaluate(()=>ctx.offset+=5100)));await guest.waitForFunction(()=>frameState.state.soccer.kickoff.released);
  await guest.evaluate(()=>controller.handleFrame({type:'lobby-games-action',area:'soccer',enabled:false,canSkill:false,yaw:Math.PI}));
  await guest.waitForFunction(()=>!document.querySelector('#soccerDefenseZone').hidden&&document.querySelector('#soccerPressBtn span')?.textContent==='プレス');
  await guest.evaluate(()=>controller.requestPress(true));await host.waitForFunction(()=>frameState.state.soccer.presses?.guest?.held);
  const old=await host.evaluate(()=>({...frameState.state.soccer.pressInputs.guest}));
  await guest.evaluate(()=>controller.requestPress(false));await host.waitForFunction(()=>!frameState.state.soccer.presses.guest.held);
  await host.evaluate(old=>controller.receive({kind:'lobby-games-press',command:{uid:'guest',owner:'host',held:true,serial:old.serial,at:Date.now()+ctx.offset}},{from:'guest'}),old);
  assert.equal(await host.evaluate(()=>frameState.state.soccer.presses.guest.held),false,'late heartbeat cannot resume');
  // Database fallback: hold, approach, and resolve on the host only.
  await Promise.all([...pages.values()].map(p=>p.evaluate(()=>ctx.rtc=false)));
  Object.assign(server.players.guest,{z:server.players.host.z+1.3});await sync();
  await guest.evaluate(()=>{window.hold=setInterval(()=>controller.requestPress(true),230);controller.requestPress(true);});
  await guest.waitForFunction(()=>frameState.state.soccer.ball.dribbler==='guest');await guest.evaluate(()=>{clearInterval(hold);controller.requestPress(false);});
  assert.equal(await host.evaluate(()=>frameState.state.soccer.ball.dribbler),'guest');
  assert.equal(await host.evaluate(()=>frameState.state.soccer.presses.guest.result),'won');
  await guest.waitForFunction(()=>document.querySelector('#soccerFeintBtn span').textContent==='フェイント');
  assert(server.writes>2);
  const before=await host.evaluate(()=>frameState.state.revision);
  await host.evaluate(()=>controller.receive({kind:'lobby-games-press',command:{uid:'host',owner:'host',held:true,serial:9999999999999,at:Date.now()+ctx.offset}},{from:'guest'}));
  assert.equal(await host.evaluate(()=>frameState.state.soccer.presses.host),undefined,'cannot press as another player');
  // Start a press then lose its heartbeat: the host expires it without a release packet.
  Object.assign(server.players.host,{z:16,yaw:Math.PI});await sync();await host.evaluate(()=>controller.requestPress(true));await host.waitForFunction(()=>frameState.state.soccer.presses.host?.held);
  await host.waitForFunction(()=>!frameState.state.soccer.presses.host.held,{},{timeout:2500});
  console.log('PASS two real runtimes: immediate release, reordered heartbeat, Firebase-only steal, shared ownership, mode switch, sender validation and lease expiry');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
