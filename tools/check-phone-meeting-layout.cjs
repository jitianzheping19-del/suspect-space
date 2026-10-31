const fs=require('fs'),path=require('path'),{chromium,webkit}=require('playwright');
const root=process.env.PHONE_ROOT||path.resolve(__dirname,'..'),assert=require('node:assert/strict');
const safe=s=>s.replace(/env\(safe-area-inset-(left|right)\)/g,process.env.PHONE_NOTCH?'44px':'0px').replace(/env\(safe-area-inset-bottom\)/g,process.env.PHONE_NOTCH?'21px':'0px');
const strip=s=>safe(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
(async()=>{
 const browser=await (process.env.PHONE_WEBKIT?webkit:chromium).launch({args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
 await page.route('**/*',route=>{const u=new URL(route.request().url()),file=path.join(root,u.pathname);return u.hostname==='layout.test'&&fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({body:safe(fs.readFileSync(file,'utf8')),contentType:'text/css'}):route.abort();});
 await page.setContent(strip(fs.readFileSync(root+'/index.html','utf8')).replace(/<link rel="stylesheet" href="([^"]+)"[^>]*>/g,(_,name)=>'<style>'+safe(fs.readFileSync(path.join(root,name),'utf8'))+'</style>').replace('<head>','<head><base href="http://layout.test/">'),{waitUntil:'load'});
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
  document.body.dataset.phase='meeting';
  for(const id of ['lobbyRoster','lobbyRoomCode','inviteOnlineFloating','controls','lobbyUseBtn','startBtn','lobbyOpenBtn','lobbyChatToggleBtn','lobbyAttachedFrame','ticketBadge','petInteractBtn'])document.getElementById(id).classList.add('hidden');
  document.getElementById('ticketBadge').hidden=true;
  for(const id of ['meeting','roundRoleBtn','meetingMapBtn'])document.getElementById(id).classList.remove('hidden');
  document.querySelector('#meeting>.card').append(document.getElementById('meetingMapBtn'));
 });
 for(const [w,h]of (process.env.PHONE_NOTCH?[[667,375],[844,390],[932,430]]:[[320,568],[390,844],[568,320],[844,390],[1280,590]])){
  await page.setViewportSize({width:w,height:h});
  for(const mode of ['2d','3d'])for(const seconds of [999,60,9]){
   await page.evaluate(({mode,seconds})=>{document.getElementById('meeting').dataset.renderMode=mode;document.getElementById('meetingCountdown').textContent='投票終了まで '+seconds+' 秒';}, {mode,seconds});
   const rects=await page.evaluate(()=>Object.fromEntries(['meetingCountdown','meetingMapBtn','voiceToggleBtn'].map(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),css=getComputedStyle(e);return[id,{x:r.x,y:r.y,w:r.width,h:r.height,overflow:e.scrollWidth>e.clientWidth||e.scrollHeight>e.clientHeight,display:css.display,visibility:css.visibility}]})));
   for(const id of Object.keys(rects))assert(await page.locator('#'+id).isVisible(),id+' has visible ancestors');
   const entries=Object.entries(rects);for(const[id,r]of entries){assert(r.x>=0&&r.y>=0&&r.x+r.w<=w+1&&r.y+r.h<=h+1,id+' inside viewport');assert(r.display!=='none'&&r.visibility!=='hidden',id+' visible');assert(!r.overflow,id+' text fits');}
   for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){const a=entries[i][1],b=entries[j][1];assert(!(Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1),w+' '+mode+' '+JSON.stringify(rects)+' '+entries[i][0]+' overlaps '+entries[j][0]);}
  }
  console.log('PASS',w,h,'meeting timer fits beside microphone and map in 2D and 3D');
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
