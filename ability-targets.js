// The action handlers and local previews share these candidates. This never sends commands.
export function classicAbilityTargets(role,{game,uid,position,players,pose,wallBetween}){
 const me=game.players?.[uid]||{},distance=at=>Math.hypot(position.x-at.x,position.z-at.z);
 const nearest=rows=>rows.sort((a,b)=>distance(a.at)-distance(b.at)).slice(0,1);
 if(role==='cleaner'||role==='vulture'){
  const rows=Object.entries(game.bodies||{}).filter(([,b])=>!b.carriedBy&&distance(b)<(role==='cleaner'?3:2.8)&&!wallBetween(position,b)).map(([id,p])=>({id,p,at:p,body:true}));
  return role==='cleaner'?nearest(rows):rows;
 }
 const living=Object.entries(game.players||{}).filter(([,p])=>p.alive&&!p.observer&&!p.disconnected);
 if(role==='arsonist'){
  const others=living.filter(([id])=>id!==uid);
  if(others.length&&others.every(([id])=>me.dousedTargets?.[id]))return [];
  return nearest(others.map(([id,p])=>({id,p,at:pose(id)})).filter(t=>!me.dousedTargets?.[t.id]&&!t.p.ventId&&t.at&&distance(t.at)<2.9&&!wallBetween(position,t.at)));
 }
 if(!['medic','tracker','guardianAngel','shapeshifter','morphing','vampire'].includes(role)||role==='morphing'&&me.morphTargetId)return [];
 const rows=living.filter(([id,p])=>!p.ventId&&(role==='medic'&&id===uid||id!==uid&&players[id]?.online&&
  (role==='shapeshifter'||distance(players[id])<(role==='vampire'?2.9:8)&&!wallBetween(position,players[id]))))
  .filter(([,p])=>role!=='vampire'||p.role!=='impostor'&&!p.vampireDeathAt)
  .map(([id,p])=>({id,p,at:id===uid?position:players[id]}));
 return role==='morphing'||role==='vampire'?nearest(rows):rows;
}
