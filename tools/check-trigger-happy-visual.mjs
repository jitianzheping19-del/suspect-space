// Exercise the shipped gun and projectile handlers with actual Three.js matrices.
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {buildTriggerHappyWeapon,buildTriggerHappyBullet,attachTriggerHappyWeapon,triggerHappyMuzzleWorld} from '../trigger-happy-models.js';
const bytes=await(await fetch('https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js')).text();
const THREE=await import('data:text/javascript;base64,'+Buffer.from(bytes).toString('base64'));
for(const file of ['index.html','space-suspect-complete.html']){
 const source=await readFile(file,'utf8'),scopeSource=source.slice(source.indexOf('function rolePropScope('),source.indexOf('function roleVisualPose(')),handlerSource=source.slice(source.indexOf('function buildTriggerHappyGun('),source.indexOf('function roleSparkEffect('));
 const handlers=new Map(),scene=new THREE.Scene(),avatar=new THREE.Group(),arm=new THREE.Group();avatar.add(arm);avatar.userData.arms=[new THREE.Group(),arm];avatar.scale.setScalar(.76);avatar.position.set(3,.2,-2);scene.add(avatar);
 const avatars=new Map([['shooter',avatar]]),game={phase:'play',players:{shooter:{alive:true}},modRoleEvents:[]};
 new Function('THREE','buildTriggerHappyWeapon','buildTriggerHappyBullet','attachTriggerHappyWeapon','triggerHappyMuzzleWorld','avatars','game','uid','registerModEffectHandler','roleVisualPose','rolePropObservable','clamp','cameraPerspective',scopeSource+'\n'+handlerSource)(THREE,buildTriggerHappyWeapon,buildTriggerHappyBullet,attachTriggerHappyWeapon,triggerHappyMuzzleWorld,avatars,game,'shooter',(type,fn)=>handlers.set(type,fn),()=>({x:avatar.position.x,y:avatar.position.y,z:avatar.position.z,visible:true}),()=>true,(v,a,b)=>Math.max(a,Math.min(b,v)),'first');
 const volley={by:'shooter',volleyId:'test-volley',at:1000,fireAt:1120,shots:30,intervalMs:85,endsAt:5000};
 const gun=handlers.get('triggerHappy')({THREE,scene,event:volley});gun.update(1120);
 const prop=avatar.userData.triggerHappyWeapon;assert(prop&&prop.root.parent===avatar,'gun must be attached to owner');
 const forward=new THREE.Vector3(),ownerForward=new THREE.Vector3(),muzzle=new THREE.Vector3();
 for(let i=0;i<32;i++){
  avatar.rotation.y=-Math.PI+i*Math.PI/16;gun.update(1120+i*5);
  // Rotation AFTER the effect update used to leave a detached gun behind.
  avatar.rotation.y+=.13;scene.updateMatrixWorld(true);
  prop.root.getWorldDirection(forward);avatar.getWorldDirection(ownerForward);assert(forward.distanceTo(ownerForward)<1e-10,'gun and avatar forward differ');
  triggerHappyMuzzleWorld(prop,muzzle);const expected=avatar.localToWorld(new THREE.Vector3(.274/.76,1.1,.8/.76));assert(muzzle.distanceTo(expected)<1e-10,'barrel tip drift');
  const yaw=avatar.rotation.y,fireAt=2000+i*10,event={by:'shooter',volleyId:'test-volley',shot:i,x:muzzle.x,z:muzzle.z,yaw,fireAt,length:8,speed:22};
  const before=new Set(scene.children),shot=handlers.get('triggerHappyShot')({THREE,scene,event,ownerId:'shooter'}),root=scene.children.find(o=>!before.has(o));assert(root,'bullet missing');
  shot.update(fireAt);assert(root.position.distanceTo(muzzle)<1e-10,'bullet must start at actual muzzle');
  avatar.rotation.y+=1.1;shot.update(fireAt+100);const direction=new THREE.Vector3().subVectors(root.position,muzzle).normalize(),expectedDirection=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));assert(direction.distanceTo(expectedDirection)<1e-10,'fired shot rotated with owner');shot.dispose();
 }
 avatar.visible=false;game.settings={viewMode:'3d'};gun.update(1400);assert(prop.root.parent===prop.viewAnchor&&prop.viewAnchor.parent===scene,'first-person gun must stay visible when body is hidden');scene.updateMatrixWorld(true);prop.root.getWorldDirection(forward);avatar.getWorldDirection(ownerForward);assert(forward.distanceTo(ownerForward)<1e-10);const anchor=prop.viewAnchor;
 const oldParent=prop.root.parent;gun.dispose();assert(!anchor.parent,'first-person anchor leaked');assert(!oldParent.children.includes(prop.root));assert(!avatar.userData.triggerHappyWeapon,'weapon reference leaked');
 console.log('PASS',file,'32 headings, late owner rotation, barrel origin, independent projectile flight, first-person visibility, cleanup');
}
