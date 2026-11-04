const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,updatePlayer,rules:createLobbyGamesRules(),setStick:(x,z)=>{lobbyStick.x=x;lobbyStick.z=z;}};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
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
   window.positions=[];window.addEventListener('message',e=>{if(e.data?.type==='lobby-position')positions.push(e.data);});window.signature=()=>[QA.player.root,QA.player.body,QA.player.pack,QA.player.visor,QA.player.shine,...QA.player.legs,...QA.player.root.userData.walkArms].map(n=>[...n.position.toArray(),...n.rotation.toArray()]);
   window.fixture=(yaw=0)=>{testNow=200000;state=QA.rules.fresh('self',testNow);Object.assign(state.soccer,{status:'playing',members:{self:0,enemy:1},endAt:testNow+180000});QA.player.root.position.set(23,0,8);QA.player.root.rotation.set(0,yaw,0);Object.assign(people.self,{x:23,z:8,yaw});Object.assign(people.enemy,{x:28,z:14});Object.assign(state.soccer.ball,{x:28,z:13.26,dribbler:'enemy'});sync();};
  });

  const result=await page.evaluate(async()=>{
   fixture(0);Object.assign(state.soccer.ball,{x:23,z:8.64,dribbler:'self'});people.self.walking=false;QA.player.root.userData.walking=false;QA.rules.step(state,people,testNow,1/60);sync();
   QA.camera.position.set(23,3,0);QA.camera.lookAt(23,0,8);QA.setStick(0,-.005);let maxLift=0,minSurfaceGap=99,restored=true;const starts=new Set();
   for(let i=1;i<=150;i++){
    testNow=200000+i*1000/60;
    if(i===95)QA.setStick(0,0);
    QA.updatePlayer(1/60,10+i/60);await new Promise(r=>setTimeout(r,0));
    const p=positions.at(-1);if(p)Object.assign(people.self,{x:p.x,z:p.z,yaw:p.yaw,walking:p.walking});QA.player.root.userData.walking=people.self.walking;
    QA.rules.step(state,people,testNow,1/60);sync();__lobbyGames.update(1/60);const c=state.soccer.dribble;if(c.rollAt!==undefined)starts.add(c.rollAt);
    const pose=JSON.stringify(signature());__lobbyGames.beforeRender(1/60);QA.scene.updateMatrixWorld(true);
    for(const leg of QA.player.legs){const pos=leg.getWorldPosition(new QA.THREE.Vector3()),ball=__lobbyGames.ballMesh.getWorldPosition(new QA.THREE.Vector3());maxLift=Math.max(maxLift,leg.position.y-.32);if(Math.abs(leg.rotation.x+Math.PI/2)<.08)minSurfaceGap=Math.min(minSurfaceGap,Math.hypot(pos.x-ball.x,pos.z-ball.z, pos.y-.18-(ball.y+.3)));}
    __lobbyGames.afterRender();restored&&=pose===JSON.stringify(signature());
   }
   const clock=state.soccer.dribble.rollAt;for(let i=151;i<=210;i++){testNow=200000+i*1000/60;QA.rules.step(state,people,testNow,1/60);}return {starts:starts.size,maxLift,minSurfaceGap,restored,walkSent:positions.some(p=>p.walking),travel:QA.player.root.position.z-8,looped:state.soccer.dribble.rollAt!==clock,owner:state.soccer.ball.dribbler};
  });
  assert(result.walkSent,'0.5% stick movement is sent as walking');assert(result.travel>0&&result.travel<.05);assert(result.starts>=3);assert(result.maxLift>.4);assert(result.minSurfaceGap<.09,'sole meets visible ball: '+result.minSurfaceGap);assert(result.restored&&!result.looped);assert.equal(result.owner,'self');console.log('PASS real tiny joystick: movement reporting, repeated sole touches, visible ball contact, settled release and exact pose restoration',result);
  fs.mkdirSync('verification',{recursive:true});
  const shot=await page.evaluate(()=>{
   fixture(0);Object.assign(state.soccer.ball,{x:23,z:8.64,dribbler:'self'});QA.rules.step(state,people,testNow,1/60);people.self.x+=.004;testNow+=20;QA.rules.step(state,people,testNow,.02);
   for(let i=1;i<=15;i++){testNow+=1000/60;QA.rules.step(state,people,testNow,1/60);sync();__lobbyGames.update(1/60);}
   QA.player.root.position.set(people.self.x,0,8);QA.camera.position.set(25.6,1.8,11.4);QA.camera.lookAt(23,.8,8.3);__lobbyGames.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);const png=QA.renderer.domElement.toDataURL('image/png');__lobbyGames.afterRender();return png;
  });fs.writeFileSync('verification/sole-close-touch.png',Buffer.from(shot.split(',')[1],'base64'));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
