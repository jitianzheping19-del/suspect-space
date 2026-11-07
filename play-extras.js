import './play-extras.css';
const read=(key,fallback)=>{try{return JSON.parse(sessionStorage.getItem(key))||fallback;}catch{return fallback;}};
const persist=(key,value)=>{try{sessionStorage.setItem(key,JSON.stringify(value));}catch{}};
export function statusLabel(entry,stamp){
 if(!entry||!['ready','preparing','away'].includes(entry.value)||!Number.isFinite(entry.at)||!Number.isFinite(entry.until)||entry.until-entry.at>60000||entry.until<=stamp)return '';
 return entry.value==='away'?`少し離席 · あと${Math.ceil((entry.until-stamp)/1000)}秒`:entry.value==='preparing'?'準備中':'参加できます';
}
export function installPlayExtras(api){
 let scope='',notes={marks:{},rows:[]},friendOwner='',friends=[],context=null,longPress=0,longPoint=null,paintKey='',quotedUntil=0;
 const dialog=document.createElement('dialog');dialog.id='playExtras';dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','playExtrasTitle');
 dialog.innerHTML='<header><h2 id="playExtrasTitle">交流・自分用メモ</h2><button type="button" data-close>閉じる</button></header><nav><button type="button" data-tab="social">ロビー・フレンド</button><button type="button" data-tab="notes">推理メモ</button></nav><section data-view="social"><h3>今の状態</h3><div class="extrasStatus"><button type="button" data-status="preparing">準備中</button><button type="button" data-status="away">少し離席（1分）</button><button type="button" data-status="ready">戻りました</button></div><p data-status-label role="status"></p><h3>フレンド</h3><p>この端末に登録します。入室には、相手の部屋の参加条件が適用されます。</p><button type="button" data-friends-refresh>オンライン状態を更新</button><div data-friends></div><h3>同じ部屋の人</h3><div data-members></div></section><section data-view="notes" hidden><p>このメモと疑いマークは自分だけに見えます。事実を自動で判定する機能ではありません。</p><div data-marks></div><form data-note-form><label>試合開始からの時刻 <input name="time" maxlength="24" placeholder="例：1:30"></label><label>証言・気になったこと <textarea name="text" maxlength="400" required></textarea></label><button type="submit">時系列メモに追加</button></form><ol data-notes></ol></section><p data-error role="status"></p>';
 document.body.append(dialog);const q=s=>dialog.querySelector(s),error=q('[data-error]');
 function close(){dialog.close();api.resume?.();}q('[data-close]').onclick=close;
 dialog.addEventListener('close',()=>api.resume?.());
 function open(tab='social'){sync();for(const section of dialog.querySelectorAll('[data-view]'))section.hidden=section.dataset.view!==tab;for(const b of dialog.querySelectorAll('[data-tab]'))b.setAttribute('aria-pressed',String(b.dataset.tab===tab));if(!dialog.open){api.pause?.();dialog.showModal();}paint();}
 for(const b of dialog.querySelectorAll('[data-tab]'))b.onclick=()=>open(b.dataset.tab);
 const attach=(parent,text,tab)=>{if(!parent)return;const button=document.createElement('button');button.type='button';button.textContent=text;button.onclick=()=>open(tab);parent.append(button);return button;};
 attach(document.querySelector('[data-settings-section="room"]'),'交流・フレンド','social');
 attach(document.getElementById('mapPanelHeader'),'自分用メモ','notes');
 attach(document.querySelector('[data-settings-section="operation"]'),'推理メモ','notes');
 const notebook=attach(document.getElementById('meetingActions'),'推理メモ','notes');if(notebook)notebook.id='meetingNotebookBtn';
 const social=document.createElement('button');social.type='button';social.id='lobbySocialBtn';social.textContent='交流';social.onclick=()=>open('social');document.getElementById('lobbyRoster')?.append(social);
 const friendKey=()=>`space-friends-v1:${context?.uid||''}`;
 function saveFriends(){try{localStorage.setItem(friendKey(),JSON.stringify(friends.slice(0,50)));}catch{error.textContent='フレンドを端末に保存できませんでした。';}}
 function paint(){
  if(!context)return;const members=q('[data-members]');members.replaceChildren();
  for(const [id,p]of Object.entries(context.players||{}).filter(([id,p])=>id!==context.uid&&!p.bot&&p.online)){
   const row=document.createElement('p'),name=document.createElement('span'),button=document.createElement('button');name.textContent=p.name||'クルー';button.type='button';button.textContent=friends.some(f=>f.id===id)?'登録済み':'フレンドに登録';button.disabled=friends.some(f=>f.id===id)||friends.length>=50;
   button.onclick=()=>{friends.push({id,name:String(p.name||'クルー').slice(0,16)});saveFriends();paint();};row.append(name,button);members.append(row);
  }
  for(const button of dialog.querySelectorAll('[data-status]'))button.disabled=context.phase!=='lobby';
  q('[data-status-label]').textContent=statusLabel(context.statuses?.[context.uid],context.now)||'状態表示なし';
  const marks=q('[data-marks]');marks.replaceChildren();
  for(const [id,p]of Object.entries(context.roster||{}).filter(([id,p])=>id!==context.uid&&!p.observer)){
   const button=document.createElement('button');button.type='button';const mark=notes.marks[id]||'';button.textContent=`${mark||'−'} ${p.name||'クルー'}`;button.setAttribute('aria-label',`${p.name||'クルー'}：${mark==='?'?'気になる':mark==='!'?'疑い':mark==='○'?'信用':'未設定'}`);
   button.onclick=()=>{const list=['','?','!','○'];notes.marks[id]=list[(list.indexOf(mark)+1)%list.length];persist(scope,notes);paint();};marks.append(button);
  }
  const list=q('[data-notes]');list.replaceChildren();
  for(const row of [...notes.rows].sort((a,b)=>a.order-b.order)){
   const li=document.createElement('li'),time=document.createElement('strong'),text=document.createElement('span'),remove=document.createElement('button');time.textContent=row.time+' ';text.textContent=row.text;remove.type='button';remove.textContent='削除';remove.onclick=()=>{notes.rows=notes.rows.filter(n=>n.id!==row.id);persist(scope,notes);paint();};li.append(time,text,remove);list.append(li);
  }
 }
 q('[data-note-form]').onsubmit=e=>{e.preventDefault();const form=e.currentTarget,text=form.elements.text.value.trim();if(!text)return;const elapsed=Math.max(0,Math.floor((context.now-context.startedAt)/1000)),label=form.elements.time.value.trim()||`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`,match=label.match(/^(\d+):(\d{1,2})$/);notes.rows.push({id:crypto.randomUUID(),time:label,text,order:match?Number(match[1])*60+Number(match[2]):elapsed});notes.rows=notes.rows.slice(-60);persist(scope,notes);form.elements.text.value='';paint();};
 for(const b of dialog.querySelectorAll('[data-status]'))b.onclick=async()=>{if(context?.phase!=='lobby')return;error.textContent='送信中…';try{const result=await api.status(b.dataset.status);error.textContent=result?.ok===false?'状態を保存できませんでした。もう一度押してください。':'状態を更新しました。';}catch{error.textContent='送信できませんでした。もう一度押してください。';}};
 q('[data-friends-refresh]').onclick=async()=>{
  const owner=context.uid;error.textContent='確認中…';
  try{const online=await api.online();if(owner!==api.context().uid)return;error.textContent='';const list=q('[data-friends]');list.replaceChildren();
   for(const friend of friends){const row=document.createElement('p'),name=document.createElement('span'),join=document.createElement('button'),remove=document.createElement('button'),entry=online[friend.id];name.textContent=friend.name+(entry?.online?' · オンライン':' · オフライン');join.type=remove.type='button';join.textContent='同じ部屋へ';join.disabled=!entry?.online||!/^\d{4}$/.test(entry.roomCode||'')||entry.roomCode===context.room;remove.textContent='登録解除';
    join.onclick=async()=>{join.disabled=true;try{await api.join(entry.roomCode);close();}catch(e){error.textContent=e.message||'参加できませんでした。部屋の状態を確認してください。';join.disabled=false;}};
    remove.onclick=()=>{friends=friends.filter(f=>f.id!==friend.id);saveFriends();row.remove();paint();};row.append(name,join,remove);list.append(row);
   }if(!friends.length)list.textContent='まだ登録していません。';
  }catch(e){error.textContent='オンライン状態を読み込めませんでした。「更新」を押して再試行してください。';}
 };
 // Compose into the existing chat input: the normal host checks still decide delivery.
 const chat=document.getElementById('meetingChat'),tools=document.createElement('details');tools.className='meetingExtras';tools.innerHTML='<summary>証言・メモ</summary><div><select aria-label="場所" data-place></select><select aria-label="人物" data-person></select><select aria-label="時刻" data-time><option>今</option><option>通報の直前</option><option>約10秒前</option><option>約30秒前</option><option>前の会議の後</option></select><button type="button" data-compose>証言を入力</button><button type="button" data-notebook>自分用メモ</button></div>';
 chat?.insertBefore(tools,chat.firstChild);tools.querySelector('[data-notebook]').onclick=()=>open('notes');
 const compose=text=>{const input=document.getElementById('chatInput');if(!input||input.disabled)return;input.value=(input.value?input.value+' ':'' )+text;input.value=input.value.slice(0,input.maxLength>0?input.maxLength:120);input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();};
 tools.querySelector('[data-compose]').onclick=()=>compose(`${tools.querySelector('[data-time]').value}、${tools.querySelector('[data-place]').value}で${tools.querySelector('[data-person]').value}を見ました。`);
 const box=document.getElementById('chatMessages');
 box?.addEventListener('click',event=>{if(performance.now()<quotedUntil)return;const author=event.target.closest('.chatAuthor');if(author)compose((author.textContent||'').replace(' · ゴースト','')+'：');});
 const quote=line=>{const name=line.querySelector('.chatAuthor')?.textContent||'クルー',text=line.querySelector('.chatText')?.textContent;if(text)compose(`${name}「${text.slice(0,65)}」への返信：`);};
 box?.addEventListener('pointerdown',event=>{if(event.button!==0)return;const line=event.target.closest('.chatLine');if(!line)return;longPoint={x:event.clientX,y:event.clientY};clearTimeout(longPress);longPress=setTimeout(()=>{quote(line);quotedUntil=performance.now()+600;longPoint=null;},500);});
 box?.addEventListener('pointermove',event=>{if(longPoint&&Math.hypot(event.clientX-longPoint.x,event.clientY-longPoint.y)>8){clearTimeout(longPress);longPoint=null;}});
 for(const type of ['pointerup','pointercancel'])box?.addEventListener(type,()=>{clearTimeout(longPress);longPoint=null;});
 box?.addEventListener('contextmenu',event=>{const line=event.target.closest('.chatLine');if(line){event.preventDefault();clearTimeout(longPress);quote(line);}});
 const pin=document.createElement('p');pin.className='reporterStatement';pin.hidden=true;pin.setAttribute('aria-live','polite');chat?.insertBefore(pin,tools);
 let chatKey='';
 function sync(){
  context=api.context();const next=`space-notes-v1:${context.uid}:${context.room}:${context.round}:${context.startedAt}`;
  if(scope!==next){scope=next;notes=read(scope,{marks:{},rows:[]});if(!notes.marks||!Array.isArray(notes.rows))notes={marks:{},rows:[]};}
  if(friendOwner!==context.uid){friendOwner=context.uid;try{friends=JSON.parse(localStorage.getItem(friendKey())||'[]').filter(f=>typeof f.id==='string'&&typeof f.name==='string').slice(0,50);}catch{friends=[];}}
  social.hidden=context.phase!=='lobby';const currentPaint=JSON.stringify([context.phase,Object.entries(context.players||{}).map(([id,p])=>[id,p.name,p.online,p.observer]),Object.entries(context.roster||{}).map(([id,p])=>[id,p.name,p.observer])]);if(dialog.open&&currentPaint!==paintKey){paintKey=currentPaint;paint();}const statusText=statusLabel(context.statuses?.[context.uid],context.now)||'状態表示なし';if(q('[data-status-label]').textContent!==statusText)q('[data-status-label]').textContent=statusText;
  const meeting=context.meeting,key=context.room+':'+meeting?.id;
  if(chatKey!==key){chatKey=key;for(const [selector,values]of [['[data-place]',context.rooms||[]],['[data-person]',Object.values(context.roster||{}).filter(p=>!p.observer).map(p=>p.name||'クルー')]]){const select=tools.querySelector(selector);select.replaceChildren(...values.map(value=>{const option=document.createElement('option');option.textContent=value;return option;}));}}
  const first=context.messages?.find(m=>m.uid===meeting?.reporter&&!m.system&&m.alive!==false&&m.channel!=='ghost');
  const visible=context.phase==='meeting'&&first&&context.now<Number(first.at)+45000;
  pin.hidden=!visible;if(visible){const text='通報者の説明：'+String(first.text||'').slice(0,120);if(pin.textContent!==text)pin.textContent=text;}
  if(context.phase==='setup'&&dialog.open)close();
 }
 return{sync,open,close};
}
