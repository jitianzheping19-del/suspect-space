function createSoccerStadium(THREE,root,F){
 const materials=new Map();
 const mat=(color,metal=0)=>{const key=color+metal;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:metal?.3:.6,metalness:metal}));return materials.get(key);};
 const box=new THREE.BoxGeometry(1,1,1);
 function mesh(parent,geometry,material,x=0,y=0,z=0){const n=new THREE.Mesh(geometry,material);n.position.set(x,y,z);n.castShadow=true;n.receiveShadow=true;parent.add(n);return n;}
 function block(parent,color,x,y,z,w,h,d){const n=mesh(parent,box,mat(color,.25),x,y,z);n.scale.set(w,h,d);return n;}
 const board=new THREE.Group();board.name='soccer-stadium-scoreboard';board.position.set(35,4.6,10);board.rotation.y=-Math.PI/2;root.add(board);
 block(board,'#12222e',0,0,0,F.goal+.3,2.75,.42);
 for(const x of [-F.goal/2-.08,F.goal/2+.08])block(board,'#b6c5c3',x,0,.02,.065,2.85,.5);
 for(const y of [-1.36,1.36])block(board,'#b6c5c3',0,y,.04,F.goal+.25,.06,.5);
 for(const x of [-2.1,2.1]){block(board,'#263947',x,-2.8,-.22,.18,3.5,.25);block(board,'#40515a',x,-4.48,-.22,.8,.2,1.1);}
 const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=768;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const screenMaterial=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
 for(const back of [false,true]){const face=mesh(board,new THREE.PlaneGeometry(F.goal,2.5),screenMaterial,0,0,back?-.225:.225);if(back)face.rotation.y=Math.PI;}
 const rim=new THREE.MeshBasicMaterial({color:'#81dded',toneMapped:false});
 for(const y of [-1.41,1.41]){const led=mesh(board,box,rim,0,y,.1);led.scale.set(F.goal+.3,.025,.38);}
 let lastBoard='';
 function digit(value,x,y,size,color){
  const segments=[[.15,0,.7,.1],[.85,.08,.1,.38],[.85,.54,.1,.38],[.15,.9,.7,.1],[.05,.54,.1,.38],[.05,.08,.1,.38],[.15,.45,.7,.1]];
  const map=['1111110','0110000','1101101','1111001','0110011','1011011','1011111','1110000','1111111','1111011'][Number(value)];
  for(let i=0;i<7;i++){const [a,b,w,h]=segments[i];ctx.fillStyle=map[i]==='1'?color:'#17313b';ctx.beginPath();ctx.roundRect(x+a*size,y+b*size,w*size,h*size,size*.025);ctx.fill();}
 }
 function digits(text,x,y,size,color){for(let i=0;i<text.length;i++){if(text[i]===':'){ctx.fillStyle=color;ctx.fillRect(x+i*size*.8+size*.25,y+size*.3,size*.08,size*.08);ctx.fillRect(x+i*size*.8+size*.25,y+size*.65,size*.08,size*.08);}else digit(text[i],x+i*size*.8,y,size,color);}}
 function paint(g,time){
  const remaining=g?.status==='playing'?Math.max(0,Math.ceil((g.endAt-time)/1000)):g?.status==='finished'?0:180;
  const score=g?.score||[0,0],phase=g?.status||'idle',key=score.join(':')+':'+remaining+':'+phase;if(key===lastBoard)return;lastBoard=key;
  board.userData.score=[...score];board.userData.seconds=remaining;board.userData.status=phase;
  const gradient=ctx.createLinearGradient(0,0,1536,768);gradient.addColorStop(0,'#0d2539');gradient.addColorStop(.5,'#08131e');gradient.addColorStop(1,'#302132');ctx.fillStyle=gradient;ctx.fillRect(0,0,1536,768);
  ctx.strokeStyle='#537282';ctx.lineWidth=4;ctx.strokeRect(16,16,1504,736);ctx.fillStyle='#9ac7d8';ctx.font='600 34px system-ui';ctx.textAlign='center';ctx.fillText('SPACE SUSPECT  /  FUTSAL ARENA',768,68);
  ctx.fillStyle='#79c5ff';ctx.font='800 50px system-ui';ctx.fillText('BLUE',350,145);ctx.fillStyle='#ff97ad';ctx.fillText('RED',1190,145);
  digits(String(score[0]).padStart(2,'0').slice(-2),142,180,230,'#79c5ff');digits(String(score[1]).padStart(2,'0').slice(-2),984,180,230,'#ff97ad');
  ctx.fillStyle='#cee4dc';ctx.fillRect(705,285,126,12);
  const clock=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');digits(clock,440,475,150,remaining<30?'#ffc480':'#d9ffe9');
  ctx.font='700 30px system-ui';ctx.fillStyle='#a0bbc8';ctx.fillText(phase==='finished'?'FULL TIME':phase==='countdown'?'KICK OFF':phase==='playing'?'MATCH TIME':'READY TO PLAY',768,706);
  texture.needsUpdate=true;
 }
 function keeper(team){
  const rig=new THREE.Group();rig.name='soccer-goalkeeper-'+team;root.add(rig);const body=new THREE.Group();body.position.y=.88;rig.add(body);
  const color=team===0?'#62bcff':'#ff7185',dark=team===0?'#183f69':'#692738',jersey=mat(color),trim=mat(dark),visor=mat('#223e56',.6);
  mesh(body,new THREE.CapsuleGeometry(.43,.53,6,18),jersey,0,.38,0);
  const glass=mesh(body,new THREE.SphereGeometry(.36,20,12),visor,0,.56,.37);glass.scale.set(1,.66,.43);
  const reflection=mesh(body,new THREE.SphereGeometry(.22,16,8),mat('#c5eeff',.3),-.06,.63,.5);reflection.scale.set(1,.25,.06);
  mesh(body,new THREE.BoxGeometry(.48,.65,.3),trim,0,.28,-.42);
  for(const x of [-.28,.28]){const stripe=mesh(body,new THREE.CapsuleGeometry(.035,.35,3,6),trim,x,.26,.37);stripe.rotation.z=x>0?.14:-.14;}
  const emblem=document.createElement('canvas');emblem.width=128;emblem.height=128;const c=emblem.getContext('2d');c.fillStyle='#182c40';c.beginPath();c.roundRect(8,4,112,120,20);c.fill();c.fillStyle='#f7f8e7';c.textAlign='center';c.font='800 60px system-ui';c.fillText('01',64,72);c.font='800 22px system-ui';c.fillText('KEEPER',64,106);const badgeTex=new THREE.CanvasTexture(emblem);badgeTex.colorSpace=THREE.SRGBColorSpace;
  mesh(body,new THREE.PlaneGeometry(.28,.28),new THREE.MeshBasicMaterial({map:badgeTex,transparent:true}),0,.05,.44);
  const arms=[],legs=[];
  for(const side of [-1,1]){
   const arm=new THREE.Group();arm.position.set(side*.48,.43,0);body.add(arm);arms.push(arm);
   mesh(arm,new THREE.CapsuleGeometry(.13,.3,4,10),jersey,side*.12,-.14,.02);
   const glove=mesh(arm,new THREE.BoxGeometry(.27,.3,.2),mat('#f8f4db'),side*.16,-.4,.12);glove.rotation.x=-.2;glove.name='goalkeeper-glove';
   block(arm,dark,side*.16,-.27,.12,.28,.075,.22);
   for(let i=0;i<4;i++)mesh(arm,new THREE.CapsuleGeometry(.026,.1,2,6),mat('#f8f4db'),side*.16+(i-1.5)*.055,-.56,.12);
   const leg=new THREE.Group();leg.position.set(side*.24,-.5,0);body.add(leg);legs.push(leg);
   mesh(leg,new THREE.CapsuleGeometry(.16,.26,4,10),trim,0,-.02,0);
   mesh(leg,new THREE.SphereGeometry(.13,12,8),mat('#e2dcc8'),0,-.04,.15);
   const boot=mesh(leg,new THREE.CapsuleGeometry(.12,.23,3,10),mat('#162536'),0,-.3,.08);boot.rotation.x=Math.PI/2;
  }
  const shadow=mesh(root,new THREE.CircleGeometry(.7,24),new THREE.MeshBasicMaterial({color:'#000000',transparent:true,opacity:.22,depthWrite:false}));shadow.rotation.x=-Math.PI/2;
  return {rig,body,arms,legs,shadow,team};
 }
 const keepers=[keeper(0),keeper(1)];
 const saveRing=mesh(root,new THREE.RingGeometry(.3,.37,32),new THREE.MeshBasicMaterial({color:'#ffe9af',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));saveRing.name='soccer-save-impact';
 function update(g,time){
  paint(g,time);
  for(const model of keepers){
   model.rig.visible=model.shadow.visible=g?.botOptions?.enabled!==false;if(!model.rig.visible)continue;
   const k=g?.keepers?.[model.team],dir=model.team===0?1:-1,z=(model.team===0?F.near:F.far)+dir*.75;
   const punting=k?.distribution==='punt'&&['pickup','catch','punt'].includes(k.phase),holding=['pickup','catch'].includes(k?.phase),holdingAge=holding?Math.max(0,(time-k.at)/1000):0,throwing=k?.phase==='distribute',throwAge=throwing?Math.max(0,(time-k.at)/1000):0;
   const age=k?.phase==='dive'?Math.max(0,(time-k.at)/1000):0,dive=k?.phase==='dive',recovery=k?.phase==='recover'?Math.max(0,Math.min(1,(k.until-time)/500)):0;
   const progress=Math.min(1,age/.28),land=Math.max(0,Math.min(1,(age-.42)/.35));
   model.rig.position.set(dive?k.fromX+(k.toX-k.fromX)*progress:k?.x??23,dive?Math.sin(Math.min(1,age/.65)*Math.PI)*Math.max(.25,(k.height||1)-.6):0,k?.z??z);
   model.rig.rotation.set(0,dir===1?0:Math.PI,dive?-k.side*dir*1.25*Math.sin(Math.min(1,age/.95)*Math.PI):recovery*-dir*(k?.side||1)*.5);
   model.body.position.y=.88-(dive?land*.42:recovery*.22);model.body.rotation.x=dive?.2:recovery?.35:.12;
   model.arms.forEach((arm,i)=>{arm.rotation.x=dive?-1.35:-.48;arm.rotation.z=(i?1:-1)*(dive?.85:.28);});
   model.legs.forEach((leg,i)=>{leg.rotation.x=dive?(i?.7:-.25):recovery?.6:.15;leg.rotation.z=(i?1:-1)*.12;});
   if(holding){
    const settle=Math.max(0,1-holdingAge/.45),scoop=k.phase==='pickup'?Math.sin(Math.min(1,holdingAge/.6)*Math.PI):0,windup=punting?0:Math.max(0,Math.min(1,(holdingAge-.7)/.5)),raise=windup*windup*(3-2*windup);
    model.rig.position.y=(k.grabLift||0)*settle;model.rig.rotation.y=k.holdYaw??(dir===1?0:Math.PI);model.rig.rotation.z=(k.grabRoll||0)*settle;model.body.position.y=.88-scoop*.3;model.body.rotation.x=scoop*.6-raise*.12;
    model.arms.forEach((arm,i)=>{arm.rotation.x=-1.25-raise*1.25;arm.rotation.z=(i?-1:1)*.9;});
    model.legs.forEach(leg=>leg.rotation.x=scoop*.65);
   }else if(throwing){
    const finish=Math.max(0,1-throwAge/.55);model.rig.rotation.y=k.throwYaw;model.body.rotation.x=.25*finish;
    model.arms.forEach((arm,i)=>{arm.rotation.x=-2.5*finish;arm.rotation.z=(i?-1:1)*(.28+.62*finish);});model.legs[1].rotation.x=-.4*Math.sin(finish*Math.PI);
   }
   if(punting){const p=sampleSoccerPunt(time-k.puntStartedAt);model.rig.rotation.y=k.holdYaw??k.throwYaw;model.body.rotation.x+=p.pitch;model.arms.forEach((arm,i)=>{arm.rotation.x=p.arm;arm.rotation.z=(i?-1:1)*(time-k.puntStartedAt<1100?.9:.45);});model.legs[1].rotation.x=p.kick;model.legs[1].position.z=.15*Math.max(0,-p.kick);model.legs[0].rotation.x=p.plant;}else model.legs[1].position.z=0;
   model.shadow.position.set(model.rig.position.x,.06,model.rig.position.z);model.shadow.scale.setScalar(1+model.rig.position.y*.25);
  }
  const save=g?.lastSave,age=save?(time-save.at)/550:2;saveRing.visible=age>=0&&age<1;if(saveRing.visible){saveRing.position.set(save.x,save.y,save.z);saveRing.scale.setScalar(1+age*2);saveRing.material.opacity=1-age;}
 }
 paint(null,0);update(null,0);return {update,board,keepers};
}
function applySoccerReceptionPose(crew,receive,time,pose,ballMesh){
 const age=(time-receive.at)/1000;if(age<0||time>receive.until)return false;
 const rig=crew.root.userData.tailoredAvatar||crew.root.userData,arms=rig.arms||rig.walkArms||crew.root.userData.walkArms||[];
 for(const n of [crew.root,crew.body,crew.pack,crew.visor,crew.shine,...(crew.legs||[]),...arms])if(n)pose(n);
 if(receive.kind==='header'){
  const launch=Math.min(1,age/.28),fall=Math.max(0,Math.min(1,(age-.28)/.42)),rise=Math.max(0,Math.min(1,(age-.8)/.55)),weight=1-rise;
  crew.root.rotation.y=receive.yaw;crew.root.rotation.x=(.9*launch+.55*fall)*weight;crew.root.position.y+=(Math.sin(launch*Math.PI)*.55+.15*fall)*weight;
  crew.root.position.x+=Math.sin(receive.yaw)*1.15*launch*weight;crew.root.position.z+=Math.cos(receive.yaw)*1.15*launch*weight;
  arms.forEach((arm,i)=>{arm.rotation.x=-.7*weight;arm.rotation.z=(i?1:-1)*(.65+fall*.35)*weight;});
  crew.legs?.forEach((leg,i)=>leg.rotation.x=(i?.5:-.35)*weight);
 }else{
  const u=Math.min(1,age/(receive.ground?.38:.65)),cushion=Math.sin(u*Math.PI),part=receive.part||'chest';
  crew.root.rotation.x+=(part==='head'?.22:part==='chest'?-.2:.12)*cushion;crew.root.position.y-=(part==='knee'?.16:part==='sole'?.06:.03)*cushion;
  for(const n of [crew.body,crew.pack,crew.visor,crew.shine])if(n){n.rotation.x-=.22*cushion;n.position.y-=.09*cushion;}
  if(crew.legs?.[1]){crew.legs[1].rotation.x=-(part==='knee'?1.2:part==='foot'?.7:part==='sole'?.35:.15)*cushion;crew.legs[1].position.y+=(part==='knee'?.3:part==='sole'?.15:.07)*cushion;crew.legs[1].position.z+=(part==='sole'?.6:.18)*cushion;}
  arms.forEach((arm,i)=>arm.rotation.z=(i?1:-1)*.5*cushion);
 }
 return true;
}

