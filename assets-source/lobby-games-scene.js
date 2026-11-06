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
  let enabled=false,uid='',host='',state=null,roster={},offset=0,roundSeen='',kickoffSeen='',eliminatedSeen='',finishedSeen='',lastAction='',lastBall=null,localArea='lobby',previousX=player.root.position.x;
  const roots={survival:new THREE.Group(),soccer:new THREE.Group()},doors=[],badges=new Map(),soccerBots=new Map();
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
  box(soccer,24.5,-.14,10.25,25,.28,35.5,'#183340');box(soccer,23,.012,10,F.right-F.left,.025,F.far-F.near,'#26744d');
  for(let i=0;i<15;i++)box(soccer,23,.026,F.near+1+i*2,F.right-F.left,.012,1,'#2b8056');
  const line=(x,z,w,d)=>box(soccer,x,.043,z,w,.014,d,'#e8f4df');
  for(const x of [F.left,F.right])line(x,10,.08,F.far-F.near);for(const z of [F.near,F.far,10])line(23,z,F.right-F.left,.08);
  const circle=new THREE.Mesh(new THREE.TorusGeometry(2,.035,5,48),material('#eef8e8'));circle.rotation.x=-Math.PI/2;circle.position.set(23,.055,10);soccer.add(circle);
  // The visible frame and collision frame use the same eleven connected rails per goal.
  for(const segment of rules.goalSegments()){
    const from=new THREE.Vector3(...segment.slice(0,3)),to=new THREE.Vector3(...segment.slice(3)),delta=to.clone().sub(from);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(F.postRadius,F.postRadius,delta.length(),10),material('#f3f4ed'));
    post.name='soccer-goal-frame';post.position.copy(from).add(to).multiplyScalar(.5);post.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());soccer.add(post);
  }
  const goalNets=[];
  for(const z of [F.near,F.far]){
    const dir=z===F.near?-1:1,back=z+dir*F.goalDepth,l=23-F.goal/2,r=23+F.goal/2,h=F.goalHeight,vertices=[];
    const surface=(point,cols,rows)=>{
      for(let j=0;j<=rows;j++)for(let i=0;i<cols;i++)vertices.push(...point(i/cols,j/rows),...point((i+1)/cols,j/rows));
      for(let i=0;i<=cols;i++)for(let j=0;j<rows;j++)vertices.push(...point(i/cols,j/rows),...point(i/cols,(j+1)/rows));
    };
    surface((u,v)=>[l+F.goal*u,h*v,back],24,12);
    for(const x of [l,r])surface((u,v)=>[x,h*v,z+dir*F.goalDepth*u],6,12);
    surface((u,v)=>[l+F.goal*u,h,z+dir*F.goalDepth*v],24,6);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    const net=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#c9e7df',transparent:true,opacity:.86}));net.name='soccer-goal-net';net.frustumCulled=false;soccer.add(net);
    goalNets.push({net,rest:new Float32Array(vertices),dir,z,back,l,r,h});
    line(19,z===F.near?F.near+2.5:F.far-2.5,.06,5);line(27,z===F.near?F.near+2.5:F.far-2.5,.06,5);line(23,z===F.near?F.near+5:F.far-5,8,.06);
  }
  function animateGoalNets(t){
    const goal=state?.soccer?.lastGoal;
    for(const {net,rest,dir,l,r,h}of goalNets){
      const age=goal?(t-goal.at)/1000-(F.goalDepth-F.radius)/Math.max(4,goal.speed||10):-1;
      const hit=goal&&(goal.team===0?1:-1)===dir&&age>=0&&age<2,positions=net.geometry.attributes.position;
      if(!hit&&!net.userData.moving)continue;
      for(let i=0;i<rest.length;i+=3){
        const x=rest[i],y=rest[i+1],z=rest[i+2],edge=Math.max(0,Math.sin(Math.PI*(x-l)/(r-l))*Math.sin(Math.PI*y/h));
        const distance=Math.hypot(x-(goal?.x??23),y-(goal?.y??1)),wave=hit?.62*Math.exp(-age*3.2)*Math.sin(age*18-distance*1.4)*Math.exp(-distance*.45)*edge:0;
        positions.array[i]=x;positions.array[i+1]=y;positions.array[i+2]=z+dir*wave;
      }
      positions.needsUpdate=true;net.userData.moving=hit;
    }
  }
  box(soccer,36.8,.55,10.25,.16,1.1,35.5,'#385a68');
  for(const [z,d]of [[-2.4,6],[14.6,22.5]]){const wall=box(soccer,12.2,.55,z,.16,1.1,d,'#385a68');wall.name=z<0?'soccer-wall-before-door':'soccer-wall-after-door';}
  for(const z of [-7.4,27.8])box(soccer,24.5,.55,z,24.6,1.1,.16,'#385a68');
  sign(soccer,'FUTSAL ARENA',23,3,-7.35,9);
  const pitchObjects=[...soccer.children].map(n=>({n,p:n.position.clone(),s:n.scale.clone()}));
  function resizePitch(){
   const sx=F.width/20,sz=F.length/30;
   for(const {n,p,s}of pitchObjects){
    if(n.name==='soccer-wall-before-door'){n.position.z=(F.minZ+.1+.6)/2;n.scale.z=.6-(F.minZ+.1);continue;}
    if(n.name==='soccer-wall-after-door'){n.position.z=(3.35+F.maxZ-.2)/2;n.scale.z=F.maxZ-.2-3.35;continue;}
    if(n.name==='soccer-goal-frame'||n.name==='soccer-goal-net'){const side=(n.name==='soccer-goal-net'?n.geometry.attributes.position.getZ(0):p.z)<10?-1:1;n.position.z=p.z+side*(F.length-30)/2;continue;}
    n.position.z=10+(p.z-10)*sz;n.scale.z=s.z*sz;
    // Keep the entrance in place; expand turf and pitch markings, not the door.
    if(p.y<.1&&p.y>=0){n.position.x=23+(p.x-23)*sx;n.scale.x=s.x*sx;}
   }
  }
  const stadium=createSoccerStadium(THREE,soccer,F);
  const stations=[];
  function station(id,text,z,y=1.1,width=1.8,x=34.4){
    const root=new THREE.Group();root.name='soccer-station-'+id;root.position.set(x,0,z);root.rotation.y=-Math.PI/2;soccer.add(root);
    box(root,0,y-.13,0,width+.12,.65,.32,id.startsWith('blue')?'#245d88':id.startsWith('red')?'#84394e':'#226964');
    const label=sign(root,text,0,y,.19,width);label.name='soccer-button-'+id;label.userData.station=id;
    stations.push({id,root,label,x,z});return label;
  }
  const startLabel=station('start','スタート',10,1.35,2.8);
  const blueLabel=station('blue-count','青 BOT 1',6.2,2.2,3),redLabel=station('red-count','赤 BOT 1',13.8,2.2,3);
  station('blue-minus','−',5.4,1.1,1.2);station('blue-plus','＋',7,1.1,1.2);
  station('red-minus','−',13,1.1,1.2);station('red-plus','＋',14.6,1.1,1.2);
  const exitSign=sign(soccer,'← ロビーへ戻る',12.35,3.6,2.1,3.8);exitSign.rotation.y=Math.PI/2;exitSign.name='soccer-exit-sign';stations.push({id:'exit',root:exitSign,label:exitSign,x:12.35,z:2.1});
  function stationInfo(item){const playing=rules.active(state?.soccer),isHost=uid===host,id=item.id==='start'&&playing?'stop':item.id;
    return {station:id,stationLabel:id==='exit'?'ロビーへ':id==='start'?(isHost?'スタート':'ホストのみ開始'):id==='stop'?(isHost?'試合終了':'ホストのみ終了'):(id.startsWith('blue')?'青 BOT':'赤 BOT')+(id.endsWith('plus')?' ＋':' −'),stationEnabled:id==='exit'||isHost&&(!playing||id==='stop')};}
  function nearStation(){if(!enabled||area()!=='soccer')return null;return stations.filter(s=>!s.id.endsWith('count')&&s.root.visible).map(s=>({s,d:Math.hypot(player.root.position.x-s.x,player.root.position.z-s.z)})).filter(q=>q.d<2).sort((a,b)=>a.d-b.d)[0]?.s||null;}
  const raycaster=new THREE.Raycaster();
  renderer.domElement.addEventListener('pointerdown',event=>{
    if(event.button!==0||!enabled||area()!=='soccer'||window.__lobbyStudioOpen)return;
    const rect=renderer.domElement.getBoundingClientRect();camera.updateMatrixWorld();soccer.updateMatrixWorld(true);
    raycaster.setFromCamera(new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,1-(event.clientY-rect.top)/rect.height*2),camera);
    const hit=raycaster.intersectObjects(stations.filter(s=>s.root.visible&&!s.id.endsWith('count')).map(s=>s.label),false)[0];
    if(!hit)return;const item=stations.find(s=>s.label===hit.object),info=stationInfo(item);
    if(Math.hypot(player.root.position.x-item.x,player.root.position.z-item.z)>3||!info.stationEnabled)return;
    event.preventDefault();event.stopPropagation();parent.postMessage({type:'lobby-games-station',station:info.station},'*');
  },{passive:false});
  function updateStations(){const playing=rules.active(state?.soccer),options=state?.soccer?.botOptions||{blue:1,red:1};
    const bots=Object.values(state?.soccer?.bots||{}),counts=playing?[0,1].map(team=>bots.filter(p=>p.online!==false&&p.team===team).length):[options.enabled===false?0:options.blue,options.enabled===false?0:options.red];
    blueLabel.userData.setText('青 BOT '+counts[0]);redLabel.userData.setText('赤 BOT '+counts[1]);startLabel.userData.setText(playing?'試合終了':'スタート');
    for(const s of stations){s.root.visible=!playing||['start','exit','blue-count','red-count'].includes(s.id);s.label.material.opacity=uid===host||s.id==='exit'?1:.65;s.label.material.transparent=true;}
  }

  sign(soccer,'観戦・待機',13.5,.05,9,6).rotation.x=-Math.PI/2;
  const ballMesh=createLobbySoccerBall(THREE);ballMesh.position.set(23,.3,10);soccer.add(ballMesh);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=64;const shadowContext=shadowCanvas.getContext('2d'),gradient=shadowContext.createRadialGradient(32,32,4,32,32,32);gradient.addColorStop(0,'#000a');gradient.addColorStop(.45,'#0005');gradient.addColorStop(1,'#0000');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,64,64);
  const ballShadow=new THREE.Mesh(new THREE.PlaneGeometry(.95,.95),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));ballShadow.rotation.x=-Math.PI/2;ballShadow.position.set(23,.055,10);soccer.add(ballShadow);
  const now=()=>Date.now()+offset;
  const area=()=>localArea;
  function teleport(x,y,z){player.root.position.set(x,y,z);player.root.userData.lobbyHeightInitialized=true;clearMotion();parent.postMessage({type:'lobby-position',gameArea:localArea,x,z,lobbyY:y,yaw:player.root.rotation.y,walking:false,lobbyKart:false,circuitTrack:false},'*');}
  function exit(){const a=area();localArea='lobby';if(a==='survival')teleport(-9.5,0,-2.3);else if(a==='soccer')teleport(9.5,0,2.1);previousX=player.root.position.x;}
  let pressIntent=false,dashIntent=null,aimIntent={active:false},soccerCamera='length',cameraChanged=false;
  function setSoccerCamera(mode){if(['length','side','third'].includes(mode)&&soccerCamera!==mode){soccerCamera=mode;cameraChanged=true;}}
  window.addEventListener('message',event=>{
    if(event.source!==parent)return;const data=event.data;
    if(data?.type==='lobby-soccer-camera'){setSoccerCamera(data.mode);return;}
    if(data?.type==='lobby-soccer-press-intent'){pressIntent=data.held===true;return;}
    if(data?.type==='lobby-soccer-dash-intent'){dashIntent=data.held===true;return;}
    if(data?.type==='lobby-soccer-aim'){
      aimIntent={active:data.active===true&&Number.isFinite(data.yaw),yaw:Number(data.yaw)||0,forceShot:data.forceShot===true,lob:data.lob===true,through:data.through===true,passPreview:data.passPreview===true,spin:Number.isFinite(data.spin)?Math.max(-1,Math.min(1,data.spin)):0,charging:data.charging===true,power:Number.isFinite(data.power)?Math.max(0,Math.min(1,data.power)):0};return;
    }
    if(data?.type==='lobby-games-exit'){exit();return;}
    if(data?.type!=='lobby-games-state')return;
    enabled=data.enabled===true;
    if(!enabled){pressIntent=false;dashIntent=null;aimIntent={active:false};exit();state=null;roots.survival.visible=roots.soccer.visible=false;return;}
    setSoccerCamera(data.soccerCamera);state=data.state;rules.setSoccerPitch(state?.soccer);resizePitch();uid=data.uid||uid;host=data.host||'';roster=soccerRoster(state?.soccer,data.players||{});offset=Number(data.serverNow)-Date.now();
    const a=area(),g=state?.[a];
    if(g?.id&&rules.active(g)&&g.members?.[uid]!==undefined&&roundSeen!==g.id){
      roundSeen=g.id;eliminatedSeen=finishedSeen='';
      if(a==='survival'){const n=g.members[uid].slot,p=rules.tilePoint((Math.floor(n/8)*16+n%8)%56);teleport(p.x,3,p.z);}
      else if(a==='soccer'&&!g.kickoff?.slots?.[uid]){const ids=Object.keys(g.members).filter(id=>g.members[id]===g.members[uid]),i=ids.indexOf(uid);teleport(17+(i%4)*3,0,g.members[uid]===0?3+Math.floor(i/4)*2:17-Math.floor(i/4)*2);player.root.rotation.y=g.members[uid]===0?0:Math.PI;}
    }
    const restart=state?.soccer?.kickoff,slot=restart?.slots?.[uid];
    if(a==='soccer'&&rules.active(state.soccer)&&slot&&kickoffSeen!==restart.id){kickoffSeen=restart.id;player.root.rotation.y=slot.yaw;teleport(slot.x,0,slot.z);aimIntent={active:false};pressIntent=false;dashIntent=null;}
    const fall=state?.survival;
    if(a==='survival'&&fall?.members?.[uid]?.alive===false&&eliminatedSeen!==fall.id){eliminatedSeen=fall.id;teleport(-30+(fall.members[uid].slot%12),7,12.5);}
  });
  function soccerCrews(){return [...remoteCrews,...soccerBots];}
  function syncSoccerBots(dt){
    const bots=enabled?state?.soccer?.bots||{}:{};
    for(const [id,crew]of soccerBots)if(!bots[id]){
      crew.root.removeFromParent();const geometries=new Set(),materials=new Set();
      crew.root.traverse(n=>{if(n.geometry)geometries.add(n.geometry);if(n.material)materials.add(n.material);});
      for(const g of geometries)g.dispose();for(const m of materials){m.map?.dispose();m.dispose();}soccerBots.delete(id);
    }
    for(const [id,p]of Object.entries(bots)){
      let crew=soccerBots.get(id);if(!crew){crew=createCrew(p.team===0?'#62bcff':'#ff7185',p.name,p.x,p.z);crew.root.name=id;soccerBots.set(id,crew);roots.soccer.add(crew.root);}
      const restart=state?.soccer?.kickoff;if(restart&&crew.root.userData.kickoff!==restart.id){crew.root.position.set(p.x,0,p.z);crew.root.rotation.y=p.yaw;crew.root.userData.kickoff=restart.id;}
      const old=crew.root.position.clone(),blend=1-Math.exp(-18*Math.max(0,dt));
      if(old.distanceTo(new THREE.Vector3(p.x,0,p.z))>3)crew.root.position.set(p.x,0,p.z);else{crew.root.position.x+=(p.x-old.x)*blend;crew.root.position.z+=(p.z-old.z)*blend;}
      const turn=Math.atan2(Math.sin(p.yaw-crew.root.rotation.y),Math.cos(p.yaw-crew.root.rotation.y));crew.root.rotation.y+=turn*blend;
      updateWalkCycle(crew.root,crew.legs,crew.body,crew.root.position.distanceTo(old),dt,p.walking,true);roster[id]=p;
    }
  }
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
    if(a==='survival'&&game?.status==='countdown'&&participant?.alive&&rules.tileAt({x,z})<0)return false;
    if(a==='survival'&&rules.active(game)&&(!participant||!participant.alive)&&x< -18&&z<11.3&&player.root.position.y<6)return false;
    if(a==='soccer'&&rules.active(game)&&participant===undefined&&x>14.3)return false;
    if(a==='soccer'&&rules.goalContact(x,player.root.position.y+.6,z,.48))return false;
    for(const [id,crew]of soccerCrews()){if(rules.area(roster[id])!==a)continue;const p=crew.root.position;if(Math.abs(p.y-player.root.position.y)<1.6){const next=Math.hypot(p.x-x,p.z-z),previous=Math.hypot(p.x-player.root.position.x,p.z-player.root.position.z);if(next<.85&&next<=previous+1e-6)return false;}}
    return true;
  }
  function separateLocal(){
    if(!enabled||area()!=='soccer')return;
    // The separation clamp must leave the doorway corridor open to the lobby.
    if(player.root.position.x<13.5&&Math.abs(player.root.position.z-2.1)<1.25)return;
    const p=player.root.position,others={...roster};for(const [id,crew]of soccerCrews())if(others[id])others[id]={...others[id],x:crew.root.position.x,z:crew.root.position.z};
    const q=resolveSoccerOverlap(uid,p,others,F,(x,z)=>!!rules.goalContact(x,p.y+.6,z,.48));
    if(Math.hypot(q.x-p.x,q.z-p.z)>.0001){p.x=q.x;p.z=q.z;clearMotion();parent.postMessage({type:'lobby-position',gameArea:'soccer',x:p.x,z:p.z,lobbyY:p.y,yaw:player.root.rotation.y,walking:false},'*');}
  }
  function activeLocalTrap(){
    const g=state?.soccer,r=g?.receives?.[uid],b=g?.ball;
    return enabled&&area()==='soccer'&&['idle','playing'].includes(g?.status)&&r?.kind==='trap'&&now()>=r.at&&now()<r.until&&b?.keeperOwner===undefined&&(!b.dribbler||b.dribbler===uid)&&(!r.applied||b.dribbler===uid)?r:null;
  }
  function steerLocalTrap(){
    if(!activeLocalTrap()||window.__lobbyStudioOpen)return;
    const horizontal=Number(pressed('KeyD','ArrowRight'))-Number(pressed('KeyA','ArrowLeft'))+lobbyStick.x,vertical=Number(pressed('KeyW','ArrowUp'))-Number(pressed('KeyS','ArrowDown'))-lobbyStick.z;
    if(Math.hypot(horizontal,vertical)<.18)return;
    const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();
    const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize(),direction=right.multiplyScalar(horizontal).addScaledVector(forward,vertical);
    const yaw=Math.atan2(direction.x,direction.z),turn=Math.atan2(Math.sin(yaw-player.root.rotation.y),Math.cos(yaw-player.root.rotation.y));
    if(Math.abs(turn)<.005)return;player.root.rotation.y=yaw;
    // Facing uses the existing ordered player-pose transport, even while feet are locked.
    const p=player.root.position;parent.postMessage({type:'lobby-position',gameArea:'soccer',x:p.x,z:p.z,lobbyY:p.y,yaw,walking:false},'*');
  }
  function activeLocalSkill(){const skill=state?.soccer?.skills?.[uid];return enabled&&area()==='soccer'&&skill&&!skill.cancelled&&state.soccer.status!=='finished'&&now()>=skill.at&&now()<=skill.at+SOCCER_SKILLS[skill.kind]?.duration?skill:null;}
  function activeLocalPress(){
    if(!enabled||!pressIntent||area()!=='soccer')return null;
    const g=state?.soccer,p=rules.pressActive(g,uid,now());
    return p&&rules.pressTarget(g,uid,{...roster,[uid]:{...roster[uid],x:player.root.position.x,z:player.root.position.z,lobbyY:player.root.position.y}},now())===p.target?p:null;
  }
  function advancePress(dt){
    const p=activeLocalPress();if(!p||p.phase==='recover')return;
    const target=remoteCrews.get(p.target)?.root.position||roster[p.target],ball=state.soccer.ball,pos=player.root.position;
    const holder=roster[p.target],fx=Math.sin(holder.yaw||0),fz=Math.cos(holder.yaw||0),front=(pos.x-target.x)*fx+(pos.z-target.z)*fz;
    // Curve around a shielding player's shoulder instead of pushing through their body.
    let tx=ball.x,tz=ball.z;
    if(front<.1){tx=target.x+fx*.5+fz*p.side*1.15;tz=target.z+fz*.5-fx*p.side*1.15;}
    if(Number.isFinite(p.aimX)&&Number.isFinite(p.aimZ)){tx=p.aimX;tz=p.aimZ;}
    const horizontal=Number(pressed('KeyD','ArrowRight'))-Number(pressed('KeyA','ArrowLeft'))+lobbyStick.x,vertical=Number(pressed('KeyW','ArrowUp'))-Number(pressed('KeyS','ArrowDown'))-lobbyStick.z;
    if(Math.hypot(horizontal,vertical)>.18){
      const f=new THREE.Vector3();camera.getWorldDirection(f);f.y=0;f.normalize();const r=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0)).normalize();
      const stick=new THREE.Vector3().addScaledVector(r,horizontal).addScaledVector(f,vertical).normalize();tx=pos.x+stick.x*4;tz=pos.z+stick.z*4;
    }
    const steering=Math.hypot(horizontal,vertical)>.18;
    const dx=tx-pos.x,dz=tz-pos.z,d=Math.hypot(dx,dz),reach=p.phase==='reach',gap=steering?0:p.mode==='matchup'?.1:(p.flanking??front<.1)?.12:reach?.65:.93;
    const speed=(p.mode==='matchup'?3.3:reach?3.2:4.8)*(.75+.25*p.energy),travel=Math.min(Math.max(0,d-gap),speed*Math.min(.05,Math.max(0,dt))),steps=Math.max(1,Math.ceil(travel/.075));
    const beforeX=pos.x,beforeZ=pos.z;
    for(let i=0;i<steps&&d>.001;i++){
      const sx=dx/d*travel/steps,sz=dz/d*travel/steps;
      if(canMove(pos.x+sx,pos.z+sz)===true){pos.x+=sx;pos.z+=sz;}
      else if(canMove(pos.x+sx,pos.z)===true)pos.x+=sx;
      else if(canMove(pos.x,pos.z+sz)===true)pos.z+=sz;
    }
    const yaw=Math.atan2(ball.x-pos.x,ball.z-pos.z),turn=Math.atan2(Math.sin(yaw-player.root.rotation.y),Math.cos(yaw-player.root.rotation.y));player.root.rotation.y+=turn*(1-Math.exp(-16*dt));
    parent.postMessage({type:'lobby-position',gameArea:'soccer',x:pos.x,z:pos.z,lobbyY:pos.y,yaw:player.root.rotation.y,walking:Math.hypot(pos.x-beforeX,pos.z-beforeZ)>.0001},'*');
  }
  let slideTravel=null;
  function activeLocalSlide(){return enabled&&area()==='soccer'&&['idle','playing'].includes(state?.soccer?.status)?soccerSlideActive(state.soccer,uid,now()):null;}
  function advanceSlide(){
    const slide=activeLocalSlide();if(!slide){slideTravel=null;return;}
    const motion=sampleSoccerSlide(slide,now());if(slideTravel?.at!==slide.at)slideTravel={at:slide.at,travel:0,blocked:false};
    const delta=motion.travel-slideTravel.travel;slideTravel.travel=motion.travel;
    if(!slideTravel.blocked&&delta>0){
      const steps=Math.max(1,Math.ceil(delta/.06));
      for(let i=0;i<steps;i++){
        const x=player.root.position.x+Math.sin(slide.yaw)*delta/steps,z=player.root.position.z+Math.cos(slide.yaw)*delta/steps;
        if(canMove(x,z)!==true){slideTravel.blocked=true;break;}player.root.position.x=x;player.root.position.z=z;
      }
    }
    player.root.rotation.y=slide.yaw;
    parent.postMessage({type:'lobby-position',gameArea:'soccer',x:player.root.position.x,z:player.root.position.z,lobbyY:player.root.position.y,yaw:slide.yaw,walking:false},'*');
  }
  let lastTravel=null;
  function advanceSkill(){
    const skill=activeLocalSkill();if(state?.soccer?.finishes?.[uid]&&now()>=(state.soccer.finishes[uid].windupAt??state.soccer.finishes[uid].at)&&now()<state.soccer.finishes[uid].until)return;if(!skill){lastTravel=null;return;}
    const motion=sampleSoccerSkill(skill.kind,now()-skill.at,skill.side);if(!motion)return;
    if(lastTravel?.id!==skill.id)lastTravel={id:skill.id,x:0,z:0};
    const dx=motion.travelX-lastTravel.x,dz=motion.travelZ-lastTravel.z,c=Math.cos(skill.yaw),s=Math.sin(skill.yaw),steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));
    for(let i=0;i<steps;i++){const x=player.root.position.x+(c*dx+s*dz)/steps,z=player.root.position.z+(-s*dx+c*dz)/steps;if(canMove(x,z)!==true)break;player.root.position.x=x;player.root.position.z=z;}
    player.root.rotation.y=skill.yaw;lastTravel={id:skill.id,x:motion.travelX,z:motion.travelZ};
    parent.postMessage({type:'lobby-position',gameArea:'soccer',x:player.root.position.x,z:player.root.position.z,lobbyY:player.root.position.y,yaw:skill.yaw,walking:true},'*');
  }
  function teamColor(id){const team=state?.soccer?.members?.[id];return enabled&&area()==='soccer'&&rules.active(state?.soccer)?team===0?'#62bcff':team===1?'#ff7185':'#f8fdff':'#f8fdff';}
  function motionLocked(){const g=state?.[area()];return !!(enabled&&area()==='soccer'&&now()<Number(g?.knockdowns?.[uid]?.until||0))|| !!(enabled&&area()==='soccer'&&rules.active(g)&&g?.members?.[uid]!==undefined&&g?.kickoff&&now()<g.kickoff.readyAt)|| !!(enabled&&area()==='soccer'&&state?.soccer?.finishes?.[uid]&&now()<state.soccer.finishes[uid].until)||!!(enabled&&area()==='soccer'&&state?.soccer?.receives?.[uid]&&!state.soccer.receives[uid].ground&&now()<state.soccer.receives[uid].until)||!!activeLocalSlide()||!!activeLocalSkill()||!!activeLocalPress()||enabled&&(rules.active(g)&&g.status==='countdown'&&g.members?.[uid]!==undefined||state?.tag?.oni===uid&&rules.active(state.tag)&&now()<state.tag.frozenUntil);}
  function backDribble(dx,dz){return enabled&&area()==='soccer'&&state?.soccer?.ball?.dribbler===uid&&dx*Math.sin(player.root.rotation.y)+dz*Math.cos(player.root.rotation.y)<-.25*Math.hypot(dx,dz);}
  function speedMultiplier(){
    if(enabled&&area()==='soccer'){
      const g=state?.soccer,p=g?.presses?.[uid];if(p?.outcome&&p.outcome!=='won'&&now()<p.recoverUntil)return .55;
      const sprint=dashIntent!==false&&rules.dashStatus(state,uid,now()).running?1.6:1;
      if(g?.ball?.dribbler===uid)return (rules.pressThreat(g,uid,now())?.distance<1.7?.79:.85)*sprint;
      return sprint;
    }
    return enabled&&state?.tag?.oni===uid&&state.tag.status==='playing'?1.15:1;
  }
  const slideDustPositions=new Float32Array(24*3),slideDustGeometry=new THREE.BufferGeometry();slideDustGeometry.setAttribute('position',new THREE.BufferAttribute(slideDustPositions,3));
  const slideDust=new THREE.Points(slideDustGeometry,new THREE.PointsMaterial({color:'#b2d69a',size:.065,transparent:true,opacity:.65,depthWrite:false}));slideDust.name='soccer-slide-turf';slideDust.frustumCulled=false;slideDust.visible=false;roots.soccer.add(slideDust);
  function updateSlideDust(t){
    const g=state?.soccer,entry=Object.entries(g?.slides||{}).find(([id,s])=>t-s.at>=SOCCER_SLIDE.launchMs+40&&t-s.at<SOCCER_SLIDE.travelMs&&(id===uid||roster[id]));slideDust.visible=enabled&&area()==='soccer'&&!!entry&&['idle','playing'].includes(g?.status);if(!slideDust.visible)return;
    const [id,s]=entry,p=id===uid?player.root.position:roster[id],age=(t-s.at)/1000;
    for(let i=0;i<24;i++){const phase=(age*2.4+i/24)%1,side=Math.sin(i*17.3)*.24;slideDustPositions[i*3]=p.x-Math.sin(s.yaw)*phase*.9+Math.cos(s.yaw)*side;slideDustPositions[i*3+1]=.06+Math.sin(phase*Math.PI)*(.08+(i%4)*.025);slideDustPositions[i*3+2]=p.z-Math.cos(s.yaw)*phase*.9-Math.sin(s.yaw)*side;}
    slideDustGeometry.attributes.position.needsUpdate=true;
  }
  const stickGesture=createSoccerStickGesture();
  function update(dt){
    const position=player.root.position;
    if(enabled&&!window.__lobbyKartCircuit?.active){
      if(localArea==='lobby'&&previousX>=-12&&position.x< -12&&Math.abs(position.z+2.3)<1.25)localArea='survival';
      else if(localArea==='lobby'&&previousX<=12&&position.x>12&&Math.abs(position.z-2.1)<1.25)localArea='soccer';
      else if(localArea==='survival'&&position.x> -12||localArea==='soccer'&&position.x<12)localArea='lobby';
    }
    previousX=position.x;
    const a=area(),t=now();separateLocal();steerLocalTrap();advanceSlide();advanceSkill();advancePress(dt);separateLocal();updateSlideDust(t);
    for(const door of doors){const near=Math.hypot(player.root.position.x-door.x,player.root.position.z-door.z)<3.5;for(const leaf of door.leaves)leaf.position.x+=((near?2.25:.74)*leaf.userData.side-leaf.position.x)*(1-Math.exp(-12*dt));}
    const g=state?.survival;
    if(a==='survival'&&g?.status==='finished'&&g.members?.[uid]?.alive&&t>g.endedAt+4500&&finishedSeen!==g.id){finishedSeen=g.id;teleport(-15.2,0,0);}
    const rows={...roster,[uid]:{...(roster[uid]||{}),online:true,x:player.root.position.x,z:player.root.position.z,lobbyY:player.root.position.y,lobbyCircuit:window.__lobbyKartCircuit?.active===true}};
    const circle=stickGesture(lobbyStick.x,lobbyStick.z,t,enabled&&a==='soccer'&&!!state&&state.soccer.ball.dribbler===uid&&!activeLocalTrap()&&rules.canSkill(state,uid,rows,t));if(circle)parent.postMessage({type:'lobby-games-command',kind:'soccer-skill',skill:'scissors',side:circle,yaw:player.root.rotation.y},'*');
    const target=state?rules.tagTarget(state,uid,rows,t):'',kick=state&&(rules.canKick(state,uid,rows,t)||rules.canQueueKick(state,uid,rows,t));
    camera.updateMatrixWorld();const matrix=camera.matrixWorld.elements,rightLength=Math.hypot(matrix[0],matrix[2])||1,forwardLength=Math.hypot(matrix[8],matrix[10])||1;
    const nearby=nearStation();const action={type:'lobby-games-action',area:a,...(nearby?stationInfo(nearby):{station:'',stationLabel:'',stationEnabled:false}),enabled:enabled&&(a==='soccer'?!!kick:!!target),canSkill:a==='soccer'&&!!state&&rules.canSkill(state,uid,rows,t),target,passTarget:a==='soccer'&&state?rules.kickAim(state,uid,rows,player.root.rotation.y).target:'',yaw:player.root.rotation.y,rightX:matrix[0]/rightLength,rightZ:matrix[2]/rightLength,forwardX:-matrix[8]/forwardLength,forwardZ:-matrix[10]/forwardLength};
    const key=JSON.stringify({...action,yaw:Math.round(action.yaw*20)/20});if(key!==lastAction){lastAction=key;parent.postMessage(action,'*');}
  }
  let savedFov=null,hiddenRoots=[],poses=[];const ballView={x:NaN,y:.3,z:0,vx:0,vy:0,vz:0};
  const posedNodes=new Set();const pose=node=>{if(node&&!posedNodes.has(node)){posedNodes.add(node);poses.push([node,node.position.clone(),node.rotation.clone()]);}};
  const contactRing=new THREE.Mesh(new THREE.RingGeometry(.28,.35,36),new THREE.MeshBasicMaterial({color:0xffd593,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  contactRing.name='soccer-press-contact';contactRing.rotation.x=-Math.PI/2;roots.soccer.add(contactRing);

  const aimGuide=new THREE.Group();aimGuide.name='soccer-aim-guide';aimGuide.visible=false;roots.soccer.add(aimGuide);
  const aimMaterial=new THREE.MeshBasicMaterial({color:'#9af8d7',transparent:true,opacity:.82,depthWrite:false,depthTest:false});
  const aimLine=new THREE.Mesh(new THREE.BoxGeometry(.075,.015,1),aimMaterial);aimLine.name='soccer-aim-line';aimLine.renderOrder=400;aimGuide.add(aimLine);
  const aimHead=new THREE.Mesh(new THREE.ConeGeometry(.21,.6,3),aimMaterial);aimHead.rotation.x=Math.PI/2;aimHead.renderOrder=400;aimGuide.add(aimHead);
  const aimTarget=new THREE.Mesh(new THREE.RingGeometry(.38,.43,32),aimMaterial);aimTarget.rotation.x=-Math.PI/2;aimTarget.renderOrder=400;aimGuide.add(aimTarget);
  const lobGeometry=new THREE.BufferGeometry();lobGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(78),3));
  const lobLine=new THREE.Line(lobGeometry,new THREE.LineBasicMaterial({color:'#c8b1ff',transparent:true,opacity:.95,depthWrite:false}));lobLine.name='soccer-lob-preview';lobLine.frustumCulled=false;lobLine.visible=false;roots.soccer.add(lobLine);
  const curveGeometry=new THREE.BufferGeometry();curveGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(78),3));
  const curveLine=new THREE.Line(curveGeometry,new THREE.LineBasicMaterial({color:'#ffd080',transparent:true,opacity:.9,depthWrite:false}));curveLine.name='soccer-curve-preview';curveLine.frustumCulled=false;curveLine.visible=false;roots.soccer.add(curveLine);
  const landing=new THREE.Mesh(new THREE.RingGeometry(.6,.66,40),new THREE.MeshBasicMaterial({color:'#d5b9ff',transparent:true,opacity:.7,side:THREE.DoubleSide,depthWrite:false}));landing.rotation.x=-Math.PI/2;landing.name='soccer-pass-landing';roots.soccer.add(landing);
  const chargeCanvas=document.createElement('canvas');chargeCanvas.width=256;chargeCanvas.height=48;
  const chargeTexture=new THREE.CanvasTexture(chargeCanvas);chargeTexture.colorSpace=THREE.SRGBColorSpace;
  const chargeGauge=new THREE.Sprite(new THREE.SpriteMaterial({map:chargeTexture,transparent:true,depthTest:false,depthWrite:false}));
  chargeGauge.name='soccer-charge-gauge';chargeGauge.scale.set(1.65,.31,1);chargeGauge.visible=false;chargeGauge.renderOrder=410;roots.soccer.add(chargeGauge);
  const throughMaterial=new THREE.MeshBasicMaterial({color:'#b2ffe1',transparent:true,opacity:1,depthWrite:false}),throughLine=new THREE.Mesh(new THREE.BoxGeometry(.13,.02,1),throughMaterial);throughLine.name='soccer-through-guide';throughLine.visible=false;roots.soccer.add(throughLine);
  const trapDirection=new THREE.ArrowHelper(new THREE.Vector3(0,0,1),new THREE.Vector3(),1.25,0x93ffe1,.3,.2);trapDirection.name='soccer-trap-direction';trapDirection.visible=false;roots.soccer.add(trapDirection);
  function drawTrapDirection(){
    trapDirection.visible=!!activeLocalTrap();if(!trapDirection.visible)return;
    const p=player.root.position,yaw=player.root.rotation.y;trapDirection.position.set(p.x,.12,p.z);trapDirection.setDirection(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)));
  }
  let lastCharge=-1;
  function drawGuidance(t){
    const p=player.root.position,rows={...roster,[uid]:{...roster[uid],online:true,x:p.x,z:p.z,lobbyY:p.y}};
    aimGuide.visible=enabled&&area()==='soccer'&&aimIntent.active&&aimIntent.charging&&!!state&&!rules.active(state.tag)&&(rules.canKick(state,uid,rows,t)||rules.canQueueKick(state,uid,rows,t));
    chargeGauge.visible=aimGuide.visible&&aimIntent.charging;
    throughLine.visible=lobLine.visible=curveLine.visible=false;const flight=state?.soccer?.flight;landing.visible=enabled&&area()==='soccer'&&!!flight;if(flight){landing.position.set(flight.x,.065,flight.z);landing.scale.setScalar(1+.08*Math.sin(t*.012));}
    if(!aimGuide.visible)return;
    let aim=rules.kickAim(state,uid,rows,aimIntent.yaw,aimIntent.forceShot);if(aimIntent.lob){const target=rules.passTarget(state,uid,rows,aimIntent.yaw),q=rows[target];if(q)aim={mode:'lob',target,x:q.x,z:q.z,yaw:Math.atan2(q.x-p.x,q.z-p.z)};}
    if(aim.mode==='pass'&&!aimIntent.lob&&rows[aim.target]){
      const q=soccerPassPoint(rows[aim.target],F,aimIntent.power,true),length=Math.hypot(q.x-p.x,q.z-p.z);throughLine.visible=true;throughLine.position.set((p.x+q.x)/2,.095,(p.z+q.z)/2);throughLine.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);throughLine.scale.set(aimIntent.through?1.5:1,1,length);throughMaterial.opacity=aimIntent.through?.85+.15*Math.sin(t*.015):.28;throughMaterial.color.set(aimIntent.through?'#d5ffe6':'#7b9eab');throughLine.userData.target={...q};throughLine.userData.selected=aimIntent.through;
    }
    const length=Math.hypot(aim.x-p.x,aim.z-p.z);
    aimGuide.position.set(p.x,p.y+.075,p.z);aimGuide.rotation.y=aim.yaw;aimGuide.userData.mode=aim.mode;aimGuide.userData.target=aim.target;
    aimMaterial.opacity=aimIntent.through?.25:1;
    aimMaterial.color.set(aim.mode==='lob'?'#c8b1ff':aim.mode==='pass'?'#88ffcf':'#ffd080');aimLine.visible=aim.mode!=='lob';
    if(aim.mode==='lob'){lobLine.visible=true;const points=lobGeometry.attributes.position;for(let i=0;i<26;i++){const u=i/25,travel=Math.max(.85,Math.min(1.8,length/(8+aimIntent.power*6))),vy=1.15/travel+4.9*travel,age=u*travel,along=(1-Math.exp(-.18*age))/(1-Math.exp(-.18*travel));points.setXYZ(i,p.x+(aim.x-p.x)*along,.3+vy*age-4.9*age*age,p.z+(aim.z-p.z)*along);}points.needsUpdate=true;} aimLine.position.z=length/2;aimLine.scale.z=length;aimHead.position.z=Math.max(0,length-.25);aimTarget.position.z=length;
    const curved=aim.mode==='shot'&&Math.abs(aimIntent.spin)>.01;aimHead.visible=aimTarget.visible=!curved;
    if(curved){
      aimLine.visible=false;curveLine.visible=true;const path=sampleSoccerShotPath(state.soccer.ball,aim.yaw,aimIntent.power,aimIntent.spin,Math.min(.85,length/(10+aimIntent.power*7)));
      const points=curveGeometry.attributes.position;let count=0;for(const point of path){if(point.x<F.left||point.x>F.right||point.z<F.near||point.z>F.far)break;points.setXYZ(count++,point.x,point.y,point.z);}curveGeometry.setDrawRange(0,count);points.needsUpdate=true;
    }
    if(chargeGauge.visible){
      const dx=camera.position.x-p.x,dz=camera.position.z-p.z,distance=Math.hypot(dx,dz)||1;
      chargeGauge.position.set(p.x+dx/distance*.95,p.y+.11,p.z+dz/distance*.95);chargeGauge.userData.power=aimIntent.power;
      const percent=Math.round(aimIntent.power*100);
      if(percent!==lastCharge){
        lastCharge=percent;const g=chargeCanvas.getContext('2d');g.clearRect(0,0,256,48);
        g.fillStyle='#071625e8';g.beginPath();g.roundRect(2,7,252,34,12);g.fill();g.strokeStyle='#edfdfad9';g.lineWidth=3;g.stroke();
        const gradient=g.createLinearGradient(9,0,247,0);gradient.addColorStop(0,'#71f3bc');gradient.addColorStop(.6,'#ffe079');gradient.addColorStop(1,'#ff835c');
        g.fillStyle=gradient;g.beginPath();g.roundRect(9,14,Math.max(3,238*aimIntent.power),20,7);g.fill();chargeTexture.needsUpdate=true;
      }
    }
  }

  function beforeRender(dt){
    syncSoccerBots(dt);
    const count=name=>rules.active(state?.[name])?Object.entries(state[name].members||{}).filter(([id,m])=>(name==='soccer'?soccerLive(roster[id]):rules.live(roster[id]))&&(name!=='survival'||m.alive)).length:0;
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
    animateGoalNets(t);stadium.update(state?.soccer,t);updateStations();
    drawTrapDirection();drawGuidance(t);
    const duel=Object.values(state?.soccer?.presses||{}).filter(p=>p.contact&&t-p.contact.at>=0&&t-p.contact.at<430).sort((a,b)=>b.contact.at-a.contact.at)[0];
    contactRing.visible=!!duel;
    if(duel){const progress=(t-duel.contact.at)/430;contactRing.position.set(duel.contact.x,.065,duel.contact.z);contactRing.scale.setScalar(1+progress*2);contactRing.material.opacity=(1-progress)*.7;contactRing.material.color.set(duel.result==='won'?'#9affdd':duel.result==='evaded'?'#b6c3ff':'#ffdb9b');}
    const b=state?.soccer?.ball;
    if(b&&roots.soccer.visible){
      const visual=smoothSoccerBall(ballView,b,(t-b.at)/1000,dt,!lastBall||b.resetUntil!==lastBall.resetUntil),target=new THREE.Vector3(visual.x,visual.y,visual.z);
      const goal=state.soccer.lastGoal,goalAge=goal?(t-goal.at)/1000:99;
      if(goalAge>=0&&goalAge<1.25&&t<b.resetUntil){const dir=goal.team===0?1:-1;target.set(goal.x??23,Math.max(.3,(goal.y??.3)-goalAge*goalAge*2),(goal.z??(dir>0?F.far:F.near))+dir*Math.min(F.goalDepth-F.radius*2,goalAge*Math.max(4,goal.speed||10)));}
      const travel=target.clone().sub(ballMesh.position);ballMesh.rotation.x+=travel.z/.3;ballMesh.rotation.z-=travel.x/.3;ballMesh.position.copy(target);
      ballMesh.rotation.y+=(b.spin||0)*dt*12;lastBall=b;
      const height=Math.max(0,ballMesh.position.y-.3);ballShadow.position.set(ballMesh.position.x,.055,ballMesh.position.z);ballShadow.scale.setScalar(1+Math.min(2,height)*.4);ballShadow.material.opacity=.8/(1+height*1.5);
    }
    for(const [id,badge]of badges){badge.visible=false;if(id!==uid&&!remoteCrews.has(id)&&!soccerBots.has(id)){badge.removeFromParent();badge.geometry.dispose();badge.material.dispose();badges.delete(id);}}
    for(const [id,crew]of [[uid,player],...soccerCrews()]){
      const own=id===uid,p=roster[id],other=own?a:rules.area(p);if(!own)crew.root.visible=enabled?other===a:crew.root.visible;
      if(!own&&crew.root.userData.petFollower)crew.root.userData.petFollower.visible=crew.root.visible;
      let badge=badges.get(id);
      if(!badge){const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.06,6,28),new THREE.MeshBasicMaterial({color:0xffa24b,depthTest:false,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.07;ring.renderOrder=999;crew.root.add(ring);badges.set(id,badge=ring);}
      const tag=state?.tag,team=state?.soccer?.members?.[id],oni=rules.active(tag)&&tag.oni===id,immune=rules.active(tag)&&tag.immune?.[id]>t;
      const pressing=state?.soccer?.presses?.[id],pressActive=rules.pressActive(state?.soccer,id,t),pressPose=pressActive||pressing?.phase==='recover'&&t<pressing.recoverUntil?pressing:null,threat=rules.pressThreat(state?.soccer,id,t);
      const reaction=Object.values(state?.soccer?.presses||{}).find(p=>p.target===id&&p.contact&&t-p.contact.at>=0&&t-p.contact.at<600);
      badge.visible=enabled&&(oni||immune||other==='soccer'&&(pressActive||threat));badge.position.y=oni?2.6:.07;badge.material.depthTest=!oni&&!immune;badge.material.color.set(oni?'#ff703c':immune?'#95f7ff':threat?'#ffd394':'#89e4df');
      badge.material.transparent=true;badge.material.opacity=oni||immune?1:.42+.16*Math.sin(t/110);badge.scale.setScalar(oni||immune?1:threat?1.12:1);
      if(own&&enabled&&other==='soccer'&&!state?.soccer?.slides?.[id]){const lean=player.root.userData.soccerTurnLean||0;if(lean){pose(crew.root);crew.root.rotation.z+=lean;}}
      const nutmeg=state?.soccer?.nutmegs?.[id];if(enabled&&other==='soccer'&&nutmeg&&t>=nutmeg.at&&t<nutmeg.until){const w=Math.sin(Math.PI*(t-nutmeg.at)/(nutmeg.until-nutmeg.at));for(const [i,leg]of (crew.legs||[]).entries()){pose(leg);leg.position.x+=(i?1:-1)*.42*w;leg.rotation.z+=(i?-1:1)*.45*w;}pose(crew.body);crew.body.position.y-=.13*w;continue;}
      const down=state?.soccer?.knockdowns?.[id];if(enabled&&other==='soccer'&&down&&t>=down.at&&t<down.until){applySoccerKnockdownPose(crew,down,t,pose);continue;}
      const slide=state?.soccer?.slides?.[id],slideMotion=enabled&&other==='soccer'?sampleSoccerSlide(slide,t):null;
      if(slideMotion&&crew.legs?.length){
        const m=slideMotion,rig=crew.root.userData.tailoredAvatar||crew.root.userData,arms=rig.arms||rig.walkArms||crew.root.userData.walkArms||[];
        const side=Math.sin(slide.yaw)>=0?1:-1,lead=side>0?1:0,gear=crew.root.userData.walkCostumeRoot||crew.root.getObjectByName('lobbyCostume')||crew.root.getObjectByName('remoteCostume'),torso=[...new Set([crew.body,crew.pack,crew.visor,crew.shine,gear].filter(Boolean))];
        for(const node of [...torso,...crew.legs,...arms])if(node)pose(node);
        // Rotate the body, visor and backpack around the hips as one rigid assembly.
        const pivot=new THREE.Vector3(0,.48,0),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(m.pitch,0,m.roll*side));
        const bodyCenter=crew.body.position.clone().sub(pivot).applyQuaternion(q).add(pivot),shape=crew.body.geometry?.parameters;
        const radius=shape?.radius||.43,half=(shape?.length||.55)/2,axis=new THREE.Vector3(0,1,0).applyQuaternion(q);
        const groundLift=Math.max(0,.045-(bodyCenter.y+m.height-radius-half*Math.abs(axis.y)));
        for(const node of torso){node.position.sub(pivot).applyQuaternion(q).add(pivot);node.position.y+=m.height+groundLift;node.position.z+=m.offset;node.rotation.x+=m.pitch;node.rotation.z+=m.roll*side;}
        crew.legs.forEach((leg,i)=>{leg.rotation.x+=i===lead?m.lead:m.trail;leg.rotation.z+=(i?1:-1)*m.weight*.17;leg.position.y-=m.weight*.12;leg.position.y+=(i===lead?.055:-.025)*m.kneel;leg.position.z+=i===lead?m.leadZ:m.trailZ;const shape=leg.geometry?.parameters;leg.position.y=Math.max(leg.position.y,.035+(shape?.radius||.18)+(shape?.length||.26)/2*Math.abs(Math.cos(leg.rotation.x)));});
        arms.forEach((arm,i)=>{arm.position.sub(pivot).applyQuaternion(q).add(pivot);arm.position.y+=m.height+groundLift;arm.position.z+=m.offset;arm.rotation.x+=m.pitch+(i===lead?m.frontArm:m.backArm);arm.rotation.z+=(i?-1:1)*m.weight*.58;
          // The supporting palm reaches the turf before the hips rise.
          if(i!==lead&&m.handPlant>0){arm.position.y-=m.handPlant*.26;const palm=new THREE.Vector3((i?1:-1)*.53,.085,.02),direction=palm.sub(arm.position).normalize(),planted=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),direction);arm.quaternion.slerp(planted,m.handPlant);}
        });
        continue;
      }
      const finish=state?.soccer?.finishes?.[id];if(enabled&&other==='soccer'&&finish&&applySoccerOverheadPose(crew,finish,t,pose,ballMesh))continue;
      const receive=state?.soccer?.receives?.[id];if(enabled&&other==='soccer'&&receive&&applySoccerReceptionPose(crew,receive,t,pose,ballMesh))continue;
      const kick=state?.soccer?.kicks?.[id],kickMotion=sampleSoccerKick(kick,t);
      if(enabled&&other==='soccer'&&crew.legs?.[1]){
        const skill=state?.soccer?.skills?.[id],motion=skill&&!skill.cancelled?sampleSoccerSkill(skill.kind,t-skill.at,skill.side):null;
        const control=state?.soccer?.dribble,rollAge=control?.rollAt===undefined?-1:t-control.rollAt,walking=own?player.root.userData.walking:roster[id]?.walking;
        const receiving=control?.uid===id&&control.receiveAt!==undefined&&t>=control.receiveAt&&t<control.receiveAt+control.receiveDuration;
        const sprint=rules.dashStatus(state,id,t).running&&walking,shooting=!!kickMotion,dribbling=b?.dribbler===id&&(walking||receiving||rollAge>=0&&rollAge<(control?.rollDuration||320));
        if(motion||shooting||dribbling||pressPose||threat||reaction||sprint){
          const rig=crew.root.userData.tailoredAvatar||crew.root.userData,arms=rig.arms||rig.walkArms||crew.root.userData.walkArms||[];
          const gear=crew.root.userData.walkCostumeRoot||crew.root.getObjectByName('lobbyCostume')||crew.root.getObjectByName('remoteCostume');
          for(const node of [...new Set([...crew.legs,crew.body,crew.pack,crew.visor,crew.shine,gear,...arms].filter(Boolean))])pose(node);
          if(pressPose){
            const p=pressPose,phase=(t-p.at)/1000*15,reach=p.phase==='reach',recover=p.phase==='recover',age=(t-p.phaseAt)/1000;
            const ease=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);},extension=reach?ease(age/(SOCCER_PRESS.windup/1000)):recover?1-ease(age/.48):0;
            const variant=p.variant||0,crouch=(reach?.14:recover?.1:.075)+(variant===2?.055:0),side=p.side||1,foot=variant===1?(side>0?0:1):(side>0?1:0);
            const localBall=crew.root.worldToLocal(ballMesh.getWorldPosition(new THREE.Vector3()));
            crew.legs.forEach((leg,i)=>{
              leg.rotation.x=(recover?0:Math.sin(phase+i*Math.PI)*.28)*(1-extension);
              const stride=Math.sin(phase+i*Math.PI),plant=Math.max(0,-stride)*(1-extension);leg.position.x+=(i?1:-1)*(.075+extension*.025);leg.position.y+=Math.max(0,stride)*.055*(1-extension)-crouch*.35;leg.rotation.x*=1-plant*.35;
              if(i===foot){leg.position.z+=Math.max(-.2,Math.min(.5,localBall.z-.4))*extension;leg.position.x+=Math.max(-.22,Math.min(.22,localBall.x-leg.position.x))*extension;leg.rotation.x-=extension*(variant===1?.55:variant===2?1.05:.8);leg.rotation.z+=(variant===1?side*.3:variant===3?-side*.2:0)*extension;leg.position.y+=extension*.055;}
              else leg.rotation.x+=extension*.2;
            });
            for(const node of [...new Set([crew.body,crew.pack,crew.visor,crew.shine,gear].filter(Boolean))])if(node){node.position.y-=crouch;node.rotation.x+=.12+extension*.15;node.rotation.z-=side*extension*(variant===3?.22:.09);node.rotation.y+=(variant===1?side*.18:variant===3?-side*.15:0)*extension;}
            arms.forEach((arm,i)=>{arm.rotation.x=-.35+(i?1:-1)*Math.sin(phase)*.13*(1-extension);arm.rotation.z=(i?-1:1)*(.22+extension*.25);});
          }else if(motion){
            pose(crew.root);crew.root.rotation.y=skill.yaw+motion.turn;crew.root.rotation.z+=motion.bank;crew.root.position.y+=motion.bounce;
            crew.legs[0].rotation.x=motion.left;crew.legs[1].rotation.x=motion.right;
            crew.legs[0].position.x-=motion.stance;crew.legs[1].position.x+=motion.stance;
            crew.legs[0].rotation.z=-motion.bank*.5;crew.legs[1].rotation.z=-motion.bank*.5;
            const phase=(t-skill.at)/SOCCER_SKILLS[skill.kind].duration;
            if(skill.kind==='scissors'){
              for(const [i,leg]of crew.legs.entries()){const u=Math.max(0,Math.min(1,(phase-(i?.45:0))/.5)),w=Math.sin(u*Math.PI);leg.position.x+=(i?1:-1)*(.45*Math.sin(u*Math.PI*2))*w;leg.position.z+=.72*w;leg.position.y+=.18*w;leg.rotation.z+=(i?1:-1)*.3*w;}
            }else if(skill.kind==='heelLift'){
              const gather=Math.sin(Math.PI*Math.min(1,phase/.4)),snap=Math.sin(Math.PI*Math.max(0,Math.min(1,(phase-.25)/.35)));
              crew.legs[0].position.z+=gather*.16-snap*.20;crew.legs[1].position.z-=gather*.22+snap*.12;
              crew.legs[0].position.y+=snap*.15;crew.legs[1].position.y+=snap*.22;
              alignSoccerFoot(crew,0,skill.contact||ballMesh.getWorldPosition(new THREE.Vector3()),t,skill.at+430);
            }else if(skill.kind==='roulette'){
              const fixed=crew.legs[skill.side<0?0:1],swing=crew.legs[skill.side<0?1:0],turn=motion.turn,c=Math.cos(turn),sn=Math.sin(turn);
              const localX=.23*skill.side-motion.travelX,localZ=-motion.travelZ;
              fixed.position.x+=(c*localX-sn*localZ-fixed.position.x)*motion.plant;
              fixed.position.z+=(sn*localX+c*localZ-fixed.position.z)*motion.plant;
              fixed.rotation.x*=1-motion.plant;fixed.rotation.z*=1-motion.plant;fixed.rotation.y=-turn*motion.plant;
              const sweep=Math.sin(Math.PI*Math.min(1,phase/.65)),roll=Math.sin(Math.PI*Math.max(0,Math.min(1,(phase-.40)/.34)));swing.position.x-=skill.side*.28*sweep;swing.position.z+=.52*sweep;swing.position.y+=.14*sweep;
              const ballX=c*motion.x-sn*motion.z,ballZ=sn*motion.x+c*motion.z;
              swing.position.x+=(Math.max(-.55,Math.min(.55,ballX))-swing.position.x)*roll;
              swing.position.z+=(Math.max(-.6,Math.min(.65,ballZ))-.08-swing.position.z)*roll;swing.position.y+=.30*roll;swing.rotation.x-=.65*roll;
              for(const node of [...new Set([crew.body,crew.pack,crew.visor,crew.shine,gear].filter(Boolean))])if(node){node.rotation.y-=Math.sin(phase*Math.PI*2)*.16;node.position.y-=.035*Math.sin(phase*Math.PI);}
            }else{
              const contact=Math.sin(Math.PI*Math.min(1,phase/(skill.kind==='roulette'?.84:.8))),foot=skill.kind==='roulette'?(phase<.48?1:0):(phase<.3?0:1),leg=crew.legs[skill.side<0?1-foot:foot];
              const localX=Math.cos(motion.turn)*motion.x-Math.sin(motion.turn)*motion.z,localZ=Math.sin(motion.turn)*motion.x+Math.cos(motion.turn)*motion.z;
              leg.position.x+=(Math.max(-.55,Math.min(.55,localX))-leg.position.x)*contact;
              leg.position.z+=Math.max(-.58,Math.min(.58,localZ*.7))*contact;leg.position.y+=contact*(skill.kind==='roulette'?.13:.04);
            }
            for(const node of [...new Set([crew.body,crew.pack,crew.visor,crew.shine,gear].filter(Boolean))])if(node){node.rotation.x+=motion.lean;node.position.y-=motion.weight*.075;}
            arms.forEach((arm,i)=>{arm.rotation.z=(i?-1:1)*(.3+motion.weight*.45);arm.rotation.x=motion.lean+(i?motion.right:motion.left)*.35;});
          }else if(shooting){
            const m=kickMotion,leg=crew.legs[m.foot],plant=crew.legs[1-m.foot];
            pose(crew.root);const turn=Math.atan2(Math.sin(kick.yaw-crew.root.rotation.y),Math.cos(kick.yaw-crew.root.rotation.y));crew.root.rotation.y+=turn*m.weight;
            crew.root.updateMatrixWorld(true);
            const world=kick.contact?new THREE.Vector3(kick.contact.x,kick.contact.y,kick.contact.z):ballMesh.getWorldPosition(new THREE.Vector3()),local=crew.root.worldToLocal(world);
            leg.rotation.x=m.swing;leg.rotation.z=m.side*m.weight*(kick.mode==='pass'?.23:-(kick.spin||0)*.16);
            leg.position.x+=(Math.max(-.65,Math.min(.65,local.x))-leg.position.x)*m.impact;
            leg.position.z+=(Math.max(-.45,Math.min(1.25,local.z-.46))-leg.position.z)*m.impact;leg.position.y+=m.lift;
            plant.rotation.x=.12*m.plant;plant.position.x-=m.side*.06*m.plant;plant.position.z+=.12*m.plant;
            for(const node of [...new Set([crew.body,crew.pack,crew.visor,crew.shine,gear].filter(Boolean))])if(node){node.rotation.x+=m.lean;node.rotation.y+=m.twist;node.rotation.z+=m.bank;node.position.y-=m.weight*.07;node.position.x-=m.side*m.weight*.06;}
            arms.forEach((arm,i)=>{arm.rotation.x=(i===m.foot?-.8:.6)*m.arm;arm.rotation.z=(i?-1:1)*m.arm;});
          }else if(dribbling){
            const touch=sampleSoccerDribble(t-Number(control?.at??t),control?.walking??!!walking,rollAge,control?.rollSide,!!sprint,control?.phase===undefined?null:control.phase+Math.max(0,Math.min(100,t-control.phaseAt))/1000*(control.phaseRate||0),control),localBall=crew.root.worldToLocal(ballMesh.getWorldPosition(new THREE.Vector3()));
            crew.legs.forEach((leg,i)=>{
              const contact=touch.contacts[i],rest=crew.root.userData.walkLegRest?.[i],side=i?1:-1;
              leg.rotation.x=leg.rotation.x*.45-contact*(sprint?.85:.55);
              leg.rotation.z=leg.rotation.z*.25-side*contact*(touch.receive?.22:.08);
              leg.position.x=(rest?.x??side*.23)+(Math.max(-.22,Math.min(.22,localBall.x))-(rest?.x??side*.23))*contact*.65;
              leg.position.z=(rest?.z??0)+(leg.position.z-(rest?.z??0))*.3+Math.max(0,Math.min(.85,localBall.z-.30))*contact;
              leg.position.y+=contact*.045;
              if(touch.sole&&i===touch.foot){
                const w=touch.sole;leg.position.x+=(Math.max(-.3,Math.min(.3,localBall.x))-leg.position.x)*w;leg.position.z+=(Math.max(.3,Math.min(.68,localBall.z-.06))-leg.position.z)*w;leg.position.y+=(Math.max(.62,localBall.y+.3+.19)-leg.position.y)*w;leg.rotation.x+=(-Math.PI/2-leg.rotation.x)*w;leg.rotation.z*=1-w;
              }
            });
            const weight=Math.max(...touch.contacts);
            for(const node of [...new Set([crew.body,crew.pack,crew.visor,crew.shine,gear].filter(Boolean))])if(node){node.rotation.x+=.08-touch.receive*.14;node.position.y-=.02*weight+touch.receive*.035;node.rotation.z+=Math.cos(touch.phase)*.025+(touch.foot?1:-1)*touch.sole*.065;node.position.x-=(touch.foot?1:-1)*touch.sole*.055;}
            arms.forEach((arm,i)=>{arm.rotation.x=arm.rotation.x*.35+Math.sin(touch.phase+(i?Math.PI:0))*.12;});
          }
          if(sprint&&!motion&&!pressPose){
            for(const node of [...new Set([crew.body,crew.pack,crew.visor,crew.shine,gear].filter(Boolean))])if(node)node.rotation.x+=.16;
            arms.forEach((arm,i)=>{arm.rotation.x+=Math.sin(t/70+i*Math.PI)*.42;arm.rotation.z+=(i?-1:1)*.09;});
          }
          if(!motion&&!pressPose&&(threat||reaction)){
            const hit=reaction?Math.sin(Math.PI*Math.min(1,(t-reaction.contact.at)/600)):0,guard=threat?Math.max(0,1-threat.distance/2.3):0,side=threat?.side||reaction?.side||1;
            for(const node of [...new Set([crew.body,crew.pack,crew.visor,crew.shine,gear].filter(Boolean))])if(node){node.position.y-=guard*.055;node.rotation.z+=side*(guard*.12+hit*.14);node.rotation.x-=hit*.1;}
            crew.legs.forEach((leg,i)=>{leg.position.x+=(i?1:-1)*(guard*.055+hit*.035);leg.rotation.x+=(i?1:-1)*hit*.24;});
            arms.forEach((arm,i)=>{arm.rotation.z+=(i?-1:1)*(guard*.35+hit*.25);arm.rotation.x-=guard*.18;});
          }
        }
      }
    }
  }
  function updateCamera(dt,controls){
    if(!enabled||area()!=='soccer')return false;
    controls.enabled=false;player.root.visible=true;camera.up.set(0,1,0);
    const p=player.root.position,b=ballMesh.position,delta=new THREE.Vector3(b.x-p.x,0,b.z-p.z),distance=delta.length();
    if(distance>12)delta.multiplyScalar(12/distance);delta.multiplyScalar(.38);
    const focus=p.clone().add(delta);focus.y=p.y+.7;
    const aspect=Math.max(.4,camera.aspect),zoom=Math.max(1,Math.min(1.45,1/aspect)),height=(15+Math.min(distance,12)*.25)*zoom;
    const destination=new THREE.Vector3(focus.x,focus.y+height,focus.z+height*.72);
    if(soccerCamera==='side')destination.set(focus.x+height*.85,focus.y+height,focus.z);
    else if(soccerCamera==='third'){
      const yaw=player.root.rotation.y;focus.copy(p).add(new THREE.Vector3(Math.sin(yaw)*2,1.2,Math.cos(yaw)*2));
      destination.set(p.x-Math.sin(yaw)*7*zoom,p.y+4.8*zoom,p.z-Math.cos(yaw)*7*zoom);
    }
    camera.position.lerp(destination,!cameraChanged&&window.__lastLobbyCameraMode==='soccer'?1-Math.exp(-6*dt):1);cameraChanged=false;camera.lookAt(focus);
    // Keep the local player inside safe margins even when the ball is out of reach.
    camera.updateMatrixWorld();const projected=p.clone().add(new THREE.Vector3(0,1,0)).project(camera);
    if(Math.abs(projected.x)>.7||Math.abs(projected.y)>.65){camera.position.copy(destination);camera.lookAt(focus);}
    controls.target.copy(focus);return true;
  }
  function afterRender(){for(const [node,position,rotation]of poses){node.position.copy(position);node.rotation.copy(rotation);}poses=[];posedNodes.clear();for(const [root,visible]of hiddenRoots)root.visible=visible;hiddenRoots=[];if(savedFov!==null){camera.fov=savedFov;camera.updateProjectionMatrix();savedFov=null;}}
  return {updateCamera,backDribble,get area(){return enabled?area():'lobby';},get state(){return state;},roots,ballMesh,teamColor,canMove,groundAt,motionLocked,speedMultiplier,update,beforeRender,afterRender,exit};
}
/* LOBBY_GAMES_SCENE_END */
