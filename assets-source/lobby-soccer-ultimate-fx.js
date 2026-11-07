function createSoccerUltimateFX(THREE,parent,glowMap){
 const root=new THREE.Group();root.name='soccer-ultimate-effects';parent.add(root);
 const geometries=new Set(),materials=new Set(),actors=new Map(),direction=new THREE.Vector3(),axis=new THREE.Vector3(0,0,1);
 const geo=g=>(geometries.add(g),g),mat=m=>(materials.add(m),m);
 const sphere=geo(new THREE.SphereGeometry(1,12,8)),cone=geo(new THREE.ConeGeometry(1,1,6)),crystal=geo(new THREE.OctahedronGeometry(1)),edge=geo(new THREE.EdgesGeometry(crystal)),ring=geo(new THREE.TorusGeometry(1,.028,5,48));
 const palette={thunder:'#ffe27d',meteor:'#ff8250',cyclone:'#9affdf',ice:'#a9ddff',dragon:'#65f6c9',drive:'#9bdfff',twin:'#ffdf9b',twinOverhead:'#ecc1ff'};
 function ribbon(dragon=false){
  const p=[],indices=[];
  for(let i=0;i<=64;i++){const u=i/64,a=u*Math.PI*(dragon?5:6),r=dragon?.38*(1-u):.3+u*.85;for(const s of [-1,1]){const angle=a+s*.07;p.push(Math.cos(angle)*r,dragon?Math.sin(angle)*r:u*2.8,dragon?-u*3:Math.sin(angle)*r);}if(i<64){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);return geo(g);
 }
 function dragonTube(){
  const p=[],indices=[],segments=48,sides=6;
  for(let i=0;i<=segments;i++){
   const u=i/segments,a=u*Math.PI*5,r=.38*(1-u),width=.115*(1-u)+.012;
   for(let j=0;j<sides;j++){const b=j*Math.PI*2/sides;p.push(Math.cos(a)*r+Math.cos(b)*width,Math.sin(a)*r+Math.sin(b)*width,-u*3);}
   if(i<segments)for(let j=0;j<sides;j++){const n=i*sides+j,next=i*sides+(j+1)%sides;indices.push(n,next,n+sides,next,next+sides,n+sides);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);return geo(g);
 }
 const spiral=ribbon(),dragonBody=dragonTube(),burstGeo=geo(new THREE.BufferGeometry()),burstPositions=[];
 for(let i=0;i<32;i++){const y=1-2*(i+.5)/32,r=Math.sqrt(1-y*y),a=i*2.39996;burstPositions.push(Math.cos(a)*r,y,Math.sin(a)*r);}
 burstGeo.setAttribute('position',new THREE.Float32BufferAttribute(burstPositions,3));
 const basic=(color,opacity=.7)=>mat(new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
 function mesh(parent,shape,color,opacity=.7){const n=new THREE.Mesh(shape,basic(color,opacity));parent.add(n);return n;}
 function release(key,a){
  a.node.removeFromParent();const set=new Set();a.node.traverse(n=>{if(n.material)set.add(n.material);});
  for(const m of set){m.dispose();materials.delete(m);}for(const g of a.privateGeometries){g.dispose();geometries.delete(g);}actors.delete(key);
 }
 function actor(key,kind){
  const old=actors.get(key);if(old?.kind===kind)return old;if(old)release(key,old);
  const node=new THREE.Group();node.name='soccer-ultimate-'+key;root.add(node);
  const a={node,kind,parts:[],privateGeometries:[],seen:0};actors.set(key,a);
  const glow=new THREE.Sprite(mat(new THREE.SpriteMaterial({map:glowMap,color:palette[kind],transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending})));glow.scale.setScalar(1.7);node.add(glow);a.glow=glow;
  a.burst=new THREE.Points(burstGeo,mat(new THREE.PointsMaterial({map:glowMap,color:palette[kind],size:.14,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending})));node.add(a.burst);
  if(['drive','twin','twinOverhead'].includes(kind)){
   for(let i=0;i<3;i++){const n=mesh(node,ring,i%2?'#9fdfff':palette[kind],.65);n.scale.setScalar(.5+i*.2);a.parts.push(n);}
  }else if(kind==='thunder'){
   const g=geo(new THREE.BufferGeometry());g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(36*6),3));a.privateGeometries.push(g);
   a.bolts=new THREE.LineSegments(g,mat(new THREE.LineBasicMaterial({color:'#fff2ac',transparent:true,opacity:.9,toneMapped:false})));a.bolts.frustumCulled=false;node.add(a.bolts);
   for(let i=0;i<2;i++)a.parts.push(mesh(node,ring,i?'#fff2a8':'#eeb548',.7));
  }else if(kind==='meteor'){
   a.core=mesh(node,sphere,'#ff9d46',.24);a.core.scale.setScalar(.48);
   for(let i=0;i<9;i++){const n=mesh(node,crystal,i%2?'#ffcf83':'#e6673c',.7);n.scale.set(.08,.16,.08);a.parts.push(n);}
  }else if(kind==='cyclone'){
   for(let i=0;i<3;i++){const n=mesh(node,spiral,i===1?'#d2fff0':'#72d8c7',.35+i*.1);n.rotation.y=i*Math.PI*2/3;a.parts.push(n);}
   a.floor=mesh(node,ring,'#a4f4d6',.65);a.floor.rotation.x=Math.PI/2;a.floor.scale.setScalar(2.65);
  }else if(kind==='ice'){
   for(const part of soccerIceWallPieces()){
    const n=new THREE.Group();n.userData.piece=part;
    const body=new THREE.Mesh(crystal,mat(new THREE.MeshPhongMaterial({color:'#92d4ff',emissive:'#133b60',specular:'#e5f8ff',shininess:90,transparent:true,opacity:.82,depthWrite:false,flatShading:true,toneMapped:false})));
    const outline=new THREE.LineSegments(edge,mat(new THREE.LineBasicMaterial({color:'#ddf9ff',transparent:true,opacity:.85,toneMapped:false})));n.add(body,outline);node.add(n);a.parts.push(n);
   }
  }else if(kind==='dragon'){
   for(let i=0;i<2;i++){
    const color=i?'#ffd793':'#77f3dc',head=new THREE.Group();node.add(head);
    const skull=mesh(head,sphere,color,.88);skull.scale.set(.19,.15,.27);
    const snout=mesh(head,cone,color,.85);snout.position.z=.22;snout.rotation.x=Math.PI/2;snout.scale.set(.12,.3,.12);
    for(const s of [-1,1]){
     const horn=mesh(head,cone,'#fff1ca',.9);horn.position.set(s*.13,.19,-.05);horn.rotation.z=-s*.35;horn.scale.set(.045,.23,.045);
     const eye=mesh(head,sphere,'#fffad5',1);eye.position.set(s*.15,.06,.14);eye.scale.set(.035,.04,.035);
    }
    const body=mesh(node,dragonBody,color,.65);body.rotation.z=i*Math.PI;a.parts.push({head,body});
   }
  }
  return a;
 }
 function animate(a,time,age,growth,hitAge=-1){
  const {kind,node,parts}=a,fade=hitAge<0?1:Math.max(0,1-hitAge/.7),t=time/1000;
  a.glow.material.opacity=.65*fade;a.glow.scale.setScalar(kind==='ice'?2:1.4);a.glow.position.set(0,kind==='cyclone'?1:0,0);
  a.burst.visible=hitAge>=0&&hitAge<.7;a.burst.scale.setScalar(.2+Math.max(0,hitAge)*3);a.burst.position.y=-Math.max(0,hitAge*hitAge);a.burst.material.opacity=fade;
  if(['drive','twin','twinOverhead'].includes(kind)){
   parts.forEach((n,i)=>{n.rotation.set(kind==='drive'?Math.PI/2:i*.7,kind==='drive'?t*5:i*.8,t*(i%2?3:-3));n.scale.setScalar((.45+i*.2)*growth);n.material.opacity=(.7-i*.12)*fade;});
  }else if(kind==='thunder'){
   const p=a.bolts.geometry.attributes.position.array,step=Math.floor(time/75);
   for(let i=0;i<36;i++)for(let side=0;side<2;side++){const j=i+side,u=j%13/12,lane=Math.floor(i/12),angle=lane*Math.PI*2/3+u*6,r=.42+Math.sin(j*9+step)*.12,at=i*6+side*3;p[at]=Math.cos(angle)*r*growth;p[at+1]=Math.sin(angle)*r*growth;p[at+2]=(u-.5)*1.8;}
   a.bolts.geometry.attributes.position.needsUpdate=true;
   parts.forEach((n,i)=>{n.rotation.set(Math.PI/2,0,t*(i?-3:3));n.scale.setScalar((.55+i*.25)*growth);n.material.opacity=(.7-i*.2)*fade;});
  }else if(kind==='meteor'){
   parts.forEach((n,i)=>{const angle=i*2.4+t*(i%2?1.5:-1.3),r=.68+Math.sin(t*2+i)*.1;n.position.set(Math.cos(angle)*r,Math.sin(angle)*r,Math.sin(i+t)*.2);n.rotation.set(t+i,t*.4,i);n.material.opacity=.7*fade;});a.core.rotation.y=t;
  }else if(kind==='cyclone'){
   parts.forEach((n,i)=>{n.rotation.y=i*2.094+t*(i===1?-5:4);n.scale.set(2*growth,growth,2*growth);n.material.opacity=(.3+i*.1)*fade;});a.floor.scale.setScalar(2.65*growth);a.floor.material.opacity=.6*fade;
  }else if(kind==='ice'){
   parts.forEach((n,i)=>{const p=n.userData.piece,k=Math.max(0,hitAge),spread=k*3;n.position.set(p.x+(i-2)*spread*.5,p.halfY*growth+k*1.5-k*k*4,Math.sin(i*2)*spread);n.scale.set(p.halfX*growth,p.halfY*growth,p.halfZ*growth);n.rotation.set(k*(i-2)*.8,0,k*(i-2));for(const m of n.children)m.material.opacity=(m.isLineSegments?.9:.8)*fade;});
  }else if(kind==='dragon'){
   parts.forEach(({head,body},i)=>{const a=t*4+i*Math.PI;head.position.set(Math.cos(a)*.38,Math.sin(a)*.38,.2);head.rotation.z=Math.sin(a)*.25;body.rotation.z=a;body.material.opacity=.65*fade;});
  }
 }
 return {update(g,players,time,ball){
  for(const a of actors.values())a.node.visible=false;
  if(!soccerSecretActive(g)){this.clear();return;}
  for(const [id,p]of Object.entries(g.secretPowers||{})){
   if(!['thunder','meteor','cyclone','ice','dragon','drive'].includes(p.kind)||p.cancelled||!players[id]||g.members?.[id]===undefined||time<p.at||time>p.until)continue;
   const owner=players[id],age=(time-p.at)/1000,windup=(p.releaseAt-p.at)/1000,growth=Math.max(.05,Math.min(1,age/Math.max(.1,windup))),hitAge=p.hitAt===undefined?-1:(time-p.hitAt)/1000;
   if(!['ice','cyclone'].includes(p.kind)&&hitAge>.35)continue;
   const a=actor(id,p.kind);a.node.visible=true;a.seen=time;a.node.position.set(p.kind==='ice'?p.x:owner.x,p.kind==='ice'||p.kind==='cyclone'?.05:.65,p.kind==='ice'?p.z:owner.z);a.node.rotation.set(0,p.yaw||0,0);
   animate(a,time,age,growth,hitAge);
  }
  const combo=g.secretCombo;
  if(combo&&!combo.cancelled&&time>=combo.at&&time<combo.until){
   combo.ids.forEach((id,i)=>{const f=g.finishes?.[id];if(!f)return;const m=sampleSoccerComboPose(f,combo,time);if(!m)return;const a=actor('combo-'+id,combo.kind);a.node.visible=true;a.seen=time;a.node.position.set(f.x+(f.airX-f.x)*m.weight,m.height+1,f.z+(f.airZ-f.z)*m.weight);a.node.rotation.set(0,f.yaw,0);animate(a,time,(time-combo.at)/1000,.65,combo.hitAt===undefined?-1:(time-combo.hitAt)/1000);});
  }
  const shot=g.ball.secretShot;
  if(shot&&shot.from===g.ball.lastTouch&&time<shot.until&&!shot.impacted&&!g.ball.dribbler&&g.ball.keeperOwner===undefined&&time>=Number(g.ball.resetUntil||0)){
   const a=actor('ball',shot.kind);a.node.visible=true;a.seen=time;a.node.position.copy(ball);direction.set(g.ball.vx||0,g.ball.vy||0,g.ball.vz||1).normalize();a.node.quaternion.setFromUnitVectors(axis,direction);animate(a,time,(time-shot.at)/1000,1);
  }
  for(const [id,a]of actors)if(!a.node.visible&&time-a.seen>750)release(id,a);
 },clear(){for(const [id,a]of actors)release(id,a);},dispose(){this.clear();root.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();}};
}

function applySoccerUltimatePose(crew,g,id,time,pose){
 const p=g?.secretPowers?.[id];if(!soccerSecretActive(g)||!p||p.cancelled||!['thunder','meteor','cyclone','ice','dragon','drive'].includes(p.kind)||time<p.at||time>Math.min(p.until,p.releaseAt+400))return false;
 const u=Math.max(0,Math.min(1,(time-p.at)/Math.max(1,p.releaseAt-p.at))),release=Math.max(0,Math.min(1,(time-p.releaseAt)/400)),weight=Math.sin(u*Math.PI/2)*(1-release),strike=Math.sin(release*Math.PI);
 const rig=crew.root.userData.tailoredAvatar||crew.root.userData,arms=rig.arms||rig.walkArms||crew.root.userData.walkArms||[],gear=crew.root.userData.walkCostumeRoot||crew.root.getObjectByName('lobbyCostume')||crew.root.getObjectByName('remoteCostume');
 const torso=[...new Set([crew.body,crew.pack,crew.visor,crew.shine,gear].filter(Boolean))];
 for(const n of [crew.root,...torso,...(crew.legs||[]),...arms])pose(n);
 crew.root.rotation.y+=Math.atan2(Math.sin(p.yaw-crew.root.rotation.y),Math.cos(p.yaw-crew.root.rotation.y))*weight*.7;
 const crouch=p.kind==='meteor'?.18:p.kind==='cyclone'?.15:.09;
 for(const n of torso){n.position.y-=crouch*weight;n.rotation.x+=(p.kind==='ice'?-.12:.15)*weight;n.rotation.y+=(p.kind==='cyclone'?Math.sin(u*Math.PI*2)*.3:0);}
 (crew.legs||[]).forEach((n,i)=>{n.position.x+=(i?1:-1)*weight*.1;n.rotation.x+=(i?-.35:.25)*weight;if(i===1&&['thunder','meteor','dragon','drive'].includes(p.kind))n.rotation.x-=strike*1.4;});
 arms.forEach((n,i)=>{n.rotation.x=(p.kind==='ice'?-1.25:p.kind==='cyclone'?-.7:(i?.45:-.6))*weight;n.rotation.z=(i?-1:1)*(p.kind==='cyclone'?1:.5)*weight;});return true;
}

function applySoccerCombinationPose(crew,g,id,time,pose,ballMesh){
 if(!soccerSecretActive(g))return false;
 const f=g?.finishes?.[id],m=sampleSoccerComboPose(f,g?.secretCombo,time);if(!m)return false;
 const rig=crew.root.userData.tailoredAvatar||crew.root.userData,arms=rig.arms||rig.walkArms||crew.root.userData.walkArms||[];
 for(const n of [crew.root,...crew.legs,...arms])pose(n);
 crew.root.position.x+=(f.airX-f.x)*m.weight;crew.root.position.z+=(f.airZ-f.z)*m.weight;crew.root.position.y+=m.height;crew.root.rotation.set(m.pitch,m.yaw,0,'YXZ');
 crew.legs[0].rotation.x=m.left;crew.legs[1].rotation.x=m.right;arms.forEach((a,i)=>{a.rotation.z=(i?-1:1)*.9*m.weight;a.rotation.x=-.3*m.weight;});
 alignSoccerFoot(crew,f.side<0?0:1,g.secretCombo.contact||g.secretCombo.point,time,f.contactAt);return true;
}
