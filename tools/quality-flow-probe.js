// Isolated host lifecycle with the shipped start, command, vote and lobby code.
window.__qualityFlow=async()=>{
 const qa=window.__allRolesQA,copy=v=>JSON.parse(JSON.stringify(v));
 const check=(v,m)=>{if(!v)throw Error(m+' '+JSON.stringify({phase:game.phase,toast:$('toast').textContent,result:game.commandResults?.qa}));};
 qa.prepare('crewmate');
 game={phase:'lobby',round:0,lobbySettings:{viewMode:'2d',mapMode:'classic',voiceEnabled:false}};
 $('roomMapMode').value='classic';$('roomViewMode').value='2d';$('waveMode').value='normal';$('botMode').checked=false;$('impostorCount').value='1';
 document.querySelectorAll('[data-role-enabled]').forEach(n=>n.checked=false);
 const rounds=[];
 for(let round=1;round<=3;round++){
  for(const p of Object.values(players)){p.ready=true;p.online=true;}
  window.__qaDatabase.rooms[code].players=copy(players);window.__qaDatabase.rooms[code].game=copy(game);
  hostBusy=false;hostTickPending=false;await $('startBtn').onclick();hostBusy=true;
  game=copy(window.__qaDatabase.rooms[code].game);
  check(game.phase==='play'&&game.round===round,'match starts');
  await qa.tick(null,'qa',60000);
  const enemy=Object.keys(game.players).find(id=>game.players[id].role==='impostor');check(enemy,'impostor assigned');
  players.qa.x=CENTER.x;players.qa.z=CENTER.z;game.players.qa.x=CENTER.x;game.players.qa.z=CENTER.z;
  const started=await qa.tick({type:'emergency'});check(started?.ok&&game.phase==='meeting','emergency command opens meeting');
  const meeting=game.meeting.id;
  privateBallots=Object.fromEntries(Object.entries(game.players).filter(([,p])=>p.alive&&!p.observer&&!p.disconnected).map(([id])=>[id,{id:'vote-'+round+'-'+id,round,meeting,target:enemy,at:now()+16000}]));
  await qa.tick(null,'qa',16000);check(game.phase==='results','all votes produce results');
  check(game.players[enemy].alive===false,'voted impostor is ejected');
  await qa.tick(null,'qa',60000);check(game.phase==='ended'&&game.winner==='crew','crew victory resolves');
  hostBusy=false;await $('againBtn').onclick();hostBusy=true;game=copy(window.__qaDatabase.rooms[code].game);
  check(game.phase==='lobby','return button restores lobby');
  check(game.round===round&&game.lobbySettings.matchSettings,'round and settings retained');
  rounds.push({round,meeting,winner:'crew',returnedToLobby:true});
 }
 return{rounds,errors:[]};
};
