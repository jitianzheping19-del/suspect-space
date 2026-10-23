// Motion travels over WebRTC. Durable snapshots are recovery events, not frames.
export function createPoseSavePolicy(){
 let scope='',wasMoving=false,pending=false,lastSaved=-Infinity;
 return{shouldSave({scope:nextScope,moving,structuralChanged=false,direct,stamp}){
  const changed=nextScope!==scope;if(wasMoving&&!moving)pending=true;wasMoving=!!moving;scope=nextScope;
  if(changed||structuralChanged||pending&&stamp-lastSaved>=5000||!direct&&moving&&stamp-lastSaved>=5000){pending=false;lastSaved=stamp;return true;}return false;
 },reset(){scope='';wasMoving=false;pending=false;lastSaved=-Infinity;}};
}
