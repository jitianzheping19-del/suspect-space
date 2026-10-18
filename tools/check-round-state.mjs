import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {matchResumePose,repairableOwnPresence,isHostConnectionNotice} from '../room-resume-state.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
for(const file of ['index.html','space-suspect-complete.html']){
 const source=readFileSync(new URL('../'+file,import.meta.url),'utf8');
 const between=(a,b)=>{const i=source.indexOf(a),j=source.indexOf(b,i+a.length);assert(i>=0&&j>i,a);return source.slice(i,j);};
 const controls=new Map();
 for(const match of source.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
  const tag=match[0],id=match[1];controls.set(id,{id,dataset:{},type:tag.match(/type="([^"]+)"/)?.[1]||'select',value:tag.match(/value="([^"]*)"/)?.[1]||'',checked:/\schecked(?:\s|>|$)/.test(tag)});
 }
 const values={killCooldownSeconds:10,samuraiCooldownSeconds:10,sluggerCooldownSeconds:15,penguinCooldownSeconds:20,necromancerCooldownSeconds:25,rocketInitialCaptureCooldownSeconds:10,rocketAdditionalCaptureCooldownSeconds:3,serialKillerKillCooldownSeconds:10,roomMapMode:'classic',roomViewMode:'2d',waveMode:'normal',ejectionRevealMode:'role',impostorCount:1,botCount:2};
 for(const [id,value]of Object.entries(values))controls.get(id).value=String(value);
 controls.get('samuraiCanVent').checked=true;
 let stamp=50000,stored;
 const c={$:id=>controls.get(id),document:{querySelectorAll:()=>[...controls.values()]},localStorage:{getItem:()=>null},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),roleCooldownSettingsFromInputs:()=>({}),selectedRoleCounts:()=>({samurai:1}),
  readLastMatchSettings:()=>null,game:{phase:'lobby',settings:{},lobbySettings:{}},now:()=>stamp,token:()=>String(stamp),
  roleCounts:{samurai:1},impostorCount:1,botCount:2,waveModeSelected:'normal',selectedTaskCount:6,nextRound:2,
  waveSetup:{countdownEndsAt:50000,playStartsAt:50000},roster:{a:{role:'impostor',subrole:'samurai'}},
  lobbySettingsPayload:s=>({matchSettings:s}),code:'1234',roomCode:'1234',db:{},ref:(_,path)=>path,set:async(_,body)=>{stored=body;},
  upgradedRoleCooldownMs:()=>0,roleBehaviorValue:()=>0,
  players:{a:{x:0,z:0,online:true},b:{x:1,z:0,online:true}},botPositions:{},wallBetween:()=>false,
  distance:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),commandOrigin:loc=>loc,runModRoleHooks:()=>null,
  emitModRoleEvent:()=>{},recordDeath:(g,id)=>{g.players[id].alive=false;return true;},setCommandResult:()=>{}};
 vm.createContext(c);
 vm.runInContext(between('function mergeMatchSettings(','function snapshotMatchSettingsFromInputs(')+between('function snapshotMatchSettingsFromInputs(','\nfunction lobbySettingsPayload('),c);
 vm.runInContext('globalThis.snapshot=snapshotMatchSettingsFromInputs()',c);
 const start=between('        await set(ref(db, `rooms/${code}/game`), {','        const ownSpawn=roster[uid];');
 await vm.runInContext('(async()=>{const matchSettingsSnapshot=snapshot;'+start+'})()',c);
 for(const [id,value]of Object.entries(values))if(id.endsWith('Seconds'))assert.equal(stored.settings[id],value,file+' omitted '+id);
 assert.equal(stored.settings.samuraiCanVent,true);
 vm.runInContext(between('    const killCooldownFor =','    const SPEED ='),c);
 vm.runInContext('game.settings=snapshot;',c);
 const initial=between('        const initialRoleCooldown=','        saveLastMatchSettings(');
 c.initialClockSettings=stored.settings;
 vm.runInContext(initial,c);
 assert.equal(c.roster.a.readyAt,60000);assert.equal(c.roster.a.abilityReadyAt,60000);
 // A 40-second slash cannot overwrite the normal 10-second kill clock.
 c.initialClockSettings={...stored.settings,samuraiCooldownSeconds:40};c.roster={a:{role:'impostor',subrole:'samurai'}};
 vm.runInContext(initial.replace('const initialRoleCooldown=','globalThis.initialRoleCooldownAgain=').replace('initialRoleCooldown(player,','initialRoleCooldownAgain(player,'),c);
 assert.equal(c.roster.a.readyAt,60000);assert.equal(c.roster.a.abilityReadyAt,90000);
 vm.runInContext(between('const modCombatClamp=','function modCombatBeforeKill('),c);
 let g={phase:'play',settings:{killCooldownSeconds:10,samuraiCooldownSeconds:40},players:{a:{role:'impostor',subrole:'samurai',alive:true,readyAt:0,abilityReadyAt:0},b:{role:'crew',alive:true}}};
 c.modCombatAbility({g,p:g.players.a,actor:'a',loc:c.players.a,cmd:{ability:'samurai'},now:stamp,players:c.players,botPositions:{},setResult:ok=>assert(ok),markDirty:()=>{}});
 assert.equal(g.players.a.readyAt,60000);assert.equal(g.players.a.abilityReadyAt,90000);
 const normal=between('const doubleKillSlot=p.subrole===','\nif (cmd.type === "report"');
 vm.runInContext('globalThis.normalKill=function(g){const p=g.players.a,actor="a",cmd={type:"kill",target:"b"},loc=players.a;let dirty=false;for(const _ of [0]){'+normal+'}return g;}',c);
 for(let i=0;i<3;i++){
  stamp=70000+i*10000;g.players.b.alive=true;c.normalKill(g);assert.equal(g.players.a.readyAt,stamp+10000,'repeated normal kill must stay at 10 seconds');
 }
 const returning=between('              const actionStart=g.playStartsAt,shortActionLock=','              const reservedReturnSpawns=[];');
 g.playStartsAt=100000;g.players.a.readyAt=0;g.players.a.abilityReadyAt=0;c.g=g;
 vm.runInContext(returning,c);assert.equal(g.players.a.readyAt,110000);assert.equal(g.players.a.abilityReadyAt,140000);
 // Meeting respawns queue bare x/z poses, with no timestamp attached.
 const writes=[];c.session=1;c.code='1234';c.game={round:2};
 c.update=async(path,patch)=>writes.push({path,patch});c.console={warn:()=>{}};
 vm.runInContext(between('function compactPosePatch(','let publishBusy ='),c);
 vm.runInContext(between('let pendingBotPose={},','function syncCostumeColorToggle('),c);
 vm.runInContext('pendingBotPose={b:{x:1.23456,z:2},invalid:{x:NaN,z:1}};flushBotPose("1234");',c);await settle();
 assert.equal(writes.length,1);assert.equal(writes[0].patch['b/x'],1.235);assert.equal(writes[0].patch['b/updatedAt'],stamp);
 assert(!Object.values(writes[0].patch).some(v=>v===undefined||typeof v==='number'&&!Number.isFinite(v)));
 vm.runInContext('pendingBotPose={b:{x:1.23456,z:2}};flushBotPose("1234");',c);await settle();assert.equal(writes.length,1,'unchanged bots must not add traffic');
 vm.runInContext('pendingBotPose={b:{x:2,z:2,updatedAt:120000}};flushBotPose("1234");',c);await settle();assert.equal(writes[1].patch['b/updatedAt'],120000);
 assert(!source.includes('<div id="meetingStatusBar"'),'removed count HUD must not be created');
 c.uid='a';c.CENTER={x:0,z:0};c.matchResumePose=matchResumePose;c.readStored=()=>'';c.accountCostume='new-account-costume';
 c.serverTimestamp=()=>({'.sv':'timestamp'});c.THREE={Color:class{getHSL(){return {h:.8};}}};
 let lobbyPlacements=0;c.placeLobbyEntry=p=>{lobbyPlacements++;return {...p,x:99,z:99};};
 vm.runInContext(between('function applyAccountCostume(','let roomOperationBusy='),c);
 const profile={name:'試合中の名前',hue:.25,costume:'captain',x:13,z:-7},roundPlayer={name:'試合中の名前',hue:.25,costume:'captain',x:1,z:2,role:'impostor'};
 const restored=c.applyAccountCostume(profile,{},'a',roundPlayer);
 assert.equal(lobbyPlacements,0);assert.equal(restored.x,13);assert.equal(restored.z,-7);
 assert.equal(restored.costume,'captain');assert.equal(restored.name,profile.name);assert.equal(restored.hue,.25);assert(!('role'in restored));
 c.applyAccountCostume(profile,{},'a');assert.equal(lobbyPlacements,1,'ordinary lobby entries still use lobby placement');
 // Delayed browser timers may run after renderUI; neither order may expose a
 // map frame between the countdown list and the opaque personal reveal.
 c.clearTimeout=()=>{};c.roleRevealTimer=1;c.code='1234';c.game={phase:'play',round:2};
 let reveals=0;c.pendingRoleReveal={room:'1234',round:2,at:stamp+1,start:()=>reveals++};
 vm.runInContext(between('function flushPendingRoleReveal(','function showRoleReveal('),c);
 assert(!c.flushPendingRoleReveal());stamp++;assert(c.flushPendingRoleReveal());assert.equal(reveals,1);assert(!c.flushPendingRoleReveal());
 c.pendingRoleReveal={room:'old-room',round:2,at:0,start:()=>reveals++};assert(!c.flushPendingRoleReveal());assert.equal(c.pendingRoleReveal,null);assert.equal(reveals,1);
 console.log('PASS',file,'saved static settings, initial/repeated Samurai clocks, meeting reset, bare bot poses, no extra idle traffic, removed death HUD');
}
const live={x:13,z:-7,updatedAt:20000},spawn={x:1,z:2};
assert.deepEqual(matchResumePose(live,spawn,10000,{x:0,z:0}),{x:13,z:-7});
assert.deepEqual(matchResumePose({...live,updatedAt:1},spawn,10000,{x:0,z:0}),spawn);
assert.deepEqual(matchResumePose({...live,updatedAt:{'.sv':'timestamp'}},spawn,10000,{x:0,z:0}),{x:13,z:-7});
assert.deepEqual(matchResumePose({x:NaN,z:1},spawn,10000,{x:0,z:0}),spawn);
assert.deepEqual(matchResumePose({x:null,z:1},spawn,10000,{x:0,z:0}),spawn);
assert(repairableOwnPresence({id:'a',uid:'a',profile:{online:false,disconnectMode:'temporary'},connected:true}));
for(const override of [{id:'b'},{connected:false},{leaving:true},{disconnected:true},{profile:{online:false,disconnectMode:'left'}}])assert(!repairableOwnPresence({id:'a',uid:'a',profile:{online:false,disconnectMode:'temporary'},connected:true,...override}));
for(const text of ['ホストが接続していないため操作を処理できません。','ホストがコマンドを取得できません','Firebaseへの送信後、ホストの受信確認が届きませんでした。'])assert(isHostConnectionNotice(text));
assert(!isHostConnectionNotice('対象のシールドに防がれました。'));
console.log('PASS live-position resume, stale-profile fallback, old-connection race, retained leave/kick policy, suppressed host connection notices');
