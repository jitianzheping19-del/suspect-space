const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({stdin:{contents:`import {createSkeldTaskRun} from './skeld-task-rules.js';import {createSkeldTaskMachine} from './skeld-task-machine.js';window.openTask=mode=>{window.machine?.dispose();window.completed=0;window.run=createSkeldTaskRun({id:mode,mode},()=>completed++);window.machine=createSkeldTaskMachine(document.querySelector('#stage'),run);};`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
 const browser=await chromium.launch({args:['--no-sandbox']});try{
 const page=await browser.newPage({hasTouch:true,viewport:{width:844,height:390}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}#stage{position:absolute;inset:8px}</style><div id="stage"></div>');await page.addScriptTag({content:bundle.outputFiles[0].text});fs.mkdirSync('tmp/skeld-task-input',{recursive:true});
 for(const size of [{width:844,height:390},{width:390,height:844}]){await page.setViewportSize(size);for(const mode of ['garbage','asteroids','prime-shields','steering','reactor-memory']){
 await page.evaluate(mode=>openTask(mode),mode);
 if(mode==='garbage'){const box=await page.locator('.skLever').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(2800);await page.mouse.up();}
 if(mode==='asteroids'){for(let n=0;n<20;n++){const box=await page.locator('.skRock').first().boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}}
 if(mode==='prime-shields'){while(await page.locator('.skShield[data-done=false]').count())await page.locator('.skShield[data-done=false]').first().tap();}
 if(mode==='steering'){const box=await page.locator('.skSteering').boundingBox();await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
 if(mode==='reactor-memory'){
 assert.equal(await page.locator('.skMemoryBank').count(),1);assert.equal(await page.locator('.skMemoryBank button').count(),9);assert.equal(await page.locator('.skLamp').count(),0);
 await page.evaluate(()=>{window.litLog=[];let previous='';window.memoryObserver=new MutationObserver(()=>{const lit=document.querySelector('.skMemoryBank button[data-lit=true]');const value=lit?.dataset.value||'';if(value!==previous&&value!=='')litLog.push(value);previous=value;});memoryObserver.observe(document.querySelector('.skMemoryBank'),{attributes:true,subtree:true});});
 for(let round=1;round<=5;round++){await page.waitForFunction(()=>document.querySelector('.skMemoryBank button:not(:disabled)'),{},{timeout:15000});const sequence=await page.evaluate(()=>litLog.splice(0));assert.equal(sequence.length,round);for(const value of sequence)await page.locator('.skMemoryBank button[data-value="'+value+'"]').tap();}
 await page.evaluate(()=>memoryObserver.disconnect());
 }
 await page.waitForFunction(()=>completed===1,{},{timeout:12000});assert.equal(await page.locator('.skTaskStatus').textContent(),'タスク完了');await page.screenshot({path:'tmp/skeld-task-input/'+size.width+'-'+mode+'.png'});console.log('PASS actual input',size.width,mode);
 }}assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
