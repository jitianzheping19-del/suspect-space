const fs=require('node:fs'),assert=require('node:assert/strict');const {build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['lobby-photo-ui.js'],bundle:true,minify:true,write:false,format:'iife',globalName:'Photo'});
 const source=fs.readFileSync('index.html','utf8'),at=source.lastIndexOf('  /* SSX_UI_A11Y:'),manager=source.slice(at,source.indexOf('</script>',at));
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const pages=[];
  for(const uid of ['host','friend','outside']){
   const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true,acceptDownloads:true});pages.push(page);
   await page.route('http://127.0.0.1/test',r=>r.fulfill({body:'<!doctype html>',contentType:'text/html'}));await page.goto('http://127.0.0.1/test');
   await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#183546}.hidden,[hidden]{display:none!important}#controls{position:fixed;bottom:15px;left:15px}button{min-height:48px}iframe{display:none}</style><div id="controls"><button id="move">移動</button></div><button id="jumpBtn">ジャンプ</button><iframe id="frame"></iframe>');
   await page.addStyleTag({content:fs.readFileSync('lobby-photo-ui.css','utf8')});await page.addScriptTag({content:bundle.outputFiles[0].text});
   await page.addScriptTag({content:'window.SpaceSuspect={runtime:{stopGameInputForModal(){window.stopped=(window.stopped||0)+1;}}};'+manager});
   await page.clock.install();
   await page.evaluate(uid=>{
    window.ctx={uid,active:true,near:uid!=='outside',camera:false,time:100000};window.requests=0;window.moves=0;window.messages=[];
    const frame=document.getElementById('frame');frame.contentWindow.addEventListener('message',e=>window.messages.push(e.data));
    document.getElementById('move').onclick=()=>moves++;
    window.photo=Photo.createLobbyPhotoUI({document,window,frame:()=>frame,isActive:()=>ctx.active,isNear:()=>ctx.near,isAtCamera:()=>ctx.camera,getUid:()=>uid,request:()=>requests++,clock:()=>ctx.time});
   },uid);
  }
  const shot={id:'group',at:105000,expiresAt:165000,members:{host:true,friend:true}};
  for(const [i,page]of pages.entries()){
   await page.evaluate(shot=>photo.sync(shot),shot);await page.clock.runFor(100);
   assert.equal(await page.locator('#lobbyPhotoViewfinder').isVisible(),i<2);assert(await page.locator('#lobbyPhotoDialog').isHidden());
   await page.locator('#move').tap();assert.equal(await page.evaluate(()=>moves),1,'nonmodal countdown allows movement');
   assert.equal(await page.evaluate(()=>document.getElementById('controls').inert),false);
   assert.equal(await page.evaluate(()=>messages.filter(m=>m.type==='lobby-photo-start').length),1);
   await page.evaluate(shot=>photo.sync(shot),shot);await page.clock.runFor(100);assert.equal(await page.evaluate(()=>messages.length),1,'repeated state does not restart capture');
   if(i===0&&process.env.VISUAL_SHOTS)await page.screenshot({path:process.env.VISUAL_SHOTS+'/photo-viewfinder.png'});
   await page.evaluate(()=>ctx.time=105000);await page.clock.runFor(80);assert.equal(await page.locator('#lobbyPhotoFlash').isVisible(),i<2);
   await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=16;canvas.height=9;canvas.getContext('2d').fillRect(0,0,16,9);window.dispatchEvent(new MessageEvent('message',{source:document.getElementById('frame').contentWindow,data:{type:'lobby-photo-result',id:'group',image:canvas.toDataURL()}}));});
   await page.evaluate(()=>ctx.time=105300);await page.clock.runFor(100);assert(await page.locator('#lobbyPhotoFlash').isHidden());assert(await page.locator('#lobbyPhotoDialog').isHidden(),'do not force preview after shutter');
   await page.evaluate(()=>{ctx.near=false;ctx.camera=true;photo.openAtCamera();});await page.clock.runFor(100);
   assert(await page.locator('[data-photo-save]').isVisible(),'every connected player can retrieve photo at camera');
   const download=page.waitForEvent('download');await page.locator('[data-photo-save]').tap();assert.match((await download).suggestedFilename(),/SPACE-SUSPECT-.*\.png/);
   await page.locator('[data-photo-close]').tap();await page.clock.runFor(100);await page.locator('#move').tap();assert.equal(await page.evaluate(()=>moves),2,'modal close restores movement');
   await page.evaluate(()=>{photo.openAtCamera();ctx.time=165000;});await page.clock.runFor(100);assert(await page.locator('[data-photo-save]').isHidden(),'expires exactly 60 seconds after shutter');
   await page.locator('[data-photo-close]').tap();await page.clock.runFor(50);
   await page.evaluate(()=>{ctx.time=200000;ctx.near=true;photo.sync({id:'next',at:205000,expiresAt:265000,members:{[ctx.uid]:true}});ctx.active=false;});await page.clock.runFor(100);
   assert(await page.locator('#lobbyPhotoViewfinder').isHidden());assert(await page.locator('#lobbyPhotoDialog').isHidden());assert.equal(await page.evaluate(()=>document.body.dataset.lobbyPhoto),undefined);
   await page.close();
  }
  console.log('PASS shared participant-only countdown, touch movement, flash, no automatic modal, camera retrieval/download for all three clients, expiry and leave cleanup with real modal manager');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
