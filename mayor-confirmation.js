// The decision is local. Only an explicit confirmation sends the role command.
export function createMayorConfirmation({document,canUse,onConfirm,getVotes}){
 const panel=document.createElement('section');panel.id='mayorConfirm';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','mayorConfirmTitle');
 const card=document.createElement('div');card.className='mayorConfirmCard';const title=document.createElement('h2');title.id='mayorConfirmTitle';const actions=document.createElement('div');const cancel=document.createElement('button'),confirm=document.createElement('button');cancel.type=confirm.type='button';cancel.textContent='キャンセル';confirm.textContent='使用する';confirm.className='mayorConfirmYes';actions.append(cancel,confirm);card.append(title,actions);panel.append(card);document.body.append(panel);
 let origin=null;
 function close(){panel.hidden=true;origin?.focus?.();origin=null;}
 cancel.onclick=close;confirm.onclick=()=>{if(!canUse()){close();return;}close();onConfirm();};
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}if(event.key==='Tab'){event.preventDefault();(document.activeElement===confirm?cancel:confirm).focus();}});
 return{open(){if(!canUse())return;origin=document.activeElement;title.textContent=`1回分を使って、投票を${getVotes()}票に強化しますか？`;panel.hidden=false;cancel.focus();},close,sync(){if(!canUse())close();}};
}
