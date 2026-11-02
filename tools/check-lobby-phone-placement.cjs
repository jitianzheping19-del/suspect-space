const fs=require('node:fs'),vm=require('node:vm'),{build}=require('esbuild');
(async()=>{
 const bundle=await build({entryPoints:['lobby-games-runtime.js'],bundle:true,write:false,format:'iife',globalName:'LobbyGames',loader:{'.css':'empty'}});
 let code=fs.readFileSync('tools/check-phone-lobby-loading.cjs','utf8').split(' const lobby=')[0];
 code=code.replace('file=path.join(root,u.pathname)',"file=path.join(root,'dist',u.pathname.replace('/suspect-space/',''))").replace("root+'/index.html'","root+'/dist/index.html'").replace(/ await page.addStyleTag[^\n]*\n/g,'');
 code+=`
 await page.addScriptTag({content:bundle});
 await page.evaluate(()=>{
  window.ctx={enabled:true,room:'fixture',uid:'host',host:'host',admins:new Set(),snapshot:null,players:{host:{online:true,name:'HOST',x:0,z:6,lobbyY:0},guest:{online:true,name:'GUEST',x:0,z:6,lobbyY:0}}};
  window.controller=LobbyGames.createLobbyGamesRuntime({context:()=>ctx,db:()=>({}),ref:(_,p)=>p,set:async()=>{},update:async()=>{},frame:()=>null,transport:()=>null,toast:()=>{}});
 });
 const overlap=(a,b)=>Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y)>1;
 for(const [width,height]of [[320,568],[390,844],[568,320],[667,375],[844,390],[932,430],[1280,590]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(80);
  const mic=await page.locator('#voiceToggleBtn').boundingBox(),play=await page.locator('#lobbyMiniGameToggle').boundingBox(),room=await page.locator('#lobbyRoomCode').boundingBox();
  assert(Math.abs(play.x-mic.x-mic.width-8)<1,'play beside VC '+width);assert.equal(play.y,mic.y);assert.equal(room.y,8);
  for(const id of ['lobbyRoster','voiceToggleBtn','titleInputSettingsBtn','inviteOnlineFloating','ticketBadge']){const r=await page.locator('#'+id).boundingBox();assert(!overlap(room,r),'room overlaps '+id);assert(!overlap(play,r),'play overlaps '+id);}
  await page.locator('#lobbyMiniGameToggle').tap();const panel=await page.locator('#lobbyMiniGamePanel').boundingBox();assert(panel&&panel.y>=0&&panel.y+panel.height<=height);assert(!overlap(panel,play));await page.locator('#lobbyMiniGameToggle').tap();
  console.log('PASS production CSS',width,height,'top room code, VC/play adjacency and taps');
 }
 for(const [width,height]of [[320,568],[390,844],[568,320],[844,390]])for(const mode of ['survival','tag','soccer']){
  await page.setViewportSize({width,height});
  await page.evaluate(mode=>{
   const t=Date.now();ctx.uid='guest';ctx.room='fixture-'+mode+'-'+t;ctx.snapshot={owner:'host',at:t,revision:t,seen:{},survival:null,tag:null,soccer:null};
   ctx.snapshot[mode]=mode==='survival'?{status:'playing',startAt:t-4000,endAt:t+90000,members:{host:{alive:true},guest:{alive:true}}}:mode==='tag'?{status:'playing',startAt:t-4000,oni:'guest',members:{host:true,guest:true},immune:{},frozenUntil:0}:{status:'playing',startAt:t-4000,endAt:t+180000,score:[0,0],members:{host:0,guest:1}};
   controller.handleFrame({type:'lobby-games-action',area:mode==='tag'?'lobby':mode,enabled:true,target:'host',yaw:0});
  },mode);
  await page.waitForFunction(mode=>document.body.dataset.lobbyMinigame===mode,mode);
  if(mode==='soccer'){assert.equal(await page.locator('#jumpBtn').isVisible(),false);continue;}
  const jump=await page.locator('#jumpBtn').boundingBox();assert.equal(jump.height,78);assert(jump.width>=92&&jump.x>=0&&jump.y>=0&&jump.x+jump.width<=width&&jump.y+jump.height<=height);
  for(const id of ['lobbyMiniGamePanel','lobbyUseBtn','lobbyTagTouchBtn','stick'])if(await page.locator('#'+id).isVisible())assert(!overlap(jump,await page.locator('#'+id).boundingBox()),'jump overlaps '+id+' '+width+' '+mode);
  console.log('PASS production CSS',width,height,mode,'larger jump without overlap');
 }
 await browser.close();
 })().catch(e=>{console.error(e);process.exit(1);});`;
 await vm.runInNewContext(code,{require,__dirname,process,console,Buffer,setTimeout,URL,bundle:bundle.outputFiles[0].text});
})().catch(e=>{console.error(e);process.exit(1)});
