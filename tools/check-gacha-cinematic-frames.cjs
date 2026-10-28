const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out='/workspace/artifacts/premium-complete-2026-10-28';
const fixture=`<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:radial-gradient(ellipse at 50% 48%,#372347,#11101f 55%,#040710)}#host,canvas{position:absolute;inset:0;width:100%;height:100%}button{position:absolute;bottom:26px;right:24px;width:150px;height:60px;background:none;border:0;color:transparent}#one{right:190px}</style><section id="host" data-view="draw"><canvas></canvas><button id="one">1連</button><button id="ten">10連</button></section><script type="module">
import * as T from '/__three.js';import {createGachaPlanetScene} from '/gacha-planet-scene.js';
let time=1000,nextFrame=null,progress=null,resolved=false;performance.now=()=>time;window.requestAnimationFrame=fn=>(nextFrame=fn,1);window.cancelAnimationFrame=()=>nextFrame=null;
let active;
window.__cinematic={start(premium){active?.dispose();time=1000;resolved=false;const old=document.querySelector('canvas'),canvas=old.cloneNode();old.replaceWith(canvas);active=createGachaPlanetScene(T,{canvas,host:document.querySelector('#host'),oneButton:document.querySelector('#one'),tenButton:document.querySelector('#ten'),premium,onProgress:p=>{progress=p;}});this.step(1034);},step(ms){time=ms;const fn=nextFrame;nextFrame=null;fn?.(time);},tap(ms){time=ms;active.tap();this.step(ms+34);},reveal(){active.reveal(4,{items:[{id:'chronokeeper',category:5,rarity:4}]}).then(()=>resolved=true);},state(){return {progress,resolved};},dispose(){active.dispose();return nextFrame===null;}};
window.__cinematic.start(true);
</script>`;
(async()=>{
 const server=require('node:http').createServer((req,res)=>{const url=new URL(req.url,'http://localhost').pathname;if(url==='/'){res.setHeader('Content-Type','text/html');res.end(fixture);return;}const file=url==='/__three.js'?'/workspace/emergency-3d-revision/three.module.js':path.join(root,url);if(!fs.existsSync(file)||(!file.startsWith(root+'/')&&url!=='/__three.js')){res.writeHead(404).end();return;}res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(file));});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text());});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__cinematic);
  for(const [width,height]of[[390,844],[844,390],[1366,768]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>window.__cinematic.start(true));await page.screenshot({path:out+'/cinematic-idle-'+width+'.png'});
   await page.evaluate(()=>{const s=window.__cinematic;s.reveal();for(const t of[1500,2000,2500,3000])s.tap(t);s.step(3200);});await page.screenshot({path:out+'/cinematic-charge-'+width+'.png'});
   await page.evaluate(()=>{const s=window.__cinematic;s.tap(3500);s.step(5200);});assert.equal((await page.evaluate(()=>window.__cinematic.state())).progress.mode,'breaking');await page.screenshot({path:out+'/cinematic-break-'+width+'.png'});
   await page.evaluate(()=>window.__cinematic.step(5950));await page.screenshot({path:out+'/cinematic-hero-'+width+'.png'});
   await page.evaluate(()=>window.__cinematic.step(7150));assert((await page.evaluate(()=>window.__cinematic.state())).resolved);assert(await page.evaluate(()=>window.__cinematic.dispose()));
  }
  await page.evaluate(()=>{const s=window.__cinematic;s.start(false);s.reveal();for(const t of[1500,2000,2500,3000,3500])s.tap(t);s.step(4700);});await page.screenshot({path:out+'/cinematic-normal.png'});await page.evaluate(()=>window.__cinematic.dispose());assert.deepEqual(errors,[]);console.log('PASS deterministic premium idle/charge/break/actual tailored award and normal opening, three viewports, completion and RAF cleanup');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
