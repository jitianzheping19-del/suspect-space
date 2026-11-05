const {spawn}=require('node:child_process'),{once}=require('node:events');
const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,updatePlayer,rules:createLobbyGamesRules(),setStick:(x,z)=>{lobbyStick.x=x;lobbyStick.z=z;}};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});let activeEncoder=null;
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




  const {SOCCER_GUIDE}=await import('../lobby-soccer-guide.js');fs.mkdirSync('public/tutorial/soccer',{recursive:true});
  for(const [kind,,title,,,gesture] of SOCCER_GUIDE){
   if(process.env.CLIP&&kind!==process.env.CLIP)continue;
   const frames=kind==='traps'?180:60,fps=20;
   await page.evaluate(({kind,title,gesture})=>{
    fixture(0);window.clipKind=kind;window.clipTitle=title;window.clipGesture=gesture;window.actionStarted=false;window.followTriggered=false;window.trapSegment=-1;
    people.friend={online:true,x:27,z:14,yaw:0,lobbyY:0};people.enemy={online:true,x:28,z:16,yaw:Math.PI,lobbyY:0};state.soccer.members={self:0,friend:0,enemy:1};
    for(const id of ['friend','enemy']){let c=QA.remoteCrews.get(id);if(!c){c=QA.createCrew(id==='friend'?'#62bcff':'#ff7185',id==='friend'?'味方':'相手',people[id].x,people[id].z);QA.remoteCrews.set(id,c);}c.root.position.set(people[id].x,0,people[id].z);c.root.rotation.y=people[id].yaw;}
    Object.assign(state.soccer.ball,{x:23.15,z:8.74,y:.3,dribbler:'self'});
    QA.camera.position.set(29,4.6,16);QA.camera.lookAt(24,.8,10);
    if(['pass','through','lob','shot','curve'].includes(kind)){QA.camera.position.set(12,19,29);QA.camera.lookAt(23,0,12);}
    if(['press','slide','matchup'].includes(kind)){Object.assign(people.enemy,{x:23,z:11,yaw:Math.PI});QA.remoteCrews.get('enemy').root.position.set(23,0,11);Object.assign(state.soccer.ball,{x:23,z:10.26,dribbler:'enemy'});}
    const keep=new Set([__lobbyGames.roots.soccer,QA.player.root,...[...QA.remoteCrews.values()].map(c=>c.root)]);for(const n of QA.scene.children)if(!keep.has(n)&&!n.isLight)n.visible=false;QA.renderer.shadowMap.enabled=false;sync();window.composite=document.createElement('canvas');composite.width=640;composite.height=400;
   },{kind,title,gesture});
   const encoder=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate',String(fps),'-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','public/tutorial/soccer/'+kind+'.mp4'],{stdio:['pipe','ignore','inherit']});
   activeEncoder=encoder;const finished=once(encoder,'close');
   for(let i=0;i<frames;i++){
    const png=await page.evaluate(({i,fps})=>{
     const kind=clipKind,dt=1/fps;testNow=200000+i*1000/fps;const age=i/fps;
     function command(extra){const r=QA.rules.command(state,{uid:'self',id:kind+':'+i,at:testNow,yaw:0,...extra},people,'self',new Set(),testNow);if(!r.ok)throw Error(kind+': '+r.message);state=r.state;}
     if(!actionStarted&&age>=.75){actionStarted=true;
      if(kind==='heelOverhead')command({kind:'soccer-skill',skill:'heelLift',side:1});
      if(['doubleTouch','roulette','heelLift','shotFeint','scissors'].includes(kind))command({kind:'soccer-skill',skill:kind,side:1});
      if(['pass','through','lob','shot','curve'].includes(kind))command({kind:'kick',mode:kind==='curve'?'shot':kind,power:.7,spin:kind==='curve'?.8:0,holdMs:500,yaw:['pass','through','lob'].includes(kind)?Math.atan2(4,6):0});
      if(kind==='slide')command({kind:'soccer-slide'});
      if(['header','overhead','volley'].includes(kind)){Object.assign(state.soccer.ball,{dribbler:'',lastTouch:'friend',x:23,z:kind==='overhead'?7.3:9,y:kind==='volley'?1.2:2,vy:kind==='volley'?1:2,vx:0,vz:0});command({kind:'soccer-'+kind});}
      if(kind==='dash')command({kind:'soccer-dash',held:true});
     }
     if(kind==='heelOverhead'&&age>=1.25&&!followTriggered){followTriggered=true;command({kind:'soccer-overhead'});}
     if(['move','backward','dash'].includes(kind)&&age>=.75&&age<2.5){const dz=(kind==='backward'?-.8:kind==='dash'?2.2:1.1)*dt;QA.player.root.position.z+=dz;people.self.walking=true;if(kind==='dash')state.soccer.dashes.self.until=testNow+150;}
     if(['press','matchup'].includes(kind)&&age>=.75&&age<2.3){QA.rules.pressInput(state.soccer,{uid:'self',held:true,mode:kind,serial:i,at:testNow},people,testNow);window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-press-intent',held:true}}));}else window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-press-intent',held:false}}));
     if(kind==='traps'){
      const segment=Math.floor(i/36);if(segment!==trapSegment){trapSegment=segment;state=QA.rules.fresh('self',testNow);Object.assign(state.soccer,{status:'playing',members:{self:0,friend:0,enemy:1},endAt:testNow+180000});Object.assign(state.soccer.ball,{x:23,z:8.7,y:[2,1.3,.8,.45,.3][segment],vy:-.1,vx:0,vz:1,dribbler:'',lastTouch:'friend'});QA.player.root.position.set(23,0,8);}
     }
     const preview=age<.75&&['pass','through','lob','shot','curve'].includes(kind);window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-soccer-aim',active:preview,charging:preview,yaw:['pass','through','lob'].includes(kind)?Math.atan2(4,6):0,power:.7,through:kind==='through'&&age>=.35,lob:kind==='lob',spin:kind==='curve'?.8:0}}));
     sync();__lobbyGames.update(dt);Object.assign(people.self,{x:QA.player.root.position.x,z:QA.player.root.position.z,yaw:QA.player.root.rotation.y});QA.rules.step(state,people,testNow,dt);sync();
     __lobbyGames.beforeRender(dt);QA.renderer.render(QA.scene,QA.camera);
     const c=composite.getContext('2d');c.drawImage(QA.renderer.domElement,0,0,640,400);__lobbyGames.afterRender();
     c.fillStyle='#071421dd';c.fillRect(0,0,640,36);c.fillRect(0,340,640,60);c.fillStyle='#ecfff8';c.font='bold 18px sans-serif';c.fillText(clipTitle+(kind==='traps'?'：'+['頭','胸','膝','足','足裏'][trapSegment]:''),14,25);c.font='15px sans-serif';c.fillText(clipGesture,14,367);c.fillStyle='#b4d9e5';c.font='12px sans-serif';c.fillText(age<.75?'操作 →':'動作 → 着地・体勢を戻す',14,390);
     const controlX=kind==='move'||kind==='backward'||kind==='scissors'?66:570,controlY=280;c.fillStyle='#123848cf';c.strokeStyle='#adf8df';c.lineWidth=2;c.beginPath();c.arc(controlX,controlY,36,0,Math.PI*2);c.fill();c.stroke();
     if(age<.75){const p=Math.min(1,age/.35);let x=controlX,y=controlY;
      if(['pass','through','shot','lob','curve'].includes(kind)){x+=Math.min(28,p*28);y-=Math.min(48,p*48);if(kind==='lob'&&age>.4){x=controlX;y=controlY;}if(kind==='curve'&&age>.4)x+=18;}
      if(kind==='scissors'){x+=Math.cos(age/.75*Math.PI*2)*25;y+=Math.sin(age/.75*Math.PI*2)*25;}
      if(kind==='move')y-=20;if(kind==='backward')y+=20;
      c.strokeStyle='#fff3a8';c.beginPath();c.moveTo(controlX,controlY);c.lineTo(x,y);c.stroke();c.fillStyle='#fff3a8';c.beginPath();c.arc(x,y,9,0,Math.PI*2);c.fill();
     }
     return composite.toDataURL('image/png');
    },{i,fps});
    const buffer=Buffer.from(png.split(',')[1],'base64');if(!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
   }
   encoder.stdin.end();const [exit]=await finished;activeEncoder=null;assert.equal(exit,0);console.log('RENDERED',kind,title);
  }
  assert.deepEqual(errors,[]);
 }finally{if(activeEncoder){activeEncoder.stdin.destroy();activeEncoder.kill();}await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
