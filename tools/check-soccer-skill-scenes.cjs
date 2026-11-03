const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+'\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,rules:createLobbyGamesRules()};',resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
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
  for(const kind of ['doubleTouch','roulette','heelLift']){
   await page.evaluate(kind=>{testNow=100000;const s=QA.rules.fresh('self',testNow);Object.assign(s.soccer.ball,{z:9.85,dribbler:'self'});const result=QA.rules.command(s,{uid:'self',id:kind,kind:'soccer-skill',skill:kind,side:1,yaw:0,at:testNow},people,'self',new Set(),testNow);if(!result.ok)throw Error(result.message);window.postMessage({type:'lobby-games-state',enabled:true,state:result.state,uid:'self',host:'self',serverNow:testNow,players:people},'*');},kind);
   await page.waitForFunction(kind=>__lobbyGames.state.soccer.skills?.self?.kind===kind,kind);
   const result=await page.evaluate(kind=>{
    const {player,renderer,scene,camera}=QA,signature=()=>[player.root,player.body,...player.legs,...player.root.userData.walkArms].map(n=>[...n.position.toArray(),...n.rotation.toArray()]).flat(),base=signature();let changed=0,maxY=0,png='';
    for(let i=1;i<=75;i++){
     testNow=100000+i*1000/60;QA.rules.step(__lobbyGames.state,people,testNow,1/60);maxY=Math.max(maxY,__lobbyGames.state.soccer.ball.y);
     __lobbyGames.beforeRender(1/60);if(JSON.stringify(signature())!==JSON.stringify(base))changed++;
     if(i===Math.round((kind==='heelLift'?650:kind==='roulette'?450:270)/1000*60)){renderer.render(scene,camera);png=renderer.domElement.toDataURL('image/png');}
     __lobbyGames.afterRender();if(JSON.stringify(signature())!==JSON.stringify(base))throw Error('Pose restoration failed: '+kind);
    }
    return{changed,maxY,png};
   },kind);
   assert(result.changed>25);if(kind==='heelLift')assert(result.maxY>2.2);
   if(process.env.VISUAL_SHOTS){fs.mkdirSync(process.env.VISUAL_SHOTS,{recursive:true});fs.writeFileSync(path.join(process.env.VISUAL_SHOTS,kind+'.png'),Buffer.from(result.png.split(',')[1],'base64'));}
   console.log('PASS real minified scene motion, ball trajectory and pose restoration:',kind);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
