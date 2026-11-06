const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,controls,updatePlayer,rules:createLobbyGamesRules(),setStick:(x,z)=>{lobbyStick.x=x;lobbyStick.z=z;}};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/soccer');await page.waitForFunction(()=>window.QA&&window.__lobbyGames);
  await page.evaluate(()=>{SpaceSuspectLobby.__lobbyRenderActive=false;window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
  await page.evaluate(()=>{
   window.testNow=100000;Date.now=()=>testNow;window.people={self:{online:true,x:23,z:8,yaw:0,lobbyY:0},enemy:{online:true,x:28,z:14,yaw:Math.PI,lobbyY:0}};
   window.state=QA.rules.fresh('self',testNow);window.sync=()=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-games-state',enabled:true,state,uid:'self',host:'self',serverNow:testNow,players:people}}));sync();QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);
   QA.renderer.setPixelRatio(1);QA.renderer.setSize(960,600,false);QA.camera.aspect=1.6;QA.camera.updateProjectionMatrix();QA.player.root.visible=true;
   for(const id of ['info','infoRight','topbar','customizePanel']){const e=document.getElementById(id);if(e)e.style.display='none';}
   window.signature=()=>[QA.player.root,QA.player.body,QA.player.pack,QA.player.visor,QA.player.shine,...QA.player.legs,...QA.player.root.userData.walkArms].map(n=>[...n.position.toArray(),...n.rotation.toArray()]);
   window.fixture=(yaw=0)=>{testNow=200000;state=QA.rules.fresh('self',testNow);Object.assign(state.soccer,{status:'playing',members:{self:0,enemy:1},endAt:testNow+180000});QA.player.root.position.set(23,0,8);QA.player.root.rotation.set(0,yaw,0);Object.assign(people.self,{x:23,z:8,yaw});Object.assign(people.enemy,{x:28,z:14});Object.assign(state.soccer.ball,{x:28,z:13.26,dribbler:'enemy'});sync();};
  });

  const result=await page.evaluate(()=>{
   fixture();state.soccer.status='idle';state.soccer.botOptions={enabled:true,blue:3,red:4};QA.player.root.position.set(33,0,10);Object.assign(people.self,{x:33,z:10});sync();__lobbyGames.update(.016);__lobbyGames.beforeRender(.016);
   const start=QA.scene.getObjectByName('soccer-button-start'),blue=QA.scene.getObjectByName('soccer-button-blue-count'),board=QA.scene.getObjectByName('soccer-stadium-scoreboard');
   __lobbyGames.updateCamera(.016,QA.controls);const first=QA.camera.position.clone();window.__lastLobbyCameraMode='soccer';window.__lobbyCameraPerspective='first';__lobbyGames.updateCamera(.016,QA.controls);
   const locked=!QA.controls.enabled&&QA.player.root.visible&&QA.camera.position.distanceTo(first)<.01,p=QA.player.root.position.clone().add(new QA.THREE.Vector3(0,1,0)).project(QA.camera);
   const under=start.getWorldPosition(new QA.THREE.Vector3()).y<board.position.y,botLabel=blue.userData.text;
   // Turn input takes time, and movement slows while changing facing.
   QA.player.root.position.set(23,0,8);QA.player.root.rotation.y=0;QA.setStick(1,0);QA.updatePlayer(.016,1);const turn=Math.abs(QA.player.root.rotation.y);QA.setStick(0,0);
   __lobbyGames.afterRender();return {locked,under,botLabel,turn,framed:Math.abs(p.x)<.7&&Math.abs(p.y)<.65};
  });assert(result.locked&&result.under&&result.botLabel==='青 BOT 3'&&result.turn>0&&result.turn<.08&&result.framed,JSON.stringify(result));console.log('PASS physical board controls, bot labels, locked player-priority camera and gradual turn',result);
  const views=await page.evaluate(()=>{
   fixture();__lobbyGames.beforeRender(.016);__lobbyGames.afterRender();
   const positions=[];for(const mode of ['length','side','third']){
    window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-camera',mode}}));
    for(let i=0;i<90;i++)__lobbyGames.updateCamera(1/60,QA.controls);
    const projected=QA.player.root.position.clone().add(new QA.THREE.Vector3(0,1,0)).project(QA.camera);
    positions.push({mode,position:QA.camera.position.toArray(),framed:Math.abs(projected.x)<.75&&Math.abs(projected.y)<.75});
   }
   const F=QA.rules.SOCCER;let frameHeight=0;QA.scene.traverse(n=>{if(n.name==='soccer-goal-frame'){const bounds=new QA.THREE.Box3().setFromObject(n);frameHeight=Math.max(frameHeight,bounds.max.y);}});
   state.soccer.botOptions={enabled:false,blue:0,red:0};QA.rules.step(state,people,testNow,1/60);sync();__lobbyGames.beforeRender(.016);
   const keepers=[0,1].map(team=>QA.scene.getObjectByName('soccer-goalkeeper-'+team));
   const keepersVisible=keepers.every(k=>k.visible&&[...k.position.toArray(),...k.rotation.toArray().slice(0,3)].every(Number.isFinite));__lobbyGames.afterRender();
   state.soccer.dashes={self:{at:testNow,until:testNow+10000,energyMs:4000,energyAt:testNow,held:true}};sync();
   const sprintSpeed=__lobbyGames.speedMultiplier();testNow+=4000;const tiredSpeed=__lobbyGames.speedMultiplier();delete state.soccer.dashes;
   const sign=QA.scene.getObjectByName('soccer-exit-sign');
   // Walk through the actual corridor one small step per update. The old
   // overlap solver clamped every attempted step back to x=12.55.
   QA.player.root.position.set(13.4,0,2.1);const route=[];
   for(let i=0;i<30;i++){const x=QA.player.root.position.x-.08;if(__lobbyGames.canMove(x,2.1))QA.player.root.position.x=x;__lobbyGames.update(1/60);route.push(QA.player.root.position.x);}
   return {keepersVisible,sprintSpeed,tiredSpeed,positions,frameHeight,goalHeight:F.goalHeight,exitText:sign.userData.text,area:__lobbyGames.area,route};
  });
  assert(views.keepersVisible);assert(views.sprintSpeed>views.tiredSpeed*1.5);
  assert(views.positions.every(p=>p.framed));assert(views.positions[0].position[2]>8);assert(views.positions[1].position[0]>30);assert(views.positions[2].position[1]<10);
  assert(views.frameHeight>=views.goalHeight);assert(views.exitText.includes('ロビー'));assert.equal(views.area,'lobby');assert(views.route.at(-1)<12);
  console.log('PASS three distinct framed camera views, enlarged goal geometry, inner exit sign and continuous walking through door',views.positions);
  await page.evaluate(()=>{QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);fixture();});
  await page.evaluate(()=>{QA.player.root.position.set(23,0,8);QA.camera.position.set(51,28,39);QA.camera.lookAt(23,1,10);__lobbyGames.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);});fs.mkdirSync('verification/goal-controls',{recursive:true});await page.screenshot({path:'verification/goal-controls/court.png'});await page.evaluate(()=>__lobbyGames.afterRender());assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
