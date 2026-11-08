const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+'\nwindow.QA={THREE,player,canMoveTo,obstacles,scene,camera,renderer,planGachaRoute,updatePlayer,updateLobbyVisualPoses,lobbyVisualStates,remoteCrews,setSelf:id=>visualSelfUid=id};',resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  fs.mkdirSync('tmp/lobby-garage',{recursive:true});const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});
  await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/garage');await page.waitForFunction(()=>window.QA,{},{timeout:15000});
  await page.evaluate(()=>{SpaceSuspectLobby.__lobbyRenderActive=false;window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
  const result=await page.evaluate(()=>{
   const {THREE:T,scene,player,canMoveTo,obstacles,planGachaRoute}=QA,garage=scene.getObjectByName('lobby-racing-garage'),car=scene.getObjectByName('lobby-garage-race-car');
   scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(garage),carBounds=new T.Box3().setFromObject(car);let wheels=0;car.traverse(n=>{if(['race-wheel-front','race-wheel-rear'].includes(n.name))wheels++;});
   const walk=(from,to)=>{player.root.position.set(from.x,0,from.z);const n=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.05);for(let i=1;i<=n;i++){const x=from.x+(to.x-from.x)*i/n,z=from.z+(to.z-from.z)*i/n;if(!canMoveTo(x,z))return {x,z};player.root.position.set(x,0,z);}return true;};
   const aisle=walk({x:-7,z:8},{x:-7,z:12.7});player.root.position.set(-7,0,11.95);const carSolid=!canMoveTo(-9.45,11.95);
   const routes=[6,9.3].map(z=>planGachaRoute({x:0,z:0},{x:-9.6,z},obstacles).length);
   return {garage:!!garage,car:!!car,wheels,inside:bounds.min.x>-11.8&&bounds.max.z<13.8,carInside:bounds.containsBox(carBounds),aisle,carSolid,routes};
  });
  assert(result.garage&&result.car&&result.inside&&result.carInside);assert.equal(result.wheels,4);assert.equal(result.aisle,true,JSON.stringify(result.aisle));assert(result.carSolid);assert(result.routes.every(n=>n>0));
  for(const [name,position,target]of [['garage',[-4.6,3.3,9.1],[-9.4,1.2,11.9]],['gacha-neighbor',[-2.4,6.4,16.2],[-9.9,1.3,9.4]]]){
   const png=await page.evaluate(({position,target})=>{const {camera,renderer,scene,player}=QA;player.root.visible=false;camera.position.set(...position);camera.lookAt(...target);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},{position,target});fs.writeFileSync('tmp/lobby-garage/'+name+'.png',Buffer.from(png.split(',')[1],'base64'));
  }
  const driving=await page.evaluate(()=>{
   const {player,updatePlayer,lobbyVisualStates}=QA,car=window.__lobbyRaceCar;QA.setSelf('self');lobbyVisualStates.clear();lobbyVisualStates.set('self',{online:true,name:'Driver',x:-7,z:11.95});player.root.visible=true;player.root.position.set(-7,0,11.95);window.__lobbyMotionUntil=0;
   const post=data=>window.dispatchEvent(new MessageEvent('message',{source:window,data}));post({type:'lobby-car-toggle'});const mounted=car.riding,start=player.root.position.clone();
   post({type:'lobby-stick',x:0,z:-1});for(let i=0;i<75;i++)updatePlayer(1/60,i/60);post({type:'lobby-stick',x:0,z:0});for(let i=0;i<20;i++)updatePlayer(1/60,2+i/60);
   const forward=player.root.position.x-start.x;
   // A clear part of the real lobby lets us verify steering and jump/landing.
   player.root.position.set(0,0,5);player.root.rotation.y=0;
   post({type:'lobby-stick',x:.7,z:-.6});for(let i=0;i<30;i++)updatePlayer(1/60,3+i/60);post({type:'lobby-stick',x:0,z:0});for(let i=0;i<30;i++)updatePlayer(1/60,4+i/60);const turning=player.root.rotation.y;
   post({type:'lobby-jump'});let peak=0;for(let i=0;i<30;i++){updatePlayer(1/60,5+i/60);peak=Math.max(peak,player.root.position.y);}post({type:'lobby-car-toggle'});const noAirExit=car.riding;
   for(let i=0;i<70;i++)updatePlayer(1/60,6+i/60);const landed=player.root.position.y;
   const before=player.legs.map(l=>l.rotation.x),restore=car.beforeRender(),seated=player.legs.every(l=>l.rotation.x< -1);restore();const poseRestored=player.legs.every((l,i)=>l.rotation.x===before[i]);
   car.visuals(.016);car.updateCamera(.016);const outsideBlocked=!car.canOccupy(-11.4,0,0,0),poolBlocked=!car.canOccupy(7.8,8.45,3,0),furnitureBlocked=!car.canOccupy(0,.7,0,0);
   post({type:'lobby-car-toggle'});const left=!car.riding&&Math.abs(player.root.position.y)<.001;
   player.root.position.set(-7,0,11.95);post({type:'lobby-car-toggle'});post({type:'lobby-return-reset',position:{x:0,z:-4.45}});const reset=!car.riding;
   return {mounted,forward,turning,peak,noAirExit,landed,seated,poseRestored,outsideBlocked,poolBlocked,furnitureBlocked,left,reset};
  });
  assert(driving.mounted);assert(driving.forward>2,JSON.stringify(driving));assert(Math.abs(driving.turning)>.1,JSON.stringify(driving));assert(driving.peak>1);assert(driving.noAirExit);assert(driving.landed<.03);assert(driving.seated&&driving.poseRestored);assert(driving.outsideBlocked&&driving.poolBlocked&&driving.furnitureBlocked);assert(driving.left&&driving.reset);
  const sync=await page.evaluate(()=>{
   const {player,scene,lobbyVisualStates:rows,remoteCrews,updateLobbyVisualPoses}=QA,car=__lobbyRaceCar;
   const post=data=>window.dispatchEvent(new MessageEvent('message',{source:window,data}));
   post({type:'lobby-config',uid:'self',players:{self:{x:-7,z:11.95,online:true},other:{x:1,z:6,online:true,name:'Driver',lobbyVehicle:true,lobbyY:.8}}});
   window.applyLobbyVisualState('other',{x:1,z:6,online:true,lobbyVehicle:true,lobbyY:.8});
   updateLobbyVisualPoses(1/60,1000);car.visuals(1/60);const clone=scene.getObjectByName('remote-race-car-other'),rendered=!!clone;
   player.root.position.set(-7,0,11.95);window.__lobbyMotionUntil=0;const unavailable=!car.near(),parkedHidden=!scene.getObjectByName('lobby-garage-race-car').visible;
   post({type:'lobby-poses',players:{other:{x:2,z:6,lobbyY:1.2,yaw:.8,lobbyVehicle:true,walking:true}}});updateLobbyVisualPoses(1/60,1100);car.visuals(1/60);const tracked=!!clone&&clone.position.distanceTo(remoteCrews.get('other').root.position)<.001;
   window.applyLobbyVisualState('other',{online:false,lobbyVehicle:true});car.visuals(1/60);const disconnected=!scene.getObjectByName('remote-race-car-other'),available=car.near();
   return {rendered,unavailable,parkedHidden,tracked,disconnected,available};
  });assert(Object.values(sync).every(Boolean),JSON.stringify(sync));
  assert.deepEqual(errors,[]);console.log('PASS garage model, open sides, gacha paths; stick driving and steering, car jump/landing, airborne exit guard, seated pose restoration, walls/furniture/pool collision and reset',driving);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
