const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,rules:createLobbyGamesRules(),setStick:(x,z)=>{lobbyStick.x=x;lobbyStick.z=z;}};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
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
  for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
   const result=await page.evaluate(yaw=>{
    fixture(yaw);const r=QA.rules.command(state,{id:'slide',kind:'soccer-slide',uid:'self',at:testNow,yaw},people,'self',new Set(),testNow);if(!r.ok)throw Error(r.message);state=r.state;sync();let maxStep=0,restored=true,changed=false;
    for(let i=1;i<=102;i++){testNow=200000+i*1000/60;sync();const before=QA.player.root.position.clone();__lobbyGames.update(1/60);maxStep=Math.max(maxStep,before.distanceTo(QA.player.root.position));Object.assign(people.self,{x:QA.player.root.position.x,z:QA.player.root.position.z});QA.rules.step(state,people,testNow,1/60);const pose=JSON.stringify(signature());__lobbyGames.beforeRender(.016);if(i===20)changed=pose!==JSON.stringify(signature());__lobbyGames.afterRender();restored&&=pose===JSON.stringify(signature());}
    return {x:QA.player.root.position.x,z:QA.player.root.position.z,maxStep,restored,changed,unlocked:!__lobbyGames.motionLocked()};
   },yaw);assert(result.restored&&result.changed&&result.unlocked);assert(result.maxStep<.21);assert(Math.hypot(result.x-(23+Math.sin(yaw)*3.6),result.z-(8+Math.cos(yaw)*3.6))<.01);console.log('PASS scene direction, smooth travel, authored pose, exact restoration and recovery',yaw);
  }
  const collision=await page.evaluate(()=>{
   fixture(0);const enemy=QA.createCrew('#ff7185','BOT',23,10);QA.remoteCrews.set('enemy',enemy);Object.assign(people.enemy,{x:23,z:10,yaw:Math.PI});enemy.root.position.set(23,0,10);Object.assign(state.soccer.ball,{x:23,z:9.26,dribbler:'enemy'});state=QA.rules.command(state,{id:'tackle',kind:'soccer-slide',uid:'self',at:testNow,yaw:0},people,'self',new Set(),testNow).state;sync();let minGap=99;
   for(let i=1;i<=70;i++){testNow=200000+i*1000/60;sync();__lobbyGames.update(1/60);Object.assign(people.self,{x:QA.player.root.position.x,z:QA.player.root.position.z});QA.rules.step(state,people,testNow,1/60);minGap=Math.min(minGap,Math.hypot(QA.player.root.position.x-23,QA.player.root.position.z-10));}
   return {minGap,hit:state.soccer.slides.self.connected,owner:state.soccer.ball.dribbler};
  });assert(collision.minGap>=.849);assert(collision.hit);assert.notEqual(collision.owner,'enemy');console.log('PASS scene slide wins exposed ball and stops before running through holder');
  const steering=await page.evaluate(()=>{
   fixture(0);Object.assign(people.enemy,{x:23,z:14});QA.remoteCrews.get('enemy').root.position.set(23,0,14);Object.assign(state.soccer.ball,{x:23,z:13.26,dribbler:'enemy'});QA.rules.pressInput(state.soccer,{uid:'self',held:true,serial:1,at:testNow},people,testNow);sync();window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-press-intent',held:true}}));QA.camera.position.set(23,5,20);QA.camera.lookAt(23,0,8);QA.setStick(1,0);__lobbyGames.update(.05);const delta=QA.player.root.position.x-23;QA.setStick(0,0);return delta;
  });assert(steering>.15,'held press respects right joystick');console.log('PASS real camera-relative joystick steering while pressing');
  const guidance=await page.evaluate(()=>{
   fixture(0);Object.assign(state.soccer.ball,{x:23,z:8.74,dribbler:'self'});sync();
   const set=(active,charging)=>{window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-aim',active,charging,yaw:0,power:.5}}));__lobbyGames.beforeRender(.016);const visible=QA.scene.getObjectByName('soccer-aim-guide').visible;__lobbyGames.afterRender();return visible;};
   return [set(true,false),set(true,true),set(false,false)];
  });assert.deepEqual(guidance,[false,true,false]);console.log('PASS actual scene aim line appears only while preparing pass or shot and disappears on release');
  const recovery=await page.evaluate(()=>{
   fixture(0);state=QA.rules.command(state,{id:'entry-recovery',kind:'soccer-slide',uid:'self',at:testNow,yaw:0},people,'self',new Set(),testNow).state;sync();
   const positions=[],palms=[],floor=[];
   for(const age of [70,160,420,840,980,1110,1280,1640]){
    testNow=200000+age;sync();__lobbyGames.update(.016);positions.push([age,QA.player.root.position.z,__lobbyGames.motionLocked()]);
    __lobbyGames.beforeRender(.016);QA.scene.updateMatrixWorld(true);
    if(age===980)for(const arm of QA.player.root.userData.walkArms)palms.push(arm.localToWorld(new QA.THREE.Vector3(0,-.52,0)).y);
    const body=QA.player.body,axis=new QA.THREE.Vector3(0,1,0).applyQuaternion(body.quaternion),shape=body.geometry.parameters;floor.push(body.position.y-shape.radius-shape.length/2*Math.abs(axis.y));__lobbyGames.afterRender();
   }return {positions,palms,floor};
  });assert.equal(recovery.positions[1][1],8,'plant before launching');assert(recovery.positions.slice(3).every(p=>Math.abs(p[1]-11.6)<.001),'feet stop traveling during stand-up');assert(recovery.positions.slice(0,-1).every(p=>p[2])&&!recovery.positions.at(-1)[2]);assert(Math.min(...recovery.floor)>=.034,'torso stays above turf');assert(Math.min(...recovery.palms)<.22,'supporting palm reaches the turf');console.log('PASS planted entry, grounded torso and hand support, stationary kneel/push-up and return to controls');
  fs.mkdirSync('verification',{recursive:true});
  for(const [name,age]of [['plant',160],['slide',420],['hand-plant',980],['recover',1280],['stand',1640]]){
   const png=await page.evaluate(age=>{
    fixture(0);state=QA.rules.command(state,{id:'preview',kind:'soccer-slide',uid:'self',at:testNow,yaw:0},people,'self',new Set(),testNow).state;testNow+=age;sync();__lobbyGames.update(.016);QA.camera.position.set(27,2.25,12.8);QA.camera.lookAt(23,.65,10);__lobbyGames.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);const png=QA.renderer.domElement.toDataURL('image/png');__lobbyGames.afterRender();return png;
   },age);fs.writeFileSync('verification/'+name+'.png',Buffer.from(png.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
