import './play-extras.css';
export function statusLabel(entry,stamp){
 if(!entry||!['ready','preparing','away'].includes(entry.value)||!Number.isFinite(entry.at)||!Number.isFinite(entry.until)||entry.until-entry.at>60000||entry.until<=stamp)return '';
 return entry.value==='away'?`少し離席 · あと${Math.ceil((entry.until-stamp)/1000)}秒`:entry.value==='preparing'?'準備中':'参加できます';
}
export function installPlayExtras(api){
 let context=null,longPress=0,longPoint=null,quotedUntil=0;
 // Remove data retained by the retired private notebook.
 try{for(const key of Object.keys(sessionStorage))if(key.startsWith('space-notes-v1:'))sessionStorage.removeItem(key);}catch{}
 // Compose into the existing chat input: the normal host checks still decide delivery.
 const chat=document.getElementById('meetingChat'),tools=document.createElement('details');tools.className='meetingExtras';tools.innerHTML='<summary>証言</summary><div><select aria-label="場所" data-place></select><select aria-label="人物" data-person></select><select aria-label="時刻" data-time><option>今</option><option>通報の直前</option><option>約10秒前</option><option>約30秒前</option><option>前の会議の後</option></select><button type="button" data-compose>証言を入力</button></div>';
 chat?.insertBefore(tools,chat.firstChild);
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
  context=api.context();
  const meeting=context.meeting,key=context.room+':'+meeting?.id;
  if(chatKey!==key){chatKey=key;for(const [selector,values]of [['[data-place]',context.rooms||[]],['[data-person]',Object.values(context.roster||{}).filter(p=>!p.observer).map(p=>p.name||'クルー')]]){const select=tools.querySelector(selector);select.replaceChildren(...values.map(value=>{const option=document.createElement('option');option.textContent=value;return option;}));}}
  const first=context.messages?.find(m=>m.uid===meeting?.reporter&&!m.system&&m.alive!==false&&m.channel!=='ghost');
  const visible=context.phase==='meeting'&&first&&context.now<Number(first.at)+45000;
  pin.hidden=!visible;if(visible){const text='通報者の説明：'+String(first.text||'').slice(0,120);if(pin.textContent!==text)pin.textContent=text;}
 }
 return{sync};
}
