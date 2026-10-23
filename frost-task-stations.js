import * as THREE from 'three';
import {createWorldTaskMachine} from './task-station-models.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// All fixed equipment shares material batches. Only moving mechanisms stay separate.
export function createFrostTaskStations(tasks,taskState){
  const root=new THREE.Group();root.name='FROST task stations';
  const machines=tasks.map(task=>{const m=createWorldTaskMachine(THREE,task);m.root.position.set(task.position[0],0,-task.position[1]);m.root.rotation.y=Math.atan2(task.facing[0],-task.facing[1]);root.add(m.root);return m;});
  const batches=new Map();root.updateWorldMatrix(true,true);
  for(const machine of machines){
    const animated=new Set(machine.dynamicNodes),pieces=[];
    machine.root.traverse(o=>{if(!o.isMesh)return;for(let p=o;p&&p!==machine.root;p=p.parent)if(animated.has(p))return;pieces.push(o);});
    for(const o of pieces){
      const m=o.material,key=[m.color.getHex(),m.emissive.getHex(),m.emissiveIntensity,m.metalness,m.roughness].join(':');let batch=batches.get(key);
      if(!batch){batch={material:m.clone(),pieces:[]};batches.set(key,batch);}
      batch.pieces.push(o.geometry.clone().applyMatrix4(o.matrixWorld));o.removeFromParent();
    }
  }
  for(const {material,pieces}of batches.values()){
    const geometry=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());
    const mesh=new THREE.Mesh(geometry,material);mesh.receiveShadow=true;root.add(mesh);
  }
  const geometry=new THREE.BoxGeometry(1,1,1),matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),axis=new THREE.Vector3(0,1,0),position=new THREE.Vector3(),scale=new THREE.Vector3();
  const lights=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:.45,roughness:.5}),tasks.length);
  lights.name='Task status indicators';root.add(lights);
  const picker=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({visible:false}),tasks.length);picker.name='Task interaction volumes';picker.frustumCulled=false;root.add(picker);
  function transform(task,x,y,z,w,h,d){const[nx,ny]=task.facing;quaternion.setFromAxisAngle(axis,Math.atan2(nx,-ny));position.set(task.position[0]-ny*x+nx*z,y,-task.position[1]-nx*x-ny*z);scale.set(w,h,d);return matrix.compose(position,quaternion,scale);}
  tasks.forEach((task,i)=>{lights.setMatrixAt(i,transform(task,0,1.58,-.08,.45,.035,.12));picker.setMatrixAt(i,transform(task,0,1,.05,1.65,2.1,.95));});
  lights.instanceMatrix.needsUpdate=picker.instanceMatrix.needsUpdate=true;
  const palette={task:0x77dcca,complete:0x9cebb5,standby:0x64899c,emergency:0xff9b76},color=new THREE.Color();
  function refresh(){tasks.forEach((task,i)=>lights.setColorAt(i,color.set(palette[taskState.status(task)]||palette.task)));if(lights.instanceColor)lights.instanceColor.needsUpdate=true;}
  refresh();
  return{root,refresh,update(stamp){machines.forEach(m=>m.update(stamp));},
    pick(raycaster){root.updateMatrixWorld(true);const hit=raycaster.intersectObject(picker,false)[0];return hit?{task:tasks[hit.instanceId],distance:hit.distance}:null;},
    dispose(){machines.forEach(m=>m.dispose());const g=new Set(),m=new Set();root.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material);});g.forEach(o=>o.dispose());m.forEach(o=>o.dispose());root.removeFromParent();}
  };
}
