const GHOST_SIGHT_LAYER=29,prepared=new WeakMap();
function prepare(root){
 if(!root)return;
 const signature={children:root.children.length,costume:root.userData?.costumeRoot};
 const previous=prepared.get(root);
 if(previous?.children===signature.children&&previous?.costume===signature.costume)return;
 root.traverse(node=>node.layers?.enable(GHOST_SIGHT_LAYER));prepared.set(root,signature);
}
// Draw visible player models after deck geometry, retaining normal depth tests
// within each model. This avoids forcing every costume material to depthTest=false.
export function renderGhostSightOverlay(renderer,scene,camera,avatars,lights=[]){
 let hasVisible=false;
 for(const avatar of avatars.values()){
  if(!avatar.visible)continue;hasVisible=true;prepare(avatar);
  const pet=avatar.userData?.petFollower;if(pet?.visible)prepare(pet);
 }
 if(!hasVisible)return;
 const mask=camera.layers.mask,autoClear=renderer.autoClear,background=scene.background;
 const lightMasks=lights.filter(Boolean).map(light=>[light,light.layers.mask]);
 const shadow=renderer.shadowMap,shadowAuto=shadow?.autoUpdate,shadowDirty=shadow?.needsUpdate;
 try{
  for(const[light]of lightMasks)light.layers.enable(GHOST_SIGHT_LAYER);
  if(shadow){shadow.autoUpdate=false;shadow.needsUpdate=false;}
  renderer.autoClear=false;scene.background=null;renderer.clearDepth();camera.layers.set(GHOST_SIGHT_LAYER);renderer.render(scene,camera);
 }finally{
  camera.layers.mask=mask;renderer.autoClear=autoClear;scene.background=background;
  for(const[light,value]of lightMasks)light.layers.mask=value;
  if(shadow){shadow.autoUpdate=shadowAuto;shadow.needsUpdate=shadowDirty;}
 }
}

// Render players once: omit them from the deck pass so transparent costumes
// and auras are not blended twice and ghost sight adds no duplicate model draw.
export function renderGhostWorld(renderer,scene,camera,avatars,lights=[]){
 const hidden=new Set();
 for(const avatar of avatars.values())if(avatar.visible){hidden.add(avatar);if(avatar.userData?.petFollower?.visible)hidden.add(avatar.userData.petFollower);}
 try{for(const root of hidden)root.visible=false;renderer.render(scene,camera);}
 finally{for(const root of hidden)root.visible=true;}
 renderGhostSightOverlay(renderer,scene,camera,avatars,lights);
}
