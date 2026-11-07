// Exercise the additional controls in the actual assembled game/settings UI.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.join(__dirname,'check-input-quality.cjs');let source=fs.readFileSync(filename,'utf8');
source=source.replace(' clear(){resetInput();}',` availability(disabled,remaining,reason,pending){const button=$('abilityBtn');button.classList.remove('hidden');button.disabled=disabled;setActionAvailability(button,{remaining,reason,pending});return{state:button.dataset.availability,label:button.dataset.availabilityLabel,reason:button.getAttribute('aria-description')};},
 async gift(){reviewUI.dispose();const gift={key:'qa-local-gift',name:'QA gift',ticket:true,claimed:false};window.__comfortReview=createReviewUI({context:()=>({uid:'qa',admin:false,connected:true,inRoom:true,phase:'play'}),wasSent:async()=>true,watchGiftInbox(id,receive){queueMicrotask(()=>receive([gift]));return()=>{};},getReply:async()=>null,getGifts:async()=>[gift]});await window.__comfortReview.sync();},
 clear(){resetInput();}`);
const checks=`
  await page.evaluate(()=>__inputQualityQA.prepare());
  for(const [disabled,remaining,reason,pending,expected]of [[false,0,'',false,'ready'],[true,8,'',false,'cooldown'],[true,0,'使用済み。次の試合で使えます。',false,'unavailable'],[true,0,'処理を待ってください。',true,'pending']]){
   const state=await page.evaluate(args=>__inputQualityQA.availability(...args),[disabled,remaining,reason,pending]);assert.equal(state.state,expected);assert(state.label);assert(state.reason);
  }
  await page.evaluate(()=>window.__openSpaceInputSettings());await page.locator('[data-settings-target="operation"]').tap();
  for(const size of [{width:390,height:844},{width:844,height:390},{width:768,height:1024},{width:1024,height:768},{width:1366,height:768}]){
   await page.setViewportSize(size);await page.waitForTimeout(300);if(await page.locator('#ssxOrientationContinue').isVisible()){await page.locator('#ssxOrientationContinue').tap();await page.locator('#ssxOrientationGuide').waitFor({state:'hidden'});}await page.locator('#comfortTextSize').selectOption('larger');
   const close=await page.locator('#inputSettingsClose').boundingBox();assert(close&&close.width>=44&&close.height>=44);assert(close.x>=0&&close.y>=0&&close.x+close.width<=size.width+1&&close.y+close.height<=size.height+1);
   await page.locator('#comfortTextSize').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'../tmp/quality44/comfort-'+size.width+'.png')});const control=await page.locator('#comfortTextSize').boundingBox();assert(control.x>=0&&control.x+control.width<=size.width+1);assert(await page.locator('#comfortTextSize').isEnabled());
  }
  await page.locator('#comfortMotion').selectOption('reduce');assert.equal(await page.evaluate(()=>document.documentElement.dataset.reducedMotion),'true');assert(await page.evaluate(()=>window.__spaceMotionPreference.matches));
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#comfortMotion').selectOption('system');assert(await page.evaluate(()=>window.__spaceMotionPreference.matches));
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!window.__spaceMotionPreference.matches);
  assert.equal(await page.evaluate(()=>localStorage.getItem('space-suspect-text-size-v1')),'larger');
  await page.locator('[data-settings-target="quality"]').tap();await page.locator('#playtestLabel').fill('QA local');await page.locator('[data-record-start]').tap();assert(await page.locator('[data-record-start]').isDisabled());
  await page.locator('#playtestObservation').fill('操作確認');await page.locator('[data-record-note]').tap();await page.locator('[data-record-stop]').tap();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('space-suspect-playtest-v1')));assert(saved.endedAt);assert.equal(saved.observations[0].text,'操作確認');assert(!JSON.stringify(saved).includes('5291'));
  await page.locator('#inputSettingsClose').tap();
  await page.evaluate(()=>{window.__ssxExperienceSync({phase:'lobby',position:{x:0,z:0},roster:5,current:{role:'crew',tasks:{}},actors:{},lobbySettings:{},settings:{}});});
  await page.waitForTimeout(50);assert(await page.locator('#playGuide').isVisible());assert((await page.locator('#playGuideText').textContent()).includes('移動'));
  await page.evaluate(()=>window.__ssxExperienceSync({phase:'meeting',voted:true,current:{role:'crew'},actors:{},settings:{}}));assert(await page.locator('#playGuide').isHidden());assert.equal(await page.evaluate(()=>localStorage.getItem('space-suspect-learning-v1')),'done');
  await page.evaluate(()=>__inputQualityQA.gift());await page.locator('#ssGiftToast').tap();await page.locator('#inputSettingsDialog').waitFor({state:'visible'});assert.equal(await page.locator('[data-settings-target="inbox"]').getAttribute('aria-selected'),'true');await page.evaluate(()=>window.__comfortReview.dispose());
  console.log('PASS touch dismissal of portrait prompt and gift notification; action states, five viewport sizes with enlarged text, accessible close controls, motion/OS preferences, recording and contextual guide');
`;
const begin=source.indexOf('const checks=`'),end=source.indexOf('\nsource=source.slice',begin);if(begin<0||end<0)throw Error('Input fixture changed');
source=source.slice(0,begin)+'const checks='+JSON.stringify(checks)+';'+source.slice(end);
const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(source,filename);
