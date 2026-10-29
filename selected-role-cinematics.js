// Serialized into the existing preloaded cinematic iframe. No second canvas or RAF.
export function createSelectedRoleCinematic(T,{renderer,data,art,buildCostume,cue=()=>{}}){
 const role=data.role,payload=data.payload||{},mobile=matchMedia('(pointer:coarse)').matches;
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(34,1,.08,80),V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);},phase=(t,a,b)=>smooth((t-a)/(b-a)),mix=(a,b,t)=>a+(b-a)*t;
 const colors={fencer:0x8cecff,evolver:0x9cea8b,bomber:0xffb65b,boxer:0xff8a9f,bait:0xffd18c},accent=colors[role];
 const m=(color,metalness=.15,roughness=.4)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const glow=(color,opacity=.7)=>new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
 const ball=new T.SphereGeometry(1,mobile?12:20,mobile?8:12),boxGeo=new T.BoxGeometry(1,1,1),torus=new T.TorusGeometry(1,.018,6,mobile?36:56);
 const mesh=(parent,geometry,material,x=0,y=0,z=0,sx=1,sy=1,sz=1)=>{const n=new T.Mesh(geometry,material);n.position.set(x,y,z);n.scale.set(sx,sy,sz);parent.add(n);return n;};
 const orb=(parent,material,x,y,z,xr,yr,zr)=>mesh(parent,ball,material,x,y,z,xr,yr,zr);
 const box=(parent,material,x,y,z,w,h,d)=>mesh(parent,boxGeo,material,x,y,z,w,h,d);
 const ring=(parent,material,x,y,z,r)=>{const n=mesh(parent,torus,material,x,y,z,r,r,r);n.rotation.x=-Math.PI/2;return n;};
 const steel=m(0xb1cad5,.72,.24),black=m(0x152b3a,.35,.35),gold=m(0xc8a672,.65,.28),light=glow(accent),dim=glow(accent,.18);
 scene.add(new T.HemisphereLight(0xdff5ff,0x243c50,2.0));
 for(const[color,intensity,pos]of[[0xffead3,3.5,[-3,5,5]],[0x89d6ff,1.6,[4,2,4]],[accent,2.4,[2,4,-3]]]){const l=new T.DirectionalLight(color,intensity);l.position.set(...pos);scene.add(l);}
 renderer.shadowMap.enabled=false;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
 const reflection=document.createElement('canvas');reflection.width=256;reflection.height=128;const rc=reflection.getContext('2d'),rg=rc.createLinearGradient(0,0,0,128);rg.addColorStop(0,'#91b2c4');rg.addColorStop(.5,'#213544');rg.addColorStop(1,'#08131e');rc.fillStyle=rg;rc.fillRect(0,0,256,128);rc.fillStyle='#d9f3ff';rc.fillRect(35,15,12,55);rc.fillStyle='#d3b38b';rc.fillRect(170,10,20,40);
 const envMap=new T.CanvasTexture(reflection);envMap.mapping=T.EquirectangularReflectionMapping;envMap.colorSpace=T.SRGBColorSpace;const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(envMap);scene.environment=environment.texture;envMap.dispose();pmrem.dispose();
 function actor(color,outfit){
  const a=art.makeCrew(color,{arms:true,gameplay:payload.useGameCharacter!==false});scene.add(a.root);
  // Apply the fall around the scene's Z axis after facing the other actor.
  a.root.rotation.order='ZYX';
  a.root.userData.tailoredAvatar={arms:a.arms,legs:a.legs};
  if(buildCostume&&outfit&&outfit!=='standard'){
   const wear=buildCostume(T,outfit);a.root.add(wear);a.wear=wear;
   if(wear.userData.pet)wear.userData.pet.visible=false;
  }
  return a;
 }
 const killer=actor(payload.killerColor||0xee5368,payload.killerCostume),victim=actor(payload.victimColor||0x46c4e6,payload.victimCostume);
 killer.root.position.set(-1.25,0,0);victim.root.position.set(.65,0,0);killer.root.rotation.y=Math.PI/2;victim.root.rotation.y=-Math.PI/2;
 const actors=[killer,victim],fx=new T.Group();scene.add(fx);const fired=new Set();
 const once=(key,yes,frequency=130,end=45,length=.12,type='triangle')=>{if(yes&&!fired.has(key)){fired.add(key);cue(frequency,end,length,type);}};
 const rings=Array.from({length:3},(_,i)=>ring(fx,glow(accent,0),.7,.08+i*.025,0,1));
 const particleCount=mobile?30:54,particleArray=new Float32Array(particleCount*3),particleGeo=new T.BufferGeometry();particleGeo.setAttribute('position',new T.BufferAttribute(particleArray,3));const particles=new T.Points(particleGeo,new T.PointsMaterial({color:accent,size:.055,transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending}));particles.frustumCulled=false;fx.add(particles);
 const flash=orb(fx,glow(0xffe6c0,0),.65,1,0,1,1,1);
 let weapon=null,shield=null,claws=[],device=null,lamps=[],glove=null,wall=null,cracks=null,fragments=null,alert=null,scanner=null;
 if(role==='fencer'){
  weapon=art.blade(killer.hands[1],{length:1.12,katana:false,accent});
  art.blade(victim.hands[1],{length:.60,katana:false,accent:0xffb38a});
  shield=mesh(fx,new T.IcosahedronGeometry(.8,1),new T.MeshPhysicalMaterial({color:accent,metalness:.15,roughness:.2,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide,emissive:accent,emissiveIntensity:.3}),-.35,1.05,0);shield.scale.set(.22,1.05,.9);
  for(let i=0;i<3;i++){const r=ring(shield,glow(accent,.5),0,0,0,.7+i*.12);r.rotation.set(0,0,i*.7);}
 }
 if(role==='evolver'){
  for(const hand of killer.hands){const assembly=new T.Group();hand.add(assembly);assembly.position.set(0,-.08,.09);box(assembly,black,0,0,0,.22,.14,.23);
   for(let i=0;i<3;i++){const blade=mesh(assembly,new T.ConeGeometry(.025,.52,5),steel,(i-1)*.075,0,.30,1,1,1);blade.rotation.x=Math.PI/2;box(assembly,light,(i-1)*.075,.02,.19,.012,.012,.27);}claws.push(assembly);
  }
  scanner=ring(killer.torso,glow(accent,.5),0,.12,.43,.17);scanner.rotation.x=0;
 }
 if(role==='bomber'){
  device=new T.Group();victim.torso.add(device);device.position.set(0,.03,.42);box(device,black,0,0,0,.45,.32,.14);
  for(let i=0;i<3;i++){const charge=mesh(device,new T.CylinderGeometry(.052,.052,.38,12),m(0x7a3231,.35,.4),(i-1)*.12,0,.10);charge.rotation.z=0;const diode=orb(device,glow(i===2?0xff725b:0xffce75,.8),(i-1)*.12,.12,.16,.018,.018,.014);lamps.push(diode);}
  for(const x of[-.19,.19])box(device,steel,x,0,.12,.025,.32,.035);
  const wire=new T.CatmullRomCurve3([V(-.19,.12,.1),V(-.12,.27,.14),V(.15,.23,.12),V(.18,.05,.12)]);mesh(device,new T.TubeGeometry(wire,16,.009,5,false),m(0x997b46,.4,.35));
 }
 if(role==='boxer'){
  const red=m(0x9c2442,.1,.3),seam=m(0xe9d8c6,.25,.5);glove=new T.Group();killer.hands[1].add(glove);glove.position.set(0,-.06,.13);
  orb(glove,red,0,0,.14,.30,.25,.38);orb(glove,red,.23,-.12,.02,.12,.16,.22);box(glove,black,0,0,-.19,.40,.26,.18);box(glove,gold,0,.145,-.18,.23,.035,.12);
  for(let i=0;i<7;i++)box(glove,seam,(i-3)*.05,.24,.12,.018,.012,.045);
  wall=new T.Group();scene.add(wall);wall.position.set(3.2,0,-.15);
  box(wall,m(0x233b4b,.45,.4),.12,1.45,0,.24,2.9,1.9);for(const z of[-.8,.8])box(wall,steel,-.02,1.45,z,.06,2.9,.05);
  cracks=new T.Group();wall.add(cracks);const crackMaterial=glow(0xffd8b3,.75);for(let i=0;i<12;i++){const a=i*2.4;const points=[V(-.13,1.1,0),V(-.14,1.1+Math.sin(a)*.32,Math.cos(a)*.32),V(-.14,1.1+Math.sin(a+.3)*.7,Math.cos(a+.3)*.7)];mesh(cracks,new T.TubeGeometry(new T.CatmullRomCurve3(points),8,.006,4),crackMaterial);}
  fragments=new T.InstancedMesh(new T.IcosahedronGeometry(.07,0),steel,mobile?12:22);fx.add(fragments);
 }
 if(role==='bait'){
  alert=new T.Group();fx.add(alert);box(alert,glow(0xffd18c,.9),0,.13,0,.065,.34,.065);orb(alert,glow(0xffd18c,.9),0,-.14,0,.043,.043,.043);
  scanner=new T.Group();killer.hands[0].add(scanner);box(scanner,black,0,-.06,.08,.19,.16,.13);box(scanner,light,0,-.055,.154,.13,.09,.014);
 }
 const dummy=new T.Object3D(),bodyBounds=new T.Box3(),partBounds=new T.Box3(),corner=V(),focus=V(),eye=V();let lastTime=0;
 function resetPose(a){a.root.visible=true;a.root.rotation.set(0,0,0);a.rig.rotation.set(0,0,0);a.rig.position.set(0,0,0);a.rig.scale.set(1,1,1);a.torso.rotation.set(0,0,0);for(const arm of a.arms)arm.rotation.set(0,0,0);for(const leg of a.legs)leg.rotation.set(0,0,0);}
 function fall(a,t,start,end,x){const f=phase(t,start,end);a.root.position.set(x,.48*f,0);a.root.rotation.z=-f*Math.PI/2;a.legs[0].rotation.x=.22*(1-f);a.legs[1].rotation.x=-.2*(1-f);}
 function burst(t,hit,x=.65,y=1,z=0){const age=t-hit,on=age>=0&&age<.65;particles.visible=on;particles.material.opacity=on?(1-age/.65)*.85:0;for(let i=0;i<particleCount;i++){const a=i*2.39996,r=age*(1.1+i%7*.22);particleArray[i*3]=x+Math.cos(a)*r;particleArray[i*3+1]=y+(i%9*.15+.15)*age-age*age*2;particleArray[i*3+2]=z+Math.sin(a)*r;}particleGeo.attributes.position.needsUpdate=true;}
 function wave(t,hit,radius=1.5,x=.65){for(let i=0;i<rings.length;i++){const age=t-hit-i*.035;rings[i].visible=age>=0&&age<.55;rings[i].position.x=x;rings[i].scale.setScalar(.15+Math.max(0,age)*radius*3);rings[i].material.opacity=Math.max(0,.65-age*1.2);}}
 function step(dt,t){
  lastTime=t;actors.forEach(resetPose);killer.root.position.set(-1.25,0,0);victim.root.position.set(.65,0,0);killer.root.rotation.y=Math.PI/2;victim.root.rotation.y=-Math.PI/2;flash.material.opacity=0;particles.visible=false;rings.forEach(r=>r.visible=false);
  if(role==='fencer'){
   const lunge=phase(t,.08,.38),riposte=phase(t,.62,.85);victim.root.position.x=mix(1.55,.1,lunge)+phase(t,.88,1.35)*.95;victim.arms[1].rotation.x=-lunge*1.8;
   shield.visible=t>.1&&t<.83;shield.material.opacity=t>.1&&t<.83?.11+Math.exp(-Math.abs(t-.39)*25)*.27:0;
   killer.arms[1].rotation.x=-.7-riposte*.9+phase(t,1.05,1.6)*1.1;killer.torso.rotation.y=-.28+phase(t,.62,.85)*.55;killer.root.position.x=-1.25+riposte*.45;
   if(t>=.88)fall(victim,t,.88,1.5,mix(.1,1.05,phase(t,.88,1.5)));burst(t,t<.65?.39:.86,t<.65?-.35:.65);wave(t,.86,1.2);once('parry',t>=.39,1800,800,.09,'triangle');once('counter',t>=.86,280,70,.18,'sawtooth');
  }else if(role==='evolver'){
   const approach=phase(t,.08,.35);killer.root.position.x=mix(-1.65,-.55,approach);for(let i=0;i<2;i++)killer.arms[i].rotation.x=-1.3+Math.sin(t*19+i*2)*.65*(t>.4&&t<.95?1:0);
   killer.torso.rotation.y=Math.sin(t*17)*.18*(t>.4&&t<.95?1:0);if(t>.9)fall(victim,t,.9,1.35,mix(.65,.9,phase(t,.9,1.35)));
   const feeding=phase(t,1.15,1.9);scanner.material.opacity=.2+feeding*.65;scanner.scale.setScalar(.17+feeding*.07);
   if(t>1.1&&t<2){particles.visible=true;particles.material.opacity=.7;for(let i=0;i<particleCount;i++){const f=((t-1.1)*1.4+i/particleCount)%1,a=i*2.4;particleArray[i*3]=mix(.9,-.55,f);particleArray[i*3+1]=mix(.30,.82,f)+Math.sin(a+t*8)*.12;particleArray[i*3+2]=Math.cos(a+t*4)*.15*(1-f);}particleGeo.attributes.position.needsUpdate=true;}else burst(t,.72);
   wave(t,.72,1.1);for(const beat of[.47,.64,.81])once('claw'+beat,t>=beat,650,110,.1,'sawtooth');once('evolve',t>=1.4,210,620,.35);
  }else if(role==='bomber'){
   const plant=phase(t,.05,.30),retreat=phase(t,.35,.8);killer.root.position.x=-1.25+plant*.5-retreat*1.15;killer.arms[1].rotation.x=-plant*1.6*(1-retreat);device.visible=t>=.22&&t<.88;lamps.forEach((l,i)=>l.material.opacity=.3+.6*Math.max(0,Math.sin(t*(t<.6?17:38)+i)));
   const boom=phase(t,.88,.98);flash.position.set(.65,.9,0);flash.scale.setScalar(.3+boom*1.1);flash.material.opacity=t>=.88&&t<1.05?(1-phase(t,.9,1.05))*.55:0;
   if(t>=.9){fall(victim,t,.92,1.65,mix(.65,1.65,phase(t,.92,1.25)));victim.root.position.y+=Math.sin(phase(t,.92,1.65)*Math.PI)*.65;}
   burst(t,.90,.65,.8);wave(t,.9,2.5);for(const beat of[.25,.48,.67,.80])once('beep'+beat,t>=beat,1350,1400,.035,'square');once('blast',t>=.9,95,23,.42,'sawtooth');
  }else if(role==='boxer'){
   const load=phase(t,.03,.42),punch=phase(t,.43,.58);killer.torso.rotation.y=-load*.55+punch*.9;killer.rig.position.y=-load*.10;killer.arms[1].rotation.x=-.4-load*.6-punch*.8+phase(t,.72,1.1)*.6;killer.arms[0].rotation.x=-1.2;
   killer.root.position.x=-1.25+punch*.95;const fly=phase(t,.57,1.04);victim.root.position.set(mix(.65,2.66,fly),Math.sin(fly*Math.PI)*.55,0);victim.root.rotation.z=Math.sin(fly*Math.PI)*.10;
   if(t>=1.04){fall(victim,t,1.04,1.72,2.66);victim.root.rotation.z=phase(t,1.04,1.72)*Math.PI/2;}
   cracks.visible=t>=1.04;cracks.scale.setScalar(.7+phase(t,1.04,1.20)*.3);wall.rotation.z=-Math.sin(Math.max(0,t-1.04)*50)*Math.exp(-Math.max(0,t-1.04)*10)*.012;
   fragments.visible=t>=1.04&&t<2;for(let i=0;i<fragments.count;i++){const age=Math.max(0,t-1.04),a=i*2.4;dummy.position.set(2.9-age*(.5+i%5*.2),1.05+Math.sin(a)*age*.9-age*age*2,Math.cos(a)*age*.9);dummy.rotation.set(age*i,age*2,i);dummy.scale.setScalar(Math.max(.001,1-age));dummy.updateMatrix();fragments.setMatrixAt(i,dummy.matrix);}fragments.instanceMatrix.needsUpdate=true;
   burst(t,t<.9?.57:1.04,t<.9?.65:2.8);wave(t,.57,1.2);once('punch',t>=.57,150,45,.14,'triangle');once('wall',t>=1.04,80,27,.25,'sawtooth');
  }else if(role==='bait'){
   victim.root.position.set(.95,.48,0);victim.root.rotation.z=-Math.PI/2;const walk=phase(t,.05,.70);killer.root.position.x=mix(-1.8,-.55,walk);killer.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*12+i*Math.PI)*.3*(1-walk));
   alert.visible=t>.70&&t<1.65;alert.position.set(-.55,2.15+Math.sin(t*8)*.06,0);alert.scale.setScalar(.7+phase(t,.70,.8)*.3);
   killer.torso.rotation.x=-phase(t,.65,.85)*.1;killer.arms[0].rotation.x=-phase(t,.82,1.1)*1.3;killer.arms[1].rotation.x=-phase(t,1.05,1.25)*1.5+phase(t,1.25,1.45)*.4;
   wave(t,1.25,1.8,-.55);once('notice',t>=.73,700,1050,.10);once('report',t>=1.25,1100,1650,.2,'square');

  }
  if(role==='bomber'&&payload.selfDestruct)killer.root.visible=false;
  for(const a of actors)a.wear?.userData.updateGiftSkin?.(t,{moving:false,jumping:false});
  const victimAura=victim.wear?.getObjectByName('signature-aura');if(victimAura)victimAura.visible=role!=='bait'&&t<.85;
  scene.updateMatrixWorld(true);
 }
 function render(){
  bodyBounds.makeEmpty();for(const a of actors)if(a.root.visible)a.root.traverseVisible(n=>{if(!n.isMesh||!n.geometry)return;for(let p=n;p&&p!==a.root;p=p.parent)if(p.name==='signature-aura')return;n.geometry.computeBoundingBox();partBounds.copy(n.geometry.boundingBox).applyMatrix4(n.matrixWorld);if(partBounds.min.length()<20&&partBounds.max.length()<20)bodyBounds.union(partBounds);});
  if(wall)bodyBounds.expandByPoint(V(3.45,2.9,.8));if(bodyBounds.isEmpty())bodyBounds.set(V(-2,0,-1),V(2,2.5,1));bodyBounds.getCenter(focus);focus.y=Math.max(.9,focus.y);camera.position.copy(focus).add(V(.3,.5,8));camera.lookAt(focus);camera.updateMatrixWorld(true);
  let extent=1;for(let i=0;i<8;i++){corner.set(i&1?bodyBounds.max.x:bodyBounds.min.x,i&2?bodyBounds.max.y:bodyBounds.min.y,i&4?bodyBounds.max.z:bodyBounds.min.z).project(camera);extent=Math.max(extent,Math.abs(corner.x)/.86,Math.abs(corner.y)/.82);}eye.copy(camera.position).sub(focus).multiplyScalar(extent);camera.position.copy(focus).add(eye);
  const hit=role==='boxer'?1.04:role==='bomber'?.9:role==='fencer'?.86:.72,jolt=lastTime>=hit?Math.exp(-(lastTime-hit)*18)*.025:0;camera.position.x+=Math.sin(lastTime*95)*jolt;camera.lookAt(focus);renderer.render(scene,camera);
 }
 const composer={passes:[],setSize(){},dispose(){}};
 return{scene,camera,composer,actors,art:{dispose(){environment.dispose();fragments?.dispose();}},nodes:[],step,render};
}
