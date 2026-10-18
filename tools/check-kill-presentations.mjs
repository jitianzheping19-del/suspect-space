import assert from 'node:assert/strict';
import {registerDeathPlayback,registerWinningPlayback,presentationReadyAt,killPresentationActive,completeKillPlayback,victoryPresentationAt} from '../kill-presentation-state.js';
const state=()=>({round:7,phase:'play',players:{a:{role:'impostor',alive:true,subrole:'impostor'},b:{role:'crew',alive:false,deathAt:1000},c:{role:'crew',alive:false,deathAt:1200}}});
let g=state();assert(registerDeathPlayback(g,{killer:'a',victim:'b',cause:'killed'},1000));assert(killPresentationActive(g,6000),'Wait for actual completion, beyond nominal duration');assert(!completeKillPlayback(g,'a','1000',6000),'Another player cannot acknowledge a victim');assert(!completeKillPlayback(g,'b','wrong',6000));assert(completeKillPlayback(g,'b','1000',6000));assert(!killPresentationActive(g,6000));
g=state();registerDeathPlayback(g,{killer:'a',victim:'b'},1000);registerDeathPlayback(g,{killer:'a',victim:'c'},1200);completeKillPlayback(g,'b','1000',6500);assert(killPresentationActive(g,6500));completeKillPlayback(g,'c','1200',7200);assert(!killPresentationActive(g,7200));
g=state();registerDeathPlayback(g,{killer:'a',victim:'b'},1000);assert(!killPresentationActive(g,16000),'Offline victim cannot lock game forever');g.phase='ended';g.endedAt=1200;assert.equal(victoryPresentationAt(g),16000);
g=state();registerDeathPlayback(g,{killer:'a',victim:'b'},1000);g.players.b.disconnected=true;assert(!killPresentationActive(g,6000));g.phase='meeting';assert(!killPresentationActive(g,1100));
g=state();g.players.a.subrole='arsonist';g.players.b.deathCause='arsonist';registerDeathPlayback(g,{killer:'a',victim:'b'},1000);g.phase='ended';g.winner='arsonist';g.endedAt=1000;assert(registerWinningPlayback(g,1100));assert(!registerWinningPlayback(g,1200),'Winning animation only registered once');completeKillPlayback(g,'b','1000',5600);assert(killPresentationActive(g,5600),'Wait for winning arsonist too');assert.equal(g.killPresentation.pending.c.kind,'victory','Earlier ghosts also see the winning ignition');assert(completeKillPlayback(g,'c','victory:7:arsonist',6400));assert(completeKillPlayback(g,'a','victory:7:arsonist',6500));assert(!killPresentationActive(g,6500));assert.equal(victoryPresentationAt(g),6500);
g=state();g.players.b.bot=true;registerDeathPlayback(g,{killer:'a',victim:'b'},1000);delete g.killPresentation.pending;registerDeathPlayback(g,{killer:'a',victim:'c'},1200);assert(g.killPresentation.pending.c,'A Firebase snapshot may omit an empty pending map');
g=state();registerDeathPlayback(g,{killer:'a',victim:'b'},1000);assert(!completeKillPlayback(g,'b','1000',17000),'A late acknowledgement cannot extend an expired presentation');
g=state();g.phase='ended';g.winner='crew';assert(!registerWinningPlayback(g,1000));assert.equal(presentationReadyAt(g),0);console.log('PASS: final kill completion, multi-victim wait, actor-bound acknowledgements, timeout/disconnect, round/phase scope, arsonist winning playback and lobby deadline');

// Exercise the actual host gate and victory dispatcher, not just the state helpers.
const {readFileSync}=await import('node:fs');
const vm=await import('node:vm');
const html=readFileSync(new URL('../space-suspect-complete.html',import.meta.url),'utf8');
let outcomes=[],executed=[];
const context={now:()=>6000,completeKillPlayback,killPresentationActive,setCommandResult:(g,actor,cmd,accepted)=>outcomes.push({actor,type:cmd.type,accepted}),executed};
vm.createContext(context);
const gateStart=html.indexOf('          if(cmd.type==="killPlaybackDone")');
const gateEnd=html.indexOf('          if(cmd.type==="waitLobby")',gateStart);
vm.runInContext('function hostGate(g,actor,cmd){let dirty=false;for(const _ of [0]){'+html.slice(gateStart,gateEnd)+'executed.push(cmd.type);}}',context);
g=state();registerDeathPlayback(g,{killer:'a',victim:'b'},1000);
for(const type of ['report','emergency','kill','bite','ability','sabotage','task','ventEnter'])context.hostGate(g,'a',{type});
assert.equal(executed.length,0,'No gameplay command executes during a cinematic');
context.hostGate(g,'b',{type:'killPlaybackDone',target:'1000'});
assert(!killPresentationActive(g,6000));context.hostGate(g,'a',{type:'report'});assert.deepEqual(executed,['report']);
const victoryStart=html.indexOf('function victoryCheck(g)');
const victoryEnd=html.indexOf('function showVictory(',victoryStart);
let waiting=true,victories=0;
const victoryContext={lastVictoryKey:'',waitForKillPresentation:()=>waiting,showVictory:()=>victories++};
vm.createContext(victoryContext);vm.runInContext(html.slice(victoryStart,victoryEnd),victoryContext);
const ended={phase:'ended',round:1,winner:'impostor',reason:'final kill'};
victoryContext.victoryCheck(ended);assert.equal(victories,0);assert.equal(victoryContext.lastVictoryKey,'');
waiting=false;victoryContext.victoryCheck(ended);victoryContext.victoryCheck(ended);assert.equal(victories,1,'Victory is shown once after playback finishes');
console.log('PASS: real host action gate and deferred, deduplicated victory dispatch');

// Bots keep following their route without reporting or taking another action.
const botStart=html.indexOf('function runBots(g) {'),botEnd=html.indexOf('/* PUBLIC_MEETING_EVIDENCE_V1 */',botStart);
const bot={bot:true,alive:true,x:0,z:0,assignedTasks:['task'],tasks:{}};
g=state();g.players.bot=bot;registerDeathPlayback(g,{killer:'a',victim:'b'},1000);
const botContext={now:()=>6000,botLastMove:0,BOT_MOVE_INTERVAL_MS:150,SPEED:5,killPresentationActive,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),distance:(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),collision:()=>false,
 botBrains:new Map([['bot',{round:g.round,path:[{x:3,z:0}],personality:{}}]]),
 beginMeeting:()=>{throw new Error('Bot reported during a cinematic');},recordDeath:()=>{throw new Error('Bot attacked during a cinematic');}};
vm.createContext(botContext);vm.runInContext(html.slice(botStart,botEnd),botContext);
const result=botContext.runBots(g);assert(bot.x>0);assert(result.moved.bot);assert.deepEqual(bot.tasks,{});
console.log('PASS: bots continue movement without actions during playback');
