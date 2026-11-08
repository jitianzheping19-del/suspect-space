/* LOBBY_RACE_CAR_BEGIN */
function createLobbyRaceCar(THREE){
 const root=new THREE.Group();root.name='lobby-garage-race-car';
 const body=new THREE.Group();body.name='race-car-body';root.add(body);
 const paint=new THREE.MeshPhysicalMaterial({color:0x087f9e,metalness:.68,roughness:.25,clearcoat:1,clearcoatRoughness:.13});
 const dark=new THREE.MeshStandardMaterial({color:0x09151c,metalness:.25,roughness:.48});
 const gold=new THREE.MeshStandardMaterial({color:0xe0bb7f,metalness:.83,roughness:.26});
 const alloy=new THREE.MeshStandardMaterial({color:0xb5c6cf,metalness:.88,roughness:.28});
 const rubber=new THREE.MeshStandardMaterial({color:0x12171d,roughness:.92});
 const seatMat=new THREE.MeshStandardMaterial({color:0x172735,roughness:.83});
 const white=new THREE.MeshStandardMaterial({color:0xe9e5d7,metalness:.25,roughness:.34});
 const led=new THREE.MeshBasicMaterial({color:0xc8f9ff,toneMapped:false});
 const rearLed=new THREE.MeshBasicMaterial({color:0xff4a3c,toneMapped:false});
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#141d24';ctx.fillRect(0,0,64,64);for(let y=0;y<64;y+=8)for(let x=0;x<64;x+=8){ctx.fillStyle=(x+y)%16?'#26333b':'#0d171e';ctx.fillRect(x,y,7,4);ctx.fillStyle='#39454b';ctx.fillRect(x,y,1,4);}
 const weave=new THREE.CanvasTexture(canvas);weave.colorSpace=THREE.SRGBColorSpace;weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(5,5);
 const carbon=new THREE.MeshPhysicalMaterial({color:0x778a94,map:weave,metalness:.35,roughness:.38,clearcoat:.45});
 const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,24,12);
 const mesh=(geo,mat,x=0,y=0,z=0,parent=body)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;};
 const box=(mat,x,y,z,w,h,d,parent=body)=>{const m=mesh(boxGeo,mat,x,y,z,parent);m.scale.set(w,h,d);return m;};
 const oval=(mat,x,y,z,w,h,d,parent=body)=>{const m=mesh(sphereGeo,mat,x,y,z,parent);m.scale.set(w,h,d);return m;};
 const tube=(points,mat,r=.015,parent=body)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(16,points.length*6),r,6,false),mat,0,0,0,parent);
 // Smooth longitudinal sections give the monocoque a tapered nose and shoulders.
 function loft(rows,mat,parent=body){
  const vertices=[],uv=[],indices=[],steps=24;
  rows.forEach(([z,width,center,height],i)=>{for(let j=0;j<=steps;j++){const a=j/steps*Math.PI*2;vertices.push(Math.cos(a)*width,center+Math.sin(a)*height,z);uv.push(j/steps,i/(rows.length-1));}});
  for(let i=0;i<rows.length-1;i++)for(let j=0;j<steps;j++){const a=i*(steps+1)+j,b=a+steps+1;indices.push(a,a+1,b,a+1,b+1,b);}
  for(const i of [0,rows.length-1]){const center=vertices.length/3;vertices.push(0,rows[i][2],rows[i][0]);uv.push(.5,.5);for(let j=0;j<steps;j++){const a=i*(steps+1)+j;indices.push(...(i?[center,a,a+1]:[center,a+1,a]));}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return mesh(g,mat,0,0,0,parent);
 }
 const shellRows=[[-1.59,.57,.4,.14],[-1.4,.75,.45,.22],[-.92,.79,.47,.23],[-.3,.66,.42,.19],[.34,.65,.43,.2],[.85,.73,.47,.23],[1.32,.65,.4,.19],[1.63,.43,.33,.095]];
 loft(shellRows,paint);
 function surfacePatch(x1,x2,z1,z2,mat){
  const p=[],uv=[],index=[],nx=8,nz=24;
  for(let i=0;i<=nz;i++){const z=z1+(z2-z1)*i/nz,at=Math.max(1,shellRows.findIndex(r=>r[0]>=z)),a=shellRows[at-1],b=shellRows[at],t=(z-a[0])/(b[0]-a[0]),width=a[1]+(b[1]-a[1])*t,center=a[2]+(b[2]-a[2])*t,height=a[3]+(b[3]-a[3])*t;
   for(let j=0;j<=nx;j++){const x=x1+(x2-x1)*j/nx;p.push(x,center+height*Math.sqrt(Math.max(0,1-(x/width)**2))+.009,z);uv.push(j/nx,1-i/nz);if(i<nz&&j<nx){const n=i*(nx+1)+j;index.push(n,n+nx+1,n+1,n+1,n+nx+1,n+nx+2);}}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();mesh(g,mat);
 }
 loft([[-1.65,.67,.25,.04],[-1.3,.82,.24,.04],[.6,.74,.24,.045],[1.45,.77,.23,.04],[1.7,.53,.25,.025]],carbon);
 for(const side of [-1,1]){
  for(const z of [-1.04,1.02])oval(paint,side*.64,.57,z,.3,.235,.59);
  loft([[-.88,.13,.54,.14],[-.3,.13,.56,.19],[.25,.11,.53,.15],[.7,.09,.52,.09]],paint).position.x=side*.58;
  box(carbon,side*.72,.27,-.05,.13,.11,1.55);
  tube([[side*.75,.34,-.94],[side*.75,.34,.2],[side*.7,.35,.86]],gold,.011);
  // Recessed side intakes and individual cooling vanes.
  oval(dark,side*.753,.49,-.38,.018,.105,.35);
  for(let i=0;i<5;i++)box(alloy,side*.776,.5,-.6+i*.105,.013,.115,.018).rotation.x=-.2;
  for(let i=0;i<4;i++){const z=-1.22+i*.105,y=.57+.235*Math.sqrt(1-((z+1.04)/.59)**2);box(carbon,side*.63,y+.009,z,.21,.012,.03);}
  tube([[side*.55,.75,1.43],[side*.64,.8,1.29],[side*.66,.815,1.1]],dark,.041);
  for(const offset of [-.018,.018])tube([[side*(.55+offset),.765,1.43],[side*(.64+offset),.816,1.29],[side*(.66+offset),.832,1.1]],led,.009);
  surfacePatch(side*.16-.035,side*.16+.035,.73,1.52,white);
  surfacePatch(side*.16-.006,side*.16+.006,.73,1.52,gold);
  tube([[side*.08,.7,-.88],[side*.12,.66,-1.37]],white,.043);
  const mirror=oval(carbon,side*.85,.84,.25,.11,.055,.16);mirror.rotation.y=side*.3;
  tube([[side*.61,.65,.12],[side*.76,.8,.2],[side*.83,.83,.22]],gold,.018);
  oval(alloy,side*.85,.84,.135,.075,.038,.009);
 }
 // Open cockpit, contoured seat, harness and a curved low windscreen.
 oval(carbon,0,.61,-.17,.49,.105,.63);oval(seatMat,0,.67,-.28,.34,.12,.38);
 oval(seatMat,0,.96,-.61,.35,.36,.12);oval(carbon,0,1.22,-.69,.21,.16,.095);
 for(const side of [-1,1]){oval(seatMat,side*.3,.9,-.51,.095,.27,.2);tube([[side*.13,1.19,-.49],[side*.13,.92,-.45],[side*.1,.72,-.1]],gold,.028);}
 box(alloy,0,.77,-.15,.1,.065,.05);
 const glassMat=new THREE.MeshPhysicalMaterial({color:0x98dce9,metalness:.2,roughness:.12,transparent:true,opacity:.46,clearcoat:1,side:THREE.DoubleSide,depthWrite:false});
 const windshield=new THREE.BufferGeometry(),wp=[],wi=[];
 for(let i=0;i<=24;i++){const x=(i/24-.5)*.98,z=.48-.18*(x/.49)**2;wp.push(x,.71,z,x,.99-.09*Math.abs(x/.49),z-.13);if(i<24){const n=i*2;wi.push(n,n+2,n+1,n+1,n+2,n+3);}}
 windshield.setAttribute('position',new THREE.Float32BufferAttribute(wp,3));windshield.setIndex(wi);windshield.computeVertexNormals();mesh(windshield,glassMat);
 tube([[-.49,.71,.3],[-.49,.9,.17],[0,.99,.35],[.49,.9,.17],[.49,.71,.3]],carbon,.018);
 const steering=new THREE.Group();steering.name='race-steering';steering.position.set(0,.98,.12);steering.rotation.x=-.38;root.add(steering);
 tube([[-.2,-.09,0],[-.23,.06,0],[-.15,.18,0],[.15,.18,0],[.23,.06,0],[.2,-.09,0],[-.2,-.09,0]],rubber,.028,steering);
 box(carbon,0,.035,0,.29,.11,.035,steering);box(alloy,0,-.06,0,.035,.15,.035,steering);
 for(const side of [-1,1])oval(side===1?rearLed:led,side*.1,.045,.024,.018,.018,.01,steering);
 box(dark,0,.88,.36,.39,.15,.04);box(led,0,.89,.388,.27,.065,.012);
 // Swan-neck wing, diffuser, central rain light and polished exhausts.
 for(const side of [-1,1]){
  tube([[side*.4,.65,-1.18],[side*.4,.92,-1.09],[side*.4,1.25,-1.3]],carbon,.035);
  box(carbon,side*.89,1.24,-1.31,.035,.28,.55);
  tube([[side*.89,1.38,-1.55],[side*.89,1.38,-1.1]],gold,.009);
  const pipe=mesh(new THREE.CylinderGeometry(.075,.075,.21,18,1,true),alloy,side*.24,.4,-1.58);pipe.rotation.x=Math.PI/2;
  mesh(new THREE.CircleGeometry(.06,18),dark,side*.24,.4,-1.69).rotation.y=Math.PI;
 }
 const wing=box(carbon,0,1.24,-1.3,1.8,.065,.44);wing.rotation.x=-.12;
 box(gold,0,1.28,-1.51,1.75,.018,.025);
 tube([[-.62,.58,-1.5],[0,.56,-1.59],[.62,.58,-1.5]],rearLed,.022);
 box(rearLed,0,.36,-1.665,.08,.08,.015);
 for(let i=0;i<7;i++)box(carbon,(i-3)*.19,.26,-1.49,.025,.16,.39).rotation.x=.14;
 // Independently steered and rotating wheels; all four share their buffers.
 const tireGeo=new THREE.LatheGeometry([new THREE.Vector2(.22,-.125),new THREE.Vector2(.29,-.125),new THREE.Vector2(.345,-.085),new THREE.Vector2(.35,.075),new THREE.Vector2(.29,.125),new THREE.Vector2(.22,.125)],40);
 const diskGeo=new THREE.CylinderGeometry(.215,.215,.018,32),hubGeo=new THREE.CylinderGeometry(.075,.075,.09,16),grooveGeo=new THREE.TorusGeometry(.35,.004,4,40);
 for(const side of [-1,1])for(const z of [-1.04,1.02]){
  const pivot=new THREE.Group();pivot.name=z>0?'race-wheel-front':'race-wheel-rear';pivot.position.set(side*.77,.35,z);root.add(pivot);
  const spin=new THREE.Group();spin.name='race-wheel-spin';pivot.add(spin);
  mesh(tireGeo,rubber,0,0,0,spin).rotation.z=Math.PI/2;
  for(const offset of [-.055,0,.055])mesh(grooveGeo,dark,offset,0,0,spin).rotation.y=Math.PI/2;
  mesh(diskGeo,alloy,side*.1,0,0,spin).rotation.z=Math.PI/2;
  mesh(hubGeo,gold,side*.13,0,0,spin).rotation.z=Math.PI/2;
  for(let i=0;i<10;i++){const a=i*Math.PI/5,r=.145;const spoke=box(alloy,side*.145,Math.cos(a)*r,Math.sin(a)*r,.035,.17,.032,spin);spoke.rotation.x=a;}
  mesh(new THREE.TorusGeometry(.245,.012,6,32),gold,side*.145,0,0,spin).rotation.y=Math.PI/2;
  box(rearLed,side*.075,.02,.18,.055,.17,.07,pivot);
 }
 const decalCanvas=document.createElement('canvas');decalCanvas.width=512;decalCanvas.height=256;const d=decalCanvas.getContext('2d');d.fillStyle='#f4ebd7';d.font='italic 900 125px sans-serif';d.textAlign='center';d.fillText('07',256,132);d.font='600 30px sans-serif';d.fillText('A S T R A   G T',256,188);d.fillStyle='#e3b978';d.fillRect(100,212,312,5);
 const decal=new THREE.CanvasTexture(decalCanvas);decal.colorSpace=THREE.SRGBColorSpace;
 surfacePatch(-.12,.12,.85,1.1,new THREE.MeshBasicMaterial({map:decal,transparent:true,depthWrite:false}));
 // Batch stationary opaque parts by material, preserving only the moving rigs.
 body.updateMatrixWorld(true);const groups=new Map();body.traverse(n=>{if(n.isMesh&&!n.material.transparent){if(!groups.has(n.material))groups.set(n.material,[]);groups.get(n.material).push(n);}});
 for(const [mat,nodes]of groups){if(nodes.length<2)continue;const attrs={position:[],normal:[],uv:[]};for(const n of nodes){const g=(n.geometry.index?n.geometry.toNonIndexed():n.geometry.clone()).applyMatrix4(n.matrixWorld);for(const key of Object.keys(attrs)){const a=g.getAttribute(key);attrs[key].push(a?Array.from(a.array):new Array(g.getAttribute('position').count*2).fill(0));}g.dispose();n.removeFromParent();}const g=new THREE.BufferGeometry();for(const key of Object.keys(attrs))g.setAttribute(key,new THREE.Float32BufferAttribute(attrs[key].flat(),key==='uv'?2:3));mesh(g,mat);}
 return root;
}

function lobbyCarOverlaps(x,z,yaw,halfWidth,halfLength,box,pad=0){
 const c=Math.cos(yaw),s=Math.sin(yaw),dx=box.x-x,dz=box.z-z,w=box.w/2+pad,d=box.d/2+pad;
 return Math.abs(dx*c-dz*s)<halfWidth+w*Math.abs(c)+d*Math.abs(s)&&Math.abs(dx*s+dz*c)<halfLength+w*Math.abs(s)+d*Math.abs(c)&&Math.abs(dx)<w+halfWidth*Math.abs(c)+halfLength*Math.abs(s)&&Math.abs(dz)<d+halfWidth*Math.abs(s)+halfLength*Math.abs(c);
}

function installLobbyRaceCar({THREE,scene,garage,parked,obstacles,parkedObstacle,player,camera,controls,rows,crews,self,groundAt,locked,clearInput}){
 const parking={x:0,y:.06,z:.15},parkingYaw=0,template=parked.clone(true),remote=new Map();
 let riding=false,speed=0,steer=0,verticalSpeed=0,actionKey='',lastSent=-Infinity,cameraWasDriving=false,disposed=false;
 const halfWidth=.91,halfLength=1.72;
 const hud=document.createElement('div');hud.id='lobbyRaceCarHud';hud.hidden=true;hud.style.cssText='position:fixed;left:50%;top:max(12px,env(safe-area-inset-top));transform:translateX(-50%);padding:8px 14px;border:1px solid #8ac7d26b;border-radius:12px;background:#091b29e8;color:#e8faff;font:700 13px system-ui;text-align:center;pointer-events:none;z-index:20';document.body.append(hud);
 const rig=root=>({root,wheels:root.children.filter(n=>n.name.startsWith('race-wheel-')),wheel:root.getObjectByName('race-steering'),previous:null,phase:0});
 const ownRig=rig(parked),outPosition=new THREE.Vector3(),camTarget=new THREE.Vector3();
 const others=()=>[...rows()].filter(([id,p])=>id!==self()&&p.online!==false&&p.lobbyVehicle===true);
 const parkedVisible=()=>!riding&&others().length===0;
 function setCollider(visible){const i=obstacles.indexOf(parkedObstacle);if(visible&&i<0)obstacles.push(parkedObstacle);if(!visible&&i>=0)obstacles.splice(i,1);}
 function near(){const p=player.root.position;return parkedVisible()&&p.x> -8.3&&p.z>10.4&&Math.hypot(p.x+9.45,p.z-11.95)<3&&p.y<.5&&!locked();}
 function announce(notice){const state={near:near(),riding},key=JSON.stringify(state);if(key!==actionKey||notice){actionKey=key;parent.postMessage({type:'lobby-car-state',...state,...(notice?{notice}:{})},'*');}}
 function send(force=false){const time=performance.now();if(!force&&time-lastSent<1000/60)return;lastSent=time;const p=player.root.position;parent.postMessage({type:'lobby-position',gameArea:'lobby',x:p.x,z:p.z,lobbyY:Math.max(0,p.y),yaw:player.root.rotation.y,walking:riding&&Math.abs(speed)>.08,lobbyVehicle:riding},'*');}
 function canOccupy(x,z,y,yaw){
  const c=Math.abs(Math.cos(yaw)),s=Math.abs(Math.sin(yaw)),rx=c*halfWidth+s*halfLength,rz=s*halfWidth+c*halfLength;
  if(x-rx< -11.85||x+rx>11.85||z-rz< -5.8||z+rz>13.85)return false;
  if(lobbyCarOverlaps(x,z,yaw,halfWidth,halfLength,{x:7.8,z:8.45,w:5.8,d:5.65}))return false;
  for(const o of obstacles){if(o===parkedObstacle)continue;if(Number.isFinite(o.top)&&y>=o.top+.025)continue;if(lobbyCarOverlaps(x,z,yaw,halfWidth,halfLength,o,.025))return false;}
  for(const [id,p]of rows()){if(id===self()||p.online===false||Math.abs((p.lobbyY||0)-y)>1.7)continue;if(lobbyCarOverlaps(x,z,yaw,halfWidth,halfLength,{x:Number(p.x)||0,z:Number(p.z)||0,w:p.lobbyVehicle?1.8:.85,d:p.lobbyVehicle?3.4:.85},.06))return false;}
  return true;
 }
 function freeExit(force){
  const p=player.root.position,yaw=player.root.rotation.y;
  for(const radius of [1.7,2.2,2.8,3.5])for(const offset of [Math.PI/2,-Math.PI/2,Math.PI,0,Math.PI/4,-Math.PI/4]){
   const x=p.x+Math.sin(yaw+offset)*radius,z=p.z+Math.cos(yaw+offset)*radius;
   if(x< -11.3||x>11.3||z< -5.2||z>13.2||Math.abs(x-7.8)<3.25&&Math.abs(z-8.45)<3.2)continue;
   if([...obstacles,parkedObstacle].some(o=>Math.abs(x-o.x)<o.w/2+.5&&Math.abs(z-o.z)<o.d/2+.5))continue;
   if([...rows()].some(([id,q])=>id!==self()&&q.online!==false&&Math.hypot(x-q.x,z-q.z)<1.1))continue;
   return {x,y:0,z};
  }
  return force?{x:-6.9,y:0,z:9}:null;
 }
 function leave(force=false,notify=true){
  if(!riding)return true;
  if(!force&&player.root.position.y>groundAt(player.root.position.x,player.root.position.z,player.root.position.y+.05)+.08){announce('airborne');return false;}
  const exit=freeExit(force);if(!exit){announce('blocked');return false;}
  riding=false;speed=steer=verticalSpeed=0;clearInput();player.root.position.set(exit.x,exit.y,exit.z);player.root.userData.lobbyHeightInitialized=true;
  garage.add(parked);parked.position.set(parking.x,parking.y,parking.z);parked.rotation.set(0,parkingYaw,0);parked.updateMatrix();setCollider(parkedVisible());hud.hidden=true;
  if(cameraWasDriving){controls.target.copy(player.root.position);camera.position.set(player.root.position.x+7,player.root.position.y+9,player.root.position.z+11);cameraWasDriving=false;window.__lastLobbyCameraMode=null;}
  if(notify)send(true);announce();return true;
 }
 function toggle(){
  if(riding)return leave();if(!near()){announce('occupied');return false;}
  parked.getWorldPosition(outPosition);const yaw=Math.PI/2;
  if(!canOccupy(outPosition.x,outPosition.z,0,yaw)){announce('blocked');return false;}
  clearInput();riding=true;speed=steer=verticalSpeed=0;scene.add(parked);parked.matrixAutoUpdate=true;player.root.position.set(outPosition.x,0,outPosition.z);player.root.rotation.y=yaw;player.root.userData.lobbyHeightInitialized=true;
  const state=rows().get(self());if(state){state.seated=false;state.sitting=false;state.seatId=null;}setCollider(false);send(true);announce();return true;
 }
 function jump(){if(!riding)return false;if(locked())return true;const p=player.root.position,support=groundAt(p.x,p.z,p.y+.05);if(Math.abs(verticalSpeed)<.01&&p.y<=support+.06)verticalSpeed=8.2;return true;}
 function tick(dt,input){
  if(!riding){announce();return false;}
  dt=Math.max(0,Math.min(.05,dt));const p=player.root.position;
  if(others().some(([id])=>self()&&id.localeCompare(self())<0)){leave(true);return true;}
  const stopped=locked()||document.hidden,throttle=stopped?0:Math.max(-1,Math.min(1,input.forward)),turn=stopped?0:Math.max(-1,Math.min(1,input.turn));
  steer+=(turn*.5-steer)*(1-Math.exp(-9*dt));
  const desired=throttle*(throttle<0?3.2:8.5),acceleration=throttle===0||Math.sign(desired)!==Math.sign(speed)?12:5.8;
  speed+=Math.max(-acceleration*dt,Math.min(acceleration*dt,desired-speed));if(stopped)speed=0;
  const count=Math.max(1,Math.ceil(Math.max(Math.abs(speed)*dt,Math.abs(steer)*dt*3)/.06)),step=dt/count;
  for(let i=0;i<count;i++){
   const previousY=p.y,support=groundAt(p.x,p.z,p.y+.05);if(verticalSpeed||p.y>support+.015){verticalSpeed-=18*step;p.y+=verticalSpeed*step;}else p.y=support;
   const floor=groundAt(p.x,p.z,previousY+.05);if(p.y<=floor&&verticalSpeed<=0){p.y=floor;verticalSpeed=0;}
   if(p.x< -7.5&&p.z>10.35&&p.z<13.55&&p.y>.78){p.y=.78;verticalSpeed=Math.min(0,verticalSpeed);}
   const yaw=player.root.rotation.y-steer*Math.min(1.6,Math.abs(speed)*.5)*Math.sign(speed||1)*step;
   if(canOccupy(p.x,p.z,p.y,yaw))player.root.rotation.y=yaw;
   const nx=p.x+Math.sin(player.root.rotation.y)*speed*step,nz=p.z+Math.cos(player.root.rotation.y)*speed*step;
   if(canOccupy(nx,nz,p.y,player.root.rotation.y)){p.x=nx;p.z=nz;}else speed=0;
  }
  send();announce();hud.hidden=false;hud.textContent='ASTRA GT  ·  '+Math.round(Math.abs(speed)*3.6)+' km/h  ·  '+(p.y>.1?'ジャンプ中':'ジャンプで跳ぶ');return true;
 }
 function updateRig(r,dt,driveSpeed,turn,height){
  r.phase+=driveSpeed*dt/.35;for(const wheel of r.wheels){wheel.rotation.y=wheel.name==='race-wheel-front'?-turn:0;wheel.getObjectByName('race-wheel-spin').rotation.x=r.phase;}
  if(r.wheel)r.wheel.rotation.z=turn*1.1;
 }
 function visuals(dt){
  const active=others(),wanted=new Set(active.map(([id])=>id));setCollider(parkedVisible());
  parked.visible=riding||active.length===0;
  if(riding){parked.position.copy(player.root.position);parked.rotation.set(Math.max(-.09,Math.min(.09,-verticalSpeed*.009)),player.root.rotation.y,steer*speed*.012,'YXZ');updateRig(ownRig,dt,speed,steer,player.root.position.y);}
  for(const [id,p]of active){const crew=crews().get(id);if(!crew||!crew.root.visible)continue;let r=remote.get(id);if(!r){r=rig(template.clone(true));r.root.name='remote-race-car-'+id;scene.add(r.root);remote.set(id,r);}r.root.visible=true;r.root.position.copy(crew.root.position);r.root.rotation.set(0,crew.root.rotation.y,0);const previous=r.previous,distance=previous?Math.hypot(r.root.position.x-previous.x,r.root.position.z-previous.z):0;updateRig(r,dt,Math.min(10,distance/Math.max(.001,dt)),0,r.root.position.y);r.previous={x:r.root.position.x,z:r.root.position.z};}
  for(const [id,r]of remote)if(!wanted.has(id)||!crews().has(id)){r.root.removeFromParent();remote.delete(id);}
 }
 function beforeRender(){
  const saved=[];for(const [id,crew]of [[self(),player],...crews()]){
   if(crew===player?!riding:rows().get(id)?.lobbyVehicle!==true)continue;
   const save=n=>{if(!n)return;saved.push([n,n.position.clone(),n.rotation.clone(),n.scale.clone()]);};
   save(crew.root);crew.root.position.y-=.08;
   for(const leg of crew.legs){save(leg);leg.position.set(leg.position.x,.57,.27);leg.rotation.set(-1.2,0,0);}
   for(const [i,arm]of (crew.arms||crew.root.userData.walkArms||[]).entries()){save(arm);arm.rotation.set(-1.18,0,(i?1:-1)*.18);}
  }
  return()=>{for(const [n,p,r,s]of saved){n.position.copy(p);n.rotation.copy(r);n.scale.copy(s);}};
 }
 function updateCamera(dt){
  if(!riding)return false;controls.enabled=false;player.root.visible=true;const p=player.root.position,yaw=player.root.rotation.y;
  const first=window.__lobbyCameraPerspective==='first',overhead=window.__lobbyCameraPerspective==='overhead';
  const inGarage=p.x< -7.4&&p.z>10.35&&p.z<13.55;
  outPosition.set(p.x-Math.sin(yaw)*(first?-.05:overhead?3.5:6.4),p.y+(first?1.45:overhead?10:inGarage?1.9:3.5),p.z-Math.cos(yaw)*(first?-.05:overhead?3.5:6.4));
  // Keep the chase camera inside the lounge wall, including at the garage.
  outPosition.x=Math.max(-11.32,Math.min(11.65,outPosition.x));outPosition.z=Math.max(-5.6,Math.min(13.65,outPosition.z));
  camera.position.lerp(outPosition,cameraWasDriving?1-Math.exp(-7*dt):1);camTarget.set(p.x+Math.sin(yaw)*1.9,p.y+.8,p.z+Math.cos(yaw)*1.9);camera.up.set(0,1,0);camera.lookAt(camTarget);player.root.visible=!first;cameraWasDriving=true;return true;
 }
 function onMessage(event){if(event.source!==parent)return;const d=event.data;if(d?.type==='lobby-car-toggle')toggle();if(['lobby-reset','lobby-return-reset'].includes(d?.type)||d?.type==='lobby-render-state'&&!d.active){const p=player.root.position.clone();leave(true,false);player.root.position.copy(p);hud.hidden=true;for(const r of remote.values())r.root.removeFromParent();remote.clear();actionKey='';}}
 const pause=()=>{speed=0;clearInput();};window.addEventListener('message',onMessage);window.addEventListener('blur',pause);document.addEventListener('visibilitychange',pause);
 return{tick,jump,toggle,leave,near,visuals,beforeRender,updateCamera,canOccupy,get riding(){return riding;},get speed(){return speed;},dispose(){if(disposed)return;disposed=true;leave(true,false);window.removeEventListener('message',onMessage);window.removeEventListener('blur',pause);document.removeEventListener('visibilitychange',pause);hud.remove();for(const r of remote.values())r.root.removeFromParent();remote.clear();}};
}
/* LOBBY_RACE_CAR_END */
