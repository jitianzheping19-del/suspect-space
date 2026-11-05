const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const html=fs.readFileSync('index.html','utf8'),render=html.slice(html.indexOf('    function renderLobbyChat(){'),html.indexOf('    function updateLobbyChatDelivery'));
 const browser=await chromium.launch({args:['--no-sandbox']});try{const page=await browser.newPage();await page.setContent('<section><div id="lobbyChatMessages"></div><input id="lobbyChatInput"></section>');
 await page.addScriptTag({content:`const $=id=>document.getElementById(id),code='ROOM',uid='self',players={self:{name:'self',hue:.3}},chatViewState={lobby:{}},CHAT_VISIBLE_LIMIT=60;
 let lobbyChatMessages=[{id:'1',uid:'self',text:'hello',at:100000,delivery:'sending'}];
 const chatViewportSnapshot=()=>({bottom:true}),attachChatScrollTracking=()=>{},syncChatReturnControl=()=>{},appendChatHistoryCap=()=>{},shouldGroupChat=()=>false,suitColor=()=>({getStyle:()=> '#ffaa44'}),nicknameFor=()=>'',hasDisplayableName=n=>!!n,chatTimeLabel=()=> '12:00',restoreChatViewport=()=>{},retryLobbyChat=()=>{};
 ${render}
 window.check=()=>{renderLobbyChat();const original=$('lobbyChatMessages').firstElementChild;let count=0;const observer=new MutationObserver(r=>count+=r.length);observer.observe($('lobbyChatMessages'),{childList:true,subtree:true});for(let i=0;i<100;i++)renderLobbyChat();const records=observer.takeRecords().length;observer.disconnect();lobbyChatMessages.push({id:'2',uid:'friend',text:'next',at:100010});renderLobbyChat();return {records,same:original===$('lobbyChatMessages').firstElementChild,count:$('lobbyChatMessages').children.length};};`});
 const result=await page.evaluate(()=>check());assert.equal(result.records,0);assert(result.same&&result.count===2);console.log('PASS repeated chat snapshots do not mutate DOM; adding a message retains existing rows');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
