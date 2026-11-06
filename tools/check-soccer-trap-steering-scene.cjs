const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+"\nwindow.QA={THREE,scene,renderer,camera,player,controls,updatePlayer,rules:createLobbyGamesRules()};",resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:960,height:600}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/soccer');await page.waitForFunction(()=>window.QA&&window.__lobbyGames);
  await page.evaluate(()=>{SpaceSuspectLobby.__lobbyRenderActive=false;window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
  await page.evaluate(()=>{
   window.testNow=100000;Date.now=()=>testNow;
   window.people={self:{online:true,x:23,z:10,yaw:0,lobbyY:0},enemy:{online:true,x:31,z:18,yaw:0,lobbyY:0}};
   window.state=QA.rules.fresh('self',testNow);
   window.message=data=>window.dispatchEvent(new MessageEvent('message',{source:window,data}));
   window.sync=()=>message({type:'lobby-games-state',enabled:true,state,uid:'self',host:'self',serverNow:testNow,players:people});
   window.poses=[];window.commands=[];window.addEventListener('message',e=>{if(e.data?.type==='lobby-position')poses.push(e.data);if(e.data?.type==='lobby-games-command')commands.push(e.data);});
   sync();QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);
   window.fixture=(mode)=>{
    testNow+=2000;state=QA.rules.fresh('self',testNow);Object.assign(state.soccer,{status:'playing',members:{self:0,enemy:1},endAt:testNow+180000});
    QA.player.root.position.set(23,0,10);QA.player.root.rotation.set(0,0,0);people.self.yaw=0;
    Object.assign(state.soccer.ball,{x:23,z:10.4,y:1.4,vx:0,vy:-.1,vz:0});
    const result=QA.rules.command(state,{uid:'self',id:'trap-'+testNow,at:testNow,kind:'soccer-trap'},people,'self',new Set(),testNow);
    if(!result.ok)throw Error(result.message);state=result.state;message({type:'lobby-stick',x:0,z:0});sync();
    message({type:'lobby-soccer-camera',mode});for(let i=0;i<100;i++)__lobbyGames.updateCamera(1/60,QA.controls);
    window.started=testNow;poses.length=0;commands.length=0;
   };
  });
  for(const mode of ['length','side','third'])for(const [x,z]of [[1,0],[-1,0],[0,-1],[0,1],[.7,-.7]]){
   const selected=await page.evaluate(({mode,x,z})=>{
    fixture(mode);const forward=QA.camera.getWorldDirection(new QA.THREE.Vector3());forward.y=0;forward.normalize();const right=new QA.THREE.Vector3().crossVectors(forward,new QA.THREE.Vector3(0,1,0));
    const direction=right.multiplyScalar(x).addScaledVector(forward,-z).normalize();
    message({type:'lobby-stick',x,z});QA.updatePlayer(1/60,testNow/1000);__lobbyGames.update(1/60);__lobbyGames.beforeRender(1/60);
    const arrow=QA.scene.getObjectByName('soccer-trap-direction'),vector=new QA.THREE.Vector3(0,1,0).applyQuaternion(arrow.quaternion);
    const result={locked:__lobbyGames.motionLocked(),arrow:arrow.visible,arrowDot:vector.dot(direction),yaw:Math.atan2(direction.x,direction.z),feet:QA.player.root.position.toArray()};
    __lobbyGames.afterRender();return result;
   },{mode,x,z});
   assert(selected.locked&&selected.arrow&&selected.arrowDot>.999,JSON.stringify({mode,x,z,selected}));
   const output=await page.evaluate(async yaw=>{
    // Wait for the real scene postMessage, then use the same facing field the host receives.
    await new Promise(r=>setTimeout(r,0));const pose=poses.filter(p=>p.gameArea==='soccer').at(-1);if(!pose)throw Error('missing facing transport');
    people.self.yaw=pose.yaw;message({type:'lobby-stick',x:0,z:0});
    let rendered=false;for(let i=1;i<=36;i++){
     testNow=started+i*1000/60;QA.rules.step(state,people,testNow,1/60);sync();QA.updatePlayer(1/60,testNow/1000);__lobbyGames.update(1/60);__lobbyGames.beforeRender(1/60);
     if(i===18)rendered=Math.abs(Math.atan2(Math.sin(QA.player.root.rotation.y-state.soccer.receives.self.trapYaw),Math.cos(QA.player.root.rotation.y-state.soccer.receives.self.trapYaw)))<.001;
     __lobbyGames.afterRender();
    }
    const b=state.soccer.ball,dx=b.x-23,dz=b.z-10,ballDot=(dx*Math.sin(yaw)+dz*Math.cos(yaw))/Math.hypot(dx,dz),feet=QA.player.root.position.toArray();
    testNow=started+700;sync();__lobbyGames.beforeRender(1/60);const hidden=!QA.scene.getObjectByName('soccer-trap-direction').visible;__lobbyGames.afterRender();
    return {pose,ballDot,feet,owner:b.dribbler,rendered,hidden,commands:commands.map(c=>c.kind)};
   },selected.yaw);
   assert(Math.abs(Math.atan2(Math.sin(output.pose.yaw-selected.yaw),Math.cos(output.pose.yaw-selected.yaw)))<.001);
   assert(output.ballDot>.9&&output.rendered&&output.hidden,JSON.stringify(output));assert.equal(output.owner,'self');assert(Math.hypot(output.feet[0]-23,output.feet[2]-10)<.001,'feet stay planted');assert(!output.commands.includes('soccer-skill'),'steering never triggers a circular-stick feint');
  }
  assert.deepEqual(errors,[]);console.log('PASS real scene joystick in all 3 camera views: five directions, pose transport, fixed feet, ball/pose steering, direction arrow and cleanup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