function applySoccerOverheadPose(crew,finish,time,pose,ballMesh){
 if(finish.kind==='volley')return applySoccerVolleyPose(crew,finish,time,pose,ballMesh);
 const motion=sampleSoccerOverhead(finish,time);if(!motion)return false;
 const rig=crew.root.userData.tailoredAvatar||crew.root.userData,arms=rig.arms||rig.walkArms||crew.root.userData.walkArms||[];
 for(const n of [crew.root,...crew.legs,...arms])pose(n);
 // Rotate around the hips so the falling torso stays above the turf.
 const pivot=.8,pitch=motion.pitch;
 crew.root.position.y+=motion.height+pivot*(1-Math.cos(pitch));
 crew.root.position.x+=Math.sin(motion.yaw)*pivot*Math.sin(pitch);
 crew.root.position.z+=Math.cos(motion.yaw)*pivot*Math.sin(pitch);
 crew.root.rotation.set(pitch,motion.yaw,motion.roll,'YXZ');
 crew.legs[0].rotation.x=motion.left;crew.legs[1].rotation.x=motion.right;
 crew.legs.forEach((leg,i)=>{leg.rotation.z=(i?1:-1)*.1;leg.position.z+=(i?1:-1)*.09*Math.sin(motion.phase*Math.PI);});
 arms.forEach((arm,i)=>{arm.rotation.x=motion.before?-.4:.25;arm.rotation.z=(i?1:-1)*motion.spread;});
 alignSoccerFoot(crew,1,finish.contact||ballMesh.getWorldPosition(new THREE.Vector3()),time,finish.contactAt);
 return true;
}

