import {authoredKillRoles,resolveAuthoredKillRole} from './authored-kill-player.js';

const durationFor=role=>(authoredKillRoles.find(([id])=>id===role)?.[2]||4.2)*1000;
const currentPresentation=game=>{
  const presentation=game?.killPresentation;
  return ['play','ended'].includes(game?.phase)&&presentation?.round===game.round?presentation:null;
};
function pendingViewers(game,presentation){
  return Object.entries(presentation.pending||{}).filter(([id,entry])=>{
    const player=game.players?.[id];
    return player&&!player.bot&&!player.disconnected&&(!player.observer||entry.kind==='victory')&&
      (entry.kind==='victory'||player.alive===false);
  });
}
function addPlayback(game,playerId,key,role,kind,stamp){
  let presentation=currentPresentation(game);
  if(!presentation||presentationReadyAt(game)<=stamp){
    presentation={round:game.round,untilAt:stamp,deadlineAt:stamp,pending:{}};
    game.killPresentation=presentation;
  }
  const player=game.players?.[playerId],duration=durationFor(role);
  presentation.untilAt=Math.max(Number(presentation.untilAt)||0,stamp+duration);
  // A disconnected or outdated client cannot leave the room locked indefinitely.
  presentation.deadlineAt=Math.max(Number(presentation.deadlineAt)||0,stamp+15000);
  if(kind==='victory')presentation.hasVictory=true;
  if(player&&!player.bot&&!player.disconnected&&(!player.observer||kind==='victory'))
    (presentation.pending||={})[playerId]={key:String(key),kind,role};
  delete presentation.completedAt;
  return presentation;
}
export function registerDeathPlayback(game,event,stamp){
  if(game.phase!=='play'||!event?.victim)return false;
  const player=game.players?.[event.victim],killer=game.players?.[event.killer];
  if(!player||!killer)return false;
  addPlayback(game,event.victim,player.deathAt,resolveAuthoredKillRole(player.deathCause||event.cause,killer),'death',stamp);
  return true;
}
export function registerWinningPlayback(game,stamp){
  if(game.phase!=='ended')return false;
  if(game.winner!=='arsonist'){
    const event=game.killEvent,killerId=String(event?.killer||''),victim=game.players?.[event?.victim],killer=game.players?.[killerId];
    const endedAt=Number(game.endedAt)||stamp,eventAt=Number(event?.at)||0;
    if(!event?.id||!killerId||!killer||killer.alive!==true||!victim||victim.alive!==false||eventAt<endedAt-2500||eventAt>stamp+1000||killer.bot||killer.disconnected)return false;
    const key=`victory:${game.round}:last-kill:${event.id}`;
    if(game.winningKillPlayback?.key===key)return false;
    const role=resolveAuthoredKillRole(event.cause||victim.deathCause,killer);
    game.winningKillPlayback={key,player:killerId,role};
    addPlayback(game,killerId,key,role,'victory',stamp);
    return true;
  }
  const winner=Object.entries(game.players||{}).find(([,player])=>player?.alive&&!player.observer&&!player.disconnected&&player.subrole==='arsonist');
  if(!winner)return false;
  const [id]=winner,key=`victory:${game.round}:arsonist`;
  if(game.winningKillPlayback?.key===key)return false;
  game.winningKillPlayback={key,player:id,role:'arsonist'};
  // Victims are already watching the ignition death scene. Other participants,
  // including earlier ghosts and observers, see the winning ignition once.
  addPlayback(game,id,key,'arsonist','victory',stamp);
  for(const [viewerId,player] of Object.entries(game.players||{})){
    if(viewerId===id||player?.bot||player?.disconnected||game.killPresentation?.pending?.[viewerId]?.kind==='death')continue;
    addPlayback(game,viewerId,key,'arsonist','victory',stamp);
  }
  return true;
}
export function presentationReadyAt(game){
  const presentation=currentPresentation(game);if(!presentation)return 0;
  return Math.max(Number(presentation.untilAt)||0,Number(presentation.completedAt)||0,
    pendingViewers(game,presentation).length?Number(presentation.deadlineAt)||0:0);
}
export function killPresentationActive(game,stamp){return !!currentPresentation(game)?.hasVictory&&presentationReadyAt(game)>stamp;}
export function completeKillPlayback(game,playerId,key,stamp){
  const presentation=currentPresentation(game),entry=presentation?.pending?.[playerId];
  if(!entry||entry.key!==String(key)||stamp>Number(presentation.deadlineAt))return false;
  delete presentation.pending[playerId];
  if(!pendingViewers(game,presentation).length)presentation.completedAt=stamp;
  return true;
}
export function victoryPresentationAt(game){
  return Math.max(Number(game.endedAt)||0,presentationReadyAt(game));
}
