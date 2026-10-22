// SkyWay owns its UUID member IDs. Firebase presence binds those IDs to users.
export function resolveVoiceUserId(publisher,profiles,presence) {
  const memberId=String(publisher?.id||'');
  if(!memberId)return '';
  for(const [uid,state] of presence||[]){
    if(state?.joined===true&&(state.memberId===memberId||state.skywayMemberId===memberId)&&profiles?.[uid])return uid;
  }
  // Allow clients from the former protocol to finish their current room.
  return profiles?.[memberId]?memberId:'';
}

export function settleVoiceCleanup(action,timeout=1200) {
  let timer;
  return Promise.race([
    Promise.resolve().then(action).catch(()=>{}),
    new Promise(resolve=>{timer=setTimeout(resolve,timeout);}),
  ]).finally(()=>clearTimeout(timer));
}

export function voiceSessionHealthy({joined,stream,member,room,publication}) {
  return !!joined&&!!member&&!!room&&!!publication&&member.state!=='left'&&room.state!=='closed'&&
    !!stream?.getAudioTracks().some(track=>track.readyState!=='ended');
}
