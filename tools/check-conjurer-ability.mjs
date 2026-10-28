import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {conjurerTriangleContains,canSeeConjurerMarkers,resetConjurerMarkers,useConjurerAbility} from '../conjurer-ability.js';

const triangle=[{x:0,z:0},{x:6,z:0},{x:0,z:6}],events=[],killed=[];
const game=()=>({phase:'play',playStartsAt:500,countdownEndsAt:500,settings:{conjurerCooldownSeconds:12},players:{a:{alive:true,role:'impostor',subrole:'conjurer'}}});
let g=game(),stamp=1000;
function use(location={x:100,z:100},profiles={},botPositions={}){
  return useConjurerAbility({game:g,actor:'a',location,profiles,botPositions,stamp,
    kill:(id,at)=>{if(g.players[id].protected)return false;g.players[id].alive=false;killed.push({id,...at});return true;},
    emit:(type,data)=>events.push({type,...data})});
}
for(const point of triangle){assert(use(point).placed);assert.equal(killed.length,0,'None of the three placements attacks anyone');}
assert.equal(g.players.a.conjurerMarkers.length,3);assert.equal(events.at(-1).type,'conjurerMarker');
for(const [id,extra]of Object.entries({b:{role:'crew'},c:{role:'impostor'},d:{role:'crew',bot:true,x:1,z:3},outside:{},vent:{ventId:'v'},observer:{observer:true},offline:{},disconnected:{disconnected:true},protected:{protected:true}}))g.players[id]={alive:true,role:'crew',...extra};
const profiles=Object.fromEntries(Object.keys(g.players).map(id=>[id,{x:1,z:1,online:true}]));profiles.outside.x=9;profiles.offline.online=false;
const result=use({x:100,z:100},profiles);
assert(result.fired);assert.deepEqual(killed.map(p=>p.id),['b','c','d'],'All eligible players in the triangle are hit, even from a distant caster');
assert(g.players.a.alive);assert.equal(g.players.a.abilityReadyAt,13000);assert(!g.players.a.conjurerMarkers&&!g.players.a.conjurerArmedAt,'Activation consumes the field');
assert.equal(events.at(-1).type,'conjurer');assert(!use().ok,'Cannot bypass activation cooldown');
g.players.new={alive:true,role:'crew'};profiles.new={x:1,z:2,online:true};stamp=13000;
for(const point of triangle)assert(use(point,profiles).placed);
assert(use(undefined,profiles).targets.some(t=>t.id==='new'),'A newly placed field can activate after cooldown');
assert(use({x:0,z:0}).ok===false,'Cooldown applies to placement as well');stamp+=12000;assert(use({x:0,z:0}).placed);
assert(resetConjurerMarkers(g));assert(!g.players.a.conjurerMarkers&&!g.players.a.conjurerArmedAt);assert(!resetConjurerMarkers(g));
for(const point of [{x:1,z:1},{x:0,z:0},{x:3,z:3}])assert(conjurerTriangleContains(triangle,point));
assert(!conjurerTriangleContains(triangle,{x:4,z:4}));assert(!conjurerTriangleContains(triangle,{x:NaN,z:1}));assert(!conjurerTriangleContains([{x:0,z:0},{x:1,z:1},{x:2,z:2}],{x:1,z:1}));
for(const viewer of [{role:'crew',alive:true},{role:'crew',alive:false},{role:'impostor',observer:true},{role:'impostor',disconnected:true},null])assert(!canSeeConjurerMarkers(viewer));
for(const alive of [true,false])assert(canSeeConjurerMarkers({role:'impostor',alive}));
g=game();assert(use({x:0,z:0}).ok);assert(!use({x:.1,z:0}).ok);assert(!use({x:Infinity,z:0}).ok);assert(use({x:2,z:0}).ok);assert(!use({x:4,z:0}).ok);assert(use({x:0,z:2}).ok);
for(const state of [{alive:false},{role:'crew'},{subrole:'impostor'},{ventId:'v'},{observer:true},{disconnected:true},{penguinCapturedBy:'b'},{rocketCapturedBy:'b'}]){g=game();Object.assign(g.players.a,state);assert(!use().ok);}
g=game();g.phase='meeting';assert(!use().ok);g.phase='play';g.playStartsAt=stamp+1;assert(!use().ok);
console.log('PASS: three safe placements, explicit activation, remote multi-target triangle, cooldown, consumed field, meeting reset, impostor-only markers, invalid/blocked commands');

