/* LOBBY_GAMES_SCENE_BEGIN */
function createLobbySoccerBall(THREE){
  // Truncate an icosahedron into twelve pentagons and twenty hexagons, then
  // project the panels onto a sphere so the pattern has no stretched poles.
  const ico=new THREE.IcosahedronGeometry(1,0),vertices=[],faces=[],lookup=new Map();
  const source=ico.getAttribute('position');
  for(let i=0;i<source.count;i+=3){
    const face=[];
    for(let j=0;j<3;j++){
      const v=new THREE.Vector3().fromBufferAttribute(source,i+j).normalize(),key=v.toArray().map(n=>n.toFixed(5)).join(',');
      if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(v);}
      face.push(lookup.get(key));
    }
    faces.push(face);
  }
  ico.dispose();
  const cut=(a,b)=>vertices[a].clone().multiplyScalar(2).add(vertices[b]).normalize(),polygons=[];
  for(const [a,b,c]of faces)polygons.push({dark:false,points:[cut(a,b),cut(b,a),cut(b,c),cut(c,b),cut(c,a),cut(a,c)]});
  vertices.forEach((axis,a)=>{
    const neighbors=new Set(faces.filter(f=>f.includes(a)).flat().filter(b=>b!==a));
    const u=new THREE.Vector3().crossVectors(axis,Math.abs(axis.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),v=new THREE.Vector3().crossVectors(axis,u);
    const points=[...neighbors].map(b=>cut(a,b)).sort((p,q)=>Math.atan2(p.dot(v),p.dot(u))-Math.atan2(q.dot(v),q.dot(u)));
    polygons.push({dark:true,points});
  });
  const positions=[],normals=[],colors=[],uv=[];
  const white=new THREE.Color('#f3f2e9'),black=new THREE.Color('#18212c');
  for(const {dark,points}of polygons){
    const center=points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).normalize(),color=dark?black:white;
    const u=new THREE.Vector3().crossVectors(center,Math.abs(center.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),v=new THREE.Vector3().crossVectors(center,u);
    const rim=points.map(p=>p.clone().lerp(center,.014).normalize());
    function triangle(a,b,c,depth){
      if(depth){const ab=a.clone().add(b).normalize(),bc=b.clone().add(c).normalize(),ca=c.clone().add(a).normalize();triangle(a,ab,ca,depth-1);triangle(ab,b,bc,depth-1);triangle(ca,bc,c,depth-1);triangle(ab,bc,ca,depth-1);return;}
      if(new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).dot(center)<0)[b,c]=[c,b];
      for(const p of [a,b,c]){positions.push(p.x*.3,p.y*.3,p.z*.3);normals.push(p.x,p.y,p.z);colors.push(color.r,color.g,color.b);uv.push(p.dot(u)*5,p.dot(v)*5);}
    }
    rim.forEach((p,i)=>triangle(center,p,rim[(i+1)%rim.length],2));
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const grain=document.createElement('canvas');grain.width=grain.height=128;const ctx=grain.getContext('2d'),pixels=ctx.createImageData(128,128);
  let seed=7391;for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const shade=110+(seed>>>26);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=shade;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);
  const bump=new THREE.CanvasTexture(grain);bump.wrapS=bump.wrapT=THREE.RepeatWrapping;
  const ball=new THREE.Mesh(new THREE.SphereGeometry(.292,40,28),new THREE.MeshStandardMaterial({color:'#35404a',roughness:.8}));
  const panels=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,metalness:0,emissive:'#e5e9ed',emissiveIntensity:.06,bumpMap:bump,bumpScale:.0007}));
  panels.name='stitched-soccer-panels';ball.add(panels);ball.castShadow=panels.castShadow=true;ball.receiveShadow=panels.receiveShadow=false;
  ball.name='shared-soccer-ball';return ball;
}
function createLobbyGamesScene({THREE,scene,player,camera,remoteCrews,clearMotion}){
  const rules=createLobbyGamesRules(),S=rules.SURVIVAL,F=rules.SOCCER;
  let enabled=false,uid='',state=null,roster={},offset=0,roundSeen='',eliminatedSeen='',finishedSeen='',lastAction='',lastBall=null,localArea='lobby',previousX=player.root.position.x;
  const roots={survival:new THREE.Group(),soccer:new THREE.Group()},doors=[],badges=new Map();
  for(const [name,root]of Object.entries(roots)){root.name='lobby-game-'+name;root.visible=false;scene.add(root);}
  const mats=new Map(),unitBox=new THREE.BoxGeometry(1,1,1);
  function material(color){if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.65,metalness:.12}));return mats.get(color);}
  function box(root,x,y,z,w,h,d,color){const m=new THREE.Mesh(unitBox,material(color));m.position.set(x,y,z);m.scale.set(w,h,d);root.add(m);return m;}
  function sign(root,text,x,y,z,width=4){
    const c=document.createElement('canvas');c.width=1024;c.height=192;const g=c.getContext('2d');
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width*192/1024),new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide}));m.position.set(x,y,z);root.add(m);
    m.userData.setText=value=>{if(m.userData.text===value)return;m.userData.text=value;g.fillStyle='#102635';g.fillRect(0,0,1024,192);g.strokeStyle='#d6bb87';g.lineWidth=8;g.strokeRect(6,6,1012,180);g.fillStyle='#fff3d7';g.font='700 74px system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText(value,512,96,960);map.needsUpdate=true;};m.userData.setText(text);return m;
  }
  function door(x,z,text,side){
    const root=new THREE.Group();root.name='lobby-'+side+'-game-door';root.position.set(x,0,z);root.rotation.y=side==='survival'?Math.PI/2:-Math.PI/2;scene.add(root);
    for(const dx of [-1.55,1.55])box(root,dx,1.55,0,.16,3.1,.3,'#bda675');box(root,0,3.1,0,3.25,.18,.3,'#bda675');
    const leaves=[-1,1].map(s=>{const m=box(root,s*.74,1.42,0,1.44,2.8,.12,'#32636a');m.userData.side=s;return m;});sign(root,text,0,3.6,0,3.8);const countSign=sign(root,'0人プレイ中',0,4.3,0,3);countSign.name='lobby-player-count-'+side;doors.push({x,z,leaves,side,countSign});
  }
  door(-12.1,-2.3,'消える床サバイバル','survival');door(12.1,2.1,'フットサル','soccer');
  const tagCountSign=sign(scene,'鬼ごっこ · 0人プレイ中',0,3.7,-5.35,4.2);tagCountSign.name='lobby-player-count-tag';
  const survival=roots.survival;
  box(survival,-24,-.2,4.5,24,.4,19,'#122635');
  box(survival,-36,.65,4.5,.18,1.3,19,'#304654');
  for(const [z,d]of [[-4.4,1.2],[6.6,14.8]])box(survival,-12,.65,z,.18,1.3,d,'#304654');
  for(const z of [-5,14])box(survival,-24,.65,z,24,1.3,.18,'#304654');
  // Entry and queue remain safe; the raised arena makes falling unambiguous.
  box(survival,-15.1,.018,-.7,4.2,.035,4.6,'#317f75');
  const queueSign=sign(survival,'参加希望',-15.1,.05,-.7,3.8);queueSign.rotation.x=-Math.PI/2;
  sign(survival,'踏んだ床は 0.7秒後に消えます',-25,4.8,-4.7,12);
  const tiles=new THREE.InstancedMesh(new THREE.BoxGeometry(1.94,.3,1.94),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.66,metalness:.14}),56);
  tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);tiles.name='survival-tiles';survival.add(tiles);const dummy=new THREE.Object3D(),tileColor=new THREE.Color();
  // Second-floor observation deck, glass railing and a walkable stair flight.
  box(survival,-24,6.85,12.65,24,.3,2.7,'#52717b');
  const glass=new THREE.MeshStandardMaterial({color:0xa9e6f1,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide,roughness:.2});
  const rail=new THREE.Mesh(new THREE.BoxGeometry(17.7,1.1,.07),glass);rail.position.set(-27.1,7.55,11.3);survival.add(rail);
  box(survival,-27.1,8.12,11.3,17.7,.07,.09,'#d6be91');
  for(let i=0;i<16;i++){const h=(i+1)*7/16;box(survival,-15.5,h/2,3+(i+.5)*.5,4.5,h,.5,'#587985');}
  for(const x of [-17.9,-13.1]){const rail=box(survival,x,4.5,7,.08,.08,10.65,'#d6be91');rail.rotation.x=-Math.atan2(7,8);}
  sign(survival,'観戦席 · 階段 →',-25,7.025,12.6,5).rotation.x=-Math.PI/2;
  const soccer=roots.soccer;
  box(soccer,23,-.14,10.25,22,.28,27.5,'#183340');box(soccer,23,.012,10,16,.025,22,'#26744d');
  for(let i=0;i<11;i++)box(soccer,23,.026,i*2,16,.012,1,'#2b8056');
  const line=(x,z,w,d)=>box(soccer,x,.043,z,w,.014,d,'#e8f4df');
  for(const x of [F.left,F.right])line(x,10,.08,22);for(const z of [F.near,F.far,10])line(23,z,16,.08);
  const circle=new THREE.Mesh(new THREE.TorusGeometry(2,.035,5,48),material('#eef8e8'));circle.rotation.x=-Math.PI/2;circle.position.set(23,.055,10);soccer.add(circle);
  for(const z of [F.near,F.far]){
    for(const x of [20.5,25.5]){const post=new THREE.Mesh(new THREE.CylinderGeometry(F.postRadius,F.postRadius,F.goalHeight,12),material('#f3f4ed'));post.position.set(x,F.goalHeight/2,z);soccer.add(post);}const bar=new THREE.Mesh(new THREE.CylinderGeometry(F.postRadius,F.postRadius,F.goal,12),material('#f3f4ed'));bar.rotation.z=Math.PI/2;bar.position.set(23,F.goalHeight,z);soccer.add(bar);
    const back=z===F.near?z-1.5:z+1.5;
    for(let x=20.5;x<=25.5;x+=.5)box(soccer,x,1.1,back,.022,2.2,.022,'#b9d3cd');
    for(let y=.2;y<=2.2;y+=.25)box(soccer,23,y,back,5,.018,.018,'#b9d3cd');
    line(20,Math.abs(z-10)>0?(z===F.near?1:19):z,.06,4);line(26,z===F.near?1:19,.06,4);line(23,z===F.near?3:17,6,.06);
  }
  box(soccer,33.8,.55,10.25,.16,1.1,27.5,'#385a68');
  for(const [z,d]of [[-1.45,4.1],[13.8,20.4]])box(soccer,12.2,.55,z,.16,1.1,d,'#385a68');
  for(const z of [-3.4,23.8])box(soccer,23,.55,z,21.6,1.1,.16,'#385a68');
  sign(soccer,'FUTSAL · 青 vs 赤 · 3分',23,3,-3.35,12);
  sign(soccer,'観戦・待機',13.5,.05,9,6).rotation.x=-Math.PI/2;
  const ballMesh=createLobbySoccerBall(THREE);ballMesh.position.set(23,.3,10);soccer.add(ballMesh);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const shadowContext=shadowCanvas.getContext('2d'),gradient=shadowContext.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'#000a');gradient.addColorStop(.45,'#0005');gradient.addColorStop(1,'#0000');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,64,64);
  const ballShadow=new THREE.Mesh(new THREE.PlaneGeometry(.95,.95),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));ballShadow.rotation.x=-Math.PI/2;ballShadow.position.set(23,.055,10);soccer.add(ballShadow);
  const now=()=>Date.now()+offset;
  const area=()=>localArea;
  function teleport(x,y,z){player.root.position.set(x,y,z);player.root.userData.lobbyHeightInitialized=true;clearMotion();parent.postMessage({type:'lobby-position',gameArea:localArea,x,z,lobbyY:y,yaw:player.root.rotation.y,walking:false,lobbyKart:false,circuitTrack:false},'*');}
  function exit(){const a=area();localArea='lobby';if(a==='survival')teleport(-9.5,0,-2.3);else if(a==='soccer')teleport(9.5,0,2.1);previousX=player.root.position.x;}
  window.addEventListener('message',event=>{
    if(event.source!==parent)return;const data=event.data;
    if(data?.type==='lobby-games-exit'){exit();return;}
    if(data?.type!=='lobby-games-state')return;
    enabled=data.enabled===true;
    if(!enabled){exit();state=null;roots.survival.visible=roots.soccer.visible=false;return;}
    state=data.state;uid=data.uid||uid;roster=data.players||{};offset=Number(data.serverNow)-Date.now();
    const a=area(),g=state?.[a];
    if(g?.id&&rules.active(g)&&g.members?.[uid]!==undefined&&roundSeen!==g.id){
      roundSeen=g.id;eliminatedSeen=finishedSeen='';
      if(a==='survival'){const n=g.members[uid].slot,p=rules.tilePoint((Math.floor(n/8)*16+n%8)%56);teleport(p.x,3,p.z);}
      else if(a==='soccer'){const ids=Object.keys(g.members).filter(id=>g.members[id]===g.members[uid]),i=ids.indexOf(uid);teleport(17+(i%4)*3,0,g.members[uid]===0?3+Math.floor(i/4)*2:17-Math.floor(i/4)*2);player.root.rotation.y=g.members[uid]===0?0:Math.PI;}
    }
    const fall=state?.survival;
    if(a==='survival'&&fall?.members?.[uid]?.alive===false&&eliminatedSeen!==fall.id){eliminatedSeen=fall.id;teleport(-30+(fall.members[uid].slot%12),7,12.5);}
  });
  function groundAt(x,z,maxTop){
    const a=area();if(a==='lobby')return null;
    if(a==='soccer')return 0;
    if(z>=11.3)return maxTop>=6.5?7:0;
    if(x>=-17.75&&x<=-13.25&&z>=3&&z<=11.3)return Math.min(7,(z-3)*7/8);
    const i=rules.tileAt({x,z}),g=state?.survival;
    if(i>=0&&maxTop>=2.95&&(!rules.active(g)||!g.tiles?.[i]||g.tiles[i]>now()))return 3;
    return 0;
  }
  function canMove(x,z){
    if(!enabled)return null;const a=area();
    const leftDoor=z>-3.55&&z< -1.05&&x>-13.5&&x< -9,rightDoor=z>.85&&z<3.35&&x>9&&x<13.5;
    if(a==='lobby')return (leftDoor||rightDoor)?true:null;
    if(a==='survival'&&leftDoor||a==='soccer'&&rightDoor)return true;
    if(!rules.inside({x,z},a==='survival'?S:F,.5))return false;
    if(a==='survival'&&x>=-17.75&&x<=-13.25&&z>=3&&z<=11.3&&(z-3)*7/8>player.root.position.y+.65)return false;
    if(a==='survival'&&player.root.position.y>=6&&x< -18&&z<11.75)return false;
    const game=state?.[a],participant=game?.members?.[uid];
    if(a==='survival'&&rules.active(game)&&(!participant||!participant.alive)&&x< -18&&z<11.3&&player.root.position.y<6)return false;
    if(a==='soccer'&&rules.active(game)&&participant===undefined&&x>14.3)return false;
    for(const [id,crew]of remoteCrews){if(rules.area(roster[id])!==a)continue;const p=crew.root.position;if(Math.abs(p.y-player.root.position.y)<1.6&&Math.hypot(p.x-x,p.z-z)<.85)return false;}
    return true;
  }
  function motionLocked(){const g=state?.[area()];return enabled&&(rules.active(g)&&g.status==='countdown'&&g.members?.[uid]!==undefined||state?.tag?.oni===uid&&rules.active(state.tag)&&now()<state.tag.frozenUntil);}
  function speedMultiplier(){return enabled&&state?.tag?.oni===uid&&state.tag.status==='playing'?1.15:enabled&&area()==='soccer'&&state?.soccer?.ball?.dribbler===uid ? .85 : 1;}
  function update(dt){
    const position=player.root.position;
    if(enabled&&!window.__lobbyKartCircuit?.active){
      if(localArea==='lobby'&&previousX>=-12&&position.x< -12&&Math.abs(position.z+2.3)<1.25)localArea='survival';
      else if(localArea==='lobby'&&previousX<=12&&position.x>12&&Math.abs(position.z-2.1)<1.25)localArea='soccer';
      else if(localArea==='survival'&&position.x> -12||localArea==='soccer'&&position.x<12)localArea='lobby';
    }
    previousX=position.x;
    const a=area(),t=now();
    for(const door of doors){const near=Math.hypot(player.root.position.x-door.x,player.root.position.z-door.z)<3.5;for(const leaf of door.leaves)leaf.position.x+=((near?2.25:.74)*leaf.userData.side-leaf.position.x)*(1-Math.exp(-12*dt));}
    const g=state?.survival;
    if(a==='survival'&&g?.status==='finished'&&g.members?.[uid]?.alive&&t>g.endedAt+4500&&finishedSeen!==g.id){finishedSeen=g.id;teleport(-15.2,0,0);}
    const rows={...roster,[uid]:{...(roster[uid]||{}),online:true,x:player.root.position.x,z:player.root.position.z,lobbyY:player.root.position.y,lobbyCircuit:window.__lobbyKartCircuit?.active===true}};
    const target=state?rules.tagTarget(state,uid,rows,t):'',kick=state&&rules.canKick(state,uid,rows,t);
    camera.updateMatrixWorld();const matrix=camera.matrixWorld.elements,rightLength=Math.hypot(matrix[0],matrix[2])||1,forwardLength=Math.hypot(matrix[8],matrix[10])||1;
    const action={type:'lobby-games-action',area:a,enabled:enabled&&(a==='soccer'?!!kick:!!target),canSkill:a==='soccer'&&!!state&&rules.canSkill(state,uid,rows,t),target,passTarget:a==='soccer'&&state?rules.passTarget(state,uid,rows,player.root.rotation.y):'',yaw:player.root.rotation.y,rightX:matrix[0]/rightLength,rightZ:matrix[2]/rightLength,forwardX:-matrix[8]/forwardLength,forwardZ:-matrix[10]/forwardLength};
    const key=JSON.stringify({...action,yaw:Math.round(action.yaw*20)/20});if(key!==lastAction){lastAction=key;parent.postMessage(action,'*');}
  }
  let savedFov=null,hiddenRoots=[],poses=[];
  const pose=node=>{if(node)poses.push([node,node.position.clone(),node.rotation.clone()]);};
  function beforeRender(dt){
    const count=name=>rules.active(state?.[name])?Object.entries(state[name].members||{}).filter(([id,m])=>rules.live(roster[id])&&(name!=='survival'||m.alive)).length:0;
    for(const door of doors)door.countSign.userData.setText(count(door.side)+'人プレイ中');tagCountSign.userData.setText('鬼ごっこ · '+count('tag')+'人プレイ中');
    const a=area(),t=now();roots.survival.visible=enabled&&a==='survival';roots.soccer.visible=enabled&&a==='soccer';
    if(enabled&&a!=='lobby'){
      const circuit=window.__lobbyKartCircuit;for(const root of [circuit?.root,circuit?.skyMap.root,circuit?.spaceMap.root,circuit?.vehicles])if(root){hiddenRoots.push([root,root.visible]);root.visible=false;}
      for(const id of ['lobbyKartHud','lobbyKartSpeed']){const node=document.getElementById(id);if(node)node.dataset.show='false';}
      savedFov=camera.fov;camera.fov=Math.max(camera.fov,Math.min(85,Math.atan(Math.tan(Math.PI/10)/camera.aspect)*360/Math.PI));camera.updateProjectionMatrix();
    }
    if(roots.survival.visible){
      for(let i=0;i<56;i++){const p=rules.tilePoint(i),until=state?.survival?.tiles?.[i],drop=rules.active(state?.survival)&&until&&until<=t;dummy.position.set(p.x,drop?-10:2.85,p.z);dummy.scale.setScalar(drop?.001:1);dummy.updateMatrix();tiles.setMatrixAt(i,dummy.matrix);tileColor.set(until&&rules.active(state?.survival)?'#e99745':(i+Math.floor(i/8))%2?'#3b9399':'#64b7ac');tiles.setColorAt(i,tileColor);}tiles.instanceMatrix.needsUpdate=true;if(tiles.instanceColor)tiles.instanceColor.needsUpdate=true;tiles.computeBoundingSphere();
    }
    const b=state?.soccer?.ball;
    if(b&&roots.soccer.visible){
      const age=Math.max(0,Math.min(.12,(t-b.at)/1000)),target=new THREE.Vector3(b.x+b.vx*age,Math.max(.3,b.y+b.vy*age),b.z+b.vz*age);
      if(!lastBall||ballMesh.position.distanceTo(target)>4)ballMesh.position.copy(target);else ballMesh.position.lerp(target,1-Math.exp(-18*dt));
      ballMesh.rotation.x+=b.vz*dt/.3;ballMesh.rotation.z-=b.vx*dt/.3;lastBall=b;
      const height=Math.max(0,ballMesh.position.y-.3);ballShadow.position.set(ballMesh.position.x,.055,ballMesh.position.z);ballShadow.scale.setScalar(1+Math.min(2,height)*.4);ballShadow.material.opacity=.8/(1+height*1.5);
    }
    for(const [id,badge]of badges){badge.visible=false;if(id!==uid&&!remoteCrews.has(id)){badge.removeFromParent();badge.geometry.dispose();badge.material.dispose();badges.delete(id);}}
    for(const [id,crew]of [[uid,player],...remoteCrews]){
      const own=id===uid,p=roster[id],other=own?a:rules.area(p);if(!own)crew.root.visible=enabled?other===a:crew.root.visible;
      if(!own&&crew.root.userData.petFollower)crew.root.userData.petFollower.visible=crew.root.visible;
      let badge=badges.get(id);
      if(!badge){const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.06,6,28),new THREE.MeshBasicMaterial({color:0xffa24b,depthTest:false,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.07;ring.renderOrder=999;crew.root.add(ring);badges.set(id,badge=ring);}
      const tag=state?.tag,team=state?.soccer?.members?.[id],oni=rules.active(tag)&&tag.oni===id,immune=rules.active(tag)&&tag.immune?.[id]>t;
      badge.visible=enabled&&(oni||immune||a==='soccer'&&rules.active(state?.soccer)&&team!==undefined);badge.position.y=oni?2.6:.07;badge.material.depthTest=!oni&&!immune;badge.material.color.set(oni?'#ff703c':immune?'#95f7ff':team===0?'#4caaff':'#ff6376');
      const kick=state?.soccer?.kicks?.[id],age=kick?(t-kick.at)/1000:1;
      if(enabled&&other==='soccer'&&crew.legs?.[1]){
        const skill=state?.soccer?.skills?.[id],motion=skill&&!skill.cancelled?sampleSoccerSkill(skill.kind,t-skill.at,skill.side):null;
        const shooting=age>=0&&age<.55,dribbling=b?.dribbler===id&&(own?player.root.userData.walking:roster[id]?.walking);
        if(motion||shooting||dribbling){
          const rig=crew.root.userData.tailoredAvatar||crew.root.userData,arms=rig.arms||rig.walkArms||crew.root.userData.walkArms||[];
          for(const node of [...crew.legs,crew.body,crew.pack,crew.visor,crew.shine,...arms])pose(node);
          if(motion){
            pose(crew.root);crew.root.rotation.y=skill.yaw+motion.turn;crew.root.rotation.z+=motion.bank;crew.root.position.y+=motion.bounce;
            crew.legs[0].rotation.x=motion.left;crew.legs[1].rotation.x=motion.right;
            crew.legs[0].position.x-=motion.stance;crew.legs[1].position.x+=motion.stance;
            crew.legs[0].rotation.z=-motion.bank*.5;crew.legs[1].rotation.z=-motion.bank*.5;
            const phase=(t-skill.at)/SOCCER_SKILLS[skill.kind].duration;
            if(skill.kind==='heelLift'){
              const gather=Math.sin(Math.PI*Math.min(1,phase/.4)),snap=Math.sin(Math.PI*Math.max(0,Math.min(1,(phase-.25)/.35)));
              crew.legs[0].position.z+=gather*.16-snap*.20;crew.legs[1].position.z-=gather*.22+snap*.12;
              crew.legs[0].position.y+=snap*.15;crew.legs[1].position.y+=snap*.22;
            }else{
              const contact=Math.sin(Math.PI*Math.min(1,phase/(skill.kind==='roulette'?.84:.8))),foot=skill.kind==='roulette'?(phase<.48?1:0):(phase<.3?0:1),leg=crew.legs[skill.side<0?1-foot:foot];
              const localX=Math.cos(motion.turn)*motion.x-Math.sin(motion.turn)*motion.z,localZ=Math.sin(motion.turn)*motion.x+Math.cos(motion.turn)*motion.z;
              leg.position.x+=(Math.max(-.55,Math.min(.55,localX))-leg.position.x)*contact;
              leg.position.z+=Math.max(-.58,Math.min(.58,localZ*.7))*contact;leg.position.y+=contact*(skill.kind==='roulette'?.13:.04);
            }
            for(const node of [crew.body,crew.pack,crew.visor,crew.shine])if(node){node.rotation.x+=motion.lean;node.position.y-=motion.weight*.075;}
            arms.forEach((arm,i)=>{arm.rotation.z=(i?-1:1)*(.3+motion.weight*.45);arm.rotation.x=motion.lean+(i?motion.right:motion.left)*.35;});
          }else if(shooting){
            const swing=age<.08?Math.sin(age/.08*Math.PI/2)*.65:age<.16 ? .65-(.65+(kick.mode==='pass' ? .85 : 1.45))*(age-.08)/.08:-(kick.mode==='pass' ? .85 : 1.45)*Math.pow(1-(age-.16)/.39,2),weight=Math.sin(age/.55*Math.PI);
            crew.legs[1].rotation.x=swing;crew.legs[1].rotation.z=kick.mode==='pass'?weight*.22:0;
            crew.legs[0].rotation.x=.13*weight;
            for(const node of [crew.body,crew.pack,crew.visor,crew.shine])if(node){node.rotation.x+=weight*.12;node.position.y-=weight*.06;node.position.x-=weight*.04;}
            arms.forEach((arm,i)=>{arm.rotation.x=(i?-.5:.35)*weight;arm.rotation.z=(i?-.45:.45)*weight;});
          }else{
            const phase=(t-Number(state.soccer.dribble?.at||0))/1000*12,touch=Math.max(0,Math.sin(phase));
            crew.legs[1].rotation.x-=touch*.45;crew.legs[0].rotation.x+=touch*.16;
            for(const node of [crew.body,crew.pack,crew.visor,crew.shine])if(node){node.rotation.x+=.09;node.position.y-=.025*touch;}
            arms.forEach((arm,i)=>{arm.rotation.x+=Math.sin(phase+(i?Math.PI:0))*.15;});
          }
        }
      }
    }
  }
  function afterRender(){for(const [node,position,rotation]of poses){node.position.copy(position);node.rotation.copy(rotation);}poses=[];for(const [root,visible]of hiddenRoots)root.visible=visible;hiddenRoots=[];if(savedFov!==null){camera.fov=savedFov;camera.updateProjectionMatrix();savedFov=null;}}
  return {get area(){return enabled?area():'lobby';},get state(){return state;},roots,ballMesh,canMove,groundAt,motionLocked,speedMultiplier,update,beforeRender,afterRender,exit};
}
/* LOBBY_GAMES_SCENE_END */
