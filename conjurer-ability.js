// Host-only rules. Placing the third point arms the triangle; a later command
// activates it. The placed triangle persists until the next meeting.
export function conjurerTriangleContains(points,point){
  if(points?.length!==3||![point?.x,point?.z,...points.flatMap(p=>[p?.x,p?.z])].every(Number.isFinite))return false;
  const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  if(Math.abs(cross(...points))<1)return false;
  const sides=[cross(points[0],points[1],point),cross(points[1],points[2],point),cross(points[2],points[0],point)];
  return sides.every(n=>n>=-1e-7)||sides.every(n=>n<=1e-7);
}
export function canSeeConjurerMarkers(viewer){return viewer?.role==='impostor'&&!viewer.observer&&!viewer.disconnected;}
export function resetConjurerMarkers(game){
  let changed=false;
  for(const player of Object.values(game.players||{}))if(player.conjurerMarkers){delete player.conjurerMarkers;delete player.conjurerArmedAt;changed=true;}
  return changed;
}
export function useConjurerAbility({game,actor,location,profiles={},botPositions={},stamp,kill,emit}){
  const p=game.players?.[actor];
  const fail=error=>({ok:false,error});
  if(game.phase!=='play'||!p?.alive||p.role!=='impostor'||p.subrole!=='conjurer'||p.observer||p.disconnected||p.ventId||p.penguinCapturedBy||p.rocketCapturedBy)return fail('生存中のプレイ時間にだけ使えます。');
  if(stamp<Math.max(Number(game.playStartsAt)||0,Number(game.countdownEndsAt)||0))return fail('開始後に使えます。');
  if(Number(p.abilityReadyAt)>stamp)return fail('クールダウン中です。');
  const points=(p.conjurerMarkers||[]).slice(0,3).map(q=>({x:Number(q.x),z:Number(q.z)}));
  if(points.length<3){
    const point={x:Number(location?.x),z:Number(location?.z)};
    if(!Number.isFinite(point.x)||!Number.isFinite(point.z))return fail('現在地を確認できません。');
    if(points.some(q=>Math.hypot(q.x-point.x,q.z-point.z)<.5))return fail('前の点から少し離して置いてください。');
    const placed=[...points,point];
    if(placed.length===3){const [a,b,c]=placed;if(Math.abs((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x))<1)return fail('三角形になる位置に3点目を置いてください。');p.conjurerArmedAt=stamp;}
    p.conjurerMarkers=placed;emit('conjurerMarker',{markers:placed,at:stamp});
    return {ok:true,placed:true,message:placed.length===3?'召喚陣を設置しました。範囲キルで発動します。':`マーカー ${placed.length}/3 を設置しました。`};
  }
  const targets=[];
  for(const [id,target]of Object.entries(game.players||{})){
    if(id===actor||!target.alive||target.observer||target.disconnected||target.ventId)continue;
    const pose=target.bot?(botPositions[id]||target):profiles[id];
    if(!pose||(!target.bot&&pose.online!==true))continue;
    const at={x:Number(pose.x),z:Number(pose.z)};
    if(conjurerTriangleContains(points,at)&&kill(id,at))targets.push({id,...at});
  }
  const seconds=Math.max(5,Math.min(120,Number(game.settings?.conjurerCooldownSeconds)||45));
  p.abilityReadyAt=stamp+seconds*1000;p.readyAt=Math.max(Number(p.readyAt)||0,p.abilityReadyAt);
  emit('conjurer',{markers:points,targets,at:stamp});
  return {ok:true,fired:true,targets,message:`${targets.length}人を召喚陣で倒しました。`};
}
