export function foxShieldVisible(game,targetId,viewerId,stamp){
 const shield=game?.foxShields?.[targetId];
 return !!viewerId&&['play','meeting'].includes(game?.phase)&&game.players?.[targetId]?.alive===true&&Number(shield?.until)>stamp&&(viewerId===targetId||viewerId===shield.attacker);
}

export function updateFoxShield(THREE,avatar,game,targetId,viewerId,stamp){
 const visible=foxShieldVisible(game,targetId,viewerId,stamp);
 let root=avatar.userData.foxShield;
 if(visible&&!root){
  root=new THREE.Group();root.name='fox-shield';root.position.y=1;
  const shell=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshBasicMaterial({color:0xffd890,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide}));shell.scale.set(.86,1.18,.83);root.add(shell);
  const grid=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),new THREE.MeshBasicMaterial({color:0xffe6b1,transparent:true,opacity:.45,wireframe:true,depthWrite:false}));grid.scale.copy(shell.scale);root.add(grid);
  avatar.add(root);avatar.userData.foxShield=root;
 }
 if(root){root.visible=visible;if(visible){const age=Math.max(0,stamp-game.foxShields[targetId].at);root.rotation.y=age*.001;root.scale.setScalar(1+Math.sin(age*.006)*.035);}}
}
