// Injected only by check-all-roles.cjs; exercises the shipped host transaction.
window.__allRolesQA=(()=>{
 const rows=[],check=(v,m)=>{if(!v)throw Error(m);},copy=v=>JSON.parse(JSON.stringify(v));let clock=Date.now(),serial=0;
 const realDateNow=Date.now;Date.now=()=>clock;
 function prepare(id){
  hostBusy=true;hostTickPending=false;uid='qa';hostId=uid;code='5291';connected=true;db={};serverOffset=0;botPositions={};commands={};privateBallots={};missingSince.clear();
  const option=ROLE_OPTIONS.find(r=>r.id===id),side=option?.side;
  const role=['jackal','teleportJackal','waveCannonJackal','jackalSidekick'].includes(id)?'jackal':side==='impostor'&&!['madmate'].includes(id)?'impostor':side==='neutral'?'neutral':'crew';
  let spot=SPAWN_POINTS.find(p=>!collision(p.x,p.z)&&!collision(p.x+.7,p.z)&&!wallBetween(p,{x:p.x+.7,z:p.z}))||SPAWN_POINTS[0];
  position={...spot};players={};const roster={};
  for(const [i,key] of ['qa','b','enemy','c','d','e','f','g','h','i','j','dead'].entries()){
   const x=spot.x+(key==='b'?.7:key==='enemy'?1.4:key==='dead'?.8:8+i*.15),z=spot.z;
   players[key]={name:key,hue:i*.07,costume:'standard',online:true,x:key==='qa'?spot.x:x,z,updatedAt:clock};
   roster[key]={...players[key],role:key==='enemy'?'impostor':'crew',subrole:key==='enemy'?'impostor':'crewmate',alive:key!=='dead',disconnected:false,observer:false,assignedTasks:[TASKS[0].id,TASKS[1].id,TASKS[2].id],tasks:{},readyAt:0,abilityReadyAt:0};
  }
  Object.assign(roster.qa,{role,subrole:id,alive:!['guardianAngel','mirage','revenant'].includes(id)});if(id==='impostor')roster.qa.role='impostor';if(id==='mirage')roster.qa.role='impostor';
  roster.dead.deathAt=clock-1000;
  game={phase:'play',round:1,revision:0,startedAt:clock-50000,playStartsAt:clock-40000,countdownEndsAt:clock-40000,turnStartedAt:clock-40000,meetingCount:1,settings:{mapMode:'classic',viewMode:'2d',waveMode:'normal',roles:{},killCooldownSeconds:30,voiceEnabled:false},players:roster,bodies:{dead:{...players.dead,dissolveAt:0}},souls:{},deathRecords:{dead:{at:clock-1000,name:'dead',locations:{}}}};
  window.__qaWrites=[];window.__qaDatabase={rooms:{'5291':{hostId:uid,players:copy(players),game:copy(game)}}};
  for(const el of document.querySelectorAll('[aria-modal=true]'))el.classList.add('hidden');show('setup',false);show('nameGate',false);show('roleReveal',false);
  return game.players.qa;
 }
 async function tick(command=null,by='qa',advance=0){
  clock+=advance;for(const p of Object.values(players))p.updatedAt=clock;
  const cmd=command?{id:'qa-'+(++serial),uid:by,at:clock,round:game.round,phase:game.phase,meetingId:game.meeting?.id||'',...command}:null;
  commands=cmd?{[by]:cmd}:{};window.__qaDatabase.rooms['5291'].game=copy(game);window.__qaDatabase.rooms['5291'].players=copy(players);
  hostTickPending=false;hostBusy=false;await hostTick();hostBusy=true;hostTickPending=false;
  game=copy(window.__qaDatabase.rooms['5291'].game);commands={};return cmd?game.commandResults?.[by]:game;
 }
 function meeting(){game.phase='meeting';game.meeting={id:'qa-meeting-'+serial,startedAt:clock-10000,presentationEndsAt:clock-9000,votingAt:clock-5000,endsAt:clock+120000,chat:[],ghostChat:[],voted:{},rosterOrder:Object.keys(game.players),rosterAliveOrder:Object.keys(game.players).filter(id=>game.players[id].alive)};}
 const ability=(ability,extras={})=>({type:'ability',ability,...extras});
 async function run(id,title,fn){try{prepare(id);await fn();rows.push({id,title,passed:true});}catch(error){rows.push({id,title,passed:false,error:error.message,result:game.commandResults?.qa});}}
 async function action(id,cmd,predicate,setup=()=>{},title='host command and observer rejection'){
  await run(id,title,async()=>{setup();const r=await tick(cmd);check(r?.ok,JSON.stringify(r));check(predicate(game.players.qa,game),id+' state transition');
   prepare(id);setup();game.players.qa.observer=true;const denied=await tick(cmd);check(denied?.ok===false,'observer must be rejected');
  });
 }
 async function all(){
  rows.length=0;
  for(const r of ROLE_OPTIONS){prepare(r.id);try{renderUI();check(ROLE_LABELS[r.id]?.[0],r.id+' label');check(Number.isFinite(killCooldownFor(game.players.qa,game.settings)),r.id+' cooldown');rows.push({id:r.id,title:'role UI, label and cooldown',passed:true});}catch(e){rows.push({id:r.id,title:'role UI',passed:false,error:e.message});}}
  const future=(p,key)=>p[key]>clock;
  for(const [id,a,key]of[['photographer','photograph','photoAt'],['lightkeeper','lightkeeper','lightkeeperUntil'],['navigator','navigator','navigatorUntil'],['scientist','scientist','vitalsUntil'],['speedBooster','speedBoost','speedBoostUntil'],['sage','sageShield','sageShieldUntil'],['phantom','phantom','phantomUntil'],['hawk','hawk','hawkUntil'],['niceHawk','hawk','hawkUntil'],['lighter','lighter','lighterUntil']]){
   await action(id,ability(a),(p)=>key==='photoAt'?p[key]===clock:future(p,key),()=>{if(id==='lightkeeper')game.sabotage=createSabotage('lights','enemy',clock);});
   await run(id,'immediate repeated ability is rejected',async()=>{if(id==='lightkeeper')game.sabotage=createSabotage('lights','enemy',clock);await tick(ability(a));const r=await tick(ability(a));check(r?.ok===false,JSON.stringify(r));});
  }
  await action('engineer',ability('engineerRepair'),(p,g)=>p.remoteRepairUsed&&!g.sabotage,()=>game.sabotage=createSabotage('lights','enemy',clock));
  await action('tracker',ability('tracker',{target:'b'}),p=>p.trackedId==='b'&&p.trackUntil>clock);
  await action('medic',ability('medicShield',{target:'b'}),(p,g)=>p.medicShieldUsed&&g.players.b.shieldedBy==='qa');
  await action('detective',ability('notes',{text:'事件メモ'}),p=>p.caseNotes==='事件メモ');
  await action('guardianAngel',{type:'protect',target:'b'},(p,g)=>g.players.b.shieldUntil>clock&&p.abilityReadyAt>clock);
  await action('cupid',ability('cupid',{targets:['b','c']}),(p,g)=>p.cupidUsed&&g.players.b.loverPartnerId==='c'&&g.players.c.loverPartnerId==='b');
  await action('cleaner',ability('cleanBody',{bodyId:'dead'}),(p,g)=>!g.bodies.dead&&p.abilityReadyAt>clock);
  await action('camouflager',ability('camouflage'),(p,g)=>g.camouflage?.by==='qa'&&g.camouflage.endsAt===clock+20000);
  await action('shapeshifter',ability('shapeshifter',{target:'b'}),p=>p.disguise?.targetId==='b');
  await action('morphing',ability('morphScan',{target:'b'}),p=>p.morphTargetId==='b');
  await run('morphing','sample then transform then expire',async()=>{await tick(ability('morphScan',{target:'b'}));const r=await tick(ability('morphTransform'));check(r.ok&&game.players.qa.disguise?.targetId==='b',JSON.stringify(r));await tick(null,'qa',21000);check(!game.players.qa.disguise,'disguise expired');});
  await action('matryoshka',ability('matryoshka'),(p,g)=>p.matryoshkaLook?.corpseId==='dead'&&!g.bodies.dead);
  await action('triggerHappy',ability('triggerHappy',{target:'b'}),p=>!!p.triggerHappyVolley);
  await action('conjurer',ability('conjurer'),p=>Array.isArray(p.conjurerMarkers)&&p.conjurerMarkers.length===1);
  await action('mirage',ability('mirage'),(p,g)=>Object.values(g.bodies).some(b=>b.fake&&b.owner==='qa'));
  await action('arsonist',ability('arsonistDouse',{target:'b'}),p=>!!p.arsonistDouse);
  await action('vulture',ability('vultureEat',{bodyId:'dead'}),(p,g)=>p.eatenBodies===1&&!g.bodies.dead);
  for(const id of ['teleporter','teleportJackal'])await action(id,ability(id),p=>!!p.teleportPending);
  for(const id of ['waveCannon','waveCannonJackal'])await action(id,ability('waveCannon',{yaw:0}),(p,g)=>g.waveEvent?.by==='qa'&&p.waveChargingUntil>clock);
  await action('penguin',ability('penguinGrab',{target:'b'}),(p,g)=>p.penguinTargetId==='b'&&g.players.b.penguinCapturedBy==='qa');
  await action('samurai',ability('samurai'),(p,g)=>p.samuraiUsed&&g.players.b.alive===false);
  await action('suicideBomber',ability('suicideBomber'),(p,g)=>!p.alive&&!g.players.b.alive);
  await action('slugger',ability('slugger',{yaw:0}),p=>!!p.sluggerCharge);
  await action('rocket',ability('rocketCapture',{target:'b'}),(p,g)=>g.players.b.rocketCapturedBy==='qa');
  await action('necromancer',ability('necromancerRaise',{target:'dead'}),(p,g)=>g.players.dead.alive&&g.players.dead.role==='impostor'&&!g.bodies.dead);
  await action('santa',ability('santaGift'),(p,g)=>g.players.b.subrole!=='crewmate');
  await action('chief',ability('chiefAppoint'),(p,g)=>g.players.b.subrole==='sheriff');
  await action('jumpDancer',ability('jumpDancer'),(p,g)=>p.jumpAt===clock&&g.players.b.jumpAt===clock);
  await action('ubiquitous',ability('droneStart'),p=>p.drone?.active);
  await action('doorer',ability('doorer'),(p,g)=>p.abilityReadyAt>clock,()=>{const d=shipDoorLayout(game).doors.find(d=>!collision(d.x,d.z));check(d,'door fixture');players.qa.x=d.x;players.qa.z=d.z;game.players.qa.x=d.x;game.players.qa.z=d.z;});
  await action('overloader',ability('overloader'),p=>p.overloaded&&expansionKillRange(p)===5&&killCooldownFor(p,game.settings)===15000);
  await action('cracker',ability('crackBody',{bodyId:'dead'}),(p,g)=>g.bodies.dead.unreportable);
  await action('missionary',ability('missionary',{target:'b'}),(p,g)=>g.players.b.missionaryDoom?.by==='qa');
  await action('bodyguard',ability('bodyguard',{target:'b'}),(p,g)=>g.players.b.bodyguards?.qa&&p.guardUses===1);
  await action('sandworm',ability('sandwormAmbush',{target:'b'}),(p,g)=>!g.players.b.alive,()=>{game.players.qa.ventId=VENTS[0].id;game.players.qa.ventUntil=clock+60000;});
  await action('eater',ability('eaterCorpse',{bodyId:'dead'}),(p,g)=>p.eaterMeals===1&&!g.bodies.dead);
  await action('freezer',ability('freezer'),(p,g)=>g.freeze?.until===clock+5000&&isTimeFrozen(g,clock));
  await action('jackal',ability('createSidekick',{target:'b'}),(p,g)=>g.players.b.subrole==='jackalSidekick'&&g.players.b.role==='jackal');
  for(const [id,cmd,test]of[
   ['mayor',{type:'mayorBoost'},(p,g)=>p.mayorBoostMeeting===g.meeting.id&&!g.notice],
   ['swapper',{type:'swapVotes',targets:['b','c']},(p,g)=>g.meeting.voteSwaps?.[0]?.join(',')==='b,c'],
   ['scales',{type:'scalesVote',targets:['b','c']},(p,g)=>g.meeting.scalesVote?.targets.join(',')==='b,c'],
   ['meetingSheriff',{type:'meetingSheriff',target:'enemy'},(p,g)=>!g.players.enemy.alive&&p.alive],
   ['guesser',{type:'guess',target:'enemy',roleGuess:'samurai'},(p,g)=>!g.players.enemy.alive&&p.alive],
   ['evilGuesser',{type:'guess',target:'b',roleGuess:'medic'},(p,g)=>!g.players.b.alive&&p.alive]
  ])await action(id,cmd,test,()=>{meeting();game.players.enemy.subrole='samurai';game.players.b.subrole='medic';});
  for(const id of ['impostor','sheriff','doubleKiller','bountyHunter','viper','serialKiller'])await action(id,{type:'kill',target:id==='sheriff'?'enemy':'b'},(p,g)=>g.players[id==='sheriff'?'enemy':'b'].alive===false&&p.readyAt>clock);
  await action('vampire',{type:'bite',target:'b'},(p,g)=>g.players.b.vampireBiteBy==='qa'&&g.players.b.vampireDeathAt>clock);
  await run('crewmate','task completion and normal-kill denial',async()=>{const task=TASKS[0];players.qa={...players.qa,x:task.x,z:task.z};game.players.qa.x=task.x;game.players.qa.z=task.z;const r=await tick({type:'task',task:task.id});check(r?.ok&&game.players.qa.tasks[task.id],JSON.stringify(r));const k=await tick({type:'kill',target:'b'});check(k?.ok===false,'crew kill denied');});
  for(const id of ['noisemaker','seer','stuntman','mini','fox','lovers','madmate','blackCat','evilNekomata','jester','madJester','god','star','jackalSidekick'])await run(id,'passive / death / victory behavior',async()=>{
   const p=game.players.qa;
   if(id==='noisemaker'){recordDeath(game,'qa','enemy',players.qa);check(game.noiseAlert?.until>clock,'noise alert');}
   if(id==='seer'){recordDeath(game,'b','enemy',players.b);check(game.souls?.b,'soul location');check(game.deathFlashEvents?.some(e=>e.victim==='b'),'death flash');}
   if(id==='stuntman'){check(!recordDeath(game,'qa','enemy',players.qa),'first hit blocked');check(p.stuntmanGuardsUsed===1&&p.alive,'guard used');check(recordDeath(game,'qa','enemy',players.qa),'second hit kills');}
   if(id==='mini'){p.mini=true;p.miniAge=0;check(!recordDeath(game,'qa','enemy',players.qa)&&p.alive,'young crew protected');p.miniAge=18;check(recordDeath(game,'qa','enemy',players.qa),'grown mini killable');prepare(id);game.players.qa.mini=true;resolveVoteEjection(game,'qa');check(game.miniLoss==='qa','vote victory');}
   if(id==='fox'){check(!recordDeath(game,'qa','enemy',players.qa),'fox protected from impostor');check(game.foxShields?.qa?.attacker==='enemy','shield record');game.phase='ended';game.winner='crew';applyEndgameRoleWins(game);check(game.winner==='fox','fox takeover');}
   if(id==='lovers'){p.loverPairId='pair';p.loverPartnerId='b';game.players.b.loverPairId='pair';game.players.b.loverPartnerId='qa';recordDeath(game,'qa','enemy',players.qa);check(!p.alive&&!game.players.b.alive,'lover follows death');}
   if(id==='madmate'){check(isImpostorTeamPlayer(p),'impostor team');check(!roleCanDoTasks(p,game.settings),'not global task contributor');const r=await tick({type:'kill',target:'b'});check(r?.ok===false,'cannot kill');}
   if(['blackCat','evilNekomata'].includes(id)){const dead=Object.values(game.players).filter(p=>!p.alive).length;resolveVoteEjection(game,'qa');check(Object.values(game.players).filter(p=>!p.alive).length===dead+2,'cat takes one crew');check(game.players.enemy.alive,'enemy excluded');}
   if(id==='jester'){resolveVoteEjection(game,'qa');check(game.jesterWinner==='qa','jester vote win');prepare(id);recordDeath(game,'qa','enemy',players.qa);check(!game.jesterWinner,'kill does not win');}
   if(id==='madJester'){resolveVoteEjection(game,'qa');check(game.madJesterWinner==='qa','impostor vote win');}
   if(id==='god'){game.phase='ended';game.winner='crew';p.tasks=Object.fromEntries(p.assignedTasks.map(t=>[t,true]));applyEndgameRoleWins(game);check(game.winner==='god','completed task takeover');}
   if(id==='star'){p.starNextFlashAt=clock-1;await tick();check(game.starFlashEvent?.by==='qa','periodic flash');}
   if(id==='jackalSidekick'){game.players.c.role='jackal';game.players.c.subrole='jackal';game.players.qa.jackalLeaderId='c';const r=await tick({type:'kill',target:'b'});check(r?.ok===false&&game.players.b.alive,'sidekick cannot kill');game.players.c.alive=false;await tick();check(game.players.qa.subrole==='jackal'&&game.players.qa.promotedFromSidekick,'promotion');}
  });
  await run('penguin','capture timer resolves and releases target',async()=>{await tick(ability('penguinGrab',{target:'b'}));await tick(null,'qa',5100);check(!game.players.b.alive&&!game.players.qa.penguinTargetId&&!game.players.b.penguinCapturedBy,'capture completion');});
  await run('slugger','charged strike resolves',async()=>{await tick(ability('slugger',{yaw:0}));await tick(null,'qa',1100);check(!game.players.b.alive&&!game.players.qa.sluggerCharge,'strike completion');});
  await run('rocket','capture then launch then death',async()=>{await tick(ability('rocketCapture',{target:'b'}));const r=await tick(ability('rocketLaunch'));check(r?.ok,JSON.stringify(r));await tick(null,'qa',2500);check(!game.players.b.alive&&!game.players.b.rocketCapturedBy,'launch completion');});
  await run('vampire','bite resolves after delay and records blood trail',async()=>{await tick({type:'bite',target:'b'});check(game.players.b.alive,'bite delayed');await tick(null,'qa',15100);check(!game.players.b.alive&&!game.players.b.vampireDeathAt,'bite completed');check(Object.values(game.bloodTrails||{}).some(t=>t.victimId==='b'),'blood trail');});
  await run('viper','poison body dissolves',async()=>{await tick({type:'kill',target:'b'});check(game.bodies.b.dissolveAt>clock,'poison delay');await tick(null,'qa',15100);check(!game.bodies.b,'body dissolved');});
  await run('serialKiller','next-kill deadline expires',async()=>{await tick({type:'kill',target:'b'});check(game.players.qa.serialKillerDeadline>clock,'deadline set');await tick(null,'qa',30100);check(!game.players.qa.alive&&game.players.qa.deathCause==='serialKillerSuicide','deadline death');});
  await run('samurai','slash stays used after cooldown',async()=>{await tick(ability('samurai'));const r=await tick(ability('samurai'),'qa',31000);check(r?.ok===false&&game.players.qa.samuraiUsed,'one slash per match');});
  await run('doubleKiller','second slot independent and limited',async()=>{await tick({type:'kill',target:'b'});game.killPresentations={};game.killPlayback={};game.killEvent=null;const r=await tick({type:'kill',target:'enemy',killSlot:'second'});check(r?.ok===false,'allied target rejected');players.c={...players.c,x:players.qa.x+.8,z:players.qa.z};game.settings.doubleSecondMaxUses=1;const shot=await tick({type:'kill',target:'c',killSlot:'second'},'qa',4000);check(shot?.ok&&game.players.qa.secondaryKillsUsed===1,JSON.stringify(shot));});
  await run('medic','shield absorbs one hit',async()=>{await tick(ability('medicShield',{target:'b'}));check(!recordDeath(game,'b','enemy',players.b)&&game.players.b.alive&&!game.players.b.shielded,'first attack absorbed');check(recordDeath(game,'b','enemy',players.b),'second attack kills');});
  await run('bodyguard','guard sacrifices itself and preserves protected player',async()=>{await tick(ability('bodyguard',{target:'b'}));check(!recordDeath(game,'b','enemy',players.b),'attack redirected');check(!game.players.qa.alive&&game.players.b.alive,'guard sacrificed');});
  await run('missionary','delayed missionary death completes',async()=>{game.settings.missionaryMinSeconds=1;game.settings.missionaryMaxSeconds=1;await tick(ability('missionary',{target:'b'}));await tick(null,'qa',1100);check(!game.players.b.alive&&game.players.b.deathCause==='missionary','missionary resolution');});
  await run('eater','swallow bypasses shield, leaves no corpse and wins',async()=>{game.settings.eaterRequiredMeals=1;game.players.b.shielded=true;await tick(ability('eaterSwallow',{target:'b'}));await tick(null,'qa',3100);check(!game.players.b.alive&&!game.bodies.b,'swallowed without corpse');check(game.phase==='ended'&&game.winner==='eater','meal victory');});
  await run('freezer','caster and other players blocked for exactly five seconds',async()=>{await tick(ability('freezer'));const caster=await tick({type:'kill',target:'b'});const other=await tick({type:'kill',target:'c'},'enemy');check(caster?.ok===false&&other?.ok===false,'all players stopped');await tick(null,'qa',4999);check(isTimeFrozen(game,clock),'still stopped at 4999ms');await tick(null,'qa',1);check(!isTimeFrozen(game,clock),'released at 5000ms');});
  await run('arsonist','douse completion and ignition victory',async()=>{await tick(ability('arsonistDouse',{target:'b'}));await tick(null,'qa',11000);check(game.players.qa.dousedTargets?.b,'dousing completes');game.players.qa.dousedTargets=Object.fromEntries(Object.entries(game.players).filter(([id,p])=>id!=='qa'&&p.alive).map(([id])=>[id,true]));game.players.qa.abilityReadyAt=0;const r=await tick(ability('arsonistIgnite'));check(r?.ok&&game.winner==='arsonist'&&game.phase==='ended','ignition victory');});
  await run('ubiquitous','drone movement then return',async()=>{await tick(ability('droneStart'));const d=game.players.qa.drone;const move=await tick(ability('droneMove',{droneX:d.x+.1,droneZ:d.z}));check(move?.ok,JSON.stringify(move));await tick(ability('droneReturn'));check(game.players.qa.drone.active===false,'drone returned');});
  for(const id of ['teleporter','teleportJackal'])await run(id,'delayed gather completes',async()=>{await tick(ability(id));await tick(null,'qa',16000);check(!game.players.qa.teleportPending&&Object.keys(game.teleportEvent?.positions||{}).length>=8,'gather positions');});
  await action('revenant',ability('revenantCurse',{target:'b'}),(p,g)=>g.players.b.revenantCurseUntil>clock&&Object.keys(p.tasks).length===0,()=>{const p=game.players.qa;p.revenantTasksRequired=1;p.tasks={[p.assignedTasks[0]]:true};});
  // Every selectable role needs behavioral evidence, separate from its UI smoke check.
  for(const r of ROLE_OPTIONS)check(rows.some(row=>row.id===r.id&&row.title!=='role UI, label and cooldown'&&row.title!=='role UI'),'missing behavioral case: '+r.id);
  hostBusy=true;return{roles:ROLE_OPTIONS.map(r=>({id:r.id,name:ROLE_LABELS[r.id]?.[0]})),rows};
 }
 return{all,prepare,tick,state:()=>game,rows};
})();
