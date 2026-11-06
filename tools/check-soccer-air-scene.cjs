const fs=require('node:fs'),assert=require('node:assert/strict');
const {build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nimport {createSoccerFlickControls} from './lobby-soccer-flick.js';window.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,createSoccerFlickControls,rules:createLobbyGamesRules()};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,outfile:'lobby.js',format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER',e.message);});await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/soccer');await page.waitForFunction(()=>window.QA&&window.__lobbyGames);
  await page.addStyleTag({content:compiled.outputFiles.find(f=>f.path.endsWith('.css')).text});
  await page.evaluate(()=>{window.SpaceSuspectLobby.__lobbyRenderActive=false;window.requestAnimationFrame=()=>0;});
  await page.evaluate(()=>{
   window.testNow=100000;Date.now=()=>testNow;
   window.people={self:{online:true,x:23,z:9,lobbyY:0},friend:{online:true,x:28,z:13,lobbyY:0},enemy:{online:true,x:30,z:18,lobbyY:0}};
   window.state=QA.rules.fresh('self',testNow);Object.assign(state.soccer,{status:'playing',members:{self:0,friend:0,enemy:1},endAt:testNow+180000});Object.assign(state.soccer.ball,{z:9.8,dribbler:'self'});
   window.sync=()=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-games-state',enabled:true,state,uid:'self',host:'self',serverNow:testNow,players:people}}));sync();
   QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);QA.player.root.position.set(23,0,9);
   for(const [id,color]of [['friend','#65b2ff'],['enemy','#fa7589']]){const p=people[id],crew=QA.createCrew(color,id==='friend'?'味方':'相手',p.x,p.z);QA.scene.add(crew.root);QA.remoteCrews.set(id,crew);}QA.renderer.setPixelRatio(1);QA.renderer.setSize(960,600,false);QA.camera.aspect=1.6;QA.camera.position.set(23,17,28);QA.camera.lookAt(23,0,10);QA.camera.updateProjectionMatrix();
   window.aim=(extra={})=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-aim',active:true,yaw:Math.atan2(5,4),charging:true,power:.2,...extra}}));
  });
  const result=await page.evaluate(()=>{
   aim();__lobbyGames.beforeRender(.016);
   const guide=QA.scene.getObjectByName('soccer-aim-guide'),gauge=QA.scene.getObjectByName('soccer-charge-gauge'),end=guide.localToWorld(new QA.THREE.Vector3(0,0,Math.hypot(5,4)));
   const low=gauge.material.map.image.getContext('2d').getImageData(220,24,1,1).data[0];
   const first={visible:guide.visible,gauge:gauge.visible,mode:guide.userData.mode,target:guide.userData.target,endpoint:[end.x,end.z],low,power:gauge.userData.power,below:gauge.position.y<.2};
   QA.renderer.render(QA.scene,QA.camera);__lobbyGames.afterRender();
   aim({power:1,forceShot:true});__lobbyGames.beforeRender(.016);const high=gauge.material.map.image.getContext('2d').getImageData(220,24,1,1).data[0];const shot=guide.userData.mode==='shot'&&!guide.userData.target;
   QA.renderer.render(QA.scene,QA.camera);__lobbyGames.afterRender();
   return{first,high,shot};
  });
  assert(result.first.visible&&result.first.gauge&&result.first.below);assert.equal(result.first.mode,'pass');assert.equal(result.first.target,'friend');assert(Math.hypot(result.first.endpoint[0]-28,result.first.endpoint[1]-13)<.001);assert.equal(result.first.power,.2);assert(result.first.low<50&&result.high>150,'charge texture fills visibly');assert(result.shot,'second tap shows a shot guide');
  await page.evaluate(()=>{
   const {createSoccerFlickControls}=QA;window.controls=createSoccerFlickControls({document,window,context:()=>({visible:true,enabled:true,canSkill:true,canDash:true,yaw:Math.atan2(5,4),rightX:1,rightZ:0,forwardX:0,forwardZ:1,resolveAim:(yaw,force)=>QA.rules.kickAim(state,'self',people,yaw,force)}),send(){}});controls.update();
   for(const id of ['info','infoRight','topbar','customizePanel']){const e=document.getElementById(id);if(e)e.style.display='none';}
   aim({power:.72});__lobbyGames.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);__lobbyGames.afterRender();
  });
  if(process.env.VISUAL_SHOTS){fs.mkdirSync(process.env.VISUAL_SHOTS,{recursive:true});await page.screenshot({path:process.env.VISUAL_SHOTS+'/soccer-aim-and-charge.png'});}
  const cleanup=await page.evaluate(()=>{
   aim({active:false});__lobbyGames.beforeRender(.016);const hidden=!QA.scene.getObjectByName('soccer-aim-guide').visible&&!QA.scene.getObjectByName('soccer-charge-gauge').visible;__lobbyGames.afterRender();
   state.soccer.dashes={self:{until:testNow+650}};sync();const normal=__lobbyGames.speedMultiplier();window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-dash-intent',held:false}}));const released=__lobbyGames.speedMultiplier();
   aim();state.soccer.ball.x=31;state.soccer.ball.z=20;sync();__lobbyGames.beforeRender(.016);const lost=!QA.scene.getObjectByName('soccer-charge-gauge').visible;__lobbyGames.afterRender();return{hidden,normal,released,lost};
  });assert(cleanup.hidden&&cleanup.lost);assert(cleanup.normal>cleanup.released*1.5);assert.deepEqual(errors,[]);
  const stadium=await page.evaluate(()=>{
   const game=__lobbyGames,g=game.state.soccer;Object.assign(g,{score:[3,2],endAt:testNow+65000});Object.assign(g.ball,{x:23,z:9.8,y:.3});
   g.keepers={0:{x:23,z:QA.rules.SOCCER.near+.75,phase:'ready'},1:{x:23,z:QA.rules.SOCCER.far-.75,phase:'dive',fromX:23,toX:24.4,height:1.8,side:1,at:testNow-180,until:testNow+650}};
   g.receives={self:{kind:'header',at:testNow-420,until:testNow+900,yaw:0}};
   const original=QA.player.root.rotation.x;game.beforeRender(.016);
   const board=QA.scene.getObjectByName('soccer-stadium-scoreboard'),keeper=QA.scene.getObjectByName('soccer-goalkeeper-1');
   const result={score:board.userData.score,seconds:board.userData.seconds,width:board.children.find(n=>n.geometry?.type==='PlaneGeometry').geometry.parameters.width,head:QA.player.root.rotation.x-original,dive:keeper.rotation.z,gloves:0};keeper.traverse(n=>{if(n.name==='goalkeeper-glove')result.gloves++;});
   game.afterRender();result.restored=QA.player.root.rotation.x===original;
   g.receives.self={kind:'trap',part:'foot',at:testNow-250,until:testNow+400};const leg=QA.player.legs[1],base=leg.rotation.x;game.beforeRender(.016);result.trap=leg.rotation.x<base-.4;game.afterRender();result.trapRestored=leg.rotation.x===base;
   delete g.receives.self;g.score=[0,0];g.endAt=testNow+180000;
   QA.camera.position.set(4,23,36);QA.camera.lookAt(25,1,10);QA.camera.updateProjectionMatrix();game.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);game.afterRender();return result;
  });
  assert.deepEqual(stadium.score,[3,2]);assert.equal(stadium.seconds,65);assert.equal(stadium.width,7.6);assert(stadium.head>1&&Math.abs(stadium.dive)>.5);assert(stadium.restored&&stadium.trap&&stadium.trapRestored);assert.equal(stadium.gloves,2);
  if(process.env.VISUAL_SHOTS)await page.screenshot({path:process.env.VISUAL_SHOTS+'/stadium-and-keepers.png'});
  const pickup=await page.evaluate(()=>{
   state=QA.rules.fresh('self',testNow);people.self={online:true,x:26,z:3,lobbyY:0};people.friend={online:true,x:20,z:8,lobbyY:0};people.enemy={online:true,x:30,z:16,lobbyY:0};
   Object.assign(state.soccer,{status:'playing',endAt:testNow+180000,members:{self:0,friend:0,enemy:1}});Object.assign(state.soccer.ball,{x:23.2,z:QA.rules.SOCCER.near+1.6,y:.3});
   window.advanceKeeper=()=>{testNow+=1000/60;QA.rules.step(state,people,testNow,1/60);sync();__lobbyGames.beforeRender(1/60);__lobbyGames.afterRender();};
   for(let i=0;i<30&&state.soccer.ball.keeperOwner===undefined;i++)advanceKeeper();
   const k=state.soccer.keepers[0],at=k.at,keeper=QA.scene.getObjectByName('soccer-goalkeeper-0');
   while(testNow<at+230)advanceKeeper();const scoop=keeper.children[0].rotation.x;
   while(testNow<at+650)advanceKeeper();QA.scene.updateMatrixWorld(true);
   const gloves=[];keeper.traverse(n=>{if(n.name==='goalkeeper-glove')gloves.push(n.getWorldPosition(new QA.THREE.Vector3()));});
   const middle=gloves[0].clone().add(gloves[1]).multiplyScalar(.5),ball=__lobbyGames.ballMesh.getWorldPosition(new QA.THREE.Vector3());
   const result={scoop,held:state.soccer.ball.keeperOwner,handDistance:middle.distanceTo(ball)};
   while(testNow<at+1050)advanceKeeper();result.raised=state.soccer.ball.y;result.windup=keeper.children[0].children.filter(n=>n.type==='Group')[0].rotation.x;
   QA.camera.position.set(29,5,-.4);QA.camera.lookAt(23,1,-1.5);QA.camera.updateProjectionMatrix();__lobbyGames.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);__lobbyGames.afterRender();return result;
  });
  assert(pickup.scoop>.4&&pickup.held===0);assert(pickup.handDistance<.4,'ball rests between the keeper gloves');assert(pickup.raised>1.6&&pickup.windup< -2,'raised arms match the throw preparation');
  if(process.env.VISUAL_SHOTS)await page.screenshot({path:process.env.VISUAL_SHOTS+'/keeper-pickup-and-throw.png'});
  const release=await page.evaluate(()=>{const k=state.soccer.keepers[0];for(let i=0;i<30&&!state.soccer.flight;i++)advanceKeeper();QA.scene.updateMatrixWorld(true);const gloves=[];QA.scene.getObjectByName('soccer-goalkeeper-0').traverse(n=>{if(n.name==='goalkeeper-glove')gloves.push(n.getWorldPosition(new QA.THREE.Vector3()));});const middle=gloves[0].clone().add(gloves[1]).multiplyScalar(.5),handDistance=middle.distanceTo(new QA.THREE.Vector3(k.contact.x,k.contact.y,k.contact.z));return{phase:k.phase,target:state.soccer.flight?.target,owner:state.soccer.ball.keeperOwner,vy:state.soccer.ball.vy,handDistance};});
  assert.equal(release.phase,'distribute');assert.equal(release.target,'self');assert.equal(release.owner,undefined);assert(release.vy>2);assert(release.handDistance<.45,'throw releases near the gloves: '+release.handDistance);assert.deepEqual(errors,[]);
  console.log('PASS actual keeper pickup bend, ball between gloves, raised throw windup and nearest teammate distribution');
  console.log('PASS goal-width double-sided 3D board, live score/time, dedicated keeper kit/gloves, save dive, header fall, trap and pose restoration');
  console.log('PASS actual minified 3D lobby: assisted line ends at teammate, forced shot line, visible charge texture below feet, release/possession cleanup and immediate local dash release');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
