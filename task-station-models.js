import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Small world machines, separate from task rules and the close-up mini-games.
export function createWorldTaskMachine(THREE,task){
  const root=new THREE.Group(),materials=new Map(),geometries=new Set(),moving=[];
  const text=[task.mode,task.machine,task.kind,task.id,task.name,task.room].filter(Boolean).join(' ').toLowerCase();
  const type=/fuel|燃料/.test(text)?'fuel':/wire|circuit|配線|回線|電力|電流|battery|蓄電/.test(text)?'wires':/card|swipe|idコード/.test(text)?'card':/radar|stars|defrost|望遠|星図|triangulate|signal|nav|操縦/.test(text)?'radar':/medic|medicine|tubing|centrifuge|sterile|specimen|検体|採血|治療|medical|freezer/.test(text)?'lab':/trash|garbage|清掃|filter|酸素/.test(text)?'filter':/cargo|貨物|金庫|荷物/.test(text)?'cargo':/drill|core|seal|採取|亀裂/.test(text)?'drill':/shield|シールド/.test(text)?'shield':/weapon|asteroid|照準|武器/.test(text)?'weapons':'terminal';
  root.name='task-machine:'+task.id;root.userData.taskMachineType=type;
  function mat(c,light=false){const key=c+':'+light;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color:c,metalness:.48,roughness:.42,...light?{emissive:c,emissiveIntensity:.45}:{}}));return materials.get(key);}
  const steel=mat(0x627c8e),dark=mat(0x162a3b),trim=mat(0xb5c8cb),rubber=mat(0x233443),cyan=mat(0x71cbbf,true),amber=mat(0xd3ab6a,true);
  function mesh(g,m,p=root){geometries.add(g);const o=new THREE.Mesh(g,m);o.castShadow=false;o.receiveShadow=true;p.add(o);return o;}
  function box(m,x,y,z,w,h,d,p=root){const o=mesh(new THREE.BoxGeometry(w,h,d,2,2,2),m,p);o.position.set(x,y,z);return o;}
  function cylinder(m,x,y,z,r,h,p=root){const o=mesh(new THREE.CylinderGeometry(r,r,h,20),m,p);o.position.set(x,y,z);return o;}
  function ring(m,x,y,z,r,p=root){const o=mesh(new THREE.TorusGeometry(r,.018,6,32),m,p);o.position.set(x,y,z);return o;}
  function tube(m,points,r=.035){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),18,r,6,false),m);}
  function screen(x,y,z,w=.50,h=.30){box(dark,x,y,z,w+.08,h+.08,.07);box(cyan,x,y,z+.044,w,h,.012);for(let i=0;i<3;i++)box(dark,x-w*.12,y-.07+i*.065,z+.054,w*.55,.018,.008);}
  function feet(w=.8){box(dark,0,.08,0,w,.16,.56);for(const x of[-w*.38,w*.38])box(trim,x,.10,.25,.09,.035,.045);}
  feet();
  if(type==='fuel'){
    cylinder(steel,-.16,.70,-.04,.25,1.05);for(const y of[.22,1.18])cylinder(rubber,-.16,y,-.04,.27,.075);screen(-.16,1.00,.22,.27,.18);box(amber,-.16,.63,.22,.28,.18,.035);tube(rubber,[[.12,1.10,.02],[.40,.97,.08],[.48,.33,.20],[.22,.30,.35],[.19,.75,.35]],.045);box(trim,.18,.82,.35,.09,.26,.09).rotation.z=-.22;box(dark,.18,.70,.35,.15,.055,.10);
  }else if(type==='wires'){
    box(steel,0,.84,-.06,.82,1.35,.28);box(dark,0,.86,.10,.68,1.16,.045);for(let i=0;i<4;i++){const c=mat([0xc87b83,0x76a3c5,0xcbb572,0x7cab92][i]);const x=-.24+i*.16;tube(c,[[x,1.29,.15],[x+.04,1.12,.19],[x-.035,.84,.18],[x,.45,.15]],.023);for(const y of[.43,1.31])box(trim,x,y,.16,.10,.075,.055);}screen(0,.27,.14,.46,.10);for(const x of[-.35,.35])for(const y of[.30,1.42])cylinder(trim,x,y,.11,.025,.018).rotation.x=Math.PI/2;
  }else if(type==='card'){
    box(steel,0,.75,-.02,.70,1.14,.34);screen(0,1.05,.17,.48,.27);box(dark,.10,.62,.19,.41,.20,.09);box(rubber,.10,.65,.25,.35,.022,.03);box(trim,-.20,.61,.25,.13,.23,.025);box(amber,-.20,.64,.269,.08,.06,.008);box(steel,0,.30,.19,.56,.17,.08);for(let i=0;i<3;i++)box(trim,-.13+i*.13,.31,.24,.08,.035,.02);
  }else if(type==='radar'){
    cylinder(steel,0,.52,-.07,.16,.74);const dish=new THREE.Group();dish.position.set(0,1.13,-.05);dish.rotation.x=.58;root.add(dish);const bowl=mesh(new THREE.SphereGeometry(.42,24,12,0,Math.PI*2,0,Math.PI/2),steel,dish);bowl.scale.y=.32;bowl.rotation.x=Math.PI;ring(trim,0,0,0,.42,dish).rotation.x=Math.PI/2;cylinder(dark,0,-.12,0,.025,.32,dish);screen(0,.63,.27,.46,.23);moving.push({node:dish,axis:'y',amount:.14,base:0,speed:.7});
  }else if(type==='lab'){
    box(steel,0,.67,-.03,.86,.95,.44);box(dark,0,.89,.21,.71,.42,.025);for(let i=0;i<3;i++){cylinder(trim,-.23+i*.23,.89,.23,.055,.29);cylinder(i===1?amber:cyan,-.23+i*.23,.84,.235,.035,.16);box(rubber,-.23+i*.23,1.065,.23,.10,.045,.09);}screen(0,.45,.22,.42,.20);const lid=box(trim,0,1.19,-.02,.90,.07,.48);tube(rubber,[[-.32,.57,-.22],[-.44,.69,-.20],[-.44,1.16,-.14],[-.23,1.16,.05]],.025);
  }else if(type==='filter'){
    box(steel,0,.79,-.03,.80,1.20,.35);box(dark,0,.98,.16,.65,.57,.035);for(let i=0;i<6;i++)box(trim,0,.77+i*.078,.19,.59,.027,.055);screen(0,.42,.17,.40,.15);box(amber,.28,.43,.19,.08,.09,.035);tube(rubber,[[-.28,1.35,-.04],[-.28,1.48,-.05],[.27,1.48,-.05],[.27,1.30,-.04]],.035);
  }else if(type==='cargo'){
    box(steel,0,.51,-.02,.86,.68,.60);box(dark,0,.63,.30,.65,.30,.04);for(const x of[-.25,.25])box(trim,x,.59,.34,.045,.51,.05);const wheel=ring(amber,.08,.66,.35,.12);box(trim,-.21,.67,.35,.12,.07,.04);screen(0,1.02,-.03,.47,.25);box(steel,0,.85,-.07,.12,.31,.12);moving.push({node:wheel,axis:'z',amount:.05,base:0,speed:1.2});
  }else if(type==='drill'){
    box(steel,0,.58,0,.72,.85,.48);for(const x of[-.28,.28])cylinder(trim,x,1.03,0,.035,.65);const head=cylinder(dark,0,1.04,0,.19,.29);mesh(new THREE.ConeGeometry(.14,.32,16),trim).position.set(0,.76,0);screen(0,.47,.25,.42,.23);moving.push({node:head,axis:'y',amount:.18,base:0,speed:1.5});
  }else if(type==='shield'||type==='weapons'){
    box(steel,0,.79,-.03,.84,1.16,.32);box(dark,0,.97,.15,.68,.53,.035);for(let i=0;i<6;i++){const x=(i%3-1)*.20,y=.88+Math.floor(i/3)*.20;const hex=mesh(new THREE.CylinderGeometry(.079,.079,.018,6),i%2?cyan:amber);hex.rotation.x=Math.PI/2;hex.position.set(x,y,.19);}screen(0,.45,.15,.47,.19);
  }else{
    box(steel,0,.60,-.05,.42,.92,.30);box(steel,0,1.18,-.06,.85,.62,.24);screen(0,1.20,.08,.70,.46);const tray=box(trim,0,.86,.15,.84,.065,.48);tray.rotation.x=.12;for(let i=0;i<5;i++)box(dark,-.22+i*.11,.91,.20,.07,.028,.085);box(amber,.29,.91,.18,.075,.04,.075);
  }
  // Static material batches preserve the distinct machines at a few draw calls.
  const animated=new Set(moving.map(p=>p.node)),byMaterial=new Map();root.updateMatrixWorld(true);
  root.traverse(o=>{if(!o.isMesh||animated.has(o)||o.parent!==root)return;const a=byMaterial.get(o.material)||[];a.push(o);byMaterial.set(o.material,a);});
  for(const [material,list]of byMaterial){if(list.length<2)continue;const copies=list.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix);}),g=mergeGeometries(copies,false);copies.forEach(g=>g.dispose());if(!g)continue;geometries.add(g);const merged=new THREE.Mesh(g,material);merged.receiveShadow=true;root.add(merged);list.forEach(o=>o.removeFromParent());}
  return{root,type,dynamicNodes:moving.map(p=>p.node),setOpacity(a){for(const m of materials.values()){m.transparent=a<.99;m.opacity=a;m.depthWrite=a>.98;}},setComplete(done){cyan.emissiveIntensity=done?.10:.42;},update(ms){for(const p of moving)p.node.rotation[p.axis]=p.base+Math.sin(ms*.001*p.speed)*p.amount;},dispose(){root.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
