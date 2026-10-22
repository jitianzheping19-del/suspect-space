// Display-only match history. Never modifies the authoritative room state.
export function renderMatchRecapView({container, players, meetings, history, nameFor}) {
  const node=(tag,className,text)=>{
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(text!==undefined)element.textContent=String(text);
    return element;
  };
  container.querySelector('.recapOverview')?.remove();
  const overview=node('div','recapOverview');
  const alive=players.filter(player=>player.alive).length;
  for(const [label,value] of [['参加者',players.length],['生存',alive],['死亡',players.length-alive],['会議',history.length]]){
    const item=node('div','recapStat');item.append(node('b','',value),node('span','',label));overview.append(item);
  }
  container.querySelector('.matchRecapHeader').after(overview);
  const roster=container.querySelector('#matchRecapPlayers');roster.replaceChildren();
  for(const player of players){
    const card=node('article','matchRecapPlayer');card.dataset.team=player.team;
    const head=node('div','recapPlayerHead'),dot=node('span','recapSuit');dot.style.background=player.color;
    const name=node('strong','',player.name),status=node('span','recapStatus',player.alive?'生存':'死亡');status.dataset.alive=String(player.alive);
    head.append(dot,name,status);
    card.append(head,node('em','matchRecapRole',player.role),node('small','',player.detail));roster.append(card);
  }
  meetings.replaceChildren();
  if(!history.length){meetings.append(node('p','recapEmpty','会議なし'));return;}
  history.forEach((record,index)=>{
    const card=node('article','matchRecapMeeting'),heading=node('div','recapMeetingHeading');
    const ejected=(record.ejecteds||[]).map(id=>nameFor(id,record));
    const outcome=ejected.length?ejected.join('、')+' を追放':record.outcome==='tie'?'同数で追放なし':record.outcome==='no-votes'?'無投票':'追放なし';
    heading.append(node('h4','',`第${Number(record.round)||index+1}回会議`),node('span','recapOutcome',outcome));card.append(heading);
    const counts=Object.entries(record.counts||{}).sort((a,b)=>(Number(b[1])||0)-(Number(a[1])||0));
    const top=Math.max(1,...counts.map(([,count])=>Number(count)||0));
    const tally=node('div','recapTally');
    for(const [id,count] of counts){
      const line=node('div','recapTallyLine'),label=node('span','',nameFor(id,record)),bar=node('span','recapTallyTrack'),fill=node('i');
      fill.style.width=(Math.max(0,Number(count)||0)/top*100)+'%';bar.append(fill);
      line.append(label,bar,node('b','',`${Number(count)||0}票`));tally.append(line);
    }
    if(counts.length)card.append(tally);
    const votes=Object.entries(record.votes||{});
    if(record.anonymousVotes)card.append(node('p','recapAnonymous','匿名投票'));
    else if(votes.length){
      const detail=node('details','recapDetails');detail.append(node('summary','','投票先'));
      const ballots=node('div','recapBallots');
      for(const [id,vote] of votes){const row=node('div','recapBallot');row.append(node('span','',nameFor(id,record)),node('span','recapArrow','→'),node('span','',(vote.noVote?'無投票':nameFor(vote.target,record))+((Number(vote.weight)||1)>1?` ×${vote.weight}`:'')));ballots.append(row);}
      detail.append(ballots);card.append(detail);
    }
    if(record.scalesTargets?.length)card.append(node('p','recapScales','天秤：'+record.scalesTargets.map(id=>nameFor(id,record)).join(' ／ ')));
    if(record.chat?.length){
      const detail=node('details','recapDetails'),chat=node('div','recapChat');detail.append(node('summary','',`会議チャット ${record.chat.length}`));
      for(const line of record.chat){const message=node('p','matchRecapChatLine');message.append(node('strong','',line.name||'プレイヤー'),node('span','',line.text||''));chat.append(message);}
      detail.append(chat);card.append(detail);
    }
    meetings.append(card);
  });
}
