import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The mounting plate sits on the wall. Positive Z points into the room.
export function createSurveillanceCameraKit(T){
  const shell=new T.MeshStandardMaterial({color:0xd6dfdb,roughness:.37,metalness:.38});
  const graphite=new T.MeshStandardMaterial({color:0x27313a,roughness:.45,metalness:.5});
  const metal=new T.MeshStandardMaterial({color:0x8da2ab,roughness:.28,metalness:.72});
  const optic=new T.MeshStandardMaterial({color:0x123b52,emissive:0x092633,roughness:.13,metalness:.52});
  const reflection=new T.MeshBasicMaterial({color:0x8bccd4});
  const tally=new T.MeshStandardMaterial({color:0x5a232b,emissive:0xff293f,emissiveIntensity:0,roughness:.34,toneMapped:false});
  const model=new T.Group(),head=new T.Group();
  head.position.set(0,-.02,.49);
  head.rotation.x=.18;
  model.add(head);

  function part(parent,geometry,material,x,y,z){
    const mesh=new T.Mesh(geometry,material);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  function block(parent,material,x,y,z,w,h,d,radius){
    return part(parent,new RoundedBoxGeometry(w,h,d,2,radius),material,x,y,z);
  }
  function barrel(parent,material,x,y,z,front,back,depth){
    const ring=part(parent,new T.CylinderGeometry(front,back,depth,28),material,x,y,z);
    ring.rotation.x=Math.PI/2;
  }
  block(model,graphite,0,0,-.06,.44,.55,.12,.05);
  block(model,metal,0,.03,.15,.14,.14,.4,.035);
  const hinge=part(model,new T.CylinderGeometry(.12,.12,.34,18),graphite,0,.02,.33);
  hinge.rotation.z=Math.PI/2;
  block(head,shell,0,.01,.17,.67,.45,.77,.105);
  block(head,graphite,0,-.026,.556,.61,.37,.10,.065);
  block(head,shell,0,.226,.24,.72,.075,.85,.032);
  barrel(head,graphite,0,-.03,.627,.18,.19,.13);
  barrel(head,metal,0,-.03,.691,.145,.153,.032);
  barrel(head,optic,0,-.03,.71,.126,.126,.029);
  barrel(head,graphite,0,-.03,.727,.071,.096,.018);
  barrel(head,reflection,-.048,.027,.733,.022,.022,.008);
  for(const side of [-1,1]){
    for(const z of [-.08,-.01,.06])block(head,graphite,side*.333,-.067,z,.014,.094,.023,.005);
    block(head,graphite,side*.329,.094,.31,.029,.094,.30,.014);
    block(head,tally,side*.348,.094,.31,.019,.057,.24,.009);
  }
  block(head,graphite,0,.27,.36,.41,.05,.25,.018);
  block(head,tally,0,.30,.36,.34,.063,.19,.025);
  barrel(head,tally,.234,.059,.618,.045,.045,.025);

  // Batch the fixed parts by finish once. Each room shares the same meshes.
  model.updateMatrixWorld(true);
  const byMaterial=new Map();
  model.traverse(node=>{
    if(!node.isMesh)return;
    const geometry=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();
    geometry.applyMatrix4(node.matrixWorld);
    const batch=byMaterial.get(node.material)||[];
    batch.push(geometry);byMaterial.set(node.material,batch);
    node.geometry.dispose();
  });
  const template=new T.Group();
  for(const [material,parts] of byMaterial){
    const geometry=mergeGeometries(parts);
    parts.forEach(part=>part.dispose());
    template.add(new T.Mesh(geometry,material));
  }

  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
  const ctx=canvas.getContext('2d'),halo=ctx.createRadialGradient(48,48,0,48,48,48);
  halo.addColorStop(0,'rgba(255,225,180,.96)');halo.addColorStop(.13,'rgba(255,93,74,.94)');
  halo.addColorStop(.38,'rgba(255,34,43,.43)');halo.addColorStop(1,'rgba(255,32,40,0)');
  ctx.fillStyle=halo;ctx.fillRect(0,0,96,96);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
  const glow=new T.SpriteMaterial({map:texture,transparent:true,depthTest:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
  const lamp=new T.Sprite(glow);lamp.name='Recording beacon';
  lamp.position.copy(head.localToWorld(new T.Vector3(0,.35,.37)));lamp.scale.set(.95,.95,1);
  lamp.visible=false;template.add(lamp);
  return {
    create(){return template.clone(true);},
    illuminate(active,stamp,reduced){
      const pulse=reduced?1:.87+.13*Math.cos(stamp*.0031);
      tally.color.setHex(active?0xff6255:0x5a232b);
      tally.emissiveIntensity=active?1.75*pulse:0;
      glow.opacity=pulse;
    }
  };
}
