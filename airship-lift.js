// One deterministic shuttle clock keeps every client on the same platform
// without broadcasting another transform stream or trusting a guest's commands.
export function sampleAirshipLift(route,stamp,epoch=0){
  const dwell=2400,travel=4200,period=2*(dwell+travel),phase=((stamp-epoch)%period+period)%period;
  let t,docked,direction;
  if(phase<dwell){t=0;docked=true;direction=1;}
  else if(phase<dwell+travel){t=(phase-dwell)/travel;docked=false;direction=1;}
  else if(phase<2*dwell+travel){t=1;docked=true;direction=-1;}
  else{t=1-(phase-2*dwell-travel)/travel;docked=false;direction=-1;}
  t=t*t*(3-2*t);return{x:route.a[0]+(route.b[0]-route.a[0])*t,z:route.a[1]+(route.b[1]-route.a[1])*t,t,docked,direction,phase};
}
export function onAirshipLift(point,route,state,margin=0){
  const dx=route.b[0]-route.a[0],dz=route.b[1]-route.a[1],n=Math.hypot(dx,dz)||1,x=point.x-state.x,z=point.z-state.z;
  return Math.abs((x*dx+z*dz)/n)<=1.10-margin&&Math.abs((-x*dz+z*dx)/n)<=Math.max(.85,route.width*.48)-margin;
}
export function carryAirshipLift(point,route,previous,next){
  return onAirshipLift(point,route,previous,.07)?{x:point.x+next.x-previous.x,z:point.z+next.z-previous.z,riding:true}:{x:point.x,z:point.z,riding:false};
}
export function createAirshipLift(THREE,route){
  const root=new THREE.Group(),car=new THREE.Group(),geometries=new Set(),materials=new Set();root.name='airship-moving-lift';root.add(car);
  function mat(c,glow=false){const m=new THREE.MeshStandardMaterial({color:c,metalness:.56,roughness:.42,...glow?{emissive:c,emissiveIntensity:.55}:{}});materials.add(m);return m;}
  const metal=mat(0x7e98a2),dark=mat(0x243b48),gold=mat(0xc2a469),light=mat(0x8ee6cc,true),glass=new THREE.MeshStandardMaterial({color:0x81abb7,transparent:true,opacity:.18,metalness:.2,roughness:.2,depthWrite:false});materials.add(glass);
  function box(p,m,x,y,z,w,h,d){const g=new THREE.BoxGeometry(w,h,d);geometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=true;p.add(o);return o;}
  const [ax,az]=route.a,[bx,bz]=route.b,length=Math.hypot(bx-ax,bz-az),yaw=-Math.atan2(bz-az,bx-ax),width=Math.max(1.7,route.width*.96);car.rotation.y=yaw;
  box(car,dark,0,-.08,0,2.2,.20,width);box(car,metal,0,.035,0,2.04,.045,width*.92);
  for(const s of[-1,1]){box(car,gold,s*1.025,.063,0,.06,.025,width*.91);box(car,dark,0,.43,s*width*.48,2.1,.82,.065);box(car,metal,0,.86,s*width*.48,2.2,.06,.09);box(car,light,0,.76,s*width*.487,1.75,.025,.01);box(car,glass,0,.50,s*width*.487,1.75,.43,.014);for(const x of[-.9,.9])box(car,metal,x,.43,s*width*.48,.07,.8,.07);}
  for(let i=0;i<7;i++)box(car,dark,-.82+i*.27,.064,0,.013,.01,width*.78);
  for(const [x,z]of [[ax,az],[bx,bz]]){const dock=new THREE.Group();dock.position.set(x,0,z);dock.rotation.y=yaw;root.add(dock);for(const s of[-1,1]){box(dock,metal,0,1.15,s*(width*.5+.15),.14,2.3,.13);box(dock,gold,0,2.32,s*(width*.5+.15),.24,.09,.24);}box(dock,dark,0,2.3,0,.18,.20,width+.5);box(dock,light,0,.10,0,.12,.025,width*.65);}
  const gantry=new THREE.Group();gantry.position.set((ax+bx)/2,0,(az+bz)/2);gantry.rotation.y=yaw;root.add(gantry);for(const s of[-1,1]){box(gantry,dark,0,2.42,s*(width*.5+.15),length+.45,.15,.16);box(gantry,gold,0,2.53,s*(width*.5+.15),length+.6,.04,.12);}
  for(const side of[-1,1])box(car,metal,0,1.58,side*width*.48,.07,1.4,.07);box(car,dark,0,2.35,0,.45,.19,.50);box(car,light,0,2.45,0,.17,.035,.23);
  return{root,car,route,update(stamp,epoch=0){const s=sampleAirshipLift(route,stamp,epoch);car.position.set(s.x,0,s.z);car.userData.docked=s.docked;light.emissiveIntensity=s.docked?.65:.27;return s;},dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
