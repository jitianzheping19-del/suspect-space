const fs=require('fs'),assert=require('assert/strict'),{chromium}=require('playwright'),{build}=require('esbuild');
const root=require('path').resolve(__dirname,'..');
(async()=>{
 const output=await build({stdin:{contents:`import * as THREE from 'three';import {createMeetingIntroPresentation} from './meeting-intro-presentation.js';import {createLobbyGamePreloader} from './lobby-game-preload.js';window.api={THREE,createMeetingIntroPresentation,createLobbyGamePreloader};`,resolveDir:root},bundle:true,write:false,format:'iife',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{const p=await browser.newPage({viewport:{width:844,height:390},isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui,sans-serif;color:white}.overlay{position:fixed;inset:0;display:grid;place-items:center}.effectCard{text-align:center}h2,p{margin:0}</style><section id="meetingIntro" class="overlay meetingIntro" data-kind="emergency"><div id="host" class="effectCard"><h2 id="meetingIntroTitle">緊急集合</h2><p class="effectSub">アストラが緊急会議を招集</p></div></section>');await p.addStyleTag({path:require('path').join(root,'meeting-intro-presentation.css')});await p.addScriptTag({content:output.outputFiles[0].text});
 await p.evaluate(()=>{
 const {THREE,createMeetingIntroPresentation}=api;window.actors=[];let renderers=0;const T={...THREE,WebGLRenderer:class extends THREE.WebGLRenderer{constructor(o){super(o);renderers++;window.gpu=this;const draw=this.render.bind(this);this.render=(s,c)=>{window.lastScene=s;window.lastCamera=c;draw(s,c)};}}};
 window.rendererCount=()=>renderers;window.frameTime=0;window.ticks=new Map();let id=0;performance.now=()=>window.frameTime;window.requestAnimationFrame=fn=>{ticks.set(++id,fn);return id};window.cancelAnimationFrame=id=>ticks.delete(id);
 const crew=p=>{const group=new THREE.Group(),suit=new THREE.MeshStandardMaterial({color:p.hue>.3?0x55c5d5:0xe4a848});group.userData.suit=suit;const body=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.55,6,16),suit);body.position.y=.85;group.add(body);const visor=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),new THREE.MeshStandardMaterial({color:0xbbeaff}));visor.position.set(0,1.1,.28);group.add(visor);group.userData.arms=[-1,1].map(side=>{const arm=new THREE.Group();arm.position.set(side*.36,1.08,.02);const segment=new THREE.Mesh(new THREE.CapsuleGeometry(.105,.30,5,10),suit);segment.position.y=-.04;arm.add(segment);group.add(arm);return arm});group.userData.legs=[];actors.push(group);return group;};
 window.presentation=createMeetingIntroPresentation(T,{host:document.getElementById('host'),createCrew:crew,disposeCrew:g=>g.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})});
 window.impacts=[];addEventListener('spacesuspect:meeting-intro-impact',event=>impacts.push(event.detail));window.options={reporter:{name:'レモン',hue:.5},body:{name:'クルー',hue:.1},report:false};
 window.step=ms=>{frameTime=ms;const work=[...ticks.values()];ticks.clear();work.forEach(fn=>fn(ms));};
 });
 const path=require('path'),out=path.join(root,'tmp/meeting-intro-review');fs.mkdirSync(out,{recursive:true});
 for(const size of [{width:844,height:390},{width:390,height:844},{width:1366,height:768}]){
  await p.setViewportSize(size);
  for(const report of [false,true]){
   await p.evaluate(report=>{const overlay=document.querySelector('#meetingIntro');overlay.dataset.kind=report?'body':'emergency';document.querySelector('#meetingIntroTitle').textContent=report?'死体通報':'緊急集合';document.querySelector('.effectSub').textContent=report?'アストラがレモンを発見':'アストラが緊急会議を招集';presentation.play({...options,report,reporter:{name:'アストラ',hue:.5},body:{name:'レモン',hue:.1},elapsed:1350});step(frameTime+1);},report);
   await p.screenshot({path:path.join(out,'stage-'+(report?'report':'emergency')+'-'+size.width+'.png')});
   const bounds=await p.locator('#host').boundingBox();assert(bounds.y>=0&&bounds.y+bounds.height<=size.height+1);
   await p.evaluate(()=>presentation.stop());
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS cinematic composition at landscape, portrait, desktop');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
