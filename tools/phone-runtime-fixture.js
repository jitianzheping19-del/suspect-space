window.__mobileQA=()=>({mobile:renderBudget.mobile,target:renderBudget.fps,ratio:renderPixelRatio});
window.__phoneQA={
 phase(phase){game.phase=phase;renderUI();},
 lobby(){game.phase='lobby';game.meeting=null;game.startedAt=0;game.countdownEndsAt=0;game.playStartsAt=0;renderUI();},
 state(){return {phase:game.phase,preload:lobbyGamePreloader.state(),intro:!!meetingIntroPresentation,map:mapOpen,waiting:isWaitingLobbyForRunningMatch(),calls:window.__mapCalls||[],modals:[...document.querySelectorAll('.overlay:not(.hidden)')].map(n=>n.id)}},
 play(){clearTimeout(roleRevealTimer);pendingRoleReveal=null;show('roleReveal',false);game.countdownKind='meeting-return';game.phase='play';game.startedAt=Date.now()-100000;game.playStartsAt=Date.now()-90000;game.countdownEndsAt=0;game.meeting=null;renderUI();},
 intro(report=false){meeting3DManual2D=true;set3DMode(false);game.phase='meeting';game.meeting={id:'qa-intro-'+Date.now(),startedAt:now(),reporter:uid,body:{name:'相手',hue:.6,costume:'standard'},newDeaths:[],memorialDurationMs:1000,votingAt:now()+10000,endsAt:now()+60000,reason:report?'遺体を発見':'緊急会議',voted:{},chat:[],rosterOrder:[uid,hostId],rosterAliveOrder:[uid,hostId]};renderUI();game.meeting.startedAt=now();showMeetingIntro(game.meeting.reason);const canvas=$('meetingIntro').querySelector('.meetingIntroCanvas'),rect=canvas?.getBoundingClientRect();return{canvas:!!canvas,width:rect?.width,height:rect?.height,kind:$('meetingIntro').dataset.kind};},
 finishIntro(){clearTimeout(meetingMemorialTimer);meetingIntroPresentation?.stop();meetingMemorialPresentation?.dispose();for(const timer of effectTimers.values())clearTimeout(timer);effectTimers.clear();show('meetingIntro',false);},
 launchRoles(){game.phase='play';game.countdownKind='launch';game.meetingCount=0;game.countdownEndsAt=now()+60000;game.playStartsAt=now()+70000;game.settings.waveMode='normal';renderUI();},
 ghostTask(){this.play();const task=TASKS.find(t=>t.kind==='wires')||TASKS[0];self().role='crew';self().subrole='crewmate';self().alive=false;self().assignedTasks=[task.id];self().tasks={};self().observer=false;deathPauseUntil=0;position.x=task.x;position.z=task.z;renderUI();return{can:roleCanDoTasks(self()),task:task.id};},
 taskOpen(){return !!(taskWork||taskGame||wireGame||numberTask||reactorGame||uploadTask||fuelTask||cardTask||document.getElementById('ssTaskTerminalHost')?.classList.contains('active'));},
 cameraState(){return {phone:phoneWorldViewQuery.matches,zoom:camera2D.zoom,fov:camera3D.fov};},
 bot(){const pose={x:position.x+1,z:position.z,yaw:-Math.PI/2,updatedAt:now()};game.players['qa-bot']={...game.players[hostId],...pose,bot:true,name:'方向テスト',alive:true,role:'crew',subrole:'crewmate'};botPositions['qa-bot']=pose;players=mergeBots(players);renderUI();},
 botState(){return{yaw:avatars.get('qa-bot')?.rotation.y,pose:players['qa-bot']?.yaw};},
 role(subrole,role='crew'){self().role=role;self().subrole=subrole;self().alive=true;game.settings.viewMode='3d';renderUI();}
};

const qaToggle=toggleMap;toggleMap=force=>{(window.__mapCalls||=[]).push({force,before:mapOpen,waiting:isWaitingLobbyForRunningMatch()});return qaToggle(force)};
