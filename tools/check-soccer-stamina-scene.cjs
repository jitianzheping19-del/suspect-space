const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,updatePlayer,keeperColliders:soccerKeeperColliders,rules:createLobbyGamesRules(),setStick:(x,z)=>{lobbyStick.x=x;lobbyStick.z=z;}};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
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

  for(const [width,height] of [[390,844],[844,390],[1024,768]]){
   await page.setViewportSize({width,height});
   const result=await page.evaluate(({width,height})=>{
    QA.camera.aspect=width/height;QA.camera.updateProjectionMatrix();fixture();
    state.soccer.dashes={self:{at:testNow,energyAt:testNow,energyMs:3000,until:testNow+650,held:true}};testNow+=300;sync();__lobbyGames.update(.016);
    const readings=[];
    for(const mode of ['length','side','third']){
     window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-camera',mode}}));
     __lobbyGames.updateCamera(.016,{target:new QA.THREE.Vector3()});
     __lobbyGames.beforeRender(.016);
     const p=QA.player.root.position.clone().project(QA.camera),g=document.getElementById('soccerStamina'),rect=g.getBoundingClientRect(),fill=g.firstElementChild.getBoundingClientRect();
     readings.push({fillHeight:fill.height,fillWidth:fill.width,mode,hidden:g.hidden,text:g.textContent,level:g.getAttribute('aria-valuenow'),x:parseFloat(g.style.left),y:parseFloat(g.style.top),expectedX:(p.x+1)*width/2,expectedY:(1-p.y)*height/2+10,cameraX:QA.camera.position.x,playerX:QA.player.root.position.x});__lobbyGames.afterRender();
    }
    state.soccer.bots={a:{online:true,team:0},b:{online:true,team:1},c:{online:true,team:1}};sync();__lobbyGames.update(.016);__lobbyGames.beforeRender(.016);__lobbyGames.afterRender();
    const board=['blue','red'].map(team=>QA.scene.getObjectByName('soccer-bot-display-'+team).userData.text);
    state.soccer.bots={};sync();__lobbyGames.update(.016);__lobbyGames.beforeRender(.016);__lobbyGames.afterRender();const emptyBoard=['blue','red'].map(team=>QA.scene.getObjectByName('soccer-bot-display-'+team).userData.text);
    testNow+=5000;__lobbyGames.updateCamera(.016,{target:new QA.THREE.Vector3()});__lobbyGames.beforeRender(.016);__lobbyGames.afterRender();const recovered=document.getElementById('soccerStamina').hidden;
    __lobbyGames.exit();return {readings,board,emptyBoard,recovered,exitHidden:document.getElementById('soccerStamina').hidden};
   },{width,height});
   for(const r of result.readings){assert(!r.hidden);assert.equal(r.text,'');assert.equal(r.level,'90');assert(r.fillHeight>=4&&r.fillWidth>50,'stamina fill must have visible pixels');assert(Math.abs(r.x-r.expectedX)<.01&&Math.abs(r.y-r.expectedY)<.01);if(r.mode==='side')assert(r.cameraX<r.playerX,'camera uses opposite touchline');}
   assert.deepEqual(result.board,['1','2']);assert.deepEqual(result.emptyBoard,['0','0']);assert(result.recovered&&result.exitHidden);
   console.log('PASS player-anchored number-free stamina in all cameras, opposite side view and live 3D bot counts',width,height);
   await page.evaluate(()=>{QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);});
  }
  const volley=await page.evaluate(()=>{
   fixture();state.soccer.finishes={self:{kind:'volley',at:200000,contactAt:200180,until:201150,yaw:0,fromYaw:0,contact:{x:23.3,y:1,z:8.65}}};
   Object.assign(state.soccer.ball,{x:23.3,y:1,z:8.65,dribbler:'',lastTouch:'enemy'});
   const readings=[],shots=[];QA.camera.position.set(26,2.7,12);QA.camera.lookAt(23,1,8);
   for(const age of [0,65,100,180,380,620,1150]){
    testNow=200000+age;sync();const before=JSON.stringify(signature());__lobbyGames.beforeRender(.016);QA.scene.updateMatrixWorld(true);
    const left=QA.player.legs[0].getWorldPosition(new QA.THREE.Vector3()),right=QA.player.legs[1].localToWorld(new QA.THREE.Vector3(0,-.25,0));
    readings.push({age,yaw:QA.player.root.rotation.y,left:left.toArray(),right:right.toArray(),restored:false});
    if([100,180,380].includes(age)){QA.renderer.render(QA.scene,QA.camera);shots.push({age,png:QA.renderer.domElement.toDataURL('image/png')});}
    __lobbyGames.afterRender();readings.at(-1).restored=before===JSON.stringify(signature());
   }
   return {readings,shots};
  });
  assert(volley.readings.every(r=>r.restored),'all volley poses restore the movement rig');
  const at=age=>volley.readings.find(r=>r.age===age);
  assert(at(100).yaw<-.5&&at(380).yaw>.8,'hips wind up and follow through around the left leg');
  assert(Math.hypot(at(65).left[0]-at(0).left[0],at(65).left[2]-at(0).left[2])<.15,'left leg anchors takeoff');
  assert(Math.hypot(at(180).right[0]-23.3,at(180).right[1]-1,at(180).right[2]-8.65)<.5,'right boot reaches the ball at contact');
  if(process.env.VISUAL_SHOTS){fs.mkdirSync(process.env.VISUAL_SHOTS,{recursive:true});for(const s of volley.shots)fs.writeFileSync(process.env.VISUAL_SHOTS+'/volley-'+s.age+'.png',Buffer.from(s.png.split(',')[1],'base64'));}
  console.log('PASS volley left pivot, right-foot contact, rotating follow-through and restored movement pose');

  const mismatch=await page.evaluate(()=>{
   let max=0;fixture();
   for(const team of [0,1])for(const phase of ['ready','dive','recover'])for(const age of [40,180,380,640]){
    testNow=200000+age;const dir=team===0?1:-1,k={team,x:23,z:(team===0?QA.rules.SOCCER.near:QA.rules.SOCCER.far)+dir*.75,phase,at:200000,until:200850,fromX:23,toX:24.2,height:2,side:1,saves:0};
    state.soccer.keepers={[team]:k};sync();__lobbyGames.beforeRender(.016);QA.scene.updateMatrixWorld(true);
    const rig=QA.scene.getObjectByName('soccer-goalkeeper-'+team),gloves=[];rig.traverse(n=>{if(n.name==='goalkeeper-glove')gloves.push(n);});
    const colliders=QA.keeperColliders(k,testNow).filter(c=>c.part==='glove');
    gloves.forEach((g,i)=>{const p=g.getWorldPosition(new QA.THREE.Vector3()),c=colliders[i].a;max=Math.max(max,Math.hypot(p.x-c.x,p.y-c.y,p.z-c.z));});__lobbyGames.afterRender();
   }
   return max;
  });assert(mismatch<1e-6,'rendered glove and collision positions agree: '+mismatch);console.log('PASS actual rendered gloves match host colliders throughout both keepers dives and recovery');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
