/* LOBBY_ASCENT_BEGIN */
function createLobbyAscent({THREE,scene,obstacles}){
  const root=new THREE.Group();root.name='lobby-sky-ascent';scene.add(root);
  // Shared switchbacks, straight catwalks and crossing routes at different
  // heights. Every platform retains a solid rectangular landing surface.
  const route=[
    [-4.7,11,.65],[-4.7,7.6,1.75],[-1.3,7.6,2.9],[2.1,7.6,4.05],
    [5.5,7.6,5.2],[7.5,4.5,6.35],[4.1,3,7.5],[.7,3,8.65],
    [-2.7,3,9.8],[-6.1,1,10.95],[-6.1,-2,12.1],[-2.6,-2,13.25],
    [.9,-2,14.4],[4.4,-2,15.55],[7.2,.1,16.7],[7.2,3.5,17.85],
    [7.2,7,19],[5.2,10,20.15],[1.7,10,21.3],[-1.8,10,22.45],
    [-5.2,8,23.6],[-7.5,5.2,24.75],[-4.2,4,25.9],[-.8,4,27.05],
    [2.6,4,28.2],[4.8,1,29.35],[1.4,.1,30.5],[-2,.1,31.65],
    [-3.8,3.5,32.8],[-1,6,34]
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
    const summit=i===route.length-1,type=i%6,alongX=i<route.length-1&&Math.abs(route[i+1][0]-x)>Math.abs(route[i+1][1]-z);
    const w=summit?3.6:type===2?(alongX?3.6:2.2):i<8?3.1:2.8,d=summit?3.6:type===2?(alongX?2.2:3.6):i<8?3.0:2.8,h=type===0?1.05:type===4?.7:.24;
    obstacles.push({x,z,w,d,top:y,bottom:y-h,platform:true,ascent:true});
    box(0,x,y-h/2,z,w,h,d);
    box(4,x,y+.014,z,w-.18,.028,d-.18);
    // Flush inlaid panels and corner locks keep the entire top walkable.
    for(const side of[-1,1]){
      box(2,x+side*(w/2-.09),y-.07,z,.13,.14,d);
      box(3,x,y-.055,z+side*(d/2+.006),w-.4,.055,.025);
      for(const end of[-1,1])box(1,x+side*(w/2-.17),y+.026,z+end*(d/2-.17),.22,.05,.22);
    }
    if(type===0){ // Cargo container, reinforced ribs and broad landing deck.
      for(const side of[-1,1])for(let n=-2;n<=2;n++)box(1,x+n*.42,y-h*.5,z+side*d/2,.10,h*.78,.045);
      for(const side of[-1,1])box(2,x+side*w*.27,y+.04,z,.13,.055,d-.35);
    }else if(type===1){ // Solar collection panel: flush grid, no hidden gaps.
      box(1,x,y+.034,z,w-.4,.025,d-.4);
      for(let c=-2;c<=2;c++)for(let r=-2;r<=2;r++){box(0,x+c*(w-.6)/5,y+.05,z+r*(d-.6)/5,(w-.75)/5,.018,(d-.75)/5);box(3,x+c*(w-.6)/5,y+.062,z+r*(d-.6)/5,(w-.85)/5,.008,.018);}
    }else if(type===2){ // Narrow catwalk with inset transverse treads.
      for(let n=-3;n<=3;n++)box(1,x+(alongX?n*.42:0),y+.036,z+(alongX?0:n*.42),alongX?.08:w-.3,.025,alongX?d-.3:.08);
      box(2,x,y+.055,z,alongX?w-.4:.08,.02,alongX?.08:d-.4);
    }else if(type===3){ // Engine maintenance deck and underslung exhaust ribs.
      for(let n=-2;n<=2;n++){box(1,x+n*.35,y-.13,z,.17,.25,d-.45);box(3,x+n*.35,y+.045,z,.08,.025,d-.6);}
    }else if(type===4){ // Palletized stores, recessed corners and cargo strapping.
      for(const side of[-1,1]){box(2,x+side*w*.24,y-h*.48,z,.12,h*.98,d+.025);box(1,x,y+.036,z+side*d*.24,w-.3,.03,.12);}
      box(3,x,y+.055,z,w*.42,.025,.055);
    }else{ // Broad transfer junction with a luminous four-way inlay.
      box(1,x,y+.032,z,w-.55,.025,d-.55);box(3,x,y+.05,z,.065,.018,d-.75);box(3,x,y+.05,z,w-.75,.018,.065);
      for(const side of[-1,1])box(2,x+side*w*.32,y+.055,z+side*d*.32,.24,.035,.24);
    }
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
  label('上空アスレ',route[0][0],2.3,route[0][1],2.5);
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
