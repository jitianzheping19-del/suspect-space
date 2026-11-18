// Some mobile browsers omit click after a pan/pinch. Commit a stationary release
// as well as keyboard/mouse clicks, while discarding its later duplicate click.
export function bindLocationAction(button,activate){
 let press=null,handledAt=-Infinity;
 button.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'&&!button.disabled)press={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};});
 button.addEventListener('pointermove',e=>{if(press?.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)press.moved=true;});
 button.addEventListener('pointercancel',()=>{press=null;});
 button.addEventListener('pointerup',e=>{
  const p=press;press=null;if(!p||p.id!==e.pointerId||p.moved||button.disabled)return;
  e.preventDefault();e.stopPropagation();handledAt=performance.now();activate();
 });
 button.onclick=e=>{if(e.detail>0&&performance.now()-handledAt<700){e.preventDefault();return;}activate();};
}
