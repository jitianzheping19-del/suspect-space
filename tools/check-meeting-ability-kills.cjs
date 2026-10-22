// Offline checks of the published host rules and per-view meeting event payloads.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../space-suspect-complete.html'),'utf8');
const helpers=html.slice(html.indexOf('function meetingAbilityPresentation('),html.indexOf('function post3DState('));
let serial=0;
const ctx={game:{players:{a:{name:'使用者'},b:{name:'対象'}}},ROLE_LABELS:{medic:['メディック']},now:()=>5000,
 roleBehaviorValue:(settings,id)=>settings?.[id]??false,
 clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),token:()=>`test-${serial++}`,setCommandResult:()=>{},forceScalePairAfterMeetingAbility:()=>{},
 matchAddedGuessRoles:()=>new Set(['medic','sheriff']),addedGuessRoleId:p=>p.subrole,
 resolveMeetingAbilityEjection:(g,id)=>{g.players[id].alive=false;}};
vm.createContext(ctx);vm.runInContext(helpers,ctx);
const event={id:'e',kind:'guess',actor:'a',target:'b',victims:['a'],success:false,reflect:true,roleGuess:'medic',at:4900};
for(const viewer of ['a','b']){
 const own=ctx.meetingAbilityPresentation({abilityKillEvents:[event]},viewer)[0];
 assert(own.private&&own.reflect&&own.actor==='a'&&own.privateText.includes('メディック'));
}
const witness=ctx.meetingAbilityPresentation({abilityKillEvents:[event]},'c')[0];assert.equal(witness.kind,'sniper');assert(!witness.private);
for(const field of ['actor','target','success','roleGuess','reflect','privateText'])assert(!(field in witness),`Witness received ${field}`);
assert.equal(ctx.meetingAbilityPresentation({abilityKillEvents:[event]},'a',15000).length,0);
const g={meeting:{},players:{a:{alive:false},b:{alive:true}}};
for(let i=0;i<30;i++)ctx.appendMeetingAbilityKill(g,{...event,id:'e'+i,victims:['a','a','b']});
assert.equal(g.meeting.abilityKillEvents.length,16);assert.deepEqual(Array.from(g.meeting.abilityKillEvents[0].victims),['a']);assert.equal(g.meeting.abilityResolveUntil,8500);
const eligibility=html.slice(html.indexOf('function isMeetingSheriffKillable('),html.indexOf('\n',html.indexOf('function isMeetingSheriffKillable(')));
const start=html.indexOf('if(g.phase==="meeting"&&cmd.type==="meetingSheriff")'),end=html.indexOf('if(cmd.type==="spawnTeleport")',start);
vm.runInContext(eligibility+'\nfunction testCommand(g,cmd){let dirty=false;const actor="a",p=g.players.a;for(const _ of [0]){'+html.slice(start,end)+'}return g;}',ctx);
const newGame=(role='crew',ability='meetingSheriff')=>({phase:'meeting',round:1,meeting:{id:'m',endsAt:9000},settings:{meetingSheriffMisfire:'both'},players:{a:{alive:true,subrole:ability,role:'crew'},b:{alive:true,subrole:'medic',role}}});
let state=newGame();ctx.testCommand(state,{type:'meetingSheriff',target:'b'});
assert(!state.players.a.alive&&state.players.b.alive,'A civilian survives the reflected sheriff shot');assert(state.meeting.abilityKillEvents[0].reflect);
state=newGame('impostor');ctx.testCommand(state,{type:'meetingSheriff',target:'b'});assert(state.players.a.alive&&!state.players.b.alive);assert(!state.meeting.abilityKillEvents[0].reflect);
for(const role of ['guesser','evilGuesser'])for(const correct of [true,false]){
 state=newGame('crew',role);ctx.testCommand(state,{type:'guess',target:'b',roleGuess:correct?'medic':'sheriff'});
 assert.equal(state.players.a.alive,correct);assert.equal(state.players.b.alive,!correct);assert.equal(state.meeting.abilityKillEvents[0].reflect,!correct);
}
state=newGame();state.players.a.meetingSheriffKillsUsed=3;ctx.testCommand(state,{type:'meetingSheriff',target:'b'});assert(state.players.a.alive&&state.players.b.alive&&!state.meeting.abilityKillEvents);
console.log('PASS: private presentation, anonymous witnesses, bounded events, sheriff hit/ricochet, both guessers, rejected command');
// Test the actual microphone policy with a captured audio track and no network.
{
 const track={enabled:true},timers=new Map(),reveal={visible:false};let timer=0;
 const voice={$:()=>({classList:{contains:()=>!reveal.visible}}),uid:'u',code:'1234',session:1,game:{phase:'meeting',players:{u:{alive:false}}},voiceStream:{getAudioTracks:()=>[track]},voiceJoined:true,voiceMuted:false,voiceSpeaking:true,connected:true,voiceRoomIsEnabled:()=>true,publishVoicePresence:()=>Promise.resolve(),setTimeout:fn=>{timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id),console};
 vm.createContext(voice);vm.runInContext(html.slice(html.indexOf('let deathAnimationVoiceMute=null;'),html.indexOf('window.__ssVoiceCameraViewChanged=')),voice);
 voice.beginDeathAnimationVoiceMute('pending');assert(track.enabled&&!voice.voiceSpeaking);
 voice.beginDeathAnimationVoiceMute('meeting-ability');assert.equal(timers.size,1);voice.endDeathAnimationVoiceMute('world');assert(track.enabled);
 voice.voiceMuted=true;voice.endDeathAnimationVoiceMute('meeting-ability');assert(!track.enabled);
 voice.voiceMuted=false;voice.beginDeathAnimationVoiceMute('world');voice.endDeathAnimationVoiceMute('world');assert(track.enabled);
 voice.beginDeathAnimationVoiceMute('pending');voice.session=2;voice.syncVoiceMutePolicy();assert(track.enabled);
 voice.endDeathAnimationVoiceMute();voice.game.players.u.alive=true;voice.beginDeathAnimationVoiceMute('world');assert(track.enabled);
 voice.game.phase='play';reveal.visible=true;voice.syncVoiceMutePolicy();assert(!track.enabled);reveal.visible=false;voice.syncVoiceMutePolicy();assert(track.enabled);
 console.log('PASS: role reveal only forced mute, preserved manual mute and unrestricted meeting/death voice');
}