// Exercise the actual shared death handler and ability hook: self destruction
// must kill the caster, while a protected neighbouring player remains protected.
for(const filename of ['index.html','space-suspect-complete.html']){
  const html=readFileSync(new URL('../'+filename,import.meta.url),'utf8');let serial=0;
  const hooks={beforeDeath:()=>({blocked:true})},ctx={now:()=>2000,token:()=>`test-${++serial}`,players:{a:{x:0,z:0,online:true},b:{x:1,z:0,online:true}},botPositions:{},ROOMS:[],
    expansionRules:{beforeDeath:()=>null},isMiniPlayer:p=>p?.mini||p?.subrole==="mini",vampireRoutes:{finish:()=>null},runModRoleHooks:(kind,args)=>hooks[kind]?.(args),markSoul:()=>{},registerDeathPlayback:()=>{},recordDeathAudit:()=>{},appendMeetingDeathNotice:()=>{},assignGhostRole:()=>{},roleNameFor:p=>p.subrole,
    clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),wallBetween:()=>false,distance:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),emitModRoleEvent:(g,type,by,data)=>(g.modRoleEvents||=[]).push({type,by,...data})};
  vm.createContext(ctx);
  const start=html.indexOf('function recordDeath(g,'),end=html.indexOf('\nfunction ',start+1);
  vm.runInContext(html.slice(start,end),ctx);
  for(const protection of [{shielded:true},{shieldUntil:9000},{sageShieldUntil:9000},{}]){
    const state={players:{a:{alive:true,role:'impostor',subrole:'suicideBomber',...protection}}};
    assert(ctx.recordDeath(state,'a','a',{x:0,z:0},{moveKiller:false,cause:'suicideBomber'}));assert(!state.players.a.alive,filename+' self destruct bypasses protection');
  }
  const state={players:{a:{alive:true,role:'impostor',subrole:'suicideBomber'},b:{alive:true,role:'crew',shielded:true}}};
  assert(!ctx.recordDeath(state,'b','a',{x:1,z:0},{cause:'suicideBomber'}));assert(state.players.b.alive,'Other targets retain shields');
  hooks.beforeDeath=()=>null;
  const combat=html.indexOf('const modCombatClamp='),combatEnd=html.indexOf('function modCombatBeforeKill(',combat);
  vm.runInContext(html.slice(combat,combatEnd),ctx);
  const gameState={phase:'play',settings:{},players:{a:{alive:true,role:'impostor',subrole:'suicideBomber',shielded:true},b:{alive:true,role:'crew'}}};
  const command={g:gameState,actor:'a',p:gameState.players.a,cmd:{ability:'suicideBomber'},loc:{x:0,z:0},now:2000,players:ctx.players,botPositions:{},setResult:(ok)=>assert(ok),markDirty:()=>{}};
  assert(ctx.modCombatAbility(command));assert(!gameState.players.a.alive&&!gameState.players.b.alive);assert.equal(gameState.modRoleEvents[0].type,'suicideBomber');
  assert(html.includes('registerModRoleHook("meeting",({g})=>resetConjurerMarkers(g))'));
  assert(html.includes('registerModEffectHandler("conjurer",publicCombatRoleEffect)'));
}
console.log('PASS: both game entrypoints use the real self-destruct death handler and replicated ability events; ordinary shields and meeting integration preserved');
