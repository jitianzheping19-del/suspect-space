// The model, hand attachment and shot origin share one muzzle coordinate.
export const TRIGGER_HAPPY_MUZZLE = Object.freeze({x:0,y:.026,z:.74});
export const TRIGGER_HAPPY_MOUNT = Object.freeze({x:.274/.76,y:1.10-.026,z:.8/.76-.74});
export function attachTriggerHappyWeapon(prop,avatar,viewScene=null){
 let parent=avatar;
 // First person hides the owner body. Keep the held gun in its own matching
 // transform so hiding that body does not also hide the weapon.
 if(viewScene){if(!prop.viewAnchor){prop.viewAnchor=new avatar.constructor();prop.viewAnchor.matrixAutoUpdate=false;}if(prop.viewAnchor.parent!==viewScene)viewScene.add(prop.viewAnchor);avatar.updateWorldMatrix(true,false);viewScene.updateWorldMatrix(true,false);prop.viewAnchor.matrix.copy(viewScene.matrixWorld).invert().multiply(avatar.matrixWorld);parent=prop.viewAnchor;}
 else prop.viewAnchor?.removeFromParent();
 if(prop.root.parent!==parent)parent.add(prop.root);
 prop.root.position.set(TRIGGER_HAPPY_MOUNT.x,TRIGGER_HAPPY_MOUNT.y,TRIGGER_HAPPY_MOUNT.z);
 prop.root.rotation.set(0,0,0);prop.root.scale.setScalar(1);
 avatar.userData.triggerHappyWeapon=prop;
}
export function triggerHappyMuzzleWorld(prop,target){
 prop.root.updateWorldMatrix(true,true);
 return prop.muzzle.getWorldPosition(target);
}
// Articulated receiver and a pointed cartridge model.
export function buildTriggerHappyWeapon(THREE,scope){
 const {root,mesh,standard,glow}=scope,metal=standard(0x243b4b,{metalness:.82,roughness:.28}),edge=standard(0x879ba6,{metalness:.9,roughness:.22}),rubber=standard(0x111e29,{roughness:.7}),brass=standard(0xc8a16b,{metalness:.85}),light=glow(0x71d8d2,.75);
 const box=(m,x,y,z,w,h,d,p=root)=>mesh(new THREE.BoxGeometry(w,h,d),m,p,x,y,z);
 const tube=(m,x,y,z,r,length,p=root)=>{const o=mesh(new THREE.CylinderGeometry(r,r,length,20),m,p,x,y,z);o.rotation.x=Math.PI/2;return o;};
 const side=new THREE.Shape();side.moveTo(-.26,-.055);side.lineTo(-.24,.095);side.lineTo(.23,.095);side.lineTo(.31,.035);side.lineTo(.26,-.08);side.lineTo(-.20,-.08);side.closePath();const receiver=mesh(new THREE.ExtrudeGeometry(side,{depth:.14,bevelEnabled:true,bevelSize:.015,bevelThickness:.012,bevelSegments:2,steps:1}),metal);receiver.rotation.y=-Math.PI/2;receiver.position.set(.07,.015,.03);
 box(edge,0,.13,.02,.17,.027,.48);for(let i=0;i<9;i++)box(rubber,0,.15,-.19+i*.048,.145,.018,.019);
 tube(metal,0,.026,.42,.044,.38);tube(edge,0,.026,.51,.057,.12);tube(rubber,0,.026,.65,.067,.14);tube(edge,0,.026,.72,.057,.035);mesh(new THREE.CircleGeometry(.034,20),rubber,root,0,.026,.74);
 for(let i=0;i<5;i++)for(const side of[-1,1])box(rubber,side*.081,.039,.20+i*.05,.012,.053,.024);
 const handle=box(rubber,0,-.175,-.10,.10,.23,.12);handle.rotation.x=.22;for(let i=0;i<4;i++)box(edge,0,-.11-i*.038,-.163,.103,.009,.012);
 const guard=mesh(new THREE.TorusGeometry(.065,.012,6,20,Math.PI*1.6),edge,root,.012,-.12,.025);guard.rotation.y=Math.PI/2;
 const magazine=box(metal,0,-.205,.12,.115,.28,.145);magazine.rotation.x=-.13;for(let i=0;i<5;i++)box(edge,.060,-.12-i*.04,.12,.012,.012,.12);box(brass,0,-.335,.14,.13,.022,.17);
 box(metal,0,-.01,-.36,.09,.11,.25);box(rubber,0,-.025,-.50,.14,.19,.06);box(edge,0,-.02,-.43,.10,.045,.09);
 const sight=new THREE.Group();sight.position.set(0,.21,-.08);root.add(sight);for(const side of[-1,1])box(edge,side*.062,.005,0,.018,.10,.06,sight);box(edge,0,.055,0,.14,.018,.06,sight);box(light,0,.008,.031,.025,.018,.008,sight);
 const bolt=box(edge,.09,.035,.01,.025,.06,.12);box(rubber,.107,.035,.005,.012,.028,.047);for(const z of[-.15,.14])tube(brass,.096,.02,z,.014,.018);
 const muzzle=new THREE.Object3D();muzzle.name="trigger-happy-muzzle";muzzle.position.set(TRIGGER_HAPPY_MUZZLE.x,TRIGGER_HAPPY_MUZZLE.y,TRIGGER_HAPPY_MUZZLE.z);root.add(muzzle);const flash=new THREE.Group();muzzle.add(flash);tube(glow(0xffefd0,.9),0,0,.12,.033,.26,flash);for(let i=0;i<6;i++){const a=i*Math.PI/3,spark=mesh(new THREE.ConeGeometry(.026,.21,5),glow(i%2?0xffbc72:0xffefb1,.72),flash,Math.sin(a)*.052,Math.cos(a)*.052,.07);spark.rotation.x=Math.PI/2;spark.rotation.z=a;}
 const shells=new THREE.InstancedMesh(scope.geometry(new THREE.CylinderGeometry(.016,.019,.073,8)),brass,30);root.add(shells);shells.count=0;
 return{scope,root,muzzle,flash,shells,bolt};
}
export function buildTriggerHappyBullet(THREE,scope,radius){
 const size=Math.max(.055,Math.min(.13,radius*.35)),brass=scope.standard(0xd4b67b,{metalness:.9,roughness:.22}),tip=scope.standard(0xe3d2ad,{metalness:.75,roughness:.26}),bullet=new THREE.Group();scope.root.add(bullet);
 const body=scope.mesh(new THREE.CylinderGeometry(size,size,size*3.6,12),brass,bullet);body.rotation.x=Math.PI/2;
 const nose=scope.mesh(new THREE.ConeGeometry(size,size*2.5,12),tip,bullet,0,0,size*3);nose.rotation.x=Math.PI/2;
 const band=scope.mesh(new THREE.TorusGeometry(size*1.02,size*.13,5,12),tip,bullet,0,0,-size*1.25);
 const tracer=scope.mesh(new THREE.ConeGeometry(size*.45,1.05,8,1,true),scope.glow(0xffd18c,.45),bullet,0,0,-.58);tracer.rotation.x=-Math.PI/2;
 return bullet;
}
