import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync('index.html','utf8');
const context=vm.createContext({now:()=>100000,players:{},botPositions:{},runModRoleHooks:()=>false,taskCounts:g=>g.taskSummary||{done:0,total:0}});
const from=source.indexOf('function aliveLoverPairs(g)'),to=source.indexOf('// Cached navigation lattice;',from);
vm.runInContext(source.slice(from,to),context);
const player=(subrole='crewmate',extra={})=>({alive:true,role:subrole==='impostor'?'impostor':subrole==='jackal'?'jackal':'crew',subrole,assignedTasks:['a'],tasks:{},...extra});
const cases=[];
function test(name,g,expected){assert(context.checkWin(g),name);assert.equal(g.winner,expected,name);const once=JSON.stringify(g);context.applyEndgameRoleWins(g);assert.equal(JSON.stringify(g),once,'finalization must be idempotent: '+name);cases.push(name);}
test('impostor parity takes priority over simultaneous task completion',{phase:'play',settings:{},players:{a:player('impostor'),b:player()},taskSummary:{done:1,total:1}},'impostor');
test('crew elimination wins with no hostile survivor',{phase:'play',settings:{},players:{a:player(),b:player('impostor',{alive:false})}},'crew');
test('tasks can finish before parity',{phase:'play',settings:{},players:{a:player('impostor'),b:player(),c:player()},taskSummary:{done:2,total:2}},'crew');
for(const base of ['crew','impostor','jackal'])for(const combination of ['lovers-god-fox','god-fox','fox','unqualified-god-fox']){
 const rows={a:player(base==='crew'?'crewmate':base),god:player('god',{role:'neutral',tasks:combination==='unqualified-god-fox'?{}:{a:true}}),fox:player('fox',{role:'neutral'})};
 if(combination==='fox')delete rows.god;
 if(combination.startsWith('lovers')){rows.l1=player('crewmate',{lover:true,loverPairId:'pair'});rows.l2=player('crewmate',{lover:true,loverPairId:'pair'});}
 const g={phase:'ended',winner:base,settings:{godNeedsTasks:true},players:rows};
 assert(context.applyEndgameRoleWins(g));assert.equal(g.winner,combination.startsWith('lovers')?'lovers':combination==='god-fox'?'god':'fox');
 assert(!context.applyEndgameRoleWins(g));cases.push(base+' / '+combination);
}
for(const winner of ['jester','mini-loss','arsonist','vulture','eater','missionary','waveSolo','waveTeam','waveDraw']){
 const g={phase:'ended',winner,settings:{godNeedsTasks:false},players:{g:player('god'),f:player('fox'),l1:player('crewmate',{lover:true,loverPairId:'p'}),l2:player('crewmate',{lover:true,loverPairId:'p'})}};
 assert(!context.applyEndgameRoleWins(g));assert.equal(g.winner,winner);cases.push('explicit '+winner+' is final');
}
for(const extra of [{disconnected:true},{observer:true},{alive:false}]){
 const g={phase:'ended',winner:'crew',settings:{godNeedsTasks:false},players:{g:player('god',extra),f:player('fox',extra)}};
 assert(!context.applyEndgameRoleWins(g));assert.equal(g.winner,'crew');
}
const held={phase:'meeting',settings:{},meeting:{id:'m',abilityResolveUntil:100001},players:{a:player()}};assert(!context.checkWin(held));held.meeting.abilityResolveUntil=0;held.players.a.connectionSuspended=true;held.players.a.reconnectMeetingId='m';assert(!context.checkWin(held));
console.log('PASS',cases.length,'victory combinations, explicit outcomes, excluded participants, meeting holds and idempotent finalization');
