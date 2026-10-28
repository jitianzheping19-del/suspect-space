// Missing settings preserve existing rooms. These switches control shared room terminals.
export function roomTerminalEnabled(kind,settings={}){
 return kind==='security'?settings.camerasEnabled!==false:kind==='medical'?settings.vitalsEnabled!==false:false;
}
export function initialLightSwitches(ids,randomInt){
 const order=[...ids];for(let i=order.length-1;i>0;i--){const j=randomInt(i+1);[order[i],order[j]]=[order[j],order[i]];}
 // One more circuit starts repaired, so one fewer switch needs fixing.
 const on=Math.min(order.length,3+randomInt(2));return Object.fromEntries(order.map((id,i)=>[id,i<on]));
}
