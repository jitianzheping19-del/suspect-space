import {madJesterVoteWin} from '../oct28-role-rules.js';
import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
const source=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const helper=source.slice(source.indexOf('function isMiniPlayer('),source.indexOf('function isImpostorTeamPlayer('));
const ejection=source.slice(source.indexOf('function resolveVoteEjection('),source.indexOf('function finishMeeting('));
const roleCanDoTasks=source.slice(source.indexOf('function roleCanDoTasks('),source.indexOf('function taskCounts('));
const api=new Function('madJesterVoteWin','markPlayerEjected','token','now','randomInt','roleBehaviorValue','game',helper+ejection+roleCanDoTasks+';return {isMiniPlayer,resolveVoteEjection,resolveMeetingAbilityEjection,roleCanDoTasks};')(madJesterVoteWin,(g,id)=>{g.players[id].alive=false;return[id]},()=> 'test',()=>100,()=>0,()=>false,{settings:{}});
for(const role of ['crew','impostor']){const p={mini:true,role,subrole:role==='impostor'?'doubleKiller':'sheriff',alive:true};const g={players:{mini:p}};assert(api.isMiniPlayer(p));api.resolveVoteEjection(g,'mini');assert.equal(g.miniLoss,'mini');assert.equal(p.subrole,role==='impostor'?'doubleKiller':'sheriff','main ability retained');}
const g={players:{old:{subrole:'mini',role:'crew',alive:true}}};assert(api.isMiniPlayer(g.players.old));api.resolveMeetingAbilityEjection(g,'old','shot');assert.equal(g.miniLoss,undefined,'meeting ability kill is not a vote win');
assert(api.roleCanDoTasks({role:'crew',alive:false,subrole:'sheriff'}));assert(!api.roleCanDoTasks({role:'impostor',subrole:'impostor',alive:true}));assert(!api.roleCanDoTasks({role:'impostor',subrole:'revenant',alive:false}));
console.log('PASS: mini on both factions, original role retained, legacy mini, vote-only win and ghost crew tasks');
