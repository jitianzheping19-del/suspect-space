const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright'),{build}=require('esbuild');
const root=require('path').resolve(__dirname,'..');
(async()=>{
 const output=await build({stdin:{contents:`import * as THREE from 'three';import {createMeetingIntroPresentation} from './meeting-intro-presentation.js';import {createLobbyGamePreloader} from './lobby-game-preload.js';window.api={THREE,createMeetingIntroPresentation,createLobbyGamePreloader};`,resolveDir:root},bundle:true,write:false,format:'iife',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{const p=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setContent('<div id="host" style="width:820px;height:360px;background:#102030"><p class="effectSub"></p></div>');await p.addScriptTag({content:output.outputFiles[0].text});
 await p.evaluate(()=>{
 const {THREE,createMeetingIntroPresentation}=api;window.actors=[];let renderers=0;const T={...THREE,WebGLRenderer:class extends THREE.WebGLRenderer{constructor(o){super(o);renderers++;window.gpu=this;const draw=this.render.bind(this);this.render=(s,c)=>{window.lastScene=s;draw(s,c)};}}};
 window.rendererCount=()=>renderers;window.frameTime=0;window.ticks=new Map();let id=0;performance.now=()=>window.frameTime;window.requestAnimationFrame=fn=>{ticks.set(++id,fn);return id};window.cancelAnimationFrame=id=>ticks.delete(id);
 const crew=p=>{const group=new THREE.Group(),suit=new THREE.MeshStandardMaterial({color:p.hue>.3?0x55c5d5:0xe4a848});group.userData.suit=suit;const body=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.55,6,16),suit);body.position.y=.85;group.add(body);const visor=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),new THREE.MeshStandardMaterial({color:0xbbeaff}));visor.position.set(0,1.1,.28);group.add(visor);group.userData.arms=[-1,1].map(side=>{const arm=new THREE.Group();arm.position.set(side*.36,1.08,.02);const segment=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.30,5,10),suit);segment.position.y=-.04;arm.add(segment);group.add(arm);return arm});group.userData.legs=[];actors.push(group);return group;};
 window.presentation=createMeetingIntroPresentation(T,{host:document.getElementById('host'),createCrew:crew,disposeCrew:g=>g.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})});
 window.options={reporter:{name:'レモン',hue:.5},body:{name:'クルー',hue:.1},report:false};
 window.step=ms=>{frameTime=ms;const work=[...ticks.values()];ticks.clear();work.forEach(fn=>fn(ms));};
 });
 await p.evaluate(async()=>{await presentation.prepare(options);await presentation.prepare({...options,report:true});await presentation.prepare(options);});
 assert.equal(await p.evaluate(()=>rendererCount()),1);assert.equal(await p.locator('canvas').count(),0);assert.equal(await p.evaluate(()=>ticks.size),0);
 await p.evaluate(()=>presentation.play(options));const poses=[];
 for(const ms of [40,450,700,850,920,1020,1300,1700]){
  const pose=await p.evaluate(ms=>{step(ms);const actor=actors.at(-1),hand=actor.userData.arms[1].children.at(-1),v=hand.getWorldPosition(new api.THREE.Vector3());const cap=lastScene.children.find(x=>x.geometry?.type==='CylinderGeometry'&&x.geometry.parameters.radiusTop===.46);return {ms,hand:v.toArray(),button:cap.position.y,actor:actor.position.toArray()};},ms);poses.push(pose);
  if(process.env.PHONE_SHOTS&&[700,920,1020].includes(ms))await p.screenshot({path:require('path').join(process.env.PHONE_SHOTS,`meeting-slam-${ms}.png`)});
 }
 assert(poses[2].hand[1]>2.3,'fist above head');assert(poses[2].hand[1]-poses[4].hand[1]>1.2,'fast downward stroke');assert(Math.abs(poses[4].hand[0]-.22)<.02,'fist over cap');assert(poses[5].button<.6,'button pressed');assert.equal(await p.evaluate(()=>rendererCount()),1);assert.equal(await p.locator('canvas').count(),1);
 await p.evaluate(()=>presentation.stop());
 const framePaths=await p.evaluate(()=>{
  const poses=[];
  for(const stepMs of [1000/30,1000/60,1000/120]){
   presentation.play(options);const start=frameTime;step(start);
   for(let t=stepMs;t<400;t+=stepMs)step(start+t);step(start+400);
   poses.push(actors.at(-1).userData.arms[1].children.at(-1).getWorldPosition(new api.THREE.Vector3()).toArray());presentation.stop();
  }
  return poses;
 });
 for(const pose of framePaths)for(let i=0;i<3;i++)assert(Math.abs(pose[i]-framePaths[0][i])<1e-6,'animation trajectory independent of frame history');
 console.log('PASS identical arm trajectory at 30, 60, and 120 Hz',JSON.stringify(framePaths));
 const memory=await p.evaluate(()=>{const rows=[];for(let i=0;i<25;i++){presentation.play({...options,report:i%2===0});step(frameTime+1000);presentation.stop();rows.push({...gpu.info.memory});}return rows;});
 assert.equal(memory.at(-1).geometries,memory[0].geometries);assert.equal(memory.at(-1).textures,memory[0].textures);console.log('PASS 25 repeated animations retain bounded GPU resources',memory.at(-1));
 await p.evaluate(()=>{step(3100);presentation.dispose()});assert.equal(await p.evaluate(()=>ticks.size),0);assert.equal(await p.locator('canvas').count(),0);
 console.log('PASS cached warmup, single renderer, overhead windup, downward contact, cap depression, cleanup');
 await p.evaluate(()=>{document.body.dataset.phase='lobby';window.jobs=[];window.preloader=api.createLobbyGamePreloader({tasks:[()=>new Promise(resolve=>jobs.push(resolve)),()=>Promise.resolve()]});});
 await p.waitForFunction(()=>jobs.length===1);assert.match(await p.locator('#lobbyGameDownload').innerText(),/0\/2/);
 await p.evaluate(()=>{document.body.dataset.phase='play'});await p.waitForTimeout(10);assert(await p.locator('#lobbyGameDownload').isHidden());await p.evaluate(()=>{document.body.dataset.phase='lobby';jobs.shift()()});await p.waitForFunction(()=>jobs.length===1);await p.evaluate(()=>jobs.shift()());await p.waitForFunction(()=>preloader.state().completed===2&&!preloader.state().running);assert.match(await p.locator('#lobbyGameDownload').innerText(),/準備完了/);await p.evaluate(()=>preloader.dispose());assert.equal(await p.locator('#lobbyGameDownload').count(),0);assert.deepEqual(errors,[]);console.log('PASS loading banner, cancellation, immediate lobby return, completion, cleanup');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
