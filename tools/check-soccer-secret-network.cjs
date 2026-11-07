const {chromium}=require('playwright'),{build}=require('esbuild'),assert=require('node:assert/strict');
(async()=>{
 const bundle=await build({entryPoints:['lobby-games-runtime.js'],bundle:true,write:false,format:'iife',globalName:'Games',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const pages=new Map(),errors=[],server={host:'host',snapshot:null,players:{host:{online:true,x:34,z:10,lobbyY:0,yaw:0},guest:{online:true,x:34,z:12,lobbyY:0,yaw:Math.PI}},writes:0};
 const jitter=process.env.SOCCER_NETWORK_JITTER==='1',traffic={packets:0,dropped:0,duplicated:0},inflight=new Set();let closing=false;
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 try{
  async function sync(){await Promise.all([...pages.values()].map(page=>page.evaluate(s=>{Object.assign(ctx,{players:s.players,snapshot:s.snapshot,host:s.host});},server)));}
  for(const id of ['host','guest']){
   const page=await browser.newPage();pages.set(id,page);page.on('pageerror',e=>errors.push(e.message));await page.setContent('<button id="lobbyUseBtn">使用</button>');
   await page.exposeFunction('save',async(path,value)=>{if(jitter)await delay(90);if(closing)return;if(path.endsWith('/game/lobbyGames')){assert.equal(id,server.host);server.snapshot=value;server.writes++;}else{assert(path.endsWith('/players/'+id));Object.assign(server.players[id],value);}await sync();});
   await page.exposeFunction('relay',async(payload,targets)=>{
    if(closing)return;const sequence=++traffic.packets;
    // Commands must survive a lost RTC packet through the database fallback.
    if(jitter&&(payload.kind==='lobby-games-command'||sequence%5===0)){traffic.dropped++;return;}
    const task=(async()=>{
     if(jitter)await delay([180,30,110,50][sequence%4]);
     for(const target of targets)if(pages.has(target)&&!closing){
      const deliver=()=>pages.get(target).evaluate(({payload,from})=>window.controller?.receive(payload,{from}),{payload,from:id});
      await deliver();if(jitter&&sequence%3===0&&!closing){await deliver();traffic.duplicated++;}
     }
    })();inflight.add(task);try{await task;}finally{inflight.delete(task);}
   });
   await page.addScriptTag({content:bundle.outputFiles[0].text});
   await page.evaluate(({id,s})=>{
    window.ctx={enabled:true,room:'press-test',uid:id,host:s.host,players:s.players,snapshot:s.snapshot,admins:new Set(),offset:0,rtc:true};window.notices=[];window.intents=[];
    window.controller=Games.createLobbyGamesRuntime({context:()=>ctx,db:()=>({}),ref:(_,p)=>p,set:save,update:save,toast:x=>notices.push(x),clock:()=>Date.now()+ctx.offset,frame:()=>({postMessage(v){if(v.type==='lobby-games-state')window.frameState=v;else intents.push(v);}}),transport:()=>({publishEphemeral(payload,targets){if(!ctx.rtc)return false;void relay(payload,targets);return true;}})});
   },{id,s:server});
  }
  const host=pages.get('host'),guest=pages.get('guest');await guest.waitForFunction(()=>window.frameState?.state);

  for(const page of pages.values())await page.evaluate(()=>controller.handleFrame({type:'lobby-games-action',area:'soccer',enabled:true,canSkill:true,yaw:0}));
  assert.equal((await guest.evaluate(()=>controller.request('soccer-bots',{team:'blue',delta:-1}))).ok,false);
  for(const team of ['blue','red','blue','blue','blue'])assert((await host.evaluate(team=>controller.request('soccer-bots',{team,delta:-1}),team)).ok);
  await guest.waitForFunction(()=>frameState.state.soccer.secretPending);
  assert((await host.evaluate(()=>{Math.random=()=>.5;return controller.request('start-soccer');})).ok);
  await guest.waitForFunction(()=>frameState.state.soccer.secretMode&&frameState.state.soccer.status==='countdown');
  const slots=await host.evaluate(()=>frameState.state.soccer.kickoff.slots);for(const [id,slot]of Object.entries(slots))Object.assign(server.players[id],slot);await sync();
  await Promise.all([...pages.values()].map(p=>p.evaluate(()=>ctx.offset+=3100)));await guest.waitForFunction(()=>frameState.state.soccer.ball.dribbler==='host');
  await host.waitForFunction(()=>!document.querySelector('#soccerSecretPowers').hidden);
  assert.equal(await host.locator('#soccerSecretPowers [data-power]').count(),11);
  await host.getByRole('button',{name:'分身フェイント',exact:true}).click();
  await guest.waitForFunction(()=>frameState.state.soccer.skills?.host?.kind==='doubleTouch');
  await host.waitForFunction(()=>document.querySelector('#soccerSecretPowers [data-power=feint]').disabled);
  await Promise.all([...pages.values()].map(p=>p.evaluate(()=>ctx.offset+=1200)));
  await host.waitForFunction(()=>frameState.state.soccer.ball.dribbler==='host');
  assert((await host.evaluate(()=>controller.request('soccer-hand'))).ok);await guest.waitForFunction(()=>frameState.state.soccer.ball.handOwner==='host');
  await Promise.all([...pages.values()].map(p=>p.evaluate(()=>ctx.offset+=6000)));await guest.waitForFunction(()=>frameState.state.soccer.kickoff.released);
  await guest.getByRole('tab',{name:'奥義',exact:true}).click();await guest.getByRole('button',{name:'氷晶壁',exact:true}).click();
  await host.waitForFunction(()=>frameState.state.soccer.secretPowers?.guest?.kind==='ice');
  // Both RTC and the database snapshot carry all room powers and goal offsets.
  await Promise.all([...pages.values()].map(p=>p.evaluate(()=>ctx.offset+=19000)));await guest.waitForFunction(()=>frameState.state.soccer.secretGoalMove);
  await host.locator('#soccerSecretPowers button').filter({hasText:'腹砲'}).click();await guest.waitForFunction(()=>frameState.state.soccer.ball.bellyOwner==='host');
  await guest.waitForFunction(()=>frameState.state.soccer.ball.fire&&!frameState.state.soccer.ball.handOwner);
  // Arrange one incoming ball in the authoritative simulation and let the
  // ordinary host tick automatically form and synchronize the paired finish.
  Object.assign(server.players.host,{x:22.4,z:8.4});Object.assign(server.players.guest,{x:23.6,z:8.4});
  server.players.opponent={online:true,x:31,z:15,yaw:Math.PI};await sync();
  await host.evaluate(()=>{const g=frameState.state.soccer;Object.assign(g,{members:{host:0,guest:0,opponent:1},secretPowers:{},secretCombo:null,combinationCooldowns:{},finishes:{},kicks:{},receives:{},kickoff:null,flight:null});Object.assign(g.ball,{x:23,z:9.2,y:3,vx:0,vy:0,vz:0,dribbler:'',lastTouch:'opponent',resetUntil:0,freeUntil:0,fire:false});delete g.ball.handOwner;delete g.ball.secretShot;});
  await guest.waitForFunction(()=>frameState.state.soccer.secretCombo?.hitAt);
  assert.equal(await guest.evaluate(()=>frameState.state.soccer.secretCombo.kind),'twinOverhead');
  assert.deepEqual((await guest.evaluate(()=>frameState.state.soccer.secretCombo.ids)).sort(),['guest','host']);
  assert((await host.evaluate(()=>controller.request('stop',{game:'soccer'}))).ok);await guest.waitForFunction(()=>!frameState.state.soccer.secretMode);
  await guest.waitForFunction(()=>document.querySelector('#soccerSecretPowers').hidden);
  assert((await host.evaluate(()=>controller.request('start-soccer'))).ok);await guest.waitForFunction(()=>frameState.state.soccer.status==='countdown');assert.equal(await guest.evaluate(()=>frameState.state.soccer.secretMode),false);
  assert.deepEqual(errors,[]);console.log('PASS host-only arming, synchronized mode/countdown/hand/goal move/belly fire, actual power button, one-match consumption');
 }finally{closing=true;await Promise.allSettled([...inflight]);await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
