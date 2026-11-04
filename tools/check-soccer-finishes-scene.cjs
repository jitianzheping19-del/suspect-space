const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,rules:createLobbyGamesRules()};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/soccer');await page.waitForFunction(()=>window.QA&&window.__lobbyGames);
  await page.evaluate(()=>{SpaceSuspectLobby.__lobbyRenderActive=false;window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
  await page.evaluate(()=>{
   window.testNow=100000;Date.now=()=>testNow;window.people={self:{online:true,x:23,z:10,yaw:0,lobbyY:0}};window.state=QA.rules.fresh('self',testNow);
   window.sync=()=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-games-state',enabled:true,state,uid:'self',host:'self',serverNow:testNow,players:people}}));sync();
   QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);QA.player.root.position.set(23,0,10);QA.player.root.rotation.y=0;
   QA.renderer.setPixelRatio(1);QA.renderer.setSize(960,600,false);QA.camera.aspect=1.6;QA.camera.updateProjectionMatrix();
   for(const id of ['info','infoRight','topbar','customizePanel']){const e=document.getElementById(id);if(e)e.style.display='none';}
   window.render=()=>{__lobbyGames.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);const png=QA.renderer.domElement.toDataURL('image/png');__lobbyGames.afterRender();return png;};
  });
  const shots=process.env.VISUAL_SHOTS;
  function save(name,png){if(shots){fs.mkdirSync(shots,{recursive:true});fs.writeFileSync(shots+'/'+name+'.png',Buffer.from(png.split(',')[1],'base64'));}}
  const solo=await page.evaluate(()=>{
   state=QA.rules.command(state,{id:'solo',uid:'self',kind:'start-soccer',at:testNow},people,'self',new Set(),testNow).state;
   for(let i=0;i<420;i++){testNow+=1000/60;QA.rules.step(state,people,testNow,1/60);sync();__lobbyGames.beforeRender(1/60);__lobbyGames.afterRender();}
   QA.camera.position.set(5,21,34);QA.camera.lookAt(25,.5,10);
   return{png:render(),bots:[1,2].map(n=>{const c=QA.scene.getObjectByName('soccer-bot-'+n);return{visible:c.visible,x:c.position.x,z:c.position.z};}),keepers:[0,1].map(n=>QA.scene.getObjectByName('soccer-goalkeeper-'+n).children[0].children[0].material.color.getHexString())};
  });
  assert(solo.bots.every(b=>b.visible&&b.x>=14&&b.x<=32));assert.deepEqual(solo.keepers,['62bcff','ff7185']);save('solo-bots-and-team-keepers',solo.png);
  const finish=await page.evaluate(()=>{
   testNow=200000;state=QA.rules.fresh('self',testNow);Object.assign(people.self,{x:23,z:10,yaw:0});QA.player.root.position.set(23,0,10);QA.player.root.rotation.set(0,0,0);Object.assign(state.soccer.ball,{x:23,z:10.74,dribbler:'self'});
   state=QA.rules.command(state,{id:'lift',uid:'self',kind:'soccer-skill',skill:'heelLift',side:1,yaw:0,at:testNow},people,'self',new Set(),testNow).state;sync();
   let shot='',contactDistance=null,restored=true,locked=false;
   for(let i=1;i<=260;i++){
    testNow=200000+i*10;sync();__lobbyGames.update(.01);Object.assign(people.self,{x:QA.player.root.position.x,z:QA.player.root.position.z});QA.rules.step(state,people,testNow,.01);
    if(i===40){const r=QA.rules.command(state,{id:'overhead',uid:'self',kind:'soccer-overhead',at:testNow},people,'self',new Set(),testNow);if(!r.ok)throw Error(r.message);state=r.state;sync();locked=__lobbyGames.motionLocked();}
    const original=JSON.stringify([QA.player.root,...QA.player.legs].map(n=>[...n.position.toArray(),...n.rotation.toArray()]));
    __lobbyGames.beforeRender(.01);
    if(i===79){QA.scene.updateMatrixWorld(true);contactDistance=QA.player.legs[1].getWorldPosition(new QA.THREE.Vector3()).distanceTo(__lobbyGames.ballMesh.getWorldPosition(new QA.THREE.Vector3()));QA.camera.position.set(28,2.8,15);QA.camera.lookAt(23,1.2,people.self.z+.5);QA.renderer.render(QA.scene,QA.camera);shot=QA.renderer.domElement.toDataURL('image/png');}
    __lobbyGames.afterRender();restored&&=original===JSON.stringify([QA.player.root,...QA.player.legs].map(n=>[...n.position.toArray(),...n.rotation.toArray()]));
   }
   return{locked,restored,shot,contactDistance,botsRemoved:!QA.scene.getObjectByName('soccer-bot-1'),unlocked:!__lobbyGames.motionLocked()};
  });
  assert(finish.locked&&finish.unlocked&&finish.restored&&finish.botsRemoved);assert(finish.contactDistance<.8,'overhead foot reaches ball: '+finish.contactDistance);save('overhead-contact',finish.shot);
  const punt=await page.evaluate(()=>{
   testNow=300000;state=QA.rules.fresh('self',testNow);Object.assign(state.soccer,{status:'playing',members:{self:0},practice:true,endAt:testNow+180000});Object.assign(people.self,{x:23,z:17});Object.assign(state.soccer.ball,{x:23,z:QA.rules.SOCCER.near+1,y:.3});
   let k,holdAt;
   for(let i=0;i<140;i++){testNow+=10;QA.rules.step(state,people,testNow,.01);k=state.soccer.keepers[0];if(state.soccer.ball.keeperOwner===0){holdAt=k.at;break;}}
   let high=0,low=10,shot='',kicked=false;
   while(testNow<holdAt+1650){testNow+=10;QA.rules.step(state,people,testNow,.01);sync();__lobbyGames.beforeRender(.01);
    if(testNow>=holdAt+1100&&testNow<holdAt+1550){high=Math.max(high,state.soccer.ball.y);low=Math.min(low,state.soccer.ball.y);}
    if(testNow>=holdAt+1550&&!shot){QA.camera.position.set(28,2.5,1.5);QA.camera.lookAt(23,1,-1);QA.renderer.render(QA.scene,QA.camera);shot=QA.renderer.domElement.toDataURL('image/png');kicked=k.phase==='punt'&&state.soccer.ball.vz>5;}
    __lobbyGames.afterRender();
   }
   return{high,low,kicked,shot};
  });
  assert(punt.high-punt.low>.4&&punt.kicked);save('keeper-punt',punt.shot);assert.deepEqual(errors,[]);
  const restart=await page.evaluate(()=>{
   testNow=400000;people={self:{online:true,x:23,z:10,lobbyY:0,yaw:0},enemy:{online:true,x:28,z:14,lobbyY:0,yaw:Math.PI}};state=QA.rules.fresh('self',testNow);
   Object.assign(state.soccer,{id:'restart-test',status:'playing',endAt:testNow+180000,members:{self:0,enemy:1}});
   Object.assign(state.soccer.ball,{x:23.5,z:QA.rules.SOCCER.far-.4,y:.9,vz:12});
   for(let i=0;i<15&&!state.soccer.kickoff;i++){testNow+=1000/60;QA.rules.step(state,people,testNow,1/60);}
   sync();const k=state.soccer.kickoff,slot=k.slots.self,position=QA.player.root.position,placed=Math.hypot(position.x-slot.x,position.z-slot.z)<.001,locked=__lobbyGames.motionLocked();
   for(const [id,p]of Object.entries(k.slots))Object.assign(people[id],p);
   testNow=k.readyAt-800;sync();__lobbyGames.beforeRender(.016);const centered=__lobbyGames.ballMesh.position.distanceTo(new QA.THREE.Vector3(23,.3,k.ballZ))<.01;__lobbyGames.afterRender();
   testNow=k.readyAt+1;QA.rules.step(state,people,testNow,.001);sync();return{placed,locked,centered,unlocked:!__lobbyGames.motionLocked(),owner:state.soccer.ball.dribbler};
  });assert(restart.placed&&restart.locked&&restart.centered&&restart.unlocked);assert.equal(restart.owner,'enemy');
  console.log('PASS scene goal reset teleports once, centers ball, freezes during celebration and unlocks opposing kickoff');
  console.log('PASS actual scene: solo bots, matching keeper uniforms, overhead contact and restored poses, dropped-ball punt and cleanup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
