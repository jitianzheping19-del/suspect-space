const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({stdin:{contents:"export {createLobbyGamesRuntime} from './lobby-games-runtime.js';export {createLobbyGamesRules} from './lobby-games-rules.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Q',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height]of [[390,844],[568,320],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><body data-phase="lobby">');
  await page.clock.install({time:new Date('2026-11-06T12:00:00Z')});
  await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(k,...args){return /webgl/.test(k)?null:original.call(this,k,...args);};});
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  for(const file of ['lobby-soccer-flick.css','lobby-soccer-defense.css','lobby-soccer-match.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  await page.evaluate(()=>{
   window.rules=Q.createLobbyGamesRules();window.commands=[];window.messages=[];
   window.ctx={enabled:true,uid:'self',host:'friend',room:'controls',admins:new Set(),players:{self:{online:true,x:23,z:8,yaw:0},friend:{online:true,x:28,z:12,yaw:0},enemy:{online:true,x:30,z:18,yaw:Math.PI}}};
   window.fixture=(owner='')=>{ctx.snapshot=rules.fresh('friend',Date.now());Object.assign(ctx.snapshot.soccer,{status:'playing',members:{self:0,friend:0,enemy:1},endAt:Date.now()+180000});Object.assign(ctx.snapshot.soccer.ball,{x:28,z:12.74,dribbler:owner,lastTouch:owner});};fixture();
   window.runtime=Q.createLobbyGamesRuntime({context:()=>ctx,db:()=>({}),ref:(_,p)=>p,set:async()=>{},update:async(path,data)=>{
    const command=data.lobbyGameCommand;if(!command)return;commands.push(command);
    // A remote host acknowledges after 120 ms, while controls are still held.
    await new Promise(done=>setTimeout(done,120));const result=rules.command(ctx.snapshot,command,ctx.players,'friend',new Set(),Date.now());ctx.snapshot=result.state;ctx.snapshot.results={self:{id:command.id,ok:result.ok,message:result.message||''}};
   },frame:()=>({postMessage:m=>messages.push(m)}),transport:()=>({publishEphemeral:()=>false}),toast:m=>{throw Error(m);}});
   window.enter=(enabled=false,canSkill=false)=>runtime.handleFrame({type:'lobby-games-action',area:'soccer',enabled,canSkill,yaw:0,rightX:1,rightZ:0,forwardX:0,forwardZ:1});enter();
  });
  await page.clock.runFor(250);await page.evaluate(()=>enter());
  const cdp=await page.context().newCDPSession(page);
  const point=async id=>{const r=await page.locator(id).boundingBox();assert(r,id+' is visible');return {id:1,x:r.x+r.width/2,y:r.y+r.height/2};};
  const touch=async(type,points)=>{await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});await page.clock.runFor(20);};
  let finger=await point('#soccerPressBtn');assert.equal(await page.locator('#soccerPressBtn span').textContent(),'ダッシュ');
  await touch('touchStart',[finger]);await page.clock.runFor(2100);
  assert(await page.evaluate(()=>ctx.snapshot.soccer.dashes.self.until>Date.now()),'sprint stays active across pending acks');
  assert(await page.evaluate(()=>commands.filter(c=>c.kind==='soccer-dash'&&c.held).length)>=6);
  assert.equal(await page.locator('#soccerPressBtn').getAttribute('aria-pressed'),'true');
  await touch('touchEnd',[]);await page.clock.runFor(350);
  assert.equal(await page.evaluate(()=>ctx.snapshot.soccer.dashes.self.held),false);
  assert.equal(await page.evaluate(()=>commands.filter(c=>c.kind==='soccer-dash'&&!c.held).length),1);
  for(const owner of ['', 'self']){
   await page.evaluate(owner=>{commands=[];fixture(owner);if(owner)Object.assign(ctx.snapshot.soccer.ball,{x:23,z:8.74});},owner);
   await page.clock.runFor(250);await page.evaluate(owner=>enter(!!owner,!!owner),owner);
   finger=await point(owner?'#soccerFeintBtn':'#soccerPressBtn');await touch('touchStart',[finger]);await page.clock.runFor(1200);
   assert(await page.locator('#soccerStamina').isVisible());
   const level=Number(await page.locator('#soccerStamina [role=progressbar]').getAttribute('aria-valuenow'));assert(level>65&&level<90,'gauge decreases while sprinting');
   const bar=await page.locator('#soccerStamina').boundingBox();assert(bar.x>=0&&bar.x+bar.width<=width&&bar.y>=0&&bar.y+bar.height<=height);
   await page.clock.runFor(3500);
   assert.equal(await page.locator('#soccerStamina').getAttribute('data-mode'),'empty');
   assert(!(await page.evaluate(()=>rules.dashStatus(ctx.snapshot,'self',Date.now()).running)));
   assert.equal(await page.evaluate(()=>commands.at(-1).held),false,'exhaustion releases the held button');
   const count=await page.evaluate(()=>commands.length);await page.clock.runFor(1600);
   assert.equal(await page.evaluate(()=>commands.length),count,'held finger cannot auto-restart after exhaustion');
   assert.equal(await page.locator('#soccerStamina').getAttribute('data-mode'),'recovering');
   await touch('touchEnd',[]);await page.clock.runFor(4500);assert(await page.locator('#soccerStamina').isHidden(),'full recovery hides gauge');
  }
  await page.evaluate(()=>{commands=[];fixture('friend');});await page.clock.runFor(250);await page.evaluate(()=>enter());
  assert(await page.locator('#soccerDefenseZone').isHidden());assert(await page.locator('#soccerKickBtn').isEnabled());
  assert.equal(await page.locator('#soccerKickBtn span').textContent(),'シュート');finger=await point('#soccerKickBtn');
  await touch('touchStart',[finger]);await touch('touchEnd',[]);await page.clock.runFor(300);
  assert.equal(await page.evaluate(()=>commands.length),1);assert(await page.evaluate(()=>ctx.snapshot.soccer.queuedKicks.self));
  assert.equal(await page.evaluate(()=>ctx.snapshot.soccer.ball.dribbler),'friend');
  await page.evaluate(()=>{ctx.snapshot.soccer.ball.dribbler='';ctx.snapshot.at=Date.now();});await page.clock.runFor(250);
  assert(await page.locator('#soccerDefenseZone').isHidden());assert((await page.locator('#soccerKickBtn small').textContent()).includes('予約中'));
  await page.evaluate(()=>{commands=[];fixture('self');Object.assign(ctx.snapshot.soccer.ball,{x:23,z:8.74});Object.assign(ctx.players.enemy,{x:23,z:9.1});});await page.clock.runFor(250);await page.evaluate(()=>enter(true,true));
  finger=await point('#soccerFeintBtn');await touch('touchStart',[finger]);await touch('touchEnd',[]);await page.clock.runFor(230);await touch('touchStart',[finger]);await page.clock.runFor(120);await touch('touchEnd',[]);await page.clock.runFor(400);
  assert.deepEqual(await page.evaluate(()=>commands.map(c=>c.skill)),['nutmeg'],'second press reserves double-tap before first timer fires');
  for(const [mode,label]of [['side','横から'],['third','三人称'],['length','縦から']]){
   finger=await point('#soccerCameraBtn');assert(finger.x<width/2&&finger.y<60);
   await touch('touchStart',[finger]);await touch('touchEnd',[]);
   assert((await page.locator('#soccerCameraBtn').textContent()).includes(label));
   assert.equal(await page.evaluate(()=>messages.filter(m=>m.type==='lobby-soccer-camera').at(-1).mode),mode);
  }
  assert.equal(await page.evaluate(()=>messages.filter(m=>m.type==='lobby-soccer-camera').length),3,'one mode change per touch');
  await page.evaluate(()=>{ctx.snapshot.soccer.bots={b1:{online:true,team:0},b2:{online:true,team:0},r1:{online:true,team:1}};ctx.snapshot.at=Date.now();});await page.clock.runFor(250);
  assert.equal(await page.locator('#soccerBotCount').textContent(),'BOT　青 2 ／ 赤 1');
  await page.evaluate(()=>runtime.handleFrame({type:'lobby-games-action',area:'lobby'}));assert(await page.locator('#soccerViewTools').isHidden());assert.deepEqual(errors,[]);
  console.log('PASS touch/remote ack: four-second sprint and gauge with/without ball, exhaustion/recovery, shot, nutmeg, camera and exit',width,height);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
