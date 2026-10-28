import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createExpansionRoleRules,expansionKillCooldown,expansionKillRange,madJesterVoteWin,isTimeFrozen,EXPANSION_ROLES} from '../oct28-role-rules.js';
import {capGhostTasks,collectNewMeetingDeaths,syncMeetingPresence,finishMeetingReconnects,meetingMemorialDuration} from '../oct28-meeting-rules.js';
import {foxShieldVisible} from '../fox-shield.js';

let stamp=100000,serial=0,checks=0;
const test=(name,run)=>{run();checks++;console.log('PASS',name);};
const player=(subrole='crewmate',role='crew',extra={})=>({name:subrole,role,subrole,alive:true,x:0,z:0,assignedTasks:['a','b','c','d'],tasks:{a:true},...extra});
function fixture(role,side='impostor',settings={}){
 const g={phase:'play',settings,players:{a:player(role,side),b:player(),c:player()},bodies:{}};
 let last;
 const rules=createExpansionRoleRules({clock:()=>stamp,token:()=>String(++serial),pose:(state,id)=>state.players[id],wallBetween:()=>false,kill:(state,id,by,loc,options={})=>{
  const victim=state.players[id];if(!victim?.alive)return false;
  if(rules.beforeDeath({g:state,victimId:id,killerId:by,victim,killer:state.players[by],location:loc,options,cause:options.cause||'killed'})?.blocked)return false;
  victim.alive=false;victim.deathAt=stamp;state.bodies[id]={...loc};rules.afterKill({g:state,killer:state.players[by],cause:options.cause||'killed'});return true;
 },killCooldown:p=>expansionKillCooldown(p,g.settings,30000),emit:(state,type,by,data)=>(state.events||=[]).push({type,by,...data}),random:()=>0});
 const use=(ability,extra={},id='a')=>{last=null;const handled=rules.ability({g,actor:id,p:g.players[id],cmd:{ability,...extra},setResult:(ok,text)=>{last={ok,text};}});return{handled,...last};};
 return{g,rules,use};
}
test('all requested named roles registered',()=>assert.equal(Object.keys(EXPANSION_ROLES).length,8));
test('overloader reveals, strengthens, restores and obeys cooldown',()=>{
 const{g,rules,use}=fixture('overloader');assert(use('overloader').ok);assert(g.players.a.overloaded);assert.equal(expansionKillRange(g.players.a),5);assert.equal(expansionKillCooldown(g.players.a,{},30000),15000);assert.equal(use('overloader').ok,false);stamp+=3000;assert(use('overloader').ok);assert(!g.players.a.overloaded);assert.equal(use('overloader').ok,false);rules.meeting({g});assert(!g.players.a.overloaded);
});
test('abilities reject wrong role, vent use and meeting return lock',()=>{
 const{g,use}=fixture('cracker');assert.equal(use('freezer').ok,false);g.players.a.ventId='vent';assert.equal(use('crackBody',{bodyId:'x'}).ok,false);delete g.players.a.ventId;g.players.a.meetingActionReadyAt=stamp+1000;assert.equal(use('crackBody',{bodyId:'x'}).ok,false);
});
test('cracker leaves unreportable corpse or a trace',()=>{
 for(const remove of [false,true]){const{g,use}=fixture('cracker','impostor',{crackerRemoveBody:remove});g.bodies.dead={x:0,z:1};assert(use('crackBody',{bodyId:'dead'}).ok);assert(remove?g.crackTraces.dead: g.bodies.dead.unreportable);if(remove)assert(!g.bodies.dead);}
});
test('missionary doom survives its caster and kills only once',()=>{
 const{g,rules,use}=fixture('missionary','neutral',{missionaryMinSeconds:10});assert(use('missionary',{target:'b'}).ok);g.players.a.alive=false;stamp+=10000;assert(rules.tick({g}));assert(!g.players.b.alive);assert(!g.players.b.missionaryDoom);assert(!rules.tick({g}));
});
test('bodyguard sacrifices the guard, protects the target, persists across meeting',()=>{
 const{g,rules,use}=fixture('bodyguard','crew');assert(use('bodyguard',{target:'b'}).ok);rules.meeting({g});const decision=rules.beforeDeath({g,victimId:'b',killerId:'c',victim:g.players.b,killer:g.players.c,location:{x:0,z:0},cause:'killed'});assert(decision.blocked);assert(!g.players.a.alive);assert(g.players.b.alive);
});
test('fox blocks impostor attacks and shield is visible to both participants only',()=>{
 const{g,rules}=fixture('impostor');g.players.b.subrole='fox';const ctx={g,victimId:'b',killerId:'a',victim:g.players.b,killer:g.players.a,location:{x:0,z:0},cause:'killed'};assert(rules.beforeDeath(ctx).blocked);assert(foxShieldVisible(g,'b','a',stamp));assert(foxShieldVisible(g,'b','b',stamp));assert(!foxShieldVisible(g,'b','c',stamp));assert(!rules.beforeDeath({...ctx,options:{ignoreDefenses:true}}));assert(!rules.beforeDeath({...ctx,killer:{role:'jackal'}}));stamp+=1800;rules.tick({g});assert(!foxShieldVisible(g,'b','a',stamp));
});
test('sandworm ambush requires vent and pauses cooldown even across delayed ticks',()=>{
 const{g,rules,use}=fixture('sandworm');assert(!use('sandwormAmbush',{target:'b'}).ok);g.players.a.ventId='vent';assert(use('sandwormAmbush',{target:'b'}).ok);assert(!g.players.b.alive);delete g.players.a.ventId;const remaining=g.players.a.readyAt-stamp;stamp+=remaining+5000;rules.tick({g});assert.equal(g.players.a.readyAt-stamp,remaining);g.players.a.ventId='vent';stamp+=1000;rules.tick({g});assert.equal(g.players.a.readyAt-stamp,remaining-1000);
});
test('eater cancels lost contact, consumes corpses and pierces defenses',()=>{
 const{g,rules,use}=fixture('eater','neutral',{eaterSwallowSeconds:1});assert(use('eaterSwallow',{target:'b'}).ok);g.players.b.x=20;stamp+=1000;rules.tick({g});assert(!g.players.a.eaterSwallow);assert(g.players.b.alive);g.bodies.dead={x:0,z:0};assert(use('eaterCorpse',{bodyId:'dead'}).ok);assert(!g.bodies.dead);stamp+=40000;g.players.b.x=0;g.players.b.subrole='fox';assert(use('eaterSwallow',{target:'b'}).ok);stamp+=2000;rules.tick({g});assert(!g.players.b.alive);assert(!g.bodies.b);assert.equal(g.players.a.eaterMeals,2);
});
test('freezer stops every living player for exactly five seconds',()=>{
 const{g,rules,use}=fixture('freezer');assert(use('freezer').ok);assert.equal(g.freeze.by,'a');assert(isTimeFrozen(g,stamp));assert(!use('freezer').ok);stamp+=4999;assert(isTimeFrozen(g,stamp));stamp++;rules.tick({g});assert(!isTimeFrozen(g,stamp));assert.equal(g.freeze,undefined);
});
test('mad jester enforces its task option and wins for impostors',()=>{
 const{g,rules}=fixture('madJester','crew',{madJesterRequiresTasks:true,madJesterRequiredTasks:2});assert(!madJesterVoteWin(g,g.players.a));g.players.a.tasks.b=true;assert(madJesterVoteWin(g,g.players.a));g.madJesterWinner='a';assert(rules.win({g}));assert.equal(g.winner,'impostor');
});
test('eater and missionary have separate neutral victory conditions',()=>{
 const{g,rules}=fixture('eater','neutral');g.players.a.eaterMeals=3;assert(rules.win({g}));assert.equal(g.winner,'eater');const f=fixture('missionary','neutral');f.g.players.c.alive=false;assert(f.rules.win({g:f.g}));assert.equal(f.g.winner,'missionary');
});
test('jackal creates one allied sidekick, discards former tasks and powers',()=>{
 const{g,use}=fixture('jackal','jackal');g.players.b.missionaryDoom={at:0};g.players.b.shielded=true;assert(use('createSidekick',{target:'b'}).ok);assert.equal(g.players.b.role,'jackal');assert.equal(g.players.b.subrole,'jackalSidekick');assert.equal(g.players.b.jackalLeaderId,'a');assert.deepEqual(g.players.b.assignedTasks,[]);assert(!g.players.b.shielded&&!g.players.b.missionaryDoom);assert(!use('createSidekick',{target:'c'}).ok);assert(!use('createSidekick',{target:'c'},'b').handled);
});
test('sidekick promotes only after all leaders die and cannot recruit by default',()=>{
 const{g,rules,use}=fixture('jackal','jackal');assert(use('createSidekick',{target:'b'}).ok);rules.tick({g});assert.equal(g.players.b.subrole,'jackalSidekick');g.players.a.disconnected=true;rules.tick({g});assert.equal(g.players.b.subrole,'jackalSidekick');g.players.a.alive=false;rules.tick({g});assert.equal(g.players.b.subrole,'jackal');assert(g.players.b.readyAt>stamp);assert(!use('createSidekick',{target:'c'},'b').ok);
});
test('promotion can allow one new sidekick when configured',()=>{
 const{g,rules,use}=fixture('jackal','jackal',{jackalPromotedCanRecruit:true});assert(use('createSidekick',{target:'b'}).ok);g.players.a.alive=false;rules.tick({g});assert.equal(g.players.b.subrole,'jackal');assert(use('createSidekick',{target:'c'},'b').ok);assert.equal(g.players.c.subrole,'jackalSidekick');
});
test('ghost assignments cap at two while retaining completed progress',()=>{
 const p=player('crewmate','crew',{alive:false,tasks:{c:true}});assert(capGhostTasks(p));assert.deepEqual(p.assignedTasks,['c','a']);assert(!capGhostTasks(p));assert(!capGhostTasks(player()));assert(!capGhostTasks(player('crewmate','crew',{alive:false,assignedTasks:['a','b']})));
});
test('meeting retains disconnected player past grace and announces one return',()=>{
 const g={phase:'meeting',meeting:{id:'meeting'},players:{a:player()}},profiles={a:{online:false,updatedAt:stamp}},missingSince=new Map(),options={missingSince,token:()=>String(++serial)};
 assert(syncMeetingPresence(g,profiles,stamp,options));assert(g.players.a.disconnected);assert(g.players.a.alive);stamp+=60000;syncMeetingPresence(g,profiles,stamp,options);assert(g.players.a.alive);profiles.a.online=true;assert(syncMeetingPresence(g,profiles,stamp,options));assert(!g.players.a.disconnected);assert.equal(g.meeting.chat.length,1);assert.match(g.meeting.chat[0].text,/復帰しました/);syncMeetingPresence(g,profiles,stamp,options);assert.equal(g.meeting.chat.length,1);
});
test('offline meeting death stays dead on reconnect; scales preserve reconnect',()=>{
 const g={phase:'meeting',meeting:{id:'one'},players:{a:player()}},profiles={a:{online:false}},options={missingSince:new Map()};syncMeetingPresence(g,profiles,stamp,options);g.players.a.alive=false;g.meeting={id:'two',previousId:'one'};profiles.a.online=true;syncMeetingPresence(g,profiles,stamp,options);assert(!g.players.a.alive);assert.match(g.meeting.chat[0].text,/復帰しました/);
});
test('meeting finish and explicit leave retire players still disconnected',()=>{
 for(const explicit of [false,true]){const g={phase:'meeting',meeting:{id:'one'},players:{a:player()}},profiles={a:{online:false,disconnectMode:explicit?'left':'temporary'}};syncMeetingPresence(g,profiles,stamp);if(!explicit){assert(g.players.a.alive);finishMeetingReconnects(g);}assert(!g.players.a.alive);assert(!g.players.a.connectionSuspended);}
});
test('play disconnect retains assignments and recovers before grace',()=>{
 const g={phase:'play',players:{a:player()}},profiles={a:{online:false}},options={missingSince:new Map()};const assigned=[...g.players.a.assignedTasks];syncMeetingPresence(g,profiles,stamp,options);assert(g.players.a.disconnected);profiles.a.online=true;syncMeetingPresence(g,profiles,stamp+500,options);assert(!g.players.a.disconnected);assert.deepEqual(g.players.a.assignedTasks,assigned);
});
test('memorial distinguishes prior deaths and repeated deaths after revival',()=>{
 const g={players:{a:player('crewmate','crew',{alive:false,deathAt:10,costume:'premium-abyssdiver'}),b:player('crewmate','crew',{alive:false,deathAt:20})}};let d=collectNewMeetingDeaths(g);assert.deepEqual(d.map(p=>p.id),['a','b']);assert.equal(d[0].costume,'premium-abyssdiver');assert.deepEqual(collectNewMeetingDeaths(g),[]);g.players.a.deathAt=30;d=collectNewMeetingDeaths(g);assert.deepEqual(d.map(p=>p.id),['a']);assert(meetingMemorialDuration([{},{},{}])>meetingMemorialDuration([{}]));assert.equal(meetingMemorialDuration([]),1500);
});
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const section=(from,to)=>{const a=source.indexOf(from),b=source.indexOf(to,a+from.length);assert(a>=0&&b>a);return source.slice(a,b);};
const tasks=new Function('game',section('function roleCanDoTasks(','function aliveLoverPairs(')+';return {roleCanDoTasks,taskCounts};')({settings:{}});
test('actual victory check includes sidekicks in jackal faction parity',()=>{
 const win=new Function('now','runModRoleHooks','taskCounts','aliveLoverPairs','const players={},botPositions={};'+section('function checkWin(g)','function applyEndgameRoleWins(')+';return checkWin;')(()=>stamp,()=>false,tasks.taskCounts,()=>[]);
 const g={phase:'play',settings:{},players:{a:player('jackal','jackal'),b:player('jackalSidekick','jackal'),c:player(),d:player()}};assert(win(g));assert.equal(g.winner,'jackal');g.phase='play';g.players.d.role='impostor';assert(!win(g),'another killer faction blocks jackal victory');
});
test('actual task counter removes disconnected assignments and restores them',()=>{
 const g={settings:{},players:{a:player(),b:player()}};assert.deepEqual(tasks.taskCounts(g),{done:2,total:8});g.players.b.disconnected=true;assert.deepEqual(tasks.taskCounts(g),{done:1,total:4});g.players.b.disconnected=false;assert.deepEqual(tasks.taskCounts(g),{done:2,total:8});g.players.a.alive=false;capGhostTasks(g.players.a);assert.deepEqual(tasks.taskCounts(g),{done:2,total:6});g.players.b.subrole='madJester';assert.deepEqual(tasks.taskCounts(g),{done:1,total:2});assert(!source.includes('id="taskHudCount"'));
});
test('actual meeting start snapshots new deaths and clears every corpse',()=>{
 const profiles={a:{x:0,z:0,online:true}},begin=new Function('now','token','clamp','killPresentationBlocksPlayer','releaseVent','players','distance','wallBetween','collectNewMeetingDeaths','meetingMemorialDuration','runModRoleHooks','appendMeetingDeathNotice','const botPositions={},code="test";'+section('function beginMeeting(','function isMiniPlayer(')+';return beginMeeting;')(()=>stamp,()=>String(++serial),(n,a,b)=>Math.max(a,Math.min(b,n)),()=>false,()=>{},profiles,(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),()=>false,collectNewMeetingDeaths,meetingMemorialDuration,()=>{},()=>{});
 for(const reason of ['遺体を発見','緊急会議']){
  const g={phase:'play',players:{a:player(),b:player('crewmate','crew',{alive:false,deathAt:50}),c:player('crewmate','crew',{alive:false,deathAt:60})},settings:{meetingSeconds:60},bodies:{b:{x:0,z:1,name:'dead'},c:{x:99,z:99,name:'remote'},fake:{x:9,z:9,fake:true}}};
  assert(begin(g,'a',reason));assert.deepEqual(g.bodies,{});assert.deepEqual(g.meeting.newDeaths.map(p=>p.id),['b','c']);assert(g.meeting.presentationEndsAt<=g.meeting.votingAt);if(reason==='遺体を発見')assert.equal(g.meeting.body.name,'dead');g.phase='play';assert(begin(g,'a','緊急会議'));assert.deepEqual(g.meeting.newDeaths,[]);
 }
});
console.log(`${checks} role, meeting, reconnect, shield and task scenarios passed.`);
