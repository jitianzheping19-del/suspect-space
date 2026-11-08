const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const root=path.resolve('dist'),server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/practice-host'){res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><iframe id="practice" style="position:fixed;inset:0;width:100%;height:100%;border:0" src="/suspect-space/index.html?rolePractice=1&role='+encodeURIComponent(url.searchParams.get('role')||'medic')+'"></iframe>');return;}const file=path.resolve(root,url.pathname.replace(/^\/suspect-space\//,'')||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{const page=await browser.newPage({viewport:{width:1024,height:768},hasTouch:true,isMobile:true}),errors=[],network=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message);});await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(url.origin===base)return route.continue();if(/^https:\/\/(cdn.jsdelivr.net\/npm|unpkg.com)\/three@/.test(url.href))return route.fulfill({path:path.resolve('node_modules/three',url.pathname.split(/three@[^/]+\//)[1]),contentType:'application/javascript'});if(url.hostname==='www.gstatic.com'&&url.pathname.startsWith('/firebasejs/'))return route.continue();if(/firebase|identitytoolkit|securetoken|skyway/.test(url.href))network.push({url:url.href,method:req.method()});return route.abort();});await page.addInitScript(()=>{try{localStorage.setItem('space-suspect-render-preset-v1','ultralow');}catch{}});await page.routeWebSocket('**/*',s=>{network.push({websocket:s.url()});s.close();});
  const requested=[];page.on('request',r=>requested.push(r.url()));
  await page.goto(base+'/practice-host?role=medic');const f=page.frameLocator('#practice');await f.locator('#rolePracticeControls').waitFor({timeout:45000});await page.waitForTimeout(500);
  const frame=page.frames().find(f=>f.url().includes('rolePractice=1'));
  await frame.addStyleTag({content:'#rolePracticeControls{display:none!important}'});
  for(const size of (process.argv.includes('--portrait')?[{width:390,height:844}]:[{width:390,height:844},{width:844,height:390},{width:1024,height:768}])){
   await page.setViewportSize(size);await page.waitForTimeout(200);if(await f.locator('#ssxOrientationContinue').isVisible())await f.locator('#ssxOrientationContinue').tap();console.log('checking built settings',size);
   await frame.evaluate(()=>window.__openSpaceInputSettings());
   await f.locator('[data-settings-target="friends"]').tap({timeout:8000});
   await f.locator('[data-friend-tab="add"]').tap();
   assert(await f.locator('#friendNameInput').isVisible());
   await f.locator('[data-friend-tab="requests"]').tap();
   assert(await f.locator('[data-friend-view="requests"]').isVisible());
   const geometry=await frame.evaluate(()=>{const b=document.getElementById('settingsStatusButton').getBoundingClientRect(),c=document.getElementById('inputSettingsClose').getBoundingClientRect(),p=document.querySelector('[data-settings-section="friends"]');return {left:b.right<=c.left+1&&Math.abs(b.top-c.top)<12,overflow:p.scrollWidth>p.clientWidth+1};});
   assert.equal(geometry.left,true);assert.equal(geometry.overflow,false);await page.screenshot({path:'tmp/friends-check/settings-'+size.width+'.png'});
   await f.locator('[data-settings-target="operation"]').tap();
   const text=await f.locator('[data-settings-section="operation"]').innerText();assert(!/推理メモ|タッチ操作|プール横/.test(text));
   assert.equal(await f.locator('#lobbySocialBtn').count(),0);
   await f.locator('#inputSettingsClose').tap();await f.locator('#inputSettingsDialog').waitFor({state:'hidden'});
   console.log('PASS built settings touch navigation, friends tabs, status left of close, clean operation tab',size);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(network,[]);

 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
