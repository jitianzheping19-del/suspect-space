const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const filename=path.join(__dirname,'check-all-roles.cjs');let source=fs.readFileSync(filename,'utf8');
const probe=`window.__trackerQA={
 prepare(){__allRolesQA.prepare('tracker');renderContextLost=true;cancelAnimationFrame(frameRequestId);set3DMode(false);renderUI();show('ssxOrientationGuide',false);show('roundRoles',false);avatars.clear();camera.position.set(position.x,24,position.z+12);camera.lookAt(position.x,0,position.z);camera.updateMatrixWorld(true);},
 track(){game.players.qa.trackedId='b';game.players.qa.trackUntil=now()+15000;renderTrackerIndicator();},
 state(){const e=$('trackerIndicator');return{hidden:e.classList.contains('hidden'),x:parseFloat(e.style.left),y:parseFloat(e.style.top),rotation:e.firstElementChild.style.transform,target:e.dataset.target};},
 move(){players.b.x+=100;renderTrackerIndicator();},
 hide(kind){if(kind==='expired')game.players.qa.trackUntil=now()-1;if(kind==='dead')game.players.b.alive=false;if(kind==='meeting')game.phase='meeting';if(kind==='role')game.players.qa.subrole='crewmate';renderTrackerIndicator();},
 cancel(){const r=$('stick').getBoundingClientRect(),stick=$('stick');stick.dispatchEvent(new PointerEvent('pointerdown',{pointerId:45,pointerType:'touch',clientX:r.right-10,clientY:r.y+r.height/2,bubbles:true}));const held=joystick.x;window.dispatchEvent(new PointerEvent('pointercancel',{pointerId:45,pointerType:'touch',bubbles:true}));return{held,x:joystick.x,z:joystick.z,transform:$('knob').style.transform};},
 roles(){return{selected:ROLE_OPTIONS.some(r=>r.id==='detective'),saved:normalizeSavedRoleCounts({detective:2,tracker:1})};}
};`;
source=source.replace("fs.readFileSync(path.join(__dirname,'all-roles-probe.js'),'utf8')","(fs.readFileSync(path.join(__dirname,'all-roles-probe.js'),'utf8')+"+JSON.stringify(probe)+")");
source=source.replace('const page=await browser.newPage(),errors=[];','const page=await browser.newPage(),errors=[];await page.addInitScript(()=>{try{localStorage.setItem("space-suspect-render-preset-v1","ultralow");}catch{}});');
const start=source.indexOf('  const report=await page.evaluate'),end=source.indexOf('\n }finally',start);
source=source.slice(0,start)+`
 for(const size of [{width:390,height:844},{width:844,height:390},{width:1024,height:768}]){
  await page.setViewportSize(size);const states=await page.evaluate(()=>{__trackerQA.prepare();__trackerQA.track();const inside=__trackerQA.state();__trackerQA.move();const outside=__trackerQA.state();const hidden=['expired','dead','meeting','role'].map(kind=>{__trackerQA.prepare();__trackerQA.track();__trackerQA.hide(kind);return __trackerQA.state().hidden;});return{inside,outside,hidden};});
  assert(!states.inside.hidden);assert.equal(states.inside.target,'b');assert(states.inside.x>0&&states.inside.x<size.width&&states.inside.y>0&&states.inside.y<size.height);const s=states.outside;assert(!s.hidden);assert(s.x>=35&&s.x<=size.width-35&&s.y>=35&&s.y<=size.height-35);assert(states.hidden.every(Boolean),JSON.stringify(states));
 }
 const input=await page.evaluate(()=>{__trackerQA.prepare();return __trackerQA.cancel();});assert(Math.abs(input.held)>.1);assert.equal(input.x,0);assert.equal(input.z,0);assert.equal(input.transform,'translate(0px, 0px)');const roles=await page.evaluate(()=>__trackerQA.roles());assert(!roles.selected);assert.equal(roles.saved.detective,undefined);assert.equal(roles.saved.tracker,1);assert.deepEqual(errors,[]);
 console.log('PASS tracker triangle on-screen/off-screen at three sizes; expiration/death/meeting/role cleanup; joystick cancellation; removed detective and saved setting filtering');
`+source.slice(end);
source=source.replace(".replace('if(!skipAutoLoginOnce){setTimeout(()=>connectFirebase(\"\"),0);}','')", ".replace('if(!skipAutoLoginOnce&&!rolePracticeMode){setTimeout(()=>connectFirebase(\"\"),0);}','')");
const adapted=fs.readFileSync(path.join(__dirname,'run-quality-browser.cjs'),'utf8').replace('const name=process.argv[2];',"const name='check-all-roles.cjs';").replace("let source=fs.readFileSync(filename,'utf8');",'let source='+JSON.stringify(source)+';');const runner=new Module(filename,module);runner.filename=filename;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(adapted,filename);
