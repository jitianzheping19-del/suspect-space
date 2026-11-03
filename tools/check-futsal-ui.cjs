const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['lobby-games-runtime.js'],bundle:true,write:false,outfile:'ui.js',format:'iife',globalName:'Games'});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height]of [[844,390],[390,844],[568,320],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>.hidden{display:none!important}body{background:#174b39}</style><body data-phase="lobby"></body>');await page.clock.install({time:100000});
  await page.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});
  await page.evaluate(()=>{window.messages=[];window.ctx={enabled:true,uid:'self',host:'self',room:'test',admins:new Set(),players:{self:{online:true,name:'青クルー',x:23,z:9,lobbyY:0}}};window.game=Games.createLobbyGamesRuntime({context:()=>ctx,db:()=>null,ref:()=>null,update:async()=>{},set:async()=>{},frame:()=>({postMessage:v=>messages.push(v)}),transport:()=>null,toast:()=>{}});});
  await page.clock.runFor(100);await page.evaluate(()=>game.handleFrame({type:'lobby-games-action',area:'soccer',enabled:true,canSkill:true}));
  assert(await page.locator('#lobbyMiniGamePanel').isVisible());await page.locator('#lobbyMiniGameStart').tap();await page.clock.runFor(4200);
  assert(await page.locator('#lobbyMiniGamePanel').isHidden());assert(await page.locator('#lobbySoccerScore').isVisible());assert.equal(await page.getByText('チームを見る').count(),0);
  assert(await page.locator('.soccerFlickGuide').isHidden());assert.equal(await page.locator('#soccerFlickZone').evaluate(e=>getComputedStyle(e).backgroundImage),'none');
  const rect=await page.locator('#lobbySoccerScore').boundingBox();assert(rect.x<=12&&rect.y<=12&&rect.width<=width-100,'score fits upper left');
  assert(await page.locator('#lobbySoccerScore #lobbyMiniGameStop').isVisible());assert(await page.locator('#lobbySoccerScore button').filter({hasText:'ロビーへ戻る'}).isVisible());
  if(process.env.VISUAL_SHOTS){fs.mkdirSync(process.env.VISUAL_SHOTS,{recursive:true});await page.screenshot({path:process.env.VISUAL_SHOTS+'/ui-'+width+'.png'});}
  await page.locator('#lobbyMiniGameStop').tap();await page.clock.runFor(100);assert(await page.locator('#lobbyMiniGamePanel').isVisible());assert(await page.locator('#lobbyMiniGameStart').isVisible());
  await page.evaluate(()=>{ctx.enabled=false;});await page.clock.runFor(100);assert(await page.locator('#lobbySoccerScore').isHidden());assert(await page.locator('#soccerFlickZone').isHidden());assert.deepEqual(errors,[]);
  console.log('PASS start/stop, bottom panel hidden, upper-left score, no teams/panel, retained exit',width,height);await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
