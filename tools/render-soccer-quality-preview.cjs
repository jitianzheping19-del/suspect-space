const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,updatePlayer,rules:createLobbyGamesRules(),setStick:(x,z)=>{lobbyStick.x=x;lobbyStick.z=z;}};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:640,height:400}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/soccer');await page.waitForFunction(()=>window.QA&&window.__lobbyGames);
  await page.evaluate(()=>{SpaceSuspectLobby.__lobbyRenderActive=false;window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
  await page.evaluate(()=>{
   window.testNow=100000;Date.now=()=>testNow;window.people={self:{online:true,x:23,z:8,yaw:0,lobbyY:0},enemy:{online:true,x:28,z:14,yaw:Math.PI,lobbyY:0}};
   window.state=QA.rules.fresh('self',testNow);window.sync=()=>window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-games-state',enabled:true,state,uid:'self',host:'self',serverNow:testNow,players:people}}));sync();QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);
   QA.renderer.setPixelRatio(1);QA.renderer.setSize(640,400,false);QA.camera.aspect=1.6;QA.camera.updateProjectionMatrix();QA.player.root.visible=true;
   for(const id of ['info','infoRight','topbar','customizePanel']){const e=document.getElementById(id);if(e)e.style.display='none';}
   window.positions=[];window.addEventListener('message',e=>{if(e.data?.type==='lobby-position')positions.push(e.data);});window.signature=()=>[QA.player.root,QA.player.body,QA.player.pack,QA.player.visor,QA.player.shine,...QA.player.legs,...QA.player.root.userData.walkArms].map(n=>[...n.position.toArray(),...n.rotation.toArray()]);
   window.fixture=(yaw=0)=>{testNow=200000;state=QA.rules.fresh('self',testNow);Object.assign(state.soccer,{status:'playing',members:{self:0,enemy:1},endAt:testNow+180000});QA.player.root.position.set(23,0,8);QA.player.root.rotation.set(0,yaw,0);Object.assign(people.self,{x:23,z:8,yaw});Object.assign(people.enemy,{x:28,z:14});Object.assign(state.soccer.ball,{x:28,z:13.26,dribbler:'enemy'});sync();};
  });



  const dir='verification/soccer-quality/video-frames';fs.mkdirSync(dir,{recursive:true});let frame=process.env.ONLY_CURVE?192:0;
  for(const [kind,label]of [['shotFeint','キックフェイント'],['doubleTouch','ダブルタッチ'],['roulette','ルーレット'],['heelLift','ヒールリフト'],['curve','カーブシュート']]){
   if(process.env.ONLY_CURVE&&kind!=='curve')continue;
   await page.evaluate(({kind,label})=>{
    fixture(0);Object.assign(state.soccer.ball,{x:23.22,z:8.74,dribbler:'self'});people.self.walking=false;QA.player.root.userData.walking=false;
    const cmd=kind==='curve'?{kind:'kick',mode:'shot',power:.8,spin:.85}:{kind:'soccer-skill',skill:kind,side:1};
    const r=QA.rules.command(state,{...cmd,uid:'self',id:kind,at:testNow,yaw:0},people,'self',new Set(),testNow);if(!r.ok)throw Error(r.message);state=r.state;sync();
    if(kind==='curve'){QA.camera.position.set(11,18,28);QA.camera.lookAt(23,0,13);}else{QA.camera.position.set(28,3.7,14.5);QA.camera.lookAt(23,1,9.7);}QA.camera.updateProjectionMatrix();
   },{kind,label});
   for(let i=0;i<48;i++){
    const png=await page.evaluate(i=>{
     testNow=200000+i*1000/24;sync();__lobbyGames.update(1/24);Object.assign(people.self,{x:QA.player.root.position.x,z:QA.player.root.position.z,yaw:QA.player.root.rotation.y});QA.rules.step(state,people,testNow,1/24);sync();
     __lobbyGames.beforeRender(1/24);QA.renderer.render(QA.scene,QA.camera);const png=QA.renderer.domElement.toDataURL('image/png');__lobbyGames.afterRender();return png;
    },i);fs.writeFileSync(dir+'/'+String(frame++).padStart(4,'0')+'.png',Buffer.from(png.split(',')[1],'base64'));
   }
   console.log('RENDERED',label);
  }
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
