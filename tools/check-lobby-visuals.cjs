const fs=require('node:fs'),assert=require('node:assert/strict');
const {build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({stdin:{contents:"import * as THREE from 'three';import {createGachaUI} from './gacha-ui.js';import {GACHA_CATALOG} from './gacha-catalog.js';import {createLobbyAction3D} from './lobby-action-3d.js';export {THREE,createGachaUI,GACHA_CATALOG,createLobbyAction3D};",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'QA',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:480,height:480},hasTouch:true,isMobile:true,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://127.0.0.1/visual-fixture',route=>route.fulfill({body:'<!doctype html>',contentType:'text/html'}));await page.goto('http://127.0.0.1/visual-fixture');
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}.hidden,[hidden]{display:none!important}</style>');
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.addScriptTag({content:fs.readFileSync('assets-source/lobby-games-scene.js','utf8')});
  const ball=await page.evaluate(()=>{
   const T=QA.THREE,scene=new T.Scene();scene.background=new T.Color('#162a37');
   scene.add(new T.HemisphereLight(0xe0f4ff,0x183b28,2));const light=new T.DirectionalLight(0xfff1d9,3);light.position.set(-2,4,3);scene.add(light);
   const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(480,480);renderer.setPixelRatio(1);document.body.append(renderer.domElement);
   const camera=new T.PerspectiveCamera(35,1,.1,10);camera.position.set(.9,.68,1.1);camera.lookAt(0,.28,0);
   const ball=createLobbySoccerBall(T);ball.position.y=.3;ball.rotation.set(.2,.4,.1);scene.add(ball);
   const floor=new T.Mesh(new T.PlaneGeometry(10,10),new T.MeshStandardMaterial({color:'#265d48',roughness:1}));floor.rotation.x=-Math.PI/2;scene.add(floor);
   renderer.render(scene,camera);window.ballRenderer=renderer;
   return {radius:ball.geometry.parameters.radius,triangles:ball.children[0].geometry.getAttribute('position').count/3,verticesFinite:Array.from(ball.children[0].geometry.getAttribute('position').array).every(Number.isFinite)};
  });
  assert(ball.verticesFinite&&ball.triangles===2880&&ball.radius<.3);
  if(process.env.VISUAL_SHOTS)await page.screenshot({path:process.env.VISUAL_SHOTS+'/soccer-ball.png'});
  await page.evaluate(()=>{ballRenderer.dispose();ballRenderer.forceContextLoss();ballRenderer.domElement.remove();});
  await page.addStyleTag({content:fs.readFileSync('session-ui.css','utf8')+fs.readFileSync('lobby-games.css','utf8')});
  await page.evaluate(()=>{
   document.body.dataset.phase='lobby';const button=document.createElement('button');button.id='lobbyMiniGameToggle';button.textContent='遊び';document.body.append(button);
   window.hud=QA.createLobbyAction3D({THREE:QA.THREE,button,kind:'games',isActive:()=>true,isObscured:()=>false});const tick=t=>{hud.draw(t);window.hudFrame=requestAnimationFrame(tick);};window.hudFrame=requestAnimationFrame(tick);
  });
  for(const [width,height]of [[768,1024],[1024,768]]){
   await page.setViewportSize({width,height});await page.waitForFunction(()=>hud.getStats().active&&hud.getStats().visible[0]?.icon==='games');await page.waitForTimeout(100);
   const rect=await page.locator('#lobbyMiniGameToggle').boundingBox(),canvas=await page.locator('.lobbyActionCanvas').boundingBox();
   assert(Math.abs(canvas.x-rect.x+4)<1&&Math.abs(canvas.y-rect.y+4)<1,'3D button follows DOM after rotation');
  }
  if(process.env.VISUAL_SHOTS){const r=await page.locator('.lobbyActionCanvas').boundingBox();await page.screenshot({path:process.env.VISUAL_SHOTS+'/play-button.png',clip:r});}
  await page.evaluate(()=>{cancelAnimationFrame(hudFrame);hud.dispose();document.getElementById('lobbyMiniGameToggle').remove();delete document.body.dataset.phase;});
  console.log('PASS rounded 32-panel ball and shared 3D gamepad button after iPad rotation');
  await page.addStyleTag({content:fs.readFileSync('gacha-ui.css','utf8').replace(/env\(safe-area-inset-(left|right)\)/g,'var(--qa-notch,0px)')});
  await page.evaluate(async()=>{
   const T={...QA.THREE,WebGLRenderer:class extends QA.THREE.WebGLRenderer{constructor(...args){super(...args);const render=this.render.bind(this);this.render=(scene,camera)=>{if(camera.isOrthographicCamera)window.drawButtons=scene.children.filter(x=>x.isGroup&&x.visible).length;render(scene,camera);};}}};
   window.gacha=QA.createGachaUI(T,{canOpen:()=>true,wallet:async()=>({tickets:100,premium:100,owned:{}}),draw:({count})=>new Promise((resolve,reject)=>{window.finishDraw=()=>{const item=QA.GACHA_CATALOG.find(x=>x.category===0&&x.rarity===0);resolve({wallet:{tickets:90,premium:100,owned:{}},items:Array(count).fill(item)});};window.failDraw=()=>reject(new Error('通信テスト'));}),equip:async()=>{}});
   await gacha.open('normal');
  });
  for(const [width,height]of [[390,844],[844,390],[768,1024],[1024,768]]){
   await page.setViewportSize({width,height});await page.evaluate(landscape=>document.documentElement.style.setProperty('--qa-notch',landscape?'44px':'0px'),width>height);
   const bounds=await page.locator('.gachaToolbar').boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
   const left=await page.locator('.gachaCollectionToggle').boundingBox(),right=await page.locator('.gachaClose').boundingBox();assert(left.x>=bounds.x&&right.x+right.width<=bounds.x+bounds.width+1&&left.x+left.width<right.x);
  }
  for(const count of [1,10]){
   await page.waitForFunction(()=>window.drawButtons===2);await page.locator(count===1?'.gachaDraw':'.gachaPullTen').click();
   await page.waitForFunction(()=>window.drawButtons===0);assert(await page.locator('.gachaDraw').isHidden(),'hide while awaiting draw response');
   await page.evaluate(()=>finishDraw());await page.locator('.gachaPlanetTap').waitFor({state:'visible'});await page.locator('.gachaPlanetTap').click();
   await page.locator('.gachaResult').waitFor({state:'visible'});assert(await page.locator('.gachaDraw').isHidden());assert.equal(await page.evaluate(()=>drawButtons),0);
   await page.locator(count===1?'.gachaResultBack':'.gachaBatchClose').click();await page.waitForFunction(()=>drawButtons===2);
  }
  await page.locator('.gachaDraw').click();await page.waitForFunction(()=>drawButtons===0);await page.evaluate(()=>failDraw());await page.waitForFunction(()=>drawButtons===2);assert(await page.locator('.gachaDraw').isVisible(),'failure restores retry control');
  await page.evaluate(()=>gacha.dispose());assert.deepEqual(errors,[]);
  console.log('PASS gacha controls hidden from request through reveal/results, restored on return/error, toolbar fits rotations and safe insets');
  await page.close();
  const vp=await browser.newPage();await vp.setContent('<div id="view" style="position:fixed;inset:0"></div>');
  await vp.addScriptTag({content:fs.readFileSync('game-viewport.js','utf8').replace('export ','')});
  await vp.evaluate(()=>{window.mockVisible=Object.assign(new EventTarget(),{width:800,height:600,offsetLeft:0,offsetTop:0,scale:1});Object.defineProperty(window,'visualViewport',{value:mockVisible,configurable:true});window.resizes=0;window.disposeViewport=installGameViewportSync({viewport:document.getElementById('view'),resize:()=>resizes++});});
  await vp.waitForFunction(()=>resizes>0);const count=await vp.evaluate(()=>resizes);
  await vp.evaluate(()=>{mockVisible.offsetTop=20;mockVisible.dispatchEvent(new Event('scroll'));});await vp.waitForFunction(n=>resizes>n,count);
  await vp.clock.install();const before=await vp.evaluate(()=>{window.dispatchEvent(new Event('orientationchange'));return resizes;});await vp.clock.runFor(800);assert(await vp.evaluate(n=>resizes>=n+3,before));
  const disposed=await vp.evaluate(()=>{disposeViewport();return resizes;});await vp.clock.runFor(1000);assert.equal(await vp.evaluate(()=>resizes),disposed);
  console.log('PASS visual viewport changes resynchronize fixed HUD; late rotation reconciliation and cleanup');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
