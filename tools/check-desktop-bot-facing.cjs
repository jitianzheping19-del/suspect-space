// Reuse the isolated in-memory room fixture, adapting its raw module server to
// the CSS imports now handled by Vite in production. No online room is created.
const fs=require('fs'),path=require('path'),Module=require('module');
const filename=path.resolve(__dirname,'check-room-rejoin.cjs');
let source=fs.readFileSync(filename,'utf8');
source=source.replace("fixture+'\\nfunction showMeetingIntro(reason)'","fixture+"+JSON.stringify(fs.readFileSync(path.resolve(__dirname,'phone-runtime-fixture.js'),'utf8'))+"+'\\nfunction showMeetingIntro(reason)'");
source=source.replace("fixture+'\\nfunction showMeetingIntro(reason)'", "fixture+'\\nwindow.__mobileQA=()=>({mobile:renderBudget.mobile,target:renderBudget.fps,ratio:renderPixelRatio});\\nfunction showMeetingIntro(reason)'");
source=source.replace("await page.route('**/firebase-database.js'", `
 await page.route('**/firebase-database-session.js',r=>r.fulfill({contentType:'application/javascript',body:fakeDatabase+'\\nexport const activateDatabaseSession=()=>{},blockDatabaseSession=()=>{},closeDatabaseSession=async()=>{};'}));
 await page.route('**/*.css',async r=>{
  if(r.request().resourceType()!=='script')return r.continue();
  const css=fs.readFileSync(path.join(root,new URL(r.request().url()).pathname),'utf8');
  await r.fulfill({contentType:'application/javascript',body:'const style=document.createElement("style");style.textContent='+JSON.stringify(css)+';document.head.append(style);'});
 });
 await page.route(/https:\\/\\/(cdn.jsdelivr.net\\/npm|unpkg.com)\\/three@0.164.1\\//,r=>r.fulfill({path:path.join(root,'node_modules/three',r.request().url().split('three@0.164.1/')[1]),contentType:'text/javascript'}));
 await page.route('**/firebase-database.js'`);
source=source.replace("await page.waitForFunction(()=>window.__rejoinQA,{timeout:90000});", "await page.waitForFunction(()=>window.__rejoinQA,null,{timeout:30000});const mobile=await page.evaluate(()=>window.__mobileQA());assert(mobile.mobile);assert.equal(mobile.target,30);assert(mobile.ratio<=1);console.log('PASS actual mobile startup at 30 FPS policy and bounded pixel ratio',mobile);");
source=source.slice(0,source.indexOf(" for(const mode of ["))+" await page.evaluate(()=>__rejoinQA.load('3d'));await page.waitForTimeout(300);\n"+source.slice(source.indexOf(" console.log('ERRORS',errors);"));

source=source.replace("viewport:{width:844,height:390},isMobile:true,hasTouch:true", "viewport:{width:1366,height:768},isMobile:false,hasTouch:false");
source=source.replace("assert(mobile.mobile);assert.equal(mobile.target,30);assert(mobile.ratio<=1)", "assert(!mobile.mobile);assert.equal(mobile.target,60)");
source=source.replace("console.log('ERRORS',errors);", `
await page.evaluate(()=>__phoneQA.bot());await page.waitForTimeout(600);const bot=await page.evaluate(()=>__phoneQA.botState());assert(Math.abs(bot.yaw+Math.PI/2)<.01);console.log('PASS desktop received bot facing reaches actual 3D avatar',bot);
const camera=await page.evaluate(()=>__phoneQA.cameraState());assert(!camera.phone);assert(Math.abs(camera.zoom-1.17)<.001);assert(Math.abs(camera.fov-53)<.001);console.log('PASS desktop keeps its original world projection',camera);
console.log('ERRORS',errors);`);
source=source.replace("PASS actual mobile startup at 30 FPS policy and bounded pixel ratio","PASS actual desktop startup at 60 FPS policy").replace("PASS actual entry/reconciliation, current position/identity, centered avatar, old disconnect race, hidden host warnings","PASS desktop bot rendering and camera projection");
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(path.dirname(filename));runner._compile(source,filename);
