/* LOBBY_ASCENT_BEGIN */
function createLobbyAscent({THREE,scene,obstacles}){
  const root=new THREE.Group();root.name='lobby-sky-ascent';scene.add(root);
  const route=[
    [-4.7,11,.65],[-4.7,7.6,1.75],[-1.3,7.6,2.9],[2.1,7.6,4.05],
    [5.5,7.6,5.2],[7.5,4.5,6.35],[4.1,3,7.5],[.7,3,8.65],
    [-2.7,3,9.8],[-6.1,1,10.95],[-6.1,-2,12.1],[-2.6,-2,13.25],
    [.9,-2,14.4],[4.4,-2,15.55],[7.2,.1,16.7],[7.2,3.5,17.85],
    [7.2,7,19],[5.2,10,20.15],[1.7,10,21.3],[-1.8,10,22.45],
    [-5.2,8,23.6],[-7.5,5.2,24.75],[-4.2,4,25.9],[-.8,4,27.05],
    [2.6,4,28.2],[4.8,1,29.35],[1.4,.1,30.5],[-2,.1,31.65],
    [-3.8,3.5,32.8],[-1,6,34]
  ].map(([x,z,y])=>[x*1.1,4+(z-4)*1.1,y]);
  const materials=[
    new THREE.MeshStandardMaterial({color:0x203c4c,roughness:.48,metalness:.6}),
    new THREE.MeshStandardMaterial({color:0x566f80,roughness:.33,metalness:.7}),
    new THREE.MeshStandardMaterial({color:0xd8b77c,roughness:.28,metalness:.72}),
    new THREE.MeshBasicMaterial({color:0x74e8e3,toneMapped:false}),
    new THREE.MeshStandardMaterial({color:0x0a1b29,roughness:.7,metalness:.2}),
    new THREE.MeshStandardMaterial({color:0xb66b3c,roughness:.45,metalness:.48}),
    new THREE.MeshStandardMaterial({color:0x294e86,roughness:.28,metalness:.65}),
    new THREE.MeshStandardMaterial({color:0xc6d0cc,roughness:.35,metalness:.62})
  ];
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,28),ring:new THREE.TorusGeometry(1,.025,6,48)},batches=new Map(),dummy=new THREE.Object3D();
  const regular=(n,r)=>Array.from({length:n},(_,i)=>[Math.sin(i*Math.PI*2/n)*r,Math.cos(i*Math.PI*2/n)*r]);
  const polygons={
    hex:regular(6,1.6),triangle:[[-1.8,1.25],[1.8,1.25],[0,-1.7]],
    gear:Array.from({length:32},(_,i)=>{const a=i*Math.PI/16,r=i%4<2?1.65:1.3;return[Math.sin(a)*r,Math.cos(a)*r];}),
    h:[[-1.5,-1.3],[-.5,-1.3],[-.5,-.4],[.5,-.4],[.5,-1.3],[1.5,-1.3],[1.5,1.3],[.5,1.3],[.5,.4],[-.5,.4],[-.5,1.3],[-1.5,1.3]],
    cross:[[-.6,-1.6],[.6,-1.6],[.6,-.6],[1.6,-.6],[1.6,.6],[.6,.6],[.6,1.6],[-.6,1.6],[-.6,.6],[-1.6,.6],[-1.6,-.6],[-.6,-.6]]
  };
  function polygonGeometry(kind){if(geometries[kind])return;const points=polygons[kind],shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();const geometry=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);geometry.translate(0,-1,0);geometries[kind]=geometry;}
  function add(kind,m,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const key=kind+':'+m;let batch=batches.get(key);if(!batch){batch={kind,m,poses:[]};batches.set(key,batch);}batch.poses.push([x,y,z,sx,sy,sz,rx,ry,rz]);}
  function box(m,x,y,z,w,h,d){add('box',m,x,y,z,w,h,d);}
  const segments={0:'abcedf',1:'bc',2:'abged',3:'abgcd',4:'fgbc',5:'afgcd',6:'afgecd',7:'abc',8:'abcdefg',9:'abfgcd'};
  const bars={a:[0,-.2,.19,.035],b:[.1,-.1,.035,.17],c:[.1,.1,.035,.17],d:[0,.2,.19,.035],e:[-.1,.1,.035,.17],f:[-.1,-.1,.035,.17],g:[0,0,.19,.035]};
  function number(value,x,y,z){const chars=String(value);for(let i=0;i<chars.length;i++)for(const key of segments[chars[i]]){const[dx,dz,w,d]=bars[key];box(3,x+(i-(chars.length-1)/2)*.28+dx,y+.08,z-.13+dz,w,.014,d);}}
  const arrowOrigins=[];
  route.forEach(([x,z,y],i)=>{
    const summit=i===route.length-1,type=i%10,next=route[i+1],alongX=next&&Math.abs(next[0]-x)>Math.abs(next[1]-z);
    let w=3,d=2.6,h=1,shape='rect',radius=0;
    if(summit){w=d=3.6;h=.55;}
    else if(type===1){shape='circle';radius=1.3;w=d=2.6;h=1.25;}
    else if(type===2){w=alongX?4.2:1.35;d=alongX?1.35:4.2;h=.38;}
    else if(type===3){shape='hex';w=d=3.2;h=.48;}
    else if(type===4){w=3.5;d=2.25;h=1.05;}
    else if(type===5){shape='h';w=3;d=2.6;h=.34;}
    else if(type===6){shape='triangle';w=3.6;d=3.4;h=.38;}
    else if(type===7){shape='gear';w=d=3.3;h=.42;}
    else if(type===8){w=4.4;d=1.7;h=.24;}
    else if(type===9){shape='cross';w=d=3.2;h=.5;}
    const obstacle={x,z,w,d,top:y,bottom:y-h,platform:true,ascent:true,shape,radius,polygon:polygons[shape]||null};obstacles.push(obstacle);
    if(shape==='circle'){
      add('cylinder',7,x,y-h/2,z,radius,h,radius);for(const level of[y-.12,y-h+.12])add('ring',2,x,level,z,radius*1.015,radius*1.015,radius*1.015,Math.PI/2);
      add('cylinder',4,x,y+.009,z,radius*.82,.018,radius*.82);add('ring',3,x,y+.03,z,radius*.92,radius*.92,radius*.92,Math.PI/2);
    }else if(shape!=='rect'){
      polygonGeometry(shape);add(shape,shape==='gear'?2:shape==='triangle'?7:1,x,y,z,1,h,1);
      // An inset copy gives shaped landing surfaces a bevel-like edge without
      // adding a rectangular, invisible support surface around their outline.
      add(shape,0,x,y+.018,z,.94,.025,.94);
      if(shape==='hex')add('ring',3,x,y+.05,z,1.13,1.13,1.13,Math.PI/2);
      if(shape==='triangle')for(const side of[-1,1])box(5,x+side*.8,y+.045,z+.9,.55,.025,.10);
      if(shape==='h')for(const side of[-1,1])box(2,x+side,y+.045,z,.10,.03,2.2);
      if(shape==='gear'){add('cylinder',4,x,y+.035,z,.72,.035,.72);add('ring',3,x,y+.06,z,.9,.9,.9,Math.PI/2);}
    }else{
      box(type===0?5:type===8?6:1,x,y-h/2,z,w,h,d);
      box(4,x,y+.014,z,w-.14,.025,d-.14);
      for(const side of[-1,1]){box(2,x+side*(w/2-.07),y-.05,z,.10,.12,d);box(1,x,y-.05,z+side*(d/2-.05),w,.12,.08);}
      if(type===0){for(let n=-2;n<=2;n++)for(const side of[-1,1])box(1,x+n*.48,y-h*.5,z+side*d/2,.08,h*.84,.04);for(const side of[-1,1])box(2,x+side*.7,y+.04,z,.12,.04,d-.2);}
      if(type===2){box(5,x,y-h*.5,z,alongX?w:.18,h*.7,alongX?.18:d);for(let n=-3;n<=3;n++)box(7,x+(alongX?n*.48:0),y+.04,z+(alongX?0:n*.48),alongX?.06:w-.15,.025,alongX?d-.15:.06);}
      if(type===4){for(const side of[-1,1])for(const end of[-1,1]){add('cylinder',4,x+side*(w/2+.02),y-.8,z+end*.66,.30,.20,.30,0,0,Math.PI/2);add('cylinder',2,x+side*(w/2+.13),y-.8,z+end*.66,.12,.035,.12,0,0,Math.PI/2);}box(5,x,y-.5,z,w-.2,.16,d+.03);}
      if(type===8)for(let c=-4;c<=4;c++)for(let r=-1;r<=1;r++){box(6,x+c*.44,y+.04,z+r*.45,.39,.02,.39);box(7,x+c*.44,y+.055,z+r*.45,.32,.008,.012);}
      if(summit){box(2,x,y+.04,z,w-.4,.025,.07);box(2,x,y+.04,z,.07,.025,d-.4);}
    }
    number(i+1,x,y,z);
    arrowOrigins.push([x+(shape==='h'?.95:0),y+.085,z+(d<1.8?.28:.64)]);
  });
  for(const {kind,m,poses}of batches.values()){
    const mesh=new THREE.InstancedMesh(geometries[kind],materials[m],poses.length);
    poses.forEach(([x,y,z,sx,sy,sz,rx,ry,rz],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});
    mesh.computeBoundingSphere();mesh.matrixAutoUpdate=false;mesh.updateMatrix();root.add(mesh);
  }
  const arrow=new THREE.Shape();arrow.moveTo(-.21,-.12);arrow.lineTo(0,.12);arrow.lineTo(.21,-.12);arrow.lineTo(0,.33);arrow.closePath();
  const arrows=new THREE.InstancedMesh(new THREE.ShapeGeometry(arrow),materials[3],route.length-1);
  for(let i=0;i<route.length-1;i++){const[x,y,z]=arrowOrigins[i],yaw=Math.atan2(route[i+1][0]-route[i][0],route[i+1][1]-route[i][1]);dummy.position.set(x,y,z);dummy.rotation.set(-Math.PI/2,0,Math.PI-yaw);dummy.scale.setScalar(.7);dummy.updateMatrix();arrows.setMatrixAt(i,dummy.matrix);}
  arrows.computeBoundingSphere();root.add(arrows);
  function distanceTo(obstacle,x,z){
    const px=x-obstacle.x,pz=z-obstacle.z;
    if(obstacle.shape==='circle')return Math.hypot(px,pz)-obstacle.radius;
    if(obstacle.polygon){let inside=false,distance=Infinity;const polygon=obstacle.polygon;
      for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const[ax,az]=polygon[j],[bx,bz]=polygon[i],dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/(dx*dx+dz*dz||1)));
        distance=Math.min(distance,Math.hypot(px-ax-dx*t,pz-az-dz*t));
        if((az>pz)!==(bz>pz)&&px<(bx-ax)*(pz-az)/(bz-az)+ax)inside=!inside;
      }return inside?-distance:distance;
    }
    return Math.hypot(Math.max(0,Math.abs(px)-obstacle.w/2),Math.max(0,Math.abs(pz)-obstacle.d/2));
  }
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
  return{root,route,height:gy,update,distanceTo};
}
/* LOBBY_ASCENT_END */
