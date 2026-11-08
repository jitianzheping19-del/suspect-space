const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({stdin:{contents:`import {AIRSHIP_TASK_INTERACTIONS as tasks} from './airship-tasks.js';import {createAirshipTaskRun} from './airship-task-rules.js';import {createAirshipTaskMachine} from './airship-task-machine.js';window.tasks=tasks;let machine;window.openTask=i=>{machine?.dispose();window.run=createAirshipTaskRun(tasks[i],()=>window.completed++,()=>.42);window.completed=0;machine=createAirshipTaskMachine(document.querySelector('main'),run);};openTask(0);`,resolveDir:process.cwd()},bundle:true,write:false,outfile:'fixture.js',format:'iife'});
 const html='<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#09141c}main{width:100vw;height:100dvh;max-width:800px;margin:auto}</style><link rel="stylesheet" href="/fixture.css"><main></main><script src="/fixture.js"></script>';
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}const css=req.url.endsWith('.css');res.setHeader('Content-Type',css?'text/css':'text/javascript');res.end(bundle.outputFiles.find(f=>f.path.endsWith(css?'.css':'.js')).text);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({args:['--no-sandbox']});fs.mkdirSync('tmp/airship-tasks',{recursive:true});
 try{const page=await browser.newPage({viewport:{width:780,height:620},hasTouch:true}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE',e.message)});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.openTask,{},{timeout:10000});
 const press=async(a,v)=>page.locator(`[data-action="${a}"]${v===undefined?'':`[data-value="${v}"]`}`).click();const slide=async(a,v)=>page.locator(`[data-range="${a}"]`).fill(String(v));
 for(let i=0;i<19;i++){await page.evaluate(i=>openTask(i),i);const s=await page.evaluate(()=>run.state),mode=await page.evaluate(()=>run.mode);await page.screenshot({path:'tmp/airship-tasks/'+mode+'.png'});
 switch(mode){
 case 'polish':for(let j=0;j<6;j++)for(let n=0;n<5;n++)await press('rub',j);break;
 case 'identity':for(const n of s.code)await press('digit',n);await press('confirm');break;
 case 'records':case 'freight':for(const n of s.order)await press('choose',n);break;
 case 'loom':case 'armory':for(let n=0;n<4;n++){await press('select',n);await press('place',s.order.indexOf(n));}break;
 case 'safe':for(let n=0;n<3;n++){await slide('turn',n===1?9:0);await slide('turn',s.code[n]);await press('confirm');}break;
 case 'refuel':await press('connect');await page.locator('[data-action=hold]').focus();await page.keyboard.down('Space');await page.waitForFunction(()=>run.state.finished);await page.keyboard.up('Space');break;
 case 'supplies':for(let n=0;n<3;n++)for(let j=0;j<s.target[n];j++)await press('stock',n);break;
 case 'voltage':for(let n=0;n<3;n++){await press('probe',n);await press('record',s.volts[n]>=22&&s.volts[n]<=26?'normal':'fault');}break;
 case 'shower':for(let n=0;n<3;n++){await press('select',n);await slide('turn',s.targets[n]);await press('confirm');}break;
 case 'pump':for(let n=0;n<6;n++){await press('pump',1);await press('pump',0);}break;
 case 'attitude':await slide('axis0',0);await slide('axis1',0);await page.waitForFunction(()=>run.state.finished);break;
 case 'uplink':await slide('axis0',s.target[0]);await slide('axis1',s.target[1]);await press('transmit');await page.waitForFunction(()=>run.state.finished);break;
 case 'burger':for(const n of s.order)await press('ingredient',n);break;
 case 'breakers':for(let n=1;n<=5;n++)await press('breaker',s.order.indexOf(n));break;
 case 'medical':await press('scan');await page.waitForFunction(()=>run.state.scanned);await press('patient',s.patient);await press('stamp');break;
 case 'surveillance':await press('camera',s.anomaly);await press('report');break;
 case 'routing':for(let n=0;n<9;n++)for(let j=0;j<3;j++)await press('rotate',n);await press('test');break;
 }
 assert.equal(await page.evaluate(()=>completed),1,mode);assert.match(await page.locator('footer').innerText(),/作業完了/);assert.equal(await page.locator('button:not(:disabled)').count(),0);console.log('PASS browser completion',mode);
 }
 for(const size of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1024,height:768}]){await page.setViewportSize(size);for(let i=0;i<19;i++){await page.evaluate(i=>openTask(i),i);const layout=await page.locator('.airTask').evaluate(root=>({overflow:root.scrollWidth>root.clientWidth,boardOverflow:root.querySelector('.airWorkspace').scrollWidth>root.querySelector('.airWorkspace').clientWidth+1,buttons:[...root.querySelectorAll('button')].map(b=>{const r=b.getBoundingClientRect();return {w:r.width,h:r.height};})}));assert(!layout.overflow&&!layout.boardOverflow,JSON.stringify({size,i,layout}));assert(layout.buttons.every(b=>b.h>=44),JSON.stringify({size,i,layout}));if(i===1||i===4||i===13)await page.screenshot({path:`tmp/airship-tasks/${i}-${size.width}.png`});}}
 assert.deepEqual(errors,[]);console.log('PASS 19 distinct task screens, all actual UI completion, minimum controls and contained layouts at four sizes');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
