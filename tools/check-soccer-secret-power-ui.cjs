const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const {outputFiles}=await build({stdin:{contents:"export {createSoccerSecretControls} from './lobby-soccer-secret-ui.js';export {createLobbyGamesRules} from './lobby-games-rules.js';",resolveDir:process.cwd()},bundle:true,format:'iife',globalName:'Secret',write:false,outfile:'powers.js'});
 const html=fs.readFileSync('index.html','utf8'),filter=html.split('    const touchActionButtons=')[1].split('// Host writes only game;')[0];
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{for(const [width,height]of [[390,844],[844,390],[1024,768]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true});await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><div id="stick" style="position:fixed;left:20px;bottom:30px;width:80px;height:80px"></div>');await page.addStyleTag({content:outputFiles.find(f=>f.path.endsWith('.css')).text});await page.addScriptTag({content:outputFiles.find(f=>f.path.endsWith('.js')).text});await page.addScriptTag({content:'const code="test",game={phase:"lobby"};const touchActionButtons='+filter});
  await page.evaluate(()=>{const R=Secret.createLobbyGamesRules();window.c={visible:true,uid:'self',time:100000,F:R.SOCCER,players:{self:{online:true,x:23,z:8},ally:{online:true,x:23,z:16}},g:R.fresh('self',100000).soccer};Object.assign(c.g,{secretMode:true,status:'playing',members:{self:0,ally:0}});Object.assign(c.g.ball,{x:23,z:8.7,dribbler:'self'});window.commands=[];window.controls=Secret.createSoccerSecretControls({document,context:()=>c,send:(kind,p)=>commands.push({kind,...p})});controls.update();});
  await page.getByRole('button',{name:'腹砲',exact:true}).tap();assert.equal(await page.evaluate(()=>commands.length),1);assert.equal(await page.evaluate(()=>commands[0].power),'belly');
  const cdp=await page.context().newCDPSession(page),rect=await page.getByRole('button',{name:'空中リレー',exact:true}).boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width);assert(rect.height>=44);
  const left={id:1,x:50,y:height-60},right={id:2,x:rect.x+rect.width/2,y:rect.y+rect.height/2};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>commands.length),2);assert.equal(await page.evaluate(()=>commands.at(-1).power),'relay');
  await page.evaluate(()=>{c.g.secretPowers={self:{kind:'belly',at:100000,until:100900,cooldownUntil:105000}};controls.update();});
  assert.equal(await page.locator('[data-power=belly]').getAttribute('data-state'),'active');
  assert.equal(await page.locator('#soccerSecretAnnouncement').innerText(),'腹砲！');
  await page.evaluate(()=>{c.time=101000;controls.update();});
  assert.equal(await page.locator('[data-power=belly] small').innerText(),'回復中');
  const refill=await page.locator('[data-power=belly]').evaluate(b=>Number(b.style.getPropertyValue('--recharge')));assert(Math.abs(refill-.8)<.001);
  await page.evaluate(()=>{c.time=101200;controls.update();});assert(await page.locator('#soccerSecretAnnouncement').isHidden(),'same snapshot must not replay the announcement');
  await page.evaluate(()=>{c.time=105000;c.g.secretChain={at:104900,count:3};controls.update();});
  assert(await page.getByRole('button',{name:'腹砲',exact:true}).isEnabled());
  assert.equal(await page.locator('.soccerSecretCombo').innerText(),'空中リレー ×3');
  await page.evaluate(()=>{c.pending=true;controls.update();});assert(await page.getByRole('button',{name:'腹砲',exact:true}).isDisabled());
  await page.evaluate(()=>{c.pending=false;c.g.secretPowers={};c.g.members.enemy=1;c.players.enemy={online:true,x:23,z:9.2};controls.update();});
  await page.getByRole('tab',{name:'奥義',exact:true}).tap();
  for(const [kind,label]of [['thunder','雷鳴シュート'],['meteor','流星シュート'],['cyclone','旋風奪取'],['ice','氷晶壁'],['dragon','双龍パス']]){
   await page.evaluate(kind=>{Object.assign(c.g.ball,{x:23,y:.3,z:8.7,dribbler:kind==='cyclone'?'enemy':kind==='ice'?'':'self'});controls.update();},kind);
   const count=await page.evaluate(()=>commands.length),b=page.getByRole('button',{name:label,exact:true});assert(await b.isEnabled());await b.tap();assert.equal(await page.evaluate(()=>commands.length),count+1);assert.equal(await page.evaluate(()=>commands.at(-1).power),kind);
  }
  await page.getByRole('tab',{name:'連携',exact:true}).tap();
  await page.evaluate(()=>{c.g.ball.dribbler='self';controls.update();});
  await page.getByRole('button',{name:'ドライブシュート',exact:true}).tap();assert.equal(await page.evaluate(()=>commands.at(-1).power),'drive');
  await page.getByRole('tab',{name:'奥義',exact:true}).focus();await page.keyboard.press('ArrowLeft');
  assert.equal(await page.getByRole('tab',{name:'基本技',exact:true}).getAttribute('aria-selected'),'true');
  await page.evaluate(()=>{c.g.status='finished';controls.update();});assert(await page.locator('#soccerSecretPowers').isHidden());await page.close();console.log('PASS full app touch filter, single activation, second finger and hidden on finish',width,height);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
