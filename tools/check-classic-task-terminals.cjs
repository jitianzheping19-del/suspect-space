// Real srcdoc task renderer, shared parent runtime, and projected pointer input.
// No Firebase connection. GPU drawing pauses during timed gestures so software
// rendering cannot turn a 500 ms card swipe into a multi-second swipe.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.TASK_QA_OUT||path.join(root,'tmp/classic-task-terminals');
const base=process.env.TASK_QA_BASE||'http://127.0.0.1:4173/suspect-space/';
fs.mkdirSync(out,{recursive:true});
const probes=`
window.__classicQA={
 state(){return{focus,id:hostRunId,active:hostActive,done:terms[focus]?.tk.done,details:terms[focus]?.tk.inspect?.(),screen:terms[focus]?.scr.getWorldPosition(new THREE.Vector3()).project(camera).toArray(),arrayCompatible:P.pos instanceof parent.Float32Array}},
 point(x,y){const p=terms[focus].scr.localToWorld(new THREE.Vector3((x/W-.5)*2.4,(.5-y/H)*1.8,0)).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}},
};
`;
const inspectors={
 '配線の修理':'({order,conn,drag})','データ転送':'({p,run})','コード入力':'({code,inp})',
 'キャリブレーション':'({ang,zone,stage,hold,dragging})','医療スキャン':'({p,holding})',
 'カードスワイプ':'({x,dragging,feedback})','燃料補給':'({levels})',
};
const harness=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/"}}</script><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body><iframe id="terminal" title="Task QA"></iframe><script type="module">
import {createTaskTerminalDocument} from './task-terminal-document.js';
let source=await createTaskTerminalDocument();
for(const [name,inspect]of Object.entries(${JSON.stringify(inspectors)}))source=source.replace('name:'+JSON.stringify(name),'inspect:()=>'+inspect+',name:'+JSON.stringify(name));
source=source.replace('composer.render();})();','if(!window.__qaSkipRender)composer.render();})();').replace('renderer.compile(scene,camera);',${JSON.stringify(probes)}+'renderer.setPixelRatio(.7);composer.setPixelRatio(.7);renderer.shadowMap.enabled=false;renderer.compile(scene,camera);');
const frame=document.getElementById('terminal');let serial=0;window.__terminalQA={ready:false,done:[],open(index){const id='qa-'+(++serial);frame.contentWindow.postMessage({type:'ss-task-terminal-open',id,index,name:'Task QA',volume:0},'*');return id;},close(){frame.contentWindow.postMessage({type:'ss-task-terminal-close',id:frame.contentWindow.__classicQA.state().id},'*')}};
addEventListener('message',e=>{if(e.source!==frame.contentWindow)return;if(e.data?.type==='ss-task-terminal-init')window.__terminalQA.ready=true;if(e.data?.type==='ss-task-terminal-done')window.__terminalQA.done.push(e.data.id);});frame.srcdoc=source;
</script></body></html>`;
(async()=>{
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});const results=[];
try{for(const touch of [false,true]){
 if(process.env.TASK_QA_TOUCH&&String(touch)!==process.env.TASK_QA_TOUCH)continue;
 const page=await browser.newPage({viewport:touch?{width:844,height:390}:{width:1280,height:800},hasTouch:touch,isMobile:touch}),errors=[];
 page.on('pageerror',e=>errors.push(e.message.slice(0,250)));
 await page.route('**/classic-task-qa.html',r=>r.fulfill({body:harness,contentType:'text/html'}));
 await page.goto(base+'classic-task-qa.html');await page.waitForFunction(()=>window.__terminalQA?.ready,{},{timeout:90000});
 const frame=await(await page.locator('#terminal').elementHandle()).contentFrame(),cdp=await page.context().newCDPSession(page);
 const state=()=>frame.evaluate(()=>window.__classicQA.state());
 const point=(x,y)=>frame.evaluate(({x,y})=>window.__classicQA.point(x,y),{x,y});
 const down=async(x,y)=>{const p=await point(x,y);if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p,id:1}]});else{await page.mouse.move(p.x,p.y);await page.mouse.down();}};
 const move=async(x,y)=>{const p=await point(x,y);if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p,id:1}]});else await page.mouse.move(p.x,p.y);};
 const up=async()=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();};
 const tap=async(x,y)=>{await down(x,y);await up();};
 const wait=async(predicate)=>{await frame.waitForFunction(predicate,{},{timeout:20000});};
 for(let index=0;index<7;index++){
  if(process.env.TASK_QA_INDEX&&!process.env.TASK_QA_INDEX.split(',').includes(String(index)))continue;
  const id=await page.evaluate(index=>window.__terminalQA.open(index),index);
  await frame.waitForFunction(id=>window.__classicQA?.state().id===id,id,{timeout:20000});
  await frame.evaluate(()=>window.__qaSkipRender=false);await page.waitForTimeout(300);
  const initial=await state();assert(initial.active&&!initial.done&&initial.arrayCompatible);assert(Math.abs(initial.screen[0])<.1&&Math.abs(initial.screen[1])<.1);
  await page.screenshot({path:path.join(out,`${touch?'phone':'desktop'}-${index}.png`)});
  await frame.evaluate(()=>window.__qaSkipRender=true);
  if(index===0){const {order}=initial.details;await down(62,112);await move(450,112+order.indexOf(1)*62);await up();assert.equal((await state()).details.conn[0],-1,'Wrong wire accepted');for(let i=0;i<4;i++){await down(62,112+i*62);await move(450,112+order.indexOf(i)*62);await up();}}
  if(index===1){await tap(256,318);assert((await state()).details.run);}
  if(index===2){await tap(166,199);await tap(166,349);assert.equal((await state()).details.inp,'');for(const digit of initial.details.code){const i=Number(digit)-1;await tap(166+i%3*86,199+Math.floor(i/3)*50);}}
  if(index===3){for(let stage=0;stage<3;stage++){const d=(await state()).details;const xy=a=>[256+Math.cos(a)*90,250+Math.sin(a)*90];await down(...xy(d.ang));for(let i=1;i<=10;i++)await move(...xy(d.ang+(d.zone-d.ang)*i/10));await up();await frame.waitForFunction(stage=>window.__classicQA.state().details.stage>stage,stage,{timeout:15000});}}
  if(index===4){await down(256,330);await wait(()=>window.__classicQA.state().done);await up();}
  if(index===5){await down(94,190);await move(160,190);await up();assert(!(await state()).done);assert((await state()).details.feedback.includes('右端'));await down(94,190);for(let i=1;i<=10;i++){await page.waitForTimeout(45);await move(94+316*i/10,190);}await up();}
  if(index===6){for(let row=0;row<3;row++)for(let i=0;i<10;i++)await tap(256,164+row*56);}
  await wait(()=>window.__classicQA.state().done);
  await page.waitForFunction(id=>window.__terminalQA.done.filter(v=>v===id).length===1,id,{timeout:5000});
  assert.deepEqual(errors,[]);results.push({touch,index,completed:true});console.log('PASS classic',touch?'touch':'mouse',index);
  await page.evaluate(()=>window.__terminalQA.close());await wait(()=>!window.__classicQA.state().active);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
 }
 // A new session must clear task completion and old drag state.
 await page.evaluate(()=>window.__terminalQA.open(5));await wait(()=>window.__classicQA.state().focus===5&&!window.__classicQA.state().done);assert(!(await state()).details.dragging);
 await page.close();
}}finally{await browser.close();}
console.log('PASS classic terminal cases:',results.length,'complete once, reopen cleanly');
})().catch(error=>{console.error(error);process.exitCode=1;});
