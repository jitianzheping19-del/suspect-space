// Pointer actions do not steal another finger's joystick capture.
export function bindMapButton(button,toggle){
 let lastPointer=-Infinity;
 button.addEventListener('pointerdown',event=>{
  if(event.button!==0||button.disabled)return;
  event.preventDefault();event.stopPropagation();lastPointer=performance.now();toggle();
 },{passive:false});
 button.onclick=event=>{event?.preventDefault();event?.stopPropagation();if(!event?.detail||performance.now()-lastPointer>650)toggle();};
}
