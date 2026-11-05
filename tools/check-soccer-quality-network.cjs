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

  // Receive a genuinely curved shot from the remote client via both transports.
  for(const rtc of [true,false]){
   Object.assign(server.players.guest,{x:server.players.host.x,z:server.players.host.z+1.3,yaw:Math.PI});await sync();
   await Promise.all([...pages.values()].map(p=>p.evaluate(rtc=>ctx.rtc=rtc,rtc)));
   await guest.evaluate(()=>{window.hold=setInterval(()=>controller.requestPress(true),230);controller.requestPress(true);});
   await guest.waitForFunction(()=>frameState.state.soccer.ball.dribbler==='guest');await guest.evaluate(()=>{clearInterval(hold);controller.requestPress(false);});
   Object.assign(server.players.host,{x:29,z:17});await sync();
   await guest.evaluate(()=>controller.request('kick',{mode:'shot',power:.85,spin:.8,yaw:Math.PI/2}));
   await host.waitForFunction(()=>frameState.state.soccer.kicks.guest?.spin===.8&&frameState.state.soccer.kicks.guest?.connected);
   const k=await host.evaluate(()=>frameState.state.soccer.kicks.guest);
   await guest.waitForFunction(id=>frameState.state.soccer.kicks.guest?.id===id&&frameState.state.soccer.kicks.guest?.connected,k.id);
   assert.equal(k.foot,1);assert.equal(k.spin,.8);
   const before=await host.evaluate(()=>frameState.state.soccer.kicks.guest.id);
   await host.evaluate(k=>controller.receive({kind:'lobby-games-command',command:{uid:'guest',owner:'host',kind:'kick',mode:'shot',power:.85,spin:.8,yaw:Math.PI/2,id:k.id,at:k.at}},{from:'guest'}),k);
   assert.equal(await host.evaluate(()=>frameState.state.soccer.kicks.guest.id),before,'retry reuses the same kick event');
   console.log('PASS remote curve kick with authoritative foot, contact and duplicate suppression, RTC:',rtc);
   if(rtc){
    // End/restart locally through the normal host command to reset ownership.
    await host.evaluate(()=>controller.request('stop',{game:'soccer'}));
    await Promise.all([...pages.values()].map(p=>p.evaluate(()=>ctx.offset+=6000)));
    await host.waitForFunction(()=>frameState.state.soccer.status==='idle');
    await host.evaluate(()=>controller.request('start-soccer'));
    await host.waitForFunction(()=>frameState.state.soccer.status==='countdown');
    const slots=await host.evaluate(()=>frameState.state.soccer.kickoff.slots);for(const [id,slot]of Object.entries(slots))Object.assign(server.players[id],slot);await sync();
    await Promise.all([...pages.values()].map(p=>p.evaluate(()=>ctx.offset+=8500)));
    await host.waitForFunction(()=>frameState.state.soccer.status==='playing');
   }
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
