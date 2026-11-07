const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,updatePlayer,skills:SOCCER_SKILLS,rules:createLobbyGamesRules(),setKeys:(...keys)=>{keyboardKeys.clear();keys.forEach(k=>keyboardKeys.add(k));},setStick:(x,z)=>{lobbyStick.x=x;lobbyStick.z=z;}};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
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

  for(const [width,height,mode]of [[390,844,'touch'],[844,390,'touch'],[1024,768,'keys']]){
   await page.setViewportSize({width,height});
   const results=await page.evaluate(async mode=>{
    const results=[];
    for(const kind of ['doubleTouch','shotFeint','roulette','scissors','heelLift','nutmeg']){
     const nextTime=testNow+5000;fixture(0);testNow=nextTime;positions.length=0;QA.setStick(0,0);QA.setKeys();QA.player.root.userData.soccerTurnVelocity=0;
     Object.assign(state.soccer.ball,{x:23,z:8.74,dribbler:'self'});Object.assign(people.enemy,{x:kind==='nutmeg'?23:30,z:kind==='nutmeg'?10:18});sync();
     QA.camera.position.set(23,5,0);QA.camera.lookAt(23,0,8);QA.camera.updateMatrixWorld();
     const input=(x,z)=>{if(mode==='touch')QA.setStick(x,z);else{QA.setKeys(...(x<0?['KeyA']:x>0?['KeyD']:z<0?['KeyW']:z>0?['KeyS']:[]));}};
     async function tick(){
      testNow+=1000/60;QA.updatePlayer(1/60,testNow/1000);__lobbyGames.update(1/60);
      await new Promise(r=>setTimeout(r,0));const p=positions.at(-1);if(p)Object.assign(people.self,{x:p.x,z:p.z,yaw:p.yaw,walking:p.walking});
      QA.player.root.userData.walking=people.self.walking;QA.rules.step(state,people,testNow,1/60);sync();
     }
     input(0,-.65);for(let n=0;n<6;n++)await tick();
     const issued=testNow,result=QA.rules.command(state,{uid:'self',id:kind,kind:'soccer-skill',skill:kind,side:1,yaw:people.self.yaw,at:testNow},people,'self',new Set(),testNow);
     if(!result.ok)throw Error(kind+': '+result.message);state=result.state;sync();
     const start=QA.player.root.position.clone();let stopped=null,firstTravel=0,maxYaw=0,maxGap=0,restored=true,locked=false,changed=0;
     for(let age=0;age<=QA.skills[kind].duration+50;age+=1000/60){
      if(age>90&&age<280)input(-.65,0);else if(age>=280&&age<480)input(0,.65);else if(age>=480)input(0,0);
      await tick();locked||=__lobbyGames.motionLocked();maxYaw=Math.max(maxYaw,Math.abs(QA.player.root.rotation.y));
      if(age<90)firstTravel=QA.player.root.position.distanceTo(start);
      if(age>=480&&!stopped)stopped=QA.player.root.position.clone();
      if(state.soccer.ball.dribbler==='self')maxGap=Math.max(maxGap,QA.rules.distance(people.self,state.soccer.ball));
      const original=JSON.stringify(signature());__lobbyGames.beforeRender(1/60);if(original!==JSON.stringify(signature()))changed++;__lobbyGames.afterRender();restored&&=original===JSON.stringify(signature());
     }
     results.push({kind,firstTravel,maxYaw,maxGap,restored,locked,changed,stopDrift:QA.player.root.position.distanceTo(stopped),cancelled:state.soccer.skills.self.cancelled});
    }
    return results;
   },mode);
   for(const r of results){assert(!r.locked&&!r.cancelled,JSON.stringify(r));assert(r.firstTravel>.05&&r.maxYaw>.35,JSON.stringify(r));assert(r.maxGap<1.8&&r.changed>10&&r.restored,JSON.stringify(r));assert(r.stopDrift<.01,'releasing the stick must stop authored travel: '+JSON.stringify(r));}
   console.log('PASS actual scene: moving start, mid-skill turns/reverse, stop without forced travel, ball reach and pose restoration',width,height,mode);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
