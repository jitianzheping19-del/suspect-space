const fs=require('node:fs'),assert=require('node:assert/strict');
const {build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),match=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 assert(match,'embedded lobby module');
 const bundled=await build({stdin:{contents:match[1]+'\nwindow.QA={THREE,renderer,scene,player,camera,remoteCrews,obstacles,canMoveTo,lobbyPlatformAt};',resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(match[0],()=>'<script>'+bundled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>route.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/lobby');
  await page.waitForFunction(()=>window.QA&&window.__lobbyGames);await page.waitForTimeout(400);
  await page.evaluate(()=>{window.received=[];window.addEventListener('message',e=>received.push(e.data));});
  const retired=await page.evaluate(()=>({
   course:!!window.__lobbyKartCircuit,
   roots:!!QA.scene.getObjectByName('lobby-sky-ascent')||!!QA.scene.getObjectByName('lobby-waiting-circuit')||!!QA.scene.getObjectByName('uploaded-sky-loop-circuit'),
   pads:QA.obstacles.some(p=>p.ascent),hud:!!document.getElementById('lobbyKartHud'),
   outside:QA.canMoveTo(13,-4.8),floor:QA.lobbyPlatformAt(0,4),
   photo:!!QA.scene.getObjectByName('lobby-photo-camera-station')
  }));
  assert.deepEqual(retired,{course:false,roots:false,pads:false,hud:false,outside:false,floor:0,photo:true});
  console.log('PASS no course geometry, vehicles, platform colliders or HUD; closed exit and photo station preserved');
  await page.evaluate(()=>{
   const now=Date.now(),s=window.__lobbyGames.state||{soccer:{status:'playing',members:{self:0,friend:0,enemy:1},kicks:{},ball:{x:23,y:.3,z:10,vx:0,vy:0,vz:0,at:now},score:[0,0],startAt:now-1000,endAt:now+180000},tag:null,survival:null};
   window.testState=s;window.testRoster={self:{online:true,name:'あなた',x:23,z:9},friend:{online:true,name:'味方',x:24,z:17},enemy:{online:true,name:'相手',x:24,z:4}};
   window.postMessage({type:'lobby-games-state',enabled:true,state:s,uid:'self',host:'self',serverNow:now,players:testRoster},'*');
  });await page.waitForTimeout(80);
  await page.evaluate(()=>{QA.player.root.position.set(11.9,0,2.1);__lobbyGames.update(.016);QA.player.root.position.x=13;__lobbyGames.update(.016);QA.player.root.position.set(23,0,9);});
  await page.waitForFunction(()=>__lobbyGames.area==='soccer');
  const signs=await page.evaluate(()=>{__lobbyGames.beforeRender(.016);const text=QA.scene.getObjectByName('lobby-player-count-soccer').userData.text;__lobbyGames.afterRender();return text;});assert.equal(signs,'3人プレイ中');
  const ball=await page.evaluate(()=>{
   window.SpaceSuspectLobby.__lobbyRenderActive=false;
   const {THREE:T,scene,renderer}=QA,game=__lobbyGames;game.beforeRender(.016);
   const camera=new T.PerspectiveCamera(35,1,.1,100);camera.position.set(24,1.05,11.2);camera.lookAt(23,.3,10);
   const target=new T.WebGLRenderTarget(256,256);renderer.setRenderTarget(target);renderer.render(scene,camera);const pixels=new Uint8Array(256*256*4);renderer.readRenderTargetPixels(target,0,0,256,256,pixels);renderer.setRenderTarget(null);target.dispose();
   let white=0;for(let y=70;y<190;y++)for(let x=70;x<190;x++){const i=(y*256+x)*4;if(pixels[i]>125&&pixels[i+1]>125&&pixels[i+2]>125)white++;}
   renderer.setSize(768,768,false);renderer.render(scene,camera);game.afterRender();return{white,png:renderer.domElement.toDataURL('image/png')};
  });assert(ball.white>1200,'ball has visible white panels in actual lobby lighting');
  const dir=process.env.VISUAL_SHOTS;if(dir){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(dir+'/soccer-court-ball.png',Buffer.from(ball.png.split(',')[1],'base64'));}
  const animation=await page.evaluate(()=>{
   const game=__lobbyGames,leg=QA.player.legs[1],base=leg.rotation.clone();testState.soccer.kicks.self={at:Date.now()-135,mode:'shot'};
   game.state.soccer.kicks=testState.soccer.kicks;game.beforeRender(.016);const moved=Math.abs(leg.rotation.x-base.x)>.5;game.afterRender();return{moved,restored:leg.rotation.equals(base)};
  });assert(animation.moved&&animation.restored,'kick pose animated and restored after rendering');
  console.log('PASS actual minified lobby: white ball under court lighting, animated kick, pose restoration, live player sign');
  await page.evaluate(()=>{window.SpaceSuspectLobby.__lobbyRenderActive=true;window.SpaceSuspectLobby.__lobbyStartRender?.();__lobbyGames.exit();QA.player.root.position.set(0,.16,10.25);});
  await page.waitForTimeout(120);
  await page.evaluate(()=>window.postMessage({type:'lobby-photo-start',id:'shared-shot',at:Date.now()+400,preview:true},'*'));
  await page.waitForFunction(()=>!!window.__lobbyPhotoCamera);
  const framing=await page.evaluate(()=>{
   const overhead=QA.scene.getObjectByName('lobby-overhead-sculpture'),station=QA.scene.getObjectByName('lobby-photo-camera-station'),wasVisible=overhead.visible;
   const restore=window.__lobbyPhotoView.prepareView(),clear=!overhead.visible,stationVisible=station.visible;restore();
   return{clear,stationVisible,restored:overhead.visible===wasVisible};
  });assert(framing.clear&&framing.stationVisible&&framing.restored,'photo view hides overhead sculpture and restores it after rendering');
  const moved=await page.evaluate(()=>{const start=QA.player.root.position.x;window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',key:'d'}));return start;});
  await page.waitForTimeout(120);await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD',key:'d'})));
  assert.notEqual(await page.evaluate(()=>QA.player.root.position.x),moved,'movement works during countdown');
  await page.waitForFunction(()=>received.some(d=>d.type==='lobby-photo-result'&&d.id==='shared-shot'));
  const photo=await page.evaluate(()=>received.find(d=>d.type==='lobby-photo-result'&&d.id==='shared-shot').image);if(dir)fs.writeFileSync(dir+'/shared-photo.png',Buffer.from(photo.split(',')[1],'base64'));
  const dimensions=await page.evaluate(async source=>{const image=new Image();image.src=source;await image.decode();return[image.naturalWidth,image.naturalHeight];},photo);assert.deepEqual(dimensions,[1280,720]);
  assert.equal(await page.evaluate(()=>window.__lobbyPhotoCamera),null);
  const station=await page.evaluate(()=>!!QA.scene.getObjectByName('lobby-photo-camera-station'));assert(station);
  console.log('PASS photo capture in actual lobby, camera station, movement during shared countdown, camera restored');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
