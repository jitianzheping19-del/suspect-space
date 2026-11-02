const fs=require('node:fs'),vm=require('node:vm');
let fixture=fs.readFileSync('tools/check-phone-lobby-loading.cjs','utf8').split(' const lobby=')[0];
fixture+=`
 await page.addStyleTag({content:safe(fs.readFileSync(root+'/lobby-games.css','utf8'))});
 await page.evaluate(()=>{const b=document.createElement('button');b.id='lobbyMiniGameToggle';b.textContent='遊び';document.body.append(b);document.body.append(document.getElementById('mapBtn'));});
 const modes={lobby:['lobbyRoster','lobbyRoomCode','voiceToggleBtn','lobbyMiniGameToggle','ticketBadge','inviteOnlineFloating','titleInputSettingsBtn','lobbyOpenBtn'],play:['role','taskProgressHud','roundRoleBtn','mapBtn','voiceToggleBtn','titleInputSettingsBtn'],meeting:['meetingCountdown','meetingMapBtn','voiceToggleBtn']};
 const all=[...new Set(Object.values(modes).flat())];
 for(const mode of ['lobby','play','meeting']){
  await page.evaluate(({mode,all,shown})=>{document.body.dataset.phase=mode;document.getElementById('meeting').classList.toggle('hidden',mode!=='meeting');document.getElementById('hud').classList.toggle('hidden',mode!=='play');for(const id of all)document.getElementById(id).classList.toggle('hidden',!shown.includes(id));document.getElementById('meetingCountdown').textContent='投票終了まで 999 秒';document.getElementById('role').textContent='エンジニア';document.getElementById('taskProgressLabel').textContent='タスク 0 / 8';},{mode,all,shown:modes[mode]});
  for(const [width,height]of [[390,844],[844,390],[390,844],[768,1024],[1024,768],[768,1024],[568,320],[667,375]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>window.dispatchEvent(new Event('orientationchange')));await page.waitForTimeout(80);
   const boxes=await page.evaluate(ids=>Object.fromEntries(ids.flatMap(id=>{const e=document.getElementById(id),r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.visibility!=='hidden'&&s.display!=='none'?[[id,{x:r.x,y:r.y,w:r.width,h:r.height}]]:[];})),modes[mode]);
   for(const [id,r]of Object.entries(boxes))assert(r.x>=-1&&r.y>=-1&&r.x+r.w<=width+1&&r.y+r.h<=height+1,mode+' '+width+' '+id+' outside '+JSON.stringify(r));
   const entries=Object.entries(boxes);for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){const [a,x]=entries[i],[b,y]=entries[j];assert(!(Math.min(x.x+x.w,y.x+y.w)-Math.max(x.x,y.x)>1&&Math.min(x.y+x.h,y.y+y.h)-Math.max(x.y,y.y)>1),mode+' '+width+' '+a+' overlaps '+b+' '+JSON.stringify(boxes));}
   if(mode==='lobby'){
    assert(boxes.voiceToggleBtn&&boxes.lobbyMiniGameToggle&&boxes.lobbyRoster);
    const centered=await page.locator('#lobbyOpenBtn').evaluate(b=>{const r=document.createRange();r.selectNodeContents(b);const t=r.getBoundingClientRect(),a=b.getBoundingClientRect();return Math.abs(t.x+t.width/2-a.x-a.width/2)<2&&Math.abs(t.y+t.height/2-a.y-a.height/2)<3;});assert(centered,'room settings label centered');
   }
   if(process.env.VISUAL_SHOTS&&mode==='lobby'&&width===1024)await page.screenshot({path:process.env.VISUAL_SHOTS+'/ipad-lobby.png'});
  }
  console.log('PASS '+mode+' upper UI across portrait, landscape and iPad rotations');
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
`;
vm.runInNewContext(fixture,{require,__dirname:process.cwd()+'/tools',process,console,Buffer,URL,setTimeout});
