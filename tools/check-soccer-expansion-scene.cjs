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

  const result=await page.evaluate(()=>{
   fixture(0);const other=QA.createCrew('#ff7185','相手',23,8);QA.remoteCrews.set('enemy',other);Object.assign(people.enemy,{x:23,z:8});other.root.position.set(23,0,8);sync();
   const escapes=__lobbyGames.canMove(23.1,8);__lobbyGames.update(.016);const gap=QA.player.root.position.distanceTo(other.root.position);
   fixture(0);Object.assign(people.enemy,{x:28,z:14});other.root.position.set(28,0,14);
   const gear=new QA.THREE.Group();gear.name='lobbyCostume';gear.position.set(0,.2,-.1);QA.player.root.add(gear);QA.player.root.userData.walkCostumeRoot=gear;
   state=QA.rules.command(state,{id:'slide',kind:'soccer-slide',uid:'self',at:testNow,yaw:0},people,'self',new Set(),testNow).state;testNow+=420;sync();const original=JSON.stringify([gear.position.toArray(),gear.rotation.toArray()]);__lobbyGames.beforeRender(.016);const tilted=Math.abs(gear.rotation.x)>.8,bodyAligned=Math.abs(gear.rotation.x-QA.player.body.rotation.x)<.01;__lobbyGames.afterRender();const restored=original===JSON.stringify([gear.position.toArray(),gear.rotation.toArray()]);
   fixture(0);state.soccer.pitchCount=20;sync();__lobbyGames.beforeRender(.016);const posts=[];QA.scene.traverse(n=>{if(n.name==='soccer-goal-frame')posts.push(n.position.z);});__lobbyGames.afterRender();const expanded=Math.min(...posts)<-10&&Math.max(...posts)>30;
   fixture(0);people.friend={online:true,x:28,z:14,yaw:0,lobbyY:0};state.soccer.members.friend=0;Object.assign(state.soccer.ball,{x:23,z:8.74,dribbler:'self'});sync();window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-aim',active:true,charging:true,through:true,yaw:Math.atan2(5,6),power:.7}}));__lobbyGames.beforeRender(.016);const line=QA.scene.getObjectByName('soccer-through-guide'),twoLines=line.visible&&QA.scene.getObjectByName('soccer-aim-guide').visible,forward=line.userData.target.z>people.friend.z+3.7,highlight=line.userData.selected&&line.material.opacity>.6;__lobbyGames.afterRender();
   window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-aim',active:false}}));__lobbyGames.beforeRender(.016);const cleared=!line.visible;__lobbyGames.afterRender();
   return {escapes,gap,tilted,bodyAligned,restored,expanded,twoLines,forward,highlight,cleared};
  });assert(result.escapes&&result.gap>=.8799&&result.tilted&&result.bodyAligned&&result.restored&&result.expanded&&result.twoLines&&result.forward&&result.highlight&&result.cleared,JSON.stringify(result));
  console.log('PASS actual scene: escape identical overlaps, attached costume pose/restoration, large court and two-line highlighted through-pass aim',result);
  const nutmeg=await page.evaluate(()=>{
   fixture(0);const other=QA.remoteCrews.get('enemy');Object.assign(people.enemy,{x:23,z:10,yaw:Math.PI});other.root.position.set(23,0,10);Object.assign(state.soccer.ball,{x:23,z:8.74,dribbler:'self'});
   const command=QA.rules.command(state,{id:'nutmeg',kind:'soccer-skill',skill:'nutmeg',side:1,uid:'self',at:testNow,yaw:0},people,'self',new Set(),testNow);if(!command.ok)throw Error(command.message);state=command.state;
   testNow+=325;QA.rules.step(state,people,testNow,.016);testNow+=325;sync();const width=()=>Math.abs(other.legs[0].position.x-other.legs[1].position.x),original=JSON.stringify(other.legs.map(l=>[l.position.toArray(),l.rotation.toArray()])),normal=width();__lobbyGames.beforeRender(.016);const spread=width()-normal;__lobbyGames.afterRender();const restored=original===JSON.stringify(other.legs.map(l=>[l.position.toArray(),l.rotation.toArray()]));
   testNow+=400;sync();__lobbyGames.beforeRender(.016);const recovered=Math.abs(width()-normal)<.001;__lobbyGames.afterRender();return{spread,restored,recovered};
  });assert(nutmeg.spread>.8&&nutmeg.restored&&nutmeg.recovered,JSON.stringify(nutmeg));console.log('PASS nutmeg visibly opens opponent stance, restores pose and recovers after reaction window');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
