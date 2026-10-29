// Replicated ability state is shared; presentation is local to its recipient.
const impacts=new Set(['rocket-capture','rocket-launch','penguinFinish','samuraiSlash','suicideBomber','sluggerSwing','waveCannonVictim','conjurer','bomber','boxer','boxerImpact','evolverSlash','fencerRiposte','arsonistIgnite','triggerHappyImpact']);
const paired=new Set(['penguinGrab','supportGift','supportAppoint','necromancer-revive','revenant-create','revenant-curse']);
const targetId=target=>typeof target==='string'?target:target?.id;
export const ROCKET_TIMING=Object.freeze({charge:80,flight:650,burst:400,impact:730,total:1130});
export function roleEffectTargets(event){
 return [...new Set([event?.target,event?.victimId,...(Array.isArray(event?.targets)?event.targets.map(targetId):[])].filter(Boolean))];
}
export function roleEffectForViewer(event,viewer){
 if(!event||!viewer)return null;
 if(Array.isArray(event.visibleTo)&&!event.visibleTo.includes(viewer))return null;
 const targets=roleEffectTargets(event),impact=impacts.has(event.type);
 const affected=targets.includes(viewer)||(event.type==='suicideBomber'&&event.by===viewer);
 const allowed=impact?affected:Array.isArray(event.visibleTo)?true:
   event.by===viewer||(paired.has(event.type)&&affected)||(event.type==='fencerBlocked'&&event.attacker===viewer);
 if(!allowed)return null;
 // A simultaneous attack must not reveal the other victims to this viewer.
 return impact&&Array.isArray(event.targets)?{...event,targets:event.targets.filter(t=>targetId(t)===viewer)}:event;
}
export function rocketFlightForViewer(events,viewer,stamp){
 for(let i=(events?.length||0)-1;i>=0;i--){const event=events[i];
  if(event?.type==='rocket-launch'&&Number(event.endsAt)>stamp&&stamp>=Number(event.startedAt??event.at??0)){
   const local=roleEffectForViewer(event,viewer);if(local)return local;
  }
 }
 return null;
}
export function waveEffectVisibleTo(event,viewer){
 return !!viewer&&(event?.by===viewer||(event?.hitPlayers||[]).some(target=>targetId(target)===viewer));
}
