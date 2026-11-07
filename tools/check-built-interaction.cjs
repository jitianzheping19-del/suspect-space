const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve('dist'),server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/practice-host'){res.setHeader('Content-Type','text/html');res.end('<iframe id="practice" style="position:fixed;inset:0;width:100%;height:100%;border:0" src="/suspect-space/index.html?rolePractice=1&role='+encodeURIComponent(url.searchParams.get('role')||'medic')+'"></iframe>');return;}const file=path.resolve(root,url.pathname.replace(/^\/suspect-space\//,'')||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true,isMobile:true}),errors=[],network=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin===base)return route.continue();if(/^https:\/\/(cdn.jsdelivr.net\/npm|unpkg.com)\/three@/.test(url.href))return route.fulfill({path:path.resolve('node_modules/three',url.pathname.split(/three@[^/]+\//)[1]),contentType:'application/javascript'});if(url.hostname==='www.gstatic.com'&&url.pathname.startsWith('/firebasejs/'))return route.continue();if(/firebase|identitytoolkit|securetoken|skyway/.test(url.href))network.push({url:url.href,method:req.method()});return route.abort();});await page.addInitScript(()=>{try{localStorage.setItem('space-suspect-render-preset-v1','ultralow');}catch{}});await page.routeWebSocket('**/*',s=>{network.push({websocket:s.url()});s.close();});
  const requested=[];page.on('request',r=>requested.push(r.url()));
  await page.goto(base+'/practice-host?role=medic');const f=page.frameLocator('#practice');await f.locator('#rolePracticeControls').waitFor({timeout:45000});await page.waitForTimeout(500);
  const frame=page.frames().find(f=>f.url().includes('rolePractice=1'));
  const cdp=await page.context().newCDPSession(page),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({...p,radiusX:1,radiusY:1,force:1}))});
  for(const size of [{width:844,height:390},{width:1024,height:768}]){
   await page.setViewportSize(size);await page.waitForTimeout(150);
   const center=async id=>{const r=await f.locator(id).boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2,id:2};};
   let point=await center('#abilityBtn');await touch('touchStart',[point]);await page.waitForTimeout(330);
   assert(await f.locator('#abilityTargetSelect').isHidden(),'hold must not execute');assert(await f.locator('#actionPreviewHint').isVisible());if(size.width===844){fs.mkdirSync(path.resolve('tmp/interaction-review'),{recursive:true});await page.screenshot({path:path.resolve('tmp/interaction-review/ability-range.png')});}
   await touch('touchMove',[{...point,x:point.x-120,y:point.y-60}]);await touch('touchEnd',[]);await page.waitForTimeout(80);
   assert(await f.locator('#abilityTargetSelect').isHidden(),'release outside cancels');assert(await f.locator('#actionPreviewHint').isHidden());
   point=await center('#abilityBtn');await touch('touchStart',[point]);await page.waitForTimeout(330);await touch('touchEnd',[]);
   await f.locator('#abilityTargetSelect').waitFor({state:'visible'});await f.locator('#actionCancel').waitFor({state:'visible'});
   assert.equal(await f.locator('#actionCancel').evaluate(n=>n.inert),false);const cancel=await center('#actionCancel');await touch('touchStart',[cancel]);await touch('touchEnd',[]);
   await f.locator('#abilityTargetSelect').waitFor({state:'hidden'});await page.waitForTimeout(850);
   for(let i=0;i<4;i++){await f.locator('#abilityBtn').click();await f.locator('#abilityTargetSelect').waitFor({state:'visible'});await f.locator('#actionCancel').click();await f.locator('#abilityTargetSelect').waitFor({state:'hidden'});}
   // Backgrounding while choosing a target must leave no pending selection.
   await f.locator('#abilityBtn').click();await f.locator('#abilityTargetSelect').waitFor({state:'visible'});
   await frame.evaluate(()=>window.dispatchEvent(new Event('blur')));
   await f.locator('#abilityTargetSelect').waitFor({state:'hidden'});await f.locator('#actionCancel').waitFor({state:'hidden'});
   const ui=await frame.evaluate(()=>({cancel:document.querySelectorAll('#actionCancel').length,hint:document.querySelectorAll('#actionPreviewHint').length,audio:document.querySelectorAll('#sceneAudioSettings input').length}));assert.deepEqual(ui,{cancel:1,hint:1,audio:3});
   console.log('PASS built long-press preview, drag cancellation, release selection, common cancel and repeated open/close',size);
  }
  assert(!requested.some(url=>/assets\/(gacha-ui|practice-lab|selected-role-fx)-[^/]+\.js(?:\?|$)/.test(url)),'unused optional features must not load during isolated medic practice');
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log('PASS no authentication, realtime database, voice or WebSocket requests from role practice');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
