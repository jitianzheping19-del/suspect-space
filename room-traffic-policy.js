// Motion travels over WebRTC. Durable snapshots are recovery events, not frames.
export function createPoseSavePolicy(){
 let scope='',wasMoving=false,pending=false,lastSaved=-Infinity,wasFast=false;
 return{shouldSave({scope:nextScope,moving,structuralChanged=false,direct,fastFallback=false,stamp}){
  const changed=nextScope!==scope,fast=!direct&&fastFallback,interval=fast?100:5000,enteredFallback=fast&&!wasFast;
  if(wasMoving&&!moving)pending=true;wasMoving=!!moving;scope=nextScope;wasFast=fast;
  if(changed||structuralChanged||enteredFallback||pending&&stamp-lastSaved>=interval||!direct&&moving&&stamp-lastSaved>=interval){pending=false;lastSaved=stamp;return true;}return false;
 },reset(){scope='';wasMoving=false;pending=false;lastSaved=-Infinity;wasFast=false;}};
}
