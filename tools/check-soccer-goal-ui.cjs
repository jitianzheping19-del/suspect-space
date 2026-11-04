const fs=require('node:fs'),assert=require('node:assert/strict'),{build}=require('esbuild'),{chromium}=require('playwright');
(async()=>{
 const bundle=await build({entryPoints:['lobby-soccer-goal-ui.js'],bundle:true,write:false,outfile:'goals.js',format:'iife',globalName:'Goals'});
 const browser=await chromium.launch({args:['--no-sandbox']});
 try{
  for(const [width,height]of [[390,844],[844,390],[1024,768]]){
   const page=await browser.newPage({viewport:{width,height}});await page.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:radial-gradient(ellipse at 50% 60%,#2d734d,#102a29);margin:0}</style>');
   await page.addScriptTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.js')).text});await page.addStyleTag({content:bundle.outputFiles.find(f=>f.path.endsWith('.css')).text});
   await page.evaluate(()=>{window.stamp=100000;window.goal=Goals.createSoccerGoalPresentation({document,clock:()=>stamp});window.g={id:'test',status:'playing',score:[1,0],lastGoal:{at:stamp,team:0,beforeScore:[0,0],score:[1,0]},kickoff:{readyAt:stamp+3400}};goal.update(g,true);window.seek=t=>{stamp=g.lastGoal.at+t;for(const a of goal.root.getAnimations({subtree:true})){a.pause();a.currentTime=t;}goal.update(g,true);};});
   await page.evaluate(()=>seek(300));assert.equal(await page.locator('.blue .old').innerText(),'0');assert.equal(await page.locator('.blue .next').innerText(),'1');
   assert.equal(await page.locator('.blue .next').evaluate(e=>getComputedStyle(e).opacity),'0');
   await page.evaluate(()=>seek(1500));assert.equal(await page.locator('.blue .old').evaluate(e=>getComputedStyle(e).opacity),'0');assert.equal(await page.locator('.blue .next').evaluate(e=>getComputedStyle(e).opacity),'1');
   const card=await page.locator('.goalCard').boundingBox();assert(card.x>=0&&card.y>=0&&card.x+card.width<=width+.1&&card.y+card.height<=height+.1);
   const digits=await page.locator('.goalScore').boundingBox();assert(digits.x>=card.x&&digits.x+digits.width<=card.x+card.width);
   if(process.env.VISUAL_SHOTS){fs.mkdirSync(process.env.VISUAL_SHOTS,{recursive:true});await page.screenshot({path:process.env.VISUAL_SHOTS+'/goal-'+width+'.png'});}
   await page.evaluate(()=>seek(3401));assert(await page.locator('#soccerGoalCelebration').isHidden());
   await page.evaluate(()=>{stamp+=4000;g.lastGoal={at:stamp,team:1,beforeScore:[1,9],score:[1,10]};g.score=[1,10];g.kickoff.readyAt=stamp+3400;goal.update(g,true);seek(1500);});
   assert.equal(await page.locator('.red .old').innerText(),'9');assert.equal(await page.locator('.red .next').innerText(),'10');assert((await page.locator('.goalRestart').innerText()).startsWith('青チーム'));
   await page.evaluate(()=>goal.update(g,false));assert(await page.locator('#soccerGoalCelebration').isHidden());await page.close();
   console.log('PASS real goal animation 0→1 and 9→10, opposite kickoff label, timing and screen fit:',width,height);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
