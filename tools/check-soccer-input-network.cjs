const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['lobby-games-runtime.js'],bundle:true,write:false,format:'iife',globalName:'Games',loader:{'.css':'empty'}});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1">');const frozen=new Date('2026-11-04T12:00:00Z');await page.clock.install({time:frozen});await page.clock.pauseAt(frozen);await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};});
  await page.addScriptTag({content:bundle.outputFiles[0].text});await page.addStyleTag({content:fs.readFileSync('lobby-soccer-flick.css','utf8')});
  await page.evaluate(()=>{
   window.ctx={enabled:true,uid:'guest',host:'host',room:'TEST',players:{guest:{online:true,x:23,z:9,lobbyY:0},friend:{online:true,x:28,z:13,lobbyY:0},host:{online:true,x:30,z:18,lobbyY:0}},admins:new Set()};window.sent=[];window.commands=[];window.toasts=[];
   window.runtime=Games.createLobbyGamesRuntime({context:()=>ctx,db:()=>null,ref:(_,p)=>p,update:()=>new Promise(()=>{}),set:async()=>{},frame:()=>({postMessage:data=>sent.push(data)}),transport:()=>({publishEphemeral(data){if(data.kind==='lobby-games-command')commands.push(data.command);return true;}}),toast:x=>toasts.push(x)});
   ctx.snapshot=runtime.rules.fresh('host',Date.now());Object.assign(ctx.snapshot.soccer,{status:'playing',members:{guest:0,friend:0,host:1},endAt:Date.now()+180000});Object.assign(ctx.snapshot.soccer.ball,{z:9.8,dribbler:'guest'});
   window.ack=command=>{const result=runtime.rules.command(ctx.snapshot,command,ctx.players,ctx.host,ctx.admins,Date.now());if(!result.ok)throw Error(result.message);ctx.snapshot=result.state;runtime.receive({kind:'lobby-games-state',state:ctx.snapshot},{from:'host'});runtime.receive({kind:'lobby-games-result',id:command.id,ok:true},{from:'host'});};
  });
  await page.clock.runFor(100);await page.evaluate(()=>{runtime.handleFrame({type:'lobby-games-action',area:'soccer',enabled:true,canSkill:true,yaw:Math.atan2(5,4),rightX:1,rightZ:0,forwardX:0,forwardZ:1});runtime.requestDash(true);});
  await page.waitForFunction(()=>commands.length===1);assert.equal(await page.evaluate(()=>commands[0].kind),'soccer-dash');
  const kick=page.locator('#soccerKickBtn');assert(await kick.isEnabled(),'charging stays enabled while dash ack is delayed');
  const b=await kick.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
  await page.mouse.move(x,y);await page.mouse.down();await page.clock.runFor(600);await page.mouse.move(x+35,y-28);await page.mouse.up();
  await page.evaluate(()=>{runtime.requestDash(false);});assert.equal(await page.evaluate(()=>commands.length),1,'kick and release wait for the initial host ack: '+JSON.stringify(await page.evaluate(()=>({commands,time:Date.now(),toasts}))));
  await page.evaluate(()=>ack(commands[0]));await page.waitForFunction(()=>commands.length===2);await page.evaluate(()=>ack(commands[1]));await page.waitForFunction(()=>commands.length===3);await page.evaluate(()=>ack(commands[2]));
  const commands=await page.evaluate(()=>commands);assert.equal(commands.filter(c=>c.kind==='kick').length,1);assert.equal(commands.filter(c=>c.kind==='soccer-dash'&&c.held===false).length,1);assert(commands.find(c=>c.kind==='kick').power>.45);
  await page.clock.runFor(100);assert.equal(await page.evaluate(()=>ctx.snapshot.soccer.dashes.guest.held),false);assert.deepEqual(await page.evaluate(()=>toasts),[]);assert.deepEqual(errors,[]);
  // A queued action from a departed room must never enter the next room.
  await page.clock.runFor(350);await page.evaluate(()=>{runtime.requestDash(true);});await page.waitForFunction(()=>commands.length===4);await page.evaluate(()=>{runtime.requestDash(false);ctx.enabled=false;});await page.clock.runFor(100);await page.evaluate(()=>{ctx.room='NEXT';ctx.enabled=true;});await page.clock.runFor(150);assert.equal(await page.evaluate(()=>commands.length),4);
  console.log('PASS guest runtime with offline database: delayed dash acknowledgement preserves charged kick and ordered release, no duplicate actions or stale room commands');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
