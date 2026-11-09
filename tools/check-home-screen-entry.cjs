// First-screen behavior against the production build, with real mobile UAs.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const IPAD='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
(async()=>{
 const root=path.resolve('dist'),out=path.resolve('tmp/home-screen-entry');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://local'),file=path.resolve(root,url.pathname.replace(/^\/suspect-space\//,'')||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)]||'text/plain');fs.createReadStream(file).pipe(res);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 const errors=[];
 async function open({ua=IOS,size={width:390,height:844},standalone=false,iosStandalone=false,blockScripts=false,ipad=false,fullscreen=false}={}){
  const context=await browser.newContext({viewport:size,screen:size,userAgent:ua,isMobile:true,hasTouch:true}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({standalone,iosStandalone,ipad,fullscreen})=>{
   if(window!==window.top)return;
   localStorage.setItem('space-suspect-room','1234');localStorage.setItem('space-suspect-render-preset-v1','ultralow');if(standalone||iosStandalone||ipad)sessionStorage.setItem('space-suspect-skip-autologin-once','1');
   if(ipad){Object.defineProperty(navigator,'platform',{get:()=> 'MacIntel'});Object.defineProperty(navigator,'maxTouchPoints',{get:()=>5});}
   if(iosStandalone)Object.defineProperty(navigator,'standalone',{get:()=>true});
   const actual=window.matchMedia.bind(window);window.matchMedia=query=>{const m=actual(query);if((standalone&&query.includes('display-mode: standalone'))||(fullscreen&&query.includes('display-mode: fullscreen')))return {matches:true,media:query,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}};return m;};
  },{standalone,iosStandalone,ipad,fullscreen});
  const transport=[];await page.route('**/*',route=>{const req=route.request(),url=new URL(req.url());if(blockScripts&&req.resourceType()==='script')return route.abort();if(url.origin===base)return route.continue();if(/^https:\/\/(cdn.jsdelivr.net\/npm|unpkg.com)\/three@/.test(url.href))return route.fulfill({path:path.resolve('node_modules/three',url.pathname.split(/three@[^/]+\//)[1]),contentType:'application/javascript'});if(url.hostname==='www.gstatic.com'&&url.pathname.startsWith('/firebasejs/'))return route.continue();if(/firebase|identitytoolkit|securetoken|skyway/.test(url.href))transport.push(req.url());return route.abort();});await page.routeWebSocket('**/*',socket=>{transport.push(socket.url());socket.close();});
  await page.goto(base+'/suspect-space/',{waitUntil:'domcontentloaded',timeout:30000});return{page,context,transport};
 }
 try{
  for(const [os,ua]of [['ios',IOS],['android',ANDROID]])for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390}]){
   const {page,context,transport}=await open({ua,size});const guide=page.locator('#homeScreenGuide');await guide.waitFor({state:'visible'});assert.equal(await guide.getAttribute('data-platform'),os);
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.roomResume),'pending');assert(await page.locator('#nameGate').isHidden());assert(await page.locator('#setup').isHidden());assert.equal(await page.locator('#viewport > canvas').count(),0,'renderer must not boot in a phone browser');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   const title=await guide.locator('h1').boundingBox();assert(title.y>=0&&title.x>=0&&title.x+title.width<=size.width+1);
   const step=guide.locator('[data-home-instructions="'+os+'"] strong').first();assert(await step.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=22));
   await page.keyboard.press('Escape');assert(await guide.isVisible());assert.equal(await page.locator('#firebaseConnecting').isVisible(),false);
   await guide.locator('[data-home-platform="'+(os==='ios'?'android':'ios')+'"]').click();assert.equal(await guide.getAttribute('data-platform'),os==='ios'?'android':'ios');await guide.locator('[data-home-platform="'+os+'"]').click();
   await page.screenshot({path:path.join(out,os+'-'+size.width+'.png'),fullPage:true});assert.deepEqual(transport,[]);await context.close();
  }
  console.log('PASS iPhone/Android first screen, large text, no overflow, no game/auth/room boot, tab switching and no dismiss path');
  {const {page,context}=await open({blockScripts:true});assert(await page.locator('#homeScreenGuide').isVisible());await page.locator('[data-home-platform="android"]').click();assert.equal(await page.locator('#homeScreenGuide').getAttribute('data-platform'),'android');await context.close();}
  console.log('PASS guide works before game scripts or CDN libraries load');
  {const {page,context}=await open({ua:ANDROID});await page.evaluate(()=>{const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=async()=>{window.promptCalls=(window.promptCalls||0)+1;};event.userChoice=Promise.resolve({outcome:'accepted'});dispatchEvent(event);});await page.locator('#homeInstallButton').click();await page.waitForFunction(()=>window.promptCalls===1);await page.evaluate(()=>dispatchEvent(new Event('appinstalled')));assert(await page.locator('#homeScreenGuide').isVisible(),'install completion alone does not unlock the browser');assert.equal(await page.locator('#viewport > canvas').count(),0);await context.close();}
  console.log('PASS native Android installation prompt remains gated until launched from home');
  {const {page,context}=await open({ua:ANDROID,fullscreen:true});assert(await page.locator('#homeScreenGuide').isVisible(),'browser fullscreen is not a home-screen launch');await context.close();}
  for(const options of [{ua:IOS,iosStandalone:true},{ua:ANDROID,standalone:true},{ua:IPAD,ipad:true,size:{width:768,height:1024}}]){
   const {page,context}=await open(options);assert(await page.locator('#homeScreenGuide').isHidden());await page.waitForFunction(()=>document.getElementById('setupMessage')?.textContent==='4桁PINを入力してください。',null,{timeout:45000});assert(await page.locator('#nameGate').isVisible());await context.close();
  }
  console.log('PASS iOS home launch, Android standalone launch, and iPad browser reach the game login; fullscreen does not bypass the guide');
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
