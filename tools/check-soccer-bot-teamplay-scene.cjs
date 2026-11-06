const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,rules:createLobbyGamesRules()};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/soccer');await page.waitForFunction(()=>window.QA&&window.__lobbyGames);
  await page.evaluate(()=>{SpaceSuspectLobby.__lobbyRenderActive=false;window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
  const result=await page.evaluate(()=>{
   window.testNow=100000;Date.now=()=>testNow;
   const person=(x,z,extra={})=>({online:true,x,z,yaw:0,lobbyY:0,...extra});
   const people={self:person(28,14),enemy:person(23,12,{yaw:Math.PI})},state=QA.rules.fresh('self',testNow),g=state.soccer;
   Object.assign(g,{status:'playing',members:{self:0,enemy:1,bot:0},endAt:testNow+180000,bots:{bot:person(23,10,{bot:true,soccerBot:true,team:0,name:'青 BOT',ownedAt:testNow-500})}});
   Object.assign(g.ball,{x:23,z:10.74,dribbler:'bot'});
   const sync=()=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-games-state',enabled:true,state,uid:'self',host:'self',serverNow:testNow,players:people}}));sync();
   QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);QA.player.root.position.set(28,0,14);
   const enemy=QA.createCrew('#ff7185','相手',23,12);QA.scene.add(enemy.root);QA.remoteCrews.set('enemy',enemy);
   QA.rules.step(state,people,testNow,1/60);
   for(let n=0;n<15;n++){testNow+=1000/60;QA.rules.step(state,people,testNow,1/60);sync();__lobbyGames.beforeRender(1/60);__lobbyGames.afterRender();}
   __lobbyGames.beforeRender(1/60);const bot=QA.scene.getObjectByName('bot'),bank=bot.rotation.z,position=bot.position.toArray(),visible=bot.visible;
   QA.renderer.setPixelRatio(1);QA.renderer.setSize(960,600,false);QA.camera.aspect=1.6;QA.camera.position.set(30,9,20);QA.camera.lookAt(23,1,11);QA.camera.updateProjectionMatrix();QA.renderer.render(QA.scene,QA.camera);__lobbyGames.afterRender();
   const restored=bot.rotation.z===0;
   let kick=null;for(let n=0;n<100;n++){testNow+=1000/60;QA.rules.step(state,people,testNow,1/60);sync();__lobbyGames.beforeRender(1/60);__lobbyGames.afterRender();if(g.kicks.bot?.connected){kick=g.kicks.bot;break;}}
   return {visible,bank,position,restored,kick,skill:g.skills.bot.kind};
  });
  assert(result.visible&&Math.abs(result.bank)>.05&&result.restored);assert(Math.hypot(result.position[0]-23,result.position[2]-10)>.2);
  assert.equal(result.skill,'doubleTouch');assert.equal(result.kick.target,'self');assert(['pass','lob'].includes(result.kick.mode));assert.deepEqual(errors,[]);
  console.log('PASS actual embedded 3D bot: feint pose, lateral movement, restored pose and connected pass to the player');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
