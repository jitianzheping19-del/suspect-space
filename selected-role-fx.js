// Bounded world effects share the game's frame loop and visibility rules.
export function createSelectedRoleEffect({THREE:T,scene,event,ownerId,getPose,getAvatar=()=>null,getGame=()=>({}),visible}){
 if(event.visibleTo&&!event.visibleTo.includes(ownerId)||event.type==='fencer'&&event.by!==ownerId)return null;
 const type=event.type,shield=type==='fencer',fire=type==='bomber',punch=type==='boxer',charge=type==='boxerCharge',feed=type==='evolverFeed',consume=type==='evolver',slash=type==='evolverSlash'||type==='fencerRiposte',bait=type==='baitTrigger';
 const color=fire?0xffb04d:punch||charge||type==='boxerImpact'?0xff8395:feed||consume||type==='evolverSlash'?0xaff58d:bait?0xffd29b:0x88eeff;
 const root=new T.Group(),geometries=new Set(),materials=new Set(),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);scene.add(root);
 const geo=g=>(geometries.add(g),g),mat=(c,opacity=1,metal=false)=>{const m=metal?new T.MeshStandardMaterial({color:c,metalness:.55,roughness:.3}):new T.MeshBasicMaterial({color:c,transparent:opacity<1,opacity,depthWrite:opacity===1});materials.add(m);return m;};
 const emissive=(c,opacity=.7)=>{const m=mat(c,opacity);m.blending=T.AdditiveBlending;m.depthWrite=false;return m;};
 const mesh=(g,m,x=0,y=0,z=0,p=root)=>{const n=new T.Mesh(g,m);n.position.set(x,y,z);p.add(n);return n;};
 const box=geo(new T.BoxGeometry(1,1,1)),sphere=geo(new T.SphereGeometry(1,12,8)),ringGeo=geo(new T.TorusGeometry(1,.022,6,48));
 const block=(p,m,x,y,z,w,h,d)=>{const n=mesh(box,m,x,y,z,p);n.scale.set(w,h,d);return n;};
 const orb=(p,m,x,y,z,sx,sy,sz)=>{const n=mesh(sphere,m,x,y,z,p);n.scale.set(sx,sy,sz);return n;};
 const rings=Array.from({length:fire?3:2},(_,i)=>{const n=mesh(ringGeo,emissive(color,.7),0,.08+i*.025,0);n.rotation.x=-Math.PI/2;return n;});
 let shell,flash,glove,alert,cuts=[];
 if(shield||type==='fencerBlocked'){
  shell=mesh(geo(new T.IcosahedronGeometry(.82,1)),mat(color,.10),0,.9,0);shell.scale.set(1,1.2,1);
  const edge=new T.LineSegments(geo(new T.EdgesGeometry(shell.geometry)),new T.LineBasicMaterial({color,transparent:true,opacity:.35,depthWrite:false}));materials.add(edge.material);shell.add(edge);
 }
 if(fire){shell=orb(root,emissive(0xff6a32,.45),0,.40,0,1,1,1);flash=orb(root,emissive(0xffe5a7,.7),0,.45,0,1,1,1);}
 if(punch||charge){
  glove=new T.Group();root.add(glove);const leather=mat(0x9f2140,1,true),dark=mat(0x172e40,1,true),stitch=mat(0xf5d2b0,1,true);
  orb(glove,leather,0,0,.13,.28,.23,.34);orb(glove,leather,.22,-.10,0,.11,.15,.21);block(glove,dark,0,0,-.18,.38,.24,.16);block(glove,stitch,0,.13,-.18,.22,.025,.10);
  for(let i=0;i<7;i++)block(glove,stitch,(i-3)*.045,.22,.13,.012,.01,.04);
 }
 if(bait){alert=new T.Group();root.add(alert);const gold=emissive(color,.9);block(alert,gold,0,.11,0,.055,.28,.055);orb(alert,gold,0,-.13,0,.037,.037,.037);}
 if(slash)for(let i=0;i<(type==='evolverSlash'?3:2);i++){
  const shape=new T.Shape();shape.moveTo(-.62,-.025);shape.quadraticCurveTo(0,.27,.69,.04);shape.quadraticCurveTo(0,.11,-.62,-.025);const blade=mesh(geo(new T.ShapeGeometry(shape)),emissive(color,.8),0,.65+i*.12,.07+i*.04);blade.material.side=T.DoubleSide;blade.rotation.z=-.5+i*.10;cuts.push(blade);
 }
 const count=fire?36:24,points=new Float32Array(count*3),particleGeo=geo(new T.BufferGeometry());particleGeo.setAttribute('position',new T.BufferAttribute(points,3));
 const particleMat=new T.PointsMaterial({color,size:fire?.095:.045,transparent:true,opacity:.8,depthWrite:false,blending:T.AdditiveBlending});materials.add(particleMat);const sparks=new T.Points(particleGeo,particleMat);root.add(sparks);
 const duration=shield?Math.max(.1,(event.until-event.at)/1000):charge?120:feed?Math.max(.2,(event.until-event.at)/1000)+.3:fire?1.1:bait?1.2:punch?.5:.65;
 const world=V(),rotation=new T.Quaternion(),savedArm=new T.Euler();let controlledArm=null;
 function handPose(stamp,f){
  const avatar=getAvatar(event.by),arm=avatar?.userData?.arms?.[1];
  if(arm){
   if(controlledArm!==arm){controlledArm=arm;savedArm.copy(arm.rotation);}
   const wind=charge?Math.min(1,(stamp-event.at)/2000):1,stroke=charge?0:Math.sin(Math.min(1,f*1.6)*Math.PI);
   arm.rotation.x=-.85-wind*.35-stroke*.65;arm.updateWorldMatrix(true,false);world.set(0,-.29,.08).applyMatrix4(arm.matrixWorld);arm.getWorldQuaternion(rotation);glove.quaternion.copy(rotation);glove.position.copy(world).sub(root.position);glove.scale.setScalar(Math.abs(avatar.scale.x)||.76);glove.visible=avatar.visible;
  }else{glove.position.set(0,.9,0);glove.visible=true;}
 }
 return{update(stamp){
  const age=(stamp-event.at)/1000;if(age<0||age>duration)return false;
  const game=getGame(),state=game.players?.[event.by];
  if(charge&&(!state?.boxerCharge||state.boxerCharge.at!==event.at)||feed&&state?.evolverMeal?.bodyId!==event.bodyId)return false;
  if(!['play','ended'].includes(game.phase))return false;
  const anchor=shield||charge||bait?getPose(event.by):event;root.position.set(Number(anchor?.x)||0,0,Number(anchor?.z)||0);root.visible=visible(root.position);if(!root.visible)return true;
  const f=Math.max(0,Math.min(1,age/duration));if(glove)handPose(stamp,f);
  for(let i=0;i<rings.length;i++){
   const sustain=shield||charge||feed;
   const radius=shield?.65:charge?.25+Math.min(1,age/2)*.35:feed?.8*(1-(age*.6)%1):consume?.8*(1-f):fire?Math.max(.15,(event.radius||4)*(f-i*.04)):.25+f*1.5;
   rings[i].scale.setScalar(Math.max(.01,radius+i*.06));rings[i].rotation.z=age*(i?-.8:.6);rings[i].material.opacity=sustain?.15+.10*Math.sin(age*5+i):(1-f)*.55;
  }
  if(shell&&fire){shell.scale.setScalar(Math.max(.05,(event.radius||4)*.45*Math.sin(f*Math.PI)));shell.material.opacity=(1-f)*.45;flash.scale.setScalar(Math.max(.01,(event.radius||4)*.22*(1-f)));flash.material.opacity=Math.max(0,.65-f*3);}
  if(shell&&!fire){shell.rotation.y=age*.4;shell.material.opacity=shield?.07+.03*Math.sin(age*6):(1-f)*.22;}
  if(alert){alert.position.y=1.9+Math.sin(age*10)*.06;alert.scale.setScalar(.65+Math.min(1,age*8)*.25);}
  for(const c of cuts){c.scale.setScalar(.5+Math.min(1,f*3)*.65);c.material.opacity=(1-f)*.8;c.position.x=(f-.5)*.5;}
  const to=feed||consume?getPose(event.by):null;
  for(let i=0;i<count;i++){
   const a=i*2.39996+age*2,flow=(age*1.4+i/count)%1,r=shield?.75:charge?.45:feed||consume?.65*(1-flow):fire?(event.radius||4)*f:1.1*f;
   points[i*3]=to?(to.x-root.position.x)*flow+Math.cos(a)*r:Math.cos(a)*r;
   points[i*3+1]=shield?.2+i%6*.24:to?.15+flow*.65:charge?.18+Math.abs(Math.sin(a))*Math.min(1,age/2)*.5:.10+Math.sin(f*Math.PI)*(fire?1.1:.5)+i%3*.04;
   points[i*3+2]=to?(to.z-root.position.z)*flow+Math.sin(a)*r:Math.sin(a)*r;
  }
  particleGeo.attributes.position.needsUpdate=true;particleMat.opacity=shield||charge||feed?.65:1-f;return true;
 },dispose(){if(controlledArm?.parent)controlledArm.rotation.copy(savedArm);root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
