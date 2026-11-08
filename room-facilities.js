// Missing settings preserve existing rooms. These switches control shared room terminals.
export function roomTerminalEnabled(kind,settings={}){
 return kind==='security'?settings.camerasEnabled!==false:kind==='medical'?settings.vitalsEnabled!==false:false;
}
export function initialLightSwitches(ids){
 return Object.fromEntries(ids.map(id=>[id,false]));
}
// A repaired circuit restores only the room containing that switch.
export function roomHasPower(point,rooms,panels,sabotage,stamp,contains){
 if(sabotage?.type!=='lights'||!(sabotage.endsAt>stamp))return true;
 const room=rooms.find(r=>contains(point.x,point.z,r));if(!room)return false;
 return panels.some(panel=>(panel.room==='lights'||panel.kind==='lights'||String(panel.id).startsWith('lights-'))&&sabotage.switches?.[panel.id]===true&&contains(panel.x,panel.z,room));
}
