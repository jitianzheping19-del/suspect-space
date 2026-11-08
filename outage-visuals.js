export function isLightsOut(game,stamp){
 return game.phase==='play'&&game.sabotage?.type==='lights'&&game.sabotage.endsAt>stamp;
}
export function outageLimitsVision(player,game,stamp,impostorVision=false){
 return isLightsOut(game,stamp)&&!!player?.alive&&!player.observer&&!impostorVision&&player.role!=='jackal'&&!(player.lightkeeperUntil>stamp)&&!(player.lighterUntil>stamp);
}

const glowStates=new WeakMap(),materialDefaults=new WeakMap();
// Emissive lenses retain the avatar's existing depth, visibility and sight rules.
export function setOutageGoggleGlow(avatar,active){
 const {visor,costumeRoot}=avatar.userData;
 let state=glowStates.get(avatar);
 if(!state||state.root!==costumeRoot||state.visor!==visor){
  const materials=new Set(visor?[visor]:[]);
  costumeRoot?.traverse(node=>{if(node.userData.goggleLens)for(const material of [].concat(node.material||[]))materials.add(material);});
  state={root:costumeRoot,visor,materials:[...materials].filter(material=>material.emissive),active:null};
  for(const material of state.materials)if(!materialDefaults.has(material))materialDefaults.set(material,{emissive:material.emissive.clone(),intensity:material.emissiveIntensity});
  glowStates.set(avatar,state);
 }
 if(state.active===active)return;
 state.active=active;
 for(const material of state.materials){
  const original=materialDefaults.get(material);
  if(active){material.emissive.set(0x65d9ef);material.emissiveIntensity=.8;}
  else{material.emissive.copy(original.emissive);material.emissiveIntensity=original.intensity;}
 }
}
