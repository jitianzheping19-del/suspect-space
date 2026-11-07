// Use the real input handlers, modal manager and renderer with the isolated room fixture.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.resolve(__dirname,'check-sabotage-input.cjs');
let source=fs.readFileSync(filename,'utf8');
const probe=`window.__inputQualityQA={
 prepare(){window.__sabotageQA.prepare();renderContextLost=true;cancelAnimationFrame(frameRequestId);applyCameraPerspective('first',false);},
 state(){return{look:touchLookPointer,yaw:touchLookYaw,pitch:touchLookPitch,orbit:touchOrbitYaw,points:viewportTouchPoints.size,zoom:manualCameraZoom,vector:{...joystick}};},
 quality(value){setRenderPreset(value);return{preset:renderPreset,ratio:renderer.getPixelRatio(),width:renderer.domElement.width,height:renderer.domElement.height,shadows:renderer.shadowMap.enabled,stored:localStorage.getItem(RENDER_PRESET_KEY),framePreset:window.__spaceRenderQuality.preset};},
 clear(){resetInput();}
};
`;
source=source.replace('window.__sabotageQA={',probe+'window.__sabotageQA={');
const begin=source.indexOf('  for(const options of'),end=source.indexOf('  assert.deepEqual(errors,[]);',begin);
if(begin<0||end<0)throw Error('Room fixture changed');
const checks=`
  await page.evaluate(()=>__inputQualityQA.prepare());await page.waitForTimeout(300);
  const cdp=await page.context().newCDPSession(page);
  const center=async selector=>{const r=await page.locator(selector).boundingBox();return{x:r.x+r.width/2,y:r.y+r.height/2};};
  const send=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:touchPoints.map(p=>({...p,radiusX:1,radiusY:1,force:1}))});
  const state=()=>page.evaluate(()=>__inputQualityQA.state());
  const stick={...await center('#stick'),id:1};stick.x+=25;
  const camera=await page.evaluate(()=>{for(const y of [180,220,150])for(const x of [560,620,480])if(document.elementFromPoint(x,y)===document.querySelector('#viewport>canvas'))return{x,y,id:2};throw Error('No clear camera point');});
  await send('touchStart',[stick]);await send('touchStart',[stick,camera]);
  const before=await state();assert(before.look!==null);assert(Math.hypot(before.vector.x,before.vector.z)>.1);assert.equal(before.points,1,'UI touch must not enter camera pinch tracking');
  camera.x+=45;camera.y+=10;await send('touchMove',[stick,camera]);
  const moved=await state();assert.notEqual(moved.yaw,before.yaw);assert(Math.hypot(moved.vector.x,moved.vector.z)>.1);
  await send('touchEnd',[camera]);assert.equal((await state()).look,null);assert(Math.hypot((await state()).vector.x,(await state()).vector.z)>.1);
  await send('touchEnd',[]);assert.equal((await state()).vector.x,0);assert.equal((await state()).points,0);
  await send('touchStart',[stick]);await send('touchStart',[stick,camera]);await send('touchEnd',[stick]);
  const cameraHeld=await state();assert(cameraHeld.look!==null);assert.equal(cameraHeld.vector.x,0);camera.x+=15;await send('touchMove',[camera]);assert.notEqual((await state()).yaw,cameraHeld.yaw);await send('touchEnd',[]);
  console.log('PASS joystick and camera use independent fingers; lifting one preserves the other; UI never enters pinch tracking');

  await send('touchStart',[camera]);assert((await state()).look!==null);
  const settings={...await center('#titleInputSettingsBtn'),id:3};
  await send('touchStart',[camera,settings]);await send('touchEnd',[settings]);
  await page.locator('#inputSettingsDialog').waitFor({state:'visible'});await page.waitForFunction(()=>__inputQualityQA.state().look===null);
  const opened=await state();assert.equal(opened.points,0);assert.equal(opened.vector.x,0);
  camera.x+=30;await send('touchMove',[camera]);const blocked=await state();assert.equal(blocked.yaw,opened.yaw);assert.equal(blocked.zoom,opened.zoom);
  await send('touchEnd',[]);await page.locator('#inputSettingsClose').tap();
  await page.locator('#inputSettingsDialog').waitFor({state:'hidden'});
  await send('touchStart',[camera]);const resumed=await state();camera.x+=20;await send('touchMove',[camera]);assert.notEqual((await state()).yaw,resumed.yaw);await send('touchEnd',[]);
  console.log('PASS opening settings cancels held camera and pinch input; old fingers cannot move the background; closing restores new gestures');

  const high=await page.evaluate(()=>__inputQualityQA.quality('high'));
  const low=await page.evaluate(()=>__inputQualityQA.quality('ultralow'));
  assert(low.ratio<high.ratio);assert(low.width<high.width&&low.height<high.height);assert(!low.shadows);assert.equal(low.stored,'ultralow');assert.equal(low.framePreset,'ultralow');
  const restored=await page.evaluate(()=>__inputQualityQA.quality('high'));assert.equal(restored.ratio,high.ratio);assert.equal(restored.width,high.width);assert(restored.shadows);assert.equal(restored.framePreset,'high');
  console.log('PASS quality changes real renderer resolution and shadows, persists the choice and restores high quality', {high,low,restored});
`;
source=source.slice(0,begin)+checks+source.slice(end);
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(source,filename);
