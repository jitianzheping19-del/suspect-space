// Run after npm run build. Exercise the actual Vite bundle's serialized scene,
// since a standalone esbuild test can choose different minified identifiers.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm');
const {createServer}=require('http'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\/suspect-space\//,'');const file=path.resolve(root,'dist',name);if(!file.startsWith(root+'/dist/')||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.writeHead(404).end();res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(window!==top)return;sessionStorage.setItem('space-suspect-skip-autologin-once','1');const descriptor=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'srcdoc');Object.defineProperty(HTMLIFrameElement.prototype,'srcdoc',{...descriptor,set(value){if(this.id==='meeting3D'&&value.length>1000)window.__shippedMeeting=value;descriptor.set.call(this,value);}});});
  // No test accounts or database writes; only SDK source downloads are allowed.
  await page.route(/firebasedatabase\.app|firebaseio\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com/,r=>r.abort());
  await page.route(/https:\/\/(cdn.jsdelivr.net\/npm|unpkg.com)\/three@0.164.1\//,r=>r.fulfill({path:path.join(root,'node_modules/three',r.request().url().split('three@0.164.1/')[1]),contentType:'text/javascript'}));
  await page.goto('http://127.0.0.1:'+server.address().port+'/suspect-space/index.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__shippedMeeting,{},{timeout:60000});
  const scene=await page.evaluate(()=>window.__shippedMeeting);
  for(const script of scene.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
  assert.deepEqual(errors,[]);await page.close();
  for(const size of [{width:1024,height:768,touch:true},{width:1366,height:768,touch:false}]){
   const p=await browser.newPage({viewport:{width:size.width,height:size.height},hasTouch:size.touch});const sceneErrors=[];p.on('pageerror',e=>sceneErrors.push(e.message));await p.route('**/*',r=>r.abort());
   await p.setContent('<iframe id="scene" style="width:100vw;height:100vh;border:0"></iframe>');
   await p.evaluate(scene=>{const frame=document.getElementById('scene');const send=()=>frame.contentWindow.postMessage({type:'ss3d-state',renderActive:true,meetingId:'production-qa',me:'self',voting:true,seats:['self','other','third'].map((id,i)=>({id,name:id,alive:true,hue:i/3,isMe:id==='self'}))},'*');addEventListener('message',e=>{if(e.source===frame.contentWindow&&e.data?.type==='ss3d-ready')send()});frame.srcdoc=scene;},scene);
   const frame=await(await p.locator('#scene').elementHandle()).contentFrame();await frame.waitForFunction(()=>window.meetingScene?.getState().rendering.frames>2,{},{timeout:30000});
   assert.deepEqual(sceneErrors,[]);console.log('PASS actual Vite meeting initialization and advancing 3D frames without external requests',size.width);await p.close();
  }
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
