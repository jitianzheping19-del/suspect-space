// The live meeting and the preview use the same accessible role picker.
export function mountGuesserPicker({panel,target,roles,evil=false,onConfirm}) {
  const list=panel.querySelector('#guesserRoleList'),confirm=panel.querySelector('#guesserConfirm');
  panel.dataset.side=evil?'evil':'nice';
  panel.querySelector('#guesserTargetName').textContent=target.name+' の役職を推理';
  list.replaceChildren();
  let selected='';
  confirm.disabled=true;confirm.textContent='役職を選択';
  for(const role of roles){
    const button=document.createElement('button');button.type='button';button.dataset.guessRole=role.id;
    button.className='guesserRoleChoice';button.setAttribute('aria-pressed','false');
    const name=document.createElement('strong');name.textContent=role.name;
    const side=role.side==='neutral'?'third':role.side;
    const faction=document.createElement('small');faction.textContent=({crew:'市民陣営',impostor:'人狼陣営',third:'第三陣営'})[side]||'追加役職';
    button.dataset.side=side||'crew';button.append(name,faction);
    button.onclick=()=>{
      selected=role.id;
      for(const choice of list.children)choice.setAttribute('aria-pressed',String(choice===button));
      confirm.disabled=false;confirm.textContent=role.name+' と推理する';
    };
    list.append(button);
  }
  if(!roles.length){const empty=document.createElement('p');empty.textContent='推理できる役職がありません。';list.append(empty);}
  confirm.onclick=()=>{if(selected&&!confirm.disabled){confirm.disabled=true;onConfirm(selected);}};
}
