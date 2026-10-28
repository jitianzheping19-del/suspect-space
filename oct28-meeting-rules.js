// Room/round state rules, shared by the host and regression tests.
export function capGhostTasks(player,fallback=[]){
 if(!player||player.alive!==false||player.observer)return false;
 const assigned=Array.isArray(player.assignedTasks)?player.assignedTasks:fallback;
 if(assigned.length<3)return false;
 // Keep at most two assignments, preferring completed tasks so a death cannot
 // silently undo progress; the same assignment list is used for UI and wins.
 const done=assigned.filter(id=>player.tasks?.[id]),todo=assigned.filter(id=>!player.tasks?.[id]);
 player.assignedTasks=[...done,...todo].slice(0,2);player.ghostTasksCapped=true;return true;
}

export function collectNewMeetingDeaths(g){
 const known=g.confirmedMeetingDeaths||{},current=[];
 for(const[id,p]of Object.entries(g.players||{})){
  if(p?.alive!==false||p.observer||p.deathCause==='切断による離脱'||known[id]===Number(p.deathAt||0))continue;
  current.push({id,name:String(p.name||'プレイヤー'),hue:Number(p.hue)||0,costume:p.costume||'standard',at:Number(p.deathAt)||0,cause:String(p.deathCause||'')});
 }
 current.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
 g.confirmedMeetingDeaths={...known};for(const p of current)g.confirmedMeetingDeaths[p.id]=p.at;
 return current;
}

export function meetingMemorialDuration(deaths){return deaths?.length?Math.max(3000,deaths.length*2500):1500;}

export function syncMeetingPresence(g,profiles,stamp,{grace=15000,token=()=>String(stamp),depart,missingSince=new Map()}={}){
 let changed=false;
 const chat=(text)=>{if(!g.meeting)return;(g.meeting.chat||=[]).push({id:token(),uid:'system',name:'システム',text,at:stamp,alive:true,system:true});g.meeting.chat=g.meeting.chat.slice(-80);};
 for(const[id,p]of Object.entries(g.players||{})){
  if(p.bot||p.observer)continue;
  const profile=profiles[id],online=profile?.online===true;
  if(online){
   missingSince.delete(id);
   if(p.connectionSuspended||p.disconnected){
    const recoverable=p.connectionSuspended===true&&g.phase==='meeting'&&(p.reconnectMeetingId===g.meeting?.id||!!g.meeting?.previousId&&p.reconnectMeetingId===g.meeting.previousId);
    // Suspension never changes alive. A death while offline must remain a death.
    if(recoverable)chat((p.name||'プレイヤー')+'が復帰しました。');
    p.disconnected=false;delete p.disconnectAt;delete p.connectionSuspended;delete p.aliveBeforeDisconnect;delete p.reconnectMeetingId;changed=true;
   }
   continue;
  }
  const explicitlyLeft=profile?.disconnectMode==='left';
  if(!missingSince.has(id)){const at=Number(profile?.updatedAt);missingSince.set(id,Number.isFinite(at)?Math.min(at,stamp):stamp);}
  // Remove assignments from the total as soon as offline presence is observed.
  if(!p.disconnected){
   p.disconnected=true;p.disconnectAt=missingSince.get(id);p.connectionSuspended=!explicitlyLeft;p.aliveBeforeDisconnect=p.alive===true;
   if(g.phase==='meeting'&&g.meeting&&!explicitlyLeft)p.reconnectMeetingId=g.meeting.id;
   changed=true;
  }
  if(p.connectionSuspended&&g.phase==='meeting'&&g.meeting&&!explicitlyLeft&&(!p.reconnectMeetingId||p.reconnectMeetingId===g.meeting.previousId)){p.reconnectMeetingId=g.meeting.id;changed=true;}
  if(p.reconnectMeetingId===g.meeting?.id&&g.phase==='meeting'&&!explicitlyLeft)continue;
  if(p.connectionSuspended&&(explicitlyLeft||stamp-missingSince.get(id)>=grace)||explicitlyLeft&&p.alive){
   delete p.connectionSuspended;delete p.reconnectMeetingId;delete p.aliveBeforeDisconnect;
   if(p.alive&&depart)depart(g,id,p);
   else if(p.alive)p.alive=false;
   if(g.phase==='meeting')chat((p.name||'プレイヤー')+'が退出しました。');
   changed=true;
  }
 }
 return changed;
}

export function finishMeetingReconnects(g,{depart}={}){
 for(const[id,p]of Object.entries(g.players||{})){
  if(!p.connectionSuspended||p.reconnectMeetingId!==g.meeting?.id)continue;
  if(p.alive&&depart)depart(g,id,p);else p.alive=false;
  p.disconnected=true;delete p.connectionSuspended;delete p.aliveBeforeDisconnect;delete p.reconnectMeetingId;
 }
}
