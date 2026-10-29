import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {roleEffectForViewer,rocketFlightForViewer,waveEffectVisibleTo,ROCKET_TIMING} from '../role-effect-audience.js';
import {registerDeathPlayback,registerWinningPlayback,completeKillPlayback,killPresentationActive,isLastKillPlayback} from '../kill-presentation-state.js';
import {authoredKillSpec,authoredKillDurationMs} from '../authored-kill-player.js';

const viewers=['attacker','victim','secondVictim','witness','ghost','observer'];
const rocket={id:'r',type:'rocket-launch',by:'attacker',targets:['victim','secondVictim'],at:1000,startedAt:1000,fireAt:1900,endsAt:7200,targetPositions:{victim:{x:2,z:3},secondVictim:{x:30,z:40}}};
for(const type of ['rocket-launch','samuraiSlash','sluggerSwing','suicideBomber','arsonistIgnite','conjurer','bomber']){
 const event={...rocket,type,targets:type==='rocket-launch'?rocket.targets:rocket.targets.map(id=>({id,x:0,z:0}))};
 for(const viewer of viewers){const local=roleEffectForViewer(event,viewer),affected=event.targets.some(t=>(t.id||t)===viewer)||type==='suicideBomber'&&viewer==='attacker';
  assert.equal(!!local,affected,`${type}: ${viewer}`);
  if(local)assert(local.targets.every(t=>(t.id||t)===viewer),'A victim cannot see another victim’s animation');
 }
 assert.equal(event.targets.length,2,'Presentation does not mutate replicated events');
}
for(const type of ['rocket-capture','penguinFinish','waveCannonVictim','boxer','boxerImpact','evolverSlash','fencerRiposte','triggerHappyImpact']){
 for(const viewer of viewers)assert.equal(!!roleEffectForViewer({type,by:'attacker',target:'victim'},viewer),viewer==='victim',`${type}: ${viewer}`);
}
for(const type of ['evolverFeed','boxerCharge','arsonistDouse','triggerHappy','triggerHappyShot','sluggerCharge','overloader','unknownFutureAbility']){
 for(const viewer of viewers)assert.equal(!!roleEffectForViewer({type,by:'attacker',target:'victim'},viewer),viewer==='attacker',`${type}: ${viewer}`);
}
for(const viewer of viewers){
 assert.equal(!!roleEffectForViewer({type:'foxShield',by:'attacker',target:'victim',visibleTo:['attacker','victim']},viewer),['attacker','victim'].includes(viewer));
 assert.equal(!!roleEffectForViewer({type:'bomberArmed',by:'attacker',target:'victim',visibleTo:['attacker']},viewer),viewer==='attacker');
 assert.equal(!!roleEffectForViewer({type:'supportGift',by:'attacker',target:'victim'},viewer),['attacker','victim'].includes(viewer));
 assert.equal(waveEffectVisibleTo({by:'attacker',hitPlayers:['victim']},viewer),['attacker','victim'].includes(viewer));
}
assert.equal(rocketFlightForViewer([rocket],'victim',999),null);assert.equal(rocketFlightForViewer([rocket],'victim',7200),null);
assert.equal(rocketFlightForViewer([rocket,{...rocket,id:'unrelated',targets:['witness']}],'victim',2500).id,'r');

