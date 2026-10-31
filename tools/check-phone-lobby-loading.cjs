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
  const notice=document.createElement('div');notice.id='lobbyGameDownload';notice.textContent='ゲームデータをダウンロード中… 0/3';document.body.append(notice);
  const badge=document.createElement('button');badge.className='ssTicketBadge';badge.id='ticketBadge';badge.textContent='🎟 999999';document.body.append(badge);
  const pet=document.createElement('button');pet.id='petInteractBtn';pet.textContent='🐾';document.body.append(pet);
  document.getElementById('voiceToggleBtn').textContent='🎙';document.getElementById('voiceToggleBtn').dataset.state='on';
  document.getElementById('lobbyRosterCount').textContent='2/15人';
  document.getElementById('lobbyRosterList').innerHTML=['レモン','レモンかす・あなた'].map((n,i)=>`<div class="${i?'':'hostKickRow'}"><i class="voteAvatar"></i><span>${n}</span><small>${i?'ホスト':'未準備'}</small></div>`).join('');
 });
 const lobby=strip(fs.readFileSync(root+'/assets-source/lobby-lounge.html','utf8'));
 await page.locator('#lobbyAttachedFrame').evaluate((frame,html)=>frame.srcdoc=html,lobby);
 await page.waitForTimeout(100);
 for(const [w,h] of (process.env.PHONE_NOTCH?[[667,375],[844,390],[932,430]]:[[568,320],[667,375],[844,390],[932,430],[1280,590],[320,568],[390,844]])){
  await page.setViewportSize({width:w,height:h});
  const rects=await page.evaluate(()=>Object.fromEntries(['lobbyRoster','lobbyRoomCode','inviteOnlineFloating','voiceToggleBtn','titleInputSettingsBtn','stick','jumpBtn','lobbyUseBtn','startBtn','lobbyOpenBtn','lobbyChatToggleBtn','ticketBadge','petInteractBtn','lobbyGameDownload'].map(id=>{let e=document.getElementById(id),r=e.getBoundingClientRect();return[id,{x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),display:getComputedStyle(e).display}]})));
  const overlaps=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
  assert.equal(rects.lobbyRoster.y,8);assert(rects.lobbyRoster.w<=180);
  for(const [id,r]of Object.entries(rects)){assert(r.w>0&&r.h>0&&r.x>=0&&r.y>=0&&r.x+r.w<=w+1&&r.y+r.h<=h+1,`${w} ${id} out of viewport`);}
  const frame=page.frames().find(f=>f.parentFrame());
  const crew=await frame.locator('#status').boundingBox();rects.crew={x:crew.x,y:crew.y,w:crew.width,h:crew.height};
  const mic=rects.voiceToggleBtn,roster=rects.lobbyRoster,invite=rects.inviteOnlineFloating,gacha=rects.ticketBadge,settings=rects.titleInputSettingsBtn;
  assert(Math.abs(mic.x-roster.x-roster.w-8)<=1,'microphone next to roster');
  assert(Math.abs(gacha.y-invite.y)<=1&&gacha.x+gacha.w+7<=invite.x,'gacha left of invite');
  assert(Math.abs(crew.x+crew.width-settings.x-settings.w)<=1&&crew.y>=settings.y+settings.h+7,'crew aligned below settings');
  const entries=Object.entries(rects);
  for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++)assert(!overlaps(entries[i][1],entries[j][1]),`${w}: ${entries[i][0]} overlaps ${entries[j][0]}`);
  await page.evaluate(()=>{document.getElementById('startBtn').classList.add('hidden');document.getElementById('readyBtn').classList.remove('hidden');});
  const ready=await page.locator('#readyBtn').boundingBox();assert(ready&&ready.width>0);const readyRect={x:ready.x,y:ready.y,w:ready.width,h:ready.height};
  for(const [id,r]of Object.entries(rects))if(id!=='startBtn')assert(!overlaps(readyRect,r),`${w}: ready overlaps ${id}`);
  assert.equal(await page.locator('#readyBtn').evaluate(n=>getComputedStyle(n,'::before').display),'none');
  await page.evaluate(()=>{document.getElementById('readyBtn').classList.add('hidden');document.getElementById('startBtn').classList.remove('hidden');});
  const saved=await page.locator('#lobbyRosterList').innerHTML();
  await page.locator('#lobbyRosterList').evaluate(n=>n.innerHTML=Array.from({length:15},(_,i)=>`<div class=hostKickRow><i class=voteAvatar></i><span>とても長い名前のプレイヤー${i}</span><small>未準備</small></div>`).join(''));
  for(const cls of ['voiceAvailable','voiceAvailable voicePromptOpen']){
   await page.evaluate(cls=>document.body.className=cls,cls);
   const full=await page.locator('#lobbyRoster').boundingBox();assert.equal(full.y,8);assert(full.height<=Math.min(h*.34,180)+1);
   const scroll=await page.locator('#lobbyRosterList').evaluate(n=>{n.scrollTop=10000;return{h:n.clientHeight,total:n.scrollHeight,scroll:n.scrollTop}});
   assert(scroll.total>scroll.h&&scroll.scroll>0,`${w}: full roster must scroll`);
   assert(!overlaps({x:full.x,y:full.y,w:full.width,h:full.height},rects.stick));
   assert(!overlaps({x:full.x,y:full.y,w:full.width,h:full.height},rects.petInteractBtn));
  }
  await page.locator('#lobbyRosterList').evaluate((n,html)=>n.innerHTML=html,saved);
  await page.evaluate(()=>document.body.className='voiceAvailable');
  console.log('PASS',w,h,'viewport, no overlapping lobby controls, compact top-left roster, 15-player scrolling');
  if(process.env.PHONE_SHOTS)await page.screenshot({path:path.join(process.env.PHONE_SHOTS,`phone-lobby-${w}.png`)});
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
