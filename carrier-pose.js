// Runs after the normal walk/jump pose, using the existing game frame loop.
export function updateCarrierPose(avatar,carrying,dt){
 const data=avatar.userData,previous=data.carrierPoseWeight||0;
 if(!carrying&&!previous)return;
 let weight=previous+(Number(carrying)-previous)*(1-Math.exp(-Math.min(.1,Math.max(0,dt))*18));
 if(Math.abs(weight-Number(carrying))<.001)weight=Number(carrying);
 data.carrierPoseWeight=weight;
 for(const arm of data.arms||[]){
  const side=Math.sign(arm.position.x)||1;
  arm.rotation.x+=(-1.35-arm.rotation.x)*weight;
  arm.rotation.y+=(-side*.12-arm.rotation.y)*weight;
  arm.rotation.z+=(-side*.22-arm.rotation.z)*weight;
 }
}

// Use the rendered avatar so interpolation, turning and jumping stay together.
export function applyCarrierCorpsePose(corpse,avatar,body){
 const carried=!!body.carriedBy&&!!avatar;
 if(carried){
  avatar.updateWorldMatrix(true,false);
  avatar.localToWorld(corpse.position.set(0,.7,.64));
  avatar.getWorldQuaternion(corpse.quaternion);
 }else{
  corpse.position.set(body.x,0,body.z);
  corpse.rotation.set(0,0,0);
 }
 if(corpse.userData.carryBlood)corpse.userData.carryBlood.visible=!carried;
}
