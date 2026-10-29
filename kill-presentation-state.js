import {authoredKillDurationMs as durationFor,resolveAuthoredKillRole} from './authored-kill-player.js';
const currentPresentation=game=>{
  const presentation=game?.killPresentation;
  return ['play','ended'].includes(game?.phase)&&presentation?.round===game.round?presentation:null;
};
function pendingViewers(game,presentation){
  return Object.entries(presentation.pending||{}).filter(([id,entry])=>{
    const player=game.players?.[id];
    return entry.kind==='death'&&player&&!player.bot&&!player.disconnected&&!player.observer&&player.alive===false;
  });
}
function addPlayback(game,playerId,key,role,stamp){
  let presentation=currentPresentation(game);
  if(!presentation||presentationReadyAt(game)<=stamp){
    presentation={round:game.round,untilAt:stamp,deadlineAt:stamp,pending:{}};
    game.killPresentation=presentation;
  }
  const player=game.players?.[playerId],duration=durationFor(role);
  presentation.untilAt=Math.max(Number(presentation.untilAt)||0,stamp+duration);
  // A disconnected or outdated client cannot leave the room locked indefinitely.
  presentation.deadlineAt=Math.max(Number(presentation.deadlineAt)||0,stamp+15000);
  if(player&&!player.bot&&!player.disconnected&&!player.observer&&player.alive===false)
    (presentation.pending||={})[playerId]={key:String(key),kind:'death',role};
  delete presentation.completedAt;
  return presentation;
}
export function registerDeathPlayback(game,event,stamp){
  if(game.phase!=='play'||!event?.victim)return false;
  const player=game.players?.[event.victim],killer=game.players?.[event.killer];
  if(!player||!killer)return false;
  addPlayback(game,event.victim,player.deathAt,resolveAuthoredKillRole(player.deathCause||event.cause,killer),stamp);
  return true;
}
export function registerWinningPlayback(game){
  const presentation=currentPresentation(game);
  if(game.phase!=='ended'||!presentation||presentation.hasVictory)return false;
  // Finish the victims' existing scenes before the result. Do not start a
  // second kill animation for the attacker, observers or earlier ghosts.
  presentation.hasVictory=true;
  delete game.winningKillPlayback;
  return true;
}
export function isLastKillPlayback(game,viewer){
  const event=game?.killEvent,player=game?.players?.[viewer],entry=currentPresentation(game)?.pending?.[viewer];
  const endedAt=Number(game?.endedAt)||Number(event?.at)||0,at=Number(event?.at)||0;
  return game?.phase==='ended'&&!!event?.id&&entry?.kind==='death'&&player?.alive===false&&
    at>0&&Math.abs(endedAt-at)<=2500&&Math.abs(Number(player.deathAt)-at)<=250&&
    (event.victim===viewer||player.killedById===event.killer);
}
export function presentationReadyAt(game){
  const presentation=currentPresentation(game);if(!presentation)return 0;
  if(!pendingViewers(game,presentation).length&&Number(presentation.completedAt)>0)return Number(presentation.completedAt);
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
