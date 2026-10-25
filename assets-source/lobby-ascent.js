/* LOBBY_ASCENT_BEGIN */
function createLobbyAscent({THREE,scene,obstacles}){
  const root=new THREE.Group();root.name='lobby-sky-ascent';scene.add(root);
  // Fixed, shared layout. At normal lobby speed each gap is reachable with
  // the existing 9.2m/s jump; all missed jumps fall into the lounge below.
  const route=[
    [-4,10.3,.65],[-4,7.7,1.75],[-6.5,6.4,2.9],[-7.5,3.7,4.05],
    [-6.1,1.1,5.2],[-3.4,-.4,6.35],[-.4,-.8,7.5],[2.6,-.2,8.65],
    [5.3,1.2,9.8],[7.2,3.6,10.95],[7.1,6.6,12.1],[5.3,9.1,13.25],
    [2.5,10.4,14.4],[-.5,10.5,15.55],[-3.2,9.1,16.7],[-5.3,6.9,17.85],
    [-6.1,4,19],[-4.6,1.4,20.15],[-1.9,.1,21.3],[1.1,.4,22.45],
    [3.9,1.8,23.6],[5.4,4.4,24.75],[4.7,7.3,25.9],[2.2,8.9,27.05],
    [-.7,8.5,28.2],[-2.9,6.5,29.35],[-2.6,3.6,30.5],[0,2.4,31.65],
    [2.5,4,32.8],[1.5,6.7,34]
  ];
  const materials=[
    new THREE.MeshStandardMaterial({color:0x203c4c,roughness:.48,metalness:.6}),
    new THREE.MeshStandardMaterial({color:0x566f80,roughness:.33,metalness:.7}),
    new THREE.MeshStandardMaterial({color:0xd8b77c,roughness:.28,metalness:.72}),
    new THREE.MeshBasicMaterial({color:0x74e8e3,toneMapped:false}),
    new THREE.MeshStandardMaterial({color:0x0a1b29,roughness:.7,metalness:.2})
  ],batches=materials.map(()=>[]),cube=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
  function box(m,x,y,z,w,h,d){batches[m].push([x,y,z,w,h,d]);}
  route.forEach(([x,z,y],i)=>{
    const summit=i===route.length-1,w=summit?3.1:i<8?2.6:i%6===0?2.5:2.2,d=summit?3.1:i<8?2.6:2.2,h=i%3===0?.55:.24;
    obstacles.push({x,z,w,d,top:y,bottom:y-h,platform:true,ascent:true});
    box(0,x,y-h/2,z,w,h,d);
    box(4,x,y+.014,z,w-.18,.028,d-.18);
    // Flush inlaid panels and corner locks keep the entire top walkable.
    for(const side of[-1,1]){
      box(2,x+side*(w/2-.09),y-.07,z,.13,.14,d);
      box(3,x,y-.055,z+side*(d/2+.006),w-.4,.055,.025);
      for(const end of[-1,1])box(1,x+side*(w/2-.17),y+.026,z+end*(d/2-.17),.22,.05,.22);
    }
    if(i%3===1)for(let n=-2;n<=2;n++)box(1,x+n*.27,y+.033,z,.055,.025,d-.5);
    else if(i%3===2){box(1,x,y+.032,z,w-.55,.025,d-.55);box(3,x,y+.05,z,.055,.015,d-.7);}
  });
  for(let m=0;m<batches.length;m++){
    const list=batches[m],mesh=new THREE.InstancedMesh(cube,materials[m],list.length);
    list.forEach(([x,y,z,w,h,d],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(w,h,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.computeBoundingSphere();mesh.matrixAutoUpdate=false;mesh.updateMatrix();root.add(mesh);
  }
  const arrow=new THREE.Shape();arrow.moveTo(-.21,-.12);arrow.lineTo(0,.12);arrow.lineTo(.21,-.12);arrow.lineTo(0,.33);arrow.closePath();
  const arrows=new THREE.InstancedMesh(new THREE.ShapeGeometry(arrow),materials[3],route.length-1);
  for(let i=0;i<route.length-1;i++){
    const [x,z,y]=route[i],next=route[i+1],yaw=Math.atan2(next[0]-x,next[1]-z);
    dummy.position.set(x,y+.065,z);dummy.rotation.set(-Math.PI/2,0,Math.PI-yaw);dummy.scale.setScalar(1);dummy.updateMatrix();arrows.setMatrixAt(i,dummy.matrix);
  }
  arrows.computeBoundingSphere();root.add(arrows);
  function label(text,x,y,z,width){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#0a1b29';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#d8b77c';ctx.lineWidth=5;ctx.strokeRect(4,4,504,120);ctx.fillStyle='#e7f9f6';ctx.font='bold 48px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66,470);
    const map=new THREE.CanvasTexture(canvas),mat=new THREE.SpriteMaterial({map,depthWrite:false}),sprite=new THREE.Sprite(mat);sprite.position.set(x,y,z);sprite.scale.set(width,width/4,1);root.add(sprite);
  }
  label('上空アスレ',-4,2.3,10.3,2.5);
  const [gx,gz,gy]=route.at(-1);
  label('SUMMIT',gx,gy+2.8,gz,2.7);
  const trophy=new THREE.Group();trophy.position.set(gx,gy,gz);root.add(trophy);
  for(const [geo,y]of[[new THREE.CylinderGeometry(.48,.6,.15,12),.075],[new THREE.CylinderGeometry(.10,.16,.6,10),.45],[new THREE.CylinderGeometry(.43,.15,.5,12),.95]]){const mesh=new THREE.Mesh(geo,materials[2]);mesh.position.y=y;trophy.add(mesh);}
  const jewel=new THREE.Mesh(new THREE.OctahedronGeometry(.25),materials[3]);jewel.position.y=1.5;trophy.add(jewel);
  for(const side of[-1,1]){const handle=new THREE.Mesh(new THREE.TorusGeometry(.22,.045,6,16,Math.PI*1.5),materials[2]);handle.position.set(side*.38,.99,0);handle.rotation.z=side<0?Math.PI/4:-Math.PI*3/4;trophy.add(handle);}
  let reached=false,notice=null,noticeUntil=0;
  function update(position,stamp,name){
    if(position.y<1.5)reached=false;
    if(!reached&&Math.abs(position.y-gy)<.12&&Math.hypot(position.x-gx,position.z-gz)<1.25){reached=true;noticeUntil=stamp+3600;notice=document.createElement('div');notice.setAttribute('role','status');notice.style.cssText='position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:50;padding:16px 26px;border:1px solid #e6d09e;border-radius:18px;background:linear-gradient(140deg,#283f48,#10212d);color:#fff3c5;font:800 clamp(20px,4vw,34px) system-ui;box-shadow:0 12px 40px #0008;pointer-events:none;text-align:center';notice.textContent=(name||'クルー')+' 登頂！';document.body.append(notice);}
    if(notice&&stamp>=noticeUntil){notice.remove();notice=null;}
  }
  return{root,route,height:gy,update};
}
/* LOBBY_ASCENT_END */
