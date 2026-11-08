const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const html=fs.readFileSync('assets-source/lobby-lounge.html','utf8'),module=html.match(/<script type="module">([\s\S]*?)<\/script>/);
 const compiled=await build({stdin:{contents:module[1]+'\nwindow.QA={player,canMoveTo,lobbyPlatformAt,obstacles,scene};',resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'iife'});
 const source=html.replace(module[0],()=>'<script>'+compiled.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')+'</script>');
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({body:source,contentType:'text/html'}));await page.goto('http://127.0.0.1/deck');await page.waitForFunction(()=>window.QA);
  await page.evaluate(()=>{SpaceSuspectLobby.__lobbyRenderActive=false;window.requestAnimationFrame=()=>0;});await page.waitForTimeout(100);
  const result=await page.evaluate(()=>{
   const walk=(start,end)=>{const p=QA.player.root.position;p.set(start.x,0,start.z);p.y=QA.lobbyPlatformAt(p.x,p.z,0);const steps=Math.ceil(Math.hypot(end.x-start.x,end.z-start.z)/.05),heights=[];
    for(let i=1;i<=steps;i++){const x=start.x+(end.x-start.x)*i/steps,z=start.z+(end.z-start.z)*i/steps;if(!QA.canMoveTo(x,z))return{blocked:{x,z,y:p.y},heights};p.x=x;p.z=z;p.y=QA.lobbyPlatformAt(x,z,p.y+.05);heights.push(p.y);}return{heights,final:p.toArray()};};
   const paths=[walk({x:0,z:9},{x:0,z:12.35}),walk({x:0,z:12.35},{x:0,z:9}),walk({x:-4,z:10.3},{x:4,z:10.3})];
   QA.player.root.position.set(0,.68,12.35);const wallBlocked=!QA.canMoveTo(0,13);
   window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-practice-guide',visible:true}}));QA.player.root.position.set(0,0,0);__lobbyPracticeGuideUpdate(2000);const guide=QA.scene.getObjectByName('practice-navigation'),mark=QA.scene.getObjectByName('practice-first-visit'),shown=guide.visible&&mark.visible,dots=guide.children.find(n=>n.isInstancedMesh).count;
   const lights=guide.children.find(n=>n.isInstancedMesh),before=Array.from(lights.instanceColor.array);__lobbyPracticeGuideUpdate(2400);const flowing=before.some((v,i)=>Math.abs(v-lights.instanceColor.array[i])>.05),glow=guide.getObjectByName('practice-route-glow');const noRing=!QA.scene.getObjectByName('lobby-overhead-sculpture');window.dispatchEvent(new MessageEvent('message',{source:window,data:{type:'lobby-practice-guide',visible:false}}));return{paths,wallBlocked,shown,dots,hidden:!guide.visible,flowing,glowCount:glow.count,noRing};
  });
  for(const path of result.paths)assert(!path.blocked,JSON.stringify(path.blocked));assert(Math.abs(Math.max(...result.paths[0].heights)-.68)<.001);assert.equal(result.paths[1].final[1],0);assert(result.wallBlocked);assert(result.shown&&result.dots>2&&result.hidden);assert(result.flowing&&result.glowCount===result.dots&&result.noRing);assert.deepEqual(errors,[]);
  console.log('PASS actual photo deck ascent, descent and sideways traversal without jumping; rear wall remains solid; first-visit mark and dotted route show/hide together');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
