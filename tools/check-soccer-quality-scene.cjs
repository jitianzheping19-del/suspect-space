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


  const result=await page.evaluate(()=>{
   const rows=[];
   for(const mode of ['shot','pass','lob'])for(const foot of [0,1]){
    fixture(0);Object.assign(state.soccer.ball,{x:23+(foot?1:-1)*.22,z:8.74,dribbler:'self'});
    state.soccer.kicks.self={id:'qa',at:testNow,mode,foot,power:.85,yaw:0,applied:false};
    let restored=true,maxJump=0,previous=null,contactGap=0;
    for(let age=0;age<=760;age+=10){
     testNow=200000+age;sync();const before=JSON.stringify(signature());__lobbyGames.beforeRender(.01);QA.scene.updateMatrixWorld(true);
     const leg=QA.player.legs[foot],point=leg.getWorldPosition(new QA.THREE.Vector3());
     if(previous)maxJump=Math.max(maxJump,point.distanceTo(previous));previous=point;
     if(age===(mode==='lob'?260:120))contactGap=point.distanceTo(__lobbyGames.ballMesh.getWorldPosition(new QA.THREE.Vector3()));
     __lobbyGames.afterRender();restored&&=JSON.stringify(signature())===before;
    }
    rows.push({mode,foot,restored,maxJump,contactGap});
   }
   fixture(0);Object.assign(state.soccer.ball,{x:23,z:8.74,dribbler:'self'});sync();
   window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-aim',active:true,charging:true,power:.8,spin:1,yaw:0}}));
   __lobbyGames.beforeRender(.016);const curve=QA.scene.getObjectByName('soccer-curve-preview'),visible=curve.visible,positions=curve.geometry.attributes.position.array,bends=positions[(curve.geometry.drawRange.count-1)*3]>positions[0]+.5;
   __lobbyGames.afterRender();
   const levels=[];for(const power of [.12,1]){
    window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-aim',active:true,charging:true,power,spin:0,yaw:0}}));
    __lobbyGames.beforeRender(.016);const points=curve.geometry.attributes.position;let maxY=0;for(let i=0;i<curve.geometry.drawRange.count;i++)maxY=Math.max(maxY,points.getY(i));levels.push({visible:curve.visible,maxY});__lobbyGames.afterRender();
   }
   let waitingLabel=false;QA.scene.getObjectByName('lobby-game-soccer').traverse(n=>{if(n.userData.text==='観戦・待機')waitingLabel=true;});
   window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-aim',active:false}}));__lobbyGames.beforeRender(.016);const cleared=!curve.visible;__lobbyGames.afterRender();
   return {rows,visible,bends,cleared,levels,waitingLabel};
  });
  for(const r of result.rows){assert(r.restored,'exact pose restoration');assert(r.maxJump<.25,'no pose snapping: '+JSON.stringify(r));assert(r.contactGap>.42&&r.contactGap<.6,'foot touches the ball surface: '+JSON.stringify(r));}
  assert(!result.waitingLabel,'removed pitch waiting label');assert(result.levels.every(l=>l.visible)&&result.levels[1].maxY>2.2&&result.levels[0].maxY<1,'charge raises the rendered shot guide');
  assert(result.visible&&result.bends&&result.cleared);console.log('PASS scene kick poses, left/right foot contacts, smooth recovery, curved aim and release cleanup',result);
  const receive=await page.evaluate(()=>{
   fixture(0);Object.assign(state.soccer.ball,{x:23.3,z:8.8,dribbler:'',vx:-2,vz:-8,vy:0});QA.rules.step(state,people,testNow,1/60);testNow+=60;QA.rules.step(state,people,testNow,1/60);sync();
   const base=JSON.stringify(signature());__lobbyGames.beforeRender(1/60);const changed=JSON.stringify(signature())!==base,leg=QA.player.legs[1].rotation.x;__lobbyGames.afterRender();
   return {changed,leg,restored:JSON.stringify(signature())===base,owner:state.soccer.ball.dribbler};
  });assert(receive.changed&&receive.restored&&receive.leg<-.3);assert.equal(receive.owner,'self');console.log('PASS stationary ground reception animates the receiving foot and restores the rig');
  fs.mkdirSync('verification/soccer-quality',{recursive:true});
  for(const [name,mode,age]of [['shot-windup','shot',70],['shot-contact','shot',120],['shot-follow-through','shot',230],['lob-contact','lob',260]]){
   const png=await page.evaluate(({mode,age})=>{
    fixture(0);Object.assign(state.soccer.ball,{x:23.22,z:8.74,dribbler:'self'});state.soccer.kicks.self={id:'qa',at:200000,mode,foot:1,power:.85,yaw:0,applied:false};testNow=200000+age;sync();QA.camera.position.set(26,2.2,12);QA.camera.lookAt(23,.8,8.4);
    __lobbyGames.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);const image=QA.renderer.domElement.toDataURL('image/png');__lobbyGames.afterRender();return image;
   },{mode,age});fs.writeFileSync('verification/soccer-quality/'+name+'.png',Buffer.from(png.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
