const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+'\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,rules:createLobbyGamesRules()};',resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/soccer');await page.waitForFunction(()=>window.QA&&window.__lobbyGames);
  await page.evaluate(()=>{window.requestAnimationFrame=()=>0;});await page.waitForTimeout(150);
  await page.evaluate(()=>{
   window.testNow=100000;Date.now=()=>testNow;
   window.people={self:{online:true,x:23,z:9,lobbyY:0,yaw:0},friend:{online:true,x:30,z:18,lobbyY:0,yaw:0}};
   window.postMessage({type:'lobby-games-state',enabled:true,state:QA.rules.fresh('self',testNow),uid:'self',host:'self',serverNow:testNow,players:people},'*');
  });await page.waitForFunction(()=>__lobbyGames.state);
  await page.evaluate(()=>{QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);QA.player.root.position.set(23,0,9);QA.player.root.rotation.y=0;QA.player.root.visible=true;QA.renderer.setPixelRatio(1);QA.renderer.setSize(960,600,false);QA.camera.position.set(27,3.2,13.6);QA.camera.lookAt(23,1.1,9.4);QA.camera.aspect=1.6;QA.camera.updateProjectionMatrix();for(const id of ['info','infoRight','topbar','customizePanel']){const e=document.getElementById(id);if(e)e.style.display='none';}});

  await page.evaluate(()=>{
   const crew=QA.createCrew('#edb980','BALL',23,12);QA.remoteCrews.set('friend',crew);QA.scene.add(crew.root);Object.assign(people.friend,{x:23,z:12,yaw:Math.PI});
   window.fixture=(selfX,selfZ,ownerX=23,ownerZ=12)=>{
    testNow=200000;QA.player.root.position.set(selfX,0,selfZ);QA.player.root.rotation.y=0;Object.assign(people.self,{x:selfX,z:selfZ,yaw:0,walking:false});Object.assign(people.friend,{x:ownerX,z:ownerZ,yaw:Math.PI,walking:false});crew.root.position.set(ownerX,0,ownerZ);crew.root.rotation.y=Math.PI;
    const state=QA.rules.fresh('self',testNow);Object.assign(state.soccer.ball,{x:ownerX,z:ownerZ-.74,dribbler:'friend'});window.postMessage({type:'lobby-games-state',enabled:true,state,uid:'self',host:'self',serverNow:testNow,players:people},'*');
   };fixture(23,6);
  });await page.waitForFunction(()=>__lobbyGames.state.soccer.ball.dribbler==='friend');
  const press=await page.evaluate(async()=>{
   const {player,rules,scene,renderer,camera}=QA,game=__lobbyGames;rules.pressInput(game.state.soccer,{uid:'self',held:true,serial:1,at:testNow},people,testNow);window.postMessage({type:'lobby-soccer-press-intent',held:true},'*');await new Promise(r=>setTimeout(r,0));
   camera.position.set(27,3.1,7.7);camera.lookAt(23,1,10.5);let serial=1,contactImage='',shieldChanged=false,maxStep=0,lowestGap=99,won=false;
   const nodes=[player.body,...player.legs,...player.root.userData.walkArms,QA.remoteCrews.get('friend').body];const signature=()=>nodes.map(n=>[...n.position.toArray(),...n.rotation.toArray()]);
   for(let i=0;i<240;i++){
    testNow=200000+i*1000/60;if(i%12===0)rules.pressInput(game.state.soccer,{uid:'self',held:true,serial:++serial,at:testNow},people,testNow);
    const before=player.root.position.clone();game.update(1/60);maxStep=Math.max(maxStep,before.distanceTo(player.root.position));Object.assign(people.self,{x:player.root.position.x,z:player.root.position.z,yaw:player.root.rotation.y});rules.step(game.state,people,testNow,1/60);
    lowestGap=Math.min(lowestGap,Math.hypot(player.root.position.x-23,player.root.position.z-12));const pose=signature();game.beforeRender(1/60);
    if(game.state.soccer.presses.self.phase==='reach'){shieldChanged=pose.at(-1).join()!==signature().at(-1).join();renderer.render(scene,camera);contactImage=renderer.domElement.toDataURL('image/png');}
    game.afterRender();if(JSON.stringify(pose)!==JSON.stringify(signature()))throw Error('Press pose restoration');
    if(game.state.soccer.ball.dribbler==='self'){won=true;break;}
   }
   const stoppedAt=player.root.position.clone();window.postMessage({type:'lobby-soccer-press-intent',held:false},'*');await new Promise(r=>setTimeout(r,0));game.update(.016);
   return {won,shieldChanged,lowestGap,maxStep,contactImage,stopped:stoppedAt.distanceTo(player.root.position)===0,locked:game.motionLocked()};
  });
  assert(press.won,'automatic pursuit reaches the holder and wins');assert(press.maxStep<=.081);assert(press.lowestGap>=.84,'does not run through holder');assert(press.shieldChanged,'holder braces during approach');assert(press.stopped&&!press.locked);
  fs.mkdirSync('/workspace/soccer-defense-2026-11-04/verification',{recursive:true});fs.writeFileSync('/workspace/soccer-defense-2026-11-04/verification/press-contact.png',Buffer.from(press.contactImage.split(',')[1],'base64'));
  console.log('PASS real scene auto-pursuit, collision, holder reaction, steal, exact pose restoration and immediate release',press.maxStep,press.lowestGap);
  const roll=await page.evaluate(()=>{
   const game=__lobbyGames,g=game.state.soccer,{player,scene,renderer,camera}=QA;testNow=300000;g.presses={};g.skills={};g.kicks={};g.dribble={uid:'self',at:testNow};player.root.position.set(23,0,9);player.root.rotation.y=0;player.root.userData.walking=true;Object.assign(people.self,{x:23,z:9,yaw:0,walking:true});Object.assign(g.ball,{x:23,y:.3,z:9.74,vx:0,vy:0,vz:0,dribbler:'self',at:testNow});QA.rules.step(game.state,people,testNow,1/60);
   game.ballMesh.position.set(23,.3,9.74);people.self.walking=false;player.root.userData.walking=false;testNow+=160;QA.rules.step(game.state,people,testNow,1/60);const heights=player.legs.map(n=>n.position.y);game.beforeRender(1/60);const lift=Math.max(...player.legs.map((n,i)=>n.position.y-heights[i]));camera.position.set(25.6,2.1,12);camera.lookAt(23,.9,9.5);renderer.render(scene,camera);const png=renderer.domElement.toDataURL('image/png');game.afterRender();
   g.dashes={self:{at:testNow,until:testNow+650,readyAt:testNow+950}};const speed=game.speedMultiplier();testNow+=700;const normal=game.speedMultiplier();return {lift,png,speed,normal};
  });assert(roll.lift>.4,'a tiny start-and-stop places a sole over the ball');assert(roll.speed>roll.normal*1.5);fs.writeFileSync('/workspace/soccer-defense-2026-11-04/verification/sole-roll.png',Buffer.from(roll.png.split(',')[1],'base64'));
  console.log('PASS sole roll after short input, controlled ball, dash speed and expiry');assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
