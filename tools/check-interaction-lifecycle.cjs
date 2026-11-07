const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const root=process.cwd(),requests=[];
 const html=`<meta charset="utf-8"><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script><section data-settings-section="operation"></section><button id="abilityBtn" style="width:100px;height:60px">能力</button><script type="module">
 import * as THREE from 'three';import {createLazyGacha,createLazyPractice} from '/optional-features.js';import {installActionPreview} from '/interaction-feedback.js';
 window.available=true;window.count=0;window.selected=false;
 const selection=()=>window.selected;document.querySelector('#abilityBtn').onclick=()=>{window.count++;window.selected=true;};
 window.preview=installActionPreview({describe:()=>({label:'射程'}),active:()=>window.available,selectionOpen:selection,cancelSelection:()=>{window.selected=false;}});
 window.gacha=createLazyGacha(THREE,{uid:()=> 'local',canOpen:()=>window.available,wallet:async()=>({tickets:12,premium:2,owned:{}})});
 window.practice=createLazyPractice({available:()=>window.available,near:()=>true,tasks:()=>[{name:'配線',id:'t'}],roles:()=>[]});
 window.gacha.sync(true);window.practice.sync();window.ready=true;
 </script>`;
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');requests.push(url.pathname);if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}const css=file.endsWith('.css');res.setHeader('Content-Type','application/javascript');const source=fs.readFileSync(file,'utf8');res.end(css?`{const s=document.createElement('style');s.textContent=${JSON.stringify(source)};document.head.append(s);}`:source);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 try{const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());await page.goto(base);await page.waitForFunction(()=>window.ready);assert(!requests.some(p=>/\/(gacha-ui|practice-lab|selected-role-fx)\.js$/.test(p)));
  // Blur or app hiding must cancel both a hold and a target selection, even on late release.
  const button=page.locator('#abilityBtn');for(const interruption of ['blur','visibilitychange']){
   const bounds=await button.boundingBox();await page.mouse.move(bounds.x+10,bounds.y+10);await page.mouse.down();await page.waitForTimeout(300);assert(await page.locator('#actionPreviewHint').isVisible());
   await page.evaluate(type=>{if(type==='blur')window.dispatchEvent(new Event('blur'));else{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;}},interruption);
   await page.mouse.up();assert.equal(await page.evaluate(()=>window.count),0);assert(await page.locator('#actionPreviewHint').isHidden());
  }
  await page.waitForTimeout(850);await button.click();assert.equal(await page.evaluate(()=>window.count),1);await page.evaluate(()=>{preview.sync();window.dispatchEvent(new Event('blur'));});assert.equal(await page.evaluate(()=>window.selected),false);
  const roles=await page.evaluate(async()=>{
   const {createExpansionRoleUI}=await import('/oct28-role-ui.js');const checked=[];
   for(const role of ['bodyguard','missionary','cracker','eater','sandworm','bomber','carrier']){
    const game={phase:'play',players:{me:{alive:true,subrole:role,ventId:role==='sandworm'?'v':null,x:0,z:0},near:{alive:true,name:'近く',role:'crew',x:1,z:0},far:{alive:true,name:'遠く',role:'crew',x:10,z:0}},bodies:{body:{name:'死体',x:1,z:0}}};let list,sent=[];
    const ui=createExpansionRoleUI({getGame:()=>game,getSelf:()=>game.players.me,getId:()=> 'me',getPosition:()=>({x:0,z:0}),pose:(g,id)=>g.players[id],clock:()=>1000,connected:()=>true,canPlay:()=>true,blocked:()=>false,show(){},send:(_type,payload)=>sent.push(payload),toast(){},panel(){list=document.createElement('div');return list;}});
    const expected=ui.previewTargets().map(t=>t.id);ui.useAbility();if(list)for(const b of list.querySelectorAll('button'))b.click();const actual=sent.map(p=>p.bodyId||p.target);if(JSON.stringify(expected)!==JSON.stringify(actual))throw Error(role+': preview does not match action');checked.push(role);
   }return checked;
  });assert.equal(roles.length,7);
  await page.locator('#poolPracticeBtn').click();await page.locator('#practiceLab').waitFor({state:'visible'});assert.equal(await page.locator('#poolPracticeBtn').count(),1);assert.equal(await page.locator('#practiceLab').count(),1);
  for(let i=0;i<5;i++){await page.locator('#practiceLab [data-close]').click();await page.locator('#poolPracticeBtn').click();}
  await page.locator('#practiceLab [data-close]').click();await page.evaluate(()=>{available=false;practice.sync();});assert(await page.locator('#poolPracticeBtn').isHidden());await page.evaluate(()=>{available=true;practice.sync();});
  await page.locator('.ssTicketBadge').click();await page.locator('.ssGacha').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('.ssTicketBadge').textContent.includes('12'));assert.equal(await page.locator('.ssTicketBadge').count(),1);assert.equal(await page.locator('#gachaItemDetail').count(),1);
  await page.locator('.gachaClose').click();await page.evaluate(()=>{preview.dispose();gacha.dispose();practice.dispose();});assert.equal(await page.locator('#actionCancel,#actionPreviewHint,#practiceLab,#poolPracticeBtn,.ssGacha,.ssTicketBadge,#gachaItemDetail').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS real lazy launchers, no idle imports, wallet preservation, repeated practice, blur/hidden cancellation, complete disposal');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
