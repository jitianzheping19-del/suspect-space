function createSoccerSecretFX(THREE,root){
 const group=new THREE.Group();group.name='soccer-secret-effects';group.visible=false;root.add(group);
 const geometries=new Set(),materials=new Set(),effects=new Map(),history=[],N=32;
 const geometry=g=>(geometries.add(g),g),material=m=>(materials.add(m),m);
 const ringGeo=geometry(new THREE.TorusGeometry(.8,.035,5,48)),orbGeo=geometry(new THREE.SphereGeometry(.13,8,6));
 const glowPixels=new Uint8Array(32*32*4);
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4,r=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5);glowPixels[i]=glowPixels[i+1]=glowPixels[i+2]=255;glowPixels[i+3]=Math.round(Math.pow(Math.max(0,1-r),2)*255);}
 const glowMap=new THREE.DataTexture(glowPixels,32,32,THREE.RGBAFormat);glowMap.needsUpdate=true;
 const ultimateFX=createSoccerUltimateFX(THREE,group,glowMap);
 const glowMaterial=color=>material(new THREE.SpriteMaterial({map:glowMap,color,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
 const meshMaterial=color=>material(new THREE.MeshBasicMaterial({color,transparent:true,opacity:.7,depthWrite:false,toneMapped:false}));
 const ballGlow=new THREE.Sprite(glowMaterial('#ffaf4f'));ballGlow.name='soccer-fire-core';ballGlow.scale.setScalar(1.25);group.add(ballGlow);
 const ribbons=[];
 for(let plane=0;plane<2;plane++){
  const geo=geometry(new THREE.BufferGeometry()),positions=new Float32Array(N*6),colors=new Float32Array(N*6),indices=[];
  for(let i=0;i<N-1;i++){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.setIndex(indices);geo.setDrawRange(0,0);
  const mesh=new THREE.Mesh(geo,material(new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:plane?.5:.8,depthWrite:false,blending:THREE.AdditiveBlending})));mesh.frustumCulled=false;mesh.name='soccer-fire-ribbon-'+plane;group.add(mesh);ribbons.push({mesh,geo,positions,colors});
 }
 const sparksGeo=geometry(new THREE.BufferGeometry()),sparksPosition=new Float32Array(N*3),sparksColor=new Float32Array(N*3);
 sparksGeo.setAttribute('position',new THREE.BufferAttribute(sparksPosition,3));sparksGeo.setAttribute('color',new THREE.BufferAttribute(sparksColor,3));
 const sparks=new THREE.Points(sparksGeo,material(new THREE.PointsMaterial({map:glowMap,vertexColors:true,size:.28,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending})));sparks.frustumCulled=false;sparks.name='soccer-fire-trail';group.add(sparks);
 const energyColors={thunder:new THREE.Color('#ffe17d'),meteor:new THREE.Color('#ff6439'),dragon:new THREE.Color('#65f6c9'),drive:new THREE.Color('#8ccfff'),twin:new THREE.Color('#ffd87b'),twinOverhead:new THREE.Color('#f9b9ff')};
 const warm=new THREE.Color('#ff7529'),hot=new THREE.Color('#fff1a9'),cool=new THREE.Color('#6bdcff'),color=new THREE.Color();
 let lastSample=-Infinity,trailKind='',match='',disposed=false;
 function effect(id){
  if(effects.has(id))return effects.get(id);
  const node=new THREE.Group();node.name='soccer-secret-'+id;group.add(node);
  const rings=Array.from({length:3},()=>{const m=new THREE.Mesh(ringGeo,meshMaterial('#a6f7ff'));node.add(m);return m;});
  const orbs=Array.from({length:2},()=>{const m=new THREE.Mesh(orbGeo,meshMaterial('#ffffff'));node.add(m);return m;});
  const core=new THREE.Sprite(glowMaterial('#ffffff'));node.add(core);const e={node,rings,orbs,core};effects.set(id,e);return e;
 }
 function removeEffect(id,e){e.node.removeFromParent();e.node.traverse(n=>{if(n.material){n.material.dispose();materials.delete(n.material);}});effects.delete(id);}
 function clear(){
  ultimateFX.clear();history.length=0;lastSample=-Infinity;trailKind='';ballGlow.visible=sparks.visible=false;
  for(const r of ribbons){r.mesh.visible=false;r.geo.setDrawRange(0,0);}
  for(const [id,e]of effects)removeEffect(id,e);
 }
 function updateTrail(g,time,ball){
  const fire=!!g.ball.fire,relay=!fire&&g.flight&&g.secretChain&&time-g.secretChain.at<8000;
  const shot=g.ball.secretShot,special=shot&&shot.from===g.ball.lastTouch&&time<shot.until&&!shot.impacted?shot.kind:'';
  const kind=special||(fire?'fire':relay?'relay':''),visible=!!kind&&!g.ball.dribbler&&g.ball.keeperOwner===undefined&&time>=Number(g.ball.resetUntil||0);
  ballGlow.visible=sparks.visible=visible;for(const r of ribbons)r.mesh.visible=visible;
  if(!visible){history.length=0;lastSample=-Infinity;trailKind='';return;}
  if(kind!==trailKind||history[0]&&Math.hypot(ball.x-history[0].x,ball.y-history[0].y,ball.z-history[0].z)>8||time<lastSample){history.length=0;lastSample=-Infinity;trailKind=kind;}
  if(time-lastSample>=12){history.unshift({x:ball.x,y:ball.y,z:ball.z,at:time});history.length=Math.min(N,history.length);lastSample=time;}
  while(history.length>1&&time-history.at(-1).at>460)history.pop();
  ballGlow.position.copy(ball);ballGlow.material.color.copy(energyColors[kind]||(fire?warm:cool));ballGlow.scale.setScalar(fire?1.25:1);
  const length=history.length;
  for(let i=0;i<N;i++){
   const p=history[Math.min(i,length-1)],prev=i?history[i-1]||p:p,next=history[Math.min(i+1,length-1)],u=Math.max(0,Math.min(1,(time-p.at)/460)),fade=Math.pow(1-u,1.5),dx=prev.x-next.x,dz=prev.z-next.z,d=Math.hypot(dx,dz)||1,width=(fire?.24:.15)*fade;
   color.copy(energyColors[kind]||(fire?warm:cool)).lerp(hot,fire?Math.max(0,1-i/7):.12).multiplyScalar(fade);
   for(let plane=0;plane<2;plane++)for(let side=0;side<2;side++){
    const s=side?1:-1,at=i*6+side*3,r=ribbons[plane];
    r.positions[at]=p.x+(plane?0:-dz/d*width*s);r.positions[at+1]=p.y+(plane?width*s:0);r.positions[at+2]=p.z+(plane?0:dx/d*width*s);
    r.colors[at]=color.r;r.colors[at+1]=color.g;r.colors[at+2]=color.b;
   }
   const j=i*3,w=fire?u*.7:u*.25;
   sparksPosition[j]=p.x+Math.sin(i*2.4+time*.003)*w;sparksPosition[j+1]=p.y+u*(fire?.8:.25);sparksPosition[j+2]=p.z+Math.cos(i*1.7+time*.002)*w;
   sparksColor[j]=color.r;sparksColor[j+1]=color.g;sparksColor[j+2]=color.b;
  }
  for(const r of ribbons){r.geo.attributes.position.needsUpdate=true;r.geo.attributes.color.needsUpdate=true;r.geo.setDrawRange(0,Math.max(0,length-1)*6);}
  sparksGeo.attributes.position.needsUpdate=true;sparksGeo.attributes.color.needsUpdate=true;sparksGeo.setDrawRange(0,length);
 }
 return {update(g,players,time,ball){
  if(disposed)return;
  group.visible=soccerSecretActive(g);if(!group.visible){clear();match='';return;}
  const identity=g.id||g.startAt||'';if(identity!==match){clear();match=identity;}
  updateTrail(g,time,ball);ultimateFX.update(g,players,time,ball);
  for(const e of effects.values())e.node.visible=false;
  for(const [id,power]of Object.entries(g.secretPowers||{})){
   const p=players[id],f=g.finishes?.[id],end=power.kind==='iron'?Math.max(power.until,f?.until||0):power.until;
   if(['thunder','meteor','cyclone','ice','dragon','drive'].includes(power.kind))continue;
   if(!p||g.members?.[id]===undefined||time<power.at||time>end)continue;
   const e=effect(id),age=(time-power.at)/1000,u=Math.min(1,age/.9),fade=Math.min(1,(end-time)/180),kind=power.kind;
   const palette=kind==='taichi'?'#c4aeff':kind==='belly'?'#ffb87e':kind==='iron'?'#b4dfff':'#8edfff';
   e.node.visible=true;e.node.position.set(p.x,kind==='taichi'?1.05:kind==='belly'?.75:.35,p.z);e.node.rotation.set(0,p.yaw||0,0);
   if(kind==='iron'&&f?.sky){const before=time<=f.contactAt,t=before?(time-f.at)/550:1-(time-f.contactAt)/1000,progress=Math.max(0,Math.min(1,t)),w=progress*progress*(3-2*progress);e.node.position.set(f.x+(f.airX-f.x)*w,1.5+Math.max(0,f.airY-1.5)*w,f.z+(f.airZ-f.z)*w);}
   e.core.position.set(0,0,kind==='belly'?.55:0);e.core.material.color.set(palette);e.core.material.opacity=.65*fade;e.core.scale.setScalar(kind==='belly'?.6+u*.7:1.1);
   e.rings.forEach((r,i)=>{
    r.visible=true;r.material.color.set(palette);r.material.opacity=(.6-i*.12)*fade;
    const scale=kind==='belly'?(.35+(1-u)*1.2+i*.18):kind==='iron'?.55+i*.18:1+i*.26;
    r.scale.setScalar(scale);r.position.set(0,0,kind==='belly'?.55:0);
    r.rotation.set(kind==='taichi'?(i-1)*.65:kind==='belly'?0:Math.PI/2,kind==='taichi'?age*(i%2?2:-2):0,age*(i%2?-2:2)+i*.8);
   });
   e.orbs.forEach((o,i)=>{o.visible=kind==='taichi'||kind==='relay';const angle=age*5+i*Math.PI;o.position.set(Math.cos(angle),Math.sin(angle),.15);o.material.color.set(i?'#fff1c9':palette);o.material.opacity=fade;});
  }
  const impact=g.secretImpact;
  if(impact&&time>=impact.at&&time<impact.at+900){
   const e=effect('impact'),u=(time-impact.at)/900;e.node.visible=true;e.node.position.set(impact.x,.07,impact.z);e.node.rotation.set(0,0,0);e.core.visible=false;for(const o of e.orbs)o.visible=false;
   e.rings.forEach((r,i)=>{const q=Math.max(0,u-i*.12);r.visible=u>=i*.12;r.position.set(0,i*.02,0);r.rotation.set(Math.PI/2,0,0);r.scale.setScalar(1+q*7);r.material.color.set(impact.kind==='meteor'?(i?'#ff6f38':'#ffd49b'):(i?'#ffb864':'#fff4c9'));r.material.opacity=Math.pow(1-q,2)*.75;});
  }
  const move=g.secretGoalMove;
  if(move&&time>=move.at&&time<move.until){
   const e=effect('moving-goal'),F=soccerPitch(g.pitchCount||0),age=(time-move.at)/1000;e.node.visible=true;e.node.position.set(23+(g.secretGoalOffsets?.[move.team]||0),.08,move.team===0?F.near:F.far);e.node.rotation.set(0,0,0);e.core.visible=false;for(const o of e.orbs)o.visible=false;
   e.rings.forEach((r,i)=>{r.visible=i<2;r.position.set(0,i*.015,0);r.rotation.set(Math.PI/2,0,0);r.scale.setScalar(3.4+i*.6+Math.sin(age*2)*.08);r.material.color.set('#ffcf78');r.material.opacity=.36-i*.12;});
  }
  for(const [id,e]of effects)if(!e.node.visible&&(!Object.hasOwn(g.members||{},id)||!players[id]))removeEffect(id,e);
 },dispose(){
  if(disposed)return;disposed=true;clear();ultimateFX.dispose();group.removeFromParent();for(const g of geometries)g.dispose();for(const m of materials)m.dispose();glowMap.dispose();
 }};
}
