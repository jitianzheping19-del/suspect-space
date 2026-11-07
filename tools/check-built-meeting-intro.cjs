const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const {build}=await import('vite'),qaRoot=path.resolve('tmp/meeting-intro-built');
 const probe=`window.__meetingIntroQA={async play(report){await loadMeetingIntro();cancelAnimationFrame(frameRequestId);renderContextLost=true;const stamp=now();game.phase='meeting';game.meeting={id:'intro-qa-'+stamp,reporter:uid,reason:report?'遺体を発見':'緊急会議',body:players.dead,startedAt:stamp,presentationEndsAt:stamp+4500,votingAt:stamp+4500,endsAt:stamp+90000,chat:[],ghostChat:[],voted:{},newDeaths:[],memorialDurationMs:900};showMeetingIntro(game.meeting.reason);}};`;
 await build({logLevel:'error',plugins:[{name:'meeting-intro-qa',transformIndexHtml:{order:'pre',handler:html=>html.replace('function showMeetingIntro(reason)',()=>probe+'\nfunction showMeetingIntro(reason)')}}],build:{outDir:qaRoot,emptyOutDir:true,rollupOptions:{input:path.resolve('index.html')}}});
 const root=qaRoot,server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/practice-host'){res.setHeader('Content-Type','text/html');res.end('<iframe id="practice" style="position:fixed;inset:0;width:100%;height:100%;border:0" src="/suspect-space/index.html?rolePractice=1&role='+encodeURIComponent(url.searchParams.get('role')||'medic')+'"></iframe>');return;}const file=path.resolve(root,url.pathname.replace(/^\/suspect-space\//,'')||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),errors=[],network=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin===base)return route.continue();if(/^https:\/\/(cdn.jsdelivr.net\/npm|unpkg.com)\/three@/.test(url.href))return route.fulfill({path:path.resolve('node_modules/three',url.pathname.split(/three@[^/]+\//)[1]),contentType:'application/javascript'});if(url.hostname==='www.gstatic.com'&&url.pathname.startsWith('/firebasejs/'))return route.continue();if(/firebase|identitytoolkit|securetoken|skyway/.test(url.href))network.push({url:url.href,method:req.method()});return route.abort();});await page.addInitScript(()=>{try{localStorage.setItem('space-suspect-render-preset-v1','ultralow');}catch{}});await page.routeWebSocket('**/*',s=>{network.push({websocket:s.url()});s.close();});
  await page.clock.install();
  fs.mkdirSync(path.resolve('tmp/meeting-intro-review'),{recursive:true});
  await page.goto(base+'/practice-host?role=medic');const f=page.frameLocator('#practice');await f.locator('#rolePracticeControls').waitFor({timeout:45000});
  await page.waitForTimeout(500);const frame=page.frames().find(f=>f.url().includes('rolePractice=1'));
  for(const size of [{width:844,height:390},{width:390,height:844},{width:1366,height:768}]){
   await page.setViewportSize(size);
   for(const report of [false,true]){
    await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
    await frame.evaluate(report=>window.__meetingIntroQA.play(report),report);
    await page.clock.runFor(1350);
    try{await f.locator('#meetingIntro[data-cinematic="true"]').waitFor({timeout:15000});}catch(error){console.log(await f.locator('body').innerText());await page.screenshot({path:path.resolve('tmp/meeting-intro-review/start-failure.png')});throw error;}
    await frame.evaluate(()=>{document.querySelector('#rolePracticeControls').style.display='none';});

    const layout=await frame.evaluate(()=>{const host=document.querySelector('#meetingIntro'),title=document.querySelector('#meetingIntroTitle'),canvas=host.querySelector('canvas'),footer=host.querySelector('.meetingIntroFooter');return{background:getComputedStyle(host).backgroundImage,titleColor:getComputedStyle(title).color,active:host.dataset.cinematic,title:title.textContent,rects:[title,canvas,footer].map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,right:r.right,bottom:r.bottom,w:r.width,h:r.height};}),width:innerWidth,height:innerHeight};});
    assert.equal(layout.active,'true');assert(layout.background.includes(report?'rgb(59, 36, 53)':'rgb(35, 57, 73)'),'cinematic background must override legacy layers');assert.equal(layout.titleColor,'rgb(244, 248, 255)');assert(layout.rects[2].y>=layout.rects[1].bottom,'footer follows the scene');for(const r of layout.rects){assert(r.w>0&&r.h>0);assert(r.x>=-1&&r.right<=layout.width+1);assert(r.y>=-1&&r.bottom<=layout.height+1);}
    await page.screenshot({path:path.resolve('tmp/meeting-intro-review/'+(report?'report':'emergency')+'-'+size.width+'.png')});
    await page.clock.runFor(3000);
    await f.locator('#meetingIntro[data-cinematic="true"]').waitFor({state:'hidden',timeout:10000});await page.clock.resume();
    assert.equal(await f.locator('.meetingIntroRail,.meetingIntroFooter,.meetingIntroCanvas').count(),0);
    console.log('PASS built cinematic, title/canvas/footer fit and cleanup',size,report?'report':'emergency');
   }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log('PASS no authentication, realtime database, voice or WebSocket requests from role practice');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