// Run the actual game dispatcher and camera code for every viewer, including
// a ghost and an observer; visibility range must never bypass the audience.
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function clearModRoleEffects()'),end=html.indexOf('function planTeleporterGather(',start);
const cameraStart=html.indexOf('      const rocketLaunchEvent=rocketFlightForViewer('),cameraEnd=html.indexOf('      let target = droneView',cameraStart);
const makeStart=html.indexOf('function ssxCreateRocketLaunchEffect('),makeEnd=html.indexOf('function ssxCreateRevenantEffect(',makeStart);
for(const viewer of viewers){
 const effects=[],audio=[],active=new Map(),handlers=new Map([['rocket-launch',({event})=>{effects.push(event);return{update:()=>true,dispose(){}};}]]);
 const context={code:'qa',console,roleEffectForViewer,rocketFlightForViewer,ROCKET_TIMING,uid:viewer,now:()=>2500,clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),game:{phase:'play',round:1,modRoleEvents:[rocket]},MOD_ROLE_ACTIVE_EFFECTS:active,MOD_ROLE_EFFECT_HANDLERS:handlers,MOD_ROLE_SEEN_EFFECT_IDS:new Set(),MOD_ROLE_EFFECT_SESSION:'',MOD_ROLE_EFFECT_PHASE:'',playKillSfx:kind=>audio.push(kind)};
 vm.createContext(context);vm.runInContext(html.slice(start,end)+'\nfunction cameraTarget(){'+html.slice(cameraStart,cameraEnd)+'return rocketCameraTarget;}\n'+html.slice(makeStart,makeEnd),context);
 context.updateModRoleEffects(context.game,null,null,viewer,2500);context.updateModRoleEffects(context.game,null,null,viewer,2500);
 const affected=rocket.targets.includes(viewer);assert.equal(effects.length,affected?1:0);assert.equal(audio.length,affected?1:0);
 const camera=context.cameraTarget();assert.equal(!!camera,affected);
 if(affected){assert.equal(camera.x,rocket.targetPositions[viewer].x);assert.equal(camera.z,rocket.targetPositions[viewer].z);assert(camera.y>.82);}
 else assert.equal(context.ssxCreateRocketLaunchEffect({event:rocket,ownerId:viewer}),null,'Rejected before allocating Three.js resources');
 context.clearModRoleEffects();assert.equal(active.size,0);
}
const g={phase:'play',round:1,players:{attacker:{alive:true},victim:{alive:false,deathAt:1000},secondVictim:{alive:false,deathAt:1100},ghost:{alive:false,deathAt:10},observer:{observer:true,alive:false}}};
registerDeathPlayback(g,{killer:'attacker',victim:'victim',cause:'bomber'},1000);registerDeathPlayback(g,{killer:'attacker',victim:'secondVictim',cause:'bomber'},1100);g.phase='ended';registerWinningPlayback(g,1200);
assert.deepEqual(Object.keys(g.killPresentation.pending),['victim','secondVictim']);
g.killEvent={id:'final',at:1100,victim:'secondVictim',killer:'attacker'};g.endedAt=1150;g.players.victim.killedById='attacker';
for(const viewer of viewers)assert.equal(isLastKillPlayback(g,viewer),['victim','secondVictim'].includes(viewer),'Last-kill label: '+viewer);
g.phase='play';assert(!isLastKillPlayback(g,'victim'));g.phase='ended';g.endedAt=5000;assert(!isLastKillPlayback(g,'victim'),'A later task/sabotage victory is not a last kill');g.endedAt=1150;
completeKillPlayback(g,'victim','1000',5000);assert(killPresentationActive(g,5000));completeKillPlayback(g,'secondVictim','1100',5500);assert(!killPresentationActive(g,5500));
assert(ROCKET_TIMING.charge<=100);assert(ROCKET_TIMING.flight<1000);assert.equal(ROCKET_TIMING.impact,ROCKET_TIMING.charge+ROCKET_TIMING.flight);assert.equal(ROCKET_TIMING.total,ROCKET_TIMING.impact+ROCKET_TIMING.burst);
const spec=authoredKillSpec({KILL_DEMOS:{rocket:{html:''}}},'rocket');assert.equal(authoredKillDurationMs('rocket'),(spec.duration-spec.trimStart-spec.trimEnd)/spec.playbackRate*1000);assert(authoredKillDurationMs('rocket')<1100);
// The authoritative death deadline and the visual ascent use the same timing,
// including a launch queued across a meeting.
const launches=[],emitted=[],host={ROCKET_TIMING,ssxIsRocket:p=>p.subrole==='rocket',ssxConnected:()=>true,ssxTargetLocation:(_id,p)=>p,ssxRocketCaptives:(g,id)=>Object.entries(g.players).filter(([,p])=>p.rocketCapturedBy===id),ssxEmit:(_g,type,by,fields)=>emitted.push({type,by,...fields}),ssxRocketRelease:()=>assert.fail('Unexpected release'),ssxRocketLaunchNow:({g,now},id)=>{launches.push(now);g.players[id].rocketLaunchPending=false;delete g.players.victim.rocketCapturedBy;}};
vm.createContext(host);const tickStart=html.indexOf('function ssxSpecialTick('),tickEnd=html.indexOf('function ssxSpecialWin(',tickStart);vm.runInContext(html.slice(tickStart,tickEnd),host);
const launched={phase:'play',players:{attacker:{subrole:'rocket',alive:true,rocketPendingAfterMeeting:true},victim:{alive:true,rocketCapturedBy:'attacker'}}};
for(const stamp of [1000,1000+ROCKET_TIMING.impact-1])host.ssxSpecialTick({g:launched,now:stamp,players:{},botPositions:{}});
assert.equal(launches.length,0);assert.equal(emitted[0].fireAt,1080);assert.equal(emitted[0].endsAt,2130);
host.ssxSpecialTick({g:launched,now:1730,players:{},botPositions:{}});assert.deepEqual(launches,[1730]);
console.log('PASS ability/impact audiences, simultaneous victims, explicit shields, real effect/audio dispatcher, victim-only rocket cameras and allocation, victim-only victory waits');
