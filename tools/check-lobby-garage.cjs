const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+'\nwindow.QA={THREE,player,canMoveTo,obstacles,scene,camera,renderer,planGachaRoute};',resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  fs.mkdirSync('tmp/lobby-garage',{recursive:true});const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/garage');await page.waitForFunction(()=>window.QA);
  await page.evaluate(()=>{SpaceSuspectLobby.__lobbyRenderActive=false;window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
  const result=await page.evaluate(()=>{
   const {THREE:T,scene,player,canMoveTo,obstacles,planGachaRoute}=QA,garage=scene.getObjectByName('lobby-racing-garage'),car=scene.getObjectByName('lobby-garage-race-car');
   scene.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(garage),carBounds=new T.Box3().setFromObject(car);let wheels=0;car.traverse(n=>{if(n.name==='race-car-wheel')wheels++;});
   const walk=(from,to)=>{player.root.position.set(from.x,0,from.z);const n=Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.05);for(let i=1;i<=n;i++){const x=from.x+(to.x-from.x)*i/n,z=from.z+(to.z-from.z)*i/n;if(!canMoveTo(x,z))return {x,z};player.root.position.set(x,0,z);}return true;};
   const aisle=walk({x:-7,z:8},{x:-7,z:12.7});player.root.position.set(-7,0,11.95);const carSolid=!canMoveTo(-9.45,11.95);
   const routes=[6,9.3].map(z=>planGachaRoute({x:0,z:0},{x:-9.6,z},obstacles).length);
   return {garage:!!garage,car:!!car,wheels,inside:bounds.min.x>-11.8&&bounds.max.z<13.8,carInside:bounds.containsBox(carBounds),aisle,carSolid,routes};
  });
  assert(result.garage&&result.car&&result.inside&&result.carInside);assert.equal(result.wheels,4);assert.equal(result.aisle,true,JSON.stringify(result.aisle));assert(result.carSolid);assert(result.routes.every(n=>n>0));
  for(const [name,position,target]of [['garage',[-4.6,3.3,9.1],[-9.4,1.2,11.9]],['gacha-neighbor',[-2.4,6.4,16.2],[-9.9,1.3,9.4]]]){
   const png=await page.evaluate(({position,target})=>{const {camera,renderer,scene,player}=QA;player.root.visible=false;camera.position.set(...position);camera.lookAt(...target);renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},{position,target});fs.writeFileSync('tmp/lobby-garage/'+name+'.png',Buffer.from(png.split(',')[1],'base64'));
  }
  assert.deepEqual(errors,[]);console.log('PASS garage and four-wheel race car fit inside lobby; entrance aisle, vehicle collision and both gacha routes; actual rendered views');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
