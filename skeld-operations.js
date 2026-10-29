export const MAX_ROOM_PLAYERS=15;

// Pick the entire ring together so individual collision fallbacks cannot bunch players.
export function meetingTableSpawns(count,center,canStand=()=>true){
 const n=Math.max(0,Math.trunc(count));if(!n)return [];
 const base=3.05+Math.min(n-1,MAX_ROOM_PLAYERS-1)*.055;
 for(let extra=0;extra<=.5;extra+=.1)for(let turn=0;turn<12;turn++){
  const radius=base+extra,offset=Math.PI/2+turn*Math.PI/(n*6);
  const points=Array.from({length:n},(_,i)=>{const angle=offset+i*Math.PI*2/n;return{x:center.x+Math.cos(angle)*radius,z:center.z+Math.sin(angle)*radius};});
  if(points.every(p=>canStand(p.x,p.z)))return points;
 }
 return null;
}

export function adminRoomCounts(game,rooms,getPose,contains,stamp){
 const counts=Object.fromEntries(rooms.map(r=>[r.id,0]));
 if(game.phase!=='play'||game.sabotage?.type==='comms'&&game.sabotage.endsAt>stamp)return counts;
 const add=at=>{if(!at||!Number.isFinite(at.x)||!Number.isFinite(at.z))return;const room=rooms.find(r=>contains(at.x,at.z,r));if(room)counts[room.id]++;};
 for(const[id,p]of Object.entries(game.players||{}))if(p.alive&&!p.observer&&!p.disconnected)add(getPose(id,p));
 for(const body of Object.values(game.bodies||{}))if(!body.carriedBy&&!body.removed&&!body.dissolved&&!(body.dissolveAt&&body.dissolveAt<=stamp))add(body);
 return counts;
}