function applySoccerVolleyPose(crew,finish,time,pose,ballMesh){
 const m=sampleSoccerVolley(finish,time);if(!m)return false;
 const rig=crew.root.userData.tailoredAvatar||crew.root.userData,arms=rig.arms||rig.walkArms||crew.root.userData.walkArms||[];
 for(const n of [crew.root,...crew.legs,...arms])pose(n);
 crew.root.position.y+=m.height;crew.root.rotation.set(m.pitch,finish.yaw,-.12*m.weight,'YXZ');
 crew.legs[1].rotation.x=m.kick;crew.legs[1].position.z+=.3*m.weight;crew.legs[0].rotation.x=m.plant;
 arms.forEach((a,i)=>{a.rotation.z=(i?1:-1)*m.arms;a.rotation.x=(i?-.6:.4)*m.weight;});alignSoccerFoot(crew,1,finish.contact||ballMesh.getWorldPosition(new THREE.Vector3()),time,finish.contactAt);return true;
}
function applySoccerKnockdownPose(crew,down,time,pose){
 const age=time-down.at,ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},fall=ease(age/230),rise=ease((age-700)/750),weight=fall*(1-rise),pitch=-1.35*weight;
 const rig=crew.root.userData.tailoredAvatar||crew.root.userData,arms=rig.arms||rig.walkArms||crew.root.userData.walkArms||[];
 for(const n of [crew.root,...crew.legs,...arms])pose(n);
 crew.root.rotation.set(pitch,down.yaw,.15*weight,'YXZ');crew.root.position.y+=.65*(1-Math.cos(pitch))-.1*weight;
 crew.legs.forEach((n,i)=>n.rotation.x=(i?.6:.3)*weight);arms.forEach((n,i)=>{n.rotation.x=-.45*weight;n.rotation.z=(i?1:-1)*.9*weight;});
}

function alignSoccerFoot(crew,index,target,time,contactAt){
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},weight=smooth((time-contactAt+180)/180)*(1-smooth((time-contactAt)/240));if(!weight)return;
 const leg=crew.legs[index];crew.root.updateMatrixWorld(true);const ball=new THREE.Vector3(target.x,target.y,target.z),foot=leg.localToWorld(new THREE.Vector3(0,-.25,0)),toward=foot.clone().sub(ball).normalize();
 const desired=crew.root.worldToLocal(ball.addScaledVector(toward,.3)),current=crew.root.worldToLocal(foot);const correction=desired.sub(current);if(correction.length()>1.5)correction.setLength(1.5);leg.position.add(correction.multiplyScalar(weight));
}
