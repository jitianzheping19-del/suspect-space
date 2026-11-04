const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const compiled=await build({entryPoints:['lobby-games-runtime.js'],bundle:true,write:false,format:'iife',globalName:'Games',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  for(const [width,height]of [[844,390],[390,844],[1024,768]]){
   const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1">');await page.clock.install({time:new Date('2026-11-04T12:00:00Z')});await page.clock.pauseAt(new Date('2026-11-04T12:00:00Z'));
   await page.evaluate(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};});
   await page.addScriptTag({content:compiled.outputFiles[0].text});for(const name of ['lobby-games.css','lobby-soccer-flick.css'])await page.addStyleTag({content:fs.readFileSync(name,'utf8')});
   await page.evaluate(()=>{
    window.ctx={enabled:true,uid:'guest',host:'host',room:'TEST',players:{guest:{online:true,x:23,z:10,yaw:0,lobbyY:0},host:{online:true,x:30,z:16,yaw:0,lobbyY:0}},admins:new Set()};window.commands=[];
    window.runtime=Games.createLobbyGamesRuntime({context:()=>ctx,db:()=>null,ref:(_,p)=>p,update:()=>new Promise(()=>{}),set:async()=>{},frame:()=>({postMessage(){}}),transport:()=>({publishEphemeral(p){if(p.kind==='lobby-games-command')commands.push(p.command);return true;}}),toast(){}});
    ctx.snapshot=runtime.rules.fresh('host',Date.now());Object.assign(ctx.snapshot.soccer,{status:'playing',members:{guest:0,host:1},endAt:Date.now()+180000});Object.assign(ctx.snapshot.soccer.ball,{z:10.74,dribbler:'guest'});
    ctx.snapshot=runtime.rules.command(ctx.snapshot,{uid:'guest',id:'lift',kind:'soccer-skill',skill:'heelLift',side:1,yaw:0,at:Date.now()},ctx.players,ctx.host,ctx.admins,Date.now()).state;
   });
   await page.clock.runFor(150);await page.evaluate(()=>runtime.handleFrame({type:'lobby-games-action',area:'soccer',enabled:false,yaw:0}));
   assert.equal(await page.locator('#lobbySoccerScore').count(),0);assert(await page.locator('#lobbySoccerActions').isVisible());assert(await page.getByRole('button',{name:'ロビーへ戻る',exact:true}).isVisible());
   const button=page.locator('#soccerKickBtn');assert(await button.isEnabled());assert.equal(await button.locator('span').innerText(),'オーバーヘッド');await button.tap();
   const commands=await page.evaluate(()=>commands);assert.equal(commands.length,1);assert.equal(commands[0].kind,'soccer-overhead');
   await page.evaluate(()=>{const c=commands[0],r=runtime.rules.command(ctx.snapshot,c,ctx.players,ctx.host,ctx.admins,Date.now());if(!r.ok)throw Error(r.message);ctx.snapshot=r.state;runtime.receive({kind:'lobby-games-state',state:ctx.snapshot},{from:'host'});runtime.receive({kind:'lobby-games-result',id:c.id,ok:true},{from:'host'});});
   await page.clock.runFor(100);assert(await button.isDisabled(),'finish cannot be double triggered');assert.deepEqual(errors,[]);await page.close();
   console.log('PASS touch overhead, no score HUD, exit remains accessible:',width,height);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
