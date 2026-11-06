// Milliseconds of sprint remain authoritative across heartbeat renewals.
export const SOCCER_STAMINA={capacity:4000,recoveryDelay:500,recoveryRate:1,restart:1000};
export function soccerDashStatus(g,id,time){
 const d=g?.dashes?.[id],C=SOCCER_STAMINA;
 if(!d)return {value:C.capacity,fraction:1,running:false,exhausted:false};
 const value=Number.isFinite(d.energyMs)?Math.max(0,Math.min(C.capacity,d.energyMs)):C.capacity;
 const at=Number.isFinite(d.energyAt)?d.energyAt:Number.isFinite(d.at)?d.at:time;
 const end=Math.max(at,Math.min(Number(d.until)||at,at+value));
 const used=Math.max(0,Math.min(time,end)-at);
 const remaining=Math.max(0,value-used),recovery=Math.max(0,time-end-C.recoveryDelay)*C.recoveryRate;
 const energy=Math.min(C.capacity,remaining+recovery);
 const exhausted=(d.exhausted===true||remaining<=.001)&&energy<C.restart;
 return {value:energy,fraction:energy/C.capacity,running:time<end&&remaining>.001&&!exhausted,exhausted};
}
export function beginSoccerDash(g,id,time,held){
 const energy=soccerDashStatus(g,id,time);
 g.dashes||={};g.dashes[id]={at:time,until:time+Math.min(650,energy.value),readyAt:time+950,held,energyAt:time,energyMs:energy.value,exhausted:false};
}
export function stopSoccerDash(g,id,time){
 const d=g?.dashes?.[id];if(!d)return;
 const energy=soccerDashStatus(g,id,time);
 Object.assign(d,{held:false,until:time,readyAt:time+300,energyAt:time,energyMs:energy.value,exhausted:energy.exhausted});
}
