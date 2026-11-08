window.__selectedQA={
 prepare(mode='lobby'){
  window.__allRolesQA.prepare('crewmate');renderContextLost=true;cancelAnimationFrame(frameRequestId);hostBusy=true;
  for(const dialog of document.querySelectorAll('dialog'))dialog.classList.remove('hidden');
  roomRosterRaw=structuredClone(players);roomPositionsRaw={};roomPositionKnown.clear();try{localStorage.removeItem('space-friends-v1:qa');sessionStorage.clear();}catch{}
  connected=mode!=="lobby";game.phase=mode;game.settings.viewMode='2d';game.lobbySettings={viewMode:'2d',voiceEnabled:false};game.lobbyGames={statuses:{qa:{value:'away',at:now(),until:now()+60000}}};
  if(mode==='meeting'){game.meeting={id:'selected-meeting',reporter:'b',startedAt:now()-1000,presentationEndsAt:now()-1000,votingAt:now()+10000,endsAt:now()+120000,chat:[{id:'chat-one',uid:'b',name:'b',text:'管理室で会いました',alive:true,at:now()}],ghostChat:[],voted:{},rosterOrder:Object.keys(game.players),rosterAliveOrder:Object.keys(game.players).filter(id=>game.players[id].alive)};}
  meeting3DManual2D=true;renderUI();set3DMode(false);show('ssxOrientationGuide',false);show('lobbyUpdateInfo',false);show('lobby',false);$('lobbyAttachedFrame').srcdoc='';show('lobbyAttachedFrame',false);return Object.keys(game.players).length;
 },
 practice:()=>practiceLab.open(),usePractice(){position={x:4.1,z:4.6};lobbyElevation=0;renderUI();useLobbyInteraction();},guideSeen:()=>readStored("space-practice-opened:"+uid),manifold:()=>SKELD_TASKS.findIndex(t=>t.mode==="manifolds"),
 launch(){this.prepare('play');game.countdownKind='launch';game.countdownEndsAt=now()+5000;game.playStartsAt=now()+15000;game.meetingCount=0;renderUI();return{count:document.querySelectorAll('#roundRoleList .roleChoiceButton').length};},
 context:()=>({writes:window.__qaWrites.length,phase:game.phase,done:JSON.stringify(self()?.tasks),notes:[...sessionStorage.keys?.()||[]]}),
 messages:()=>game.meeting?.chat,
 expiredPin(){game.meeting.chat[0].at=now()-46000;renderUI();},
 clear(){show('gameCountdown',false);show('roundRoles',false);}
};
