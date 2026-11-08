import './friends-settings.css';
const labels={ready:'オンライン',preparing:'準備中',away:'少し離席'};
export function installFriendSettings(api){
 const panel=document.querySelector('[data-settings-section="friends"]');if(!panel)return {sync(){}};
 panel.classList.add('friendSettings');
 panel.innerHTML=`<div class="friendSummary"><div><strong data-online-total>フレンドと遊ぼう</strong></div><button type="button" class="friendPrimary primary" data-open-add>＋ 追加</button></div>
 <nav class="friendTabs" role="tablist" aria-label="フレンド"><button type="button" role="tab" data-friend-tab="list">リスト <span data-list-count>0</span></button><button type="button" role="tab" data-friend-tab="add">追加</button><button type="button" role="tab" data-friend-tab="requests">申請 <span data-request-count>0</span><span class="friendUnread" hidden aria-label="未読の申請"></span></button></nav>
 <p data-friend-message role="status" aria-live="polite" aria-atomic="true"></p>
 <section data-friend-view="list"><div class="friendListTools"><input type="search" data-list-filter aria-label="フレンドを名前で絞り込む" placeholder="名前で絞り込む"><button type="button" data-refresh aria-label="オンライン状態を更新">↻ 更新</button></div><div class="friendFilters" role="group" aria-label="フレンドの表示"><button type="button" data-list-mode="all" aria-pressed="true">すべて <span data-all-count>0</span></button><button type="button" data-list-mode="online" aria-pressed="false">オンライン <span data-online-count>0</span></button></div><div data-list></div></section>
 <section data-friend-view="add" hidden><form class="friendSearch"><label for="friendNameInput">名前で探す</label><div><input id="friendNameInput" name="name" maxlength="16" autocomplete="off" enterkeyhint="search" required placeholder="プレイヤー名を入力"><button class="friendPrimary primary" type="submit">検索</button></div><p>検索結果から相手を選び、申請できます。</p></form><div data-results></div><div class="friendSectionHeading"><h3>おすすめ</h3><span>＋ 申請でつながる</span></div><div data-recommended></div></section>
 <section data-friend-view="requests" hidden><p class="friendRequestHint">承認すると、お互いのリストに追加されます。</p><div data-requests></div><div data-sent></div></section>`;

 const q=s=>panel.querySelector(s),message=q('[data-friend-message]');
 const notification=document.createElement('div');notification.id='friendNotifications';notification.setAttribute('aria-live','polite');document.body.append(notification);
 const statusButton=document.createElement('button');statusButton.type='button';statusButton.id='settingsStatusButton';statusButton.textContent='オンライン';statusButton.setAttribute('aria-expanded','false');statusButton.setAttribute('aria-controls','settingsStatusChoices');document.getElementById('inputSettingsClose')?.before(statusButton);
 const statusChoices=document.createElement('div');statusChoices.id='settingsStatusChoices';statusChoices.hidden=true;statusChoices.setAttribute('role','group');statusChoices.setAttribute('aria-label','ステータス変更');statusChoices.innerHTML='<button type="button" data-status="ready">オンライン</button><button type="button" data-status="preparing">準備中</button><button type="button" data-status="away">少し離席</button><p role="status"></p>';statusButton.parentElement?.append(statusChoices);
 let context={},owner='',edges={},recent=[],online={},tab='list',off=null,paintKey='',seenBusy=false,retry=false,watchGeneration=0;
 let listMode='all',searchResults=[],searched=false,managePeer='',onlineReady=false,refreshing=false;
 const busy=new Set(),notified=new Set();
 const readRecent=id=>{try{const items=JSON.parse(localStorage.getItem('space-recent-players:'+id)||'[]');const old=JSON.parse(localStorage.getItem('space-friends-v1:'+id)||'[]');const all=[...(Array.isArray(items)?items:[]),...(Array.isArray(old)?old:[])];return all.filter((p,i)=>all.findIndex(v=>v?.id===p?.id)===i).filter(p=>p&&typeof p.id==='string'&&typeof p.name==='string').slice(0,40);}catch{return [];}};
 const saveRecent=()=>{try{localStorage.setItem('space-recent-players:'+owner,JSON.stringify(recent.slice(0,40)));}catch{}};
 const isOpen=()=>!document.getElementById('inputSettingsDialog')?.classList.contains('hidden')&&!panel.hidden;
 const incoming=()=>Object.entries(edges).filter(([,e])=>e.state==='pending'&&e.to===owner);
 const peerName=e=>e.from===owner?e.toName:e.fromName;
 function button(text,label,action,key){const b=document.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);b.onclick=action;if(key)b.dataset.friendFocus=key;return b;}
 function focus(key){[...panel.querySelectorAll('[data-friend-focus]')].find(b=>b.dataset.friendFocus===key)?.focus({preventScroll:true});}
 function feedback(text,tone='info'){message.textContent=text;message.dataset.tone=tone;if(text&&isOpen())message.scrollIntoView({block:'nearest'});}
 function row(name,detail){
  const p=document.createElement('div');p.className='friendRow';
  const avatar=document.createElement('span');avatar.className='friendAvatar';avatar.textContent=Array.from(name||'クルー')[0];avatar.setAttribute('aria-hidden','true');
  const identity=document.createElement('div'),n=document.createElement('strong');identity.className='friendIdentity';n.textContent=name;identity.append(n);
  if(detail){const d=document.createElement('small');d.textContent=detail;identity.append(d);}p.append(avatar,identity);return p;
 }
 function empty(parent,title,detail,add=false){const box=document.createElement('div');box.className='friendEmpty';const icon=document.createElement('span');icon.className='friendEmptyIcon';icon.textContent='＋';icon.setAttribute('aria-hidden','true');const strong=document.createElement('strong'),text=document.createElement('p');strong.textContent=title;text.textContent=detail;box.append(icon,strong,text);if(add)box.append(button('フレンドを追加','フレンド追加タブを開く',()=>select('add')));parent.append(box);}
 function group(parent,title){const heading=document.createElement('h4');heading.className='friendGroupTitle';heading.textContent=title;parent.append(heading);}

 async function action(key,fn,success){if(busy.has(key))return;const actor=owner;busy.add(key);feedback(key==='search'?'検索中…':'処理中…');paint();try{await fn();if(actor===owner)feedback(success,'success');}catch(e){if(actor===owner)feedback(e.code||/permission.denied/i.test(e.message||'')?'通信できませんでした。接続を確認して再試行してください。':e.message||'通信できませんでした。もう一度お試しください。','error');}finally{if(actor===owner){busy.delete(key);paint();}}}
 function respond(id,accept){return action(id,()=>api.friends.respond(id,accept),accept?'フレンドに追加しました。':'申請を辞退しました。');}
 function suggest(p,detail){
  const r=row(p.name,detail),edge=edges[p.id],incomingRequest=edge?.state==='pending'&&edge.to===owner;
  const label=busy.has(p.id)?'送信中…':edge?.state==='accepted'?'登録済み':edge?.state==='pending'?(incomingRequest?'申請を見る':'申請済み'):'＋ 申請';
  const b=button(label,incomingRequest?p.name+'からの申請を見る':p.name+'にフレンド申請を送信',()=>incomingRequest?select('requests'):action(p.id,()=>api.friends.send(p),'申請を送りました。相手の承認をお待ちください。'),'send:'+p.id);
  b.className=label==='＋ 申請'||incomingRequest?'friendAddButton':'friendStateButton';b.disabled=!owner||busy.has(p.id)||!!(edge&&edge.state!=='declined'&&!incomingRequest);r.append(b);return r;
 }
 function badges(){const unread=incoming().some(([,e])=>!e.seen);q('.friendUnread').hidden=!unread;const main=document.querySelector('[data-settings-target="friends"]');if(main){main.classList.toggle('hasUnread',unread);main.setAttribute('aria-label',unread?'フレンド・未読の申請あり':'フレンド');}}
 async function markSeen(){if(!owner||seenBusy||tab!=='requests'||!isOpen()||!incoming().some(([,e])=>!e.seen))return;seenBusy=true;const actor=owner;try{await api.friends.seen(edges);}catch{if(actor===owner)message.textContent='既読を保存できませんでした。申請タブを押して再試行してください。';}finally{seenBusy=false;}}
 function paint(){
  const activeKey=panel.contains(document.activeElement)?document.activeElement.dataset.friendFocus:null;
  badges();const accepted=Object.entries(edges).filter(([,e])=>e.state==='accepted'),pending=incoming();
  if(managePeer&&edges[managePeer]?.state!=='accepted')managePeer='';
  q('[data-list-count]').textContent=accepted.length;q('[data-request-count]').textContent=pending.length;
  const onlineCount=accepted.filter(([id])=>online[id]?.online).length;
  q('[data-online-total]').textContent=onlineReady?onlineCount+'人がオンライン':'フレンドと遊ぼう';
  q('[data-all-count]').textContent=accepted.length;q('[data-online-count]').textContent=onlineCount;
  for(const b of panel.querySelectorAll('[data-list-mode]'))b.setAttribute('aria-pressed',String(b.dataset.listMode===listMode));
  const refreshButton=q('[data-refresh]');refreshButton.disabled=!owner||refreshing;refreshButton.textContent=refreshing?'更新中…':'↻ 更新';
  const list=q('[data-list]'),filter=q('[data-list-filter]').value.trim().toLocaleLowerCase();list.replaceChildren();
  for(const [id,e]of accepted.sort((a,b)=>Number(!!online[b[0]]?.online)-Number(!!online[a[0]]?.online)||peerName(a[1]).localeCompare(peerName(b[1]),'ja'))){
   if(filter&&!peerName(e).toLocaleLowerCase().includes(filter)||listMode==='online'&&!online[id]?.online)continue;
   const p=online[id],same=!!context.room&&p?.roomCode===context.room;
   const room=p?.roomHost,hostName=room?.hostName||'確認できません';const detail=p?.online?(same?'同じ部屋にいます':room?.hostId===id?'フレンドの'+peerName(e)+'さんが開いている部屋':/^\d{4}$/.test(p.roomCode||'')?'フレンドの'+peerName(e)+'さんがいる部屋':'オンライン'):'オフライン';const r=row(peerName(e),detail);if(p?.online&&/^\d{4}$/.test(p.roomCode||'')){const host=document.createElement('small');host.className='friendRoomHost';host.textContent='ホスト：'+hostName;r.querySelector('.friendIdentity').append(host);}r.dataset.kind='list';r.dataset.online=String(!!p?.online);
   const join=button('部屋に参加',peerName(e)+'の部屋に参加',()=>action(id,async()=>{await api.join(p.roomCode);window.__closeSpaceInputSettings?.();},'参加しました。'),'join:'+id);join.className='friendJoinButton primary';
   join.hidden=!p?.online||!/^\d{4}$/.test(p.roomCode||'')||same;join.disabled=busy.has(id);
   if(p?.online&&!same&&join.hidden)r.querySelector('small').textContent='オンライン・部屋にいません';
   const manage=button('⋯',peerName(e)+'のフレンド管理',()=>{managePeer=managePeer===id?'':id;paint();},'manage:'+id);manage.className='friendManageButton';manage.setAttribute('aria-expanded',String(managePeer===id));manage.disabled=busy.has(id);
   const actions=document.createElement('div');actions.className='friendRowActions';actions.append(join,manage);r.append(actions);
   if(managePeer===id){
    const confirmation=document.createElement('div');confirmation.className='friendRemoveConfirm';const text=document.createElement('p');text.textContent=peerName(e)+'をフレンドから解除しますか？';
    const cancel=button('キャンセル','フレンド解除をキャンセル',()=>{managePeer='';paint();focus('manage:'+id);},'cancel:'+id);
    const remove=button('解除する',peerName(e)+'をフレンドから解除する',()=>action(id,()=>api.friends.remove(id),'フレンドを解除しました。'),'remove:'+id);remove.className='friendRemoveButton danger';cancel.disabled=remove.disabled=busy.has(id);confirmation.append(text,cancel,remove);r.append(confirmation);
   }
   list.append(r);
  }
  if(!list.children.length){empty(list,!owner?'ログインしてつながろう':filter?'見つかりませんでした':listMode==='online'?'オンラインのフレンドはいません':'まだフレンドがいません',!owner?'ログインするとフレンドを追加できます。':filter?'別の名前で探してみてください。':listMode==='online'?'「すべて」で登録済みのフレンドを確認できます。':'同じ部屋の人や、最近遊んだ人に申請できます。',!!owner&&!filter&&listMode==='all');if(filter||listMode!=='all')list.lastElementChild.append(button('すべて表示','絞り込みを解除して全フレンドを表示',()=>{q('[data-list-filter]').value='';listMode='all';paint();}));}
  const results=q('[data-results]');results.replaceChildren();if(searched){group(results,'検索結果');for(const p of searchResults)results.append(suggest(p,searchResults.length>1?'ID：'+p.id:'名前を確認して申請してください'));if(!searchResults.length)empty(results,'見つかりませんでした','プレイヤー名を正確に入力して、もう一度検索してください。');}
  const recommendations=q('[data-recommended]');recommendations.replaceChildren();
  const current=Object.entries(context.players||{}).filter(([id,p])=>id!==context.uid&&!p.bot&&p.online).map(([id,p])=>({id,name:p.name||'クルー'})),currentIds=new Set(current.map(p=>p.id)),previous=recent.filter(p=>p.id!==owner&&!currentIds.has(p.id));
  if(current.length){group(recommendations,'今同じ部屋にいる人');for(const p of current)recommendations.append(suggest(p,'今同じ部屋にいます'));}
  if(previous.length){group(recommendations,'最近一緒にプレイした人');for(const p of previous)recommendations.append(suggest(p,'最近一緒にプレイ'));}
  if(!current.length&&!previous.length)empty(recommendations,'一緒に遊ぶと、ここに表示','名前を入力して申請することもできます。');
  const requests=q('[data-requests]');requests.replaceChildren();
  for(const [id,e]of pending){const r=row(e.fromName,'フレンド申請'),no=button('辞退',e.fromName+'の申請を辞退',()=>respond(id,false)),yes=button('承認',e.fromName+'の申請を承認',()=>respond(id,true));r.dataset.kind='request';no.className='friendDecline';yes.className='friendAccept primary';no.disabled=yes.disabled=busy.has(id);r.append(no,yes);requests.append(r);}
  if(!requests.children.length)empty(requests,'申請はまだ届いていません','新しい申請が届くと、赤い印でお知らせします。');
  const sent=q('[data-sent]'),outgoing=Object.entries(edges).filter(([,e])=>e.state==='pending'&&e.from===owner);sent.replaceChildren();
  if(outgoing.length){group(sent,'送信済み · '+outgoing.length+'件');for(const [,e]of outgoing){const r=row(peerName(e),'相手の承認を待っています'),state=document.createElement('span');state.className='friendPendingLabel';state.textContent='申請済み';r.append(state);sent.append(r);}}
  for(const n of [...notification.children]){const e=edges[n.dataset.peer];if(!e||e.state!=='pending'||e.to!==owner)n.remove();else n.querySelectorAll('button').forEach(b=>b.disabled=busy.has(n.dataset.peer));}
  for(const b of panel.querySelectorAll('form button'))b.disabled=!owner||busy.has('search');
  if(activeKey)focus(activeKey);
 }
 function receive(value){edges=value;paint();for(const [id,e]of incoming()){const key=id+':'+e.at;if(e.seen||notified.has(key))continue;notified.add(key);const n=row(e.fromName,'フレンド申請が届きました');n.dataset.peer=id;const no=button('❌',e.fromName+'の申請を辞退',()=>respond(id,false)),yes=button('✅',e.fromName+'の申請を承認',()=>respond(id,true));no.className='friendDecline';yes.className='friendAccept primary';n.append(no,yes);notification.append(n);}void markSeen();}
 function watch(){off?.();off=null;retry=false;const actor=owner,generation=++watchGeneration;if(!actor)return;try{off=api.friends.watch(actor,v=>{if(actor===owner&&generation===watchGeneration)receive(v);},()=>{if(actor===owner&&generation===watchGeneration){retry=true;message.textContent='フレンドを読み込めませんでした。「更新」で再試行してください。';}});}catch{retry=true;message.textContent='接続を確認して「更新」を押してください。';}}
 async function refresh(){if(!owner||refreshing)return;if(retry)watch();const actor=owner;refreshing=true;paint();try{const result=await api.online();if(actor!==owner)return;const roomCodes=[...new Set(Object.keys(edges).filter(id=>edges[id].state==='accepted'&&result[id]?.online&&/^\d{4}$/.test(result[id].roomCode||'')).map(id=>result[id].roomCode))];const rooms=Object.fromEntries(await Promise.all(roomCodes.map(async code=>[code,await api.roomInfo?.(code).catch(()=>null)])));if(actor!==owner)return;online=Object.fromEntries(Object.entries(result).map(([id,p])=>[id,{...p,roomHost:rooms[p.roomCode]}]));onlineReady=true;}catch{if(actor===owner)feedback('オンライン状態を取得できませんでした。「更新」で再試行してください。','error');}finally{if(actor===owner){refreshing=false;paint();}}}
 function select(value){if(tab!==value)message.textContent='';tab=value;for(const b of panel.querySelectorAll('[data-friend-tab]')){const selected=b.dataset.friendTab===tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}for(const v of panel.querySelectorAll('[data-friend-view]'))v.hidden=v.dataset.friendView!==tab;paint();void markSeen();}
 for(const b of panel.querySelectorAll('[data-friend-tab]')){const key=b.dataset.friendTab;b.id='friendTab_'+key;b.setAttribute('aria-controls','friendView_'+key);const view=q(`[data-friend-view="${key}"]`);view.id='friendView_'+key;view.setAttribute('role','tabpanel');view.setAttribute('aria-labelledby',b.id);b.onclick=()=>select(key);b.onkeydown=e=>{const keys=['list','add','requests'];if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?2:(keys.indexOf(tab)+(e.key==='ArrowRight'?1:2))%3;select(keys[next]);q(`[data-friend-tab="${keys[next]}"]`).focus();};}
 q('[data-refresh]').onclick=refresh;
 q('[data-open-add]').onclick=()=>select('add');
 for(const b of panel.querySelectorAll('[data-list-mode]'))b.onclick=()=>{listMode=b.dataset.listMode;managePeer='';paint();};
 q('[data-list-filter]').oninput=paint;
 q('form').onsubmit=e=>{e.preventDefault();const text=e.currentTarget.elements.name.value.trim(),actor=owner;if(!text)return;searchResults=[];searched=false;void action('search',async()=>{const result=await api.friends.find(text);if(actor!==owner)return;searchResults=result.filter(p=>p.id!==owner);searched=true;},'検索が完了しました。');};
 statusButton.onclick=()=>{statusChoices.hidden=!statusChoices.hidden;statusButton.setAttribute('aria-expanded',String(!statusChoices.hidden));};
 for(const b of statusChoices.querySelectorAll('[data-status]'))b.onclick=async()=>{if(!context.room||context.phase!=='lobby'||busy.has('status'))return;busy.add('status');statusChoices.querySelectorAll('button').forEach(n=>n.disabled=true);const result=statusChoices.querySelector('p');try{const r=await api.status(b.dataset.status);if(r?.ok===false)throw Error();statusChoices.hidden=true;statusButton.setAttribute('aria-expanded','false');statusButton.textContent=labels[b.dataset.status];result.textContent='';}catch{result.textContent='保存できませんでした。もう一度押してください。';}finally{busy.delete('status');syncStatus();}};
 function syncStatus(){statusButton.disabled=!context.room||context.phase!=='lobby';statusButton.title=statusButton.disabled?'ロビーで変更できます。':'ステータスを変更';const e=context.statuses?.[context.uid],value=e&&e.until>context.now?labels[e.value]:null;const text=value||(owner?'オンライン':'未接続');if(statusButton.textContent!==text)statusButton.textContent=text;statusButton.dataset.status=value?e.value:owner?'ready':'offline';statusButton.setAttribute('aria-label',text+'・ステータスを変更');for(const b of statusChoices.querySelectorAll('[data-status]')){b.disabled=statusButton.disabled||busy.has('status');b.setAttribute('aria-pressed',String(b.dataset.status===e?.value&&!!value));}}
 function sync(){context=api.context();const next=context.friendUid||'';if(next!==owner){off?.();owner=next;edges={};online={};listMode='all';searchResults=[];searched=false;managePeer='';onlineReady=false;refreshing=false;recent=readRecent(owner);busy.clear();notified.clear();notification.replaceChildren();q('[data-results]').replaceChildren();q('form').reset();q('[data-list-filter]').value='';message.textContent='';paintKey='';watch();}
  const current=Object.entries(context.players||{}).filter(([id,p])=>id!==owner&&!p.bot&&p.online).map(([id,p])=>({id,name:String(p.name||'クルー').slice(0,16)})),key=JSON.stringify([owner,context.room,current]);if(key!==paintKey){paintKey=key;if(owner&&context.room){const ids=new Set(current.map(p=>p.id));recent=[...current,...recent.filter(p=>!ids.has(p.id))].slice(0,40);saveRecent();}paint();}syncStatus();}
 window.addEventListener('spacesuspect:input-settings-open',()=>{sync();if(isOpen()&&owner)void refresh();void markSeen();});window.addEventListener('spacesuspect:settings-tab',e=>{if(e.detail?.key==='friends'){sync();if(owner)void refresh();void markSeen();}});window.addEventListener('spacesuspect:input-settings-close',()=>{statusChoices.hidden=true;statusButton.setAttribute('aria-expanded','false');});
 select('list');sync();return {sync};
}
