/* LOBBY_ASCENT_BEGIN */
function createLobbyAscent({THREE,scene,obstacles}){
  const root=new THREE.Group();root.name='lobby-sky-ascent';scene.add(root);
  // Authored sequence, not a repeating assortment of shapes. Wide run-ups lead
  // into lateral precision jumps, narrow turning beams and a final spiral.
  // x, z, landing height, kit, width (radius for round pads), depth, thickness.
  const course=[
    [-6.6,11.2,.65,'landing',3.4,3,.65],
    [-6.6,7.7,1.65,'deck',3,2.6,.48],
    [-3.2,7.7,2.75,'runway',3.8,1.8,.34],
    [.7,7.7,3.85,'deck',2.8,2.6,.48],
    [4.3,7.7,4.95,'runway',3.6,1.65,.34],
    [7.7,5.2,6.05,'hex',1.6,0,.42],
    [7.7,1.5,7.15,'landing',3.4,3.2,.55],

    [4.6,.4,8.45,'hex',1.35,0,.38],
    [1.5,2.1,9.75,'circle',1.12,0,.45],
    [-1.5,.1,11.05,'hex',1.3,0,.38],
    [-4.6,1.9,12.35,'circle',1.1,0,.45],
    [-7.7,.1,13.65,'hex',1.25,0,.38],
    [-7.7,-3.4,14.75,'deck',2.3,2,.4],
    [-4.2,-3.4,15.9,'landing',3.1,2.7,.55],

    [-.45,-3.4,17.05,'beam',3.3,1.15,.3],
    [3.5,-3.4,18.25,'beam',3.4,1.1,.3],
    [7.4,-3,19.45,'turn',2.4,2.4,.42],
    [7.4,.9,20.65,'beam',1.1,3.6,.3],
    [7.4,5.1,21.85,'beam',1.1,3.6,.3],
    [5.6,8.7,23.05,'turn',2.4,2.4,.42],
    [1.9,10.2,24.3,'landing',3.4,2.8,.55],

    [-1.8,10.2,25.7,'hex',1.25,0,.38],
    [-5.4,8.9,27.1,'circle',1.1,0,.45],
    [-7.8,5.6,28.5,'deck',2.1,2.1,.4],
    [-4.4,3.8,29.9,'runway',3.7,1.1,.3],
    [-.4,3.8,31.3,'hex',1.3,0,.38],
    [3.1,5.4,32.7,'circle',1.15,0,.45],
    [.2,8.2,34,'summit',4.2,3.8,.65]
  ];
  const route=course.map(([x,z,y])=>[x,z,y]);
  const sections=['DEPARTURE','SWITCHBACK','SKYLINE','ORBIT'];
  // Original lounge kit: stone treads, machined champagne edges and cyan inlays.
  // All textures and geometry are built once. No extra lights or animation loop.
  function texture(width,height,paint){
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    paint(canvas.getContext('2d'),width,height);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=2;return map;
  }
  const treadMap=texture(256,256,(g,w,h)=>{
    g.fillStyle='#c1c9c9';g.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=4){g.fillStyle=y%12===0?'#aab6b8':'#b9c3c4';g.fillRect(0,y,w,1);}
    for(let y=16;y<h;y+=32)for(let x=16;x<w;x+=32){g.fillStyle='#d5dddd';g.fillRect(x,y,9,1);g.fillStyle='#9caeb0';g.fillRect(x,y+1,9,1);}
    g.strokeStyle='#8e9fa2';g.lineWidth=2;g.strokeRect(8,8,w-16,h-16);
  });
  const materials=[
    new THREE.MeshStandardMaterial({color:0x24464f,map:treadMap,roughness:.63,metalness:.28}),
    new THREE.MeshStandardMaterial({color:0x526979,roughness:.38,metalness:.65}),
    new THREE.MeshStandardMaterial({color:0xcab181,roughness:.3,metalness:.72}),
    new THREE.MeshBasicMaterial({color:0x91deda,toneMapped:false}),
    new THREE.MeshStandardMaterial({color:0x101e2a,roughness:.48,metalness:.42}),
    new THREE.MeshStandardMaterial({color:0xe5dcc7,map:treadMap,roughness:.5,metalness:.22}),
    new THREE.MeshBasicMaterial({color:0xf1dcb1,toneMapped:false})
  ];
  const geometries={box:new THREE.BoxGeometry(1,1,1),cylinder:new THREE.CylinderGeometry(1,1,1,20),ring:new THREE.TorusGeometry(1,.018,6,48)},batches=new Map(),dummy=new THREE.Object3D();
  const regular=(n,r)=>Array.from({length:n},(_,i)=>[Math.sin(i*Math.PI*2/n)*r,Math.cos(i*Math.PI*2/n)*r]);
  // The same outline builds the visible top and the landing collider.
  function polygonGeometry(kind,points){
    if(geometries[kind])return;
    const shape=new THREE.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,steps:1});geometry.rotateX(-Math.PI/2);geometry.translate(0,-1,0);
    const xs=points.map(p=>p[0]),zs=points.map(p=>p[1]),minX=Math.min(...xs),minZ=Math.min(...zs),width=Math.max(...xs)-minX,depth=Math.max(...zs)-minZ;
    const p=geometry.attributes.position,uv=geometry.attributes.uv;
    for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)-minX)/width,(p.getZ(i)-minZ)/depth);
    geometries[kind]=geometry;
  }
  const vertex=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3(),flatGeometry=new Map();
  // Merge by material, so detailed silhouettes still cost only a few draw calls.
  function add(kind,m,x,y,z,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,uvRect=null){
    let geometry=flatGeometry.get(kind);
    if(!geometry){const source=geometries[kind];geometry=source.index?source.toNonIndexed():source;flatGeometry.set(kind,geometry);}
    let batch=batches.get(m);if(!batch){batch={positions:[],normals:[],uvs:[]};batches.set(m,batch);}
    dummy.position.set(x,y,z);dummy.rotation.set(rx,ry,rz);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();normalMatrix.getNormalMatrix(dummy.matrix);
    const positions=geometry.attributes.position,normals=geometry.attributes.normal,uvs=geometry.attributes.uv;
    for(let i=0;i<positions.count;i++){
      vertex.fromBufferAttribute(positions,i).applyMatrix4(dummy.matrix);normal.fromBufferAttribute(normals,i).applyMatrix3(normalMatrix).normalize();
      batch.positions.push(vertex.x,vertex.y,vertex.z);batch.normals.push(normal.x,normal.y,normal.z);
      const u=uvs?.getX(i)||0,v=uvs?.getY(i)||0;batch.uvs.push(uvRect?uvRect[0]+u*uvRect[2]:u,uvRect?uvRect[1]+v*uvRect[3]:v);
    }
  }
  function box(m,x,y,z,w,h,d){add('box',m,x,y,z,w,h,d);}
  const numberMap=texture(2048,1024,g=>{
    for(let i=0;i<32;i++){
      const x=i%8*256,y=Math.floor(i/8)*256;g.textAlign='center';g.textBaseline='middle';
      const lightDeck=['landing','turn','summit'].includes(course[i]?.[3])||i===31;
      g.fillStyle=lightDeck?'#233d48':'#f1dfb8';g.font='600 96px sans-serif';
      if(i<route.length){g.fillText(String(i+1).padStart(2,'0'),x+128,y+114);g.font='500 21px sans-serif';g.fillStyle=lightDeck?'#285757':'#9ed7d3';g.fillText(i===route.length-1?'SUMMIT':sections[Math.floor(i/7)],x+128,y+186);}
      else if(i>=30){g.font='600 38px sans-serif';g.fillText(i===30?'上空アスレ':'SUMMIT',x+128,y+100);g.font='500 20px sans-serif';g.fillStyle=lightDeck?'#285757':'#a1d4d2';g.fillText(i===30?route.length+' STEPS / 34 M':'SPACE SUSPECT',x+128,y+154);}
      g.fillStyle='#cab181';g.fillRect(x+72,y+215,112,2);
    }
  });
  const decalMaterial=materials.length;materials.push(new THREE.MeshBasicMaterial({map:numberMap,transparent:true,alphaTest:.08,depthWrite:false,toneMapped:false}));
  geometries.decal=new THREE.PlaneGeometry(1,1);
  function decal(index,x,y,z,w,h,rx=-Math.PI/2,rz=0){add('decal',decalMaterial,x,y,z,w,h,1,rx,0,rz,[(index%8)/8,(3-Math.floor(index/8))/4,1/8,1/4]);}
  function line(m,x,y,z,ax,az,bx,bz,width=.035,height=.02){
    add('box',m,x+(ax+bx)/2,y,z+(az+bz)/2,width,height,Math.hypot(bx-ax,bz-az),0,Math.atan2(bx-ax,bz-az));
  }
  function rim(points,m,x,y,z,inset,width){
    const area=points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0),sign=Math.sign(area);
    for(let i=0;i<points.length;i++){
      const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length,cut=Math.min(inset+.02,length*.22);
      // Offset each edge toward its interior, including the inside corners of H pads.
      line(m,x,y,z,a[0]-dz*sign*inset+dx*cut,a[1]+dx*sign*inset+dz*cut,b[0]-dz*sign*inset-dx*cut,b[1]+dx*sign*inset-dz*cut,width);
    }
  }
  const arrow=new THREE.Shape();arrow.moveTo(-.22,-.10);arrow.lineTo(0,.12);arrow.lineTo(.22,-.10);arrow.lineTo(.22,.02);arrow.lineTo(0,.26);arrow.lineTo(-.22,.02);arrow.closePath();
  geometries.arrow=new THREE.ShapeGeometry(arrow);
  const padRanges=[];
  route.forEach(([x,z,y],i)=>{
    const summit=i===route.length-1,next=route[i+1],section=Math.floor(i/7);
    const[,,,kit,width,depth,h]=course[i],shape=kit==='hex'||kit==='circle'?kit:'rect',radius=shape==='rect'?0:width;
    const w=radius?radius*2:width,d=radius?radius*2:depth,alongX=w>d;
    const corner=kit==='turn'?.48:.16,points=shape==='circle'?regular(48,radius):shape==='hex'?regular(6,radius):[
      [-w/2+corner,-d/2],[w/2-corner,-d/2],[w/2,-d/2+corner],[w/2,d/2-corner],
      [w/2-corner,d/2],[-w/2+corner,d/2],[-w/2,d/2-corner],[-w/2,-d/2+corner]
    ];
    const obstacle={x,z,w,d,top:y,bottom:y-h,platform:true,ascent:true,revealed:i<2,shape,radius,polygon:shape==='circle'?null:points,section,kit};obstacles.push(obstacle);
    const kind='pad-'+i;polygonGeometry(kind,points);
    // Landing plane stays at y. Three recessed tiers give the slab a bevelled silhouette.
    add(kind,4,x,y-h*.70,z,.91,h*.30,.91);
    add(kind,1,x,y-.10,z,.97,h*.70-.10,.97);
    add(kind,2,x,y-.045,z,1,.055,1);
    add(kind,summit||kit==='landing'||kit==='turn'?5:0,x,y,z,1,.045,1);
    rim(points,2,x,y+.008,z,.055,.035);
    rim(points,summit?6:3,x,y+.012,z,.12,.024);
    // Small fasteners and recessed side seams sit on the platform itself.
    for(let n=0;n<points.length;n+=shape==='circle'?12:2){
      const[px,pz]=points[n];if(distanceTo(obstacle,x+px*.84,z+pz*.84)<-.045)add('cylinder',2,x+px*.84,y+.008,z+pz*.84,.035,.016,.035);
    }
    if(shape==='rect'){
      for(const side of[-1,1]){
        box(4,x,y-h*.40,z+side*(d/2*.97+.002),w*.67,Math.min(.16,h*.22),.012);
        for(let n=-2;n<=2;n++)box(2,x+n*w*.12,y-h*.40,z+side*(d/2*.97+.012),.035,Math.min(.12,h*.16),.012);
      }
      if(kit==='runway'||kit==='beam')for(const side of[-1,1])box(2,x+(alongX?0:side*(w/2-.25)),y+.007,z+(alongX?side*(d/2-.25):0),alongX?w*.75:.025,.012,alongX?.025:d*.75);
      if(kit==='landing'||summit)for(let n=0;n<4;n++)box(n<=section?3:2,x+(n-1.5)*.19,y+.016,z-d/2+.32,.12,.016,.07);
    }
    if(shape==='circle'||summit){
      const r=summit?1.42:radius*.72;
      add('ring',2,x,y+.014,z,r,r,r,Math.PI/2);
    }
    const yaw=next?Math.atan2(next[0]-x,next[1]-z):0;
    const size=Math.min(1.25,w*.66,d*.66);
    decal(i,x,y+.024,z,size,size,-Math.PI/2,Math.PI-yaw);
    if(next){
      const length=Math.hypot(next[0]-x,next[1]-z),ux=(next[0]-x)/length,uz=(next[1]-z)/length;
      // Mark the outgoing lip toward the next landing, including diagonal jumps.
      let lip=0;for(let t=.02;t<Math.max(w,d);t+=.02){if(distanceTo(obstacle,x+ux*t,z+uz*t)>.001)break;lip=t;}
      const offset=Math.max(.12,lip-.24),scale=.8;
      add('arrow',3,x+ux*offset,y+.028,z+uz*offset,scale,scale,1,-Math.PI/2,0,Math.PI-yaw);
    }
    if(i===0){
      // Plaque is flush with the front of the first step, clear of the jumping path.
      box(4,x,y-.32,z+d/2+.008,2.3,.47,.025);decal(30,x,y-.32,z+d/2+.024,2.25,1.05,0);
    }
    if(summit)decal(31,x,y+.026,z+1.12,1.7,.75);
    padRanges.push(new Map([...batches].map(([m,batch])=>[m,batch.positions.length/3])));
  });
  for(const [m,batch]of batches){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(batch.normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uvs,2));geometry.computeBoundingSphere();
    geometry.setDrawRange(0,padRanges[1].get(m)||0);const mesh=new THREE.Mesh(geometry,materials[m]);mesh.userData.padRanges=padRanges.map(range=>range.get(m)||0);mesh.name='ascent-finish-'+m;mesh.matrixAutoUpdate=false;root.add(mesh);
  }
  for(const geometry of new Set([...Object.values(geometries),...flatGeometry.values()]))geometry.dispose();
  function distanceTo(obstacle,x,z){
    if(obstacle.revealed===false)return Infinity;
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
  // Adjust only the rendered climbing view; OrbitControls keeps the user's zoom
  // and rotation, and the ordinary lobby/kart/first-person cameras stay intact.
  const pads=obstacles.filter(obstacle=>obstacle.ascent),viewRay=new THREE.Raycaster();
  const viewOrigin=new THREE.Vector3(),viewDirection=new THREE.Vector3(),viewPoint=new THREE.Vector3();
  const savedPosition=new THREE.Vector3(),savedQuaternion=new THREE.Quaternion(),viewMeshes=new WeakMap();
  let viewPrepared=false,savedFov=45,climbFov=45;
  function restoreView(camera){
    if(!viewPrepared)return;
    camera.position.copy(savedPosition);camera.quaternion.copy(savedQuaternion);camera.fov=savedFov;
    camera.updateProjectionMatrix();camera.updateMatrixWorld();viewPrepared=false;
  }
  function prepareView(camera,position,circuitRoot,enabled=true,dt=1/30){
    restoreView(camera);
    let index=-1,best=Infinity;
    if(enabled&&position.y>.35)for(let i=0;i<pads.length;i++){
      const pad=pads[i],height=position.y-pad.top,distance=distanceTo(pad,position.x,position.z);
      if(height<-.35||height>4||distance>2.4)continue;
      const score=Math.abs(height)+Math.max(0,distance)*2;
      if(score<best){best=score;index=i;}
    }
    if(index<0){climbFov=camera.fov;return false;}
    viewPrepared=true;savedPosition.copy(camera.position);savedQuaternion.copy(camera.quaternion);savedFov=camera.fov;
    // Points (stars), labels and hidden courses are not solid obstructions.
    if(circuitRoot){
      let meshes=viewMeshes.get(circuitRoot);
      if(!meshes){meshes=[];circuitRoot.traverse(object=>{if(object.isMesh)meshes.push(object);});viewMeshes.set(circuitRoot,meshes);}
      const visible=meshes.filter(object=>{
        for(let parent=object;parent;parent=parent.parent)if(!parent.visible)return false;
        const list=Array.isArray(object.material)?object.material:[object.material];
        return list.some(material=>material.visible&&(!material.transparent||material.opacity>=.5));
      });
      circuitRoot.updateWorldMatrix(true,true);
      let fraction=1;
      for(const height of [.15,1.2,2.1]){
        viewOrigin.copy(position);viewOrigin.y+=height;viewDirection.copy(savedPosition).sub(viewOrigin);
        const distance=viewDirection.length();viewRay.set(viewOrigin,viewDirection.normalize());viewRay.near=.3;viewRay.far=distance;
        const hit=viewRay.intersectObjects(visible,false)[0];
        if(hit)fraction=Math.min(fraction,Math.max(3/distance,(hit.distance-.7)/distance));
      }
      if(fraction<1){camera.position.copy(position).lerp(savedPosition,fraction);camera.lookAt(position);}
    }
    camera.updateMatrixWorld();
    // Fit both the current landing and the entire next landing, including their
    // edges. A minimum horizontal field of view prevents portrait cropping.
    let tangent=Math.max(Math.tan(savedFov*Math.PI/360),Math.tan(18*Math.PI/180)/camera.aspect);
    function include(x,y,z){
      viewPoint.set(x,y,z).applyMatrix4(camera.matrixWorldInverse);
      if(viewPoint.z>=-.1)return;
      tangent=Math.max(tangent,Math.abs(viewPoint.x)/(-viewPoint.z*camera.aspect*.86),Math.abs(viewPoint.y)/(-viewPoint.z*.78));
    }
    for(const pad of [pads[index],pads[index+1]])if(pad){
      if(pad.polygon)for(const [x,z]of pad.polygon)include(pad.x+x,pad.top,pad.z+z);
      else for(let i=0;i<16;i++){const angle=i*Math.PI/8;include(pad.x+Math.cos(angle)*pad.radius,pad.top,pad.z+Math.sin(angle)*pad.radius);}
    }
    include(position.x,position.y+2.4,position.z);
    const required=Math.min(90,Math.atan(tangent)*360/Math.PI);
    climbFov=Math.max(required,climbFov-Math.max(0,dt)*25);camera.fov=climbFov;camera.updateProjectionMatrix();
    return true;
  }
  const [gx,gz,gy]=route.at(-1);
  let reached=false,notice=null,noticeUntil=0,visiblePads=2;
  function update(position,stamp,name){
    const landing=pads.findIndex(pad=>pad.revealed&&Math.abs(position.y-pad.top)<.10&&distanceTo(pad,position.x,position.z)<=.05);
    if(landing>=0&&landing+3>visiblePads){visiblePads=Math.min(pads.length,landing+3);for(let i=0;i<pads.length;i++)pads[i].revealed=i<visiblePads;for(const mesh of root.children)if(mesh.userData.padRanges)mesh.geometry.setDrawRange(0,mesh.userData.padRanges[visiblePads-1]);}
    if(position.y<1.5)reached=false;
    if(!reached&&Math.abs(position.y-gy)<.12&&Math.hypot(position.x-gx,position.z-gz)<1.25){reached=true;noticeUntil=stamp+3600;notice=document.createElement('div');notice.setAttribute('role','status');notice.style.cssText='position:fixed;left:50%;top:22%;transform:translateX(-50%);z-index:50;padding:16px 26px;border:1px solid #e6d09e;border-radius:18px;background:linear-gradient(140deg,#283f48,#10212d);color:#fff3c5;font:800 clamp(20px,4vw,34px) system-ui;box-shadow:0 12px 40px #0008;pointer-events:none;text-align:center';notice.textContent=(name||'クルー')+' 登頂！';document.body.append(notice);}
    if(notice&&stamp>=noticeUntil){notice.remove();notice=null;}
  }
  return{root,route,height:gy,get visiblePads(){return visiblePads;},update,distanceTo,prepareView,restoreView};
}
/* LOBBY_ASCENT_END */
