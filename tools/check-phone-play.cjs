const fs=require('fs'),path=require('path'),{chromium,webkit}=require('playwright');
const root=process.env.PHONE_ROOT||path.resolve(__dirname,'..'),assert=require('node:assert/strict');
const safe=s=>s.replace(/env\(safe-area-inset-(left|right)\)/g,process.env.PHONE_NOTCH?'44px':'0px').replace(/env\(safe-area-inset-bottom\)/g,process.env.PHONE_NOTCH?'21px':'0px');
const strip=s=>safe(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
(async()=>{
 const browser=await (process.env.PHONE_WEBKIT?webkit:chromium).launch({args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
 await page.route('**/*',route=>{const u=new URL(route.request().url()),file=path.join(root,u.pathname);return u.hostname==='layout.test'&&fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({body:safe(fs.readFileSync(file,'utf8')),contentType:'text/css'}):route.abort();});
 await page.setContent(strip(fs.readFileSync(root+'/index.html','utf8')).replace('<head>','<head><base href="http://layout.test/">'),{waitUntil:'load'});
 await page.addStyleTag({content:safe(fs.readFileSync(root+'/gacha-ui.css','utf8'))});
 await page.addStyleTag({content:safe(fs.readFileSync(root+'/gameplay-clarity.css','utf8'))});
 await page.evaluate(()=>{
  document.body.dataset.phase='lobby';document.body.classList.add('voiceAvailable');
  document.querySelectorAll('.overlay,dialog,#hud,#buttons>*').forEach(n=>n.classList.add('hidden'));
  for(const id of ['lobbyRoster','lobbyRoomCode','inviteOnlineFloating','voiceToggleBtn','controls','jumpBtn','lobbyUseBtn','startBtn','lobbyOpenBtn','lobbyChatToggleBtn','lobbyAttachedFrame'])document.getElementById(id)?.classList.remove('hidden');
  const settings=document.getElementById('titleInputSettingsBtn');document.body.append(settings);settings.className='unifiedSettingsTrigger';
  document.getElementById('lobbyRoomCodeValue').textContent='6408';
  const badge=document.createElement('button');badge.className='ssTicketBadge';badge.id='ticketBadge';badge.textContent='🎟 999999';document.body.append(badge);
  const pet=document.createElement('button');pet.id='petInteractBtn';pet.textContent='🐾';document.body.append(pet);
  document.getElementById('voiceToggleBtn').textContent='🎙';document.getElementById('voiceToggleBtn').dataset.state='on';
  document.getElementById('lobbyRosterCount').textContent='2/15人';
  document.getElementById('lobbyRosterList').innerHTML=['レモン','レモンかす・あなた'].map((n,i)=>`<div class="${i?'':'hostKickRow'}"><i class="voteAvatar"></i><span>${n}</span><small>${i?'ホスト':'未準備'}</small></div>`).join('');
 });
 await page.evaluate(()=>{
 document.body.dataset.phase='play';document.body.append(document.getElementById('mapBtn'));
 for(const id of ['lobbyRoster','lobbyRoomCode','inviteOnlineFloating','lobbyUseBtn','startBtn','lobbyOpenBtn','lobbyChatToggleBtn','lobbyAttachedFrame','ticketBadge','petInteractBtn'])document.getElementById(id).classList.add('hidden');
 document.getElementById('ticketBadge').hidden=true;
 for(const id of ['hud','role','taskProgressHud','roundRoleBtn','mapBtn','taskBtn','jumpBtn','abilityBtn','reportBtn','killBtn','sabotageBtn'])document.getElementById(id).classList.remove('hidden');
 document.getElementById('role').textContent='エンジニア';document.getElementById('taskProgressLabel').textContent='タスク 0 / 8';
 document.getElementById('voiceToggleBtn').setAttribute('aria-pressed','true');
 });
 for(const [w,h]of (process.env.PHONE_NOTCH?[[667,375],[844,390],[932,430]]:[[568,320],[667,375],[844,390],[932,430],[320,568],[390,844]])){
 await page.setViewportSize({width:w,height:h});
 const rects=await page.evaluate(()=>Object.fromEntries(['role','taskProgressHud','roundRoleBtn','mapBtn','titleInputSettingsBtn','voiceToggleBtn','taskBtn','jumpBtn','abilityBtn','reportBtn','killBtn','sabotageBtn','stick'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,{x:r.x,y:r.y,w:r.width,h:r.height}]})));
 const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
 const check=entries=>{for(const [id,r]of entries)assert(r.x>=0&&r.y>=0&&r.w>=44&&r.h>=40&&r.x+r.w<=w+1&&r.y+r.h<=h+1,`${w}: invalid ${id} ${JSON.stringify(r)}`);for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)assert(!overlap(entries[i][1],entries[j][1]),`${w}: ${entries[i][0]} overlaps ${entries[j][0]}`);};
 check(Object.entries(rects));
 assert(Math.abs(rects.roundRoleBtn.x-rects.taskProgressHud.x-rects.taskProgressHud.w-6)<1);
 assert.equal(rects.roundRoleBtn.y,rects.taskProgressHud.y);assert.equal(rects.mapBtn.w,64);assert(rects.taskBtn.w<=68.1);
 assert(Math.abs(rects.taskBtn.y-rects.jumpBtn.y-rects.jumpBtn.h-18)<1);
 const tick=await page.locator('#voiceToggleBtn').evaluate(n=>{const s=getComputedStyle(n,'::after');return {position:s.position,right:s.right,bottom:s.bottom,width:s.width,height:s.height,margin:s.margin}});
 assert.deepEqual(tick,{position:'absolute',right:'2px',bottom:'2px',width:'12px',height:'12px',margin:'0px'});
 for(const leftHand of [false,true]){
  await page.evaluate(left=>{document.getElementById('controls').dataset.leftHanded=String(left);document.getElementById('buttons').dataset.crewControls='true';for(const id of ['killBtn','sabotageBtn'])document.getElementById(id).classList.add('hidden');},leftHand);
  const crew=await page.evaluate(()=>['taskBtn','jumpBtn','abilityBtn','reportBtn','stick'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return[id,{x:r.x,y:r.y,w:r.width,h:r.height}]}));check(crew);
 }
 await page.evaluate(()=>{document.getElementById('controls').dataset.leftHanded='false';delete document.getElementById('buttons').dataset.crewControls;for(const id of ['killBtn','sabotageBtn'])document.getElementById(id).classList.remove('hidden');});
 console.log('PASS',w,h,'action sizes/spacing, header adjacency, no overlap, left-handed crew, mic tick');
 await page.screenshot({path:`/tmp/play-ui-${w}.png`});
 }
 for(const [w,h]of [[844,390],[390,844],[1366,768]]){
 await page.setViewportSize({width:w,height:h});
 await page.evaluate(()=>{const modal=document.getElementById('roundRoles');modal.classList.remove('hidden');modal.classList.add('roundRolesFitsContent');modal.dataset.source='game';document.getElementById('roundRoleList').dataset.roleLayout='quality';document.getElementById('roundRoleList').innerHTML='<section class="roleFactionColumn"><h3>市民陣営</h3><div class="roleFactionCards"><button>エンジニア</button></div></section>';});
 for(const auto of [false,true]){
  await page.locator('#roundRoles').evaluate((n,auto)=>n.classList.toggle('autoLaunchRoles',auto),auto);
  if(auto)await page.evaluate(()=>{const timer=document.getElementById('gameCountdown');timer.classList.remove('hidden');timer.classList.add('withAutoLaunchRoles');timer.dataset.kind='launch'});
  const r=await page.locator('#roundRoles>.card').boundingBox();assert(r);assert(Math.abs(r.x+r.width/2-w/2)<2,`${w}: role card horizontal center`);assert(Math.abs(r.y+r.height/2-(h/2-(process.env.PHONE_NOTCH?4.5:0)))<2,`${w}: role card vertical center ${JSON.stringify(r)}`);
 }
 const hit=await page.locator('#roundRoles>.card').evaluate(n=>{const r=n.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height*.7);return n===hit||n.contains(hit)});assert(hit,'role review must not be covered by countdown');
 await page.locator('#gameCountdown').evaluate(n=>{n.classList.add('hidden');n.classList.remove('withAutoLaunchRoles')});
 await page.locator('#roundRoles').evaluate(n=>{n.classList.add('hidden');n.classList.remove('autoLaunchRoles')});
 await page.locator('#roleReveal').evaluate(n=>n.classList.remove('hidden'));
 assert.equal(await page.locator('#roleRevealRoster').evaluate(n=>getComputedStyle(n).display),'none');
 await page.locator('#roleReveal').evaluate(n=>n.classList.add('hidden'));
 console.log('PASS',w,h,'centered role review and hidden reveal roster');
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
