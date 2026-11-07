const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const {build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+'\nwindow.QA={THREE,scene,renderer,camera,player,remoteCrews,createCrew,rules:createLobbyGamesRules()};',resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
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

  const result=await page.evaluate(()=>{
   const game=__lobbyGames,g=game.state.soccer;Object.assign(g,{status:'playing',secretMode:true,endAt:testNow+180000,members:{self:0,friend:1},skills:{self:{id:'secret-feint',kind:'doubleTouch',side:1,yaw:0,at:testNow,cooldownUntil:testNow+1050,released:false,cancelled:false}}});
   Object.assign(g.ball,{x:23,y:.3,z:9.75,dribbler:'self'});
   let maxGhosts=0;const start=QA.player.root.position.x;
   for(let i=1;i<=40;i++){
    testNow=100000+i*1000/60;game.update(1/60);Object.assign(people.self,{x:QA.player.root.position.x,z:QA.player.root.position.z});QA.rules.step(game.state,people,testNow,1/60);
    const base=QA.player.root.position.clone();game.beforeRender(1/60);
    const ghosts=QA.scene.children.filter(n=>n.name==='soccer-secret-afterimage'&&n.visible);maxGhosts=Math.max(maxGhosts,ghosts.length);
    if(i===25){QA.renderer.render(QA.scene,QA.camera);window.trailPNG=QA.renderer.domElement.toDataURL('image/png');}
    game.afterRender();if(!base.equals(QA.player.root.position))throw Error('Pose restoration');
   }
   const traveled=QA.player.root.position.x-start,held=g.ball.dribbler,ghosts=QA.scene.children.filter(n=>n.name==='soccer-secret-afterimage'),distinct=new Set(ghosts.map(n=>n.children[0].matrix.elements[12].toFixed(2))).size;
   const speed=game.speedMultiplier();g.skills={};g.ball.dribbler='self';g.ball.handOwner='self';g.ball.y=1.05;game.beforeRender(1/60);const handY=game.ballMesh.position.y;game.afterRender();
   delete g.ball.handOwner;g.ball.dribbler='';const time=testNow;Object.assign(g.ball,{x:QA.player.root.position.x,y:15,z:QA.player.root.position.z+.5,vx:0,vy:0,vz:0});
   const r=QA.rules.command(game.state,{uid:'self',id:'sky',kind:'soccer-volley',at:time},people,'self',new Set(),time);if(!r.ok)throw Error(r.message);Object.assign(g,r.state.soccer);
   testNow=time+550;const base=QA.player.root.position.clone();game.beforeRender(.016);const jump=QA.player.root.position.y-base.y;QA.renderer.render(QA.scene,QA.camera);window.skyPNG=QA.renderer.domElement.toDataURL('image/png');game.afterRender();if(!QA.player.root.position.equals(base))throw Error('Jump restoration');
   g.secretGoalOffsets=[2.4,0];g.secretGoalMove={team:0,at:testNow-1500,until:testNow+4000,side:1};QA.rules.setSoccerPitch(g);g.keepers[0].giantUntil=testNow+1500;g.keepers[0].giantSide=1;
   game.beforeRender(.016);const frames=game.roots.soccer.children.filter(n=>n.name==='soccer-goal-frame'&&n.userData.goalTeam===0),offsets=frames.map(n=>n.position.x-n.userData.goalRestX),gloves=[];game.roots.soccer.traverse(n=>{if(n.name==='goalkeeper-glove')gloves.push(n.scale.x);});game.afterRender();
   if(!offsets.every(x=>Math.abs(x-2.4)<1e-8)||!gloves.includes(3.4))throw Error('Goal/glove visual mismatch');
   g.status='finished';game.beforeRender(.016);game.afterRender();const after=QA.scene.children.filter(n=>n.name==='soccer-secret-afterimage').length;
   return {maxGhosts,traveled,held,distinct,speed,handY,jump,after};
  });
  assert(result.maxGhosts>=4&&result.maxGhosts<=5);assert(result.traveled>3.5);assert.equal(result.held,'self');assert(result.distinct>=3);assert(result.speed>2.5);assert.equal(result.handY,1.05);assert(result.jump>12);assert.equal(result.after,0);assert.deepEqual(errors,[]);
  fs.mkdirSync('verification/secret-mode',{recursive:true});for(const [key,file]of [['trailPNG','afterimages.png'],['skyPNG','sky-shot.png']]){const png=await page.evaluate(key=>window[key],key);fs.writeFileSync('verification/secret-mode/'+file,Buffer.from(png.split(',')[1],'base64'));}
  const previews=await page.evaluate(()=>{
   const game=__lobbyGames,g=game.state.soccer,p=QA.player.root.position;
   Object.assign(g,{status:'playing',secretMode:true,skills:{},finishes:{},kicks:{},secretGoalMove:null,secretGoalOffsets:[0,0],secretPowers:{}});
   Object.assign(g.ball,{dribbler:'',fire:true,resetUntil:0,vx:0,vy:0,vz:0});delete g.ball.handOwner;
   QA.camera.position.set(34,9,22);QA.camera.lookAt(25,1,12);
   for(let i=0;i<34;i++){testNow+=16;Object.assign(g.ball,{x:22+i*.15,y:1.2,z:9+i*.15,at:testNow});game.beforeRender(.016);if(i===33)QA.renderer.render(QA.scene,QA.camera);game.afterRender();}
   const fire=QA.renderer.domElement.toDataURL('image/png');
   g.ball.fire=false;g.ball.dribbler='self';QA.camera.position.set(p.x+4,3.5,p.z+5);QA.camera.lookAt(p.x,1,p.z);
   const powers={};
   for(const kind of ['taichi','belly']){g.secretPowers.self={kind,at:testNow-400,until:testNow+500};if(kind==='belly'){g.ball.handOwner=g.ball.bellyOwner='self';}game.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);powers[kind]=QA.renderer.domElement.toDataURL('image/png');game.afterRender();}
   delete g.ball.handOwner;delete g.ball.bellyOwner;
   for(const kind of ['thunder','meteor','cyclone','ice','dragon','drive']){
    testNow+=3000;g.secretPowers={self:{kind,at:testNow-250,releaseAt:testNow+100,until:testNow+1600,x:p.x,z:p.z+1.6,yaw:0}};
    g.ball.dribbler='';g.ball.lastTouch='self';
    if(['thunder','meteor','dragon','drive'].includes(kind)){
     g.ball.secretShot={kind,from:'self',at:testNow-250,until:testNow+2000};
     for(let i=0;i<25;i++){testNow+=16;Object.assign(g.ball,{x:p.x-1.5+i*.12,y:1.6,z:p.z+1.2+i*.06,vx:12,vy:0,vz:6,at:testNow});game.beforeRender(.016);game.afterRender();}
    }else delete g.ball.secretShot;
    QA.camera.position.set(p.x+5,4.4,p.z+7);QA.camera.lookAt(p.x,1.2,p.z+1);
    const saved=QA.player.root.position.clone();game.beforeRender(.016);QA.renderer.render(QA.scene,QA.camera);powers[kind]=QA.renderer.domElement.toDataURL('image/png');
    const fx=QA.scene.getObjectByName('soccer-ultimate-effects');if(!fx||!fx.children.some(n=>n.visible))throw Error('Missing '+kind+' effect');
    game.afterRender();if(!saved.equals(QA.player.root.position))throw Error(kind+' pose restoration');
   }
   const friend=QA.createCrew('#63a8ff','ALLY',23.6,8.4);QA.remoteCrews.set('friend',friend);
   for(const [kind,y,vy]of [['twin',1.4,2.4],['twinOverhead',3,0]]){
    testNow+=4000;const at=testNow;
    Object.assign(g,{members:{self:0,friend:0,enemy:1},secretPowers:{},skills:{},finishes:{},kicks:{},receives:{},secretCombo:null,combinationCooldowns:{},kickoff:null,flight:null});people.enemy={online:true,x:31,z:15,yaw:Math.PI};
    Object.assign(people.self,{x:22.4,z:8.4,yaw:0});Object.assign(people.friend,{x:23.6,z:8.4,yaw:0});QA.player.root.position.set(22.4,0,8.4);friend.root.position.set(23.6,0,8.4);
    Object.assign(g.ball,{x:23,y,z:9.2,vx:0,vy,vz:0,dribbler:'',lastTouch:'',fire:false,freeUntil:0,releaseUntil:0,resetUntil:0,at});delete g.ball.secretShot;delete g.ball.keeperOwner;
    QA.rules.step(game.state,people,at,0);if(g.secretCombo?.kind!==kind)throw Error('Failed to start '+kind);
    for(let i=1;i<=24;i++){testNow=at+i*1000/60;QA.rules.step(game.state,people,testNow,1/60);game.beforeRender(1/60);game.afterRender();}
    if(!g.secretCombo.hitAt||g.ball.secretShot?.kind!==kind)throw Error('Failed to hit '+kind);
    QA.camera.position.set(28,3.6,14.8);QA.camera.lookAt(23,1.7,9.1);
    const original=[QA.player,friend].map(c=>({p:c.root.position.clone(),r:c.root.rotation.clone()}));game.beforeRender(.016);
    for(const [i,c]of [QA.player,friend].entries()){
     if(c.root.position.y<.1)throw Error('Both players must jump');
     if(kind==='twinOverhead'&&c.root.rotation.x>-1.5)throw Error('Both players must lie back');
     c.root.updateMatrixWorld(true);const id=i?'friend':'self',f=g.finishes[id],foot=c.legs[f.side<0?0:1].getWorldPosition(new QA.THREE.Vector3());
     if(foot.distanceTo(new QA.THREE.Vector3(g.secretCombo.contact.x,g.secretCombo.contact.y,g.secretCombo.contact.z))>1)throw Error('Visible foot missed shared contact');
    }
    QA.renderer.render(QA.scene,QA.camera);powers[kind]=QA.renderer.domElement.toDataURL('image/png');game.afterRender();
    for(const [i,c]of [QA.player,friend].entries())if(!c.root.position.equals(original[i].p)||!c.root.rotation.equals(original[i].r))throw Error('Combined pose restoration');
    testNow=at+1800;game.beforeRender(.016);game.afterRender();
    if(QA.scene.getObjectByName('soccer-ultimate-combo-self')?.visible)throw Error('Combination aura failed to expire');
   }
   return {fire,...powers};
  });
  fs.mkdirSync('verification/shaolin-quality',{recursive:true});
  for(const [name,png]of Object.entries(previews))fs.writeFileSync('verification/shaolin-quality/'+name+'.png',Buffer.from(png.split(',')[1],'base64'));
  assert.deepEqual(errors,[]);
  console.log('PASS actual 3D scene: travel, trails, new powers, paired twin/overhead contact, pose restoration and cleanup',result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
