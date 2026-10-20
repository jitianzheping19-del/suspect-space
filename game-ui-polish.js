// Touch labels retain their accessible names without desktop shortcut hints.
const touch=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
const buttons=document.getElementById('buttons');
if(touch&&buttons){
  const strip=node=>{
    if(node.nodeType===Node.TEXT_NODE){const next=node.data.replace(/\s*\[(?:[A-Z]|Space|Enter|Esc)\]/g,'');if(next!==node.data)node.data=next;return;}
    for(const child of node.childNodes)strip(child);
  };
  strip(buttons);
  new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')strip(record.target);else for(const node of record.addedNodes)strip(node);}}).observe(buttons,{subtree:true,childList:true,characterData:true});
}
// Respect the player's actual joystick position, including custom placement and
// left-handed controls. Fixed CSS offsets cannot account for those preferences.
{
  const ghost=document.getElementById('ghostHud'),stick=document.getElementById('stick');let pending=false;
  const fit=()=>{
    pending=false;if(!ghost||!stick||ghost.classList.contains('hidden'))return;
    const r=stick.getBoundingClientRect(),gap=12,edge=8,visible=r.width>0&&getComputedStyle(stick).visibility!=='hidden';
    let width=Math.min(920,innerWidth*.72,innerWidth-edge*2),bottom=edge;
    if(visible){
      const space=r.left+r.width/2<innerWidth/2?innerWidth-2*(r.right+gap):2*(r.left-gap)-innerWidth;
      if(space>=220)width=Math.min(width,space);
      else bottom=Math.min(innerHeight-(ghost.offsetHeight||62)-edge,innerHeight-r.top+gap);
    }
    ghost.style.setProperty('width',width+'px','important');
    ghost.style.setProperty('max-width','none','important');
    ghost.style.setProperty('box-sizing','border-box','important');
    ghost.style.setProperty('transform','none','important');
    ghost.style.setProperty('left',(innerWidth-width)/2+'px','important');
    ghost.style.setProperty('right','auto','important');
    ghost.style.setProperty('bottom',Math.max(edge,bottom)+'px','important');
  };
  const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(fit);}};
  if(ghost)new MutationObserver(schedule).observe(ghost,{attributes:true,attributeFilter:['class']});
  if(stick&&globalThis.ResizeObserver)new ResizeObserver(schedule).observe(stick);
  addEventListener('resize',schedule);addEventListener('spaceinputpreferenceschange',schedule);schedule();
}
