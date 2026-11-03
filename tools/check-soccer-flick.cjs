const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['lobby-soccer-flick.js'],bundle:true,write:false,outfile:'flick.js',format:'iife',globalName:'Flick'});
 const html=fs.readFileSync('index.html','utf8'),filter=html.split('    const touchActionButtons=')[1].split('// Host writes only game;')[0];
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height] of [[844,390],[390,844],[568,320],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#174b39}#stick{position:fixed;bottom:30px;left:20px;width:90px;height:90px;touch-action:none}</style><div id="stick"></div>');await page.clock.install();
  await page.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
  await page.addScriptTag({content:'const code="test",game={phase:"lobby"};const touchActionButtons='+filter});
  await page.evaluate(()=>{window.ctx={visible:true,enabled:true,canSkill:true,yaw:0,rightX:1,rightZ:0,forwardX:0,forwardZ:1};window.commands=[];window.flick=Flick.createSoccerFlickControls({document,window,context:()=>ctx,send:(kind,data)=>commands.push({kind,...data})});flick.update();});
  assert.equal(await page.locator('#soccerFlickZone button').count(),0);
  const rect=await page.locator('#soccerFlickZone').boundingBox(),x=rect.x+rect.width*.5,y=rect.y+rect.height*.45,cdp=await page.context().newCDPSession(page);
  async function stroke(points,hold=0,cancel=false){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x+points[0][0],y:y+points[0][1]}]});if(hold)await page.clock.runFor(hold);for(const [dx,dy]of points.slice(1)){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx,y:y+dy}]});await page.clock.runFor(12);}await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await page.clock.runFor(30);}
  await stroke([[0,0],[0,-30],[0,-55]]);assert.equal(await page.evaluate(()=>commands.at(-1).mode),'pass');
  await stroke([[0,0],[35,0],[55,0]],500);const shot=await page.evaluate(()=>commands.at(-1));assert.equal(shot.mode,'shot');assert(shot.power>.5);assert(Math.abs(shot.yaw-Math.PI/2)<.01);
  await stroke([[0,0],[30,0],[40,0],[40,-35],[40,-50]]);assert.equal(await page.evaluate(()=>commands.at(-1).skill),'doubleTouch');
  await stroke([[0,0],[0,30],[0,40],[0,0],[0,-40]]);assert.equal(await page.evaluate(()=>commands.at(-1).skill),'heelLift');
  await stroke(Array.from({length:15},(_,i)=>[Math.cos(i/14*Math.PI)*40,Math.sin(i/14*Math.PI)*40]));assert.equal(await page.evaluate(()=>commands.at(-1).skill),'roulette');
  for(const side of [-1,1]){await stroke([[0,0],[12*side,5],[25*side,14],[36*side,-7],[42*side,-36]]);const move=await page.evaluate(()=>commands.at(-1));assert.equal(move.skill,'doubleTouch');assert.equal(move.side,side);}
  await stroke([[0,0],[50,0]],0,true);assert.equal(await page.evaluate(()=>commands.length),7);
  await page.evaluate(()=>{ctx.enabled=false;flick.update();});await stroke([[0,0],[55,0]]);assert.equal(await page.evaluate(()=>commands.length),7);
  await page.evaluate(()=>{ctx.visible=false;flick.update();});assert(await page.locator('#soccerFlickZone').isHidden());
  console.log('PASS flick pass/charged shot, three gestures, cancel and inactive guard',width,height);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
